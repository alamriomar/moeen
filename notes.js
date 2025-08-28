/**
 * notes.js
 * Handles the creation, display, and interaction logic for the
 * single-student notes modal on the absence page.
 * Relies on global `allStudentNotesData` (loaded by main_absence.js)
 * and `currentCourseCode`, `currentWeekNumber` (from utils.js).
 */

/**
 * Creates and displays the notes modal for a student, handling view switching.
 * @param {string} studentId
 * @param {string} studentName
 * @param {string} lecturerId // Added: Needed for saving notes
 */
function openNotesModal(studentId, studentName, lecturerId) {
    closeModal(); // From utils.js

    const courseCode = getCurrentCourseCodeFromPage(); // From dom_utils.js
    const weekNow = getCurrentWeekNumberFromPage(); // From dom_utils.js

    if (!studentId || !studentName || !courseCode || !weekNow || !lecturerId) {
        console.error("Cannot open modal: Missing required info (student/course/week/lecturer).");
        alert("خطأ: لم يتم العثور على معلومات الطالب أو المقرر أو الأسبوع الحالي أو المحاضر.");
        return;
    }
    console.log(`Opening notes modal for Student: ${studentId}, Course: ${courseCode}, Week: ${weekNow}, Lecturer: ${lecturerId}`);

    // Access the globally loaded notes data for the specific lecturer
    const studentAllNotes = allStudentNotesData[studentId] || {}; // Use global data
    const currentCourseNotes = studentAllNotes[courseCode] || {};
    const currentWeekNoteText = currentCourseNotes[weekNow] || '';

    // --- Create Modal Elements ---
    const overlay = document.createElement('div');
    overlay.id = 'studentNotesModalOverlay'; // ID for single student modal
    overlay.className = 'notes-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    const content = document.createElement('div');
    content.className = 'notes-modal-content';

    // Header
    const header = document.createElement('div');
    header.className = 'notes-modal-header';
    header.textContent = `ملاحظات الطالب: ${studentName} (${studentId})`;
    content.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'notes-modal-body';

    // --- View 1: Current Course View ---
    const currentCourseViewDiv = document.createElement('div');
    currentCourseViewDiv.id = 'notes-view-current';
    currentCourseViewDiv.className = 'notes-modal-view';
    currentCourseViewDiv.style.display = 'block'; // Show by default

    const currentHeader = document.createElement('h5');
    currentHeader.textContent = `ملاحظات المقرر الحالي (${courseCode}):`;
    currentCourseViewDiv.appendChild(currentHeader);

    // Display area for current course notes
    const currentDisplayArea = document.createElement('div');
    currentDisplayArea.className = 'notes-display-area';
    const currentSortedWeeks = Object.keys(currentCourseNotes).sort((a, b) => parseInt(a) - parseInt(b));
    if (currentSortedWeeks.length > 0) {
        currentSortedWeeks.forEach(week => {
             const notePara = document.createElement('p');
             notePara.innerHTML = `<strong>الأسبوع ${week}:</strong> ${currentCourseNotes[week].replace(/\n/g, '<br>')}`;
             currentDisplayArea.appendChild(notePara);
        });
    } else {
        currentDisplayArea.textContent = 'لا توجد ملاحظات محفوظة لهذا المقرر.';
        currentDisplayArea.style.fontStyle = 'italic';
    }
    currentCourseViewDiv.appendChild(currentDisplayArea);

    // Edit area for current week/course
    const currentEditArea = document.createElement('div');
    currentEditArea.className = 'notes-edit-area';
    currentEditArea.style.marginTop = '15px';
    const editLabel = document.createElement('label');
    editLabel.htmlFor = 'current-week-note-textarea';
    editLabel.textContent = `إضافة/تعديل ملاحظة الأسبوع الحالي (${weekNow}):`;
    currentEditArea.appendChild(editLabel);
    const editTextarea = document.createElement('textarea');
    editTextarea.id = 'current-week-note-textarea';
    editTextarea.value = currentWeekNoteText;
    editTextarea.placeholder = `اكتب ملاحظتك للأسبوع ${weekNow} في مقرر ${courseCode}...`;
    currentEditArea.appendChild(editTextarea);
    currentCourseViewDiv.appendChild(currentEditArea);

    // Button to switch to other courses view
    const viewOthersButton = document.createElement('button');
    viewOthersButton.textContent = 'عرض ملاحظات المقررات الأخرى';
    viewOthersButton.className = 'notes-modal-button switch-view-btn';
    viewOthersButton.type = "button";
    currentCourseViewDiv.appendChild(viewOthersButton);

    body.appendChild(currentCourseViewDiv);

    // --- View 2: Other Courses View ---
    const otherCoursesViewDiv = document.createElement('div');
    otherCoursesViewDiv.id = 'notes-view-others';
    otherCoursesViewDiv.className = 'notes-modal-view';
    otherCoursesViewDiv.style.display = 'none'; // Hide by default

    const otherHeader = document.createElement('h5');
    otherHeader.textContent = 'ملاحظات المقررات الأخرى:';
    otherCoursesViewDiv.appendChild(otherHeader);

    const otherDisplayArea = document.createElement('div');
    otherDisplayArea.className = 'notes-display-area';
    let hasOtherNotes = false;
    Object.keys(studentAllNotes).sort().forEach(otherCourseCode => {
        if (otherCourseCode !== courseCode) {
            const otherCourseNotes = studentAllNotes[otherCourseCode] || {};
            const otherSortedWeeks = Object.keys(otherCourseNotes).sort((a, b) => parseInt(a) - parseInt(b));
            if (otherSortedWeeks.length > 0) {
                hasOtherNotes = true;
                const courseNotesDiv = document.createElement('div');
                courseNotesDiv.className = 'other-course-block';
                const courseTitle = document.createElement('strong');
                courseTitle.textContent = `المقرر ${otherCourseCode}:`;
                courseNotesDiv.appendChild(courseTitle);
                otherSortedWeeks.forEach(week => {
                    const notePara = document.createElement('p');
                    notePara.innerHTML = `<small>الأسبوع ${week}: ${otherCourseNotes[week].replace(/\n/g, '<br>')}</small>`;
                    courseNotesDiv.appendChild(notePara);
                });
                otherDisplayArea.appendChild(courseNotesDiv);
            }
        }
    });
    if (!hasOtherNotes) {
        otherDisplayArea.textContent = 'لا توجد ملاحظات مسجلة في مقررات أخرى لهذا الطالب.';
        otherDisplayArea.style.fontStyle = 'italic';
    }
    otherCoursesViewDiv.appendChild(otherDisplayArea);

    // Button to switch back to current course view
    const viewCurrentButton = document.createElement('button');
    viewCurrentButton.textContent = 'الرجوع إلى المقرر الحالي';
    viewCurrentButton.className = 'notes-modal-button switch-view-btn';
    viewCurrentButton.type = "button";
    otherCoursesViewDiv.appendChild(viewCurrentButton);

    body.appendChild(otherCoursesViewDiv);
    content.appendChild(body);

    // --- Footer with Save/Close ---
    const footer = document.createElement('div');
    footer.className = 'notes-modal-footer';
    const saveButton = document.createElement('button');
    saveButton.textContent = `حفظ للأسبوع ${weekNow} (${courseCode})`;
    saveButton.className = 'notes-modal-button save';
    saveButton.id = 'modal-save-button';
    saveButton.type = "button";
    saveButton.onclick = () => {
        const noteText = document.getElementById('current-week-note-textarea').value;
        // Use the saveNote function from storage.js (assuming it's available globally)
        saveNote(lecturerId, studentId, courseCode, weekNow, noteText); // Pass lecturerId
    };
    footer.appendChild(saveButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'إغلاق';
    closeButton.className = 'notes-modal-button close-btn';
    closeButton.type = "button";
    closeButton.onclick = closeModal; // Use global closeModal from utils.js
    footer.appendChild(closeButton);
    content.appendChild(footer);

    // --- Link Switch Buttons ---
    viewOthersButton.addEventListener('click', (event) => {
         event.preventDefault(); event.stopPropagation();
         currentCourseViewDiv.style.display = 'none';
         otherCoursesViewDiv.style.display = 'block';
         saveButton.style.display = 'none';
    });
    viewCurrentButton.addEventListener('click', (event) => {
         event.preventDefault(); event.stopPropagation();
         otherCoursesViewDiv.style.display = 'none';
         currentCourseViewDiv.style.display = 'block';
         saveButton.style.display = 'inline-block';
    });

    overlay.appendChild(content);
    document.body.appendChild(overlay);
    document.getElementById('current-week-note-textarea').focus();
}

/**
 * Updates the visual style of note icons based on loaded data for the current course.
 * @param {string} currentCourseCode - The code of the course currently displayed.
 */
function updateNotesVisuals(currentCourseCode) {
    if (!currentCourseCode) return; // Need course context
    // console.log("Updating notes icon visuals for course:", currentCourseCode); // Reduce noise
    const icons = document.querySelectorAll('.notes-icon-button');
    icons.forEach(icon => {
        const studentId = icon.dataset.studentId;
        let hasNotes = false;
        // Check the globally loaded data
        if (studentId && allStudentNotesData?.[studentId]?.[currentCourseCode] && Object.keys(allStudentNotesData[studentId][currentCourseCode]).length > 0) {
            hasNotes = true;
        }
        // Update icon and title based on whether notes exist for the *current* course
        if (hasNotes) {
            icon.classList.add('has-notes');
            icon.innerHTML = '✏️'; // Pencil icon
            icon.title = `تعديل/عرض ملاحظات المقرر ${currentCourseCode}`;
        } else {
            icon.classList.remove('has-notes');
            icon.innerHTML = '📝'; // Document icon
            icon.title = `إضافة ملاحظات للمقرر ${currentCourseCode}`;
        }
    });
     // console.log("Notes visuals updated."); // Reduce noise
}

/**
 * Modified saveNote function to fit within notes.js context if needed,
 * or preferably use the global one from storage.js.
 * This version assumes global `allStudentNotesData` is updated directly
 * and calls the global `saveNotes` from storage.js.
 * @param {string} lecturerId
 * @param {string} studentId
 * @param {string} courseCode
 * @param {string} week
 * @param {string} noteText
 */
async function saveCurrentNote(lecturerId, studentId, courseCode, week, noteText) {
    console.log(`UI: Preparing to save note for Student: ${studentId}, Course: ${courseCode}, Week: ${week}`);
    if (!lecturerId || !studentId || !courseCode || !week) {
        console.error("Save failed: Missing identifiers.");
        alert("خطأ: لا يمكن تحديد الطالب أو المقرر أو الأسبوع لحفظ الملاحظة.");
        return;
    }

    // Update the global data structure directly (assuming it's loaded)
    allStudentNotesData = allStudentNotesData || {};
    allStudentNotesData[studentId] = allStudentNotesData[studentId] || {};
    allStudentNotesData[studentId][courseCode] = allStudentNotesData[studentId][courseCode] || {};
    const trimmedNoteText = noteText.trim();

    if (trimmedNoteText !== '') {
        allStudentNotesData[studentId][courseCode][week] = trimmedNoteText;
    } else {
        // Delete logic
        delete allStudentNotesData[studentId][courseCode][week];
        if (Object.keys(allStudentNotesData[studentId][courseCode]).length === 0) delete allStudentNotesData[studentId][courseCode];
        if (Object.keys(allStudentNotesData[studentId]).length === 0) delete allStudentNotesData[studentId];
    }

    // Call the storage function to persist the entire updated notes object
    const success = await saveNotes(lecturerId, allStudentNotesData); // Use storage.js function

    if (success) {
        console.log("Notes update persisted successfully.");
        updateNotesVisuals(courseCode); // Update icons for the current course
        closeModal(); // Close the modal
    } else {
        alert("حدث خطأ أثناء حفظ الملاحظة!");
        // Consider reverting the change in allStudentNotesData if save failed? More complex.
    }
}

// Modify the save button's onclick in openNotesModal to call this function:
// saveButton.onclick = () => {
//     const noteText = document.getElementById('current-week-note-textarea').value;
//     saveCurrentNote(lecturerId, studentId, courseCode, weekNow, noteText);
// };
