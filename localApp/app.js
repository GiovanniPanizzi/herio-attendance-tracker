// --- DOM References ---
const classesGrid = document.getElementById('classesGrid');
const addClassBtn = document.getElementById('addClassBtn');
const classCreationModalOverlay = document.getElementById('modalOverlay'); 
const newClassNameInput = document.getElementById('newClassName');
const createClassBtn = document.getElementById('createClassBtn');

const classDetail = document.getElementById('classDetail');
const classNameEl = document.getElementById('className');
const backToClassesBtn = document.getElementById('backToClasses');

const alertBox = document.getElementById('alert-message-container');
const alertText = document.getElementById('alertText');
const closeAlertBtn = document.getElementById('closeAlertBtn');

const confirmBox = document.getElementById('confirm-message-container');
const confirmText = document.getElementById('confirmText');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

// Subview references
const studentsViewBtn = document.getElementById('studentsViewBtn');
const lessonsViewBtn = document.getElementById('lessonsViewBtn');
const studentsView = document.getElementById('studentsView'); 
const lessonsView = document.getElementById('lessonsView'); 
const backToClassBtns = document.querySelectorAll('.backToClass'); 

const addStudentBtn = document.getElementById('addStudentBtn');
const studentList = document.getElementById('studentList');

const studentModalOverlay = document.getElementById('studentModalOverlay'); 
const studentIdInput = document.getElementById('studentIdInput'); 
const studentNameInput = document.getElementById('studentName');
const studentSurnameInput = document.getElementById('studentSurname');
const createStudentBtn = document.getElementById('createStudentBtn');

const lessonsList = document.getElementById('lessonsList');
const createLessonBtn = document.getElementById('createLessonBtn');
const lessonModalOverlay = document.getElementById('lessonModalOverlay'); 
const lessonDateTimeInput = document.getElementById('lessonDateTime');
const confirmLessonBtn = document.getElementById('confirmLessonBtn');

const attendanceModalOverlay = document.getElementById('attendanceModalOverlay'); 
const attendanceModal = document.getElementById('attendanceModal');
const attendanceList = document.getElementById('attendanceList');
const attendanceClassName = document.getElementById('attendanceTitle');
const closeAttendanceBtn = document.getElementById('closeAttendanceBtn');

const scanQRBtn = document.getElementById('scanQRBtn');
const qrTokenOverlay = document.getElementById('qrTokenOverlay'); 
const closeQRBtn = document.getElementById('closeQRBtn');
const qrTokenElement = document.getElementById('qrToken');
const qrStatusElement = document.getElementById('qrStatus');
const qrCodeElement = document.getElementById('qrCode');
const qrTimerEl = document.getElementById('qrTimer');


let currentClassId = null;
let currentLessonId = null; 

const classCards = new Map();
let qrInterval = null;
let countdownInterval = null;
let lastViewBeforeAttendance = null;

// --- View Control Functions (Display Only) ---

/** Sets the main view (classes grid) */
function showClassesGrid() {
    classesGrid.style.display = 'grid';
    addClassBtn.style.display = 'inline-block';
    classDetail.style.display = 'none';
    attendanceModalOverlay.style.display = 'none';
    qrTokenOverlay.style.display = 'none';
    currentClassId = null;
}

/** Hides all subviews, shows only the Students/Lessons buttons */
function showClassDetailMain() {
    studentsView.style.display = 'none';
    lessonsView.style.display = 'none'; 

    studentsViewBtn.style.display = 'inline-block';
    lessonsViewBtn.style.display = 'inline-block'; 

    backToClassBtns.forEach(btn => btn.style.display = 'none');

    backToClassesBtn.style.display = 'inline-block';
}

/** Opens the students view. */
function showStudentsView() {
    studentsView.style.display = 'block';
    lessonsView.style.display = 'none'; 

    studentsViewBtn.style.display = 'none'; 
    lessonsViewBtn.style.display = 'none'; 

    document.querySelector('#studentsView .backToClass').style.display = 'inline-block';
}

/** Opens the lessons view. */
function showLessonsView() { 
    studentsView.style.display = 'none';
    lessonsView.style.display = 'block'; 

    studentsViewBtn.style.display = 'none'; 
    lessonsViewBtn.style.display = 'none'; 

    document.querySelector('#lessonsView .backToClass').style.display = 'inline-block';
}


