document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Supabase safely with your exact Anon Key
    const supabaseUrl = 'https://xciqxkgrvxybnhssulrb.supabase.co'; 
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaXF4a2dydnh5Ym5oc3N1bHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NTA1NjgsImV4cCI6MjExMDEyNjU2OH0.KRn44VDIoZA147Ry0tNmnTGmQQt4EIXnV8pu-hyOxPY';
    const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

    // 2. DOM Elements
    const authTitle = document.getElementById('authTitle');
    const authBtn = document.getElementById('authBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const signupFields = document.getElementById('signupFields');
    const signupName = document.getElementById('signupName');
    const signupUsername = document.getElementById('signupUsername');
    const authLoading = document.getElementById('authLoading');
    
    const customAuthModal = document.getElementById('customAuthModal');
    const authModalTitle = document.getElementById('authModalTitle');
    const authModalText = document.getElementById('authModalText');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    
    let isLoginMode = true;

    // 3. Custom Alert Function
    function showCustomAlert(message, title = "Notice") {
        if (authModalTitle) authModalTitle.textContent = title;
        if (authModalText) authModalText.textContent = message;
        if (customAuthModal) customAuthModal.classList.remove('hidden');
        else alert(message); 
    }

    if (closeAuthModalBtn) {
        closeAuthModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            customAuthModal.classList.add('hidden');
        });
    }

    // 4. Theme Toggle Safety Check
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', 'dark');
        });
    }

    // 5. Toggle Login/Signup Interface Safety Check
    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            
            if (isLoginMode) {
                if(authTitle) authTitle.textContent = "Welcome Back";
                if(authBtn) authBtn.textContent = "Log In";
                if(toggleAuthMode) toggleAuthMode.textContent = "New here? Create an account";
                if(signupFields) signupFields.classList.add('hidden');
            } else {
                if(authTitle) authTitle.textContent = "Create Account";
                if(authBtn) authBtn.textContent = "Sign Up";
                if(toggleAuthMode) toggleAuthMode.textContent = "Already have an account? Log in";
                if(signupFields) signupFields.classList.remove('hidden');
            }
        });
    }

    // 6. Handle Authentication Safety Check
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!supabase) {
                showCustomAlert("Database connection is offline.", "System Error");
                return;
            }

            const email = emailInput ? emailInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value.trim() : "";

            if (!email || !password) {
                showCustomAlert("Please enter both email and password.", "Input Required");
                return;
            }

            let name = "New User";
            let username = "user";

            if (!isLoginMode) {
                name = signupName ? signupName.value.trim() : "";
                username = signupUsername ? signupUsername.value.trim() : "";
                if (!name || !username) {
                    showCustomAlert("Please fill in your Full Name and Username.", "Input Required");
                    return;
                }
            }

            authBtn.classList.add('hidden');
            if(authLoading) authLoading.classList.remove('hidden');

            try {
                if (isLoginMode) {
                    // --- SIGN IN ---
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    
                    localStorage.setItem('userEmail', data.user.email);
                    window.location.href = 'board.html';
                } else {
                    // --- SIGN UP ---
                    const { data, error } = await supabase.auth.signUp({ email, password });
                    if (error) throw error;
                    
                    await fetch('/api/users/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email,
                            password: password,
                            name: name,
                            username: username,
                            position: "Professional",
                            company: "My Company",
                            persona: "General task management.",
                            avatarPath: "avatar_01_female_smiling.png"
                        })
                    });
                    
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('username', username);
                    showCustomAlert("Account created successfully! Redirecting...", "Success");
                    setTimeout(() => { window.location.href = 'board.html'; }, 1500);
                }
            } catch (error) {
                showCustomAlert("Supabase Server Says: " + error.message, "Connection Status");
            } finally {
                authBtn.classList.remove('hidden');
                if(authLoading) authLoading.classList.add('hidden');
            }
        });
    }
});