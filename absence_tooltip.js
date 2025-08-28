// absence_tooltip.js - Integrated Absence Details Tooltip Feature

// ==== CONSTANTS & GLOBAL VARIABLES ====
const DETAILS_PAGE_URL_FRAGMENT = '/insertAbsences/index/absencesDetailsIndex.faces';
const MAIN_PAGE_URL_FRAGMENT = '/insertAbsences/index/insertAbsencesIndex.faces';
// const STORAGE_PREFIX = 'studentAbsenceData_'; // No longer needed, handled by storage.js
const STALE_DATA_THRESHOLD_MS = 5 * 30.44 * 24 * 60 * 60 * 1000; // Approx 5 months

let detailsTooltipElement = null; // Singleton tooltip element
let hideTooltipTimer = null; // Timer for hiding tooltip
// let observerDebounceTimer = null; // Observer logic moved to main_absence.js
const targetTableId = 'myForm:studentAbsenceTable'; // ID of the main student table on list page
// let initializationAttempts = 0; // Initialization handled by main_absence.js or details page logic
// const MAX_INIT_ATTEMPTS = 20;
const LECTURE_DATE_INPUT_ID = 'myForm:date'; // ID for the lecture date input
const SAVE_BUTTON_SPAN_ID = 'myForm:saveLinkTxt2'; // ID for the first Save button span
const SAVE_BUTTON_LINK_ID = 'myForm:saveLink';     // ID for the second Save button link (<a> tag)

// ==== TOOLTIP HELPER FUNCTIONS ====

/** Creates or returns the singleton tooltip element */
function _getTooltipElement() {
    if (!detailsTooltipElement) {
        detailsTooltipElement = document.createElement('div');
        detailsTooltipElement.className = 'details-tooltip';
        detailsTooltipElement.id = 'details-tooltip-singleton';
        detailsTooltipElement.style.pointerEvents = 'auto'; // Allow interaction

        // Keep interaction listeners on the tooltip itself
        detailsTooltipElement.addEventListener('mouseenter', () => {
            clearTimeout(hideTooltipTimer);
        });
        detailsTooltipElement.addEventListener('mouseleave', () => {
            clearTimeout(hideTooltipTimer);
            hideTooltipTimer = setTimeout(_hideDetailsTooltip, 300);
        });

        document.body.appendChild(detailsTooltipElement);
    }
    return detailsTooltipElement;
}

/** Hides the details tooltip */
function _hideDetailsTooltip() {
    clearTimeout(hideTooltipTimer);
    const tooltip = _getTooltipElement();
    tooltip.style.display = 'none';
}

/** Displays the tooltip with content at specified position */
function _displayTooltip(contentHtml, x, y) {
    const tooltip = _getTooltipElement();
    tooltip.innerHTML = contentHtml;
    tooltip.style.left = `${window.scrollX + x + 15}px`;
    tooltip.style.top = `${window.scrollY + y + 10}px`;
    tooltip.style.display = 'block';
}

// ==== UTILITY FUNCTIONS ====

/** Converts Arabic-Indic numerals (٠-٩) in a string to European numerals (0-9) */
function _convertNumeralsToEnglish(str) {
    if (typeof str !== 'string') return str;
    const arabicIndicNumerals = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    const europeanNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let newStr = str;
    for (let i = 0; i < 10; i++) {
        newStr = newStr.replace(arabicIndicNumerals[i], europeanNumerals[i]);
    }
    return newStr;
}

/**
 * Parses a date string (DD/MM/YYYY) into a JavaScript Date object.
 * Returns null if the format is invalid.
 */
function _parseDateString(dateStr) {
    if (typeof dateStr !== 'string') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && month >= 0 && month < 12 && day > 0 && day <= 31) {
             const dateObj = new Date(year, month, day);
             // Check validity
            if (dateObj.getFullYear() === year && dateObj.getMonth() === month && dateObj.getDate() === day) {
                 return dateObj;
             }
        }
    }
    return null;
}

/** Gets the current lecture date from the main page input field */
function _getCurrentLectureDate() {
    const dateInputElement = document.getElementById(LECTURE_DATE_INPUT_ID);
    if (dateInputElement && dateInputElement.value) {
        return _convertNumeralsToEnglish(dateInputElement.value);
    } else {
        console.error(`Tooltip: Could not find lecture date input element with ID: ${LECTURE_DATE_INPUT_ID}`);
        return null;
    }
}

/** Shows a brief confirmation message on the page */
function _showSaveConfirmation() {
    let confirmationDiv = document.getElementById('saveConfirmationDiv');
    if (!confirmationDiv) {
        confirmationDiv = document.createElement('div');
        confirmationDiv.id = 'saveConfirmationDiv';
        confirmationDiv.style.position = 'fixed';
        confirmationDiv.style.bottom = '20px';
        confirmationDiv.style.left = '20px';
        confirmationDiv.style.padding = '10px 20px';
        confirmationDiv.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
        confirmationDiv.style.color = 'white';
        confirmationDiv.style.borderRadius = '5px';
        confirmationDiv.style.zIndex = '9999';
        confirmationDiv.style.fontSize = '14px';
        confirmationDiv.style.opacity = '0';
        confirmationDiv.style.transition = 'opacity 0.5s ease-in-out';
        document.body.appendChild(confirmationDiv);
    }
    confirmationDiv.textContent = 'تم حفظ بيانات الغياب التفصيلية لهذا الطالب.'; // Modified text slightly
    confirmationDiv.style.opacity = '1';
    setTimeout(() => { confirmationDiv.style.opacity = '0'; }, 3000);
}

// ==== DATA HANDLING & PARSING FUNCTIONS ====

/**
 * Parses the absence details from the details page HTML.
 * (Largely unchanged from original content.js)
 */
function _parseAbsenceDetailsFromPage(detailsDoc) {
    const absenceData = [];
    try {
        const headers = Array.from(detailsDoc.querySelectorAll('th.HEADING'));
        const dateHeaderElement = headers.find(th => th.textContent.includes('التاريخ'));
        let detailsTable = null;

        if (!dateHeaderElement) {
            console.error("Tooltip Parser: Could not find the 'التاريخ' header (th.HEADING).");
             const potentialTables = detailsDoc.querySelectorAll('table');
             let foundTable = null;
             potentialTables.forEach(table => {
                 // Look for a table containing checkboxes within its body rows
                 if (table.querySelector('tbody tr td input[type="checkbox"]')) {
                     if (!foundTable) foundTable = table;
                 }
             });
             if (foundTable) {
                 console.warn("Tooltip Parser: Using fallback table discovery method.");
                 detailsTable = foundTable;
             } else {
                 return 'error_parsing_header_not_found';
             }
        } else {
             detailsTable = dateHeaderElement.closest('table');
         }

        if (!detailsTable) {
            console.error("Tooltip Parser: Could not find the details table element.");
            return 'error_parsing_table_not_found';
        }

        const rows = detailsTable.querySelectorAll('tbody tr');
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) { // Ensure enough cells
                const date = cells[0]?.textContent.trim();
                const absentCheckbox = cells[3]?.querySelector('input[type="checkbox"]');
                const excusedCheckbox = cells[4]?.querySelector('input[type="checkbox"]');
                const lateCheckbox = cells[5]?.querySelector('input[type="checkbox"]');
                let type = null;

                if (lateCheckbox?.checked) type = 'تأخير';
                else if (absentCheckbox?.checked) type = excusedCheckbox?.checked ? 'غياب بعذر' : 'غياب بدون عذر';

                if (date && type !== null) {
                    const englishDate = _convertNumeralsToEnglish(date);
                    if (_parseDateString(englishDate)) { // Validate date format
                         absenceData.push({ date: englishDate, type: type });
                     } else {
                         console.warn(`Tooltip Parser: Skipping invalid date format on details page: ${date}`);
                     }
                }
            } else {
                 //console.warn(`Tooltip Parser: Skipping row ${rowIndex+1} on details page due to insufficient cells (${cells.length})`);
            }
        });
        console.log(`Tooltip Parser: Finished parsing details page. Found ${absenceData.length} entries.`);
        // Sort by date ascending
        absenceData.sort((a, b) => (_parseDateString(a.date)?.getTime() || 0) - (_parseDateString(b.date)?.getTime() || 0));
        return absenceData;

    } catch (error) {
        console.error("Error during HTML parsing on details page:", error);
        return 'error_parsing_exception';
    }
}

/**
 * Extracts the student ID from the details page.
 * Uses Absence Helper's dom_utils.js if available, otherwise falls back to own logic.
 * @param {Document} detailsDoc - The document object of the details page.
 * @returns {string | null} Student ID or null.
 */
function _getStudentIdFromDetailsPage(detailsDoc) {
    console.log("Tooltip: Attempting to get Student ID from details page...");
    try {
        // Attempt 1: Look for specific structure around "رقم الطالب"
        const labels = detailsDoc.querySelectorAll('span.fontText');
        for (let label of labels) {
            if (label.textContent.includes('رقم الطالب')) {
                const parentTd = label.closest('td');
                // Corrected: Get the immediate next sibling TD for the value
                const idValueElement = parentTd?.nextElementSibling; // CORRECTED LINE
                let idText = idValueElement?.querySelector('span.fontText')?.textContent.trim() || idValueElement?.textContent.trim();
    
                if (idText) {
                     idText = _convertNumeralsToEnglish(idText);
                     if (/^\d+$/.test(idText)) {
                        console.log("Tooltip: Found Student ID on Details Page (Method 1):", idText);
                        return idText;
                    } else {
                        // Added warning if text found but isn't digits
                        console.warn(`Tooltip: Text found in ID cell is not numeric: "${idText}"`);
                    }
                } else {
                     console.warn("Tooltip: Could not find text content in the student ID cell.");
                }
                 break; // Stop after finding the label
            }
        }
         // Fallback: Simple XPath for a 9-digit number in a span (less reliable)
         const potentialIdSpan = detailsDoc.evaluate("//span[contains(text(), '٠') or contains(text(), '١') or contains(text(), '٢') or contains(text(), '٣') or contains(text(), '٤') or contains(text(), '٥') or contains(text(), '٦') or contains(text(), '٧') or contains(text(), '٨') or contains(text(), '٩')][string-length(normalize-space(text())) = 9]", detailsDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
         if (potentialIdSpan) {
             let fallbackId = potentialIdSpan.textContent.trim();
             fallbackId = _convertNumeralsToEnglish(fallbackId);
             if (/^\d{9}$/.test(fallbackId)) {
                 console.warn("Tooltip: Used fallback XPath to find student ID:", fallbackId);
                 return fallbackId;
             }
         }
    } catch (error) {
        console.error("Tooltip: Error extracting student ID from details page:", error);
    }
    console.error("Tooltip: Failed to extract Student ID from details page.");
    return null;
}


/**
 * Handles the update logic triggered by the main page's Save button.
 * Reads checkbox states for the current lecture date and updates storage.
 * @param {string} lecturerId
 * @param {string} courseCode
 */
async function _handleAbsencePageSave(lecturerId, courseCode) {
    console.log("Tooltip: Save button clicked. Updating stored details for current lecture date...");
    const lectureDate = _getCurrentLectureDate();

    if (!lecturerId || !courseCode) {
         console.error("Tooltip Save Update Aborted: Missing Lecturer ID or Course Code.");
         // No alert here, main_absence might handle general errors
         return;
    }
    if (!lectureDate) {
        console.error("Tooltip Save Update Aborted: Could not determine lecture date.");
        return; // Assume main_absence might alert user
    }
     if (!_parseDateString(lectureDate)) {
         console.error(`Tooltip Save Update Aborted: Invalid lecture date format found: ${lectureDate}`);
         return; // Assume main_absence might alert user
     }

    const tableNode = document.getElementById(targetTableId);
    const tbodyNode = tableNode?.querySelector('tbody');
    if (!tbodyNode) {
        console.error("Tooltip Save Update Aborted: Could not find table body.");
        return;
    }

    const rows = tbodyNode.querySelectorAll('tr');
    console.log(`Tooltip: Processing ${rows.length} rows for course ${courseCode}, lecture date: ${lectureDate}`);
    let updatesAttempted = 0;
    let errorsEncountered = 0;

    for (const row of rows) {
        const cells = row.cells;
        // Need at least Student ID (cell 1) and checkbox cells (5, 6, 7)
        if (cells.length < 8) continue;

        const idCell = cells[1];
        let studentId = idCell?.textContent?.trim();
        studentId = _convertNumeralsToEnglish(studentId);

        if (!studentId || !/^\d+$/.test(studentId)) {
            continue; // Skip row if ID invalid
        }

        const absentCheckbox = cells[5]?.querySelector('input[type="checkbox"][id*=":studentAbsence"]');
        const excusedCheckbox = cells[6]?.querySelector('input[type="checkbox"][id*=":studentExcused"]');
        const lateCheckbox = cells[7]?.querySelector('input[type="checkbox"][id*=":studentLate"]');

        let finalStatus = 'present'; // Default = Present (means remove entry for this date)
        if (lateCheckbox?.checked) {
            finalStatus = 'تأخير';
        } else if (absentCheckbox?.checked) {
            finalStatus = excusedCheckbox?.checked ? 'غياب بعذر' : 'غياب بدون عذر';
        }

        try {
            // 1. Get current details for this student/course
            const currentDetails = await getAbsenceDetails(lecturerId, courseCode, studentId);
            let currentDataArray = Array.isArray(currentDetails?.data) ? [...currentDetails.data] : []; // Make a mutable copy

            // 2. Find index of the lecture date
            const dateIndex = currentDataArray.findIndex(entry => entry.date === lectureDate);

            let changed = false;
            if (finalStatus === 'present') { // User marked as present or cleared checkboxes
                if (dateIndex !== -1) {
                    // Remove the entry if it exists
                    currentDataArray.splice(dateIndex, 1);
                    changed = true;
                    console.log(`Tooltip Storage Update: [${courseCode}-${studentId}] Removing entry for date: ${lectureDate}`);
                }
            } else { // User marked absent or late
                const newEntry = { date: lectureDate, type: finalStatus };
                if (dateIndex !== -1) { // Entry exists, update if status differs
                    if (currentDataArray[dateIndex].type !== finalStatus) {
                        currentDataArray[dateIndex] = newEntry;
                        changed = true;
                        console.log(`Tooltip Storage Update: [${courseCode}-${studentId}] Updating entry for date: ${lectureDate} to ${finalStatus}`);
                    }
                } else { // Entry doesn't exist, add it
                    currentDataArray.push(newEntry);
                    changed = true;
                     console.log(`Tooltip Storage Update: [${courseCode}-${studentId}] Adding new entry for date: ${lectureDate}, status: ${finalStatus}`);
                }
            }

            // 3. Save back only if data changed
            if (changed) {
                // Sort before saving
                 currentDataArray.sort((a, b) => (_parseDateString(a.date)?.getTime() || 0) - (_parseDateString(b.date)?.getTime() || 0));
                await saveAbsenceDetails(lecturerId, courseCode, studentId, currentDataArray);
                updatesAttempted++;
            }

        } catch (error) {
            console.error(`Tooltip: Error updating student ${studentId} during save:`, error);
            errorsEncountered++;
        }
    }

    console.log(`Tooltip: Save process finished for course ${courseCode}. Attempted updates for ${updatesAttempted} students for date ${lectureDate}. Errors: ${errorsEncountered}`);
    // Optionally show confirmation or error summary - maybe handled by main_absence.js
}


// ==== MAIN PAGE TOOLTIP DISPLAY LOGIC ====

/**
 * Fetches stored data using storage.js function and displays tooltip.
 * @param {Event} event - The mouseenter event.
 * @param {string} lecturerId - Passed from the listener.
 * @param {string} courseCode - Passed from the listener.
 * @param {string} studentId - Extracted student ID.
 */
async function _showStoredDetailsTooltip(event, lecturerId, courseCode, studentId) {
    clearTimeout(hideTooltipTimer);
    const tooltip = _getTooltipElement();

    if (!lecturerId || !courseCode || !studentId) {
        _displayTooltip('<div class="error">خطأ: معلومات المحاضر أو المقرر أو الطالب غير متوفرة.</div>', event.clientX, event.clientY);
        return;
    }

    _displayTooltip(`<div class="loading">جاري البحث عن بيانات (${courseCode})...</div>`, event.clientX, event.clientY);

    try {
        const storedDetails = await getAbsenceDetails(lecturerId, courseCode, studentId); // Use new storage function
        const absenceList = storedDetails.data; // Data is within the 'data' property
        const savedTimestamp = storedDetails.timestamp;

        let contentHtml = `<div class="tooltip-title" style="font-weight: bold; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #ccc;">${courseCode}</div>`;

        if (Array.isArray(absenceList)) {
            const isDataStale = savedTimestamp && (Date.now() - savedTimestamp) > STALE_DATA_THRESHOLD_MS;

            if (absenceList.length > 0) {
                contentHtml += '<ul>';
                // Sort just in case, though save should handle it
                absenceList.sort((a, b) => (_parseDateString(a.date)?.getTime() || 0) - (_parseDateString(b.date)?.getTime() || 0));
                absenceList.forEach(item => {
                    const safeDate = item.date.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const safeType = item.type.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    contentHtml += `<li><strong>${safeDate}:</strong> ${safeType}</li>`;
                });
                contentHtml += '</ul>';
            } else {
                 contentHtml += '<div>لا يوجد تفاصيل غياب محفوظة لهذا الطالب في هذا المقرر.</div>';
            }

             if (isDataStale) {
                 let savedDateStr = new Date(savedTimestamp).toLocaleDateString();
                 savedDateStr = _convertNumeralsToEnglish(savedDateStr);
                 contentHtml += `<div class="warning" style="margin-top: 5px; font-size: 0.8em; color: orange;">تنبيه: البيانات قديمة (آخر تحديث ${savedDateStr}). الرجاء زيارة صفحة تفاصيل الطالب للتحديث.</div>`;
             } else if (!savedTimestamp && absenceList.length === 0) {
                // If no timestamp and no data, explicitly state to visit details page
                 contentHtml += `<div class="info" style="margin-top: 5px; font-size: 0.8em; color: #666;">الرجاء زيارة صفحة تفاصيل الطالب أولاً لحفظ بيانات الغياب لهذا المقرر.</div>`;
             }

        } else {
            console.warn(`Tooltip: Expected an array for student ${studentId}, course ${courseCode}, but got:`, absenceList);
            contentHtml += '<div class="error">خطأ في تنسيق البيانات المحفوظة.</div>';
        }

         // Update tooltip only if it's still supposed to be visible
         // Check if mouse is still over the original link OR the tooltip itself
         const targetLink = event.target.closest('a');
         if (tooltip.style.display === 'block' && (targetLink?.matches(':hover') || tooltip.matches(':hover')) ) {
              _displayTooltip(contentHtml, event.clientX, event.clientY);
         }


    } catch (error) {
        console.error("Tooltip: Error retrieving absence details:", error);
        _displayTooltip('<div class="error">خطأ في استرجاع البيانات.</div>', event.clientX, event.clientY);
    }
}

/** Handles mouse leaving the student name link area */
function _handleMouseLeaveLink() {
    clearTimeout(hideTooltipTimer);
    // Add a slight delay before hiding
    hideTooltipTimer = setTimeout(() => {
         // Double-check if the mouse is now over the tooltip itself
         const tooltip = document.getElementById('details-tooltip-singleton');
         if (tooltip && !tooltip.matches(':hover')) {
             _hideDetailsTooltip();
         }
     }, 400); // Increased delay slightly
}

/**
 * Attaches hover listeners to student name links within the provided tbody.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {HTMLTableSectionElement} tbodyNode
 */
function _attachTooltipListeners(lecturerId, courseCode, tbodyNode) {
    console.log("Tooltip: Attaching hover listeners...");
    if (!lecturerId || !courseCode || !tbodyNode) {
        console.error("Tooltip: Cannot attach listeners - missing lecturerId, courseCode, or tbodyNode.");
        return;
    }

    let listenersAttachedCount = 0;
    const rows = tbodyNode.querySelectorAll('tr');

    rows.forEach((row) => {
        const cells = row.cells;
        if (cells.length <= 2) return; // Need ID and Name cells

        const idCell = cells[1];
        const nameCell = cells[2];
        const nameLink = nameCell.querySelector('a'); // Target the link
        let studentId = idCell?.textContent?.trim();
        studentId = _convertNumeralsToEnglish(studentId);

        if (nameLink && studentId && /^\d+$/.test(studentId)) {
            // Use a specific flag for this feature to avoid conflicts
            if (!nameLink.dataset.tooltipListenerAdded) {
                nameLink.addEventListener('mouseenter', (event) => {
                    // Pass necessary IDs to the display function
                    _showStoredDetailsTooltip(event, lecturerId, courseCode, studentId);
                });
                nameLink.addEventListener('mouseleave', _handleMouseLeaveLink);
                nameLink.dataset.tooltipListenerAdded = 'true'; // Mark as processed
                listenersAttachedCount++;
            }
        }
    });
    console.log(`Tooltip: Attached ${listenersAttachedCount} new hover listeners.`);
}


// ==== INITIALIZATION ====

/**
 * PUBLIC Function called by main_absence.js to set up features on the main page.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {HTMLTableSectionElement} tbodyNode
 */
function initializeAbsenceTooltipFeature(lecturerId, courseCode, tbodyNode) {
    console.log("Tooltip: Initializing main page features...");
    if (!tbodyNode || !lecturerId || !courseCode) {
        console.error("Tooltip Initialization Failed: Missing required parameters (tbody, lecturerId, courseCode).");
        return;
    }
    // Attach hover listeners initially
    _attachTooltipListeners(lecturerId, courseCode, tbodyNode);

    // Find and attach listeners to Save buttons (ensure this happens only once)
    const saveButtonSpan = document.getElementById(SAVE_BUTTON_SPAN_ID);
    const saveButtonLink = document.getElementById(SAVE_BUTTON_LINK_ID);

    const attachSaveListener = (buttonElement, buttonName) => {
        if (buttonElement && !buttonElement.dataset.tooltipSaveListener) {
             // Wrap the handler to pass necessary IDs
             const handler = () => _handleAbsencePageSave(lecturerId, courseCode);
             buttonElement.addEventListener('click', handler);
             buttonElement.dataset.tooltipSaveListener = 'true'; // Use specific flag
             console.log(`Tooltip: ${buttonName} click listener attached.`);
         }
     };

    attachSaveListener(saveButtonSpan, "Save button span (top)");
    attachSaveListener(saveButtonLink, "Save button link (bottom)");

     console.log("Tooltip: Main page features initialization attempt complete.");
     // Note: Observer logic is now handled by main_absence.js, which should call
     // _attachTooltipListeners(lecturerId, courseCode, updatedTbodyNode) when needed.
}

/** Initialization logic FOR THE DETAILS PAGE ONLY */
async function _initializeDetailsPage() {
    console.log("Tooltip: Initializing Details Page Logic...");
    // Use await to ensure lecturerId is retrieved before proceeding
    const lecturerId = await getCurrentLecturerId(); // From storage.js
    if (!lecturerId) {
        console.error("Tooltip Details Page: Could not get Lecturer ID. Aborting data save.");
        return;
    }

    // Use Absence Helper's function if available, otherwise fallback might be needed
    const courseCode = typeof getCurrentCourseCodeFromPage === 'function'
        ? getCurrentCourseCodeFromPage() // From dom_utils.js
        : _getCourseCodeFromDetailsHeaderFallback(); // Implement fallback if needed

    const studentId = _getStudentIdFromDetailsPage(document);

    if (!studentId || !courseCode) {
        console.error("Tooltip Details Page: Could not extract student ID or course code. Aborting data save.");
        return;
    }

    // Wait slightly for page elements to potentially finish rendering
    setTimeout(async () => {
        const absenceData = _parseAbsenceDetailsFromPage(document);
        if (typeof absenceData === 'string' && absenceData.startsWith('error_')) {
            console.error(`Tooltip Details Page: Parsing failed with error: ${absenceData}. Aborting data save.`);
            return;
        }

        if (Array.isArray(absenceData)) {
            console.log(`Tooltip Details Page: Parsed ${absenceData.length} absence entries for L:${lecturerId}, C:${courseCode}, S:${studentId}. Saving...`);
            try {
                // Use the storage.js function to save
                const success = await saveAbsenceDetails(lecturerId, courseCode, studentId, absenceData);
                if (success) {
                     _showSaveConfirmation(); // Show confirmation on success
                } else {
                     console.error("Tooltip Details Page: Failed to save absence details via storage function.");
                     // Optionally alert the user
                     // alert("حدث خطأ أثناء حفظ تفاصيل الغياب.");
                }
            } catch (error) {
                console.error("Tooltip Details Page: Error calling saveAbsenceDetails:", error);
                // Optionally alert the user
                 // alert("حدث خطأ فني أثناء محاولة حفظ تفاصيل الغياب.");
            }
        } else {
            console.error("Tooltip Details Page: Parsing returned unexpected data type:", absenceData);
        }
    }, 500); // Delay slightly
}

// Fallback for getting course code on details page if dom_utils isn't loaded/fails
function _getCourseCodeFromDetailsHeaderFallback() {
    console.warn("Tooltip: Using fallback method to get course code on details page.");
     try {
         const spans = document.querySelectorAll('.infostudent span.fontText');
         for (let i = 0; i < spans.length; i++) {
             if (spans[i].textContent.includes('رمز المقرر')) {
                 // Assuming the structure is Label TD : TD Value TD
                 let valueTd = spans[i].closest('td')?.nextElementSibling?.nextElementSibling;
                 let codeSpan = valueTd?.querySelector('span.fontText');
                 let courseCode = codeSpan?.textContent.trim();
                  if (courseCode && /\w+\s?\d+/.test(courseCode)) {
                      console.log("Tooltip Fallback: Found course code:", courseCode);
                      return courseCode;
                  }
             }
         }
     } catch(e) {
         console.error("Tooltip Fallback: Error getting course code:", e);
     }
     return null;
}

// ==== SCRIPT ENTRY POINT ====

// Check URL and run appropriate initializer
const currentUrl = window.location.href;
if (currentUrl.includes(DETAILS_PAGE_URL_FRAGMENT)) {
    // Run details page logic automatically when on the details page
     // Wait for DOM ready state if necessary, or just run after delay
     if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initializeDetailsPage);
     } else {
         _initializeDetailsPage();
     }
}
// NOTE: Initialization for the MAIN_PAGE_URL_FRAGMENT is now triggered
// by calling `initializeAbsenceTooltipFeature` from `main_absence.js`.

console.log("Absence Tooltip Script Loaded.");