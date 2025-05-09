# NPRWallet - Blockchain-Based Digital Wallet

NPRWallet is a full-stack blockchain-based digital wallet that enables users to manage Nepalese Rupees (NPR) and NPR Tokens (NPRT). It features secure email-based authentication, fiat/token balance management, seamless conversion, and blockchain-powered token transfers. The app is designed for demonstration and educational purposes, showcasing the integration of web, backend, and smart contract technologies.

---

## 🚀 Features

- **Email-based Authentication**: Secure registration and login using email, with mappings stored on IPFS via Pinata.
- **NPR & NPRT Balances**: View your fiat (NPR) and token (NPRT, ERC20) balances in a unified dashboard.
- **Conversion**: Instantly convert between NPR and NPRT at a fixed exchange rate (1 NPRT = 100 NPR).
- **Token Transfer**: Send NPRT tokens to other wallet addresses on the blockchain.
- **Transaction History**: Review your past transactions and conversions.
- **User Profile Management**: Update your profile and manage wallet settings.
- **Bank Account Connection (Simulated)**: Link a simulated bank account for fiat operations.
- **Modern Web UI**: Responsive frontend built with HTML, CSS, JavaScript, and Bootstrap.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap
- **Backend API**: Node.js, Express, JWT
- **Blockchain**: Ethereum (local Hardhat node), Ethers.js, Web3.js
- **Smart Contracts**: Solidity (ERC20 standard for NPRToken)
- **Storage/Integration**: Pinata (IPFS) for decentralized email-to-wallet mapping

---

## 📁 Project Structure

```
NPRWallet/
├── contracts/         # Solidity smart contracts (NPRToken, USDToken, ERC20, etc.)
├── frontend/          # Web UI (HTML, JS, CSS, images)
├── nodejs_api/        # Backend API (Express server, blockchain logic)
├── scripts/           # Deployment scripts (e.g., deploy.js)
├── artifacts/, cache/ # Hardhat build artifacts
├── test/              # Smart contract tests
├── .env               # Environment variables (Pinata keys, etc.)
├── package.json       # Project dependencies (root)
├── hardhat.config.js  # Hardhat configuration
├── start-services.bat # Windows batch script to start services
└── README.md          # Project documentation
```

---

## 🖥️ Getting Started (Fresh Machine)

### 1. Prerequisites
- **Node.js** (v18+ recommended): https://nodejs.org/
- **npm** (comes with Node.js)

### 2. Clone the Repository
git clone <your-repo-url>
cd "NPRWallet"
```

### 3. Install Dependencies (Root & Backend)
npm install           # Install root dependencies (Hardhat, etc.)
cd nodejs_api
npm install           # Install backend API dependencies
cd ..
```

### 5. Start Local Blockchain (Hardhat)
npx hardhat node
```

### 6. Deploy Smart Contracts
Open a new terminal:
npx hardhat run scripts/deploy.js --network localhost
```

### 7. Start Backend API Server
cd nodejs_api
node server.js
```

### 8. Serve the Frontend
You can use any static file server (e.g., http-server):
npx http-server frontend -p 3000 --cors
```
Or use the provided batch script (Windows only):
start-services.bat
```

### 9. Access the Application
Open your browser and go to:
```
http://localhost:3000
```

---

## ⚙️ Smart Contracts
- `NPRToken.sol`: ERC20 token contract for NPRT
- Other supporting contracts: `ERC20.sol`, `Ownable.sol`, `SafeMath.sol`, etc.
- **Deployment**: Both NPRToken is deployed locally via Hardhat scripts
- **Exchange Rate**: Fixed at 1 NPRT = 100 NPR

---

## 🔒 Security & Notes
- **Demo Only**: Not for production use. Keys, tokens, and logic are for educational purposes.
- **Environment Variables**: Never commit your `.env` file or private keys to version control.
- **Private Keys**: Should never be stored in localStorage or exposed in frontend code.
- **Further Hardening**: Production deployment requires additional security, HTTPS, and audit of smart contracts.

---

## 📞 Support & Contribution
For issues or contributions, please open an issue or pull request on the repository.

---

## 📚 References
- [Hardhat Documentation](https://hardhat.org/)
- [Solidity Docs](https://docs.soliditylang.org/)
- [Express.js](https://expressjs.com/)
- [Bootstrap](https://getbootstrap.com/)

---

Enjoy exploring blockchain wallet technology with NPRWallet!  :)
