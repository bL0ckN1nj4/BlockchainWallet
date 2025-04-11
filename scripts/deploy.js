async function main() {
  // Get the contract factories
  const NPRToken = await ethers.getContractFactory("NPRToken");
  const USDToken = await ethers.getContractFactory("USDToken");

  // Deploy NPRToken contract
  console.log("Deploying NPRToken...");
  const nprToken = await NPRToken.deploy();
  await nprToken.waitForDeployment();
  console.log("NPRToken deployed to:", await nprToken.getAddress());

  // Deploy USDToken contract
  console.log("Deploying USDToken...");
  const usdToken = await USDToken.deploy();
  await usdToken.waitForDeployment();
  console.log("USDToken deployed to:", await usdToken.getAddress());
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });