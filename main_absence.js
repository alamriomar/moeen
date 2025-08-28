/**
 * main_absence.js
 * Entry point and orchestrator for the extension on the absence page.
 */

console.log("Extension: main_absence.js script running.");

// Define targetTableId locally for this script's context
const absencePageTableId = 'myForm:studentAbsenceTable'; // Use a specific name

// Global state for this page instance
let currentLecturerId = null;
let currentSettings = {};
let allStudentNotesData = {}; // Loaded here, used by notes.js
let observerDebounceTimer = null;
let observerStarted = false;
// Define global variables for week and course code for this page context
let currentWeekNumber = null; // Will be assigned by initializeAbsencePage
let currentCourseCode = null; // Will be assigned by initializeAbsencePage
// Custom Column state
let currentCustomColumnDefinitions = []; // Holds definitions for the current course
let currentCustomColumnData = {}; // Holds data {studentId: {colId: value}} for the current course
let currentGeneralNote = { text: "", lastModified: null }; // Default structure


/** Handles changes in highlight toggle buttons from the panel */
async function handleHighlightToggle(type, isEnabled) {
    if (!currentLecturerId) return;
    console.log(`Toggle changed: ${type} = ${isEnabled}`);
    currentSettings[`${type}HighlightEnabled`] = isEnabled;
    await saveSettings(currentLecturerId, currentSettings); // from storage.js
    // Pass the ID when finding the table
    const tableBody = findStudentTableById(absencePageTableId)?.querySelector('tbody'); // from dom_utils.js
    if (tableBody) {
        highlightAbsenceRows(tableBody, currentSettings); // from highlighter.js
    }
}

/** Processes the table: highlights rows and updates note icons based on current state. */
function processAbsenceTable(tbodyNode) {
    if (!tbodyNode?.isConnected) { console.warn("processTable called on disconnected node."); return; }
    if (!currentLecturerId || !currentSettings) { console.warn("Processing skipped: Missing lecturer ID or settings."); return; }
    // Use the globally set courseCode for context
    if (!currentCourseCode) { console.warn("Processing skipped: Course code unknown."); return; }
    highlightAbsenceRows(tbodyNode, currentSettings); // from highlighter.js
    updateNotesVisuals(currentCourseCode); // from notes.js
}

// --- Updated initialAbsenceSetup ---
/**
 * Sets up initial UI elements and runs first processing pass. Returns the tbody node found.
 * @param {HTMLTableElement} tableNode The main table element.
 * @param {object} generalNoteData The loaded general note data {text, lastModified}.
 * @param {string} lecturerId The current lecturer ID.
 * @param {string} courseCode The current course code.
 * @returns {HTMLTableSectionElement|null} The tbody element or null.
 */
function initialAbsenceSetup(tableNode, generalNoteData, lecturerId, courseCode) { // ADDED Params
    const tbodyNode = tableNode.querySelector('tbody');
    if (!tbodyNode) { console.error("!!! ERROR: Tbody not found in initialAbsenceSetup."); return null; }
    // Ensure currentLecturerId is set on body dataset for potential use by other modules if needed
    if(lecturerId) {
        document.body.dataset.lecturerId = lecturerId;
    } else if(currentLecturerId) {
         document.body.dataset.lecturerId = currentLecturerId; // Fallback to global if not passed (should be passed)
    }


    // Ensure functions from other files are available
    // ADDED: check for ensureAbsencePagePanelInjected
    if (typeof ensureAbsencePagePanelInjected !== 'function' || typeof injectNotesUI !== 'function' || typeof injectCustomColumns !== 'function' || typeof processAbsenceTable !== 'function' ) {
         console.error("initialAbsenceSetup Error: Core UI injection/processing function(s) not defined!");
         // Decide whether to proceed - maybe some parts can still work
         // return tbodyNode; // Return tbody even if error occurs later
    }

    // Inject Panel, passing the general note data and IDs
    if (typeof ensureAbsencePagePanelInjected === 'function') {
         ensureAbsencePagePanelInjected(currentSettings, handleHighlightToggle, generalNoteData, lecturerId, courseCode); // ADDED generalNoteData, lecturerId, courseCode
    } else {
        console.warn("initialAbsenceSetup: Skipping panel injection - function not defined.");
    }

    // Inject Notes UI
    if (typeof injectNotesUI === 'function') {
        injectNotesUI(tbodyNode, lecturerId); // Pass lecturerId
    } else {
         console.warn("initialAbsenceSetup: Skipping notes injection - function not defined.");
    }

    // Inject Custom Columns (if function exists and definitions are loaded)
    if (typeof injectCustomColumns === 'function' && currentCustomColumnDefinitions) {
        injectCustomColumns(tbodyNode, courseCode, lecturerId, currentCustomColumnDefinitions, currentCustomColumnData);
    } else {
        console.warn("initialAbsenceSetup: Skipping custom column injection - function or definitions missing.");
    }

    // Process Table (Highlighting, Note Icons Update) AFTER UI injections
     if (typeof processAbsenceTable === 'function') {
        processAbsenceTable(tbodyNode);
     } else {
         console.warn("initialAbsenceSetup: Skipping table processing - function not defined.");
     }


    // Start observer if not already started
    if (!observerStarted) { startAbsenceMutationObserver(tbodyNode); }

    return tbodyNode; // Return the processed tbody node
}

/** Starts the MutationObserver to watch for table changes. */
function startAbsenceMutationObserver(tbodyNode) {
    if (observerStarted || !tbodyNode) return; // Don't start if already started or no tbody
    observerStarted = true;
    console.log("Starting Absence MutationObserver.");
    // Ensure debounce is available
    if (typeof debounce !== 'function') {
        console.error("startAbsenceMutationObserver Error: debounce function not defined!");
        // Fallback to no debounce or stop observer setup
        return;
    }
    const observer = new MutationObserver(debounce((mutationsList) => { // Use debounce from utils.js
        let relevantChangeDetected = false;
        for (const mutation of mutationsList) {
             if (!mutation.target.isConnected) continue;
             // Ignore changes within known dynamic elements like modals or panels
             if (mutation.target.closest('.notes-modal-overlay') || mutation.target.closest('.control-panel') || mutation.target.closest('.details-tooltip')) continue; // Added tooltip check
             // Check if change happened within our target table's body or affected its children
             if (mutation.type === 'childList' || mutation.target.closest('tbody') === tbodyNode) {
                 relevantChangeDetected = true; break;
             }
        }
        if (relevantChangeDetected) {
            console.log("Observer detected relevant change.");
            clearTimeout(observerDebounceTimer);
            observerDebounceTimer = setTimeout(() => {
                                // *** START: FOCUS CHECK ***
                                const activeElement = document.activeElement;
                                const isCustomTextInputFocused = activeElement &&
                                                                  activeElement.tagName === 'INPUT' &&
                                                                  activeElement.type === 'text' &&
                                                                  activeElement.closest('.custom-column-cell'); // Check if it's inside our custom cell
                
                                if (isCustomTextInputFocused) {
                                    console.log("Observer: Skipping UI refresh because a custom text input has focus.");
                                    return; // <<< EXIT HERE if user is typing in a custom text input
                                }
                                // *** END: FOCUS CHECK ***
                
                // Ensure findStudentTableById is available
                 if (typeof findStudentTableById !== 'function') {
                     console.error("Observer Error: findStudentTableById function not defined!");
                     return;
                 }
                const currentTable = findStudentTableById(absencePageTableId);
                const currentTbody = currentTable?.querySelector('tbody');

                if (currentTable && currentTbody) {
                    console.log("Observer: Processing changes...");
                    // Re-check if UI needs re-injection (e.g., notes column missing)
                    if (currentTable.dataset.notesUiInjected !== 'true' || !document.getElementById('extension-absence-panel')) {
                         console.log("Observer: Re-running initial setup...");
                         absencePanelInjected = false; // Reset panel flag too
                         // Re-run setup, which injects panel, notes, custom cols, processes table
                         const setupTbody = initialAbsenceSetup(currentTable);
                         if (setupTbody && currentLecturerId && currentCourseCode) {
                             // START: Tooltip integration - Call after setup
                             if (typeof initializeAbsenceTooltipFeature === 'function') {
                                 initializeAbsenceTooltipFeature(currentLecturerId, currentCourseCode, setupTbody);
                             } else {
                                 console.warn("Observer: initializeAbsenceTooltipFeature not found after re-setup.");
                             }
                             // END: Tooltip integration
                         }
                     } else {
                         // If UI doesn't need full re-injection, still process highlights/notes
                         console.log("Observer: Refreshing table processing and injections...");
                         processAbsenceTable(currentTbody);
                         // Refresh custom columns in case only data changed or rows were added/removed
                         refreshCustomColumnsInjection();
                         // START: Tooltip integration - Re-run attachment for new rows
                         if (typeof initializeAbsenceTooltipFeature === 'function' && currentLecturerId && currentCourseCode) {
                             // Call again - relies on internal checks in tooltip script to avoid dupes
                             initializeAbsenceTooltipFeature(currentLecturerId, currentCourseCode, currentTbody);
                         } else {
                              console.warn("Observer: initializeAbsenceTooltipFeature not found for refresh.");
                         }
                         // END: Tooltip integration
                     }
                 } else {
                     console.log("Observer: Table or body disappeared. Stopping observer logic for now.");
                     observerStarted = false; // Stop trying if table is gone
                 }
            }, 500); // Increased debounce time slightly
        }
    }, 500)); // Increased debounce time slightly
    observer.observe(document.body, { childList: true, subtree: true }); // Observe body for table appearance/disappearance
    // Also observe the specific tbody if it exists initially for direct content changes
    if (tbodyNode) {
       observer.observe(tbodyNode, { childList: true, subtree: true, characterData: true }); // Fine-grained observation on tbody
    }
}


// --- Updated initializeAbsencePage ---
async function initializeAbsencePage() {
    console.log("Initializing absence page extension features...");
    // Ensure storage functions are available
    // ADDED: Check for getGeneralCourseNote
    if (typeof getCurrentLecturerId !== 'function' || typeof getSettings !== 'function' || typeof getNotes !== 'function' || typeof getGeneralCourseNote !== 'function') {
        console.error("Initialization failed: Storage functions not defined (incl. getGeneralCourseNote)!");
        return;
    }
    currentLecturerId = await getCurrentLecturerId();
    if (!currentLecturerId) {
         console.error("Initialization failed: Lecturer ID not found. Visit home page.");
         // Display error message on page (existing code)
         const potentialTableParent = document.getElementById('myForm');
         if (potentialTableParent && typeof safeInjectBefore === 'function') {
             const errorMsg = document.createElement('div');
             errorMsg.textContent = "خطأ في الإضافة: لم يتم التعرف على المحاضر. يرجى زيارة الصفحة الرئيسية للنظام الأكاديمي أولاً ثم العودة لهذه الصفحة.";
             errorMsg.style.color = 'red'; errorMsg.style.fontWeight = 'bold'; errorMsg.style.padding = '10px'; errorMsg.style.border = '1px solid red'; errorMsg.style.marginBottom = '10px'; errorMsg.style.backgroundColor = '#ffeeee';
             const firstChild = potentialTableParent.firstElementChild;
             if (firstChild) {
                 safeInjectBefore(errorMsg, firstChild);
             } else {
                 potentialTableParent.prepend(errorMsg);
             }
         }
         return;
    }
    console.log("Current Lecturer ID:", currentLecturerId);
    console.log("Loading settings, notes, etc. for lecturer...");

    // Find table first
    if (typeof findStudentTableById !== 'function') {
         console.error("Initialization failed: findStudentTableById function not defined!");
         return;
    }
    const tableNode = findStudentTableById(absencePageTableId);

    if (tableNode) {
        // Get page context (week, course) - needed before fetching course-specific data
        if (typeof getCurrentWeekNumberFromPage !== 'function' || typeof getCurrentCourseCodeFromPage !== 'function') {
             console.error("Initialization failed: DOM utility functions not defined!");
             return;
        }
        currentWeekNumber = getCurrentWeekNumberFromPage();
        currentCourseCode = getCurrentCourseCodeFromPage();

        if (!currentCourseCode) {
            console.error("Initialization halted: Could not determine current course code from page.");
            return; // Exit if no course code
        }
        console.log(`Page Context: Week=${currentWeekNumber}, Course=${currentCourseCode}`);

        // --- START: Modified Data Loading ---
        // Prepare promises for all data needed
        const settingsPromise = getSettings(currentLecturerId);
        const notesPromise = getNotes(currentLecturerId);
        const customColsPromise = typeof getCustomColumns === 'function'
                                  ? getCustomColumns(currentLecturerId, currentCourseCode)
                                  : Promise.resolve({ definitions: [], data: {} }); // Default if function missing
        const generalNotePromise = getGeneralCourseNote(currentLecturerId, currentCourseCode); // Fetch general note

        // Execute all promises in parallel
        try {
            const [
                settingsResult,
                notesResult,
                customColsResult,
                generalNoteResult
            ] = await Promise.all([
                settingsPromise,
                notesPromise,
                customColsPromise,
                generalNotePromise
            ]);

            // Assign results to global variables
            currentSettings = settingsResult;
            allStudentNotesData = notesResult;
            currentCustomColumnDefinitions = customColsResult.definitions || []; // Ensure defaults
            currentCustomColumnData = customColsResult.data || {};          // Ensure defaults
            currentGeneralNote = generalNoteResult || { text: "", lastModified: null }; // Ensure default

            // Log loaded data
            console.log("Settings loaded:", currentSettings);
            console.log("Notes loaded:", { count: Object.keys(allStudentNotesData).length });
            console.log("Custom Columns loaded:", { definitions: currentCustomColumnDefinitions.length, dataEntries: Object.keys(currentCustomColumnData).length });
            console.log("General Note loaded:", currentGeneralNote); // Log loaded note

        } catch (error) {
             console.error("Error loading data via Promise.all:", error);
             // Decide how to handle partial data loading failure - maybe return?
             return;
        }
        // --- END: Modified Data Loading ---

        // Perform initial UI setup (Panel, Notes, Custom Cols, Highlighting)
        if (typeof initialAbsenceSetup !== 'function') {
            console.error("Initialization failed: initialAbsenceSetup function not defined!");
            return; // Halt if setup function is missing
        }
        // Pass necessary data to initialAbsenceSetup
        const tbodyNode = initialAbsenceSetup(tableNode, currentGeneralNote, currentLecturerId, currentCourseCode); // Pass new data
        
        // --- START: NEW - Calculate and Save Statistics ---
        // Ensure stats parsing function is available
        if (typeof parseAbsenceStatistics === 'function' && typeof saveCourseStatistics === 'function') {
            // Wait a brief moment to ensure table modifications (like highlighting) are potentially done
             setTimeout(async () => {
                 const currentTable = findStudentTableById(absencePageTableId); // Re-find table
                 if(currentTable) {
                     const stats = parseAbsenceStatistics(currentTable);
                     if (stats) {
                        await saveCourseStatistics(currentLecturerId, currentCourseCode, stats);
                        console.log(`Statistics saved for course ${currentCourseCode}`);
                     } else {
                         console.warn("Could not calculate statistics for saving.");
                     }
                 }
             }, 1000); // Delay calculation slightly (adjust if needed)

        } else {
            console.warn("Stats calculation/saving functions not available.");
        }
        // --- END: NEW - Calculate and Save Statistics ---
        
        // START: Tooltip integration - Initialize after initial setup and ensuring tbodyNode exists
        if (tbodyNode && currentLecturerId && currentCourseCode) {
             if (typeof initializeAbsenceTooltipFeature === 'function') {
                 console.log("Initializing Tooltip Feature...");
                 initializeAbsenceTooltipFeature(currentLecturerId, currentCourseCode, tbodyNode);
             } else {
                  console.error("Initialization Error: initializeAbsenceTooltipFeature function not defined!");
             }
        } else if (!tbodyNode) {
            console.warn("Tooltip feature not initialized because tbody was not found during initial setup.");
        }
        // END: Tooltip integration

        // Add event listeners for custom column buttons AFTER panel is potentially injected
        addCustomColumnButtonListeners();

        // START: Add listener for continuity tracker
        addContinuityTrackerListeners();
        // END: Add listener for continuity tracker

    } else { // Corresponds to if (tableNode)
        //console.warn("Student table not found on initial load. Starting observer to wait for it.");
        // Start observer even if table isn't present initially
        startAbsenceMutationObserver(null); // Pass null, observer will watch body
    } // Closes if (tableNode)
    console.log("Absence page initialization complete.");
}

/** Adds event listeners to the custom column buttons in the panel */
function addCustomColumnButtonListeners() {
    // Ensure modal functions are available
    if (typeof createAddColumnModal !== 'function' || typeof createManageColumnsModal !== 'function') {
        console.error("addCustomColumnButtonListeners Error: Modal creation function(s) not defined!");
        return;
    }

    const addBtn = document.getElementById('add-custom-column-button');
    const manageBtn = document.getElementById('manage-custom-columns-button');

    if (addBtn && !addBtn.dataset.listenerAttached) { // Prevent multiple listeners
        addBtn.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            createAddColumnModal(currentCourseCode, handleAddNewColumn);
        });
        addBtn.dataset.listenerAttached = 'true';
    } else if (!addBtn) { console.warn("Add Custom Column button not found."); }

    if (manageBtn && !manageBtn.dataset.listenerAttached) { // Prevent multiple listeners
        manageBtn.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            // Pass the current definitions to the modal
            createManageColumnsModal(currentCourseCode, currentCustomColumnDefinitions, handleUpdateColumnDefinitions);
        });
         manageBtn.dataset.listenerAttached = 'true';
    } else if (!manageBtn) { console.warn("Manage Custom Columns button not found."); }
}

/** Callback function when a new column is added via the modal */
async function handleAddNewColumn(newDefinition) {
    console.log("Handling Add New Column:", newDefinition);
    // Add to our current definitions
    currentCustomColumnDefinitions.push(newDefinition);
    // Save the updated definitions (data object remains the same for now)
    if (typeof saveCustomColumns === 'function') {
        await saveCustomColumns(currentLecturerId, currentCourseCode, currentCustomColumnDefinitions, currentCustomColumnData);
        // Re-inject columns into the table
        refreshCustomColumnsInjection();
    } else {
        console.error("handleAddNewColumn Error: saveCustomColumns function not defined!");
    }
}

/** Callback function when column definitions are updated (renamed/deleted) via the modal */
async function handleUpdateColumnDefinitions(updatedDefinitions) {
    console.log("Handling Update Column Definitions:", updatedDefinitions);
    const previousDefinitions = currentCustomColumnDefinitions;
    currentCustomColumnDefinitions = updatedDefinitions; // Update global state

    // Identify deleted columns to remove their data
    const deletedColumnIds = previousDefinitions
        .filter(prevDef => !updatedDefinitions.some(newDef => newDef.id === prevDef.id))
        .map(def => def.id);

    if (deletedColumnIds.length > 0) {
        console.log("Deleting data for columns:", deletedColumnIds);
        for (const studentId in currentCustomColumnData) {
            deletedColumnIds.forEach(colId => {
                delete currentCustomColumnData[studentId][colId];
            });
            // Optional: Clean up student entry if no custom columns remain
            if (Object.keys(currentCustomColumnData[studentId]).length === 0) {
                delete currentCustomColumnData[studentId];
            }
        }
    }

    // Save the updated definitions and potentially cleaned data
    if (typeof saveCustomColumns === 'function') {
        await saveCustomColumns(currentLecturerId, currentCourseCode, currentCustomColumnDefinitions, currentCustomColumnData);
        // Re-inject columns into the table
        refreshCustomColumnsInjection();
    } else {
        console.error("handleUpdateColumnDefinitions Error: saveCustomColumns function not defined!");
    }
}

/** Helper function to find the table body and re-run custom column injection */
function refreshCustomColumnsInjection() {
    // Ensure findStudentTableById and injectCustomColumns are available
    if (typeof findStudentTableById !== 'function' || typeof injectCustomColumns !== 'function') {
        console.error("refreshCustomColumnsInjection Error: Dependency function(s) not defined!");
        return;
    }
    const tableBody = findStudentTableById(absencePageTableId)?.querySelector('tbody');
    if (tableBody) {
        console.log("Refreshing custom column injection...");
        // Pass the current state to the injector
        injectCustomColumns(tableBody, currentCourseCode, currentLecturerId, currentCustomColumnDefinitions, currentCustomColumnData);
    } else {
        console.warn("Could not refresh custom columns: Table body not found.");
    }
}

/**
 * Adds click listeners to the 'Save' buttons to trigger the continuity tracker.
 */
