const hre = require("hardhat");

async function main() {
  console.log("🔗 Deploying FindChain to", hre.network.name, "...\n");

  // Deploy FindChain main contract
  const FindChain = await hre.ethers.getContractFactory("FindChain");
  const findChain = await FindChain.deploy();
  await findChain.waitForDeployment();

  const address = await findChain.getAddress();
  console.log("✅ FindChain deployed to:", address);

  // Verify on Etherscan if not localhost
  if (hre.network.name === "sepolia") {
    console.log("\n⏳ Waiting for block confirmations...");
    await findChain.deploymentTransaction().wait(5);

    console.log("🔍 Verifying on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  // Log deployment summary
  console.log("\n" + "=".repeat(50));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Network:        ${hre.network.name}`);
  console.log(`FindChain:      ${address}`);
  console.log(`Platform Fee:   2%`);
  console.log(`Dispute Period: 3 days`);
  console.log(`Item Expiry:    90 days`);
  console.log("=".repeat(50));

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    findChain: address,
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address,
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
