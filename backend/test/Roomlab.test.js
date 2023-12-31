const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("Room Lab Contract", function () {
    let owner, user, user2, user3;
    let roomlabContract;

    async function deployFixture() {
        [owner, user, user2, user3] = await ethers.getSigners();

        const RoomLabContract = await ethers.getContractFactory("RoomLab");
        roomlabContract = await RoomLabContract.deploy();

        return { roomlabContract, owner, user, user2, user3 }
    }

    async function deployNftMintFixture() {
        [owner, user, user2, user3] = await ethers.getSigners();

        const RoomLabContract = await ethers.getContractFactory("RoomLab");
        roomlabContract = await RoomLabContract.deploy();

        const PRICE_PUBLIC = ethers.parseEther("0.1");
        await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
        await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
        await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
        await roomlabContract.connect(user2).mint({ value: PRICE_PUBLIC });
        await roomlabContract.connect(user2).mint({ value: PRICE_PUBLIC });
        await roomlabContract.connect(user3).mint({ value: PRICE_PUBLIC });

        return { roomlabContract, owner, user, user2, user3 }
    }

    describe("Check Deploy Smart Contract", () => {
        beforeEach(async function () {
            const roomlabContract = await loadFixture(deployFixture);
        });

        it("Check owner Smart Contract", async function () {
            assert.equal(await roomlabContract.owner(), owner.address)
        });

        it("Check name and symbol token", async function () {
            assert.equal(await roomlabContract.name(), "Room Lab")
            assert.equal(await roomlabContract.symbol(), "RLAB")
        });
    })

    describe("Check init value contract token NFT", () => {
        beforeEach(async function () {
            const roomlabContract = await loadFixture(deployFixture);
        });

        it("should not set baseURI if you are not the Owner", async function () {
            await expect(roomlabContract.connect(user).setBaseURI("ipfs://bafybeiacjnyyw73lghuleuqcgctpqfsefse2tfrrryrcihkzkxtia/"))
                .to.be.revertedWithCustomError(roomlabContract, "OwnableUnauthorizedAccount")
                .withArgs(user.address);
        });

        it("should set baseURI", async function () {
            const baseURI = "ipfs://bafybeiacjnyyw73lghuleuqcgctpqwer3oety3lu2tfrrryrcihkzkxtia/"
            await roomlabContract.setBaseURI(baseURI)

            assert.equal(await roomlabContract.getBaseURI(), baseURI)
        });

        it("should not set saleStartTime if you are not the Owner", async function () {
            const timeStamp = 1704300711;
            await expect(roomlabContract.connect(user).setSaleStartTime(timeStamp))
                .to.be.revertedWithCustomError(roomlabContract, "OwnableUnauthorizedAccount")
                .withArgs(user.address);
        });

        it("should set saleStartTime", async function () {
            const timeStamp = 1704300711;
            await roomlabContract.setSaleStartTime(timeStamp)

            assert.equal(await roomlabContract.saleStartTime(), timeStamp)
        });
    })

    describe("Check gift NFT", () => {
        beforeEach(async function () {
            const roomlabContract = await loadFixture(deployFixture);
        });

        it("should not gift tokens if you are not the Owner", async function () {
            await expect(roomlabContract.connect(user).gift(user.address, 2))
                .to.be.revertedWithCustomError(roomlabContract, "OwnableUnauthorizedAccount")
                .withArgs(user.address);
        });

        it("should revert if the total supply exceeds the maximum supply", async function () {
            const _quantity = 100;
            // Mint 10 NFTs to reach the maximum supply
            await roomlabContract.gift(user.address, _quantity);
            await roomlabContract.gift(user2.address, _quantity);
            await roomlabContract.gift(user3.address, _quantity);
            // Attempt to gift one more NFT, expecting a revert
            await expect(roomlabContract.gift(user2.address, 2))
                .to.be.revertedWithCustomError(roomlabContract, "MaxSupplyExceeded");
          });
        

        it("should gift tokens", async function () {
            const _quantity = 2;
            // Mint a token
            await expect(roomlabContract.gift(user.address, _quantity))
                .to.emit(roomlabContract, 'TokenGifted')
                .withArgs(user.address);
            // Assertions
            assert.equal(await roomlabContract.balanceOf(user.address), _quantity);
            assert.equal(await roomlabContract.totalSupply(), _quantity);
        });
    })

    describe("Check function override", () => {
        beforeEach(async function () {
            const roomlabContract = await loadFixture(deployFixture);
        });

        it("should support ERC721 and ERC721Enumerable interfaces", async function () {
            const ERC721InterfaceId = "0x80ac58cd"; // Replace with the actual ERC721 interface ID
            const ERC721EnumerableInterfaceId = "0x780e9d63"; // Replace with the actual ERC721Enumerable interface ID
        
            expect(await roomlabContract.supportsInterface(ERC721InterfaceId)).to.be.true;
            expect(await roomlabContract.supportsInterface(ERC721EnumerableInterfaceId)).to.be.true;
          });
    })

    describe("Check Mint NFT", () => {
        beforeEach(async function () {
            const roomlabContract = await loadFixture(deployFixture);
        });

        // Test case for minting before the sale start time
        it("should revert if trying to mint before the sale start time", async function () {
            const PRICE_PUBLIC = ethers.parseEther("0.1");
            await roomlabContract.setSaleStartTime(1735685999)//31/12/2024 23:59:59

            await expect(roomlabContract.connect(user).mint({ value: PRICE_PUBLIC }))
                .to.be.revertedWithCustomError(roomlabContract, "CannotBuyYet");
        });

        it("should revert if trying to mint with insufficient funds", async function () {
            const PRICE_PUBLIC = ethers.parseEther("0.09");
            await expect(roomlabContract.connect(user).mint({ value: PRICE_PUBLIC}))
                .to.be.revertedWithCustomError(roomlabContract, "NotEnoughtFunds");
        });

        it("should successfully mint NFTs for the user", async function () {
            const PRICE_PUBLIC = ethers.parseEther("0.1");
            // Mint NFT for the user
            await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
            // Check the total supply after minting
            const totalSupplyAfterMint = await roomlabContract.totalSupply();
            assert.equal(totalSupplyAfterMint, 1)
            // Check the owner of the minted NFT
            const ownerOfNFT = await roomlabContract.ownerOf(1);

            assert.equal(ownerOfNFT, user.address)
        });

        it("should return event Token Claimed", async function () {
            const PRICE_PUBLIC = ethers.parseEther("0.1");
            // Mint NFT for the user
            await expect(roomlabContract.connect(user).mint({ value: PRICE_PUBLIC }))
                .to.emit(roomlabContract, 'TokenClaimed')
                .withArgs(user.address, 1);
        });

        it("should return the token URI", async function () {
            const PRICE_PUBLIC = ethers.parseEther("0.1");
            // Mint NFT for the user
            await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
            const result = await roomlabContract.connect(user).tokenURI(1)
            await assert.equal(typeof result === 'string', true)
        });

        it("should not return the token URI if the NFT is not minted", async function () {
            await expect(roomlabContract.connect(user).tokenURI(5))
                .to.be.revertedWithCustomError(roomlabContract, "ERC721NonexistentToken");
        });

        it("should refund excess funds if more funds are sent than required", async function () {
            //Get initial Balance User
            const initialBalance = await ethers.provider.getBalance(user.address);
            // Price over for 1 NFT
            const PRICE_PUBLIC_MORE = ethers.parseEther("0.3");
            // Price Public Sale
            const PRICE_PUBLIC = ethers.parseEther("0.1");
            // Mint 1 NFT for the user, sending excess funds
            const mintTx = await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC_MORE });
            // Get the gas used from the transaction receipt
            const receipt = await ethers.provider.getTransactionReceipt(mintTx.hash);
            const gasUsed = receipt.gasUsed;
            //Get final Balance User after refund if over
            const finalBalance = await ethers.provider.getBalance(user.address);
            //Check final balance with initial less price public, less gas used for the transaction
            assert.equal(finalBalance, initialBalance - PRICE_PUBLIC - gasUsed)
        });

        it("should not mint a NFT if user has already mint 3 NFTS durint the public sale", async function () {
            const PRICE_PUBLIC = ethers.parseEther("0.1");
            await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
            await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
            await roomlabContract.connect(user).mint({ value: PRICE_PUBLIC });
            await expect(roomlabContract.connect(user).mint({ value: PRICE_PUBLIC }))
                .to.be.revertedWithCustomError(roomlabContract, "CannotMintMoreThanThreeNft");
        });

        it("should not mint a NFT if the max supply exceeded", async function () {
            const PRICE_PUBLIC = ethers.parseEther("0.1");
            const _quantity = 100;
            await roomlabContract.gift(user.address, _quantity);
            await roomlabContract.gift(user2.address, _quantity);
            await roomlabContract.gift(user3.address, _quantity);

            await expect(roomlabContract.connect(user).mint({ value: PRICE_PUBLIC }))
                .to.be.revertedWithCustomError(roomlabContract, "MaxSupplyExceeded");
        });

        it("should not return the token URI if the NFT is not minted", async function () {
            await expect(roomlabContract.connect(user).tokenURI(2))
                .to.be.revertedWithCustomError(roomlabContract, "ERC721NonexistentToken");
        });
    })

    describe("Check after Mint NFT", () => {
        beforeEach(async function () {
            const roomlabContract = await loadFixture(deployNftMintFixture);
        });

        it("should not withdraw funds to owner if you are not the Owner", async function () {
            await expect(roomlabContract.connect(user).withdraw())
                .to.be.revertedWithCustomError(roomlabContract, "OwnableUnauthorizedAccount")
                .withArgs(user.address);
        });

        it("should withdraw funds to owner", async function () {
            await roomlabContract.withdraw();
            const contractBalanceAfter = await ethers.provider.getBalance(roomlabContract.target);
            // Check the balances
            assert.equal(contractBalanceAfter, 0)
        });

        it("should revert if user has no tokens", async function () {
            // Ensure the function reverts if the user has no tokens
            await expect(roomlabContract.listTokenIdbyAddress(owner.address))
                .to.be.revertedWithCustomError(roomlabContract, "UserHasNoToken");
        });

        it("should list TokenIds for a given address", async function () {
            // Get the list of TokenIds
            const tokenIdList = await roomlabContract.listTokenIdbyAddress(user.address);
        
            // Check the list
            expect(tokenIdList).to.have.lengthOf(3);
            assert.equal(Array.isArray(tokenIdList), true);
        });
    })
})
