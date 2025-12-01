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
        titleInput: document.getElementById('chage-class-name-input'),
        backBtn: document.getElementById('back-to-classes-btn'),
        changeNameBtn: document.getElementById('change-class-name-btn'),
        switchDetailBtn: document.getElementById('switch-detail-btn'),
        studentsPanel: {
            container: document.getElementById('students-panel'),
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
            list: document.getElementById('lessons-list'),

            addModal: {
                overlay: document.getElementById('add-lesson-modal-overlay'),
                dateInput: document.getElementById('lessonDateTime'),
                createBtn: document.getElementById('create-lesson-btn'),
                closeBtn: document.getElementById('close-add-lesson-modal-btn')
            }
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

function show(element, displayStyle = 'flex') { if (element) element.style.display = displayStyle; }
function hide(element) { if (element) element.style.display = 'none'; }


/* LOADING */
function loadClasses(classes) {
    UI.classes.list.innerHTML = '';

    classes.forEach(cls => {
        const classCard = document.createElement('li');
        classCard.className = 'class-card card';
        classCard.dataset.id = cls.id;

        const className = document.createElement('span');
        className.className = 'class-card-name';
        className.textContent = cls.name;

        const studentCount = document.createElement('span');
        studentCount.className = 'class-card-student-count';
        studentCount.textContent = `${cls.student_count ?? 0} students`;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'class-card-buttons';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'button view-class-btn';
        viewBtn.innerHTML = `<img src="imgs/svg/arrowRight.svg" alt="View" />`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'button delete-class-btn';
        deleteBtn.innerHTML = `<img src="imgs/svg/trash.svg" alt="View" />`;

        btnContainer.appendChild(deleteBtn);
        btnContainer.appendChild(viewBtn);

        classCard.appendChild(className);
        classCard.appendChild(studentCount);
        classCard.appendChild(btnContainer);

        UI.classes.list.appendChild(classCard);
    });
}

function openClassDetail(classId, className){
    currentClassId = classId;
    UI.classDetail.title.textContent = className;
    UI.classDetail.title.dataset.classId = classId;
    hide(UI.classes.container);
    show(UI.classDetail.container);
    hide(UI.headers.classesHeader);
    show(UI.headers.classHeader);

    loadStudentsTable(classId);
}

async function loadStudentsTable(classId) {
    const students = await getStudents(classId);
    if (!students) return;

    const tbody = UI.classDetail.studentsPanel.table.querySelector('tbody');
    tbody.innerHTML = '';

    students.forEach(student => {
        const attendedCount = student.attendance_count || 0;
    
        const row = document.createElement('tr');
    
        row.innerHTML = `
            <td>${student.student_id}</td>
            <td>${student.first_name}</td>
            <td>${student.last_name}</td>
            <td>${attendedCount}</td>
            <td>
                <button class="remove-student-btn button" data-student-id="${student.student_id}">×</button>
            </td>
        `;
    
        tbody.appendChild(row);
    });
}

async function loadLessons(classId) {
    const lessons = await getLessons(classId);
    if (!lessons) return;

    const list = UI.classDetail.lessonsPanel.list;
    list.innerHTML = '';

    lessons.forEach(lesson => {
        const lessonDate = new Date(lesson.date);

        const formattedDateTime = lessonDate.toLocaleTimeString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const li = document.createElement('li');
        li.className = "lesson-card";
        li.dataset.id = lesson.id;

        const lessonText = document.createElement('span');
        lessonText.textContent = `Lesson on ${formattedDateTime}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'button delete-lesson-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            
            const confirmed = await askConfirm(`Are you sure you want to delete the lesson on ${formattedDateTime}?`);
            if (!confirmed) return;

            const success = await deleteLesson(lesson.id);
            if (success) {
                loadLessons(classId);
            } else {
                launchAlert('Error deleting the lesson.');
            }
        };

        li.appendChild(lessonText);
        li.appendChild(deleteBtn);
        list.appendChild(li);
    });
}

async function loadAttendanceTable(classId, lessonId) {
    try {
        const res = await fetch(`http://localhost:3000/lessons/${lessonId}/attendance`);
        if (!res.ok) throw new Error("Error fetch attendance");

        const students = await res.json();
        const tbody = UI.lessonDetail.attendanceTable.querySelector('tbody');
        tbody.innerHTML = '';

        students.forEach(student => {
            const checked = student.is_present ? "checked" : "";

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.student_id}</td>
                <td>${student.first_name}</td>
                <td>${student.last_name}</td>
                <td>
                    <input 
                        type="checkbox"
                        class="attendance-checkbox"
                        data-student-id="${student.student_id}"
                        data-lesson-id="${lessonId}"
                        ${checked}
                    >
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        launchAlert("Error loading attendance table");
    }
}

async function openLessonDetail(classId, lessonId) {
    currentLessonId = lessonId;

    const lessons = await getLessons(classId);
    const lesson = lessons.find(l => l.id === lessonId);

    UI.lessonDetail.title.textContent = `Lezione del ${lesson.date.replace('T', ' ')}`;

    hide(UI.classDetail.container);
    show(UI.lessonDetail.container);
    hide(UI.headers.classHeader);
    show(UI.headers.lessonHeader);

    loadAttendanceTable(classId, lessonId);
}

/* EVENT LISTENERS */

// classes 
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
        launchAlert('Class name cannot be empty.');
        return;
    }
    createClass(className);
    getClasses();
    hide(UI.classes.addModal.overlay);
};
    
UI.classes.list.addEventListener('click', async (e) => {
    const card = e.target.closest('.class-card');
    if (!card) return;

    const classId = parseInt(card.dataset.id);

    const deleteBtn = e.target.closest('.delete-class-btn');
    if (deleteBtn) {
        const className = card.querySelector('.class-card-name').textContent;
        const confirmed = await askConfirm(`Are you sure you want to delete class "${className}"?`);
        if (!confirmed) return;
        deleteClass(classId);
        return;
    }

    const viewBtn = e.target.closest('.view-class-btn');
    if (viewBtn) {
        const className = card.querySelector('.class-card-name').textContent;
        openClassDetail(classId, className);
        return;
    }
});

// class detail - header
UI.headers.classHeader.querySelector('#back-to-classes-btn').onclick = () => {
    currentClassId = null;
    hide(UI.classDetail.container);
    show(UI.classes.container);
    hide(UI.headers.classHeader);
    show(UI.headers.classesHeader);
    getClasses();
}

UI.classDetail.changeNameBtn.onclick = () => {
    UI.classDetail.titleInput.value = UI.classDetail.title.textContent;
    UI.classDetail.titleInput.style.width = (UI.classDetail.title.textContent.length + 1) + 'ch';
    show(UI.classDetail.titleInput);
    hide(UI.classDetail.title);
    hide(UI.classDetail.changeNameBtn);
    UI.classDetail.titleInput.focus();
}

async function saveClassName() {
    const newName = UI.classDetail.titleInput.value.trim();
    if (newName !== '') {
        const classId = parseInt(UI.classDetail.title.dataset.classId);
        const updated = await updateClassName(classId, newName);
        if (updated) {
            UI.classDetail.title.textContent = updated.name;
        }
    }

    hide(UI.classDetail.titleInput);
    show(UI.classDetail.title);
    show(UI.classDetail.changeNameBtn);
}

UI.classDetail.titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveClassName();
});

UI.classDetail.titleInput.addEventListener('blur', saveClassName);

UI.classDetail.switchDetailBtn.onclick = () => {
    const btn = UI.classDetail.switchDetailBtn;
    const text = btn.querySelector('span');
    const studentsContainer = UI.classDetail.studentsPanel.container;
    const lessonsContainer = UI.classDetail.lessonsPanel.container;

    if (studentsContainer.style.display !== 'none') {
        hide(studentsContainer);
        show(lessonsContainer);
        btn.classList.add('active');
        text.textContent = 'Lessons';
        loadLessons(currentClassId);
    } else {
        show(studentsContainer);
        hide(lessonsContainer);
        btn.classList.remove('active');
        text.textContent = 'Students';
        loadStudentsTable(currentClassId);
    }
};

// class detail - students panel
UI.classDetail.studentsPanel.addBtn.onclick = async () => {
    show(UI.classDetail.studentsPanel.addModal.overlay, 'flex');
    UI.classDetail.studentsPanel.addModal.idInput.value = '';
    UI.classDetail.studentsPanel.addModal.firstNameInput.value = '';
    UI.classDetail.studentsPanel.addModal.lastNameInput.value = '';
}

UI.classDetail.studentsPanel.addModal.closeBtn.onclick = () => {
    hide(UI.classDetail.studentsPanel.addModal.overlay);
}

