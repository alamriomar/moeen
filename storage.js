/**
 * storage.js
 * Handles all interactions with chrome.storage.local,
 * structuring data per lecturer ID.
 */

const STORAGE_KEY_PREFIX = "uta_"; // Prefix to avoid conflicts
const GENERAL_NOTES_KEY = 'generalCourseNotes';
const COURSE_STATS_KEY = 'courseStatistics';


/**
 * Retrieves data for a specific lecturer.
 * @param {string} lecturerId The ID of the lecturer.
 * @param {string[]} keysToGet Array of top-level keys to retrieve (e.g., ['notes', 'settings', 'assignedSections', 'customColumns', 'absenceDetails']).
 * @returns {Promise<object>} A promise resolving to an object like { notes: {...}, settings: {...}, assignedSections: [...], customColumns: {...}, absenceDetails: {...} }.
 */
async function getDataForLecturer(lecturerId, keysToGet) {
    if (!lecturerId) {
        console.error("Storage Error: Lecturer ID is required.");
        return {}; // Return empty object if no ID
    }
    const storageKey = `${STORAGE_KEY_PREFIX}${lecturerId}`;
    // console.log(`Storage: Getting data for key: ${storageKey}, requesting:`, keysToGet);
    return new Promise((resolve) => {
        chrome.storage.local.get(storageKey, (result) => {
            if (chrome.runtime.lastError) {
                console.error("Storage Error: Failed to get data:", chrome.runtime.lastError);
                resolve({}); // Return empty on error
            } else {
                const lecturerData = result[storageKey] || {};
                const requestedData = {};
                keysToGet.forEach(key => {
                    // Provide default empty structures if key doesn't exist
                    if (key === 'notes') requestedData[key] = lecturerData[key] || {};
                    else if (key === 'settings') requestedData[key] = lecturerData[key] || { yellowHighlightEnabled: true, redHighlightEnabled: true, lastSeenSemester: null };
                    else if (key === 'assignedSections') requestedData[key] = lecturerData[key] || [];
                    else if (key === 'customColumns') requestedData[key] = lecturerData[key] || {};
                    // START: Added handling for absenceDetails
                    else if (key === 'absenceDetails') requestedData[key] = lecturerData[key] || {}; // Default for absence details
                    // END: Added handling for absenceDetails
                    else if (key === GENERAL_NOTES_KEY) requestedData[key] = lecturerData[key] || {}; // Default for general notes
                    else if (key === COURSE_STATS_KEY) requestedData[key] = lecturerData[key] || {}; // Default for course stats <--- ADD THIS LINE
                    else if (key === 'continuityTracker') requestedData[key] = lecturerData[key] || {}; // Default for continuity tracker


                    else requestedData[key] = lecturerData[key]; // For other potential keys
                    
                });
                // console.log(`Storage: Retrieved data for ${lecturerId}:`, requestedData);
                resolve(requestedData);
            }
        });
    });
}

/**
 * Saves data for a specific lecturer. Merges with existing data.
 * @param {string} lecturerId The ID of the lecturer.
 * @param {object} dataToSave Object containing the data to save (e.g., { notes: newNotes, settings: newSettings, absenceDetails: newDetails }).
 * @returns {Promise<boolean>} A promise resolving to true on success, false on error.
 */
async function saveDataForLecturer(lecturerId, dataToSave) {
    if (!lecturerId) {
        console.error("Storage Error: Lecturer ID is required for saving.");
        return false;
    }
    const storageKey = `${STORAGE_KEY_PREFIX}${lecturerId}`;
    console.log(`Storage: Saving data for key: ${storageKey}`, dataToSave);

    return new Promise((resolve) => {
        // Get existing data first to merge
        chrome.storage.local.get(storageKey, (result) => {
            let existingData = {};
            if (chrome.runtime.lastError) {
                console.error("Storage Warning: Failed to get existing data before saving:", chrome.runtime.lastError);
            } else {
                existingData = result[storageKey] || {};
            }

            // Merge new data into existing data - ensure deep merge for nested objects if necessary in future
            // For current structure (notes, settings, sections, customCols, absenceDetails), shallow merge is okay
            const mergedData = { ...existingData, ...dataToSave };

            chrome.storage.local.set({ [storageKey]: mergedData }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Storage Error: Failed to save data:", chrome.runtime.lastError);
                    resolve(false);
                } else {
                    console.log(`Storage: Data saved successfully for ${lecturerId}.`);
                    resolve(true);
                }
            });
        });
    });
}

