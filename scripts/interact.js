const { NPR_TOKEN_ADDRESS, USD_TOKEN_ADDRESS } = require('../config');

async function main() {
    // Get contract instances
    const NPRToken = await ethers.getContractFactory("NPRToken");
    const USDToken = await ethers.getContractFactory("USDToken");
    
    const nprToken = await NPRToken.attach("0x5fbdb2315678afecb367f032d93f642f64180aa3");
    const usdToken = await USDToken.attach("0xe7f1725e7734ce288f8367e1bb143e90bb3f0512");

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