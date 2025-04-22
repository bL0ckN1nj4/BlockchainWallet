const { ethers } = require("hardhat");
const prompt = require('prompt-sync')();

async function main() {
    try {
        console.log("Starting token transfer process...");
        
        // First validate the Hardhat node is running
        try {
            const blockNumber = await ethers.provider.getBlockNumber();
            console.log(`Connected to Hardhat node (block #${blockNumber})`);
        } catch (error) {
            throw new Error("Cannot connect to Hardhat node. Make sure it's running with 'npx hardhat node'");
        }
        
        // Get all signers
        const accounts = await ethers.getSigners();
        const owner = accounts[0];
        
        // Display contract info
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        console.log(`Using token contract at: ${contractAddress}`);
        
        // Attach to the deployed contract with minimal operations
        // and a catch for connection issues
        let nprToken;
        try {
            const NPRToken = await ethers.getContractFactory("NPRToken");
            nprToken = NPRToken.attach(contractAddress);
        } catch (error) {
            throw new Error(`Failed to connect to contract: ${error.message}`);
        }
        
        // Get balance with safety checks
        let initialOwnerBalance;
        try {
            initialOwnerBalance = await nprToken.balanceOf(owner.address);
            console.log("\nCurrent Owner Balance:", ethers.formatUnits(initialOwnerBalance));
        } catch (error) {
            throw new Error(`Failed to get owner balance: ${error.message}`);
        }
        
        // Display available accounts
        console.log("\nAvailable accounts:");
        accounts.forEach((account, index) => {
            console.log(`[${index}] ${account.address}`);
        });
        
        // Let user select recipient account
        const recipientIndex = parseInt(prompt('Select recipient account (enter index number): '));
        
        // Validate account selection
        if (isNaN(recipientIndex) || recipientIndex < 0 || recipientIndex >= accounts.length) {
            throw new Error("Invalid account selection. Please enter a valid account index.");
        }
        
        // Prevent sending to self
        if (recipientIndex === 0) {
            throw new Error("Cannot transfer tokens to the owner account. Please select a different account.");
        }
        
        const recipient = accounts[recipientIndex];
        console.log(`Selected recipient: ${recipient.address}`);
        
        // Ask user for amount to transfer
        const userAmount = prompt('Enter amount of tokens to transfer: ');
        
        // Validate user input
        if (isNaN(userAmount) || parseFloat(userAmount) <= 0) {
            throw new Error("Invalid amount. Please enter an amount greater than 0.");
        }
        
        const amount = ethers.parseUnits(userAmount);
        
        // Validate transfer amount
        if (amount > initialOwnerBalance) {
            throw new Error(`Insufficient balance for transfer. Available: ${ethers.formatUnits(initialOwnerBalance)}`);
        }
        
        console.log(`\nPreparing to transfer ${userAmount} tokens to: ${recipient.address}`);
        
        // Removed unnecessary network check that was causing issues
        console.log("Step 1: Preparing transaction...");
        
        // Add retry mechanism for sending the transaction
        let tx;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                // Create transaction with minimal options to avoid complexity
                tx = await nprToken.transfer(recipient.address, amount, { 
                    gasLimit: 200000
                });
                console.log("Transaction sent with hash:", tx.hash);
                break; // Success, exit the loop
            } catch (error) {
                retryCount++;
                console.log(`Attempt ${retryCount} failed: ${error.message}`);
                
                if (retryCount >= maxRetries) {
                    throw new Error(`Failed to send transaction after ${maxRetries} attempts: ${error.message}`);
                }
                
                console.log(`Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log("Step 2: Waiting for confirmation...");
        let receipt;
        
        // Add retry mechanism for transaction confirmation
        retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                receipt = await tx.wait(1);
                console.log("Transaction confirmed in block:", receipt.blockNumber);
                break; // Success, exit the loop
            } catch (error) {
                retryCount++;
                console.log(`Confirmation attempt ${retryCount} failed: ${error.message}`);
                
                if (retryCount >= maxRetries) {
                    console.error("Error during confirmation after multiple retries:", error.message);
                    console.log("\nIMPORTANT: The transaction may have been processed despite this error.");
                    console.log("We'll check balances to verify the transfer status.");
                    break;
                }
                
                console.log(`Retrying confirmation in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log("Step 3: Verifying final balances...");
        
        // Add retry mechanism for balance verification
        retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                // Small delay before checking balances
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const finalOwnerBalance = await nprToken.balanceOf(owner.address);
                const recipientBalance = await nprToken.balanceOf(recipient.address);
                
                console.log("\nTransaction verification complete!");
                
                if (finalOwnerBalance < initialOwnerBalance) {
                    console.log("✓ TRANSFER SUCCEEDED - Balances have changed");
                    console.log(`Owner balance before: ${ethers.formatUnits(initialOwnerBalance)}`);
                    console.log(`Owner balance after: ${ethers.formatUnits(finalOwnerBalance)}`);
                    console.log(`Recipient balance: ${ethers.formatUnits(recipientBalance)}`);
                    console.log(`Amount transferred: ${ethers.formatUnits(initialOwnerBalance - finalOwnerBalance)}`);
                } else {
                    console.log("⚠ TRANSFER MAY HAVE FAILED - Balances unchanged");
                    console.log(`Owner balance: ${ethers.formatUnits(finalOwnerBalance)}`);
                    console.log(`Recipient balance: ${ethers.formatUnits(recipientBalance)}`);
                }
                
                if (tx && tx.hash) {
                    console.log(`Transaction hash for reference: ${tx.hash}`);
                }
                
                break; // Success, exit the loop
            } catch (error) {
                retryCount++;
                console.log(`Balance verification attempt ${retryCount} failed: ${error.message}`);
                
                if (retryCount >= maxRetries) {
                    console.error("Failed to verify final balances after multiple retries:", error.message);
                    console.log("Please check your wallet balances manually to confirm the transfer status.");
                    if (tx && tx.hash) {
                        console.log(`Transaction hash for reference: ${tx.hash}`);
                    }
                    break;
                }
                
                console.log(`Retrying balance verification in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
    } catch (error) {
        console.error('\nError:', error.message);
        
        // Add specific advice for different error types
        if (error.message.includes('ECONNRESET') || 
            error.message.includes('network') || 
            error.code === 'NETWORK_ERROR') {
            console.error('\nThis is a network connectivity issue:');
            console.error('1. Make sure the Hardhat node is running (npx hardhat node)');
            console.error('2. Try running the script again in a few moments');
            console.error('3. Consider restarting the Hardhat node if problems persist');
        }
    }
}

main()
    .then(() => console.log("\nTransaction complete!"))
    .catch(error => {
        console.error("Fatal error:", error);
    });