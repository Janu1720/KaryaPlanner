// 1. Security Check
const currentUserEmail = localStorage.getItem('userEmail');
if (!currentUserEmail) window.location.href = 'index.html';

// 2. Theme Toggle Logic
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'dark');
    });
}

// 3. Format Date
function formatDate(isoString) {
    if (!isoString || isoString === 'null' || isoString === 'undefined') return "N/A";
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 4. Fetch & Render Completed Tasks
async function loadArchive() {
    try {
        const response = await fetch(`/api/tasks/archive?email=${currentUserEmail}`);
        if (response.ok) {
            const tasks = await response.json();
            renderArchive(tasks);
        }
    } catch (error) { console.error("Network error:", error); }
}

function renderArchive(tasks) {
    const list = document.getElementById('archiveTaskList');
    list.innerHTML = '';

    if (tasks.length === 0) {
        // Break out of the grid layout if it's empty to center the message properly
        list.style.display = "block";
        list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 40px;">Your archive is empty. Time to get to work!</div>`;
        return;
    } else {
        list.style.display = "grid"; // Re-enable grid if tasks exist
    }

    // Sort by completion date (newest first)
    tasks.sort((a, b) => {
        const dateA = a.completedOn || a.completed_on || a.createdAt;
        const dateB = b.completedOn || b.completed_on || b.createdAt;
        return new Date(dateB) - new Date(dateA);
    });

    tasks.forEach(task => {
        const card = document.createElement('div');
        // Grayed out styling for completed tasks
        card.className = `task-card neo-in`;
        card.style.opacity = "0.7";
        card.style.borderLeft = "4px solid var(--text-muted)";
        
        const completedDate = task.completedOn || task.completed_on || task.createdAt;

        // Note: Removed the line-through inline style on the span
        card.innerHTML = `
            <div class="menu-container">
                <button class="menu-btn" style="color: #e74c3c; font-size: 1.5rem;" onclick="deleteArchivedTask(${task.id})" title="Permanently Delete">×</button>
            </div>
            
            <div class="task-title-row">
                <span class="task-title">${task.name}</span>
            </div>
            
            <p class="ai-comment"><strong>AI Strategy:</strong> ${task.comment}</p>
            
            <div class="task-meta">
                <span>Completed on: ${formatDate(completedDate)}</span>
            </div>
        `;
        list.appendChild(card);
    });
}

// 5. Delete Archive Task
async function deleteArchivedTask(id) {
    if(confirm("Permanently delete this task from the archive?")) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        loadArchive(); 
    }
}

// Init
loadArchive();

// --- Sidebar Collapse Logic ---
const sidebar = document.getElementById('appSidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

if (toggleSidebarBtn && sidebar) {
    // Automatically collapse on mobile/tablet view
    if (window.innerWidth <= 900) {
        sidebar.classList.add('collapsed');
    }

    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}