const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const { ethers } = require('ethers');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { verifyEmailDeliverability } = require('./emailVerifier');

const app = express();
const PORT = 8545;
const JWT_SECRET = 'ethsecretkey'; // In production, use environment variables
const EXCHANGE_RATE = 100; // 1 NPRT = 100 NPR
const SALT_ROUNDS = 10; // For bcrypt password hashing

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory databases (replace with real database in production)
let walletDatabase = {};
let userDatabase = {};
let transactionHistories = {};
let resetTokens = {}; // Store for password reset tokens and verification codes

// Path to data files
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

// Initialize data directory and files
async function initializeDataFiles() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check if users file exists, create if it doesn't
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      userDatabase = JSON.parse(usersData);
      console.log('Loaded users from file');
    } catch (err) {
      await fs.writeFile(USERS_FILE, JSON.stringify({}));
      console.log('Created new users file');
    }
    
    // Check if wallets file exists, create if it doesn't
    try {
      const walletsData = await fs.readFile(WALLETS_FILE, 'utf8');
      walletDatabase = JSON.parse(walletsData);
      console.log('Loaded wallets from file');
    } catch (err) {
      await fs.writeFile(WALLETS_FILE, JSON.stringify({}));
      console.log('Created new wallets file');
    }
    
    // Check if transactions file exists, create if it doesn't
    try {
      const transactionsData = await fs.readFile(TRANSACTIONS_FILE, 'utf8');
      transactionHistories = JSON.parse(transactionsData);
      console.log('Loaded transactions from file');
    } catch (err) {
      await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify({}));
      console.log('Created new transactions file');
    }
  } catch (err) {
    console.error('Error initializing data files:', err);
  }
}

// Save data to files
async function saveDataToFiles() {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(userDatabase, null, 2));
    await fs.writeFile(WALLETS_FILE, JSON.stringify(walletDatabase, null, 2));
    await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(transactionHistories, null, 2));
  } catch (err) {
    console.error('Error saving data files:', err);
  }
}

// Wallet and user management functions
function getOrCreateWallet(address) {
  // Normalize address to ensure consistent lookup
  const normalizedAddress = address.toLowerCase();
  
  if (!walletDatabase[normalizedAddress]) {
    walletDatabase[normalizedAddress] = { 
      npr: 0,           // NPR balance (fiat currency)
      nprt: 0,          // NPRT balance (cryptocurrency token)
      address: normalizedAddress
    };
  }
  
  return walletDatabase[normalizedAddress];
}

async function saveUser(email, userData) {
  userDatabase[email.toLowerCase()] = userData;
  await saveDataToFiles();
}

async function getUserByEmail(email) {
  return userDatabase[email.toLowerCase()] || null;
}

async function getUserByWalletAddress(address) {
  const normalizedAddress = address.toLowerCase();
  for (const email in userDatabase) {
    if (userDatabase[email].address.toLowerCase() === normalizedAddress) {
      return { ...userDatabase[email], email };
    }
  }
  return null;
}

function addTransactionToHistory(address, transaction) {
  // Add timestamp to transaction
  transaction.timestamp = new Date().toISOString();
  
  // Create transaction history for address if it doesn't exist
  if (!transactionHistories[address]) {
    transactionHistories[address] = [];
  }
  
  // Add transaction to history
  transactionHistories[address].unshift(transaction);
  
  // Save to file
  saveDataToFiles();
}

// JWT Verification middleware
function verifyToken(req, res, next) {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    const bearer = bearerHeader.split(' ');
    // Get token from array
    const bearerToken = bearer[1];
    
    // Verify token
    jwt.verify(bearerToken, JWT_SECRET, (err, authData) => {
      if (err) {
        res.status(403).json({ error: 'Invalid or expired token' });
      } else {
        req.authData = authData;
        next();
      }
    });
  } else {
    // Forbidden
    res.status(403).json({ error: 'Authentication token required' });
  }
}

