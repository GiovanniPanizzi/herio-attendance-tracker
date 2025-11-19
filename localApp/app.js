const UI = {
    headers: {
        classesHeader: document.getElementById('classes-header'),
        classHeader: document.getElementById('class-header'),
        lessonHeader: document.getElementById('lesson-header')
    },
    classes: {
        container: document.getElementById('classes'),
        list: document.getElementById('classes-list'),
        addBtn: document.getElementById('add-class-btn'),
        addModal: {
            overlay: document.getElementById('add-class-modal-overlay'),
            input: document.getElementById('new-class-name-input'),
            createBtn: document.getElementById('create-class-btn'),
            closeBtn: document.getElementById('close-add-class-modal-btn')
        }
    },
    classDetail: {
        container: document.getElementById('class-detail'),
        title: document.getElementById('class-title'),
        backBtn: document.getElementById('back-to-classes-btn'),
        changeNameBtn: document.getElementById('change-class-name-btn'),
        switchDetailBtn: document.getElementById('switch-detail-btn'),
        studentsPanel: {
            addBtn: document.getElementById('add-student-btn'),
            qrBtn: document.getElementById('qr-class-modal-btn'),
            table: document.getElementById('students-table'),
            qrModal: document.getElementById('qr-class-modal'),
            qrCode: document.getElementById('class-qr-code'),
            qrTable: document.getElementById('qr-class-students-table'),
            addToClassBtn: document.getElementById('add-students-to-class-btn'),
            closeQrBtn: document.getElementById('close-qr-class-modal-btn'),
            addModal: {
                overlay: document.getElementById('add-student-modal-overlay'),
                idInput: document.getElementById('student-id-input'),
                firstNameInput: document.getElementById('student-first-name-input'),
                lastNameInput: document.getElementById('student-last-name-input'),
                createBtn: document.getElementById('create-student-btn'),
                closeBtn: document.getElementById('close-add-student-modal-btn')
            }
        },
        lessonsPanel: {
            container: document.getElementById('lessons-panel'),
            addBtn: document.getElementById('add-lesson-btn'),
            list: document.getElementById('lessons-list')
        }
    },
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

let db = {
    classes: [
        { id: 1, name: "Matematica", students: [{ id: 1, firstName: "Mario", lastName: "Rossi", attendance: 0 }, { id: 2, firstName: "Luigi", lastName: "Bianchi", attendance: 0 }]},
        { id: 2, name: "Fisica", students: [{ id: 3, firstName: "Anna", lastName: "Verdi", attendance: 0 }]}
    ]
};

function show(element, displayStyle = 'flex') { if (element) element.style.display = displayStyle; }
function hide(element) { if (element) element.style.display = 'none'; }

/* loading */
function loadClasses() {
    UI.classes.list.innerHTML = '';

    db.classes.forEach(cls => {
        const classCard = document.createElement('li');
        classCard.className = 'class-card';
        classCard.dataset.id = cls.id;

        const className = document.createElement('span');
        className.className = 'class-card-name';
        className.textContent = cls.name;

        const studentCount = document.createElement('span');
        studentCount.className = 'class-card-student-count';
        studentCount.textContent = `Students: ${cls.students.length}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'button delete-class-btn';
        deleteBtn.innerHTML = '&times;';

        classCard.appendChild(className);
        classCard.appendChild(studentCount);
        classCard.appendChild(deleteBtn);

        UI.classes.list.appendChild(classCard);
    });
}

function openClassDetail(classId){
    currentClassId = classId;
    const cls = db.classes.find(c => c.id === classId);
    UI.classDetail.title.textContent = cls.name;
    hide(UI.classes.container);
    show(UI.classDetail.container);
    hide(UI.headers.classesHeader);
    show(UI.headers.classHeader);
    UI.classDetail.title.dataset.classId = cls.id;
    loadStudentsTable(classId);
}

function loadStudentsTable(classId){
    const cls = db.classes.find(c => c.id === classId);
    if (!cls) return;

    const tbody = UI.classDetail.studentsPanel.table.querySelector('tbody');
    tbody.innerHTML = '';

    cls.students.forEach(student => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${student.id}</td>
            <td>${student.firstName}</td>
            <td>${student.lastName}</td>
            <td>${student.attendance}</td>
            <td>
                <button class="remove-student-btn button" data-student-id="${student.id}">×</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/* event listeners */
UI.classes.addBtn.onclick = async () => {
    show(UI.classes.addModal.overlay, 'flex');
    UI.classes.addModal.input.value = '';
};

UI.classes.addModal.closeBtn.onclick = () => {
    hide(UI.classes.addModal.overlay);
    UI.classes.addModal.input.value = '';
};

UI.classes.addModal.createBtn.onclick = () => {
    const className = UI.classes.addModal.input.value.trim();
    if (className === '') {
        launchAlert('Il nome della classe non può essere vuoto.');
        return;
    }
    const newClass = {
        id: db.classes.length > 0 ? Math.max(...db.classes.map(c => c.id)) + 1 : 1,
        name: className,
        students: []
    };
    db.classes.push(newClass);
    loadClasses();
    hide(UI.classes.addModal.overlay);
};
    
UI.classes.list.addEventListener('click', async (e) => {
    const card = e.target.closest('.class-card'); 
    if (!card) return;

    const classId = parseInt(card.dataset.id);

    if (e.target.classList.contains('delete-class-btn')) {
        const confirmed = await askConfirm(`Vuoi davvero eliminare la classe "${card.querySelector('.class-card-name').textContent}"?`);
        if (!confirmed) return;

        db.classes = db.classes.filter(c => c.id !== classId);
        loadClasses();
        return;
    }

    openClassDetail(classId);
});

UI.classDetail.studentsPanel.addBtn.onclick = async () => {
    show(UI.classDetail.studentsPanel.addModal.overlay, 'flex');
    UI.classDetail.studentsPanel.addModal.idInput.value = '';
    UI.classDetail.studentsPanel.addModal.firstNameInput.value = '';
    UI.classDetail.studentsPanel.addModal.lastNameInput.value = '';
}

UI.classDetail.studentsPanel.addModal.closeBtn.onclick = () => {
    hide(UI.classDetail.studentsPanel.addModal.overlay);
}

UI.classDetail.studentsPanel.addModal.createBtn.onclick = () => {
    const id = parseInt(UI.classDetail.studentsPanel.addModal.idInput.value.trim());
    const firstName = UI.classDetail.studentsPanel.addModal.firstNameInput.value.trim();
    const lastName = UI.classDetail.studentsPanel.addModal.lastNameInput.value.trim();
    if (isNaN(id) || firstName === '' || lastName === '') {
        launchAlert('Tutti i campi devono essere compilati correttamente.');
        return;
    }
    const classId = parseInt(UI.classDetail.title.dataset.classId);
    const cls = db.classes.find(c => c.id === classId);
    if (cls.students.some(s => s.id === id)) {
        launchAlert('Uno studente con questo ID è già presente nella classe.');
        return;
    }
    cls.students.push({ id, firstName, lastName, attendance: 0 });
    loadStudentsTable(classId);
    hide(UI.classDetail.studentsPanel.addModal.overlay);
};

UI.classDetail.studentsPanel.table.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-student-btn')) {
        const studentId = parseInt(e.target.dataset.studentId);
        const classId = parseInt(UI.classDetail.title.dataset.classId);
        const cls = db.classes.find(c => c.id === classId);
        const student = cls.students.find(s => s.id === studentId);
        const confirmed = await askConfirm(`Vuoi davvero rimuovere lo studente "${student.firstName} ${student.lastName}" dalla classe "${cls.name}"?`);
        if (!confirmed) return;
        cls.students = cls.students.filter(s => s.id !== studentId);
        loadStudentsTable(classId);
    }
});

UI.headers.classHeader.querySelector('#back-to-classes-btn').onclick = () => {
    currentClassId = null;
    hide(UI.classDetail.container);
    show(UI.classes.container);
    hide(UI.headers.classHeader);
    show(UI.headers.classesHeader);
}

UI.alerts.closeBtn.onclick = () => { hide(UI.alerts.container); UI.alerts.text.textContent = ''; };

/* alerts and confirms */
const launchAlert = (message) => { UI.alerts.text.textContent = message; show(UI.alerts.container, 'flex'); };

const askConfirm = (message) => new Promise(resolve => {
    UI.confirms.text.textContent = message;
    show(UI.confirms.container, 'flex');
    const cleanup = () => { hide(UI.confirms.container); UI.confirms.text.textContent=''; UI.confirms.yesBtn.onclick=null; UI.confirms.noBtn.onclick=null; };
    UI.confirms.yesBtn.onclick = () => { cleanup(); resolve(true); };
    UI.confirms.noBtn.onclick = () => { cleanup(); resolve(false); };
});

/* state */
let currentClassId = null;
let currentLessonId = null;

/* init */
loadClasses();
show(UI.headers.classesHeader);
show(UI.classes.container);