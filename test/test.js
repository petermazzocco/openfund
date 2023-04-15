const { ethers } = require("hardhat");
const { expect } = require("chai");
require("@nomicfoundation/hardhat-chai-matchers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdGaming", function () {
  let crowdGaming; // contract instance
  let contractOwner; // contract owner for deployment
  let campaignOwner; // campaign owner
  let user; // user for owner checks
  let user2; // user for campaign deploys
  let donor; // donor for donation checks
  const boostPrice = ethers.utils.parseEther("0.1"); // boost price of 0.1 ETH
  const rateLimit = 0; // rate limit for 24 hours
  const maxCampaignLength = 2592000; // max campaign length of 30 days
  const currentTime = Math.floor(new Date().getTime() / 1000); // current time for launching campaigns

  before(async function () {
    [contractOwner, campaignOwner, user, user2, donor] =
      await ethers.getSigners();

    const CrowdGaming = await ethers.getContractFactory("CrowdGaming");
    crowdGaming = await CrowdGaming.connect(contractOwner).deploy(
      contractOwner.address,
      boostPrice, // 0.1 ETH
      rateLimit, // 1 day
      maxCampaignLength // 30 days
    );
    await crowdGaming.deployed();
  });

  // Launching
  describe("if a user creates a campaign it", function () {
    it("should not allow the user to create a campaign in the past", async function () {
      await expect(
        crowdGaming.connect(campaignOwner).launchCampaign(
          "Campaign 2",
          "Description",
          ethers.utils.parseEther("1"),
          currentTime - 3600,
          currentTime + 86400 // end time is 1 day from now
        )
      ).to.be.revertedWithCustomError(crowdGaming, "InvalidStartDate");
    });
    it("should not allow the user to set an end date in the past", async function () {
      await expect(
        crowdGaming.connect(campaignOwner).launchCampaign(
          "Campaign3",
          "Description",
          ethers.utils.parseEther("1"),
          currentTime + 3600,
          currentTime - 86400 // end time is one day before the start date
        )
      );
    });
    // Should not allow user to create campaign that's longer than 30 days
    it("should not allow the user to create a campaign past the given length for campaigns", async function () {
      await expect(
        crowdGaming.connect(campaignOwner).launchCampaign(
          "Campaign 2",
          "Description",
          ethers.utils.parseEther("1"),
          currentTime + 3600,
          currentTime + 2692000 // end time is over 30 days
        )
      ).to.be.revertedWithCustomError(crowdGaming, "InvalidLength");
    });
    // Should not allow the goal to be less than or equal to 0
    it("should not allow the goal to be less than or equal to 0", async function () {
      await expect(
        crowdGaming.connect(campaignOwner).launchCampaign(
          "Campaign 2",
          "Description",
          ethers.utils.parseEther("0"),
          currentTime + 3600, // start time is 1 hour from now
          currentTime + 86400 // end time is 1 day from now
        )
      ).to.be.revertedWithCustomError(crowdGaming, "InvalidAmount");
    });
  });

  // Cancelling
  describe("if a campaign owner cancels a campaign it", function () {
    // should not allow campaigns that have started to be cancelled
    it("should only allow campaigns that haven't started to be cancelled", async function () {
      await crowdGaming.connect(campaignOwner).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 3600, // start time is 1 hour from now to allow cancellation
        currentTime + 86400 // end time is 1 day from now
      );

      // Cancel campaign
      expect(await crowdGaming.connect(campaignOwner).cancelCampaign(1));
      const campaign = await crowdGaming.campaigns(1);
      expect(campaign.cancelled).to.be.true;
    });
    // should allow only the campaign owner to cancel
    it("should only allow campaign owner to cancel", async function () {
      await crowdGaming.connect(user).launchCampaign(
        "Campaign",
        "Description",
        ethers.utils.parseEther("1"),
        currentTime + 3600, // start time is 1 hour from now to allow cancellation
        currentTime + 86400 // end time is 1 day from now
      );
      // Try to cancel the campaign
      await expect(
        crowdGaming.connect(user2).cancelCampaign(1)
      ).to.be.revertedWithCustomError(crowdGaming, "NotOwner");
      const campaign = await crowdGaming.campaigns(1);
      expect(campaign.cancelled).to.be.true;
    });
  });
});
