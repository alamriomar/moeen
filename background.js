/**
 * background.js (Service Worker)
 * Optional: Handles background tasks like notifications.
 */

// Listener for messages from content scripts (e.g., semester change)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SEMESTER_CHANGED") {
        console.log("Background: Received semester change notification", message);
        // Check if notifications permission is granted
        chrome.permissions.contains({ permissions: ['notifications'] }, (granted) => {
            if (granted) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon128.png', // Use your extension icon
                    title: 'تنبيه تحديث الفصل الدراسي',
                    message: `تم اكتشاف فصل دراسي جديد: ${message.newSemester}. قد تحتاج لمراجعة ملاحظاتك.`,
                    priority: 1
                });
            } else {
                console.log("Background: Notifications permission not granted.");
            }
        });
    }
    // Handle other message types if needed
});

// Optional: Listener for when the extension is first installed or updated
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === "install") {
        console.log("Extension installed.");
        // Perform first-time setup if needed
    } else if (details.reason === "update") {
        const previousVersion = details.previousVersion;
        console.log(`Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
        // Perform migration tasks if needed
    }
});
