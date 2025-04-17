document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (localStorage.getItem('token')) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Handle form submission
    document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        const errorMessage = document.getElementById('error-message');
        
        // Clear previous error messages
        errorMessage.textContent = '';
        
        // Validate input
        if (!validateEmail(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            return;
        }
        
        if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters long';
            return;
        }
        
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            return;
        }
        
        try {
            // Send registration request to API
            const response = await fetch('http://localhost:8545/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email, 
                    password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store user data in local storage
                localStorage.setItem('token', data.token);
                localStorage.setItem('email', data.email);
                localStorage.setItem('address', data.address);
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Display error message
                errorMessage.textContent = data.error || 'Registration failed. Please try again.';
            }
        } catch (error) {
            console.error('Registration error:', error);
            errorMessage.textContent = 'Server error. Please try again later.';
        }
    });
    
    // Email validation function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
});