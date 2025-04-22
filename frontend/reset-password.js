document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const resetRequestForm = document.getElementById('reset-request-form');
    const verificationForm = document.getElementById('verification-form');
    const newPasswordForm = document.getElementById('new-password-form');
    
    // Get all error message containers
    const errorMessage = document.getElementById('error-message');
    const verificationError = document.getElementById('verification-error');
    const passwordError = document.getElementById('password-error');
    
    // Store user email for the reset process
    let userEmail = '';
    let resetToken = '';
    let verificationCode = '';
    
    // Function to show a specific form and hide others
    function showForm(formToShow) {
        resetRequestForm.style.display = 'none';
        verificationForm.style.display = 'none';
        newPasswordForm.style.display = 'none';
        
        formToShow.style.display = 'block';
    }
    
    // Handle email request form submission
    resetRequestForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        userEmail = document.getElementById('email').value.trim();
        
        // Clear previous error
        errorMessage.style.display = 'none';
        
        // Validate email
        if (!validateEmail(userEmail)) {
            displayErrors(errorMessage, ['Please enter a valid email address']);
            return;
        }
        
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        try {
            // Request password reset from server
            const response = await fetch('http://localhost:8545/reset-password/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userEmail })
            });
            
            const data = await response.json();
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            
            if (response.ok) {
                // For demo/development purposes, show the verification code
                // In production, this would be sent via email
                verificationCode = data.verificationCode;
                resetToken = data.resetToken;
                
                // Store expiration time
                const expirationSeconds = data.expiresInSeconds || 360; // Default to 6 minutes if not provided
                
                // Show verification success notification
                const notification = document.createElement('div');
                notification.className = 'notification show';
                notification.innerHTML = `
                    <div>Verification code sent! For demo purposes, your code is: <strong>${verificationCode}</strong></div>
                    <div>Code expires in: <strong>${Math.floor(expirationSeconds / 60)} minutes</strong></div>
                `;
                document.body.appendChild(notification);
                
                // Remove notification after 15 seconds
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }, 15000);
                
                // Move to verification form
                showForm(verificationForm);
                startTimer(expirationSeconds);
                setupVerificationInputs();
            } else {
                // Display error message
                displayErrors(errorMessage, [data.error || 'Password reset request failed']);
            }
        } catch (error) {
            console.error('Reset request error:', error);
            displayErrors(errorMessage, ['Server error. Please try again later.']);
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
    
    // Handle verification form
    function setupVerificationInputs() {
        const inputs = document.querySelectorAll('.verification-input');
        
        // Clear all inputs
        inputs.forEach(input => {
            input.value = '';
        });
        
        // Setup input behavior (focus next input after entry)
        inputs.forEach((input, index) => {
            input.addEventListener('keyup', function(e) {
                if (e.key === 'Backspace' && !this.value) {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    }
                    return;
                }
                
                // Only allow numbers
                this.value = this.value.replace(/[^0-9]/g, '');
                
                if (this.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                
                // Check if all inputs are filled
                const allFilled = Array.from(inputs).every(input => input.value);
                if (allFilled && index === inputs.length - 1) {
                    // Auto-submit when all filled
                    setTimeout(() => verificationForm.dispatchEvent(new Event('submit')), 500);
                }
            });
        });
        
        // Focus the first input
        inputs[0].focus();
    }
    
    // Countdown timer for verification code
    let timerInterval;
    function startTimer(duration = 360) { // Default to 6 minutes = 360 seconds
        const timerElement = document.getElementById('timer');
        const resendButton = document.getElementById('resend-code');
        let timeLeft = duration;
        
        // Ensure resend button starts disabled
        resendButton.disabled = true;
        
        // Clear any existing intervals
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Initial display
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update the timer every second
        timerInterval = setInterval(function() {
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timerInterval);
                timerElement.textContent = 'Expired';
                resendButton.disabled = false;
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Enable resend button when less than 10 seconds remain
            if (timeLeft <= 10) {
                resendButton.disabled = false;
            }
        }, 1000);
    }
    
    // Handle resend code button
    document.getElementById('resend-code').addEventListener('click', async function() {
        this.disabled = true;
        
        try {
            // Request a new verification code
            const response = await fetch('http://localhost:8545/reset-password/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userEmail })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update verification code and token
                verificationCode = data.verificationCode;
                resetToken = data.resetToken;
                
                // Show success notification
                const notification = document.createElement('div');
                notification.className = 'notification show';
                notification.innerHTML = `
                    <div>New code sent! For demo purposes, your code is: <strong>${verificationCode}</strong></div>
                `;
                document.body.appendChild(notification);
                
                // Remove notification after 10 seconds
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }, 10000);
                
                // Reset timer
                startTimer();
                
                // Reset verification inputs
                setupVerificationInputs();
            } else {
                displayErrors(verificationError, [data.error || 'Failed to resend code']);
                this.disabled = false;
            }
        } catch (error) {
            console.error('Resend code error:', error);
            displayErrors(verificationError, ['Server error. Please try again later.']);
            this.disabled = false;
        }
    });
    
    // Handle verification form submission
    verificationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get entered code from inputs
        const inputs = document.querySelectorAll('.verification-input');
        const enteredCode = Array.from(inputs).map(input => input.value).join('');
        
        // Clear previous errors
        verificationError.style.display = 'none';
        
        // Validate code
        if (enteredCode.length !== 6) {
            displayErrors(verificationError, ['Please enter all 6 digits of the verification code']);
            return;
        }
        
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Verifying...';
        
        try {
            // Verify code with server
            const response = await fetch('http://localhost:8545/reset-password/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: userEmail,
                    code: enteredCode,
                    token: resetToken
                })
            });
            
            const data = await response.json();
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            
            if (response.ok) {
                // Stop the timer
                if (timerInterval) {
                    clearInterval(timerInterval);
                }
                
                // Move to new password form
                showForm(newPasswordForm);
                
                // Setup password fields
                const newPasswordInput = document.getElementById('new-password');
                const confirmPasswordInput = document.getElementById('confirm-password');
                
                // Add password strength meter
                const strengthMeter = document.createElement('div');
                strengthMeter.className = 'password-strength-meter';
                strengthMeter.innerHTML = '<div class="meter-bar"></div><div class="meter-text"></div>';
                newPasswordInput.parentNode.appendChild(strengthMeter);
                
                newPasswordInput.addEventListener('input', function() {
                    updatePasswordStrength(this.value, strengthMeter);
                });
                
                // Add password visibility toggles
                addPasswordToggle('new-password');
                addPasswordToggle('confirm-password');
                
                // Focus new password input
                newPasswordInput.focus();
            } else {
                // Display error message
                displayErrors(verificationError, [data.error || 'Invalid verification code']);
            }
        } catch (error) {
            console.error('Verification error:', error);
            displayErrors(verificationError, ['Server error. Please try again later.']);
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
    
    // Handle back link
    document.getElementById('back-to-email').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Stop the timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        showForm(resetRequestForm);
    });
    
    // Handle new password form submission
    newPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Clear previous errors
        passwordError.style.display = 'none';
        
        // Validate passwords
        const errors = validatePassword(newPassword, confirmPassword);
        if (errors.length > 0) {
            displayErrors(passwordError, errors);
            return;
        }
        
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Resetting Password...';
        
        try {
            // Submit new password to server
            const response = await fetch('http://localhost:8545/reset-password/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: userEmail,
                    token: resetToken,
                    password: newPassword
                })
            });
            
            const data = await response.json();
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            
            if (response.ok) {
                // Redirect to the success page
                window.location.href = 'reset-success.html';
            } else {
                // Display error message
                displayErrors(passwordError, [data.error || 'Password reset failed']);
            }
        } catch (error) {
            console.error('Password reset error:', error);
            displayErrors(passwordError, ['Server error. Please try again later.']);
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
    
    // Utility Functions
    
    // Email validation
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Password validation
    function validatePassword(password, confirmPassword) {
        const errors = [];
        
        if (!password) {
            errors.push('Password is required');
        } else if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        } else if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        } else if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }
        
        return errors;
    }
    
    // Display errors
    function displayErrors(errorElement, errors) {
        if (errors.length > 0) {
            errorElement.innerHTML = errors.map(error => `<div>${error}</div>`).join('');
            errorElement.style.display = 'block';
        } else {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
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
}); 