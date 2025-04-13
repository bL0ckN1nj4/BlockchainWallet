const express = require('express');
const { ethers, formatEther } = require('ethers');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const web3 = require('web3');
const request = require('request');
const NPRToken = require('../artifacts/contracts/NPRToken.sol/NPRToken.json');
const USDToken = require('../artifacts/contracts/USDToken.sol/USDToken.json');
const config = require('../config.js');

// Define the port for the server
const port = process.env.PORT || 8545;

// Initialize express application
const app = express();
app.use(express.json());
app.use(cors());

// Connect to local blockchain
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
console.log('Private Key:', config.PRIVATE_KEY);
const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);

// Get contract instances
const nprToken = new ethers.Contract(config.NPR_TOKEN_ADDRESS, NPRToken.abi, wallet);
const usdToken = new ethers.Contract(config.USD_TOKEN_ADDRESS, USDToken.abi, wallet);

// Contract addresses for different currencies
const CONTRACT_ADDRESS_USD = config.USD_TOKEN_ADDRESS;
const CONTRACT_ADDRESS_NPR = config.NPR_TOKEN_ADDRESS;
let CONTRACT_ADDRESS = '';

// ABI (Application Binary Interface) for interacting with the smart contract
const ABI = [
    // Common functions from both USDToken and NPRToken
    'function doTransfer(address _from, address _to, uint256 _amount) returns (bool)',
    'function getBalance(address wallet_addres) public view returns(uint256)',
    'function mint(address to, uint256 amount) public',
    'function totalSupply() public view returns (uint256)',
    'function balanceOf(address account) public view returns (uint256)',
    'function transfer(address to, uint256 amount) public returns (bool)',
    'function allowance(address owner, address spender) public view returns (uint256)',
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) public returns (bool)',
    'function increaseAllowance(address spender, uint256 addedValue) public returns (bool)',
    'function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool)',
    'function name() public view returns (string memory)',
    'function symbol() public view returns (string memory)',
    'function decimals() public view returns (uint8)'
];

// Base route to verify server is running
app.get('/', async (req, res) => {
  res.send({
    status: 'Welcome'
  });
});

// Function to assign the correct contract address based on currency type
function assignCurrencyContract(currencyType) {
  if (currencyType === 0) CONTRACT_ADDRESS = CONTRACT_ADDRESS_USD;
  else if (currencyType === 1) CONTRACT_ADDRESS = CONTRACT_ADDRESS_NPR;
  else if (currencyType === 2) CONTRACT_ADDRESS = CONTRACT_ADDRESS_WWW;
  else throw new Error('Invalid currency type');
}

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    req.token = bearerToken;
    next();
  } else {
    res.sendStatus(403);
  }
}

// Endpoint for generating JWT token
app.post('/login/:account_address', (req, res) => {
  jwt.sign({ user: req.params.account_address }, 'ethsecretkey', (err, token) => {
    if (err) {
      res.status(500).json({ error: 'Failed to generate token' });
    } else {
      res.json({ token });
    }
  });
});

// Endpoint for transferring tokens between accounts
app.get('/transfer/:val/:sender_account/:recieved_account/:currency', verifyToken, async (req, res) => {

  // Create a provider for connecting to the Ethereum network
  const provider = ethers.getDefaultProvider('ropsten');

  // Define admin account credentials
  const admin_account = "";
  const privateKey = ""; //third party private key

  // Parse currency type and assign contract address
  const currency = parseInt(req.params.currency);
  assignCurrencyContract(currency);

  // Initialize wallet with the private key and provider
  const wallet = new ethers.Wallet(privateKey, provider);

  // Initialize the contract object
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  // Extract parameters from the request
  const vals = req.params.val;
  const weiValue = web3.utils.toWei(vals, 'ether'); // Convert value to Wei
  const sender_account = req.params.sender_account;
  const recieved_account = req.params.recieved_account;

  try {
    // Call the doTransfer function in the smart contract
    const result = await contract.doTransfer(sender_account, recieved_account, weiValue);

    // Verify JWT and send response
    jwt.verify(req.token, 'ethsecretkey', (err, authData) => {
      if (err) {
        res.send({ error: err });
      } else {
        res.json({
          status: "1",
          value: weiValue,
          result: result
        });
      }
    });

  } catch (e) {
    res.json(e);
  }
});

