document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (localStorage.getItem('token')) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Handle form submission
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        
        // Clear previous error messages
        errorMessage.textContent = '';
        
        try {
            // Send login request to API
            const response = await fetch('http://localhost:8545/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
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
                if (data.needsRegistration) {
                    errorMessage.textContent = 'Account not found. Please register first.';
                } else {
                    errorMessage.textContent = data.error || 'Login failed. Please try again.';
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Server error. Please try again later.';
        }
    });
});