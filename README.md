# NPRWallet - Blockchain-based Digital Wallet

NPRWallet is a blockchain-based digital wallet that allows users to manage NPR (Nepalese Rupee) and NPRT (NPR Token) with features for converting between the two and transferring tokens to other users.

## Features

- Email-based user registration and login
- View NPR (fiat) and NPRT (token) balances
- Convert NPR to NPRT and vice versa at a rate of 1 NPRT = 100 NPR
- Transfer NPRT to other wallet addresses
- View transaction history
- User profile management
- Bank account connection (simulated)

## Technology Stack

- **Backend**: Node.js with Express
- **Blockchain**: Ethereum (local Hardhat node)
- **Smart Contracts**: Solidity (ERC20 tokens)
- **Frontend**: HTML5, CSS3, JavaScript
- **Authentication**: JWT (JSON Web Tokens)
- **Storage**: Pinata (IPFS) for email-to-wallet address mappings

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- Hardhat for local blockchain development

### Running the Application

1. **Start the local blockchain**:

```shell
npx hardhat node
```

2. **Deploy the smart contracts** (in a new terminal):

```shell
npx hardhat run scripts/deploy.js --network localhost
```

3. **Set up environment variables**:

Create a `.env` file with your Pinata API keys:

```
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
```

4. **Start the Node.js backend**:

```shell
cd nodejs_api
npm install
node index.js
```

5. **Serve the frontend**:

You can use any static file server to serve the frontend files. For example:

```shell
npx http-server frontend -p 3000
```

6. **Access the application**:

Open your browser and navigate to: `http://localhost:3000`

## Smart Contract Details

- **NPRToken**: ERC20 token representing NPRT (NPR Token)
- **Exchange Rate**: 1 NPRT = 100 NPR

## Security Notes

- This application is for demonstration purposes only
- In a production environment, additional security measures would be implemented
- Private keys should never be stored in localStorage in a real application