/** Opens the class detail view */
function openClassDetail(classId, className) { 
    currentClassId = classId;
    classesGrid.style.display = 'none';
    addClassBtn.style.display = 'none';
    classDetail.style.display = 'block';
    classNameEl.textContent = className;

    showClassDetailMain(); 

    fetchStudents(classId);
    fetchLessons(classId);
}

function closeClassDetail(){
    classDetail.style.display='none';
    showClassesGrid(); 
}

// --- Classes (CRUD) ---

function createClassCard(classe){
    const div = document.createElement('div');
    div.classList.add('class-card');

    const nameEl = document.createElement('h3');
    nameEl.textContent = classe.name;
    div.appendChild(nameEl);

    const badge = document.createElement('span');
    badge.classList.add('badge');
    badge.textContent = `${classe.student_count || 0} students`;
    div.appendChild(badge);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✖';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.style.position = 'absolute'; 
    deleteBtn.style.left = '8px';
    deleteBtn.style.bottom = '8px';
    
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        const confirm = await askConfirm(`Are you sure you want to delete the class "${classe.name}"? This will also remove all associated students, lessons, and attendance records.`);
        if(!confirm) return;
        try{
            const res = await fetch(`http://localhost:3000/classes/${classe.id}`, {method:'DELETE'}); 
            if(!res.ok) throw new Error();
            fetchClasses();
        }catch(err){
            console.error(err);
            launchAlert('Error deleting class');
        }
    };
    div.appendChild(deleteBtn);

    div.onclick = () => openClassDetail(classe.id, classe.name);
    classCards.set(classe.id, div);
    return div;
}

function loadClasses(classes){ 
    classesGrid.innerHTML = '';
    classesGrid.style.display = 'grid'; 
    classes.forEach(c => classesGrid.appendChild(createClassCard(c)));
}

async function fetchClasses(){ 
    try{
        const res = await fetch('http://localhost:3000/classes-with-student-count');
        if(!res.ok) throw new Error();
        const data = await res.json();
        loadClasses(data);
        addClassBtn.style.display = 'inline-block';
    }catch(err){
        console.error(err);
        classesGrid.textContent = 'Error loading classes';
    }
}

async function createClass(name){ 
    if(!name) return launchAlert('Please enter a valid name');
    try{
        const res = await fetch('http://localhost:3000/classes',{ 
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({name}) 
        });
        if(!res.ok) throw new Error();
        classCreationModalOverlay.style.display='none'; 
        fetchClasses(); 
    }catch(err){
        console.error(err);
        launchAlert('Error creating class');
    }
}

// --- Students (CRUD) ---
async function fetchStudents(classId){ 
    try{
        const res = await fetch(`http://localhost:3000/classes/${classId}/students-with-attendance`);
        if(!res.ok) throw new Error();

        const students = await res.json(); 
        loadStudentList(students);

        const card = classCards.get(classId);
        if(card){
            const badge = card.querySelector('.badge');
            badge.textContent = `${students.length} students`;
        }
    }catch(err){
        console.error(err);
        studentList.innerHTML = '<li>Error loading students</li>';
    }
}

function loadStudentList(students){ 
    studentList.innerHTML = '';
    students.sort((a, b) => a.last_name.localeCompare(b.last_name)); 

    students.forEach(s=>{
        const li = document.createElement('li');
        
        const attendanceCount = s.attendance_count !== undefined ? s.attendance_count : 0; 
        li.innerHTML = `
            ${s.student_id} - ${s.first_name} ${s.last_name} 
            <span class="presenze-count"> (Attendance: ${attendanceCount})</span>
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent='✖';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.onclick=async()=>{
            const confirm = await askConfirm(`Do you want to delete student "${s.first_name} ${s.last_name}"?`);
            if(!confirm) return;
            try{
                const res = await fetch(`http://localhost:3000/students/${s.student_id}/${currentClassId}`, { method:'DELETE' });
                if(!res.ok) throw new Error();
                fetchStudents(currentClassId); 
            }catch(err){
                console.error(err);
                launchAlert('Error deleting student');
            }
        };
        li.appendChild(deleteBtn);
        studentList.appendChild(li);
    });
}