/**
 * Gets the currently stored lecturer ID.
 * @returns {Promise<string|null>} The lecturer ID or null.
 */
async function getCurrentLecturerId() {
    return new Promise((resolve) => {
        chrome.storage.local.get('currentLecturerId', (result) => {
            resolve(result.currentLecturerId || null);
        });
    });
}

/**
 * Sets the currently detected lecturer ID.
 * @param {string} lecturerId
 * @returns {Promise<boolean>}
 */
async function setCurrentLecturerId(lecturerId) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ 'currentLecturerId': lecturerId }, () => {
            resolve(!chrome.runtime.lastError);
        });
    });
}

// --- Specific Data Functions ---

/** Saves the notes object. */
async function saveNotes(lecturerId, notesData) {
    return saveDataForLecturer(lecturerId, { notes: notesData });
}

/** Gets the notes object. */
async function getNotes(lecturerId) {
    const data = await getDataForLecturer(lecturerId, ['notes']);
    return data.notes; // Already defaults to {} in getDataForLecturer
}

/** Saves the settings object. */
async function saveSettings(lecturerId, settingsData) {
    return saveDataForLecturer(lecturerId, { settings: settingsData });
}

/** Gets the settings object. */
async function getSettings(lecturerId) {
    const data = await getDataForLecturer(lecturerId, ['settings']);
    return data.settings; // Already defaults in getDataForLecturer
}

/**
 * Saves the list of assigned sections for the current lecturer.
 * @param {string} lecturerId
 * @param {Array<object>} sectionsData Array of section objects.
 */
async function saveAssignedSections(lecturerId, sectionsData) {
    console.log(`Storage: Saving ${sectionsData.length} assigned sections for lecturer ${lecturerId}`);
    return saveDataForLecturer(lecturerId, { assignedSections: sectionsData });
}

/**
 * Gets the list of assigned sections for the current lecturer.
 * @param {string} lecturerId
 * @returns {Promise<Array<object>>} Array of section objects.
 */
async function getAssignedSections(lecturerId) {
    const data = await getDataForLecturer(lecturerId, ['assignedSections']);
    return data.assignedSections; // Already defaults to [] in getDataForLecturer
}


// --- Custom Column Functions ---

/**
 * Gets the custom column definitions and data for a specific course.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @returns {Promise<{definitions: Array<object>, data: object}>}
 */
async function getCustomColumns(lecturerId, courseCode) {
    if (!lecturerId || !courseCode) {
        console.warn("Storage: Missing lecturerId or courseCode for getCustomColumns.");
        return { definitions: [], data: {} };
    }
    const allCustomColumns = (await getDataForLecturer(lecturerId, ['customColumns'])).customColumns || {};
    const courseColumns = allCustomColumns[courseCode] || { definitions: [], data: {} };
    // Ensure defaults are present even if structure exists partially
    courseColumns.definitions = courseColumns.definitions || [];
    courseColumns.data = courseColumns.data || {};
    return courseColumns;
}

/**
 * Saves the custom column definitions and data for a specific course.
 * Merges with existing custom column data for other courses.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {Array<object>} definitions - The complete array of definitions for this course.
 * @param {object} data - The complete data object (studentId -> {colId: value}) for this course.
 * @returns {Promise<boolean>}
 */
async function saveCustomColumns(lecturerId, courseCode, definitions, data) {
    if (!lecturerId || !courseCode) {
        console.error("Storage Error: Missing lecturerId or courseCode for saveCustomColumns.");
        return false;
    }
    // Get all existing custom column data first
    const allCustomColumns = (await getDataForLecturer(lecturerId, ['customColumns'])).customColumns || {};
    // Update the specific course data
    allCustomColumns[courseCode] = {
        definitions: definitions || [],
        data: data || {}
    };
    // Save the entire customColumns object back
    return saveDataForLecturer(lecturerId, { customColumns: allCustomColumns });
}


