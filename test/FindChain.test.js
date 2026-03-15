const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FindChain", function () {
  let findChain;
  let owner, user1, user2, voter1, voter2;

  beforeEach(async function () {
    [owner, user1, user2, voter1, voter2] = await ethers.getSigners();
    const FindChain = await ethers.getContractFactory("FindChain");
    findChain = await FindChain.deploy();
    await findChain.waitForDeployment();
  });

  describe("User Registration", function () {
    it("Should register a new user with base reputation", async function () {
      await findChain.connect(user1).registerUser();
      const profile = await findChain.getUserProfile(user1.address);
      expect(profile.isRegistered).to.be.true;
      expect(profile.reputation).to.equal(500);
    });

    it("Should prevent double registration", async function () {
      await findChain.connect(user1).registerUser();
      await expect(findChain.connect(user1).registerUser()).to.be.revertedWith("Already registered");
    });
  });

  describe("Item Registration", function () {
    beforeEach(async function () {
      await findChain.connect(user1).registerUser();
      await findChain.connect(user2).registerUser();
    });

    it("Should register a lost item with reward", async function () {
      const reward = ethers.parseEther("0.1");
      await findChain.connect(user1).reportLostItem(
        "iPhone 15", "Black iPhone 15 Pro", "Electronics",
        "QmImageHash123", "QmMetaHash123",
        "Central Park, NYC", 40712776, -74005974,
        { value: reward }
      );

      const item = await findChain.getItem(1);
      expect(item.title).to.equal("iPhone 15");
      expect(item.reward).to.equal(reward);
      expect(item.itemType).to.equal(0); // Lost
    });

    it("Should register a found item", async function () {
      await findChain.connect(user2).reportFoundItem(
        "iPhone Found", "Black phone near bench", "Electronics",
        "QmImageHash456", "QmMetaHash456",
        "Central Park South", 40713000, -74006000
      );

      const item = await findChain.getItem(1);
      expect(item.title).to.equal("iPhone Found");
      expect(item.itemType).to.equal(1); // Found
    });

    it("Should track user items", async function () {
      await findChain.connect(user1).reportLostItem(
        "Wallet", "Brown leather wallet", "Accessories",
        "QmImg1", "QmMeta1", "Times Square", 40758000, -73985500,
        { value: ethers.parseEther("0.05") }
      );

      const userItems = await findChain.getUserItems(user1.address);
      expect(userItems.length).to.equal(1);
    });
  });

  describe("AI Matching", function () {
    beforeEach(async function () {
      await findChain.connect(user1).registerUser();
      await findChain.connect(user2).registerUser();

      await findChain.connect(user1).reportLostItem(
        "iPhone 15", "Black iPhone", "Electronics",
        "QmImg1", "QmMeta1", "NYC", 40712776, -74005974,
        { value: ethers.parseEther("0.1") }
      );

      await findChain.connect(user2).reportFoundItem(
        "Phone Found", "Black smartphone", "Electronics",
        "QmImg2", "QmMeta2", "NYC Central Park", 40713000, -74006000
      );
    });

    it("Should propose a match with similarity score", async function () {
      await findChain.connect(owner).proposeMatch(1, 2, 8500);

      const match = await findChain.getMatch(1);
      expect(match.lostItemId).to.equal(1);
      expect(match.foundItemId).to.equal(2);
      expect(match.similarityScore).to.equal(8500);
    });

    it("Should confirm match and release reward", async function () {
      await findChain.connect(owner).proposeMatch(1, 2, 9200);
      await findChain.connect(user1).confirmMatch(1);

      const match = await findChain.getMatch(1);
      expect(match.confirmed).to.be.true;

      const lostItem = await findChain.getItem(1);
      expect(lostItem.status).to.equal(2); // Resolved

      const finderProfile = await findChain.getUserProfile(user2.address);
      expect(finderProfile.successfulReturns).to.equal(1);
    });
  });

  describe("Dispute Resolution", function () {
    beforeEach(async function () {
      await findChain.connect(user1).registerUser();
      await findChain.connect(user2).registerUser();
      await findChain.connect(voter1).registerUser();
      await findChain.connect(voter2).registerUser();

      await findChain.connect(user1).reportLostItem(
        "Laptop", "Silver MacBook", "Electronics",
        "QmImg1", "QmMeta1", "Office", 40712000, -74005000,
        { value: ethers.parseEther("0.5") }
      );

      await findChain.connect(user2).reportFoundItem(
        "Laptop Found", "Silver laptop", "Electronics",
        "QmImg2", "QmMeta2", "Cafe", 40713000, -74006000
      );

      await findChain.connect(owner).proposeMatch(1, 2, 7800);
    });

    it("Should open a dispute", async function () {
      await findChain.connect(user1).openDispute(1, "Wrong item", "QmEvidence1");
      const dispute = await findChain.getDispute(1);
      expect(dispute.initiator).to.equal(user1.address);
      expect(dispute.status).to.equal(2); // Voting
    });

    it("Should allow community voting", async function () {
      await findChain.connect(user1).openDispute(1, "Wrong item", "QmEvidence1");
      await findChain.connect(voter1).voteOnDispute(1, true);
      await findChain.connect(voter2).voteOnDispute(1, false);

      const dispute = await findChain.getDispute(1);
      expect(dispute.votesFor).to.equal(1);
      expect(dispute.votesAgainst).to.equal(1);
    });
  });

  describe("Platform Stats", function () {
    it("Should track platform statistics", async function () {
      await findChain.connect(user1).registerUser();
      await findChain.connect(user1).reportLostItem(
        "Keys", "House keys", "Personal",
        "QmImg1", "QmMeta1", "Home", 40712000, -74005000,
        { value: ethers.parseEther("0.01") }
      );

      const stats = await findChain.getPlatformStats();
      expect(stats._totalItems).to.equal(1);
    });
  });
});
