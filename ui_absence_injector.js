/**
 * ui_absence_injector.js
 * Handles injecting UI elements (notes column, icons) into the absence table.
 */

/**
 * Injects the notes column header and icons/buttons into the table rows.
 * Adds necessary data attributes and event listeners.
 * @param {HTMLTableSectionElement} tbodyNode The tbody element of the student table.
 * @param {string} lecturerId The currently logged-in lecturer's ID.
 */
function injectNotesUI(tbodyNode, lecturerId) {
    const table = tbodyNode.closest('table');
    if (!table || !lecturerId) {
        console.warn("Notes UI Injection skipped: Missing tbody or lecturerId.");
        return;
    }
    // Check if already injected for this specific table instance
    if (table.dataset.notesUiInjected === 'true') {
        // console.log("Notes UI already injected for this table."); // Reduce noise
        return;
    }

    console.log("Injecting Notes UI elements (column, icons)...");

    // Add Header if not exists
    const headerRow = table.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('.notes-header')) {
        const notesHeader = document.createElement('th');
        notesHeader.className = 'HEADING notes-header';
        notesHeader.textContent = 'ملاحظات';
        notesHeader.scope = 'col';
        headerRow.appendChild(notesHeader);
    }

    // Add Cell and Icon to each student row
    const rows = tbodyNode.querySelectorAll(':scope > tr');
    rows.forEach((row, index) => {
        // Check if cell already added for this row
        if (row.querySelector('.notes-cell')) {
            return; // Skip
        }

        const cells = row.querySelectorAll(':scope > td');
        const notesCell = document.createElement('td');
        notesCell.className = 'notes-cell';

        // Ensure we have enough cells to get ID and Name
        if (cells.length >= 3) {
            const studentIdCell = cells[1];
            const studentNameCell = cells[2];
            const studentId = studentIdCell?.textContent.trim();

            // Extract name more reliably
            const studentNameLink = studentNameCell?.querySelector('a p, p'); // Look for p inside a, or just p
            const studentName = studentNameLink
                              ? studentNameLink.textContent.trim().replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '') // Trim carefully
                              : `الطالب ${index + 1}`; // Fallback name

            if (studentId) {
                const iconButton = document.createElement('button');
                iconButton.type = "button"; // Prevent form submission
                iconButton.className = 'notes-icon-button';
                iconButton.innerHTML = '📝'; // Default icon (no notes)
                iconButton.dataset.studentId = studentId;
                iconButton.dataset.studentName = studentName; // Store name for modal
                iconButton.title = 'إضافة/عرض ملاحظات'; // Default tooltip

                // Add click listener to open the modal
                iconButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Call the modal function from notes.js
                    openNotesModal(studentId, studentName, lecturerId); // Pass lecturerId
                });

                notesCell.appendChild(iconButton);
            } else {
                // No student ID found, add empty content
                notesCell.innerHTML = '&nbsp;';
            }
        } else {
            // Not enough cells, add empty content
            notesCell.innerHTML = '&nbsp;';
        }
        row.appendChild(notesCell); // Append the new cell
    });

    table.dataset.notesUiInjected = 'true'; // Mark table as processed
    console.log("Notes UI elements injection complete.");
}
