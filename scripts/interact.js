const { NPR_TOKEN_ADDRESS, USD_TOKEN_ADDRESS } = require('../config');

async function main() {
    // Get contract instances
    const NPRToken = await ethers.getContractFactory("NPRToken");
    const USDToken = await ethers.getContractFactory("USDToken");
    
    const nprToken = await NPRToken.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
    const usdToken = await USDToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");

    // Get the signer
    const [owner] = await ethers.getSigners();

    // Example interactions
    const nprBalance = await nprToken.balanceOf(owner.address);
    const usdBalance = await usdToken.balanceOf(owner.address);

    console.log("NPR Token Balance:", ethers.formatEther(nprBalance));
    console.log("USD Token Balance:", ethers.formatEther(usdBalance));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });