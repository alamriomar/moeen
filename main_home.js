/**
 * main_home.js
 * Entry point and logic for the extension on the home page (homeIndex.faces).
 */

console.log("Extension: main_home.js script running.");

// --- START: ADDITION - MutationObserver to handle dynamic page changes ---
let observer = null;
let observerInitialized = false;

/**
 * Sets up a MutationObserver to watch for the home panel being removed
 * and re-injects it if necessary. This handles SPA-like navigation.
 */
function setupHomePageObserver() {
    if (observerInitialized) return; // Don't set up more than once

    const targetNode = document.querySelector('.data_new');
    if (!targetNode) {
        console.error("Observer setup failed: Target node '.data_new' not found.");
        return;
    }

    const config = { childList: true, subtree: true };

    const callback = function(mutationsList, obs) {
        // Check if the panel was removed
        if (!document.getElementById('extension-home-panel')) {
            console.log("Home panel removed from DOM, re-initializing...");
            // Re-run the initialization logic to inject it again
            initializeHomePage();
        }
    };

    observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    observerInitialized = true;
    console.log("MutationObserver for home page panel is now active.");
}
// --- END: ADDITION ---

/**
 * Finds the lecturer's full name from the info table and extracts the first name.
 * @returns {string|null} The first name of the lecturer or null if not found.
 */
function getLecturerFirstName() {
    try {
        const infoTable = document.querySelector('table.infostudent');
        if (!infoTable) return null;

        const rows = infoTable.querySelectorAll('tr');
        for (const row of rows) {
            const labelCell = row.querySelector('td.fontTextSmall span.fontText');
            if (labelCell && labelCell.textContent.trim() === 'اسم المحاضر') {
                const valueCell = row.querySelector('td.fontTextSmallBlue');
                if (valueCell) {
                    const fullName = valueCell.textContent.replace(':', '').trim();
                    return fullName.split(' ')[0]; // Return the first part of the name
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Error extracting lecturer's first name:", error);
        return null;
    }
}


async function initializeHomePage() {
    // --- START: MODIFICATION - Prevent re-initialization if panel exists ---
    // If the panel already exists, no need to re-run the whole logic.
    if (document.getElementById('extension-home-panel')) {
        console.log("initializeHomePage called, but panel already exists. Skipping.");
        return;
    }
    // --- END: MODIFICATION ---

    console.log("Initializing home page extension features...");

    // 1. Detect Lecturer ID
    if (typeof getLecturerIdFromHomePage !== 'function' || typeof getCurrentLecturerId !== 'function' || typeof setCurrentLecturerId !== 'function') { /* ... error ... */ return; }
    const detectedLecturerId = getLecturerIdFromHomePage();
    if (!detectedLecturerId) { /* ... error ... */ return; }
    const storedLecturerId = await getCurrentLecturerId();
    if (!storedLecturerId || storedLecturerId !== detectedLecturerId) { await setCurrentLecturerId(detectedLecturerId); }
    const currentLecturerId = detectedLecturerId;

    // 2. Detect Current Semester
    if (typeof getCurrentSemesterFromPage !== 'function') { /* ... error ... */ return; }
    const currentSemester = getCurrentSemesterFromPage();
    if (!currentSemester) { /* ... error ... */ return; }

    // 3. Get Settings, Assigned Sections, Storage Usage, AND Course Stats
    // Ensure required functions are loaded
    if (typeof getSettings !== 'function' || typeof saveSettings !== 'function' ||
        typeof getAssignedSections !== 'function' || typeof getStorageUsageForLecturer !== 'function' ||
        typeof getAllCourseStatistics !== 'function') { // <-- ADDED check
             console.error("Initialization failed: Required functions not defined!"); return;
    }
    const settingsPromise = getSettings(currentLecturerId);
    const sectionsPromise = getAssignedSections(currentLecturerId);
    const usagePromise = getStorageUsageForLecturer(currentLecturerId);
    const courseStatsPromise = getAllCourseStatistics(currentLecturerId); // <-- ADDED call
    const continuityDataPromise = getContinuityData(currentLecturerId); // <-- ADDED for continuity tracker

    // Wait for all
    const [settings, assignedSections, storageUsageBytes, allCourseStats, continuityData] = await Promise.all([
        settingsPromise,
        sectionsPromise,
        usagePromise,
        courseStatsPromise, // <-- ADDED promise
        continuityDataPromise // <-- ADDED promise
    ]);
    const lastSeenSemester = settings.lastSeenSemester;
    console.log("Loaded settings:", settings);
    console.log("Loaded assigned sections:", assignedSections);
    console.log("Loaded storage usage (bytes):", storageUsageBytes);
    console.log("Loaded course statistics:", allCourseStats); // <-- ADDED log

    // 4. Compare Semesters and Update Settings if needed
    if (currentSemester !== lastSeenSemester) {
        console.log(`Semester changed! New: ${currentSemester}, Last Seen: ${lastSeenSemester}`);
        settings.lastSeenSemester = currentSemester;
        await saveSettings(currentLecturerId, settings);
        // Optional: Trigger notification
    }

    // 5. Inject Home Page Control Panel, passing all necessary data
    if (typeof ensureHomePagePanelInjected === 'function') {
        const lecturerFirstName = getLecturerFirstName(); // Get the first name
        // Pass the new allCourseStats parameter
        ensureHomePagePanelInjected(
            currentLecturerId,
            currentSemester,
            lastSeenSemester,
            assignedSections,
            storageUsageBytes,
            allCourseStats, // <-- ADDED parameter
            continuityData, // <-- PASS THE WHOLE OBJECT
            lecturerFirstName // Pass the first name
        );
    } else {
        console.error("Initialization failed: ensureHomePagePanelInjected function is not defined!");
    }

    console.log("Home page initialization complete.");

    // --- START: ADDITION - Setup the observer after successful initialization ---
    // This ensures the observer starts watching for changes *after* our panel is first injected.
    setupHomePageObserver();
    // --- END: ADDITION ---
}

// --- Start Execution ---
if (!window.homePageScriptLoaded) {
    window.homePageScriptLoaded = true;
    // Add dependency check if needed, including the new storage functions
     const checkHomeDependencies = () => {
         if (typeof getLecturerIdFromHomePage === 'function' &&
             typeof getCurrentLecturerId === 'function' &&
             typeof setCurrentLecturerId === 'function' &&
             typeof getCurrentSemesterFromPage === 'function' &&
             typeof getSettings === 'function' &&
             typeof saveSettings === 'function' &&
             typeof getAssignedSections === 'function' &&
             typeof ensureHomePagePanelInjected === 'function' &&
             typeof getAllCourseStatistics === 'function' && // <-- ADDED
             typeof getStorageUsageForLecturer === 'function' && // <-- ADDED check
             typeof clearAllDataForLecturer === 'function' &&     // <-- ADDED check (needed by button listener)
             typeof getContinuityData === 'function' // <-- ADDED for continuity tracker
             ) {
            console.log("All home page dependencies seem loaded.");
            initializeHomePage();
         } else {
             console.warn("Home page dependencies not yet loaded, retrying...");
             setTimeout(checkHomeDependencies, 100);
         }
     };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkHomeDependencies);
    } else {
        checkHomeDependencies();
    }
} else {
    console.log("main_home.js: Already loaded, skipping initialization.");
}
