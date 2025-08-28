/**
 * dom_utils.js
 * Utility functions specifically for interacting with the DOM of UT pages.
 * Updated to handle inconsistencies in the sections table structure, course code detection,
 * and provide specific target finding for home page panel injection.
 */

// --- Functions for Absence Page ---

/**
 * Reads the current week number displayed on the absence page.
 * @returns {string|null} The current week number as a string, or null if not found.
 */
function getCurrentWeekNumberFromPage() {
    try {
        const weekElement = document.getElementById('myForm:week');
        if (weekElement?.textContent) {
            const weekText = weekElement.textContent.trim();
            if (weekText) {
                console.log("DOM: Detected Week Number:", weekText);
                return weekText;
            }
        }
    } catch (e) { console.error("DOM Error: Failed to read current week:", e); }
    console.warn("DOM: Could not find current week element (#myForm:week).");
    return null;
}

/**
 * Reads the current course code displayed on the absence page.
 * Attempts multiple strategies to find the code due to potential dynamic loading or structure variations.
 * @returns {string|null} The course code (e.g., "MIS 1202") or null.
 */
function getCurrentCourseCodeFromPage() {
    console.log("DOM: Attempting to detect course code...");
    try {
        // Attempt 1: Look in the specific info table
        console.log("DOM: Attempt 1 - Searching specific info table [border='0'][cellpadding='1'][cellspacing='1']...");
        const infoTable = document.querySelector('#myForm table[border="0"][cellpadding="1"][cellspacing="1"]');
        if (infoTable) {
            const infoSpans = infoTable.querySelectorAll('td span.fontText');
            for (let i = 0; i < infoSpans.length; i++) {
                const spanText = infoSpans[i].textContent.trim();
                if (spanText === 'رمز المقرر') {
                    let valueCell = infoSpans[i].closest('td')?.nextElementSibling?.nextElementSibling;
                    let valueSpan = valueCell?.querySelector('span.fontText');
                    if (valueSpan?.textContent) {
                        const courseCode = valueSpan.textContent.trim();
                        if (courseCode) {
                            console.log("DOM: Detected Course Code (Attempt 1 - Specific Table):", courseCode);
                            return courseCode;
                        }
                    } else {
                        console.warn("DOM: Attempt 1 - Found 'رمز المقرر' label, but couldn't find value span.");
                    }
                    console.warn("DOM: Attempt 1 - Failed to extract value after finding label. Halting search.");
                    return null;
                }
            }
             console.log("DOM: Attempt 1 - 'رمز المقرر' label not found in the specific info table.");
        } else {
            console.log("DOM: Attempt 1 - Specific info table not found.");
        }

        // Attempt 2: Broad search (Fallback)
         console.log("DOM: Attempt 2 - Performing broader search across all tables in #myForm...");
         const allSpans = document.querySelectorAll('#myForm table td span.fontText');
         for (let i = 0; i < allSpans.length; i++) {
             const spanText = allSpans[i].textContent.trim();
             if (spanText === 'رمز المقرر') {
                  let valueCell = allSpans[i].closest('td')?.nextElementSibling?.nextElementSibling;
                  let valueSpan = valueCell?.querySelector('span.fontText');
                  if (valueSpan?.textContent) {
                     const courseCode = valueSpan.textContent.trim();
                     if (courseCode) {
                         console.log("DOM: Detected Course Code (Attempt 2 - Fallback):", courseCode);
                         return courseCode;
                     }
                  } else {
                      console.warn("DOM: Attempt 2 - Found 'رمز المقرر' label, but couldn't find value span.");
                  }
                  console.warn("DOM: Attempt 2 - Failed to extract value after finding label. Halting search.");
                  return null;
             }
         }
         console.log("DOM: Attempt 2 - 'رمز المقرر' label not found in broader search.");

    } catch (e) {
        console.error("DOM Error: Failed during course code detection:", e);
    }

    console.warn("DOM: Could not reliably detect course code after all attempts.");
    return null;
}

/**
 * Finds the main student table on the absence page using a provided ID.
 * @param {string} tableId The ID of the table to find.
 * @returns {HTMLTableElement|null}
 */
function findStudentTableById(tableId) {
    if (!tableId) { console.error("DOM Error: tableId not provided to findStudentTableById"); return null; }
    try { return document.getElementById(tableId); }
    catch (e) { console.error(`DOM Error: Failed to find table with ID ${tableId}:`, e); return null; }
}

// --- Functions for Home Page ---

/**
 * Reads the lecturer ID from the home page.
 * @returns {string|null} The lecturer ID (e.g., "15534") or null.
 */