function addContinuityTrackerListeners() {
    const saveButton1 = document.getElementById('myForm:saveLink');
    const saveButton2 = document.getElementById('myForm:saveLink2');
    const buttons = [saveButton1, saveButton2].filter(Boolean); // Filter out nulls if a button isn't found

    if (buttons.length === 0) {
        console.warn("Continuity Tracker: Could not find any save buttons to attach listeners to.");
        return;
    }

    const handleSaveClick = async (event) => {
        console.log("Continuity Tracker: Save button clicked.");

        // Ensure the core function is available
        if (typeof recordAbsenceAndCheckGaps !== 'function') {
            console.error("Continuity Tracker Error: recordAbsenceAndCheckGaps function is not defined!");
            return; // Don't proceed
        }

        // Gather all necessary data from the page and global variables
        const lecturerId = currentLecturerId;
        const courseCode = currentCourseCode;
        const week = currentWeekNumber;

        if (!lecturerId || !courseCode || week === null) {
            console.error("Continuity Tracker Error: Missing required data (lecturerId, courseCode, or week).");
            return;
        }

        // Extract details that need to be read at click-time
        const dayElement = document.getElementById('myForm:day');
        const dateElement = document.getElementById('myForm:date');
        
        // --- START: More Robust Section Finder ---
        let section = '';
        try {
            // Find the specific table that contains all the course info.
            const infoTable = document.querySelector('table[style*="border-style:groove"]');
            if (infoTable) {
                const allSpans = infoTable.querySelectorAll('.fontText');
                let sectionLabelFound = false;
                allSpans.forEach(span => {
                    if (span.textContent.trim() === 'الشعبة') {
                        const sectionCell = span.parentElement.nextElementSibling.nextElementSibling;
                        if (sectionCell) {
                            section = sectionCell.textContent.trim();
                            sectionLabelFound = true;
                        }
                    }
                });
                if (!sectionLabelFound) {
                    console.warn("Continuity Tracker: Found info table, but could not find section label 'الشعبة' within it.");
                }
            } else {
                console.warn("Continuity Tracker: Could not find the main course info table.");
            }
        } catch(e) {
            console.error("Continuity Tracker: Error while finding section.", e);
        }
        // --- END: More Robust Section Finder ---

        const dayText = dayElement ? dayElement.textContent.trim() : '';
        const dateText = dateElement ? dateElement.value : ''; // Date is from an input

        // --- START: Arabic Normalization ---
        const normalizeArabic = (str) => {
            return str.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ /g, '');
        };
        const normalizedDayText = normalizeArabic(dayText);
        // --- END: Arabic Normalization ---

        // Convert day name to number (1-5) - using normalized keys
        const dayMap = { "الاحد": 1, "الاثنين": 2, "الثلاثاء": 3, "الاربعاء": 4, "الخميس": 5 };
        const day = dayMap[normalizedDayText] || 0;

        if (!section || day === 0 || !dateText) {
            console.error("Continuity Tracker Error: Could not extract section, day, or date from the page.", { section, day, dateText });
            return;
        }

        const submissionDetails = {
            courseCode,
            section,
            week,
            day,
            date: dateText
        };

        // Call the core logic function
        await recordAbsenceAndCheckGaps(lecturerId, submissionDetails);
    };

    buttons.forEach(button => {
        if (!button.dataset.continuityListener) {
            button.addEventListener('click', handleSaveClick);
            button.dataset.continuityListener = 'true';
            console.log(`Continuity Tracker: Listener attached to button #${button.id}.`);
        }
    });
}


// --- Start Execution ---
// Add checks to ensure necessary functions from other files are loaded before starting
if (!window.absencePageScriptLoaded) {
    window.absencePageScriptLoaded = true;
    const checkDependencies = () => {
        // Check a few key functions from different files
        // START: Added tooltip function check
        if (typeof getCurrentLecturerId === 'function' &&
            typeof getCurrentCourseCodeFromPage === 'function' &&
            typeof debounce === 'function' &&
            typeof highlightAbsenceRows === 'function' &&
            typeof openNotesModal === 'function' &&
            typeof ensureAbsencePagePanelInjected === 'function' &&
            typeof injectNotesUI === 'function' &&
            typeof initializeAbsenceTooltipFeature === 'function' // Check for the new function
            ) {
        // END: Added tooltip function check
            console.log("All dependencies seem loaded. Starting initialization.");
            initializeAbsencePage();
        } else {
            console.warn("Dependencies not yet loaded, retrying...");
            setTimeout(checkDependencies, 100); // Retry after a short delay
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDependencies);
    } else {
        checkDependencies();
    }
} else {
    console.log("main_absence.js: Already loaded, skipping initialization.");
}
