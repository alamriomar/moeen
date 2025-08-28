/**
 * ui_home_panel.js
 * Creates and manages the main control panel displayed on the home page.
 * Features collapsible sections (accordion).
 */

console.log("Extension: ui_home_panel.js executing...");

let homePanelInjected = false;

// --- START: NEW - Modal Functionality ---

/**
 * Stores the detailed HTML content for each feature's modal.
 */
const featureDetails = {
    highlighting: {
        title: '🎨 كيفية استخدام تظليل الطلاب',
        content: `
            <p>تعمل هذه الميزة في <b>صفحة رصد الغياب</b>.</p>
            <ul>
                <li><b>التظليل الأحمر (حرمان):</b> يُميّز تلقائياً الطلاب الذين تجاوزوا نسبة الغياب المسموح بها (أكثر من 21%).</li>
                <li><b>التظليل الأصفر (إنذار):</b> يُميّز الطلاب الذين وصلوا إلى 6 غيابات.</li>
            </ul>
            <p><b>كيفية التحكم:</b></p>
            <p>استخدم أزرار التفعيل/الإلغاء في لوحة التحكم التي تظهر أعلى جدول رصد الغياب لتشغيل أو إيقاف أي من نوعي التظليل.</p>
        `
    },
    notes: {
        title: '📝 كيفية استخدام الملاحظات',
        content: `
            <p>يمكنك تسجيل ملاحظات نصية خاصة بكل طالب لكل مقرر وأسبوع دراسي.</p>
            <p><b>كيفية الاستخدام في صفحة رصد الغياب:</b></p>
            <ul>
                <li>انقر على أيقونة الملاحظات (📝 أو ✏️) بجانب اسم الطالب لفتح نافذة الملاحظات.</li>
                <li>اكتب ملاحظتك للأسبوع الحالي واحفظها.</li>
                <li>يمكنك أيضاً رؤية ملاحظات الطالب في مقررات أخرى من نفس النافذة.</li>
                <li>استخدم أزرار "عرض الكل" أو "حذف الكل" في لوحة التحكم لإدارة ملاحظات المقرر الحالي.</li>
            </ul>
        `
    },
    customColumns: {
        title: '📊 كيفية استخدام الأعمدة المخصصة',
        content: `
            <p>تسمح لك هذه الميزة بإضافة أعمدة بيانات خاصة بك (مثل درجات المشاركة، الواجبات، أو أي ملاحظات أخرى) في جدول رصد الغياب.</p>
            <p><b>كيفية الاستخدام:</b></p>
            <ul>
                <li>من لوحة التحكم في صفحة رصد الغياب، اضغط على زر "➕ إضافة عمود".</li>
                <li>اختر اسم ونوع العمود (نصي أو مربع اختيار).</li>
                <li>أدخل البيانات مباشرة في الجدول للطلاب. سيتم الحفظ تلقائياً.</li>
                <li>لإعادة تسمية أو حذف الأعمدة، استخدم زر "⚙️ إدارة الأعمدة".</li>
            </ul>
        `
    },
    tooltip: {
        title: '🖱️ كيفية استخدام العرض السريع للغياب',
        content: `
            <p>توفر هذه الميزة وصولاً سريعاً لسجل غياب الطالب المفصل دون الحاجة لمغادرة صفحة رصد الغياب.</p>
            <p><b>كيفية الاستخدام:</b></p>
            <ul>
                <li>في صفحة رصد الغياب، مرّر مؤشر الفأرة فوق اسم أي طالب.</li>
                <li>ستظهر نافذة منبثقة تعرض سجل غيابه المفصل (التواريخ ونوع الغياب) لهذا المقرر.</li>
                <li><b>لتحديث البيانات:</b> إذا لم تظهر بيانات أو كانت قديمة، قم بزيارة صفحة "تفاصيل غياب الطالب" لهذا الطالب مرة واحدة، وستقوم الإضافة بحفظ بياناته تلقائياً لاستخدامها في العرض السريع.</li>
            </ul>
        `
    },
    autoSave: {
        title: '💾 فهم الحفظ التلقائي لتفاصيل الغياب',
        content: `
            <p>هذه الميزة تعمل في الخلفية لجمع البيانات اللازمة لميزة "العرض السريع للغياب".</p>
            <p><b>كيف تعمل:</b></p>
            <ul>
                <li><b>لا إجراء مطلوب منك:</b> بمجرد فتحك لصفحة "تفاصيل غياب الطالب" لأي طالب، ستقوم الإضافة تلقائياً بحفظ وتحديث سجل غيابه المفصل في ذاكرتها المحلية.</li>
                <li>هذه البيانات تُستخدم لاحقاً لعرضها في نافذة العرض السريع (Tooltip) في صفحة رصد الغياب.</li>
            </ul>
        `
    },
    tracker: {
        title: '📅 كيفية استخدام متتبع استمرارية الغياب',
        content: `
            <p>يقوم هذا المتتبع بتحليل جدولك الدراسي وتسجيلات الغياب لاكتشاف أي فجوات أو أيام لم يتم رصدها، ويعرض حالة مرئية لكل أسابيع الفصل الدراسي.</p>
            <p><b>كيفية التفعيل والاستخدام:</b></p>
            <ol>
                <li><b>أولاً:</b> في بداية كل فصل دراسي، قم بزيارة <b>صفحة الجدول الدراسي</b> مرة واحدة. هذا يسمح للإضافة بحفظ أيام وساعات محاضراتك.</li>
                <li><b>ثانياً:</b> قم برصد الغياب كالمعتاد.</li>
            </ol>
            <p>ستجد في هذه اللوحة، تحت كل مقرر، شبكة أسابيع ملونة توضح حالة الرصد:</p>
            <ul>
                <li><b>أخضر:</b> مكتمل.</li>
                <li><b>أحمر:</b> يوجد نقص في الرصد.</li>
                <li><b>أصفر:</b> نقص تم تجاهله يدوياً.</li>
                <li><b>رمادي:</b> لم يحن موعده بعد.</li>
            </ul>
        `
    }
};

/**
 * Creates and displays a modal with a title and specified HTML content.
 * @param {string} title - The title to display in the modal header.
 * @param {string} contentHTML - The HTML content to display in the modal body.
 */
function createDetailsModal(title, contentHTML) {
    // Close any existing modal first
    const existingModal = document.getElementById('featureDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'featureDetailsModal';
    overlay.className = 'notes-modal-overlay'; // Reuse existing style
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };

    const contentDiv = document.createElement('div');
    contentDiv.className = 'notes-modal-content'; // Reuse existing style

    const header = document.createElement('div');
    header.className = 'notes-modal-header'; // Reuse existing style
    header.textContent = title;
    contentDiv.appendChild(header);

    const body = document.createElement('div');
    body.className = 'notes-modal-body'; // Reuse existing style
    body.innerHTML = contentHTML;
    contentDiv.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'notes-modal-footer'; // Reuse existing style
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'إغلاق';
    closeBtn.className = 'notes-modal-button close-btn'; // Reuse existing style
    closeBtn.onclick = () => overlay.remove();
    footer.appendChild(closeBtn);
    contentDiv.appendChild(footer);

    overlay.appendChild(contentDiv);
    document.body.appendChild(overlay);
}

// --- END: NEW - Modal Functionality ---


/**
 * Creates the main control panel element with collapsible sections.
 * @param {string} lecturerId
 * @param {string} currentSemester
 * @param {string|null} lastSeenSemester - Not used directly in this version, but kept for context.
 * @param {Array<object>} assignedSections - Array of section objects.
 * @param {number} storageUsageBytes
 * @param {object} allCourseStats // <-- ADDED: Stats for all courses {courseCode: {stats}}
 * @param {object} continuityData - The entire continuity tracker data object.
 * @param {string|null} lecturerFirstName - The first name of the lecturer.
 * @returns {HTMLElement} The panel element.
 */
