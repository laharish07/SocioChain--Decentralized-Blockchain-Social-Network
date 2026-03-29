const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SocioChain Platform", function () {
  let decentSoc, socToken;
  let owner, alice, bob, carol;

  const PROFILE_IPFS = "QmProfileHashAlice123";
  const POST_IPFS    = "QmPostHash456";

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const SocToken  = await ethers.getContractFactory("SocToken");
    socToken = await SocToken.deploy();

    const SocioChain = await ethers.getContractFactory("SocioChain");
    decentSoc = await SocioChain.deploy();

    await decentSoc.setSocToken(await socToken.getAddress());
    await socToken.setSocialContract(await decentSoc.getAddress());
  });

  // ── Profiles ──────────────────────────────────────────

  describe("Profiles", function () {
    it("should create a profile and mint soulbound NFT", async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      const profile = await decentSoc.getProfile(alice.address);

      expect(profile.exists).to.be.true;
      expect(profile.ipfsHash).to.equal(PROFILE_IPFS);
      expect(profile.wallet).to.equal(alice.address);

      // NFT minted
      expect(await decentSoc.balanceOf(alice.address)).to.equal(1);
    });

    it("should prevent duplicate profiles", async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      await expect(
        decentSoc.connect(alice).createProfile(PROFILE_IPFS)
      ).to.be.revertedWith("Profile already exists");
    });

    it("should block NFT transfers (soulbound)", async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      const tokenId = await decentSoc.profileTokenId(alice.address);
      await expect(
        decentSoc.connect(alice).transferFrom(alice.address, bob.address, tokenId)
      ).to.be.revertedWith("Profile NFT is soulbound");
    });

    it("should update profile", async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      await decentSoc.connect(alice).updateProfile("QmNewHash");
      const profile = await decentSoc.getProfile(alice.address);
      expect(profile.ipfsHash).to.equal("QmNewHash");
    });
  });

  // ── Posts ──────────────────────────────────────────

  describe("Posts", function () {
    beforeEach(async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      await decentSoc.connect(bob).createProfile("QmBobProfile");
    });

    it("should create a post", async function () {
      await decentSoc.connect(alice).createPost(POST_IPFS, 0, 0);
      const post = await decentSoc.getPost(1);
      expect(post.author).to.equal(alice.address);
      expect(post.ipfsHash).to.equal(POST_IPFS);
      expect(post.isDeleted).to.be.false;
    });

    it("should like and unlike a post", async function () {
      await decentSoc.connect(alice).createPost(POST_IPFS, 0, 0);
      await decentSoc.connect(bob).toggleLike(1);
      expect((await decentSoc.getPost(1)).likes).to.equal(1);
      expect(await decentSoc.hasLiked(bob.address, 1)).to.be.true;

      await decentSoc.connect(bob).toggleLike(1);
      expect((await decentSoc.getPost(1)).likes).to.equal(0);
    });

    it("should create a comment on a post", async function () {
      await decentSoc.connect(alice).createPost(POST_IPFS, 0, 0);
      await decentSoc.connect(bob).createPost("QmComment", 1 /* COMMENT */, 1);
      expect((await decentSoc.getPost(1)).commentCount).to.equal(1);
    });

    it("should soft delete own post", async function () {
      await decentSoc.connect(alice).createPost(POST_IPFS, 0, 0);
      await decentSoc.connect(alice).deletePost(1);
      expect((await decentSoc.getPost(1)).isDeleted).to.be.true;
    });

    it("should flag a post", async function () {
      await decentSoc.connect(alice).createPost(POST_IPFS, 0, 0);
      await decentSoc.connect(bob).flagPost(1);
      expect(await decentSoc.flagCount(1)).to.equal(1);
    });
  });

  // ── Follow ──────────────────────────────────────────

  describe("Follow Graph", function () {
    beforeEach(async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      await decentSoc.connect(bob).createProfile("QmBobProfile");
    });

    it("should follow another user", async function () {
      await decentSoc.connect(alice).follow(bob.address);
      expect(await decentSoc.isFollowing(alice.address, bob.address)).to.be.true;
      expect((await decentSoc.getProfile(alice.address)).followingCount).to.equal(1);
      expect((await decentSoc.getProfile(bob.address)).followerCount).to.equal(1);
    });

    it("should unfollow", async function () {
      await decentSoc.connect(alice).follow(bob.address);
      await decentSoc.connect(alice).unfollow(bob.address);
      expect(await decentSoc.isFollowing(alice.address, bob.address)).to.be.false;
    });
  });

  // ── Groups ──────────────────────────────────────────

  describe("Groups", function () {
    beforeEach(async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      await decentSoc.connect(bob).createProfile("QmBobProfile");
    });

    it("should create a public group", async function () {
      await decentSoc.connect(alice).createGroup("Web3 Devs", "QmGroupHash", false);
      const group = await decentSoc.groups(1);
      expect(group.name).to.equal("Web3 Devs");
      expect(group.memberCount).to.equal(1);
    });

    it("should join a public group", async function () {
      await decentSoc.connect(alice).createGroup("Web3 Devs", "QmGroupHash", false);
      await decentSoc.connect(bob).joinGroup(1);
      expect((await decentSoc.groups(1)).memberCount).to.equal(2);
      expect(await decentSoc.groupMember(1, bob.address)).to.be.true;
    });

    it("should prevent joining private group directly", async function () {
      await decentSoc.connect(alice).createGroup("Private", "QmGroupHash", true);
      await expect(
        decentSoc.connect(bob).joinGroup(1)
      ).to.be.revertedWith("Private group - needs invite");
    });
  });

  // ── Data Permissions ──────────────────────────────────────────

  describe("Data Permissions", function () {
    it("should grant and revoke data permission", async function () {
      await decentSoc.connect(alice).createProfile(PROFILE_IPFS);
      await decentSoc.connect(alice).grantDataPermission(bob.address);
      expect(await decentSoc.dataPermissions(alice.address, bob.address)).to.be.true;

      await decentSoc.connect(alice).revokeDataPermission(bob.address);
      expect(await decentSoc.dataPermissions(alice.address, bob.address)).to.be.false;
    });
  });

  // ── Token ──────────────────────────────────────────

  describe("SocToken", function () {
    it("should tip another user", async function () {
      // Give alice some SOC (owner has initial supply)
      await socToken.transfer(alice.address, ethers.parseEther("100"));
      await socToken.connect(alice).tip(bob.address, ethers.parseEther("10"));
      expect(await socToken.balanceOf(bob.address)).to.equal(ethers.parseEther("10"));
    });
  });
});
