/**
 * main_sections.js
 * Logic executed on the sections selection page (sectionsIndex.faces).
 * Reads the sections table and saves it to storage for the current lecturer.
 */

console.log("Extension: main_sections.js script running.");

async function processSectionsPage() {
    console.log("Processing sections page...");

    // 1. Get current lecturer ID (must be set from home page)
    // Ensure storage functions are available
    if (typeof getCurrentLecturerId !== 'function' || typeof saveAssignedSections !== 'function') {
        console.error("Sections Page Error: Storage functions not available!");
        return;
    }
    const lecturerId = await getCurrentLecturerId();
    if (!lecturerId) {
        console.error("Sections Page Error: Lecturer ID not found in storage. Cannot save sections.");
        // Maybe show a message?
        return;
    }
    console.log("Sections Page: Operating for Lecturer ID:", lecturerId);

    // 2. Parse the sections table
    // Ensure DOM util is available
    if (typeof parseSectionsTable !== 'function') {
         console.error("Sections Page Error: parseSectionsTable function not available!");
         return;
    }
    const sectionsData = parseSectionsTable(); // From dom_utils.js

    // 3. Save the data if parsing was successful
    if (sectionsData !== null) { // Check for null (error), allow empty array []
        await saveAssignedSections(lecturerId, sectionsData); // from storage.js
        console.log("Sections page processing complete. Sections saved.");
    } else {
        console.error("Sections Page Error: Failed to parse sections table. Data not saved.");
    }
}

// --- Start Execution ---
if (!window.sectionsPageScriptLoaded) {
    window.sectionsPageScriptLoaded = true;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processSectionsPage);
    } else {
        processSectionsPage();
    }
} else {
     console.log("main_sections.js: Already loaded, skipping execution.");
}
