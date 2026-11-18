document.addEventListener('DOMContentLoaded', () => {

    // 1. Security Check
    const currentUserEmail = localStorage.getItem('userEmail');
    if (!currentUserEmail) {
        window.location.href = 'index.html';
        return;
    }

    // 1.5 Initialize Supabase to sync passwords
    const supabaseUrl = 'https://xciqxkgrvxybnhssulrb.supabase.co'; 
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaXF4a2dydnh5Ym5oc3N1bHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NTA1NjgsImV4cCI6MjExMDEyNjU2OH0.KRn44VDIoZA147Ry0tNmnTGmQQt4EIXnV8pu-hyOxPY';
    const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

    // 2. Theme Toggle Logic
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', 'dark');
        });
    }

    let selectedAvatarPath = 'avatar_01_female_smiling.png';

    // 3. Fetch Data Strictly From Database
    async function loadProfile() {
        const emailInput = document.getElementById('inputEmail');
        if (emailInput) emailInput.value = currentUserEmail;
        
        try {
            const response = await fetch(`/api/users/profile?email=${currentUserEmail}`);
            if(response.ok) {
                const userData = await response.json();
                
                const savedName = userData.name || '';
                const savedPosition = userData.position || '';
                const savedCompany = userData.company || '';
                const savedPersona = userData.persona || '';
                selectedAvatarPath = userData.avatarPath || 'avatar_01_female_smiling.png';

                // Populate Form Inputs safely
                if (document.getElementById('inputName')) document.getElementById('inputName').value = savedName;
                if (document.getElementById('inputPosition')) document.getElementById('inputPosition').value = savedPosition;
                if (document.getElementById('inputCompany')) document.getElementById('inputCompany').value = savedCompany;
                if (document.getElementById('inputPersona')) document.getElementById('inputPersona').value = savedPersona;

                // Highlight correct avatar in picker
                document.querySelectorAll('.avatar-option').forEach(img => {
                    if(img.getAttribute('src') === selectedAvatarPath) {
                        img.classList.remove('neo-out');
                        img.classList.add('neo-in', 'active-avatar');
                    } else {
                        img.classList.remove('neo-in', 'active-avatar');
                        img.classList.add('neo-out');
                    }
                });

                // Populate Live ID Card
                updateLiveCard(savedName, savedPosition, savedCompany, savedPersona, selectedAvatarPath);
            }
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    }

    // Format the ID card to gracefully handle empty DB fields
    function updateLiveCard(name, pos, comp, persona, avatarUrl) {
        if (document.getElementById('displayName')) document.getElementById('displayName').textContent = name || 'Update Your Name';
        
        let jobDisplay = '';
        if (pos && comp) jobDisplay = `${pos} @ ${comp}`;
        else if (pos) jobDisplay = pos;
        else if (comp) jobDisplay = comp;
        else jobDisplay = 'Update Job Title';
        
        if (document.getElementById('displayJob')) document.getElementById('displayJob').textContent = jobDisplay;
        if (document.getElementById('displayPersona')) document.getElementById('displayPersona').textContent = persona || 'No persona defined yet.';
        if (document.getElementById('displayAvatar')) document.getElementById('displayAvatar').src = avatarUrl;
    }

    // 4. Load Tasks Finished Today
    async function loadTodayTasks() {
        try {
            const response = await fetch(`/api/tasks/archive?email=${currentUserEmail}`);
            if (response.ok) {
                const tasks = await response.json();
                const todayStr = new Date().toLocaleDateString('en-GB'); 
                
                const todayTasks = tasks.filter(t => {
                    const compDate = t.completedOn || t.completed_on || t.createdAt;
                    if (!compDate) return false;
                    return new Date(compDate).toLocaleDateString('en-GB') === todayStr;
                });

                renderTodayTasks(todayTasks);
            }
        } catch (e) {
            console.error("Error loading today's tasks:", e);
        }
    }

    function renderTodayTasks(tasks) {
        const list = document.getElementById('todayCompletedTasks');
        if (!list) return;
        
        list.innerHTML = '';

        if (tasks.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No tasks finished today yet. Keep pushing!</div>`;
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card neo-in`;
            card.style.opacity = "0.8";
            card.style.borderLeft = "4px solid var(--text-muted)";
            
            card.innerHTML = `
                <div class="task-title-row">
                    <span class="task-title">${task.name}</span>
                </div>
                <p class="ai-comment"><strong>AI Strategy:</strong> ${task.comment}</p>
            `;
            list.appendChild(card);
        });
    }

    // 5. Avatar Picker Logic (Global window assignment for inline HTML calls)
    window.selectAvatar = function(avatarFile, element) {
        document.querySelectorAll('.avatar-option').forEach(img => {
            img.classList.remove('active-avatar', 'neo-in');
            img.classList.add('neo-out');
        });
        
        element.classList.remove('neo-out');
        element.classList.add('neo-in', 'active-avatar');
        
        selectedAvatarPath = avatarFile;
        const displayAvatar = document.getElementById('displayAvatar');
        if (displayAvatar) displayAvatar.src = avatarFile;
    };

    // 6. Modal Open/Close Controls (CRITICAL FIX)
    const openEditModalBtn = document.getElementById('openEditModalBtn');
    const editProfileModal = document.getElementById('editProfileModal');

    if (openEditModalBtn && editProfileModal) {
        openEditModalBtn.addEventListener('click', () => {
            editProfileModal.classList.remove('hidden');
            editProfileModal.style.display = 'flex'; // Force CSS block bypass
        });
    }

    window.closeProfileModal = function() {
        if (editProfileModal) {
            editProfileModal.classList.add('hidden');
            editProfileModal.style.display = 'none'; // Force hide
        }
    };

    // 7. Save to Database & Sync Supabase Password
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const inputPassword = document.getElementById('inputPassword');
            const newPassword = inputPassword ? inputPassword.value : "";
            
            const payload = {
                email: currentUserEmail,
                name: document.getElementById('inputName') ? document.getElementById('inputName').value : "",
                position: document.getElementById('inputPosition') ? document.getElementById('inputPosition').value : "",
                company: document.getElementById('inputCompany') ? document.getElementById('inputCompany').value : "",
                persona: document.getElementById('inputPersona') ? document.getElementById('inputPersona').value : "",
                avatarPath: selectedAvatarPath,
                password: newPassword
            };

            try {
                // Step A: Update password in Supabase Auth FIRST
                if (newPassword && supabase) {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw new Error("Supabase rejected the password: " + error.message);
                }

                // Step B: Update Spring Boot Backend
                const response = await fetch('/api/users/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    updateLiveCard(payload.name, payload.position, payload.company, payload.persona, payload.avatarPath);
                    window.closeProfileModal();
                    
                    if (newPassword) {
                        alert("Profile and new password synced successfully!");
                        if (inputPassword) inputPassword.value = '';
                    } else {
                        alert("Profile updated successfully!");
                    }
                } else {
                    alert("Failed to save profile to Java database.");
                }
            } catch (e) {
                alert("Error saving profile: " + e.message);
                console.error("Save error:", e);
            }
        });
    }

    // 8. Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('userEmail');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            }
        });
    }

    // 9. Sidebar Collapse Logic
    const sidebar = document.getElementById('appSidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

    if (toggleSidebarBtn && sidebar) {
        if (window.innerWidth <= 900) {
            sidebar.classList.add('collapsed');
        }

        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // 10. Execute Initial Loaders
    loadProfile();
    loadTodayTasks();

});