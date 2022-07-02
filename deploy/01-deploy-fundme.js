const { network } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    // DECIMALS,
    // INITIAL_ANSWER,
} = require("../helper-hardhat-config")
const { verify } = require("../Utils/Verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    //coming frm HRE
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        //fetching the previously run mock test with get function of hardhat
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        // const ethUsdAggregator = await deploy("MockV3Aggregator", {
        //     from: deployer,
        //     args: [DECIMALS, INITIAL_ANSWER],
        //     log: true,
        // })
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }
    args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
    }
    log("--------------------------------------------------------------")
}

module.exports.tags = ["all", "fundme"]
