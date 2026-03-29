const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy SocToken
  console.log("\n📦 Deploying SocToken...");
  const SocToken = await ethers.getContractFactory("SocToken");
  const socToken = await SocToken.deploy();
  await socToken.waitForDeployment();
  const socTokenAddress = await socToken.getAddress();
  console.log("✅ SocToken deployed to:", socTokenAddress);

  // 2. Deploy SocioChain
  console.log("\n📦 Deploying SocioChain...");
  const SocioChain = await ethers.getContractFactory("SocioChain");
  const socioChain = await SocioChain.deploy();
  await socioChain.waitForDeployment();
  const socioChainAddress = await socioChain.getAddress();
  console.log("✅ SocioChain deployed to:", socioChainAddress);

  // 3. Link contracts
  console.log("\n🔗 Linking contracts...");
  await socioChain.setSocToken(socTokenAddress);
  await socToken.setSocialContract(socioChainAddress);
  console.log("✅ Contracts linked");

  // 4. Save deployment info
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      SocioChain: socioChainAddress,
      SocToken: socTokenAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  const networkName = deployment.chainId === 31337 ? "localhost" : deployment.network;
  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n📋 Deployment summary saved to deployments/", networkName + ".json");
  console.log("\n=== Add these to your .env files ===");
  console.log(`CONTRACT_ADDRESS_SOCIAL=${socioChainAddress}`);
  console.log(`CONTRACT_ADDRESS_TOKEN=${socTokenAddress}`);
  console.log(`VITE_CONTRACT_SOCIAL=${socioChainAddress}`);
  console.log(`VITE_CONTRACT_TOKEN=${socTokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