// --- START: Absence Details Functions (for Tooltip) ---

/**
 * Gets the stored absence details for a specific student in a specific course.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {string} studentId
 * @returns {Promise<{data: Array<{date: string, type: string}>, timestamp: number}>}
 * Returns the stored data object or a default object if not found.
 */
async function getAbsenceDetails(lecturerId, courseCode, studentId) {
    if (!lecturerId || !courseCode || !studentId) {
        console.warn("Storage: Missing lecturerId, courseCode, or studentId for getAbsenceDetails.");
        return { data: [], timestamp: 0 }; // Return default structure
    }
    const allDetails = (await getDataForLecturer(lecturerId, ['absenceDetails'])).absenceDetails || {};
    // Access nested structure: absenceDetails -> courseCode -> studentId
    const studentCourseDetails = allDetails[courseCode]?.[studentId];
    // Return the found data or the default structure
    return studentCourseDetails || { data: [], timestamp: 0 };
}

/**
 * Saves or updates the complete absence details list for a specific student in a specific course.
 * Overwrites previous details for that student/course combination.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {string} studentId
 * @param {Array<{date: string, type: string}>} detailsArray - The complete, sorted array of details to save.
 * @returns {Promise<boolean>} True on success, false on error.
 */
async function saveAbsenceDetails(lecturerId, courseCode, studentId, detailsArray) {
    if (!lecturerId || !courseCode || !studentId) {
        console.error("Storage Error: Missing lecturerId, courseCode, or studentId for saveAbsenceDetails.");
        return false;
    }
    if (!Array.isArray(detailsArray)) {
        console.error("Storage Error: detailsArray must be an array for saveAbsenceDetails.");
        return false;
    }

    // Get the current top-level absenceDetails object
    const allDetails = (await getDataForLecturer(lecturerId, ['absenceDetails'])).absenceDetails || {};

    // Ensure the course level exists
    allDetails[courseCode] = allDetails[courseCode] || {};

    // Set/update the data for the specific student in that course
    allDetails[courseCode][studentId] = {
        data: detailsArray,
        timestamp: Date.now() // Add/update timestamp on save
    };

    console.log(`Storage: Saving absence details for L:${lecturerId}, C:${courseCode}, S:${studentId}`);
    // Save the entire modified absenceDetails object back
    return saveDataForLecturer(lecturerId, { absenceDetails: allDetails });
}
// --- END: Absence Details Functions (for Tooltip) ---
// --- START: General Course Note Functions ---

/**
 * Gets the general note for a specific course.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @returns {Promise<{text: string, lastModified: number|null}>} The note object or default.
 */
async function getGeneralCourseNote(lecturerId, courseCode) {
    if (!lecturerId || !courseCode) {
        console.warn("Storage: Missing lecturerId or courseCode for getGeneralCourseNote.");
        return { text: "", lastModified: null };
    }
    const allGeneralNotes = (await getDataForLecturer(lecturerId, [GENERAL_NOTES_KEY]))[GENERAL_NOTES_KEY] || {};
    return allGeneralNotes[courseCode] || { text: "", lastModified: null };
}

/**
 * Saves the general note for a specific course.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {string} noteText The text of the note.
 * @returns {Promise<boolean>} True on success, false on error.
 */
async function saveGeneralCourseNote(lecturerId, courseCode, noteText) {
    if (!lecturerId || !courseCode) {
        console.error("Storage Error: Missing lecturerId or courseCode for saveGeneralCourseNote.");
        return false;
    }
    // Get the current top-level general notes object
    const allGeneralNotes = (await getDataForLecturer(lecturerId, [GENERAL_NOTES_KEY]))[GENERAL_NOTES_KEY] || {};

    // Update the entry for the specific course
    allGeneralNotes[courseCode] = {
        text: noteText.trim(), // Trim whitespace
        lastModified: Date.now()
    };

    // If text is empty, maybe remove the entry? Optional.
    // if (allGeneralNotes[courseCode].text === '') {
    //     delete allGeneralNotes[courseCode];
    // }

    console.log(`Storage: Saving general note for L:<span class="math-inline">\{lecturerId\}, C\:</span>{courseCode}`);
    // Save the entire modified general notes object back
    return saveDataForLecturer(lecturerId, { [GENERAL_NOTES_KEY]: allGeneralNotes });
}
// --- END: General Course Note Functions ---

