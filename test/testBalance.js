const { JsonRpcProvider, Contract, formatEther, getAddress } = require('ethers'); // Import getAddress
const NPRToken = require('E:/BlockchainWallet/artifacts/contracts/NPRToken.sol/NPRToken.json');
const USDToken = require('E:/BlockchainWallet/artifacts/contracts/USDToken.sol/USDToken.json');

const provider = new JsonRpcProvider('http://127.0.0.1:8545');

// Checking the balance of NPRToken 
// Use the correct contract address for your network
const contractAddress = ''; // Use the correct checksum address
const contract = new Contract(contractAddress, NPRToken.abi, provider);

async function main() {
  const walletAddress = ''; // Use the correct checksum address
  const balance = await contract.balanceOf(walletAddress);
  console.log('Balance:', formatEther(balance)); // Correct usage of formatEther
}

main().catch(console.error);