async function createStudent(studentId, firstName, lastName) { 
    if (!studentId || !firstName || !lastName) {
        return launchAlert('Please enter all data: Student ID, First Name, and Last Name.');
    }

    if (!/^\d{6}$/.test(studentId)) {
        return launchAlert('Student ID must be exactly 6 numeric digits.');
    }

    const trimmedStudentId = studentId.trim(); 
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    try {
        const res = await fetch(`http://localhost:3000/classes/${currentClassId}/students`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: trimmedStudentId, first_name: trimmedFirstName, last_name: trimmedLastName }) 
        });

        if (res.status === 500) {
            const errorData = await res.json();
            if (errorData.error && errorData.error.includes('UNIQUE constraint failed')) {
                return launchAlert('Error: Student ID already exists in this class.');
            }
            throw new Error('Unknown server error.');
        }

        if (!res.ok) {throw new Error();}
        
        studentModalOverlay.style.display = 'none'; 
        fetchStudents(currentClassId); 
    } catch (err) {
        console.error(err);
        launchAlert('Error adding student. Check console for details.');
    }
}

// --- Lessons (CRUD) ---
async function fetchLessons(classId){ 
    try{
        const res = await fetch(`http://localhost:3000/classes/${classId}/lessons`);
        const lessons = await res.json(); 
        loadLessons(lessons); 
    }catch(err){
        console.error(err);
        lessonsList.innerHTML='<li>Error loading lessons</li>'; 
    }
}

function loadLessons(lessons){ 
    lessonsList.innerHTML=''; 
    lessons.sort((a, b) => new Date(b.date) - new Date(a.date)); 

    lessons.forEach(l=>{
        const li = document.createElement('li');

        const rawDate = l.date; 

        const dateObj = new Date(rawDate);

        const formattedDate = dateObj.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true 
        });

        li.textContent = `${formattedDate}`;

        const deleteBtn=document.createElement('button');
        deleteBtn.textContent='✖';

        deleteBtn.classList.add('delete-btn');
        deleteBtn.onclick=async()=>{
            const confirm = await askConfirm('Are you sure you want to delete this lesson? This will also remove all associated attendance records.');
            if(!confirm) return;
            try{
                const res=await fetch(`http://localhost:3000/lessons/${l.id}`,{method:'DELETE'}); 
                if(!res.ok) throw new Error();
                fetchLessons(currentClassId); 
            }catch(err){
                console.error(err);
                launchAlert('Error deleting lesson');
            }
        };
        li.appendChild(deleteBtn);

        li.onclick = (e)=>{
            if(e.target !== deleteBtn) openAttendance(l.id, classNameEl.textContent, formattedDate);
        };

        lessonsList.appendChild(li); 
    });
}

// --- Attendance (Manual and QR Management) ---

async function openAttendance(lessonId, className, formattedDate) { 
    lastViewBeforeAttendance = "lessons";
    currentLessonId = lessonId; 
    
    // View Management: Show the modal overlay
    classesGrid.style.display = 'none';
    classDetail.style.display = 'none';
    addClassBtn.style.display = 'none';
    attendanceModalOverlay.style.display = 'flex'; 

    attendanceClassName.textContent = `Attendance - ${className} (${formattedDate})`; 
    attendanceList.innerHTML = '<li>Loading attendance...</li>'; 

    try {
        // Attendance synchronization
        await fetch(`http://localhost:3000/lessons/${lessonId}/synchronize-attendance`, { method: 'POST' });

        const res = await fetch(`http://localhost:3000/lessons/${lessonId}/attendance`);
        if (!res.ok) throw new Error('Error loading attendance data');
        const students = await res.json(); 
        
        attendanceList.innerHTML = ''; 

        students.forEach(student => { 
            const li = document.createElement('li');
            li.textContent = `${student.first_name} ${student.last_name} (${student.student_id})`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = student.is_present === 1; 

            checkbox.onchange = async () => {
                try {
                    await fetch(`http://localhost:3000/attendance/${lessonId}/${student.student_id}`, { 
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_present: checkbox.checked ? 1 : 0 }) 
                    });
                    fetchStudents(currentClassId); 
                } catch (err) {
                    console.error("Attendance update error:", err); 
                    launchAlert("Error updating attendance."); 
                    checkbox.checked = !checkbox.checked; 
                }
            };

            li.appendChild(checkbox);
            attendanceList.appendChild(li);
        });
    } catch (err) {
        console.error(err);
        attendanceList.innerHTML = '<li>Error loading attendance</li>';
    }
}


closeAttendanceBtn.onclick = () => {
    attendanceModalOverlay.style.display = 'none';

    if (lastViewBeforeAttendance === "lessons") {
        // Torna alla vista lezioni
        classDetail.style.display = 'block';
        showLessonsView();
    } 
    else if (lastViewBeforeAttendance === "students") {
        classDetail.style.display = 'block';
        showStudentsView();
    } 
    else {
        // Default di sicurezza
        showClassesGrid();
    }
};

// --- QR Code Management (Dynamic Token) ---

const fetchTokenAndDisplayQR = async () => {
    try {
        const res = await fetch(`http://localhost:3000/lessons/${currentLessonId}/token`, { 
            method: 'POST'
        });

        if (!res.ok) throw new Error('Token generation error (API).'); 
        const data = await res.json();

        const ip = data.server_ip; 
        const token = data.token;
        
        // Interface Update
        qrTokenElement.textContent = token;
        qrStatusElement.textContent = `Connect to http://${ip}:3000`; 

        qrCodeElement.innerHTML = '';

        // Data to encode in QR
        const qrContent = `http://${ip}:3000/?token=${token}&lesson=${currentLessonId}`; 
        new QRCode(qrCodeElement, {
            text: qrContent,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        // Start Countdown (25 seconds)
        let countdown = 25;
        clearInterval(countdownInterval);
        
        countdownInterval = setInterval(() => {
            countdown--;
            if (countdown < 0) {
                countdown = 0; 
            }
            qrTimerEl.textContent = countdown + 's';

        }, 1000);

    } catch (e) {
        console.error(e);
        qrStatusElement.textContent = 'Error loading token. Check if the server is running.'; 
        qrTokenElement.textContent = '---';
        qrCodeElement.innerHTML = '';
        qrTimerEl.textContent = '--s';
        if (qrInterval) clearInterval(qrInterval);
        if (countdownInterval) clearInterval(countdownInterval);
    }
};

scanQRBtn.onclick = () => {
    if (!currentLessonId) { 
        launchAlert("Error: Lesson ID not available. Please open the attendance register for a lesson first."); 
        return;
    }

    // View Management: QR
    qrTokenOverlay.style.display = 'flex';
    
    qrStatusElement.textContent = 'Generating...'; 
    qrTokenElement.textContent = '---';
    qrCodeElement.innerHTML = '';

    // Clear previous intervals
    if (qrInterval) clearInterval(qrInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    // Start token generation and refresh interval
    fetchTokenAndDisplayQR();
    qrInterval = setInterval(fetchTokenAndDisplayQR, 25000); // Refresh every 25 seconds
};

closeQRBtn.onclick = async () => {
    // View Management: Close QR
    qrTokenOverlay.style.display = 'none';

    // Clear intervals
    if (qrInterval) clearInterval(qrInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    qrInterval = null;
    countdownInterval = null;

    try {
        // CORRECTED ENDPOINT: Using /token (singular)
        await fetch(`http://localhost:3000/lessons/${currentLessonId}/token`, { 
            method: 'DELETE'
        });
    } catch (err) {
        console.error("Error deleting token:", err); 
    }
};


// --- Main Event Handlers ---

// Class Grid Events
addClassBtn.onclick = () => {
    classCreationModalOverlay.style.display = 'flex'; 
    newClassNameInput.value = '';
    newClassNameInput.focus();
};
createClassBtn.onclick = () => createClass(newClassNameInput.value.trim()); 
classCreationModalOverlay.onclick = e => { if (e.target === classCreationModalOverlay) classCreationModalOverlay.style.display = 'none'; };


// Class Detail Navigation Events
backToClassesBtn.onclick = closeClassDetail; 

// Navigation between subviews
studentsViewBtn.onclick = showStudentsView;
lessonsViewBtn.onclick = showLessonsView; 
backToClassBtns.forEach(btn => {
    btn.onclick = showClassDetailMain;
});


// Student Events
addStudentBtn.onclick = () => {
    studentModalOverlay.style.display = 'flex'; 
    studentIdInput.value = ''; 
    studentNameInput.value = '';
    studentSurnameInput.value = '';
    studentIdInput.focus(); 
};
createStudentBtn.onclick = async () => {
    createStudentBtn.disabled = true;

    await createStudent(
        studentIdInput.value,
        studentNameInput.value,
        studentSurnameInput.value
    );

    createStudentBtn.disabled = false;
};

studentModalOverlay.onclick = e => { if (e.target === studentModalOverlay) studentModalOverlay.style.display = 'none'; };

// Lesson Events
createLessonBtn.onclick = () => {
    lessonModalOverlay.style.display = 'flex'; 
    const now = new Date();
    const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    lessonDateTimeInput.value = isoString;
    lessonDateTimeInput.focus();
};
confirmLessonBtn.onclick=async()=>{
    const dateTime=lessonDateTimeInput.value; 
    if(!dateTime) return launchAlert('Please enter date and time'); 
    try{
        const res=await fetch(`http://localhost:3000/classes/${currentClassId}/lessons`,{ 
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({date:dateTime}) 
        });
        if(!res.ok) throw new Error();
        lessonModalOverlay.style.display='none'; 
        fetchLessons(currentClassId); 
    }catch(err){
        console.error(err);
        launchAlert('Error creating lesson'); 
    }
};
lessonModalOverlay.onclick=e=>{if(e.target===lessonModalOverlay) lessonModalOverlay.style.display='none';};

// --- KEYBOARD SHORTCUTS ---

document.addEventListener('keydown', (e) => {
    const key = e.key;

    if (key === 'Escape') {

        // Class creation modal
        if (classCreationModalOverlay.style.display === 'flex') {
            classCreationModalOverlay.style.display = 'none';
        }

        // Student modal
        if (studentModalOverlay.style.display === 'flex') {
            studentModalOverlay.style.display = 'none';
        }

        // Lesson modal
        if (lessonModalOverlay.style.display === 'flex') {
            lessonModalOverlay.style.display = 'none';
        }

        // Attendance modal
        if (attendanceModalOverlay.style.display === 'flex') {
            attendanceModalOverlay.style.display = 'none';
        
            if (lastViewBeforeAttendance === "lessons") {
                classDetail.style.display = 'block';
                showLessonsView();
            } 
            else if (lastViewBeforeAttendance === "students") {
                classDetail.style.display = 'block';
                showStudentsView();
            } 
            else {
                showClassesGrid();
            }
        }

        // QR modal
        if (qrTokenOverlay.style.display === 'flex') {
            qrTokenOverlay.style.display = 'none';
            if (qrInterval) clearInterval(qrInterval);
            if (countdownInterval) clearInterval(countdownInterval);
        }
    }

    // ------------------------
    // ENTER → conferma modali
    // ------------------------
    if (key === 'Enter') {

        // CLASS creation
        if (classCreationModalOverlay.style.display === 'flex') {
            createClassBtn.click();
        }

        // STUDENT creation
        else if (studentModalOverlay.style.display === 'flex') {
            createStudentBtn.click();
        }

        // LESSON creation
        else if (lessonModalOverlay.style.display === 'flex') {
            confirmLessonBtn.click();
        }
    }
});

studentIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (studentIdInput.value.trim().length === 6) {
            studentNameInput.focus();
        } else {
            launchAlert("Student ID must be 6 digits.");
        }
    }
});

studentNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (studentNameInput.value.trim() !== "") {
            studentSurnameInput.focus();
        }
    }
});

studentSurnameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (studentSurnameInput.value.trim() !== "") {
            createStudentBtn.click();
        }
    }
});

/* ALERT MESSAGE */
closeAlertBtn.onclick = () => {
    alertBox.style.display = 'none';
    alertText.textContent = '';
};

const launchAlert = (message) => {
    alertText.textContent = message;
    alertBox.style.display = 'flex';
}

/* CONFIRM DIALOG */
const askConfirm = (message) => {
    return new Promise((resolve) => {
        confirmText.textContent = message;
        confirmBox.style.display = 'flex';

        const cleanup = () => {
            confirmBox.style.display = 'none';
            confirmText.textContent = '';
            confirmYesBtn.onclick = null;
            confirmNoBtn.onclick = null;
        };

        confirmYesBtn.onclick = () => {
            cleanup();
            resolve(true); 
        };

        confirmNoBtn.onclick = () => {
            cleanup();
            resolve(false); 
        };
    });
};

// --- Initialization ---
showClassesGrid();
fetchClasses();