function createHomePagePanelElement(lecturerId, currentSemester, lastSeenSemester, assignedSections, storageUsageBytes, allCourseStats, continuityData, lecturerFirstName) {
    const panel = document.createElement('div');
    panel.className = 'control-panel home-panel';
    panel.id = 'extension-home-panel';
    const iconPath = chrome.runtime.getURL("icon128.png")
    // --- START: Modified Title Section with Logo (Using Span) ---
    const titleContainer = document.createElement('div');
    titleContainer.className = 'panel-title-container'; // Class for styling

    const logoImg = document.createElement('img');
    try {
        logoImg.src = chrome.runtime.getURL("logo.svg"); // Or "icon48.png"
    } catch (e) {
        console.warn("Could not get URL for logo.svg, falling back to icon48.png", e);
        try {
             logoImg.src = chrome.runtime.getURL("icon48.png");
         } catch (e2) {
             console.error("Could not get URL for icon48.png either.", e2);
             logoImg.alt = "Logo";
         }
    }
    logoImg.className = 'panel-title-logo';
    logoImg.alt = "شعار مُعين";

    // Create element for text title - CHANGED TO SPAN
    const titleText = document.createElement('span'); // <<< CHANGED FROM 'h4'
    titleText.className = 'panel-title-text'; // Class for styling
    titleText.textContent = lecturerFirstName ? `حياك الله د. ${lecturerFirstName}` : 'أهلاً بك مجدداً';

    // Append image and text to the container
    titleContainer.appendChild(logoImg);
    titleContainer.appendChild(titleText);

    panel.appendChild(titleContainer);
    // --- END: Modified Title Section with Logo (Using Span) ---


    // --- Section: ابدأ هنا ---
    const startHereDetails = document.createElement('details');
    startHereDetails.className = 'panel-section-details';
    startHereDetails.open = true; // Start expanded
    const startHereSummary = document.createElement('summary');
    startHereSummary.className = 'panel-section-summary';
    startHereSummary.textContent = '🚀 ابدأ هنا';
    startHereDetails.appendChild(startHereSummary);

    // START: Updated Content for 'ابدأ هنا'
    const startHereContent = document.createElement('div');
    startHereContent.className = 'panel-section-content';

    // Combined Introduction and Features
    const introFeaturesDetails = document.createElement('details');
    introFeaturesDetails.className = 'panel-subsection-details';
    introFeaturesDetails.open = false; // Keep intro expanded initially
    const introFeaturesSummary = document.createElement('summary');
    introFeaturesSummary.className = 'panel-subsection-summary';
    introFeaturesSummary.textContent = 'مميزات مُعين';
    introFeaturesDetails.appendChild(introFeaturesSummary);
    // Set innerHTML for this combined section
    introFeaturesDetails.innerHTML += `
        <div class="panel-subsection-content">
            <p>مرحباً بك في إضافة <b>مُعين</b>! <img src="${iconPath}" alt="مُعين Icon" style="width: 32px; height: 32px; vertical-align: middle; margin-left: 10px;"></p>
            <p>هذه الإضافة مصممة لمساعدتك كمحاضر عبر تسهيل بعض المهام المتكررة وتوفير وصول سريع لمعلومات الطلاب والمقررات.</p>
            <p><b>أهم الميزات التي تقدمها الإضافة:</b></p>
            <div class="features-grid">
                <div class="feature-card" data-feature-key="highlighting">
                    <div class="feature-icon">🎨</div>
                    <div class="feature-title">تظليل الطلاب التلقائي</div>
                    <div class="feature-description">تمييز الطلاب في صفحة رصد الغياب بناءً على معايير الغياب.</div>
                    <button class="feature-details-btn">كيف؟</button>
                </div>
                <div class="feature-card" data-feature-key="notes">
                    <div class="feature-icon">📝</div>
                    <div class="feature-title">ملاحظات لكل طالب</div>
                    <div class="feature-description">تسجيل ملاحظات نصية خاصة بكل طالب لكل مقرر وأسبوع دراسي.</div>
                    <button class="feature-details-btn">كيف؟</button>
                </div>
                <div class="feature-card" data-feature-key="customColumns">
                    <div class="feature-icon">📊</div>
                    <div class="feature-title">أعمدة مخصصة</div>
                    <div class="feature-description">إضافة أعمدة بيانات خاصة بك لتسجيل معلومات إضافية.</div>
                    <button class="feature-details-btn">كيف؟</button>
                </div>
                <div class="feature-card" data-feature-key="tooltip">
                    <div class="feature-icon">🖱️</div>
                    <div class="feature-title">عرض تفاصيل الغياب السريع</div>
                    <div class="feature-description">نافذة منبثقة تعرض سجل غياب الطالب المفصل عند تمرير الفأرة.</div>
                    <button class="feature-details-btn">كيف؟</button>
                </div>
                <div class="feature-card" data-feature-key="autoSave">
                    <div class="feature-icon">💾</div>
                    <div class="feature-title">حفظ تلقائي لتفاصيل الغياب</div>
                    <div class="feature-description">يتم حفظ بيانات تفاصيل غياب الطالب تلقائياً عند زيارة صفحته.</div>
                    <button class="feature-details-btn">كيف؟</button>
                </div>
                <div class="feature-card" data-feature-key="tracker">
                    <div class="feature-icon">📅</div>
                    <div class="feature-title">متتبع استمرارية الغياب</div>
                    <div class="feature-description">يكتشف أي فجوات أو أيام لم يتم رصدها في جدولك الدراسي.</div>
                    <button class="feature-details-btn">كيف؟</button>
                </div>
            </div>
        </div>`;
    startHereContent.appendChild(introFeaturesDetails);

    // Updated How to Use Section -> Activation Steps
    const usageDetails = document.createElement('details');
    usageDetails.className = 'panel-subsection-details';
    const usageSummary = document.createElement('summary');
    usageSummary.className = 'panel-subsection-summary';
    usageSummary.textContent = 'خطوات لتفعيل كامل الميزات';
    usageDetails.appendChild(usageSummary);
    // Set innerHTML for Activation Steps
    usageDetails.innerHTML += `
        <div class="panel-subsection-content">
            <p>لضمان عمل جميع ميزات الإضافة بشكل صحيح، يرجى اتباع الخطوات التالية:</p>
            <ol>
                <li><b>تحديث قائمة المقررات:</b> قم بزيارة صفحة <b>"إدخال الغياب"</b> أو <b>"رصد الدرجات"</b> مرة واحدة على الأقل لتظهر مقرراتك في هذه اللوحة.</li>
                <li><b>تفعيل متتبع الغياب:</b> في بداية كل فصل دراسي، قم بزيارة <b>"الجدول الدراسي"</b> مرة واحدة للسماح للإضافة بحفظ أيام محاضراتك.</li>
                <li><b>تفعيل العرض السريع للغياب:</b> قم بزيارة صفحة <b>"تفاصيل غياب الطالب"</b> لأي طالب مرة واحدة لتخزين بياناته وعرضها لاحقاً بسرعة.</li>
            </ol>
        </div>`;
    startHereContent.appendChild(usageDetails);

    startHereDetails.appendChild(startHereContent);
    panel.appendChild(startHereDetails);
    // END: Updated Content for 'ابدأ هنا'

    // --- Section: معلومات المحاضر ---
    const lecturerInfoDetails = document.createElement('details');
    lecturerInfoDetails.className = 'panel-section-details';
    const lecturerInfoSummary = document.createElement('summary');
    lecturerInfoSummary.className = 'panel-section-summary';
    lecturerInfoSummary.textContent = '👤 بياناتك الحالية';
    lecturerInfoDetails.appendChild(lecturerInfoSummary);
    const lecturerInfoContent = document.createElement('div');
    lecturerInfoContent.className = 'panel-section-content';
    lecturerInfoContent.innerHTML = `
        <p><strong>المحاضر الحالي (المكتشف):</strong> ${lecturerId || 'غير محدد'}</p>
        <p><strong>الفصل الدراسي الحالي (المكتشف):</strong> ${currentSemester || 'غير محدد'}</p>
        ${(lastSeenSemester && currentSemester && currentSemester !== lastSeenSemester)
            ? `<p class="semester-warning"><b>تنبيه:</b> تم اكتشاف فصل دراسي جديد (${currentSemester}). آخر فصل مسجل كان ${lastSeenSemester}.</p>`
            : ''
        }
    `;
    lecturerInfoDetails.appendChild(lecturerInfoContent);
    panel.appendChild(lecturerInfoDetails);

    // --- Section: المقررات ---
    const coursesDetails = document.createElement('details');
    coursesDetails.className = 'panel-section-details';
    const coursesSummary = document.createElement('summary');
    coursesSummary.className = 'panel-section-summary';
    coursesSummary.textContent = '📚 مقرراتك الدراسية';
    coursesDetails.appendChild(coursesSummary);
    const coursesContent = document.createElement('div');
    coursesContent.className = 'panel-section-content assigned-sections-list';

    if (assignedSections && assignedSections.length > 0) {
        assignedSections.forEach(section => {
            const courseItemDetails = document.createElement('details');
            courseItemDetails.className = 'panel-subsection-details course-item';
            const courseItemSummary = document.createElement('summary');
            courseItemSummary.className = 'panel-subsection-summary';
            courseItemSummary.textContent = `${section.code} - ${section.name} (شعبة ${section.section})`;
            courseItemDetails.appendChild(courseItemSummary);
            
            const courseItemContent = document.createElement('div');
            courseItemContent.className = 'panel-subsection-content';
            const statsContainer = document.createElement('div');
            statsContainer.className = 'course-stats-container panel-sub-section';

            const statsTitle = document.createElement('h4');
            statsTitle.className = 'continuity-tracker-title';
            statsTitle.textContent = '📊 إحصائيات المقرر';
            statsContainer.appendChild(statsTitle);
            
            const stats = allCourseStats[section.code];
            
            if (stats) {
                const updatedDate = new Date(stats.lastUpdated).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
                statsContainer.innerHTML = `
                    <span class="stat-item" title="إجمالي الطلاب"><span class="stat-icon">🧑‍🎓</span><span class="stat-label">الإجمالي:</span><span class="stat-value">${stats.totalStudents ?? '?'}</span></span>
                    <span class="stat-item" title="المحرومون"><span class="stat-icon">🚫</span><span class="stat-label">المحرومون:</span><span class="stat-value dismissed">${stats.dismissedCount ?? '?'}</span></span>
                    <span class="stat-item" title="المنسحبون"><span class="stat-icon">👋</span><span class="stat-label">المنسحبون:</span><span class="stat-value withdrawn">${stats.withdrawnCount ?? '?'}</span></span>
                    <div class="stats-last-updated"><small><i>(آخر تحديث: ${updatedDate})</i></small></div>
                `;
            } else {
                statsContainer.innerHTML = '<p class="stats-not-available">لم يتم حساب الإحصائيات بعد (زر صفحة رصد الغياب لهذا المقرر).</p>';
            }
            courseItemContent.appendChild(statsContainer);

            const { lastRecorded = {}, missedAbsences = [] } = continuityData || {};
            const courseKey = `${section.code.trim()}_${section.section.trim()}`;
            const lastEntry = lastRecorded[courseKey];
            const courseAlerts = missedAbsences.filter(alert =>
                alert.courseCode.trim() === section.code.trim() &&
                alert.section.trim() === section.section.trim() &&
                alert.status === 'pending'
            );

            const trackerContainer = document.createElement('div');
            trackerContainer.className = 'continuity-tracker-section panel-sub-section';

            const trackerTitle = document.createElement('h4');
            trackerTitle.className = 'continuity-tracker-title';
            trackerTitle.textContent = '📅 متتبع رصد الغياب';
            trackerContainer.appendChild(trackerTitle);

            const dayMap = { 1: "الأحد", 2: "الاثنين", 3: "الثلاثاء", 4: "الأربعاء", 5: "الخميس" };
            const courseSchedule = continuityData.schedules[courseKey];

            const infoGrid = document.createElement('div');
            infoGrid.className = 'continuity-info-grid';

            const schedulePara = document.createElement('p');
            if (courseSchedule && courseSchedule.days.length > 0) {
                const dayNames = courseSchedule.days.map(d => dayMap[d] || d).join('، ');
                schedulePara.innerHTML = `<b>أيام الدوام:</b> ${dayNames}`;
            } else {
                schedulePara.innerHTML = `<b>أيام الدوام:</b> <i>لم يتم تحديدها بعد (يرجى زيارة صفحة الجدول الدراسي)</i>`;
            }
            infoGrid.appendChild(schedulePara);

            const statusPara = document.createElement('p');
            if (lastEntry) {
                statusPara.innerHTML = `<b>آخر رصد:</b> الأسبوع ${lastEntry.week}، يوم ${dayMap[lastEntry.day] || 'غير محدد'} <small><i>(${lastEntry.date})</i></small>`;
            } else {
                statusPara.innerHTML = `<b>آخر رصد:</b> <i>في انتظار أول عملية رصد...</i>`;
            }
            infoGrid.appendChild(statusPara);
            
            trackerContainer.appendChild(infoGrid);

            if (typeof calculateWeeklyStatus === 'function') {
                const weeklyStatuses = calculateWeeklyStatus(courseSchedule, lastEntry, courseAlerts);
                const gridContainer = document.createElement('div');
                gridContainer.className = 'week-grid';

                weeklyStatuses.forEach(weekStatus => {
                    const weekBox = document.createElement('div');
                    weekBox.className = `week-box status-${weekStatus.status}`;
                    weekBox.title = weekStatus.tooltip;
                    weekBox.textContent = weekStatus.week;
                    gridContainer.appendChild(weekBox);
                });
                trackerContainer.appendChild(gridContainer);
            }

            if (courseAlerts.length > 0) {
                const alertsContainer = document.createElement('div');
                alertsContainer.className = 'continuity-alerts-container';

                courseAlerts.forEach(alert => {
                    const alertItem = document.createElement('div');
                    alertItem.className = 'continuity-alert-item';
                    
                    const alertText = document.createElement('span');
                    alertText.innerHTML = `⚠️ <b>تنبيه:</b> قد يكون هناك غياب مفقود للأسبوع <b>${alert.week}</b>، يوم <b>${dayMap[alert.day] || 'غير محدد'}</b>.`;
                    
                    const dismissWrapper = document.createElement('div');
                    dismissWrapper.className = 'dismiss-wrapper';

                    const dismissQuestion = document.createElement('small');
                    dismissQuestion.textContent = 'التنبيه هذا غير صحيح؟';
                    
                    const dismissButton = document.createElement('button');
                    dismissButton.textContent = 'إهمال';
                    dismissButton.className = 'dismiss-button';
                    dismissButton.title = 'إهمال هذا التنبيه بشكل دائم';
                    dismissButton.dataset.alertIdentifier = JSON.stringify({ courseCode: alert.courseCode, section: alert.section, week: alert.week, day: alert.day });

                    dismissButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm('هل أنت متأكد من إهمال هذا التنبيه؟')) {
                            const identifier = JSON.parse(e.target.dataset.alertIdentifier);
                            if (typeof ignoreMissedAbsence === 'function') {
                                await ignoreMissedAbsence(lecturerId, identifier);
                                e.target.closest('.continuity-alert-item').style.display = 'none';
                            }
                        }
                    });

                    dismissWrapper.appendChild(dismissQuestion);
                    dismissWrapper.appendChild(dismissButton);

                    alertItem.appendChild(alertText);
                    alertItem.appendChild(dismissWrapper);
                    alertsContainer.appendChild(alertItem);
                });

                trackerContainer.appendChild(alertsContainer);

                const warningIcon = document.createElement('span');
                warningIcon.textContent = ' ⚠️';
                warningIcon.title = 'يوجد تنبيهات بخصوص غياب مفقود';
                warningIcon.className = 'summary-warning-icon';
                courseItemSummary.appendChild(warningIcon);
            }
            courseItemContent.appendChild(trackerContainer);
            
            courseItemDetails.appendChild(courseItemContent);
            coursesContent.appendChild(courseItemDetails);
        });
    } else {
        coursesContent.innerHTML = '<p><i>لم يتم العثور على مقررات مسندة. يرجى زيارة صفحة "إدخال الغياب" أو "رصد الدرجات" لتحديث القائمة.</i></p>';
    }
    coursesDetails.appendChild(coursesContent);
    panel.appendChild(coursesDetails);

    // --- Section: التخزين والبيانات (Repurposed for Privacy) ---
    const storageDetails = document.createElement('details');
    storageDetails.className = 'panel-section-details';
    storageDetails.id = 'privacy-storage-section';
    const storageSummary = document.createElement('summary');
    storageSummary.className = 'panel-section-summary';
    storageSummary.textContent = '🔒 الخصوصية والبيانات';
    storageDetails.appendChild(storageSummary);
    const storageContent = document.createElement('div');
    storageContent.className = 'panel-section-content';
    storageContent.innerHTML = `
        <p><b>هام جداً بخصوص بياناتك:</b></p>
        <ul>
            <li>جميع البيانات التي تسجلها باستخدام هذه الإضافة (مثل الملاحظات، بيانات الأعمدة المخصصة، تفاصيل الغياب المحفوظة) يتم تخزينها <b>فقط</b> على جهاز الكمبيوتر الخاص بك، ضمن مساحة التخزين المحلية لمتصفح جوجل كروم (Chrome Local Storage).</li>
            <li>هذه الإضافة <b>لا تقوم أبداً</b> بإرسال أي من بياناتك أو بيانات الطلاب إلى أي خادم خارجي أو جهة أخرى.</li>
            <li>الإضافة لا تقوم باستخلاص أو استخدام أي بيانات لأي غرض آخر غير عرضها لك داخل النظام الأكاديمي لتسهيل عملك.</li>
            <li>أمان بياناتك يعتمد على أمان جهازك ومتصفحك.</li>
            <li><i>ملاحظة: لا تتوفر حالياً خيارات للنسخ الاحتياطي أو الاستعادة التلقائية للبيانات.</i></li>
        </ul>
        <hr style="margin: 15px 0;">
    `;
    const usageDiv = document.createElement('div');
    usageDiv.id = 'storage-usage-display';
    usageDiv.className = 'storage-info-container panel-sub-section';

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    usageDiv.innerHTML = `
        <div class="storage-info-label">
            💾 مساحة التخزين المستخدمة لبياناتك (المحاضر ${lecturerId}):
        </div>
        <div class="storage-info-value">
            ${formatBytes(storageUsageBytes)}
        </div>
        <div class="storage-info-note">
            (الحد الافتراضي للمتصفح: 10 MB)
        </div>
    `;
    storageContent.appendChild(usageDiv);
    
    const clearButtonDiv = document.createElement('div');
    const clearButton = document.createElement('button');
    clearButton.id = 'clear-all-lecturer-data-button';
    clearButton.type = 'button';
    clearButton.textContent = 'مسح جميع بيانات الإضافة المحفوظة لهذا المحاضر';
    clearButton.className = 'panel-button danger';
    clearButton.title = 'تحذير: هذا سيحذف جميع ملاحظاتك وأعمدتك المخصصة وإعداداتك لهذه الإضافة!';
    clearButton.style.marginTop = '5px';

    clearButton.addEventListener('click', async () => {
        const confirmation1 = confirm(`تحذير شديد!\n\nهل أنت متأكد تماماً من رغبتك في حذف جميع بيانات إضافة "مُعين" المحفوظة للمحاضر ${lecturerId}؟\n\nسيتم حذف:\n- جميع ملاحظات الطلاب لجميع المقررات.\n- جميع ملاحظات المقررات العامة.\n- جميع الأعمدة المخصصة وبياناتها.\n- جميع تفاصيل الغياب المحفوظة.\n- إعدادات التظليل.\n\n**هذا الإجراء نهائي ولا يمكن التراجع عنه!**`);
        if (!confirmation1) {
            alert("تم إلغاء عملية الحذف.");
            return;
        }
        const confirmation2 = confirm(`تأكيد أخير!\n\nسيتم حذف جميع بيانات الإضافة بشكل دائم للمحاضر ${lecturerId}.\nهل أنت متأكد من المتابعة؟`);
        if (confirmation2) {
            console.warn(`Proceeding with clearing all data for lecturer ${lecturerId}...`);
            if (typeof clearAllDataForLecturer === 'function') {
                const success = await clearAllDataForLecturer(lecturerId);
                if (success) {
                    alert(`تم حذف جميع بيانات إضافة "مُعين" للمحاضر ${lecturerId} بنجاح.\n\nقد تحتاج إلى تحديث الصفحة لرؤية التغييرات.`);
                    const currentUsage = await getStorageUsageForLecturer(lecturerId);
                    const displaySpan = usageDiv.querySelector('span');
                    if(displaySpan) displaySpan.textContent = formatBytes(currentUsage);
                } else {
                    alert("حدث خطأ أثناء محاولة حذف البيانات. يرجى المحاولة مرة أخرى أو مراجعة وحدة التحكم.");
                }
            } else {
                 console.error("Clear button error: clearAllDataForLecturer function is not defined!");
                 alert("خطأ فني: وظيفة حذف البيانات غير متاحة.");
            }
        } else {
            alert("تم إلغاء عملية الحذف.");
        }
    });

    clearButtonDiv.appendChild(clearButton);
    storageContent.appendChild(clearButtonDiv);
    
    storageDetails.appendChild(storageContent);
    panel.appendChild(storageDetails);

    // --- Section: معلومات عن الإضافة ---
    const aboutDetails = document.createElement('details');
    aboutDetails.className = 'panel-section-details';
    const aboutSummary = document.createElement('summary');
    aboutSummary.className = 'panel-section-summary';
    aboutSummary.textContent = 'ℹ️ عن الإضافة';
    aboutDetails.appendChild(aboutSummary);
    const aboutContent = document.createElement('div');
    aboutContent.className = 'panel-section-content';
    aboutContent.innerHTML = `
        <p><img src="${iconPath}" alt="مُعين Icon" style="width: 32px; height: 32px; vertical-align: middle; margin-left: 10px;"> إضافة <b>مُعين</b> (النسخة الحالية: 1.0)</p>
        <p>تم تطوير هذه الإضافة بواسطة:</p>
        <p style="margin-right: 15px;"><b>عمر ظافر</b>
        <p>للتواصل أو الملاحظات: <a href="mailto:os_alamri@ut.edu.sa" target="_blank">os_alamri@ut.edu.sa</a></p>
        <p style="margin-top: 15px; font-size: 0.9em; border-top: 1px solid #eee; padding-top: 10px;"><em>© ${new Date().getFullYear()} عمر ظافر. جميع الحقوق محفوظة.</em></p>
    `;
    aboutDetails.appendChild(aboutContent);
    panel.appendChild(aboutDetails);

    // --- START: NEW - Add event listener for the details buttons ---
    panel.addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('feature-details-btn')) {
            const card = target.closest('.feature-card');
            const featureKey = card.dataset.featureKey;
            if (featureKey && featureDetails[featureKey]) {
                const { title, content } = featureDetails[featureKey];
                createDetailsModal(title, content);
            }
        }
    });
    // --- END: NEW - Add event listener ---

    return panel;
}

// --- ADD Helper Function to Refresh Storage Section UI ---
async function refreshStorageSectionUI(lecturerId) {
    const sectionDetails = document.getElementById('privacy-storage-section');
    const usageDisplay = document.getElementById('storage-usage-display');
    if (!sectionDetails || !usageDisplay || !lecturerId) return;

    console.log("Refreshing storage section UI...");
    const currentUsage = await getStorageUsageForLecturer(lecturerId);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

     usageDisplay.innerHTML = `
        <b>مساحة التخزين المستخدمة حالياً لبياناتك (المحاضر ${lecturerId}):</b>
        <span style="font-weight: bold; color: #337ab7;">${formatBytes(currentUsage)}</span>
        <br>
        <small>(الحد الافتراضي للمتصفح هو 10 ميجابايت، ما لم يتم منح إذن 'unlimitedStorage').</small>
    `;
}

/**
 * Injects the home page control panel *after* the lecturer info table.
 * @param {string} lecturerId
 * @param {string} currentSemester
 * @param {string|null} lastSeenSemester
 * @param {Array<object>} assignedSections
 * @param {number} storageUsageBytes
 * @param {object} allCourseStats // <-- ADDED
 * @param {object} continuityData
 * @param {string|null} lecturerFirstName
 */
function ensureHomePagePanelInjected(lecturerId, currentSemester, lastSeenSemester, assignedSections, storageUsageBytes, allCourseStats, continuityData, lecturerFirstName) {
    console.log("ensureHomePagePanelInjected called.");
    if (homePanelInjected || document.getElementById('extension-home-panel')) {
        console.log("Home panel already injected.");
        return;
    }
    if (typeof findHomePageInjectionTarget !== 'function' || typeof safeInjectAfter !== 'function' || typeof createHomePagePanelElement !== 'function') {
        console.error("Initialization failed: Dependency function(s) for home panel injection not defined!");
        return;
    }

    const targetElement = findHomePageInjectionTarget();
    if (!targetElement) {
        console.error("Cannot inject home panel: Injection target element not found.");
        return;
    }

    console.log("Injecting home page control panel...");
    const panelElement = createHomePagePanelElement(lecturerId, currentSemester, lastSeenSemester, assignedSections, storageUsageBytes, allCourseStats, continuityData, lecturerFirstName);

    safeInjectAfter(panelElement, targetElement);

    homePanelInjected = true;
    console.log("Home page control panel injected.");
}

console.log("Extension: ui_home_panel.js finished defining functions.");
