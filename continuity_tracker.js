/**
 * continuity_tracker.js
 * 
 * This module contains the core logic for the absence continuity tracking feature.
 * It handles parsing schedules, recording absence submissions, detecting gaps,
 * and managing all related data in chrome.storage.
 */

console.log("Extension: continuity_tracker.js loaded.");

// Define the top-level storage key for this feature's data
const CONTINUITY_TRACKER_KEY = 'continuityTracker';

/**
 * Retrieves the continuity tracker data object for a given lecturer.
 * @param {string} lecturerId - The ID of the lecturer.
 * @returns {Promise<{schedules: object, lastRecorded: object, missedAbsences: Array<object>}>}
 */
async function getContinuityData(lecturerId) {
    const data = await getDataForLecturer(lecturerId, [CONTINUITY_TRACKER_KEY]);
    const trackerData = data[CONTINUITY_TRACKER_KEY] || {};

    // Ensure the data structure is complete with defaults
    return {
        schedules: trackerData.schedules || {},
        lastRecorded: trackerData.lastRecorded || {},
        missedAbsences: trackerData.missedAbsences || []
    };
}

/**
 * Saves the entire continuity tracker data object for a given lecturer.
 * @param {string} lecturerId - The ID of the lecturer.
 * @param {object} trackerData - The complete continuity tracker data object to save.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
async function saveContinuityData(lecturerId, trackerData) {
    return saveDataForLecturer(lecturerId, { [CONTINUITY_TRACKER_KEY]: trackerData });
}

/**
 * Parses the schedule page to extract course days and saves them.
 * @param {string} lecturerId - The ID of the current lecturer.
 * @param {Document} doc - The document object of the schedule page.
 */
async function parseAndSaveSchedules(lecturerId, doc = document) {
    console.log("Continuity Tracker: Parsing schedules...");
    const scheduleTable = doc.querySelector('table[id$=":dataTbl"]');
    if (!scheduleTable) {
        console.warn("Continuity Tracker: Schedule table not found.");
        return;
    }

    const schedules = {};
    const rows = scheduleTable.querySelectorAll('tbody > tr');

    rows.forEach(row => {
        try {
            const courseCodeCell = row.querySelector('td:nth-child(1)');
            const sectionCell = row.querySelector('td:nth-child(4)');
            const daysCell = row.querySelector('td:nth-child(6)');

            if (!courseCodeCell || !sectionCell || !daysCell) return;

            const courseCode = courseCodeCell.textContent.trim();
            const section = sectionCell.textContent.trim();
            
            const daysSpan = daysCell.querySelector('span.fontTextSmall');
            if (!daysSpan) return;

            // Normalize numerals from Hindi (١٢٣) to Arabic (123) before processing
            const normalizedDaysText = daysSpan.textContent.trim()
                .replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660) // Hindi numerals
                .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0); // Farsi numerals (just in case)

            // Extract numbers from the text content. Handles "1 3" -> [1, 3]
            const days = normalizedDaysText.split(/\s+/).map(Number).filter(n => n > 0);

            if (courseCode && section && days.length > 0) {
                const key = `${courseCode}_${section}`;
                // If a course has multiple time slots on different days (e.g., theory/practical), merge the days.
                if (schedules[key]) {
                    schedules[key].days = [...new Set([...schedules[key].days, ...days])].sort();
                } else {
                    schedules[key] = {
                        courseCode,
                        section,
                        days: days.sort()
                    };
                }
            }
        } catch (error) {
            console.error("Continuity Tracker: Error parsing a schedule row.", error);
        }
    });

    if (Object.keys(schedules).length > 0) {
        console.log("Continuity Tracker: Parsed schedules:", schedules);
        const trackerData = await getContinuityData(lecturerId);
        trackerData.schedules = schedules;
        await saveContinuityData(lecturerId, trackerData);
        console.log("Continuity Tracker: Schedules saved successfully.");
    } else {
        console.warn("Continuity Tracker: No schedules were parsed from the page.");
    }
}

/**
 * Records an absence submission and checks for continuity gaps.
 * @param {string} lecturerId - The ID of the current lecturer.
 * @param {object} submissionDetails - Details of the submission.
 * @param {string} submissionDetails.courseCode - e.g., "474 MIS"
 * @param {string} submissionDetails.section - e.g., "128"
 * @param {number} submissionDetails.week - e.g., 5
 * @param {number} submissionDetails.day - e.g., 1 (Sunday)
 * @param {string} submissionDetails.date - e.g., "2025-09-21"
 */