let createStudentLocked = false;

UI.classDetail.studentsPanel.addModal.createBtn.onclick = async () => {
    if (createStudentLocked) return;
    createStudentLocked = true;
    const id = UI.classDetail.studentsPanel.addModal.idInput.value.trim();
    const firstName = UI.classDetail.studentsPanel.addModal.firstNameInput.value.trim();
    const lastName = UI.classDetail.studentsPanel.addModal.lastNameInput.value.trim();

    if (id === '' || firstName === '' || lastName === '') {
        launchAlert('All fields must be filled correctly.');
        createStudentLocked = false;
        return;
    }

    const classId = parseInt(UI.classDetail.title.dataset.classId);

    const created = await createStudent(classId, id, firstName, lastName);
    if (!created) {
        launchAlert("Errore loading the student.");
        createStudentLocked = false;
        return;
    }

    await loadStudentsTable(classId);
    hide(UI.classDetail.studentsPanel.addModal.overlay);
    createStudentLocked = false;
};

UI.classDetail.studentsPanel.table.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('remove-student-btn')) return;

    const btn = e.target;
    btn.disabled = true;

    const studentId = btn.dataset.studentId;
    const classId = parseInt(UI.classDetail.title.dataset.classId);

    const confirmed = await askConfirm("Are you sure you want to remove this student?");
    if (!confirmed) {
        btn.disabled = false;
        return;
    }

    const ok = await deleteStudent(classId, studentId);
    if (!ok) {
        launchAlert("Errore deleting the student.");
        btn.disabled = false;
        return;
    }

    loadStudentsTable(classId);
});

let pendingInterval = null;

