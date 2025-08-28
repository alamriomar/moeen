/**
 * custom_column_injector.js
 * Handles injecting custom column headers and cells into the absence table.
 * Manages data updates for these columns.
 */

console.log("Extension: custom_column_injector.js loaded.");

// Store reference to the debounced save function to avoid recreating it constantly
let debouncedSaveStudentData = null;

/**
 * Saves the data for a single student's custom column.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {string} studentId
 * @param {string} columnId
 * @param {string|boolean} value
 * @param {object} currentCourseColumnData - The current data object for the course.
 * @param {Array<object>} currentDefinitions - The current definitions array for the course.
 */
async function saveStudentCustomColumnData(lecturerId, courseCode, studentId, columnId, value, currentCourseColumnData, currentDefinitions) {
    if (!lecturerId || !courseCode || !studentId || !columnId) {
        console.error("Custom Column Save Error: Missing identifiers.");
        return;
    }
    // Ensure data structure exists
    currentCourseColumnData = currentCourseColumnData || {};
    currentCourseColumnData[studentId] = currentCourseColumnData[studentId] || {};

    // Update or delete the value
    if ((typeof value === 'string' && value.trim() !== '') || typeof value === 'boolean') {
         // For checkboxes, ensure we save boolean true/false, not just presence
         currentCourseColumnData[studentId][columnId] = typeof value === 'boolean' ? value : value.trim();
    } else {
        // Delete empty strings or false checkboxes if desired (or just save them)
        // Current logic: Save false, delete empty strings
        if (typeof value === 'boolean') {
             currentCourseColumnData[studentId][columnId] = false;
        } else {
             delete currentCourseColumnData[studentId][columnId];
             // Optional: Clean up student entry if no custom columns remain
             if (Object.keys(currentCourseColumnData[studentId]).length === 0) {
                 delete currentCourseColumnData[studentId];
             }
        }
    }

    console.log(`Saving custom column data: L:${lecturerId}, C:${courseCode}, S:${studentId}, Col:${columnId}, Val:${value}`);

    // Use the storage function to save the entire updated data object for the course
    // Ensure saveCustomColumns is available
    if (typeof saveCustomColumns === 'function') {
        await saveCustomColumns(lecturerId, courseCode, currentDefinitions, currentCourseColumnData);
    } else {
        console.error("Custom Column Save Error: saveCustomColumns function not found!");
    }
}

/**
 * Clears previously injected custom columns and headers.
 * @param {HTMLTableElement} table - The main absence table element.
 */
function clearExistingCustomColumns(table) {
    if (!table) return;
    // Remove headers
    table.querySelectorAll('thead th.custom-column-header').forEach(th => th.remove());
    // Remove cells
    table.querySelectorAll('tbody td.custom-column-cell').forEach(td => td.remove());
    console.log("Cleared existing custom columns.");
}


/**
 * Injects custom column headers and cells into the table.
 * @param {HTMLTableSectionElement} tbodyNode - The tbody element of the student table.
 * @param {string} courseCode - The current course code.
 * @param {string} lecturerId - The current lecturer ID.
 * @param {Array<object>} definitions - Array of column definitions {id, name, type}.
 * @param {object} studentData - Object mapping studentId -> {columnId: value}.
 */
function injectCustomColumns(tbodyNode, courseCode, lecturerId, definitions, studentData) {
    const table = tbodyNode?.closest('table');
    if (!table || !courseCode || !lecturerId || !definitions || !studentData) {
        console.warn("Custom Column Injection skipped: Missing required parameters.");
        return;
    }

    // Clear previous custom columns first to handle definition changes (rename/delete)
    clearExistingCustomColumns(table);

    if (definitions.length === 0) {
        console.log("No custom column definitions for this course. Skipping injection.");
        return;
    }

    console.log(`Injecting ${definitions.length} custom columns...`);

    // --- Setup Debounced Save Function ---
    // Ensure debounce is available
    if (typeof debounce !== 'function') {
        console.error("injectCustomColumns Error: debounce function not defined!");
        // Fallback: Save immediately (might be slow)
        debouncedSaveStudentData = saveStudentCustomColumnData;
    } else if (!debouncedSaveStudentData) {
        // Create debounced version only once
        debouncedSaveStudentData = debounce(saveStudentCustomColumnData, 500); // Debounce by 500ms
    }

    // --- Inject Headers ---
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) {
        console.error("Custom Column Injection Error: Cannot find header row.");
        return;
    }
    definitions.forEach(colDef => {
        const customHeader = document.createElement('th');
        customHeader.className = 'HEADING custom-column-header'; // Add specific class
        customHeader.textContent = colDef.name;
        customHeader.scope = 'col';
        customHeader.dataset.columnId = colDef.id; // Store ID for reference
        customHeader.style.minWidth = colDef.type === 'text' ? '80px' : '50px'; // Basic width
        customHeader.style.textAlign = 'center';
        headerRow.appendChild(customHeader);
    });

    // --- Inject Cells and Inputs ---
    const rows = tbodyNode.querySelectorAll(':scope > tr');
    rows.forEach((row) => {
        const studentIdCell = row.cells[1]; // Assuming student ID is always cell 1
        const studentId = studentIdCell?.textContent.trim();

        if (!studentId) {
            // If no student ID, add empty cells for alignment
            definitions.forEach(() => {
                const emptyCell = document.createElement('td');
                emptyCell.className = 'custom-column-cell';
                emptyCell.innerHTML = '&nbsp;';
                row.appendChild(emptyCell);
            });
            return; // Skip processing inputs for this row
        }

        // Get data for this specific student
        const studentColumnData = studentData[studentId] || {};

        definitions.forEach(colDef => {
            const customCell = document.createElement('td');
            customCell.className = 'custom-column-cell';
            customCell.style.textAlign = 'center';
            customCell.style.verticalAlign = 'middle';

            const currentValue = studentColumnData[colDef.id];
            let inputElement;

            if (colDef.type === 'check') {
                inputElement = document.createElement('input');
                inputElement.type = 'checkbox';
                inputElement.checked = !!currentValue; // Ensure boolean
                inputElement.addEventListener('change', (event) => {
                    // Save immediately for checkboxes
                    saveStudentCustomColumnData(lecturerId, courseCode, studentId, colDef.id, event.target.checked, studentData, definitions);
                });
            } else { // type === 'text'
                inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.maxLength = 10;
                inputElement.value = currentValue || '';
                inputElement.style.width = '90%';
                inputElement.style.textAlign = 'center';
                inputElement.addEventListener('input', (event) => {
                    // Use debounced save for text input
                    debouncedSaveStudentData(lecturerId, courseCode, studentId, colDef.id, event.target.value, studentData, definitions);
                });
            }

            inputElement.dataset.studentId = studentId;
            inputElement.dataset.columnId = colDef.id;
            customCell.appendChild(inputElement);
            row.appendChild(customCell);
        });
    });

    console.log("Custom column injection complete.");
}
