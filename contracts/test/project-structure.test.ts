import { expect } from "chai";
import { ethers } from "hardhat";

describe("Project Structure", function () {
  it("should have hardhat config with localhost network", async function () {
    const config = await import("../hardhat.config");
    expect(config.default.networks).to.have.property("localhost");
    expect(config.default.networks.localhost.url).to.equal("http://127.0.0.1:8545");
  });

  it("should have solidity version 0.8.28 configured", async function () {
    const config = await import("../hardhat.config");
    const solidityConfig = config.default.solidity;

    if (typeof solidityConfig === "string") {
      expect(solidityConfig).to.equal("0.8.28");
    } else {
      expect(solidityConfig.version).to.equal("0.8.28");
    }
  });

  it("should compile without errors", async function () {
    // This test will fail until we create a contract
    await ethers.getContractFactory("Vault");
  });
});
