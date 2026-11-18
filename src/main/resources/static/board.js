// 1. Security Check
const currentUserEmail = localStorage.getItem('userEmail');
const currentUsername = localStorage.getItem('username');
if (!currentUserEmail) window.location.href = 'index.html';

// 2. Setup the UI
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-US', options);

const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'dark');
    });
}
document.getElementById('addTaskBtn').addEventListener('click', () => window.location.href = 'braindump.html'); 

// --- Global State ---
let globalTasks = [];
let currentCalDate = new Date(); 
let activeSelectedDate = new Date(); 
let currentEditingTaskId = null; 
let currentEditingPriorityTaskId = null; 

// --- Dynamic Task Renderer ---
function formatDate(isoString) {
    if (!isoString || isoString === 'null' || isoString === 'undefined') return "N/A";
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    const postedDate = task.postedOn || task.posted_on || task.createdAt;
    const estDate = task.estimatedCompletionBy || task.estimated_completion_by || task.estimatedCompletion;

    let isUrgent = false;
    if (estDate && estDate !== 'null' && estDate !== 'undefined') {
        const timeDiff = new Date(estDate).getTime() - new Date().getTime();
        if (timeDiff <= 3600000) {
            isUrgent = true;
        }
    }

    const urgentClass = isUrgent ? 'urgent-task' : '';
    const urgentBadge = isUrgent ? '<span class="urgent-warning" style="color: #ff4757; font-weight: bold;">⚠️ URGENT</span>' : '';

    card.className = `task-card neo-out priority-${task.priority} ${urgentClass}`;
    card.innerHTML = `
        <div class="menu-container">
            <button class="menu-btn" onclick="toggleMenu(${task.id}, event)">⋮</button>
            <div class="menu-dropdown neo-out" id="menu-${task.id}">
                <button onclick="openPriorityModal(${task.id}, ${task.priority})">Change Priority</button>
                <button class="delete-task" onclick="deleteTask(${task.id})">Delete Task</button>
            </div>
        </div>
        
        <div class="task-title-row">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <input type="checkbox" class="task-checkbox neo-in" onchange="completeTask(${task.id})" title="Mark Complete">
                <span class="task-title">${task.name}</span>
            </div>
        </div>
        
        <p class="ai-comment"><strong>AI Strategy:</strong> ${task.comment}</p>
        
        <div class="task-footer">
            <span>Posted: ${formatDate(postedDate)}</span>
            ${urgentBadge}
            <span class="est-date">
                <img src="Target.png" class="meta-icon" alt="Target" style="margin-right: 4px;"> 
                ${formatDate(estDate)} 
                <button class="edit-btn" onclick="editEstimate(${task.id}, '${estDate}')" title="Edit Deadline">
                    <img src="EditPencil.png" class="meta-icon" alt="Edit">
                </button>
            </span>
        </div>
    `;
    return card;
}

function renderTasks(tasks) {
    const selectedList = document.getElementById('selectedTaskList');
    const activeList = document.getElementById('activeTaskList');
    selectedList.innerHTML = '';
    activeList.innerHTML = '';
    
    const pendingTasks = tasks.filter(t => !t.completed);
    pendingTasks.sort((a, b) => a.priority - b.priority);

    const selectedDateString = activeSelectedDate.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('selectedDateText').textContent = selectedDateString;

    const dayTasks = pendingTasks.filter(t => {
        const estDate = t.estimatedCompletionBy || t.estimated_completion_by || t.estimatedCompletion;
        if (!estDate || estDate === 'null' || estDate === 'undefined') return false;
        const taskDateString = new Date(estDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        return taskDateString === selectedDateString;
    });

    if (dayTasks.length === 0) {
        selectedList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px;">No tasks due on this date.</div>`;
    } else {
        dayTasks.forEach(task => selectedList.appendChild(createTaskCard(task)));
    }

    if (pendingTasks.length === 0) {
        activeList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px;">No active tasks on the board.</div>`;
    } else {
        pendingTasks.forEach(task => activeList.appendChild(createTaskCard(task)));
    }
}

// --- Action Menu Functions ---
function toggleMenu(id, event) {
    event.stopPropagation();
    document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
        if(dropdown.id !== `menu-${id}`) dropdown.classList.remove('show');
    });
    document.getElementById(`menu-${id}`).classList.toggle('show');
}

async function deleteTask(id) {
    if(confirm("Are you sure you want to delete this task?")) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        loadTasks(); 
    }
}

async function completeTask(id) {
    setTimeout(async () => {
        await fetch(`/api/tasks/${id}/complete`, { method: 'PUT' });
        loadTasks(); 
    }, 400);
}

// --- Priority Modal Functions ---
window.openPriorityModal = function(id, currentPriority) {
    currentEditingPriorityTaskId = id;
    document.getElementById('modalPriorityInput').value = currentPriority;
    document.getElementById('editPriorityModal').classList.remove('hidden');
};

window.closePriorityModal = function() {
    document.getElementById('editPriorityModal').classList.add('hidden');
    currentEditingPriorityTaskId = null;
};

document.getElementById('savePriorityBtn').addEventListener('click', async () => {
    if (!currentEditingPriorityTaskId) return;

    let newPriority = parseInt(document.getElementById('modalPriorityInput').value);

    try {
        await fetch(`/api/tasks/${currentEditingPriorityTaskId}/priority`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: newPriority })
        });
        closePriorityModal();
        loadTasks();
    } catch (e) {
        console.error("Failed to save priority", e);
    }
});

// --- Deadline Modal Functions ---
window.editEstimate = function(id, currentIso) {
    currentEditingTaskId = id;
    const modal = document.getElementById('editDeadlineModal');
    const dateInput = document.getElementById('modalDateInput');
    const timeInput = document.getElementById('modalTimeInput');

    const todayIso = new Date().toISOString().split('T')[0];
    dateInput.min = todayIso;

    if (currentIso && currentIso !== 'null' && currentIso !== 'undefined') {
        const dateObj = new Date(currentIso);
        const localYear = dateObj.getFullYear();
        const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const localDay = String(dateObj.getDate()).padStart(2, '0');
        dateInput.value = `${localYear}-${localMonth}-${localDay}`;
        
        const localHours = String(dateObj.getHours()).padStart(2, '0');
        const localMinutes = String(dateObj.getMinutes()).padStart(2, '0');
        timeInput.value = `${localHours}:${localMinutes}`;
    } else {
        dateInput.value = '';
        timeInput.value = '';
    }

    modal.classList.remove('hidden');
};

window.closeEditModal = function() {
    document.getElementById('editDeadlineModal').classList.add('hidden');
    currentEditingTaskId = null;
};

document.getElementById('saveDeadlineBtn').addEventListener('click', async () => {
    if (!currentEditingTaskId) return;

    const dateVal = document.getElementById('modalDateInput').value;
    const timeVal = document.getElementById('modalTimeInput').value;

    if (!dateVal || !timeVal) {
        alert("Please select both a date and a time.");
        return;
    }

    const combinedIso = `${dateVal}T${timeVal}:00`;
    const selectedDateTime = new Date(combinedIso);
    const now = new Date();

    if (selectedDateTime < now) {
        alert("You cannot schedule a task for a past date or time.");
        return;
    }

    try {
        const response = await fetch(`/api/tasks/${currentEditingTaskId}/estimate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estimatedCompletion: combinedIso })
        });
        
        if (response.ok) {
            closeEditModal();
            loadTasks(); 
        } else {
            alert("Server failed to save the date");
        }
    } catch (e) {
        console.error("Network error", e);
    }
});

document.addEventListener('click', () => {
    document.querySelectorAll('.menu-dropdown').forEach(menu => menu.classList.remove('show'));
});

// --- Fetch Data ---
async function loadTasks() {
    try {
        const response = await fetch(`/api/tasks?email=${currentUserEmail}`);
        if (response.ok) {
            globalTasks = await response.json();
            renderTasks(globalTasks);
        }
    } catch (error) { console.error("Network error:", error); }
}

// --- Neumorphic Calendar Generator with Navigation ---
function renderCalendar() {
    const calSection = document.querySelector('.calendar-section');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    let calHTML = `
        <div class="calendar-controls">
            <div class="cal-nav-group">
                <button class="cal-btn" onclick="changeYear(-1)" title="Previous Year">«</button>
                <button class="cal-btn" onclick="changeMonth(-1)" title="Previous Month">‹</button>
            </div>
            <span>${monthNames[month]} ${year}</span>
            <div class="cal-nav-group">
                <button class="cal-btn" onclick="changeMonth(1)" title="Next Month">›</button>
                <button class="cal-btn" onclick="changeYear(1)" title="Next Year">»</button>
            </div>
        </div>
        <div class="calendar-grid neo-in" style="padding: 15px;">
            <div class="cal-day-header">Su</div><div class="cal-day-header">Mo</div><div class="cal-day-header">Tu</div>
            <div class="cal-day-header">We</div><div class="cal-day-header">Th</div><div class="cal-day-header">Fr</div><div class="cal-day-header">Sa</div>
    `;

    for (let i = 0; i < firstDay; i++) { calHTML += `<div class="cal-day dimmed">0</div>`; }
    
    for (let i = 1; i <= daysInMonth; i++) {
        let isSelected = (i === activeSelectedDate.getDate() && month === activeSelectedDate.getMonth() && year === activeSelectedDate.getFullYear());
        let activeClass = isSelected ? 'active-day neo-out' : '';
        calHTML += `<div class="cal-day ${activeClass}" onclick="selectDate(${year}, ${month}, ${i})">${i}</div>`;
    }
    calHTML += `</div>`;
    
    calSection.innerHTML = `<h3>Calendar</h3>` + calHTML;
}

window.changeMonth = function(offset) {
    currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    renderCalendar();
};
window.changeYear = function(offset) {
    currentCalDate.setFullYear(currentCalDate.getFullYear() + offset);
    renderCalendar();
};
window.selectDate = function(year, month, day) {
    activeSelectedDate = new Date(year, month, day);
    renderCalendar(); 
    renderTasks(globalTasks); 
};

renderCalendar();
loadTasks();

// --- Sidebar Collapse Logic ---
const sidebar = document.getElementById('appSidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

if (sidebar) {
    if (window.innerWidth <= 900) {
        sidebar.classList.add('collapsed');
    }
    
    if (toggleSidebarBtn) {
        toggleSidebarBtn.removeAttribute('onclick'); 
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}