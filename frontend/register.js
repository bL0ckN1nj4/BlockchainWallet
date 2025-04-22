document.addEventListener('DOMContentLoaded', function() {
    // Import auth functions
    const { isLoggedIn, registerUser } = getAuthFunctions();
    
    // Check if user is already logged in
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Handle form submission
    document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        const errorMessage = document.getElementById('error-message');
        
        // Clear previous error messages
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
        
        // Validate input
        const errors = validateRegistrationInput(email, password, confirmPassword);
        if (errors.length > 0) {
            displayErrors(errorMessage, errors);
            return;
        }
        
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        try {
            // Call the registration function from auth.js
            const result = await registerUser(email, password);
            
            if (result.success) {
                // Registration successful, redirect to registration success page
                sessionStorage.setItem('registeredEmail', email);
                window.location.href = 'register-success.html';
            } else {
                // Display error message
                displayErrors(errorMessage, [result.error]);
                
                // Reset button
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        } catch (error) {
            console.error('Registration error:', error);
            displayErrors(errorMessage, ['Server error. Please try again later.']);
            
            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
    
    // Add password strength meter
    const passwordInput = document.getElementById('password');
    const strengthMeter = document.createElement('div');
    strengthMeter.className = 'password-strength-meter';
    strengthMeter.innerHTML = '<div class="meter-bar"></div><div class="meter-text"></div>';
    passwordInput.parentNode.appendChild(strengthMeter);
    
    passwordInput.addEventListener('input', function() {
        updatePasswordStrength(this.value, strengthMeter);
    });
    
    // Add password visibility toggle
    addPasswordToggle('password');
    addPasswordToggle('confirm-password');
});

// Helper Functions

// Validate registration input
function validateRegistrationInput(email, password, confirmPassword) {
    const errors = [];
    
    // Validate email
    if (!email) {
        errors.push('Email is required');
    } else if (!validateEmail(email)) {
        errors.push('Please enter a valid email address');
    }
    
    // Validate password
    if (!password) {
        errors.push('Password is required');
    } else if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    } else if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    } else if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
        errors.push('Passwords do not match');
    }
    
    return errors;
}

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

// Email validation function
function validateEmail(email) {
    // More robust regex for email validation
    const re = /^[^\s@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

// Update password strength meter
function updatePasswordStrength(password, meterElement) {
    const meter = meterElement.querySelector('.meter-bar');
    const text = meterElement.querySelector('.meter-text');
    
    let strength = 0;
    
    // Calculate password strength
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    // Set meter width and text based on strength
    const percentage = (strength / 5) * 100;
    meter.style.width = `${percentage}%`;
    
    if (strength === 0) {
        meter.className = 'meter-bar very-weak';
        text.textContent = 'Very Weak';
    } else if (strength === 1) {
        meter.className = 'meter-bar weak';
        text.textContent = 'Weak';
    } else if (strength === 2) {
        meter.className = 'meter-bar average';
        text.textContent = 'Average';
    } else if (strength === 3) {
        meter.className = 'meter-bar good';
        text.textContent = 'Good';
    } else {
        meter.className = 'meter-bar strong';
        text.textContent = 'Strong';
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
        registerUser: async function(email, password) {
            try {
                const response = await fetch('http://localhost:8545/register', {
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
                    return { success: false, error: data.error || 'Registration failed' };
                }
            } catch (error) {
                console.error('API error:', error);
                return { success: false, error: 'Server error. Please try again later.' };
            }
        }
    };
}