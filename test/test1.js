const { expect } = require("chai");

describe("Token Tests", function() {
    let token;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();
        const NPRToken = await ethers.getContractFactory("NPRToken");
        token = await NPRToken.deploy();
    });

    it("Transfer tokens between accounts", async function() {
        const sendAmount = ethers.parseEther("50");
        await token.transfer(addr1.address, sendAmount);
        expect(await token.balanceOf(addr1.address)).to.equal(sendAmount);
    });
});