/**
 * highlighter.js
 * Handles the logic for highlighting student rows on the absence page
 * based on absence criteria and enabled/disabled state from settings.
 */

/**
 * Applies or removes highlighting classes based on criteria and settings.
 * @param {HTMLTableSectionElement} tbodyNode The tbody element of the student table.
 * @param {object} settings The settings object for the current lecturer.
 * Expected: { yellowHighlightEnabled: boolean, redHighlightEnabled: boolean }
 */
function highlightAbsenceRows(tbodyNode, settings) {
    if (!tbodyNode || !settings) {
        console.warn("Highlighting skipped: Missing tbody or settings.");
        return;
    }
    // console.log("Running absence highlight check with settings:", settings); // Reduce noise

    const rows = tbodyNode.querySelectorAll(':scope > tr');
    rows.forEach((row) => {
        const cells = row.querySelectorAll(':scope > td');
        // Always remove first
        row.classList.remove('highlight-red', 'highlight-yellow');
        let highlightClass = null;

        // Check original column count needed for data extraction
        if (cells.length >= 9) {
            let absencePercentage = NaN;
            let unexcusedAbsences = NaN;

            // Extract data safely
            try {
                // Percentage (Cell 9, index 8)
                absencePercentage = parseFloat(cells[8]?.textContent.trim());
            } catch (e) { /* ignore parsing errors */ }
            try {
                // Unexcused Absences (Cell 4, index 3 - last number)
                const absenceCountText = cells[3]?.textContent.trim();
                const match = absenceCountText?.match(/(\d+)$/);
                if (match?.[1]) {
                    unexcusedAbsences = parseInt(match[1], 10);
                }
            } catch (e) { /* ignore parsing errors */ }

            // Apply highlighting based on criteria AND toggle state from settings
            if (settings.redHighlightEnabled && !isNaN(absencePercentage) && absencePercentage > 21) {
                highlightClass = 'highlight-red';
            } else if (settings.yellowHighlightEnabled && !isNaN(unexcusedAbsences) && unexcusedAbsences === 6) {
                // Ensure red wasn't applied (red takes priority if both enabled and criteria met)
                if (highlightClass !== 'highlight-red') { // Check the determined class, not the element's class yet
                    highlightClass = 'highlight-yellow';
                }
            }

            // Apply the determined class
            if (highlightClass) {
                row.classList.add(highlightClass);
            }
        }
    });
     // console.log("Absence highlighting complete."); // Reduce noise
}