// Endpoint for checking account balance
app.get('/balance/:account_address/:currency', verifyToken, async (req, res) => {

  // Create a provider for connecting to the Ethereum network
  const provider = ethers.getDefaultProvider('ropsten');

  const privateKey = ""; //third party private key

  // Initialize wallet and assign contract address
  const wallet = new ethers.Wallet(privateKey, provider);
  const currency = parseInt(req.params.currency);
  assignCurrencyContract(currency);

  // Initialize the contract object
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  const account_address = req.params.account_address;

  try {
    // Call the getBalance function in the smart contract
    const wei_result = await contract.getBalance(account_address);
    const fff = web3.utils.fromWei(wei_result.toString(), 'wei');
    const balance = web3.utils.fromWei(wei_result.toString(), 'ether');

    // Verify JWT and send response
    jwt.verify(req.token, 'ethsecretkey', (err, authData) => {
      if (err) {
        res.send({ error: err });
      } else {
        res.send({
          status: true,
          account: account_address,
          weiBalance: fff,
          balance: balance,
          currency: currency
        });
      }
    });

  } catch (e) {
    res.json(e);
  }
});

// Endpoint for fetching exchange rates
app.get('/rates/:from/:to', verifyToken, (req, res) => {
  let from = req.params.from;
  let to = req.params.to;

  // Call external API to get exchange rates
  request(`https://api.apilayer.com/exchangerates_data/latest?symbols=${to}&base=${from}&apikey=`, (error, response, body) => {
    if (error) {
      res.send({ error: error });
    } else {
      // Verify JWT and send response
      jwt.verify(req.token, 'ethsecretkey', (err, authData) => {
        if (err) {
          res.send({ error: err });
        } else {
          res.send(body);
        }
      });
    }
  });
});

// Endpoint for fetching transaction history of a wallet
app.get('/history/:walletAddress/:currency', verifyToken, (req, res) => {
  const walletAddress = req.params.walletAddress;

  const currency = parseInt(req.params.currency);
  assignCurrencyContract(currency);

  // Call external API to get transaction history
  request(`https://api-ropsten.etherscan.io/api?module=account&action=tokentx&contractaddress=${CONTRACT_ADDRESS}&address=${walletAddress}&page=1&offset=100&startblock=0&endblock=99999999&sort=desc&apikey=`, (error, response, body) => {
    if (error) {
      res.send({ error: error });
    } else {
      jwt.verify(req.token, 'ethsecretkey', (err, authData) => {
        if (err) {
          res.send({ error: err });
        } else {
          res.send(body);
        }
      });
    }
  });
});

// Endpoint for transferring tokens
app.post('/api/transfer', verifyToken, async (req, res) => {
  const { token, to, amount } = req.body;
  try {
    const tokenContract = token === 'NPR' ? nprToken : usdToken;
    const tx = await tokenContract.transfer(to, ethers.parseEther(amount));
    await tx.wait();
    res.json({ txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching token balances
app.get('/api/balance/:address', verifyToken, async (req, res) => {
  try {
    console.log('Fetching balance for address:', req.params.address);

    const nprBalance = await nprToken.balanceOf(req.params.address);
    console.log('Raw NPR Balance:', nprBalance);

    const usdBalance = await usdToken.balanceOf(req.params.address);
    console.log('Raw USD Balance:', usdBalance);

    res.json({
      npr: formatEther(nprBalance), // Correct usage of formatEther
      usd: formatEther(usdBalance), // Correct usage of formatEther
    });
  } catch (error) {
    console.error('Error in /api/balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint for Bluetooth device connections
app.post('/api/bluetooth/connect', async (req, res) => {
    const { deviceId, walletAddress } = req.body;
    try {
        // Store the device-wallet pairing
        // You might want to store this in a database
        res.json({
            status: "connected",
            deviceId: deviceId,
            walletAddress: walletAddress
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add endpoint for Bluetooth transfer
app.post('/api/bluetooth/transfer', async (req, res) => {
    const { fromDevice, toDevice, amount, token } = req.body;
    try {
        const tokenContract = token === 'NPR' ? nprToken : usdToken;
        const tx = await tokenContract.transfer(toDevice, ethers.parseEther(amount));
        await tx.wait();
        res.json({ 
            status: "success",
            txHash: tx.hash 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server on the specified port
app.listen(3000, () => {
    console.log('API server running on port 3000');
});

app.listen(port, () => console.log(`Server has started on port: ${port}`));
