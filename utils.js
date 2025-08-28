/**
 * utils.js
 * Common utility functions used across different parts of the extension.
 */

/**
 * Removes ANY modal overlay created by the extension.
 */
function closeModal() {
    const modals = document.querySelectorAll('.notes-modal-overlay, #viewAllNotesModalOverlay'); // Select by class/ID
    modals.forEach(modal => modal.remove());
    // console.log("Closed any open modals."); // Reduce noise
}

/**
 * Debounces a function call.
 * @param {Function} func The function to debounce.
 * @param {number} wait The debounce wait time in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add other common utility functions here if needed later.
