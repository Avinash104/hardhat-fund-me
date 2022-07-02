const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          let sendValue = ethers.utils.parseEther("1")

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", async function () {
              it("sets the aggregator address correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", async function () {
              it("Fails if not enough ETH is sent", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Didn't semd enough..!!"
                  )
              })

              it("Check if the data structure is updated", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("Check if the array is updated with sender", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })

              it("Check if total amount is properly withdrawn", async function () {
                  //Arrange
                  const initialFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const initialDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Assert
                  assert.equal(endingFundMeBal, 0)
                  assert.equal(
                      initialFundMeBal.add(initialDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )
              })

              it("allows to work with multiple accounts", async function () {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  //Arrange
                  const initialFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const initialDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Assert
                  assert.equal(endingFundMeBal, 0)
                  assert.equal(
                      initialFundMeBal.add(initialDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )
                  //getFunder array is reset
                  await expect(fundMe.getFunder(0)).to.be.reverted
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  attacker = accounts[1]
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  )
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })
          })
      })
