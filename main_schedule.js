/**
 * main_schedule.js
 * 
 * Content script for the staff schedule page. Its primary role is to trigger
 * the parsing of the lecturer's schedule to store it for the continuity tracker.
 */

console.log("Extension: main_schedule.js script running.");

async function initializeSchedulePage() {
    console.log("Initializing schedule page features...");

    // We need the lecturer ID to save the data correctly.
    const lecturerId = await getCurrentLecturerId();
    if (!lecturerId) {
        console.error("Schedule Page: Could not determine current lecturer ID. Aborting.");
        return;
    }

    // Check if the parsing function is available.
    if (typeof parseAndSaveSchedules !== 'function') {
        console.error("Schedule Page: parseAndSaveSchedules function is not available. Aborting.");
        return;
    }

    // Call the main function from continuity_tracker.js to do the work.
    // We pass the document object so the function can be tested more easily later if needed.
    await parseAndSaveSchedules(lecturerId, document);

    console.log("Schedule page initialization complete.");
}

// --- Start Execution ---
// Ensure the script doesn't run multiple times
if (!window.schedulePageScriptLoaded) {
    window.schedulePageScriptLoaded = true;

    // Wait for dependencies to be loaded before initializing.
    // `getCurrentLecturerId` comes from storage.js
    // `parseAndSaveSchedules` comes from continuity_tracker.js
    const checkScheduleDependencies = () => {
        if (typeof getCurrentLecturerId === 'function' && typeof parseAndSaveSchedules === 'function') {
            console.log("All schedule page dependencies loaded.");
            initializeSchedulePage();
        } else {
            console.warn("Schedule page dependencies not yet loaded, retrying...");
            setTimeout(checkScheduleDependencies, 100);
        }
    };

    // Wait for the DOM to be fully loaded before running the script.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkScheduleDependencies);
    } else {
        checkScheduleDependencies();
    }
}
