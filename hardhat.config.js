require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545" },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

// Only add sepolia network if a valid private key is set
if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length === 66) {
  config.networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    accounts: [process.env.PRIVATE_KEY],
  };
}

module.exports = config;
