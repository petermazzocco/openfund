// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

// Testnet zkEVM Address -

async function main() {
  const OpenFund = await hre.ethers.getContractFactory("OpenFund");
  const deployer = ""; // Add your address
  const amount = ethers.utils.parseEther("0"); // add your amount
  const campaignLength = 2592000; // default 30 days
  const days = campaignLength / 86400; // for console log
  const rateLimit = 86400; // default 24 hours
  const openFund = await OpenFund.deploy(
    deployer,
    amount,
    rateLimit,
    campaignLength
  );

  await openFund.deployed();

  console.log(
    `Contract deployed to ${openFund.address} by ${deployer} with a rate limit of ${rateLimit} and a maximum campaign length of ${days} days `
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
