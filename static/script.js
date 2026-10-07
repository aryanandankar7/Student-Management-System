const form = document.getElementById("studentForm");
const table = document.getElementById("studentTable");
const search = document.getElementById("search");
const message = document.getElementById("message");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const confirmModal = document.getElementById("confirmModal");
const modalCancel = document.getElementById("modalCancel");
const modalDelete = document.getElementById("modalDelete");

let students = [];
let deleteId = null;
let toastTimer;

function showToast(text, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.style.background = isError ? "#b53e3e" : "#172033";
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#c24141" : "#18794e";
    setTimeout(() => message.textContent = "", 3000);
}

async function fetchAllStudents() {
    const response = await fetch("/api/students");
    if (!response.ok) throw new Error("Unable to load students.");
    return await response.json();
}

async function loadStudents(query = "") {
    try {
        const all = await fetchAllStudents();
        updateStats(all);

        if (query.trim()) {
            const q = encodeURIComponent(query.trim());
            const response = await fetch(`/api/students/search?q=${q}`);
            if (!response.ok) throw new Error("Search failed.");
            students = await response.json();
        } else {
            students = all;
        }
        renderStudents(students);
    } catch (error) {
        showToast(error.message, true);
    }
}

function getInitials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function getGrade(marks) {
    if (marks >= 90) return "A+";
    if (marks >= 80) return "A";
    if (marks >= 70) return "B+";
    if (marks >= 60) return "B";
    if (marks >= 50) return "C";
    if (marks >= 40) return "D";
    return "F";
}

function renderStudents(data) {
    table.innerHTML = "";
    document.getElementById("emptyState").style.display = data.length ? "none" : "block";

    data.forEach(student => {
        const marks = Number(student.marks);
        const pass = marks >= 40;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="student-cell">
                    <div class="avatar">${escapeHtml(getInitials(student.name))}</div>
                    <div><div class="student-name">${escapeHtml(student.name)}</div><div class="student-sub">Student ID #${student.id}</div></div>
                </div>
            </td>
            <td><span class="roll-badge">${escapeHtml(student.roll_no)}</span></td>
            <td><span class="class-badge">${escapeHtml(student.student_class)}</span></td>
            <td>
                <div class="performance">
                    <div class="performance-top"><span>${marks}%</span><span>${getGrade(marks)}</span></div>
                    <div class="progress"><div class="progress-bar" style="width:${Math.min(Math.max(marks, 0), 100)}%"></div></div>
                </div>
            </td>
            <td>${escapeHtml(student.contact)}</td>
            <td><span class="status ${pass ? "pass" : "fail"}"><i></i>${pass ? "Pass" : "Fail"}</span></td>
            <td>
                <button class="action-btn edit" onclick="editStudent(${student.id})">Edit</button>
                <button class="action-btn delete" onclick="openDelete(${student.id})">Delete</button>
            </td>
        `;
        table.appendChild(row);
    });
}

function updateStats(data) {
    const total = data.length;
    const average = total ? data.reduce((sum, s) => sum + Number(s.marks), 0) / total : 0;
    const passing = data.filter(s => Number(s.marks) >= 40).length;
    const top = total ? data.reduce((best, s) => Number(s.marks) > Number(best.marks) ? s : best) : null;

    document.getElementById("totalStudents").textContent = total;
    document.getElementById("averageMarks").textContent = `${average.toFixed(1)}%`;
    document.getElementById("passingStudents").textContent = passing;
    document.getElementById("topPerformer").textContent = top ? top.name : "—";
    document.getElementById("topMarks").textContent = top ? `${Number(top.marks).toFixed(1)}% marks` : "Add students to see";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("studentId").value;
    const data = {
        name: document.getElementById("name").value.trim(),
        roll_no: document.getElementById("roll_no").value.trim(),
        student_class: document.getElementById("student_class").value.trim(),
        marks: document.getElementById("marks").value,
        contact: document.getElementById("contact").value.trim()
    };

    if (!data.name || !data.roll_no || !data.student_class || !data.marks || !data.contact) {
        showMessage("Please fill in all fields.", true);
        return;
    }

    const marks = Number(data.marks);
    if (marks < 0 || marks > 100) {
        showMessage("Marks must be between 0 and 100.", true);
        return;
    }
    if (!/^\d{10}$/.test(data.contact)) {
        showMessage("Contact number must contain exactly 10 digits.", true);
        return;
    }

    try {
        const response = await fetch(id ? `/api/students/${id}` : "/api/students", {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (!response.ok) {
            showMessage(result.error || "Something went wrong.", true);
            return;
        }

        showMessage(result.message);
        showToast(result.message);
        resetForm();
        await loadStudents(search.value);
        document.getElementById("students").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        showMessage("Server connection failed.", true);
    }
});

window.editStudent = function(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;

    document.getElementById("studentId").value = student.id;
    document.getElementById("name").value = student.name;
    document.getElementById("roll_no").value = student.roll_no;
    document.getElementById("student_class").value = student.student_class;
    document.getElementById("marks").value = student.marks;
    document.getElementById("contact").value = student.contact;

    formTitle.textContent = "Update Student";
    submitBtn.textContent = "Update Student";
    cancelBtn.classList.remove("hidden");
    document.getElementById("add").scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("name").focus();
};

window.openDelete = function(id) {
    deleteId = id;
    confirmModal.classList.remove("hidden");
};

modalCancel.addEventListener("click", () => {
    deleteId = null;
    confirmModal.classList.add("hidden");
});

modalDelete.addEventListener("click", async () => {
    if (!deleteId) return;
    try {
        const response = await fetch(`/api/students/${deleteId}`, { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) {
            showToast(result.error || "Delete failed.", true);
        } else {
            showToast(result.message);
            if (document.getElementById("studentId").value === String(deleteId)) resetForm();
            await loadStudents(search.value);
        }
    } catch (error) {
        showToast("Server connection failed.", true);
    }
    deleteId = null;
    confirmModal.classList.add("hidden");
});

confirmModal.addEventListener("click", event => {
    if (event.target === confirmModal) modalCancel.click();
});

cancelBtn.addEventListener("click", resetForm);

function resetForm() {
    form.reset();
    document.getElementById("studentId").value = "";
    formTitle.textContent = "Add Student";
    submitBtn.textContent = "Add Student";
    cancelBtn.classList.add("hidden");
};

search.addEventListener("input", () => loadStudents(search.value));
document.getElementById("refreshBtn").addEventListener("click", () => loadStudents(search.value));

document.getElementById("heroAddBtn").addEventListener("click", () => {
    resetForm();
    document.getElementById("add").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => document.getElementById("name").focus(), 450);
});
document.getElementById("emptyAddBtn").addEventListener("click", () => document.getElementById("heroAddBtn").click());

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

const themeBtn = document.getElementById("themeBtn");
if (localStorage.getItem("studenthub-theme") === "dark") document.body.classList.add("dark");
themeBtn.textContent = document.body.classList.contains("dark") ? "☀" : "☾";
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    localStorage.setItem("studenthub-theme", dark ? "dark" : "light");
    themeBtn.textContent = dark ? "☀" : "☾";
});

const sidebar = document.getElementById("sidebar");
document.getElementById("mobileMenu").addEventListener("click", () => sidebar.classList.toggle("open"));
document.querySelectorAll(".nav-item").forEach(item => item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    item.classList.add("active");
    sidebar.classList.remove("open");
}));

loadStudents();
