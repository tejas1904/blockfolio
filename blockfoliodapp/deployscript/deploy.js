const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const signers = await hre.ethers.getSigners();
    
    if (signers.length < 19) {
        throw new Error("Not enough signers available! Ensure you have at least 19 signers.");
    }

    // Deploy the Portfolio contract
    const deployer14 = signers[13];
    console.log(`Deploying Portfolio contract with address: ${deployer14.address}`);
    
    const Portfolio = await hre.ethers.getContractFactory("portfolio");
    const portfolioContract = await Portfolio.connect(deployer14).deploy();
    await portfolioContract.waitForDeployment();
    
    const portfolioAddress = await portfolioContract.getAddress();
    console.log(`Portfolio contract deployed to: ${portfolioAddress}`);

    // Deploy the stock contracts using signers 14-18 (indexes 14 to 18)
    let companies = ["nvidia", "tesla", "microsoft", "apple", "google"];
    let stockNameToAddress = {};
    let stockContracts = {};
    
    for (let i = 0; i < companies.length; i++) {
        const deployer = signers[i + 14];
        console.log(`Deploying ${companies[i]} contract with address: ${deployer.address}`);
        
        const Stock = await hre.ethers.getContractFactory("stock");
        
        let name = companies[i];
        let symbol = companies[i].toUpperCase();
        
        const stockContract = await Stock.connect(deployer).deploy(name, symbol);
        await stockContract.waitForDeployment();
        
        const stockAddress = await stockContract.getAddress();
        stockNameToAddress[name] = stockAddress;
        stockContracts[name] = stockContract;
        
        console.log(`${companies[i]} contract deployed to: ${stockAddress}`);
        
        // Mint 1000 stock tokens to the deployer of the stock contract
        console.log(`Minting 1000 ${name} tokens to ${deployer.address}`);
        const mintTx = await stockContract.mint(deployer.address, 1000);
        await mintTx.wait();
        console.log(`Minted 1000 ${name} tokens to ${deployer.address}`);
    }

    // Save the deployed contract addresses to a JSON file, it overwrites the old file
    fs.writeFileSync("stockNameToAddress.json", JSON.stringify(stockNameToAddress));

    // Create portfolios for stock owners and list the stocks for sale
    for (let i = 0; i < companies.length; i++) {
        const stockOwner = signers[i + 14];
        const companyName = companies[i];
        const stockContract = stockContracts[companyName];
        const stockAddress = stockNameToAddress[companyName];
        
        console.log(`Creating portfolio for ${companyName} owner: ${stockOwner.address}`);
        
        // Create portfolio (mint NFT)
        const mintPortfolioTx = await portfolioContract.connect(stockOwner).mint();
        await mintPortfolioTx.wait();
        
        // Token ID for this owner will be i+1 (since tokens start at 1)
        const tokenId = i + 1;
        console.log(`Portfolio created with token ID: ${tokenId}`);
        
        // Approve portfolio contract to transfer stock on behalf of the owner
        console.log(`Approving portfolio contract to transfer ${companyName} tokens`);
        const approveTx = await stockContract.connect(stockOwner).approve(portfolioAddress, 1000);
        await approveTx.wait();
        
        // Update portfolio with stock ownership
        console.log(`Updating portfolio with ${companyName} stock ownership`);
        const updateTx = await portfolioContract.connect(stockOwner).updatePortfolio(stockAddress);
        await updateTx.wait();
        
        // List stock for sale (list all 1000 tokens)
        console.log(`Listing 1000 ${companyName} tokens for sale`);
        const listingTx = await portfolioContract.connect(stockOwner).list_stock_to_sell(stockAddress, 1000);
        await listingTx.wait();
        
        console.log(`Successfully listed 1000 ${companyName} tokens for sale`);

    }

    console.log("Deployment, minting, and listing complete!");
}

// Execute the deployment script
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});