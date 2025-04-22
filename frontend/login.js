document.addEventListener('DOMContentLoaded', function() {
    // Import auth functions
    const { isLoggedIn, loginUser } = getAuthFunctions();
    
    // Always show login form if coming from registration success
    if (document.referrer && document.referrer.includes('register-success.html')) {
        localStorage.clear(); // Log out any existing session
    } else if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Handle form submission
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        
        // Clear previous error messages
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
        
        // Basic validation
        if (!email || !password) {
            displayErrors(errorMessage, ['Please enter both email and password']);
            return;
        }
        
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Signing In...';
        
        try {
            // Call the login function from auth.js
            const result = await loginUser(email, password);
            
            if (result.success) {
                // Login successful, redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Check if user needs to register first
                if (result.error.includes('not found')) {
                    displayErrors(errorMessage, ['Account not found. Please register first.']);
                } else {
                    displayErrors(errorMessage, [result.error]);
                }
                
                // Reset button
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        } catch (error) {
            console.error('Login error:', error);
            displayErrors(errorMessage, ['Server error. Please try again later.']);
            
            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
    
    // Add password visibility toggle
    addPasswordToggle('password');
    
    // Add "forgot password" link to reset password page
    const forgotPasswordLink = document.createElement('a');
    forgotPasswordLink.href = 'reset-password.html';
    forgotPasswordLink.className = 'forgot-password';
    forgotPasswordLink.textContent = 'Forgot Password?';
    document.querySelector('.form-group:nth-of-type(2)').appendChild(forgotPasswordLink);
});

// Helper Functions

// Display errors in the error message element
function displayErrors(errorElement, errors) {
    if (errors.length > 0) {
        errorElement.innerHTML = errors.map(error => `<div>${error}</div>`).join('');
        errorElement.style.display = 'block';
    } else {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Add password visibility toggle
function addPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    const parent = input.parentNode;
    
    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'password-toggle';
    toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
    parent.appendChild(toggleButton);
    
    toggleButton.addEventListener('click', function() {
        if (input.type === 'password') {
            input.type = 'text';
            toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
}

// Import auth functions from auth.js
function getAuthFunctions() {
    return {
        isLoggedIn: function() {
            return !!localStorage.getItem('token');
        },
        loginUser: async function(email, password) {
            try {
                const response = await fetch('http://localhost:8545/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('email', data.email);
                    localStorage.setItem('address', data.address);
                    
                    // Also store the balance info
                    if (data.balance) {
                        localStorage.setItem('balance', JSON.stringify(data.balance));
                    }
                    
                    return { success: true, data };
                } else {
                    return { 
                        success: false, 
                        error: data.error || 'Login failed', 
                        needsRegistration: data.needsRegistration 
                    };
                }
            } catch (error) {
                console.error('API error:', error);
                return { success: false, error: 'Server error. Please try again later.' };
            }
        }
    };
}