function getLecturerIdFromHomePage() {
    try {
        const allTds = document.querySelectorAll('.infostudent td.fontTextSmall');
        for (let i = 0; i < allTds.length; i++) {
            const labelSpan = allTds[i].querySelector('span.fontText');
            if (labelSpan?.textContent.trim() === 'رقم المحاضر') {
                let valueCell = allTds[i].nextElementSibling?.nextElementSibling;
                if (valueCell?.textContent) {
                    const match = valueCell.textContent.match(/:\s*(\d+)/);
                    if (match && match[1]) {
                        console.log("DOM: Detected Lecturer ID:", match[1]);
                        return match[1];
                    } else { console.warn("DOM: Found lecturer label cell, but couldn't extract ID.", valueCell.textContent); }
                } else { console.warn("DOM: Found lecturer label cell, but value cell is missing."); }
                 break;
            }
        }
    } catch (e) { console.error("DOM Error: Failed to read lecturer ID:", e); }
    console.warn("DOM: Could not reliably detect lecturer ID.");
    return null;
}

/**
 * Reads the current semester string from the home page or header.
 * @returns {string|null} The semester string (e.g., "الفصل الثاني 1446هـ") or null.
 */
function getCurrentSemesterFromPage() {
    try {
        const semesterHeaderElement = document.getElementById('headerForm:currentSemester');
        if (semesterHeaderElement?.textContent) {
            const semesterText = semesterHeaderElement.textContent.trim();
            if (semesterText) { console.log("DOM: Detected Semester (from header):", semesterText); return semesterText; }
        }
        const allTds = document.querySelectorAll('.infostudent td.fontTextSmall');
        for (let i = 0; i < allTds.length; i++) {
            const labelSpan = allTds[i].querySelector('span.fontText');
            if (labelSpan?.textContent.trim() === 'الفصل') {
                let valueCell = allTds[i].nextElementSibling?.nextElementSibling;
                if (valueCell?.textContent) {
                    const match = valueCell.textContent.match(/:\s*(.+)/);
                     if (match && match[1]) {
                        const semesterText = match[1].trim();
                         console.log("DOM: Detected Semester (from table):", semesterText);
                        return semesterText;
                    } else { console.warn("DOM: Found semester label cell, but couldn't extract text.", valueCell.textContent); }
                } else { console.warn("DOM: Found semester label cell, but value cell is missing."); }
                 break;
            }
        }
    } catch (e) { console.error("DOM Error: Failed to read current semester:", e); }
    console.warn("DOM: Could not reliably detect current semester string.");
    return null;
}

/**
 * Finds the target element AFTER which the home page panel should be injected.
 * Targets the table containing lecturer info.
 * @returns {HTMLElement|null} The target table element or null if not found.
 */
function findHomePageInjectionTarget() {
    // The target is the table with class 'infostudent' inside the 'data_new' div
    const targetTable = document.querySelector('div.data_new table.infostudent');
    if (targetTable) {
        console.log("DOM: Found home page injection target (infostudent table).");
        return targetTable;
    } else {
        console.error("DOM Error: Could not find the 'infostudent' table to inject panel after.");
        // Fallback: Try finding the 'data_new' div itself, injection might be less precise
        const dataDiv = document.querySelector('div.data_new');
        if (dataDiv) {
            console.warn("DOM: Using fallback injection target (div.data_new). Panel might not appear exactly after info table.");
            return dataDiv;
        }
    }
    console.error("DOM Error: Could not find any suitable target for home page panel injection.");
    return null;
}

// --- Functions for Sections Page ---

/**
 * Reads the sections table from the sectionsIndex.faces page.
 * Handles rows with unexpected cell counts and attempts fallback section number extraction.
 * @returns {Array<object>|null} Array of section objects or null if table not found/error.
 */
function parseSectionsTable() {
    console.log("DOM: Attempting to parse sections table...");
    const sections = [];
    let skippedRowCount = 0;
    let failedSectionExtractionCount = 0;

    try {
        const table = document.getElementById('myForm:dataTbl');
        if (!table) {
            console.warn("DOM: Sections table (#myForm:dataTbl) not found.");
            return null;
        }
        const tbody = table.querySelector('tbody');
        if (!tbody) {
             console.warn("DOM: Sections table found, but no tbody element.");
             return [];
        }
        const rows = tbody.querySelectorAll(':scope > tr');
        if (rows.length === 0) {
             console.warn("DOM: Sections table found, but no rows in tbody.");
             return [];
        }

        rows.forEach((row, index) => {
            const cells = row.querySelectorAll(':scope > td');
            const rowIndexForLog = index + 1;

            if (cells.length < 6) {
                skippedRowCount++;
                return;
            }

            const campus = cells[0]?.textContent?.trim();
            const degree = cells[1]?.textContent?.trim();
            const code = cells[2]?.textContent?.trim();
            const nameSpan = cells[3]?.querySelector('span.fontTextSmall');
            const name = nameSpan?.textContent?.trim();
            const activity = cells[4]?.textContent?.trim();
            const sectionCell = cells[5];

            let section = null;

            if (sectionCell) {
                const sectionLink = sectionCell.querySelector('a');
                if (sectionLink) {
                    const childNodes = sectionLink.childNodes;
                    for (let i = childNodes.length - 1; i >= 0; i--) {
                        const node = childNodes[i];
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent.trim();
                            if (text && /^\d+$/.test(text)) {
                                section = text;
                                break;
                            }
                        }
                    }
                }

                if (!section) {
                    const cellText = sectionCell.textContent?.trim();
                    const digitMatch = cellText?.match(/\d+/);
                    if (digitMatch && digitMatch[0]) {
                        section = digitMatch[0];
                    }
                }
            }

            if (code && name && section) {
                sections.push({
                    campus: campus || 'N/A',
                    degree: degree || 'N/A',
                    code: code,
                    name: name,
                    activity: activity || 'N/A',
                    section: section
                });
            } else {
                 failedSectionExtractionCount++;
                 console.warn(`DOM: Skipped row ${rowIndexForLog}. Missing: ${!code?'Code ':''}${!name?'Name ':''}${!section?'Section':''}`);
            }
        }); // End rows.forEach

        console.log(`DOM: Parsed ${sections.length} valid sections from ${rows.length} total rows.`);
        if (skippedRowCount > 0) {
            console.log(`DOM: Skipped ${skippedRowCount} rows due to unexpected cell count (< 6).`);
        }
        if (failedSectionExtractionCount > 0) {
             console.warn(`DOM: Failed to extract full data for ${failedSectionExtractionCount} rows.`);
        }
        return sections;

    } catch (e) {
        console.error("DOM Error: Failed to parse sections table:", e);
        return null;
    }
}

// --- START: New Function for Absence Page Statistics ---

/**
 * Parses the absence table to calculate student statistics.
 * @param {HTMLTableElement} tableElement The main student absence table element.
 * @returns {object|null} An object { totalStudents, dismissedCount, withdrawnCount } or null if table is invalid.
 */
function parseAbsenceStatistics(tableElement) {
    if (!tableElement || !tableElement.tBodies || tableElement.tBodies.length === 0) {
        console.warn("DOM Stats: Invalid table element provided.");
        return null;
    }

    const tbody = tableElement.tBodies[0];
    const rows = tbody.querySelectorAll(':scope > tr');
    let totalStudents = 0;
    let dismissedCount = 0;
    let withdrawnCount = 0;

    rows.forEach(row => {
        const cells = row.cells;
        // Expecting at least 9 columns for standard data + notes/custom cols potentially added
        // Crucial cells: Student ID (1), Absence % (8), Absence Checkbox/Span (5)
        if (cells.length >= 9) {
            const studentIdCell = cells[1];
            const absencePercentCell = cells[8];
            const absenceActionCell = cells[5]; // Cell containing checkbox or '----' span

            // Check for valid student row (has an ID)
            if (studentIdCell?.textContent.trim().match(/^\d+$/)) {
                totalStudents++;

                // Check for Withdrawn ('المنسحبين')
                // Look for the specific span with '----'
                const withdrawnSpan = absenceActionCell?.querySelector('span[id*=":studentAbsenceEmpty"]');
                if (withdrawnSpan && withdrawnSpan.textContent.includes('----')) {
                    withdrawnCount++;
                } else {
                    // Only check for dismissal if not withdrawn
                    try {
                        const absencePercentage = parseFloat(absencePercentCell?.textContent.trim());
                        if (!isNaN(absencePercentage) && absencePercentage > 21) {
                            dismissedCount++;
                        }
                    } catch (e) {
                        // Ignore errors parsing percentage for non-numeric cells
                    }
                }
            }
        }
    });

    const stats = { totalStudents, dismissedCount, withdrawnCount };
    console.log("DOM Stats: Parsed statistics:", stats);
    return stats;
}

// --- END: New Function for Absence Page Statistics ---

// --- General DOM Manipulation Utilities ---

/**
 * Safely injects an element *before* a target element.
 * @param {HTMLElement} newElement The element to inject.
 * @param {HTMLElement} targetElement The element to inject before.
 */
function safeInjectBefore(newElement, targetElement) {
    if (newElement && targetElement?.parentNode) {
        try {
            targetElement.parentNode.insertBefore(newElement, targetElement);
        }
        catch (e) { console.error("DOM Injection Error (before):", e, { newElement, targetElement }); }
    } else { console.error("DOM Injection Error (before): Cannot inject, target or parent not found.", { newElement, targetElement }); }
}

/**
 * Safely injects an element *after* a target element.
 * @param {HTMLElement} newElement The element to inject.
 * @param {HTMLElement} targetElement The element to inject after.
 */
function safeInjectAfter(newElement, targetElement) {
    if (newElement && targetElement?.parentNode) {
        try {
            // Insert before the *next* sibling of the target.
            // If target is the last child, appendChild acts like insertAfter.
            targetElement.parentNode.insertBefore(newElement, targetElement.nextSibling);
        }
        catch (e) { console.error("DOM Injection Error (after):", e, { newElement, targetElement }); }
    } else { console.error("DOM Injection Error (after): Cannot inject, target or parent not found.", { newElement, targetElement }); }
}


console.log("Extension: dom_utils.js loaded.");