async function recordAbsenceAndCheckGaps(lecturerId, submissionDetails) {
    console.log("Continuity Tracker: Recording absence and checking for gaps...", submissionDetails);

    const trackerData = await getContinuityData(lecturerId);
    const { schedules, lastRecorded, missedAbsences } = trackerData;
    const { courseCode, section, week, day } = submissionDetails;

    const key = `${courseCode}_${section}`;
    const courseSchedule = schedules[key];
    const lastEntry = lastRecorded[key];

    // If no schedule is stored for this course, we can't check for gaps.
    if (!courseSchedule || !courseSchedule.days) {
        console.warn(`Continuity Tracker: No schedule found for ${key}. Cannot check for gaps.`);
        // Still record this submission as the last one.
        trackerData.lastRecorded[key] = submissionDetails;
        await saveContinuityData(lecturerId, trackerData);
        return;
    }

    // If this is the first time recording for this course, there are no gaps to check.
    if (!lastEntry) {
        console.log(`Continuity Tracker: First record for ${key}. Storing as baseline.`);
        trackerData.lastRecorded[key] = submissionDetails;
        await saveContinuityData(lecturerId, trackerData);
        return;
    }

    // --- Gap Detection Logic ---
    const newMissed = [];
    const scheduledDays = courseSchedule.days; // e.g., [1, 3]

    // Loop from the week of the last entry up to the current week
    for (let w = lastEntry.week; w <= week; w++) {
        const startDay = (w === lastEntry.week) ? lastEntry.day + 1 : 1;
        const endDay = (w === week) ? day - 1 : 5; // Check up to Thursday (5) for intermediate weeks

        for (let d = startDay; d <= endDay; d++) {
            // If the day 'd' is a scheduled day for this course
            if (scheduledDays.includes(d)) {
                const missed = {
                    courseCode,
                    section,
                    week: w,
                    day: d,
                    status: 'pending'
                };
                // Avoid adding duplicates
                const isAlreadyLogged = missedAbsences.some(m => 
                    m.courseCode === missed.courseCode && m.section === missed.section && 
                    m.week === missed.week && m.day === missed.day
                );
                if (!isAlreadyLogged) {
                    newMissed.push(missed);
                }
            }
        }
    }

    if (newMissed.length > 0) {
        console.log("Continuity Tracker: Found new missed absences:", newMissed);
        trackerData.missedAbsences = [...missedAbsences, ...newMissed];
    }

    // Always update the last recorded entry to the current submission
    trackerData.lastRecorded[key] = submissionDetails;

    // Save all changes back to storage
    await saveContinuityData(lecturerId, trackerData);
    console.log("Continuity Tracker: Check complete. Data saved.");
}

/**
 * Marks a specific missed absence alert as ignored.
 * @param {string} lecturerId - The ID of the current lecturer.
 * @param {object} missedAbsenceIdentifier - An object to identify the alert to ignore.
 */
async function ignoreMissedAbsence(lecturerId, missedAbsenceIdentifier) {
    console.log("Continuity Tracker: Ignoring missed absence...", missedAbsenceIdentifier);
    
    const trackerData = await getContinuityData(lecturerId);
    let alertFound = false;

    trackerData.missedAbsences.forEach(alert => {
        if (
            alert.courseCode === missedAbsenceIdentifier.courseCode &&
            alert.section === missedAbsenceIdentifier.section &&
            alert.week === missedAbsenceIdentifier.week &&
            alert.day === missedAbsenceIdentifier.day
        ) {
            alert.status = 'ignored';
            alertFound = true;
        }
    });

    if (alertFound) {
        console.log("Continuity Tracker: Alert marked as ignored. Saving data.");
        await saveContinuityData(lecturerId, trackerData);
    } else {
        console.warn("Continuity Tracker: Could not find the specified alert to ignore.", missedAbsenceIdentifier);
    }
}

/**
 * Calculates the status for each week (1-17) for a given course.
 * @param {object} courseSchedule - The schedule object for the course, e.g., { days: [1, 3] }.
 * @param {object} lastRecordedEntry - The last recorded submission for this course.
 * @param {Array<object>} missedAbsencesForCourse - The array of pending/ignored absences for this course.
 * @returns {Array<{week: number, status: string, tooltip: string}>}
 */
function calculateWeeklyStatus(courseSchedule, lastRecordedEntry, missedAbsencesForCourse) {
    const weeklyStatuses = [];
    const totalWeeks = 17; // Standard semester length

    if (!courseSchedule || !courseSchedule.days || courseSchedule.days.length === 0) {
        // If no schedule, all weeks are undetermined.
        for (let i = 1; i <= totalWeeks; i++) {
            weeklyStatuses.push({ week: i, status: 'gray', tooltip: 'أيام الدوام غير محددة' });
        }
        return weeklyStatuses;
    }

    const lastWeek = lastRecordedEntry ? lastRecordedEntry.week : 0;

    for (let week = 1; week <= totalWeeks; week++) {
        const missedInWeek = missedAbsencesForCourse.filter(m => m.week === week);
        const pendingMissed = missedInWeek.filter(m => m.status === 'pending');
        const ignoredMissed = missedInWeek.filter(m => m.status === 'ignored');

        let status = 'gray';
        let tooltip = `الأسبوع ${week}: لم يتم رصده بعد`;

        if (pendingMissed.length > 0) {
            status = 'red';
            tooltip = `الأسبوع ${week}: يوجد ${pendingMissed.length} يوم/أيام غياب مفقودة وغير مهملة.`;
        } else if (ignoredMissed.length > 0) {
            status = 'yellow';
            tooltip = `الأسبوع ${week}: يوجد ${ignoredMissed.length} يوم/أيام غياب تم إهمالها.`;
        } else if (week <= lastWeek) {
            // If the week is before or on the last recorded week and has no pending/ignored issues, it's green.
            status = 'green';
            tooltip = `الأسبوع ${week}: مكتمل`;
        }
        
        weeklyStatuses.push({ week, status, tooltip });
    }

    return weeklyStatuses;
}
