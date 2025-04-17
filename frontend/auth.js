// Auth.js - Frontend authentication module

const AUTH_TOKEN_KEY = 'npr_wallet_auth_token';
const USER_DATA_KEY = 'npr_wallet_user_data';

// Store authentication data
function storeAuthData(token, userData) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

// Get stored authentication token
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Get stored user data
function getUserData() {
  const data = localStorage.getItem(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

// Check if user is logged in
function isLoggedIn() {
  return !!getAuthToken();
}

// Log out user
function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  window.location.href = 'index.html'; // Redirect to login page
}

// Handle registration form submission
async function registerUser(email, password) {
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
      storeAuthData(data.token, {
        email: data.email,
        address: data.address,
        balance: data.balance
      });
      window.location.href = 'dashboard.html'; // Redirect to dashboard
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

// Handle login form submission
async function loginUser(email, password) {
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
      storeAuthData(data.token, {
        email: data.email,
        address: data.address,
        balance: data.balance
      });
      window.location.href = 'dashboard.html'; // Redirect to dashboard
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Get wallet balance
async function getWalletBalance(address) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`http://localhost:8545/api/balance/${address}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update stored user data with new balance
      const userData = getUserData();
      if (userData) {
        userData.balance = data.balance;
        storeAuthData(token, userData);
      }
      
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Failed to get balance');
    }
  } catch (error) {
    console.error('Balance error:', error);
    return { success: false, error: error.message };
  }
}

// Transfer tokens
async function transferTokens(from, to, amount, tokenType) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('http://localhost:8545/api/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        from,
        to,
        amount,
        token: tokenType // 'NPR' or 'NPRT'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update stored user data with new balance
      const userData = getUserData();
      if (userData) {
        userData.balance = {
          npr: tokenType === 'NPR' ? data.balances.sender : userData.balance.npr,
          nprt: tokenType === 'NPRT' ? data.balances.sender : userData.balance.nprt
        };
        storeAuthData(token, userData);
      }
      
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Transfer failed');
    }
  } catch (error) {
    console.error('Transfer error:', error);
    return { success: false, error: error.message };
  }
}

// Convert NPR to NPRT
async function convertNprToNprt(address, amount) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('http://localhost:8545/api/convert/npr-to-nprt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        address,
        amount
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update stored user data with new balance
      const userData = getUserData();
      if (userData) {
        userData.balance = data.balances;
        storeAuthData(token, userData);
      }
      
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Conversion failed');
    }
  } catch (error) {
    console.error('Conversion error:', error);
    return { success: false, error: error.message };
  }
}

// Convert NPRT to NPR
async function convertNprtToNpr(address, amount) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('http://localhost:8545/api/convert/nprt-to-npr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        address,
        amount
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update stored user data with new balance
      const userData = getUserData();
      if (userData) {
        userData.balance = data.balances;
        storeAuthData(token, userData);
      }
      
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Conversion failed');
    }
  } catch (error) {
    console.error('Conversion error:', error);
    return { success: false, error: error.message };
  }
}

// Get transaction history
async function getTransactionHistory(address) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`http://localhost:8545/api/transactions/${address}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Failed to get transaction history');
    }
  } catch (error) {
    console.error('Transaction history error:', error);
    return { success: false, error: error.message };
  }
}