// --- START: New Storage Management Functions ---

/**
 * Calculates the storage space used by the data for a specific lecturer.
 * @param {string} lecturerId The ID of the lecturer.
 * @returns {Promise<number>} A promise resolving to the number of bytes used, or 0 on error.
 */
async function getStorageUsageForLecturer(lecturerId) {
    if (!lecturerId) {
        console.error("Storage Usage Error: Lecturer ID is required.");
        return 0;
    }
    const storageKey = `${STORAGE_KEY_PREFIX}${lecturerId}`;
    return new Promise((resolve) => {
        chrome.storage.local.getBytesInUse([storageKey], (bytesInUse) => {
            if (chrome.runtime.lastError) {
                console.error("Storage Usage Error:", chrome.runtime.lastError);
                resolve(0);
            } else {
                console.log(`Storage: Bytes in use for ${storageKey}: ${bytesInUse}`);
                resolve(bytesInUse);
            }
        });
    });
}

/**
 * Clears ALL data associated with a specific lecturer ID from storage.
 * Does NOT clear the 'currentLecturerId' itself.
 * @param {string} lecturerId The ID of the lecturer whose data should be cleared.
 * @returns {Promise<boolean>} A promise resolving to true on success, false on error.
 */
async function clearAllDataForLecturer(lecturerId) {
    if (!lecturerId) {
        console.error("Storage Clear Error: Lecturer ID is required.");
        return false;
    }
    const storageKey = `${STORAGE_KEY_PREFIX}${lecturerId}`;
    console.warn(`Storage: Attempting to clear all data for key: ${storageKey}`);

    return new Promise((resolve) => {
        chrome.storage.local.remove(storageKey, () => {
            if (chrome.runtime.lastError) {
                console.error(`Storage Clear Error: Failed to remove data for ${storageKey}:`, chrome.runtime.lastError);
                resolve(false);
            } else {
                console.log(`Storage: Successfully cleared data for ${storageKey}.`);
                // Clear related global variables in content scripts if they are running
                // (This part is tricky as background can't directly access content script variables)
                // Consider forcing a page reload from the UI after clearing.
                resolve(true);
            }
        });
    });
}

// --- END: New Storage Management Functions ---

// --- START: Course Statistics Storage Functions ---

/**
 * Saves calculated statistics for a specific course.
 * @param {string} lecturerId
 * @param {string} courseCode
 * @param {object} stats - The object { totalStudents, dismissedCount, withdrawnCount }.
 * @returns {Promise<boolean>}
 */
async function saveCourseStatistics(lecturerId, courseCode, stats) {
    if (!lecturerId || !courseCode || !stats) {
        console.error("Storage Stats Error: Missing parameters for saveCourseStatistics.");
        return false;
    }
    // Get the existing statistics object
    const allStats = (await getDataForLecturer(lecturerId, [COURSE_STATS_KEY]))[COURSE_STATS_KEY] || {};
    // Update stats for the specific course
    allStats[courseCode] = {
        ...stats,
        lastUpdated: Date.now() // Add a timestamp
    };
    // Save the entire statistics object back
    return saveDataForLecturer(lecturerId, { [COURSE_STATS_KEY]: allStats });
}

/**
 * Retrieves statistics for all courses for a lecturer.
 * @param {string} lecturerId
 * @returns {Promise<object>} An object mapping courseCode to its stats object.
 */
async function getAllCourseStatistics(lecturerId) {
    const data = await getDataForLecturer(lecturerId, [COURSE_STATS_KEY]);
    return data[COURSE_STATS_KEY] || {}; // Defaults to empty object
}

// --- END: Course Statistics Storage Functions ---