UI.classDetail.studentsPanel.qrBtn.onclick = async () => {
    const classId = parseInt(UI.classDetail.title.dataset.classId);

    const data = await fetch('/server-ip').then(r => r.json());
    const ip = data.server_ip;

    const qrData = `http://${ip}:3000/registration.html?class=${classId}`;

    UI.classDetail.studentsPanel.qrCode.innerHTML = '';
    new QRCode(UI.classDetail.studentsPanel.qrCode, {
        text: qrData,
        width: 200,
        height: 200
    });

    const tbody = UI.classDetail.studentsPanel.qrTable.querySelector('tbody');

    async function updatePendingStudents() {
        const students = await fetch(`/classes/${classId}/pending-students`).then(r => r.json());
        tbody.innerHTML = '';

        students.forEach(s => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${s.student_id || ""}</td>
                <td>${s.first_name}</td>
                <td>${s.last_name}</td>
                <td><button class="delete-btn button no-bg" data-id="${s.id}"> <img src="imgs/svg/trash.svg" style="color: white;"> </button></td>
            `;
            tbody.appendChild(row);
        });

        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener("click", async () => {
                await fetch(`/pending-students/${btn.dataset.id}`, { method: "DELETE" });
                updatePendingStudents();
            });
        });
    }

    pendingInterval = setInterval(updatePendingStudents, 1000);
    updatePendingStudents();

    show(UI.classDetail.studentsPanel.qrModal, "flex");

    UI.classDetail.studentsPanel.addToClassBtn.onclick = async () => {
        await fetch(`/classes/${classId}/accept-pending-students`, { method: 'POST' });
        updatePendingStudents();
        loadStudentsTable(currentClassId);
    };
};

UI.classDetail.studentsPanel.closeQrBtn.onclick = () => {
    hide(UI.classDetail.studentsPanel.qrModal);
    clearInterval(pendingInterval);
};

// class detail - lessons panel
UI.classDetail.lessonsPanel.addBtn.onclick = () => {
    show(UI.classDetail.lessonsPanel.addModal.overlay, 'flex');

    const now = new Date();
    UI.classDetail.lessonsPanel.addModal.dateInput.value =
        now.toISOString().slice(0, 16);
};

UI.classDetail.lessonsPanel.addModal.createBtn.onclick = async () => {
    const classId = parseInt(UI.classDetail.title.dataset.classId);
    const dateTime = UI.classDetail.lessonsPanel.addModal.dateInput.value;

    if (!dateTime) {
        launchAlert("Please enter a valid date.");
        return;
    }

    const lesson = await createLesson(classId, dateTime);
    if (!lesson) {
        launchAlert("Error creating lesson.");
        return;
    }

    loadLessons(classId);
    hide(UI.classDetail.lessonsPanel.addModal.overlay);
};

UI.classDetail.lessonsPanel.addModal.closeBtn.onclick = () => {
    hide(UI.classDetail.lessonsPanel.addModal.overlay);
}

UI.classDetail.lessonsPanel.list.addEventListener('click', (e) => {
    const lessonCard = e.target.closest('.lesson-card');
    if (!lessonCard) return;

    const lessonId = parseInt(lessonCard.dataset.id);
    openLessonDetail(currentClassId, lessonId);
});

// lesson detail - header
UI.lessonDetail.backBtn.onclick = () => {
    currentLessonId = null;
    hide(UI.lessonDetail.container);
    show(UI.classDetail.container);
    hide(UI.headers.lessonHeader);
    show(UI.headers.classHeader);
    loadLessons(currentClassId);
}

// lesson detail - table
UI.lessonDetail.attendanceTable.addEventListener('change', async (e) => {
    if (!e.target.classList.contains('attendance-checkbox')) return;

    const studentId = e.target.dataset.studentId;
    const lessonId = e.target.dataset.lessonId;
    const is_present = e.target.checked ? 1 : 0;

    updateAttendance(lessonId, studentId, is_present);
});

// lesson detail - qr modal
let lessonQrInterval; 

UI.lessonDetail.qrBtn.onclick = async () => {
    const classId = currentClassId;
    const lessonId = currentLessonId;

    async function generateQR() {
        if (lessonQrInterval) {
            clearInterval(lessonQrInterval);
            lessonQrInterval = null;
        }

        try {
            const data = await fetch(`/lessons/${lessonId}/token`, { method: 'POST' }).then(r => r.json());
            const ip = data.server_ip;
            const token = data.token;
            const qrUrl = `http://${ip}:3000/?class=${classId}&lesson=${lessonId}&token=${token}`;

            UI.lessonDetail.qrModal.token.textContent = token;
            UI.lessonDetail.qrModal.code.innerHTML = '';

            new QRCode(UI.lessonDetail.qrModal.code, {
                text: qrUrl,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            let countdown = 60;
            UI.lessonDetail.qrModal.timer.textContent = `Time remaining: ${countdown}s`;

            lessonQrInterval = setInterval(async () => {
                countdown--;
                UI.lessonDetail.qrModal.timer.textContent = `Time remaining: ${countdown}s`;

                if (countdown <= 0) {
                    clearInterval(lessonQrInterval);
                    await generateQR();
                }
            }, 1000);

        } catch (error) {
            console.error("Errore generazione QR:", error);
            UI.lessonDetail.qrModal.timer.textContent = "Errore di connessione...";
        }
    }

    await generateQR();
    show(UI.lessonDetail.qrModal.overlay, 'flex');
};

UI.lessonDetail.qrModal.closeBtn.onclick = async () => {
    hide(UI.lessonDetail.qrModal.overlay);
    if (lessonQrInterval) {
        clearInterval(lessonQrInterval);
        lessonQrInterval = null;
    }
    loadAttendanceTable(currentClassId, currentLessonId);
    await fetch(`/lessons/${currentLessonId}/token`, { method: 'DELETE' });
};

/* ALERTS & CONFIRMS */
const launchAlert = (message) => { UI.alerts.text.textContent = message; show(UI.alerts.container, 'flex'); };

const askConfirm = (message) => new Promise(resolve => {
    UI.confirms.text.textContent = message;
    show(UI.confirms.container, 'flex');
    const cleanup = () => { hide(UI.confirms.container); UI.confirms.text.textContent=''; UI.confirms.yesBtn.onclick=null; UI.confirms.noBtn.onclick=null; };
    UI.confirms.yesBtn.onclick = () => { cleanup(); resolve(true); };
    UI.confirms.noBtn.onclick = () => { cleanup(); resolve(false); };
});

UI.alerts.closeBtn.onclick = () => { hide(UI.alerts.container); UI.alerts.text.textContent = ''; };

/* STATE */
let currentClassId = null;
let currentLessonId = null;

/* FETCH */
async function getClasses(){ 
    try {
        const res = await fetch('http://localhost:3000/classes-with-student-count');
        if(!res.ok) throw new Error();
        const data = await res.json();
        loadClasses(data);
    } catch(err) {
        launchAlert("error loading classes");
    }
}

async function createClass(className){
    try{
        const res = await fetch('http://localhost:3000/classes',{ 
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({name: className}) 
        });
        if(!res.ok) throw new Error();
        getClasses(); 
    }catch(err){
        console.error(err);
        launchAlert('Error creating class');
    }
}

async function deleteClass(classId) {
    try {
        const res = await fetch(`http://localhost:3000/classes/${classId}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error();
        await getClasses();

    } catch (err) {
        console.error(err);
        launchAlert('Error deleting class');
    }
}

async function getStudents(classId){
    try{
        const res = await fetch(`http://localhost:3000/classes/${classId}/students-with-attendance`);
        if(!res.ok) throw new Error("Errore nel fetch degli studenti");

        return await res.json();
    }catch(err){
        console.error(err);
        return null;
    }
}

async function createStudent(classId, studentId, firstName, lastName) {
    try {
        const res = await fetch(`http://localhost:3000/classes/${classId}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId.toString(),
                first_name: firstName,
                last_name: lastName
            })
        });

        if (!res.ok) throw new Error();

        return await res.json();
    } catch (err) {
        console.error("createStudent error:", err);
        return null;
    }
}

async function deleteStudent(classId, studentId) {
    try {
        const res = await fetch(`http://localhost:3000/students/${studentId}/${classId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error();
        await loadStudentsTable(classId);
        return true;
    } catch (err) {
        console.error(err);
        launchAlert("Error deleating student.");
        return false;
    }
}

async function getLessons(classId){
    try {
        const res = await fetch(`http://localhost:3000/classes/${classId}/lessons`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch(err){
        console.error("getLessons error:", err);
        return null;
    }
}

async function createLesson(classId, date){
    try {
        const res = await fetch(`http://localhost:3000/classes/${classId}/lessons`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ date })
        });
        if (!res.ok) throw new Error();
        return await res.json();
    } catch(err){
        console.error("createLesson error:", err);
        return null;
    }
}

async function deleteLesson(lessonId){
    try {
        const res = await fetch(`http://localhost:3000/lessons/${lessonId}`, {
            method:'DELETE'
        });
        if (!res.ok) throw new Error();
        return true;
    } catch(err){
        console.error("deleteLesson error:", err);
        return false;
    }
}

async function updateAttendance(lessonId, studentId, isPresent) {
    try {
        const res = await fetch(`http://localhost:3000/attendance/${lessonId}/${studentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_present: isPresent ? 1 : 0 })
        });

        if (!res.ok) throw new Error();

        return true;
    } catch (err) {
        console.error("updateAttendance error:", err);
        return false;
    }
}

async function updateClassName(classId, newName) {
    try {
        const res = await fetch(`http://localhost:3000/classes/${classId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (err) {
        console.error("updateClassName error:", err);
        return null;
    }
}

/* SHORTCUTS */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hide(UI.classes.addModal.overlay);
        hide(UI.classDetail.studentsPanel.addModal.overlay);
        hide(UI.classDetail.studentsPanel.qrModal);
        hide(UI.classDetail.lessonsPanel.addModal.overlay);
        hide(UI.lessonDetail.qrModal.overlay);
    }
});

const addModal = UI.classDetail.studentsPanel.addModal;

const studentInputs = [
    addModal.idInput,
    addModal.firstNameInput,
    addModal.lastNameInput
];

studentInputs.forEach((input, index) => {
    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;

        e.preventDefault();

        const isLast = index === studentInputs.length - 1;

        if (!isLast) {
            studentInputs[index + 1].focus();
        } else {
            addModal.createBtn.click();
        }
    });
});

UI.classes.addModal.input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        UI.classes.addModal.createBtn.click();
    }
});

{
    const addModal = UI.classDetail.studentsPanel.addModal;

    const studentInputs = [
        addModal.idInput,
        addModal.firstNameInput,
        addModal.lastNameInput
    ];

    studentInputs.forEach((input, index) => {
        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            const isLast = index === studentInputs.length - 1;

            if (!isLast) {
                studentInputs[index + 1].focus();
            } else {
                addModal.createBtn.click();
            }
        });
    });
}

UI.classDetail.lessonsPanel.addModal.dateInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        UI.classDetail.lessonsPanel.addModal.createBtn.click();
    }
});

/* INIT */
getClasses();
show(UI.headers.classesHeader);
show(UI.classes.container);