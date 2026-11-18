// 1. Security Check
const currentUserEmail = localStorage.getItem('userEmail');
if (!currentUserEmail) {
    window.location.href = 'index.html';
}

// 2. Navigation & Theme
document.getElementById('backBtn').addEventListener('click', () => window.location.href = 'board.html');

const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    });
}

// 3. AI Prioritization Logic
const prioritizeBtn = document.getElementById('prioritizeBtn');
const rawTasksInput = document.getElementById('rawTasks');
const loadingIndicator = document.getElementById('loadingIndicator');

// Custom Modal Elements
const alertModal = document.getElementById('customAlertModal');
const alertText = document.getElementById('customAlertText');
const closeAlertBtn = document.getElementById('closeAlertBtn');

prioritizeBtn.addEventListener('click', async () => {
    const rawTasks = rawTasksInput.value.trim();
    if (!rawTasks) {
        alert("Please enter some tasks first!"); // Leaving this native alert as it's just a quick input check
        return;
    }

    // Disable button and show spinner
    prioritizeBtn.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');

    try {
        const response = await fetch('/api/tasks/prioritize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUserEmail,
                tasks: rawTasks
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            const hasRejected = data.rejectedTasks && data.rejectedTasks.length > 0;
            const hasSaved = data.savedTasks && data.savedTasks.length > 0;
            
            // 1. POPUP TRIGGER: Show custom modal if tasks were rejected
            if (hasRejected) {
                // Format the text nicely with HTML
                alertText.innerHTML = "The following tasks were rejected because Karya Planner is strictly for professional and academic workflows:<br><br>" 
                      + "<strong style='color: var(--accent);'>- " + data.rejectedTasks.join("<br>- ") + "</strong><br><br>"
                      + "<span style='font-size: 0.8rem; color: var(--text-muted);'>(Note: Only life-threatening emergencies are allowed as exceptions.)</span>";
                
                alertModal.classList.remove('hidden');

                // Wait for the user to click 'Understood' before moving on
                closeAlertBtn.onclick = function() {
                    alertModal.classList.add('hidden');
                    if (hasSaved) {
                        window.location.href = 'board.html'; // Go to board if some tasks were professional
                    } else {
                        // Reset page if ALL tasks were personal
                        rawTasksInput.value = '';
                        prioritizeBtn.classList.remove('hidden');
                        loadingIndicator.classList.add('hidden');
                    }
                };
            } 
            // 2. Redirect immediately if everything was professional and nothing was rejected
            else if (hasSaved) {
                window.location.href = 'board.html';
            } 
            // 3. Fallback just in case
            else {
                rawTasksInput.value = '';
                prioritizeBtn.classList.remove('hidden');
                loadingIndicator.classList.add('hidden');
            }
        } else {
            alert("Error processing tasks. Check server logs.");
            prioritizeBtn.classList.remove('hidden');
            loadingIndicator.classList.add('hidden');
        }
    } catch (error) {
        console.error(error);
        alert("Failed to reach the server.");
        prioritizeBtn.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
});