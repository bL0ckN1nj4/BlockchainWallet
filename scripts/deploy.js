async function main() {
  // Get the contract factory
  const NPRToken = await ethers.getContractFactory("NPRToken");

  // Deploy NPRToken contract
  console.log("Deploying NPRToken...");
  const nprToken = await NPRToken.deploy();
  await nprToken.waitForDeployment();
  const nprAddress = await nprToken.getAddress();
  console.log("NPRToken deployed to:", nprAddress);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });