async function main() {
    const [owner, recipient] = await ethers.getSigners();
    
    const NPRToken = await ethers.getContractFactory("NPRToken");
    const nprToken = await NPRToken.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    // Transfer 100 tokens to recipient
    const amount = ethers.parseEther("100");
    console.log("Transferring 100 tokens to:", recipient.address);
    
    await nprToken.transfer(recipient.address, amount);
    
    // Check balances after transfer
    const ownerBalance = await nprToken.balanceOf(owner.address);
    const recipientBalance = await nprToken.balanceOf(recipient.address);
    
    console.log("Owner Balance:", ethers.formatEther(ownerBalance));
    console.log("Recipient Balance:", ethers.formatEther(recipientBalance));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });