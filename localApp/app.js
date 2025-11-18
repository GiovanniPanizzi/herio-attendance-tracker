/* MAIN OBJECT TO INCLUDE ALL UI ELEMENTS */
const UI = {

    // Headers
    headers: {
        classesHeader: document.getElementById('classes-header'),
        classHeader: document.getElementById('class-header'),
        lessonHeader: document.getElementById('lesson-header')
    },

    // Classes panel
    classes: {
        container: document.getElementById('classes'),
        list: document.getElementById('classes-list'),
        addBtn: document.getElementById('add-class-btn'),
    },

    // Class detail panel
    classDetail: {
        container: document.getElementById('class-detail'),
        title: document.getElementById('class-title'),
        backBtn: document.getElementById('back-to-classes-btn'),
        changeNameBtn: document.getElementById('change-class-name-btn'),
        switchDetailBtn: document.getElementById('switch-detail-btn'),
        
        // Students panel
        studentsPanel: {
            addBtn: document.getElementById('add-student-btn'),
            qrBtn: document.getElementById('qr-class-modal-btn'),
            table: document.getElementById('students-table'),
            qrModal: document.getElementById('qr-class-modal'),
            qrCode: document.getElementById('class-qr-code'),
            qrTable: document.getElementById('qr-class-students-table'),
            addToClassBtn: document.getElementById('add-students-to-class-btn'),
            closeQrBtn: document.getElementById('close-qr-class-modal-btn')
        },

        // Lessons panel
        lessonsPanel: {
            container: document.getElementById('lessons-panel'),
            addBtn: document.getElementById('add-lesson-btn'),
            list: document.getElementById('lessons-list')
        }
    },

    // Lesson detail panel
    lessonDetail: {
        container: document.getElementById('lesson-detail'),
        title: document.getElementById('lesson-title'),
        backBtn: document.getElementById('back-to-lessons-btn'),
        qrBtn: document.getElementById('qr-lesson-modal-btn'),
        attendanceTable: document.getElementById('attendance-students-table'),
        
        qrModal: {
            overlay: document.getElementById('lesson-qr-modal-overlay'),
            timer: document.getElementById('lesson-qr-timer'),
            token: document.getElementById('lesson-qr-token'),
            code: document.getElementById('lesson-qr-code'),
            closeBtn: document.getElementById('close-lesson-qr-btn')
        }
    },

    // Alerts and confirms
    alerts: {
        container: document.getElementById('alert-message-container'),
        text: document.getElementById('alert-text'),
        closeBtn: document.getElementById('close-alert-btn')
    },

    confirms: {
        container: document.getElementById('confirm-message-container'),
        text: document.getElementById('confirm-text'),
        yesBtn: document.getElementById('confirm-yes-btn'),
        noBtn: document.getElementById('confirm-no-btn')
    }
};

function show(element, displayStyle = 'flex') {
    if (element) element.style.display = displayStyle;
}

function hide(element) {
    if (element) element.style.display = 'none';
}

function toggle(element, displayStyle = 'flex') {
    if (!element) return;
    if (element.style.display === 'none' || getComputedStyle(element).display === 'none') {
        element.style.display = displayStyle;
    } else {
        element.style.display = 'none';
    }
}

// Simulated database
let db = {
    classes: [
        { id: 1, name: "Matematica", students: [
            { id: 1, firstName: "Mario", lastName: "Rossi", attendance: 0 },
            { id: 2, firstName: "Luigi", lastName: "Bianchi", attendance: 0 }
        ]},
        { id: 2, name: "Fisica", students: [
            { id: 3, firstName: "Anna", lastName: "Verdi", attendance: 0 }
        ]}
    ]
};

/* =============================
   RENDER FUNCTIONS
============================= */

function renderClasses() {
    UI.classes.list.innerHTML = '';

    db.classes.forEach(cls => {
        const li = document.createElement('li');
        li.id = 'class-card';
        li.className = 'card'; 
        li.dataset.id = cls.id;

        const nameSpan = document.createElement('span');
        nameSpan.id = 'class-card-name';
        nameSpan.textContent = cls.name;
        nameSpan.style.cursor = 'pointer';
        nameSpan.onclick = () => openClassDetail(cls.id);

        const countSpan = document.createElement('span');
        countSpan.id = 'class-card-student-count';
        countSpan.textContent = `(${cls.students.length})`;

        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'delete-class-btn';
        deleteBtn.className = 'button';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); 
            deleteClass(cls.id);
        };

        li.appendChild(nameSpan);
        li.appendChild(countSpan);
        li.appendChild(deleteBtn);

        UI.classes.list.appendChild(li);
    });
}

async function deleteClass(classId) {
    const cls = db.classes.find(c => c.id === classId);
    if (!cls) return;

    const confirmed = await askConfirm(`Vuoi davvero eliminare la classe "${cls.name}"?`);
    if (!confirmed) return;

    db.classes = db.classes.filter(c => c.id !== classId);
    renderClasses();
    launchAlert(`Classe "${cls.name}" eliminata con successo!`);
}

function openClassDetail(classId) {
    const cls = db.classes.find(c => c.id === classId);
    if (!cls) return;

    UI.classDetail.title.textContent = cls.name;

    hide(UI.classes.container);
    show(UI.classDetail.container);

    renderStudents(classId);
}

/* =============================
   ALERT MESSAGE
============================= */
UI.alerts.closeBtn.onclick = () => {
    hide(UI.alerts.container);
    UI.alerts.text.textContent = '';
};

const launchAlert = (message) => {
    UI.alerts.text.textContent = message;
    show(UI.alerts.container, 'flex');
};

/* =============================
   CONFIRM DIALOG
============================= */
const askConfirm = (message) => {
    return new Promise((resolve) => {
        UI.confirms.text.textContent = message;
        show(UI.confirms.container, 'flex');

        const cleanup = () => {
            hide(UI.confirms.container);
            UI.confirms.text.textContent = '';
            UI.confirms.yesBtn.onclick = null;
            UI.confirms.noBtn.onclick = null;
        };

        UI.confirms.yesBtn.onclick = () => {
            cleanup();
            resolve(true);
        };

        UI.confirms.noBtn.onclick = () => {
            cleanup();
            resolve(false);
        };
    });
};

/* INIT APP */
function initApp() {
    renderClasses();
    show(UI.classes.container);
    show(UI.headers.classesHeader);
}
initApp();


