const { ethers } = require("hardhat");
const { expect } = require("chai");
require("@nomicfoundation/hardhat-chai-matchers");
const hre = require("hardhat");
const {
  latestBlock,
} = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("OpenFund", function () {
  async function deployAndTest() {
    [deployer, owner, addr1, addr2, donor] = await ethers.getSigners(); // get signers
    const boostPrice = ethers.utils.parseEther("0.1"); // boost price of 0.1 ETH
    const rateLimit = 86400; // rate limit for 24 hours in seconds
    const maxCampaignLength = 2592000; // max campaign length of 30 days in seconds
    const OpenFund = await ethers.getContractFactory("OpenFund");

    const openFund = await OpenFund.connect(deployer).deploy(
      deployer.address,
      boostPrice, // 0.1 ETH
      rateLimit, // 1 day
      maxCampaignLength // 30 days
    );

    await openFund.deployed();
    // Needed items for testing
    return { openFund, OpenFUnd, deployer, owner, addr1, addr2, donor };
  }
  it("should set the creator as the campaign owner", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Bio",
        ethers.utils.parseEther("1"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in future
      )
    ).to.emit(openFund, "Launch");
    // Get the latest campaign launched
    const campaignId = await openFund.totalCampaigns();
    const campaign = await openFund.campaigns(campaignId);
    // Check that the owner is set correctly
    expect(campaign.owner).to.equal(owner.address);
  });

  it("should prevent the user from creating a campaign in the past", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Bio",
        ethers.utils.parseEther("1"),
        currentTime - 3600, // 1 hour in past
        currentTime + 86400 // 1 day in future
      )
    ).to.be.revertedWithCustomError(openFund, "InvalidStartDate");
  });
  it("should prevent the user from setting an end date in the past", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Bio",
        ethers.utils.parseEther("1"),
        currentTime + 100, // 100 seconds in the future
        currentTime - 86400 // 1 day in the past
      )
    ).to.be.revertedWithCustomError(openFund, "InvalidEndDate");
  });
  it("should prevent the user from creating a campaign longer than the limit", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Bio",
        ethers.utils.parseEther("1"),
        currentTime + 100,
        currentTime + 2692000 // end time is over 30 days (which is default setting)
      )
    ).to.be.revertedWithCustomError(openFund, "InvalidLength");
  });
  it("should prevent a campaign goal that is less than or equal to 0", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("0"),
        currentTime + 100, //100 seconds in future
        currentTime + 86400 // 1 day in the future
      )
    ).to.be.revertedWithCustomError(openFund, "InvalidAmount");
  });
  it("should prevent non-owners from cancelling a campaign", async function () {
    const { owner, addr1, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // New campaign from owner
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 100, //100 seconds in future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    // Attempt cancelling from non-owner address
    await expect(
      openFund.connect(addr1).cancelCampaign(1)
    ).to.be.revertedWithCustomError(openFund, "NotOwner");
  });
  it("should only allow cancelling a campaign before it's launched", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 3600, // 1 hour in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");

    // Cancel before launch
    expect(await openFund.connect(owner).cancelCampaign(1));
    const campaign = await openFund.campaigns(1);
    expect(campaign.cancelled).to.be.true;
  });
  it("should only allow donations above 0", async function () {
    const { owner, donor, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");

    // Attempt donation of 0
    const amount = ethers.utils.parseEther("0");
    await expect(
      openFund.connect(donor).pledgeTo(1, { value: amount })
    ).to.be.revertedWithCustomError(openFund, "InvalidAmount");
  });
  it("should prevent a donation to an expired campaign", async function () {
    const { owner, donor, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");

    hre.ethers.provider.send("evm_increaseTime", [90000]); // move time to after campaign
    hre.ethers.provider.send("evm_mine");

    // Attempt donation after campaign expired
    const amount = ethers.utils.parseEther("1");
    await expect(
      openFund.connect(donor).pledgeTo(1, { value: amount })
    ).to.be.revertedWithCustomError(openFund, "InvalidEndDate");
  });
  it("should prevent a donation to an upcoming campaign", async function () {
    const { owner, donor, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;

    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");

    hre.ethers.provider.send("evm_increaseTime", [10]); // move time to before campaign
    hre.ethers.provider.send("evm_mine");

    // Attempt donation after campaign expired
    const amount = ethers.utils.parseEther("1");
    await expect(
      openFund.connect(donor).pledgeTo(1, { value: amount })
    ).to.be.revertedWithCustomError(openFund, "InvalidStartDate");
  });
  it("should only allow campaign owner to withdraw funds if goal is met and campaign has expired", async function () {
    const { owner, donor, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // Create campaign
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    // Donate to meet goal
    hre.ethers.provider.send("evm_increaseTime", [100]);
    hre.ethers.provider.send("evm_mine");
    const amount = ethers.utils.parseEther("1.5");
    expect(await openFund.connect(donor).pledgeTo(1, { value: amount }));
    const campaign = await openFund.campaigns(1);
    expect(campaign.pledged).to.be.greaterThanOrEqual(campaign.goal);

    // Withdraw funds
    hre.ethers.provider.send("evm_increaseTime", [86800]); // move past campaign end date
    hre.ethers.provider.send("evm_mine");
    await expect(openFund.connect(owner).withdrawFrom(1)).to.emit(
      openFund,
      "Withdraw"
    );
    const successfulCampaign = await openFund.campaigns(1);
    expect(successfulCampaign.claimed).to.be.true;
  });
  it("should prevent withdrawing from a failed campaign", async function () {
    const { owner, donor, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // Create campaign
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("2"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    // Donate
    hre.ethers.provider.send("evm_increaseTime", [100]);
    hre.ethers.provider.send("evm_mine");
    const amount = ethers.utils.parseEther("1");
    expect(await openFund.connect(donor).pledgeTo(1, { value: amount }));
    const campaign = await openFund.campaigns(1);
    expect(campaign.pledged).to.be.lessThan(campaign.goal);

    // Withdraw funds
    hre.ethers.provider.send("evm_increaseTime", [86800]); // move past campaign end date
    hre.ethers.provider.send("evm_mine");
    await expect(
      openFund.connect(owner).withdrawFrom(1)
    ).to.be.revertedWithCustomError(openFund, "FailedCampaign");
    const failedCampaign = await openFund.campaigns(1);
    expect(failedCampaign.claimed).to.be.false;
  });
  it("should only allow a refund if campaign goal failed and is expired", async function () {
    const { owner, donor, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // Create campaign
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("2"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    // Donate
    hre.ethers.provider.send("evm_increaseTime", [100]);
    hre.ethers.provider.send("evm_mine");
    const amount = ethers.utils.parseEther("1");
    expect(await openFund.connect(donor).pledgeTo(1, { value: amount }));
    const campaign = await openFund.campaigns(1);
    expect(campaign.pledged).to.be.lessThan(campaign.goal);
    // Refund funds
    hre.ethers.provider.send("evm_increaseTime", [86800]); // move past campaign end date
    hre.ethers.provider.send("evm_mine");
    expect(await openFund.connect(donor).refund(1));
  });
  it("should prevent a refund if campaign goal was met and is expired", async function () {
    const { owner, donor, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // Create campaign
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("2"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    // Donate
    hre.ethers.provider.send("evm_increaseTime", [100]);
    hre.ethers.provider.send("evm_mine");
    const amount = ethers.utils.parseEther("2"); // Goal is met
    expect(await openFund.connect(donor).pledgeTo(1, { value: amount }));
    const campaign = await openFund.campaigns(1);
    expect(campaign.pledged).to.be.greaterThanOrEqual(campaign.goal);
    // Refund funds
    hre.ethers.provider.send("evm_increaseTime", [86800]); // move past campaign end date
    hre.ethers.provider.send("evm_mine");
    await expect(
      openFund.connect(donor).refund(1)
    ).to.be.revertedWithCustomError(openFund, "GoalMet");
  });
  it("should prevent Boosting if price isn't correct", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // Create campaign
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("2"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    // Attempt boost with invalid amount (0.1 is the right amount for reference)
    hre.ethers.provider.send("evm_increaseTime", [100]);
    hre.ethers.provider.send("evm_mine");
    const amount = ethers.utils.parseEther("0.0002"); // Less than boost price
    await expect(
      openFund.connect(owner).boost(1, { value: amount })
    ).to.be.revertedWithCustomError(openFund, "InvalidAmount");
  });
  it("should only allow Boosting to campaigns that are active", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // Create campaign
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("2"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    const amount = ethers.utils.parseEther("0.1");

    // Attempt boost for campaign that hasn't started
    hre.ethers.provider.send("evm_increaseTime", [50]);
    hre.ethers.provider.send("evm_mine");
    await expect(
      openFund.connect(owner).boost(1, { value: amount })
    ).to.be.revertedWithCustomError(openFund, "InvalidStartDate");

    // Attempt boost for campaign that has ended
    hre.ethers.provider.send("evm_increaseTime", [86800]);
    hre.ethers.provider.send("evm_mine");
    await expect(
      openFund.connect(owner).boost(1, { value: amount })
    ).to.be.revertedWithCustomError(openFund, "InvalidEndDate");
  });
  it("should prevent boosting a cancelled campaign", async function () {
    const { owner, openFund } = await loadFixture(deployAndTest);
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const lastBlock = await hre.ethers.provider.getBlock(blockNumber);
    const currentTime = lastBlock.timestamp;
    // Create campaign
    await expect(
      openFund.connect(owner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("2"),
        currentTime + 100, // 100 seconds in the future
        currentTime + 86400 // 1 day in the future
      )
    ).to.emit(openFund, "Launch");
    const amount = ethers.utils.parseEther("0.1");

    // Attempt to boost to a cancelled campaign
    hre.ethers.provider.send("evm_increaseTime", [50]);
    hre.ethers.provider.send("evm_mine");
    await expect(openFund.connect(owner).cancelCampaign(1)).to.emit(
      openFund,
      "Cancel"
    );
    const campaign = await openFund.campaigns(1);
    expect(await campaign.cancelled).to.be.true;
    await expect(
      openFund.connect(owner).boost(1, { value: amount })
    ).to.be.revertedWithCustomError(openFund, "AlreadyCancelled");
  });
});