// API Endpoints

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    // Check email deliverability using AbstractAPI
    const deliverabilityResult = await verifyEmailDeliverability(email);
    if (!deliverabilityResult.deliverable) {
      return res.status(400).json({ error: 'Email is not deliverable. Please provide a valid email address.' });
    }
    
    // Check if email already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Always generate a new Ethereum wallet for the user
    const { Wallet } = require('ethers');
    const newWallet = Wallet.createRandom();
    const address = newWallet.address;
    // Optionally, securely store newWallet.privateKey for user recovery

    // Save user data locally
    await saveUser(email, {
      address: address,
      password: hashedPassword, // Store the hashed password
      createdAt: new Date().toISOString()
    });
    
    // Initialize wallet with starting balances
    const wallet = getOrCreateWallet(address);
    
    // Give new users initial tokens
    wallet.nprt = 100; // 100 NPRT tokens
    wallet.npr = 100000; // 100000 NPR (fiat)
    console.log(`Initialized new wallet for user ${email} with starting balance:`, wallet);
    
    // Save wallet to database
    walletDatabase[address.toLowerCase()] = wallet;
    await saveDataToFiles();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        user: address,
        email: email,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours expiration
      },
      JWT_SECRET
    );
    
    console.log('Registration successful for:', email);
    
    res.json({
      success: true,
      token,
      address,
      email,
      balance: {
        npr: wallet.npr,
        nprt: wallet.nprt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Get user data
    const user = await getUserByEmail(email);
    
    // Check if email exists
    if (!user) {
      console.log('Account not found for email:', email);
      return res.status(404).json({
        error: 'Account not found',
        needsRegistration: true
      });
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for email:', email);
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const walletAddress = user.address;
    console.log('Found wallet address for email:', walletAddress);
    
    // Initialize wallet balance if it doesn't exist
    const wallet = getOrCreateWallet(walletAddress);
    
    // Ensure the wallet has some initial balance if it's empty
    if (wallet.nprt === 0 && wallet.npr === 0) {
      wallet.nprt = 100; // 100 NPRT tokens
      wallet.npr = 100000; // 100000 NPR
      console.log(`Initialized wallet for returning user ${email} with starting balance:`, wallet);
      await saveDataToFiles();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        user: walletAddress,
        email: email,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours expiration
      },
      JWT_SECRET
    );
    
    console.log('Login successful for:', email);
    
    res.json({
      success: true,
      token,
      address: walletAddress,
      email,
      balance: {
        npr: wallet.npr,
        nprt: wallet.nprt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Get wallet balance endpoint
app.get('/api/balance/:address', verifyToken, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    
    // Get wallet data
    const wallet = getOrCreateWallet(address);
    
    // Return wallet balance
    res.json({
      address,
      balance: {
        npr: wallet.npr,
        nprt: wallet.nprt
      }
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Transfer tokens endpoint
app.post('/api/transfer', verifyToken, async (req, res) => {
  try {
    const { token, to, amount, from } = req.body;
    const tokenAmount = parseFloat(amount);
    
    if (!to || !to.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid recipient address' });
    }
    
    if (!amount || isNaN(tokenAmount) || tokenAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Normalize addresses to ensure consistent lookup
    const normalizedFrom = from.toLowerCase();
    const normalizedTo = to.toLowerCase();
    
    // Get sender's wallet
    const senderWallet = getOrCreateWallet(normalizedFrom);
    
    console.log(`Before transfer - Sender (${normalizedFrom}) balance:`, 
      token === 'NPR' ? senderWallet.npr : senderWallet.nprt);
    
    // Check if sender has enough tokens
    const balanceKey = token === 'NPR' ? 'npr' : 'nprt';
    if (senderWallet[balanceKey] < tokenAmount) {
      return res.status(400).json({ error: `Insufficient ${token} balance` });
    }
    
    // Get recipient's wallet (create if it doesn't exist)
    const recipientWallet = getOrCreateWallet(normalizedTo);
    console.log(`Before transfer - Recipient (${normalizedTo}) balance:`, 
      token === 'NPR' ? recipientWallet.npr : recipientWallet.nprt);
    
    // Transfer tokens from sender to recipient
    senderWallet[balanceKey] -= tokenAmount;
    senderWallet[balanceKey] = Math.max(0, senderWallet[balanceKey]); // Ensure non-negative
    senderWallet[balanceKey] = parseFloat(senderWallet[balanceKey].toFixed(6)); // Round to 6 decimal places
    
    // Update recipient's balance
    recipientWallet[balanceKey] += tokenAmount;
    recipientWallet[balanceKey] = parseFloat(recipientWallet[balanceKey].toFixed(6)); // Round to 6 decimal places
    
    console.log(`After transfer - Sender (${normalizedFrom}) balance:`, 
      token === 'NPR' ? senderWallet.npr : senderWallet.nprt);
    console.log(`After transfer - Recipient (${normalizedTo}) balance:`, 
      token === 'NPR' ? recipientWallet.npr : recipientWallet.nprt);
    
    // Update the walletDatabase with the new balances
    walletDatabase[normalizedFrom] = senderWallet;
    walletDatabase[normalizedTo] = recipientWallet;
    
    // Generate a mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Add to sender's transaction history
    addTransactionToHistory(normalizedFrom, {
      type: 'Transfer',
      subtype: 'Sent',
      to: normalizedTo,
      amount: tokenAmount,
      token: token,
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: senderWallet.nprt,
      nprBalance: senderWallet.npr
    });
    
    // Add to recipient's transaction history
    addTransactionToHistory(normalizedTo, {
      type: 'Transfer',
      subtype: 'Received',
      from: normalizedFrom,
      amount: tokenAmount,
      token: token,
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: recipientWallet.nprt,
      nprBalance: recipientWallet.npr
    });

    // Save updated data
    await saveDataToFiles();
    
    // Return transaction data
    res.json({ 
      txHash: mockTxHash,
      balances: {
        sender: senderWallet[balanceKey].toString(),
        recipient: recipientWallet[balanceKey].toString()
      },
      isMockData: true 
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NPR to NPRT conversion endpoint
app.post('/api/convert/npr-to-nprt', verifyToken, async (req, res) => {
  try {
    const { amount, address } = req.body;
    const nprAmount = parseFloat(amount);
    const normalizedAddress = address.toLowerCase();
    
    console.log(`Converting ${nprAmount} NPR to NPRT for ${normalizedAddress}`);
    
    // Validate amount
    if (!amount || isNaN(nprAmount) || nprAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Get wallet data
    const wallet = getOrCreateWallet(normalizedAddress);
    
    // Check if user has enough NPR
    if (wallet.npr < nprAmount) {
      return res.status(400).json({ error: `Insufficient NPR balance. You only have ${wallet.npr} NPR.` });
    }
    
    // Calculate conversion (1 NPRT = 100 NPR)
    const nprtAmount = nprAmount / EXCHANGE_RATE;
    
    // Update balances: deduct NPR (fiat), add NPRT (token)
    wallet.npr -= nprAmount;
    wallet.npr = Math.max(0, wallet.npr); // Ensure non-negative
    wallet.npr = parseFloat(wallet.npr.toFixed(2)); // Round to 2 decimal places
    
    wallet.nprt += nprtAmount;
    wallet.nprt = parseFloat(wallet.nprt.toFixed(6)); // Round to 6 decimal places
    
    // Generate a mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Add to transaction history
    addTransactionToHistory(normalizedAddress, {
      type: 'Conversion',
      from: 'NPR',
      to: 'NPRT',
      nprAmount: nprAmount,
      nprtAmount: nprtAmount,
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: wallet.nprt,
      nprBalance: wallet.npr
    });

    // Save updated data
    await saveDataToFiles();
    
    // Return mock transaction data
    res.json({
      success: true,
      nprAmount: nprAmount,
      nprtAmount: nprtAmount,
      txHash: mockTxHash,
      balances: {
        npr: wallet.npr.toString(),
        nprt: wallet.nprt.toString()
      },
      isMockData: true
    });
  } catch (error) {
    console.error('Error converting NPR to NPRT:', error);
    res.status(500).json({ error: error.message });
  }
});

// NPRT to NPR conversion endpoint
app.post('/api/convert/nprt-to-npr', verifyToken, async (req, res) => {
  try {
    const { amount, address } = req.body;
    const nprtAmount = parseFloat(amount);
    const normalizedAddress = address.toLowerCase();
    
    console.log(`Converting ${nprtAmount} NPRT to NPR for ${normalizedAddress}`);
    
    // Validate amount
    if (!amount || isNaN(nprtAmount) || nprtAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Get wallet data
    const wallet = getOrCreateWallet(normalizedAddress);
    
    // Check if user has enough NPRT
    if (wallet.nprt < nprtAmount) {
      return res.status(400).json({ error: `Insufficient NPRT balance. You only have ${wallet.nprt} NPRT.` });
    }
    
    // Calculate conversion (1 NPRT = 100 NPR)
    const nprAmount = nprtAmount * EXCHANGE_RATE;
    
    // Update balances: add NPR (fiat), deduct NPRT (token)
    wallet.npr += nprAmount;
    wallet.npr = parseFloat(wallet.npr.toFixed(2)); // Round to 2 decimal places
    
    wallet.nprt -= nprtAmount;
    wallet.nprt = Math.max(0, wallet.nprt); // Ensure non-negative
    wallet.nprt = parseFloat(wallet.nprt.toFixed(6)); // Round to 6 decimal places
    
    // Generate a mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Add to transaction history
    addTransactionToHistory(normalizedAddress, {
      type: 'Conversion',
      from: 'NPRT',
      to: 'NPR',
      nprtAmount: nprtAmount,
      nprAmount: nprAmount,
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: wallet.nprt,
      nprBalance: wallet.npr
    });

    // Save updated data
    await saveDataToFiles();
    
    // Return mock transaction data
    res.json({
      success: true,
      nprtAmount: nprtAmount,
      nprAmount: nprAmount,
      txHash: mockTxHash,
      balances: {
        npr: wallet.npr.toString(),
        nprt: wallet.nprt.toString()
      },
      isMockData: true
    });
  } catch (error) {
    console.error('Error converting NPRT to NPR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction history endpoint
app.get('/api/transactions/:address', verifyToken, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    
    // Get transaction history for address
    const transactions = transactionHistories[address] || [];
    
    res.json({
      address,
      transactions
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bank API Endpoints

// Connect bank account
app.post('/api/bank/connect', verifyToken, async (req, res) => {
  try {
    const { address, fullName, phoneNumber, accountNumber } = req.body;
    const normalizedAddress = address.toLowerCase();
    
    // Validate input
    if (!address || !fullName || !phoneNumber || !accountNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }
    
    // Validate account number format (16 digits)
    if (!/^\d{16}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Bank account number must be 16 digits' });
    }
    
    // Get user's wallet
    const wallet = getOrCreateWallet(normalizedAddress);
    
    // Store bank details in the wallet
    wallet.bankConnected = true;
    wallet.bankInfo = {
      fullName,
      phoneNumber,
      accountNumber,
      connectedAt: new Date().toISOString()
    };
    
    // Generate a mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Add to transaction history
    addTransactionToHistory(normalizedAddress, {
      type: 'Bank',
      subtype: 'Connection',
      amount: 0,
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: wallet.nprt,
      nprBalance: wallet.npr,
      bankInfo: {
        accountNumber: `****${accountNumber.slice(-4)}`
      }
    });
    
    // Save updated data
    await saveDataToFiles();
    
    res.json({
      success: true,
      message: 'Bank account connected successfully',
      txHash: mockTxHash
    });
  } catch (error) {
    console.error('Bank connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect bank account
app.post('/api/bank/disconnect', verifyToken, async (req, res) => {
  try {
    const { address } = req.body;
    const normalizedAddress = address.toLowerCase();
    
    // Get user's wallet
    const wallet = getOrCreateWallet(normalizedAddress);
    
    // Check if bank is connected
    if (!wallet.bankConnected) {
      return res.status(400).json({ error: 'No bank account connected' });
    }
    
    // Remove bank details
    delete wallet.bankConnected;
    delete wallet.bankInfo;
    
    // Generate a mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Add to transaction history
    addTransactionToHistory(normalizedAddress, {
      type: 'Bank',
      subtype: 'Disconnection',
      amount: 0,
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: wallet.nprt,
      nprBalance: wallet.npr
    });
    
    // Save updated data
    await saveDataToFiles();
    
    res.json({
      success: true,
      message: 'Bank account disconnected successfully',
      txHash: mockTxHash
    });
  } catch (error) {
    console.error('Bank disconnection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check bank connection status
app.get('/api/bank/status/:address', verifyToken, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    
    // Get wallet data
    const wallet = getOrCreateWallet(address);
    
    // Return bank connection status
    res.json({
      connected: !!wallet.bankConnected,
      bankInfo: wallet.bankConnected ? {
        accountNumber: `****${wallet.bankInfo.accountNumber.slice(-4)}`
      } : null
    });
  } catch (error) {
    console.error('Bank status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deposit from bank to wallet
app.post('/api/bank/deposit', verifyToken, async (req, res) => {
  try {
    const { address, amount } = req.body;
    const depositAmount = parseFloat(amount);
    const normalizedAddress = address.toLowerCase();
    
    // Validate amount
    if (!amount || isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Minimum deposit amount
    if (depositAmount < 100) {
      return res.status(400).json({ error: 'Minimum deposit amount is 100 NPR' });
    }
    
    // Get wallet data
    const wallet = getOrCreateWallet(normalizedAddress);
    
    // Check if bank is connected
    if (!wallet.bankConnected) {
      return res.status(400).json({ error: 'No bank account connected' });
    }
    
    // Update NPR balance
    wallet.npr += depositAmount;
    wallet.npr = parseFloat(wallet.npr.toFixed(2)); // Round to 2 decimal places
    
    // Generate a mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Add to transaction history
    addTransactionToHistory(normalizedAddress, {
      type: 'Bank',
      subtype: 'Deposit',
      amount: depositAmount,
      token: 'NPR',
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: wallet.nprt,
      nprBalance: wallet.npr,
      bankInfo: {
        accountNumber: `****${wallet.bankInfo.accountNumber.slice(-4)}`
      }
    });
    
    // Save updated data
    await saveDataToFiles();
    
    // Return transaction data
    res.json({
      success: true,
      txHash: mockTxHash,
      amount: depositAmount,
      balance: {
        npr: wallet.npr.toString()
      }
    });
  } catch (error) {
    console.error('Bank deposit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Withdraw from wallet to bank
app.post('/api/bank/withdraw', verifyToken, async (req, res) => {
  try {
    const { address, amount } = req.body;
    const withdrawAmount = parseFloat(amount);
    const normalizedAddress = address.toLowerCase();
    
    // Validate amount
    if (!amount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Minimum withdrawal amount
    if (withdrawAmount < 100) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is 100 NPR' });
    }
    
    // Get wallet data
    const wallet = getOrCreateWallet(normalizedAddress);
    
    // Check if bank is connected
    if (!wallet.bankConnected) {
      return res.status(400).json({ error: 'No bank account connected' });
    }
    
    // Check if user has enough NPR
    if (wallet.npr < withdrawAmount) {
      return res.status(400).json({ error: `Insufficient NPR balance. You only have ${wallet.npr} NPR.` });
    }
    
    // Update NPR balance
    wallet.npr -= withdrawAmount;
    wallet.npr = Math.max(0, wallet.npr); // Ensure non-negative
    wallet.npr = parseFloat(wallet.npr.toFixed(2)); // Round to 2 decimal places
    
    // Generate a mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Add to transaction history
    addTransactionToHistory(normalizedAddress, {
      type: 'Bank',
      subtype: 'Withdrawal',
      amount: withdrawAmount,
      token: 'NPR',
      txHash: mockTxHash,
      status: 'Completed',
      nprtBalance: wallet.nprt,
      nprBalance: wallet.npr,
      bankInfo: {
        accountNumber: `****${wallet.bankInfo.accountNumber.slice(-4)}`
      }
    });
    
    // Save updated data
    await saveDataToFiles();
    
    // Return transaction data
    res.json({
      success: true,
      txHash: mockTxHash,
      amount: withdrawAmount,
      balance: {
        npr: wallet.npr.toString()
      }
    });
  } catch (error) {
    console.error('Bank withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Password Reset Request Endpoint
app.post('/reset-password/request', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      // Instead, pretend to send a reset code anyway
      return res.status(200).json({
        success: true,
        message: 'If your email exists in our system, you will receive a reset code',
        // For demo purposes, generate fake code and token
        verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
        resetToken: crypto.randomBytes(32).toString('hex')
      });
    }
    
    // Generate random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Store the reset token and verification code with expiration time (6 minutes to give buffer time)
    const expirationTimeMs = Date.now() + 6 * 60 * 1000; // 6 minutes expiration (giving 1 minute buffer)
    
    resetTokens[email] = {
      token: resetToken,
      code: verificationCode,
      expires: expirationTimeMs,
      // Also store expiration as ISO string for easier debugging
      expiresAt: new Date(expirationTimeMs).toISOString()
    };
    
    console.log(`Password reset requested for ${email}. Verification code: ${verificationCode}. Expires at: ${new Date(expirationTimeMs).toLocaleTimeString()}`);
    
    // In a real application, you would send an email with the verification code
    // For now, we'll just return it in the response for demonstration
    
    res.json({
      success: true,
      message: 'Password reset code sent to your email',
      // For demo purposes only, these would not be returned in a real app
      verificationCode,
      resetToken,
      // Return seconds until expiration to sync frontend timer
      expiresInSeconds: 360 // 6 minutes in seconds
    });
  } catch (error) {
    console.error('Reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Reset Code Endpoint
app.post('/reset-password/verify', async (req, res) => {
  try {
    const { email, code, token } = req.body;
    
    // Validate input
    if (!email || !code || !token) {
      return res.status(400).json({ error: 'Email, verification code, and token are required' });
    }
    
    // Check if reset token exists and is valid
    const resetData = resetTokens[email];
    if (!resetData) {
      return res.status(400).json({ error: 'Invalid or expired reset request' });
    }
    
    // Check if the token matches
    if (resetData.token !== token) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    
    // Check if the verification code matches
    if (resetData.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Check if the token has expired
    if (Date.now() > resetData.expires) {
      // Remove expired token
      delete resetTokens[email];
      return res.status(400).json({ error: 'Verification code has expired' });
    }
    
    // Update token expiration for the next step (15 more minutes)
    resetTokens[email].expires = Date.now() + 15 * 60 * 1000;
    
    res.json({
      success: true,
      message: 'Verification successful'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password Endpoint
app.post('/reset-password/reset', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    
    // Validate input
    if (!email || !token || !password) {
      return res.status(400).json({ error: 'Email, token, and password are required' });
    }
    
    // Check if reset token exists and is valid
    const resetData = resetTokens[email];
    if (!resetData || resetData.token !== token) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Check if the token has expired
    if (Date.now() > resetData.expires) {
      // Remove expired token
      delete resetTokens[email];
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    // Get user data
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Update user's password
    user.password = hashedPassword;
    userDatabase[email.toLowerCase()] = user;
    
    // Save updated user data
    await saveDataToFiles();
    
    // Remove the reset token
    delete resetTokens[email];
    
    console.log(`Password reset successful for ${email}`);
    
    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize data files and start server
initializeDataFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});