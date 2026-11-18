// Wait for the HTML to be fully loaded before doing ANYTHING
document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Supabase safely
    const supabaseUrl = 'https://xciqxkgrvxybnhssulrb.supabase.co'; 
    const supabaseKey = 'sb_publishable_coswga9lINQlidHpl-7JQg_51BudvNB';
    const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

    // 2. Custom Alert Modal
    const authModal = document.getElementById('customAuthModal');
    const authModalTitle = document.getElementById('authModalTitle');
    const authModalText = document.getElementById('authModalText');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');

    function showCustomAlert(message, title = "Notice") {
        if (authModalTitle) authModalTitle.textContent = title;
        if (authModalText) authModalText.textContent = message;
        if (authModal) {
            authModal.style.display = 'flex';
            authModal.classList.remove('hidden');
        } else {
            alert(message); // Fallback just in case
        }
    }

    if (closeAuthModalBtn) {
        closeAuthModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.style.display = 'none';
            authModal.classList.add('hidden');
        });
    }

    // 3. Theme Toggle
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', 'dark');
        });
    }

    // 4. UI Elements for Auth
    let isLoginMode = true;
    const authTitle = document.getElementById('authTitle');
    const authBtn = document.getElementById('authBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const authLoading = document.getElementById('authLoading');

    // 5. Toggle Login/Signup Button
    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault(); // Forces it to act as a button
            isLoginMode = !isLoginMode;
            
            if (isLoginMode) {
                authTitle.textContent = "Welcome Back";
                authBtn.textContent = "Sign In";
                toggleAuthMode.textContent = "Don't have an account? Sign up";
            } else {
                authTitle.textContent = "Create Account";
                authBtn.textContent = "Sign Up";
                toggleAuthMode.textContent = "Already have an account? Sign in";
            }
        });
    }

    // 6. Handle Auth Submission
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Forces it to act as a button
            
            if (!supabase) {
                showCustomAlert("Database connection is offline.", "Connection Error");
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                showCustomAlert("Please enter both email and password.", "Input Required");
                return;
            }

            authBtn.style.display = 'none';
            if (authLoading) {
                authLoading.style.display = 'block';
                authLoading.classList.remove('hidden');
            }

            try {
                if (isLoginMode) {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    
                    localStorage.setItem('userEmail', data.user.email);
                    window.location.href = 'board.html';
                } else {
                    const { data, error } = await supabase.auth.signUp({ email, password });
                    if (error) throw error;
                    
                    // Sync to Backend
                    await fetch('/api/users/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email, password: password, name: "New User", 
                            position: "Professional", company: "My Company", 
                            persona: "General task management.", avatarPath: "avatar_01_female_smiling.png"
                        })
                    });
                    
                    localStorage.setItem('userEmail', data.user.email);
                    showCustomAlert("Account created successfully! Redirecting...", "Success");
                    setTimeout(() => { window.location.href = 'board.html'; }, 1500);
                }
            } catch (error) {
                console.error(error);
                showCustomAlert(error.message || "Authentication failed.", "Error");
            } finally {
                authBtn.style.display = 'block';
                if (authLoading) {
                    authLoading.style.display = 'none';
                    authLoading.classList.add('hidden');
                }
            }
        });
    }
});