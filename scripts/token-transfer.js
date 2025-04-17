const { ethers } = require("hardhat");
const prompt = require('prompt-sync')();

async function main() {
    try {
        // Get network and signer
        const [owner, recipient] = await ethers.getSigners();
        
        // Get contract factory and attach to deployed contract
        const NPRToken = await ethers.getContractFactory("NPRToken");
        const nprToken = await NPRToken.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

        // Show current balances before transfer
        const initialOwnerBalance = await nprToken.balanceOf(owner.address);
        console.log("\nCurrent Owner Balance:", ethers.formatUnits(initialOwnerBalance));

        // Ask user for amount to transfer
        const userAmount = prompt('Enter amount of tokens to transfer: ');

        // Validate user input
        if (isNaN(userAmount) || parseFloat(userAmount) <= 0) {
            throw new Error("Invalid amount. Please enter the  greater than 0");
        }

        const amount = ethers.parseUnits(userAmount);

        // Validate transfer amount using BigInt comparison
        if (amount > initialOwnerBalance) {
            throw new Error("Insufficient balance for transfer");
        }
        
        console.log(`\nTransferring ${userAmount} tokens to:`, recipient.address);
        console.log('Please wait for transaction confirmation...');
        
        // Execute transfer
        const tx = await nprToken.transfer(recipient.address, amount);
        const receipt = await tx.wait();
        
        if (receipt.status === 0) {
            throw new Error("Transaction failed");
        }
        
        // Check balances after transfer
        const ownerBalance = await nprToken.balanceOf(owner.address);
        const recipientBalance = await nprToken.balanceOf(recipient.address);
        
        console.log("\nTransaction completed!");
        console.log("Transaction hash:", tx.hash);
        console.log("New Owner Balance:", ethers.formatUnits(ownerBalance));
        console.log("New Recipient Balance:", ethers.formatUnits(recipientBalance));
    } catch (error) {
        console.error('\nError:', error.message);
        if (error.code === 'NETWORK_ERROR') {
            console.error('Please ensure your Hardhat node is running:');
            console.error('1. Open a new terminal');
            console.error('2. Run: npx hardhat node');
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });