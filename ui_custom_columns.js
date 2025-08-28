/**
 * ui_custom_columns.js
 * Creates and manages modals for adding and managing custom columns.
 */

console.log("Extension: ui_custom_columns.js loaded.");

/**
 * Creates and displays the modal for adding a new custom column.
 * @param {string} courseCode - The current course code.
 * @param {Function} onSaveCallback - Function to call when saving: onSaveCallback(newColumnDefinition)
 */
function createAddColumnModal(courseCode, onSaveCallback) {
    // Ensure closeModal is available
    if (typeof closeModal !== 'function') { console.error("createAddColumnModal Error: closeModal is not defined!"); return; }
    closeModal(); // Close any existing modal first

    if (!courseCode) {
        alert("خطأ: لا يمكن تحديد المقرر الحالي لإضافة عمود.");
        return;
    }
    console.log(`Opening Add Column modal for course: ${courseCode}`);

    // --- Create Modal Elements ---
    const overlay = document.createElement('div');
    overlay.id = 'addColumnModalOverlay';
    overlay.className = 'notes-modal-overlay'; // Reuse styling
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    const content = document.createElement('div');
    content.className = 'notes-modal-content'; // Reuse styling

    // Header
    const header = document.createElement('div');
    header.className = 'notes-modal-header'; // Reuse styling
    header.textContent = `إضافة عمود مخصص للمقرر: ${courseCode}`;
    content.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'notes-modal-body'; // Reuse styling
    body.style.textAlign = 'right'; // Ensure RTL

    // Column Name Input
    const nameGroup = document.createElement('div');
    nameGroup.style.marginBottom = '15px';
    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'add-column-name-input';
    nameLabel.textContent = 'اسم العمود:';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '5px';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'add-column-name-input';
    nameInput.maxLength = 30; // Limit name length
    nameInput.style.width = '95%';
    nameInput.required = true;
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    body.appendChild(nameGroup);

    // Column Type Selection
    const typeGroup = document.createElement('div');
    typeGroup.style.marginBottom = '15px';
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'نوع العمود:';
    typeLabel.style.display = 'block';
    typeLabel.style.marginBottom = '5px';
    typeGroup.appendChild(typeLabel);

    const typeRadioCheck = document.createElement('input');
    typeRadioCheck.type = 'radio';
    typeRadioCheck.id = 'add-column-type-check';
    typeRadioCheck.name = 'add-column-type';
    typeRadioCheck.value = 'check';
    typeRadioCheck.checked = true; // Default to checkbox
    const typeLabelCheck = document.createElement('label');
    typeLabelCheck.htmlFor = 'add-column-type-check';
    typeLabelCheck.textContent = ' مربع اختيار (Checkbox)';
    typeLabelCheck.style.marginRight = '10px';

    const typeRadioText = document.createElement('input');
    typeRadioText.type = 'radio';
    typeRadioText.id = 'add-column-type-text';
    typeRadioText.name = 'add-column-type';
    typeRadioText.value = 'text';
    const typeLabelText = document.createElement('label');
    typeLabelText.htmlFor = 'add-column-type-text';
    typeLabelText.textContent = ' نص (Text - 10 حروف)';
    typeLabelText.style.marginRight = '10px';

    typeGroup.appendChild(typeRadioCheck);
    typeGroup.appendChild(typeLabelCheck);
    typeGroup.appendChild(typeRadioText);
    typeGroup.appendChild(typeLabelText);
    body.appendChild(typeGroup);

    content.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'notes-modal-footer'; // Reuse styling
    const saveButton = document.createElement('button');
    saveButton.textContent = 'إضافة العمود';
    saveButton.className = 'notes-modal-button save'; // Reuse styling
    saveButton.type = "button";
    saveButton.onclick = () => {
        const columnName = nameInput.value.trim();
        const columnType = document.querySelector('input[name="add-column-type"]:checked').value;

        if (!columnName) {
            alert("يرجى إدخال اسم للعمود.");
            nameInput.focus();
            return;
        }

        const newColumnDefinition = {
            id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Unique ID
            name: columnName,
            type: columnType
        };

        if (typeof onSaveCallback === 'function') {
            onSaveCallback(newColumnDefinition); // Pass the new definition back
        } else {
            console.error("Add Column Save Error: onSaveCallback is not a function!");
        }
        closeModal();
    };
    footer.appendChild(saveButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'إلغاء';
    closeButton.className = 'notes-modal-button close-btn'; // Reuse styling
    closeButton.type = "button";
    closeButton.onclick = closeModal;
    footer.appendChild(closeButton);
    content.appendChild(footer);

    overlay.appendChild(content);
    document.body.appendChild(overlay);
    nameInput.focus(); // Focus on the name input initially
}


/**
 * Creates and displays the modal for managing existing custom columns (rename/delete).
 * @param {string} courseCode - The current course code.
 * @param {Array<object>} currentDefinitions - Array of existing column definitions {id, name, type}.
 * @param {Function} onUpdateCallback - Function to call when definitions change: onUpdateCallback(updatedDefinitions)
 */
function createManageColumnsModal(courseCode, currentDefinitions, onUpdateCallback) {
    // Ensure closeModal is available
    if (typeof closeModal !== 'function') { console.error("createManageColumnsModal Error: closeModal is not defined!"); return; }
    closeModal(); // Close any existing modal first

    if (!courseCode) {
        alert("خطأ: لا يمكن تحديد المقرر الحالي لإدارة الأعمدة.");
        return;
    }
    console.log(`Opening Manage Columns modal for course: ${courseCode}`);

    // --- Create Modal Elements ---
    const overlay = document.createElement('div');
    overlay.id = 'manageColumnsModalOverlay';
    overlay.className = 'notes-modal-overlay'; // Reuse styling
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    const content = document.createElement('div');
    content.className = 'notes-modal-content'; // Reuse styling
    content.style.minWidth = '500px'; // Wider for management

    // Header
    const header = document.createElement('div');
    header.className = 'notes-modal-header'; // Reuse styling
    header.textContent = `إدارة الأعمدة المخصصة للمقرر: ${courseCode}`;
    content.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'notes-modal-body'; // Reuse styling
    body.style.textAlign = 'right'; // Ensure RTL

    const listContainer = document.createElement('div');
    listContainer.id = 'manage-columns-list';
    listContainer.style.maxHeight = '40vh';
    listContainer.style.overflowY = 'auto';

    // Make a mutable copy of definitions to work with
    let definitions = [...currentDefinitions];

    function renderList() {
        listContainer.innerHTML = ''; // Clear previous list
        if (definitions.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; font-style: italic;">لا توجد أعمدة مخصصة لهذا المقرر.</p>';
            return;
        }

        definitions.forEach((colDef, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.display = 'flex';
            itemDiv.style.justifyContent = 'space-between';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.padding = '8px 0';
            itemDiv.style.borderBottom = '1px solid #eee';

            const infoSpan = document.createElement('span');
            infoSpan.textContent = `${index + 1}. ${colDef.name} (${colDef.type === 'check' ? 'اختيار' : 'نص'})`;
            infoSpan.style.flexGrow = '1';
            infoSpan.style.marginRight = '10px';

            const actionsDiv = document.createElement('div');

            // Rename Button
            const renameButton = document.createElement('button');
            renameButton.textContent = 'إعادة تسمية';
            renameButton.className = 'notes-modal-button'; // Reuse styling
            renameButton.style.marginLeft = '5px';
            renameButton.onclick = () => {
                const newName = prompt(`أدخل الاسم الجديد للعمود "${colDef.name}":`, colDef.name);
                if (newName !== null && newName.trim() !== '') {
                    definitions = definitions.map(def =>
                        def.id === colDef.id ? { ...def, name: newName.trim() } : def
                    );
                    renderList(); // Re-render the list with the new name
                }
            };
            actionsDiv.appendChild(renameButton);

            // Delete Button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'حذف';
            deleteButton.className = 'notes-modal-button danger'; // Reuse styling
            deleteButton.onclick = () => {
                if (confirm(`هل أنت متأكد من حذف العمود "${colDef.name}"؟ سيتم حذف جميع بياناته أيضاً.`)) {
                    definitions = definitions.filter(def => def.id !== colDef.id);
                    renderList(); // Re-render the list without the deleted item
                }
            };
            actionsDiv.appendChild(deleteButton);

            itemDiv.appendChild(infoSpan);
            itemDiv.appendChild(actionsDiv);
            listContainer.appendChild(itemDiv);
        });
    }

    renderList(); // Initial render
    body.appendChild(listContainer);
    content.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'notes-modal-footer'; // Reuse styling
    const saveButton = document.createElement('button');
    saveButton.textContent = 'حفظ التغييرات';
    saveButton.className = 'notes-modal-button save'; // Reuse styling
    saveButton.type = "button";
    saveButton.onclick = () => {
        if (typeof onUpdateCallback === 'function') {
            onUpdateCallback(definitions); // Pass the modified definitions array back
        } else {
            console.error("Manage Columns Save Error: onUpdateCallback is not a function!");
        }
        closeModal();
    };
    footer.appendChild(saveButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'إلغاء';
    closeButton.className = 'notes-modal-button close-btn'; // Reuse styling
    closeButton.type = "button";
    closeButton.onclick = closeModal;
    footer.appendChild(closeButton);
    content.appendChild(footer);

    overlay.appendChild(content);
    document.body.appendChild(overlay);
}
