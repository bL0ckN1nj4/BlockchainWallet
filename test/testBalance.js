const { JsonRpcProvider, Contract, formatEther, getAddress } = require('ethers'); // Import getAddress
const NPRToken = require('E:/BlockchainWallet/artifacts/contracts/NPRToken.sol/NPRToken.json');

const provider = new JsonRpcProvider('http://127.0.0.1:8545');

// Correct the contract address to checksum format
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Use the correct checksum address
const contract = new Contract(contractAddress, NPRToken.abi, provider);

async function main() {
  // Correct the wallet address to checksum format
  const walletAddress = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // Use the correct checksum address
  const balance = await contract.balanceOf(walletAddress);
  console.log('Balance:', formatEther(balance)); // Correct usage of formatEther
}

main().catch(console.error);