/**
 * ui_absence_panel.js
 * Creates and manages the control panel displayed above the absence table.
 * Handles toggles and course-specific note actions.
 */

// Define table ID locally for functions in this file that might need it
const absencePageTableIdForPanel = 'myForm:studentAbsenceTable'; // Use specific name to avoid scope issues

let absencePanelInjected = false;

/**
 * Displays modal showing all notes for the current course and lecturer.
 * @param {string} courseCode
 * @param {string} lecturerId // Needed to access correct notes data
 */
function displayAllCourseNotes(courseCode, lecturerId) {
    // Ensure closeModal is available
    if (typeof closeModal !== 'function') { console.error("displayAllCourseNotes Error: closeModal is not defined!"); return; }
    closeModal(); // From utils.js
    if (!courseCode || !lecturerId) { alert("لم يتم تحديد المقرر الحالي أو المحاضر."); return; }
    console.log(`Displaying all notes for course: ${courseCode}, Lecturer: ${lecturerId}`);

    // --- Create Modal ---
    const overlay = document.createElement('div');
    overlay.id = 'viewAllNotesModalOverlay';
    overlay.className = 'notes-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    const content = document.createElement('div');
    content.id = 'viewAllNotesModalContent';
    content.className = 'notes-modal-content';

    const header = document.createElement('div');
    header.className = 'notes-modal-header';
    header.textContent = `جميع الملاحظات للمقرر الحالي: ${courseCode}`;
    content.appendChild(header);

    const body = document.createElement('div');
    body.id = 'viewAllNotesModalBody';
    body.className = 'notes-modal-body';

    let notesFound = false;
    // Iterate through students in the global data structure (assuming allStudentNotesData is accessible)
    const studentIds = Object.keys(allStudentNotesData || {}).sort();
    studentIds.forEach(studentId => {
        // Check if THIS lecturer has notes for THIS student for THIS course
        if (allStudentNotesData?.[studentId]?.[courseCode] && Object.keys(allStudentNotesData[studentId][courseCode]).length > 0) {
            notesFound = true;
            const studentNotesDiv = document.createElement('div');
            studentNotesDiv.className = 'student-notes-block';

            // Try to get student name from the icon button on the page
            const iconButton = document.querySelector(`.notes-icon-button[data-student-id="${studentId}"]`);
            const studentName = iconButton ? iconButton.dataset.studentName : studentId;

            const studentHeader = document.createElement('h6');
            studentHeader.textContent = `الطالب: ${studentName} (${studentId})`;
            studentNotesDiv.appendChild(studentHeader);

            const courseNotes = allStudentNotesData[studentId][courseCode];
            const sortedWeeks = Object.keys(courseNotes).sort((a, b) => parseInt(a) - parseInt(b));
            sortedWeeks.forEach(week => {
                const notePara = document.createElement('p');
                notePara.innerHTML = `<strong>الأسبوع ${week}:</strong> ${courseNotes[week].replace(/\n/g, '<br>')}`;
                studentNotesDiv.appendChild(notePara);
            });
            body.appendChild(studentNotesDiv);
        }
    });

    if (!notesFound) {
        body.textContent = 'لا توجد ملاحظات محفوظة لهذا المقرر لهذا المحاضر.';
        body.style.fontStyle = 'italic'; body.style.textAlign = 'center'; body.style.padding = '20px';
    }
    content.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'notes-modal-footer';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'إغلاق';
    closeBtn.className = 'notes-modal-button close-btn';
    closeBtn.type = "button";
    // Ensure closeModal is available before assigning onclick
    if (typeof closeModal === 'function') {
        closeBtn.onclick = closeModal; // Use global closeModal
    } else {
        console.error("displayAllCourseNotes Error: closeModal function not available for close button.");
    }
    footer.appendChild(closeBtn);
    content.appendChild(footer);

    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

/**
 * Deletes all notes for the current course and lecturer after confirmation.
 * @param {string} courseCode
 * @param {string} lecturerId
 */
async function deleteAllCourseNotes(courseCode, lecturerId) {
    // Ensure necessary functions/data are available
    // Added check for saveNotes from storage.js
    if (typeof saveNotes !== 'function' || typeof updateNotesVisuals !== 'function' || typeof closeModal !== 'function') {
         console.error("deleteAllCourseNotes Error: Required function(s) not defined!");
         return;
    }
    if (!courseCode || !lecturerId) { alert("لم يتم تحديد المقرر الحالي أو المحاضر."); return; }

    const confirmationMessage = `هل أنت متأكد من حذف جميع ملاحظاتك للمقرر ${courseCode}؟\nلا يمكن التراجع عن هذا الإجراء!`;
    if (!confirm(confirmationMessage)) { console.log("Deletion cancelled."); return; }

    console.log(`Deleting all notes for course: ${courseCode}, Lecturer: ${lecturerId}`);
    let notesDeleted = false;

    // Iterate through students and delete only the entry for the current course
    // Assumes allStudentNotesData is accessible globally and modifiable
    for (const studentId in allStudentNotesData) {
        if (allStudentNotesData?.[studentId]?.[courseCode]) {
            delete allStudentNotesData[studentId][courseCode];
            notesDeleted = true;
            // Clean up student entry if no other courses remain
            if (Object.keys(allStudentNotesData[studentId]).length === 0) {
                delete allStudentNotesData[studentId];
            }
        }
    }

    if (!notesDeleted) { alert(`لا توجد ملاحظات للمقرر ${courseCode} ليتم حذفها.`); return; }

    // Save the modified notes object back to storage using the storage function
    const success = await saveNotes(lecturerId, allStudentNotesData); // from storage.js

    if (success) {
        console.log(`All notes for course ${courseCode} deleted successfully.`);
        alert(`تم حذف جميع الملاحظات للمقرر ${courseCode}.`);
        updateNotesVisuals(courseCode); // Update icons on the page (from notes.js)
        closeModal(); // from utils.js
    } else {
        alert("حدث خطأ أثناء حذف الملاحظات!");
    }
}


/**
 * Creates the *collapsible* control panel element for the absence page using a Grid layout.
 * @param {object} initialSettings - The loaded settings for the lecturer.
 * @param {Function} onToggleChange - Callback function when a toggle changes.
 * @param {object} generalNoteData - Object containing { text: '...', lastModified: ... } for the general course note.
 * @param {string} lecturerId - Needed for saving the general note.
 * @param {string} courseCode - Needed for saving the general note.
 * @returns {HTMLElement} The panel element (<details>).
 */
function createAbsencePagePanelElement(initialSettings, onToggleChange, generalNoteData, lecturerId, courseCode) {
    // --- Changed main element to <details> ---
    const panel = document.createElement('details');
    panel.className = 'control-panel absence-panel panel-section-details'; // Added panel-section-details class
    panel.id = 'extension-absence-panel';
    panel.open = true; // Start expanded by default

    // --- Added <summary> for toggling ---
    const panelSummary = document.createElement('summary');
    panelSummary.className = 'panel-section-summary';
    panelSummary.textContent = 'لوحة تحكم إضافة معين (اضغط للتوسيع/الطي)';
    panel.appendChild(panelSummary);

    // --- Added container for the actual content ---
    const panelContent = document.createElement('div');
    panelContent.className = 'panel-section-content';

    // --- Title (Optional, keep outside grid) ---
    //const title = document.createElement('h4');
    //title.textContent = 'إعدادات وملاحظات المقرر';
    //title.style.marginBottom = '15px'; // Add space below title
    //panelContent.appendChild(title);

    // --- START: Grid Container ---
    const gridContainer = document.createElement('div');
    gridContainer.className = 'panel-grid-container'; // New class for the grid
    // --- END: Grid Container ---


    // --- Move existing sections INTO the gridContainer ---
    // AND add a common class 'panel-grid-item' to each section

    // Legend Section
    const legend = document.createElement('div');
    legend.className = 'panel-section panel-grid-item'; // Added panel-grid-item
    legend.id = 'grid-item-legend'; // Optional ID
    legend.innerHTML = `
        <h6>مفتاح الرموز:</h6>
        <div class="legend-category">
            <b class="legend-category-label">التظليل:</b>
            <div class="legend-line">
                <span class="color-box" style="background-color: #ffcccc;"></span>
                <span class="legend-text">(حرمان) &gt; 21%</span>
            </div>
            <div class="legend-line">
                <span class="color-box" style="background-color: #ffff99;"></span>
                <span class="legend-text">(إنذار) = 6 غياب</span>
            </div>
        </div>
        <div class="legend-category">
            <b class="legend-category-label">أيقونة الملاحظات:</b>
            <div class="legend-line">
                <span class="icon-legend notes-icon-has-notes">✏️</span>
                <span class="legend-text"><small>(يوجد ملاحظة)</small></span>
            </div>
            <div class="legend-line">
                <span class="icon-legend notes-icon-default">📝</span>
                <span class="legend-text"><small>(فارغ)</small></span>
            </div>
        </div>
    `;
    gridContainer.appendChild(legend); // Append to grid container

    // Highlight Toggles Section
    const highlightTogglesDiv = document.createElement('div');
    highlightTogglesDiv.className = 'panel-toggles panel-section panel-grid-item'; // Added panel-grid-item
    highlightTogglesDiv.id = 'grid-item-toggles'; // Optional ID
    highlightTogglesDiv.innerHTML = '<h6>إعدادات التظليل:</h6>'; // Add section title
    // (Code for red/yellow toggles)
    const redToggleLabel = document.createElement('label');
    const redToggleInput = document.createElement('input');
    redToggleInput.type = 'checkbox';
    redToggleInput.checked = initialSettings.redHighlightEnabled;
    redToggleInput.id = 'toggle-red-highlight';
    redToggleInput.addEventListener('change', (event) => {
        if (typeof onToggleChange === 'function') {
             onToggleChange('red', event.target.checked);
        } else { console.error("onToggleChange is not a function!"); }
    });
    redToggleLabel.appendChild(redToggleInput);
    redToggleLabel.appendChild(document.createTextNode(' تظليل المحرومين (أحمر) '));
    redToggleLabel.htmlFor = 'toggle-red-highlight';
    highlightTogglesDiv.appendChild(redToggleLabel);

    const yellowToggleLabel = document.createElement('label');
    const yellowToggleInput = document.createElement('input');
    yellowToggleInput.type = 'checkbox';
    yellowToggleInput.checked = initialSettings.yellowHighlightEnabled;
    yellowToggleInput.id = 'toggle-yellow-highlight';
    yellowToggleInput.addEventListener('change', (event) => {
         if (typeof onToggleChange === 'function') {
            onToggleChange('yellow', event.target.checked);
         } else { console.error("onToggleChange is not a function!"); }
    });
    yellowToggleLabel.appendChild(yellowToggleInput);
    yellowToggleLabel.appendChild(document.createTextNode(' تظليل من على وشك الحرمان (أصفر) '));
    yellowToggleLabel.htmlFor = 'toggle-yellow-highlight';
    highlightTogglesDiv.appendChild(yellowToggleLabel);
    // Append directly to grid container
    gridContainer.appendChild(highlightTogglesDiv);

    // Custom Columns Section
    const customColumnsDiv = document.createElement('div');
    customColumnsDiv.className = 'panel-custom-columns panel-section panel-grid-item'; // Added panel-grid-item
    customColumnsDiv.id = 'grid-item-custom-cols'; // Optional ID
    customColumnsDiv.innerHTML = '<h6>الأعمدة المخصصة:</h6>'; // Add section title
    // (Code for add/manage column buttons)
    const addColumnButton = document.createElement('button');
    addColumnButton.type = "button";
    addColumnButton.textContent = '➕ إضافة عمود';
    addColumnButton.title = 'إضافة عمود مخصص جديد';
    addColumnButton.className = 'panel-button';
    addColumnButton.id = 'add-custom-column-button';
    customColumnsDiv.appendChild(addColumnButton);

    const manageColumnsButton = document.createElement('button');
    manageColumnsButton.type = "button";
    manageColumnsButton.textContent = '⚙️ إدارة الأعمدة';
    manageColumnsButton.title = 'إدارة الأعمدة المخصصة الحالية (إعادة تسمية/حذف)';
    manageColumnsButton.className = 'panel-button';
    manageColumnsButton.id = 'manage-custom-columns-button';
    customColumnsDiv.appendChild(manageColumnsButton);
    // Append directly to grid container
    gridContainer.appendChild(customColumnsDiv);


    // Note Actions Section (Per-student notes)
    const noteActionsDiv = document.createElement('div');
    noteActionsDiv.className = 'panel-note-actions panel-section panel-grid-item'; // Added panel-grid-item
    noteActionsDiv.id = 'grid-item-student-notes'; // Optional ID
    noteActionsDiv.innerHTML = '<h6>ملاحظات الطلاب (الأسبوعية):</h6>'; // Add section title
    // (Code for view-all/delete-all buttons)
    const viewAllButton = document.createElement('button');
    viewAllButton.type = "button";
    viewAllButton.textContent = 'عرض كل ملاحظات الطلاب للمقرر';
    viewAllButton.className = 'panel-button';
    viewAllButton.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
        if (typeof getCurrentCourseCodeFromPage !== 'function' || typeof displayAllCourseNotes !== 'function') {
             console.error("ViewAll Button Error: Dependency function(s) not defined!"); return;
        }
        const currentCourseCode = getCurrentCourseCodeFromPage();
        const currentLecturerId = document.body.dataset.lecturerId;
        if (currentCourseCode && currentLecturerId) {
            displayAllCourseNotes(currentCourseCode, currentLecturerId);
        } else {
            alert("خطأ: لا يمكن تحديد المقرر أو المحاضر لعرض الملاحظات.");
        }
    });
    noteActionsDiv.appendChild(viewAllButton);

    const deleteAllButton = document.createElement('button');
    deleteAllButton.type = "button";
    deleteAllButton.textContent = 'حذف كل ملاحظات الطلاب للمقرر';
    deleteAllButton.className = 'panel-button danger';
    deleteAllButton.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
         if (typeof getCurrentCourseCodeFromPage !== 'function' || typeof deleteAllCourseNotes !== 'function') {
             console.error("DeleteAll Button Error: Dependency function(s) not defined!"); return;
        }
         const currentCourseCode = getCurrentCourseCodeFromPage();
         const currentLecturerId = document.body.dataset.lecturerId;
        if (currentCourseCode && currentLecturerId) {
            deleteAllCourseNotes(currentCourseCode, currentLecturerId);
        } else {
            alert("خطأ: لا يمكن تحديد المقرر أو المحاضر لحذف الملاحظات.");
        }
    });
    noteActionsDiv.appendChild(deleteAllButton);
    // Append directly to grid container
    gridContainer.appendChild(noteActionsDiv);

    // --- START: General Course Note Section --- (Code unchanged, just ensure placement)
    const generalNoteSection = document.createElement('div');
    generalNoteSection.className = 'panel-general-note panel-section panel-grid-item'; // Added panel-grid-item
    generalNoteSection.id = 'grid-item-general-note'; // Optional ID

    const generalNoteTitle = document.createElement('h5');
    generalNoteTitle.textContent = 'ملاحظات عامة للمقرر (تبقى ظاهرة عبر الأسابيع)';
    generalNoteTitle.style.marginTop = '0';
    generalNoteSection.appendChild(generalNoteTitle);

    const generalNoteTextarea = document.createElement('textarea');
    generalNoteTextarea.id = 'general-course-note-textarea';
    generalNoteTextarea.placeholder = 'أضف ملاحظة عامة لهذا المقرر... (مثل: تذكير بموعد اختبار، ملاحظة عن سلوك عام، إلخ)';
    generalNoteTextarea.style.width = '98%'; // Consider setting width via CSS instead
    generalNoteTextarea.style.minHeight = '60px';
    generalNoteTextarea.style.marginBottom = '5px';
    generalNoteTextarea.value = generalNoteData?.text || '';
    generalNoteSection.appendChild(generalNoteTextarea);

    const generalNoteSaveButton = document.createElement('button');
    generalNoteSaveButton.id = 'save-general-note-button';
    generalNoteSaveButton.type = 'button';
    generalNoteSaveButton.textContent = 'حفظ الملاحظة العامة';
    generalNoteSaveButton.className = 'panel-button';
    generalNoteSaveButton.style.marginRight = '10px';

    generalNoteSaveButton.addEventListener('click', async () => {
        const newText = generalNoteTextarea.value;
        if (typeof saveGeneralCourseNote === 'function') {
            console.log("Saving general course note...");
            const success = await saveGeneralCourseNote(lecturerId, courseCode, newText);
            if (success) {
                console.log("General course note saved successfully.");
                const timestampSpan = document.getElementById('general-note-timestamp');
                if (timestampSpan) {
                   timestampSpan.textContent = ` (آخر تحديث: الآن)`;
                }
                alert("تم حفظ الملاحظة العامة للمقرر.");
            } else {
                alert("حدث خطأ أثناء حفظ الملاحظة العامة.");
            }
        } else {
            console.error("saveGeneralCourseNote function not found!");
            alert("خطأ فني: لا يمكن حفظ الملاحظة العامة.");
        }
    });
    generalNoteSection.appendChild(generalNoteSaveButton);

    const timestampSpan = document.createElement('span');
    timestampSpan.id = 'general-note-timestamp';
    timestampSpan.style.fontSize = '0.8em';
    timestampSpan.style.color = '#666';
    if (generalNoteData?.lastModified) {
        timestampSpan.textContent = ` (آخر تحديث: ${new Date(generalNoteData.lastModified).toLocaleString('ar-SA')})`; // Added locale
    } else {
        timestampSpan.textContent = ` (لا يوجد تحديث سابق)`;
    }
    generalNoteSection.appendChild(timestampSpan);
    // Append directly to grid container
    gridContainer.appendChild(generalNoteSection);
    // --- END: General Course Note Section ---


    // --- Append the Grid Container to the main panel content ---
    panelContent.appendChild(gridContainer);

    // --- Remove the old actionsContainer append line ---
    // panelContent.appendChild(actionsContainer); // <<< REMOVE THIS LINE

    panel.appendChild(panelContent); // Add content div to the main <details> element

    return panel;
}

// Update ensureAbsencePagePanelInjected to pass the new generalNoteData, lecturerId, courseCode
/**
 * Injects the absence page control panel if not already present.
 * @param {object} initialSettings
 * @param {Function} onToggleChange
 * @param {object} generalNoteData // ADDED
 * @param {string} lecturerId      // ADDED
 * @param {string} courseCode      // ADDED
 */
function ensureAbsencePagePanelInjected(initialSettings, onToggleChange, generalNoteData, lecturerId, courseCode) { // ADDED Params
    if (absencePanelInjected || document.getElementById('extension-absence-panel')) {
        return; // Already injected
    }
     if (typeof findStudentTableById !== 'function' || typeof safeInjectBefore !== 'function' || typeof createAbsencePagePanelElement !== 'function') {
         console.error("ensureAbsencePagePanelInjected Error: Dependency function(s) not defined!");
         return;
     }
    const tableElement = findStudentTableById(absencePageTableIdForPanel);
    if (!tableElement) {
        console.error("Cannot inject absence panel: Table not found using ID:", absencePageTableIdForPanel);
        return;
    }
    console.log("Injecting absence page control panel...");
    // Pass new arguments to the create function
    const panelElement = createAbsencePagePanelElement(initialSettings, onToggleChange, generalNoteData, lecturerId, courseCode); // ADDED Args
    safeInjectBefore(panelElement, tableElement); // Inject before table
    absencePanelInjected = true;
    console.log("Absence page control panel injected.");
}

console.log("Extension: ui_absence_panel.js loaded.");