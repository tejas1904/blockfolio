import {wm} from "./main.js";

let portfolioHtmlListElement = null;
let marketHtmlListElement = null;
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("conect_button").addEventListener("click", connectMetaMaskAndContract);
    document.getElementById("create_wallet_button").addEventListener("click" , createWallet);
    document.getElementById("buy_stock_btn").addEventListener("click", buyStock);
    document.getElementById("sell_stock_btn").addEventListener("click", listStockForSale);
    document.getElementById("get_updated_portfolio_btn").addEventListener("click", getUpdatedPortfolio);
    // document.getElementById("clear_cookies_btn").addEventListener("click", clearCookie);
    document.getElementById("get_updated_market_btn").addEventListener("click", getUpdatedMarketListings);
    document.getElementById("list_token_button").addEventListener("click", listTokenForSale);
    document.getElementById("buy_token_button").addEventListener("click", buyToken);
    portfolioHtmlListElement = document.getElementById("portfolio_list");
    marketHtmlListElement = document.getElementById("market_list");
    
});

function clearCookie() {
    // Set the cookie to expire in the past
    document.cookie = "portfolioData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    console.log("User data cleared from cookies.");
}

function setVisibilityOfDivs(){
    if (wm.hasMinted){
        document.getElementById("sell_token_div").style.visibility= "visible";
        document.getElementById("buy_token_div").style.visibility= "hidden";
    }
    else{
        document.getElementById("sell_token_div").style.visibility= "hidden";
        document.getElementById("buy_token_div").style.visibility= "visible";
    }
}

async function checkConditions() {
    if (!wm.walletConnected) {
        alert("Please connect your wallet (metamask) first.");
        return false;
    }
    if (!wm.hasMinted) {
        alert("Please create your portfolio first.");
        return false;
    }
    return true;
}

async function connectMetaMaskAndContract() {
    await wm.connectMetaMaskAndContract();
    let textbox = document.getElementById("connectionstatus");
    textbox.textContent = `Connected! to account: ${await wm.signer.getAddress()}`;

    if (wm.hasMinted == true) {
        let textbox = document.getElementById("tokenid");
        const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
        textbox.textContent = tokenId.toString();
        setVisibilityOfDivs();
    }
}
async function createWallet() {
    if (!wm.walletConnected) {
        alert("Please connect your wallet (MetaMask) first.");
        return false;
    }

    console.log("The status of the wallet is:", wm.hasMinted);

    if (!wm.hasMinted) {
        try {
            const tx = await wm.portfolioContract.mint();
            console.log("Transaction sent:", tx);
            
            const receipt = await tx.wait();
            console.log("Transaction mined in block:", receipt.blockNumber);
            
            alert("Wallet created successfully!");
            wm.hasMinted = true;

            let textbox = document.getElementById("tokenid");
            const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
            textbox.textContent = tokenId.toString();
        } catch (error) {
            console.error("Transaction failed:", error);
        }
    } else {
        alert("Portfolio already created!");

        let textbox = document.getElementById("tokenid");
        const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
        textbox.textContent = tokenId.toString();
    }
    setVisibilityOfDivs();
}

async function getPrice(address, count) {
    try {
        const price = await wm.portfolioContract.getPrice(address, count);
        console.log("Price is:", price.toString());
        return price;
    } catch (error) {
        console.error("Error fetching price:", error);

        let errorMessage = "Transaction failed.";
        
        if (error.reason) {
            errorMessage = error.reason;  // Extract reason if available
        } else if (error.data && error.data.message) {
            errorMessage = error.data.message;  // Some providers put the message here
        }

        alert(errorMessage);
        throw error;
    }
}



async function buyStock() {
    if (!await checkConditions()) {
        return;
    }

    const stockName = document.getElementById("stockCompany").value;
    try {
        let stockFtAddress = wm.stockNameToAddress[stockName.toString()];
    }
    catch (error) {
        console.error("nvalid stock name or address not found.:", error);
        alert("Invalid stock name or address not found.");
        return;
    }
    const stockFtAddress = wm.stockNameToAddress[stockName.toString()];

    const count = document.getElementById("stockQuantity").value;
    
    console.log("buying stock",stockName.toString()," with address:", stockFtAddress, "and count:", count);
    const price = await getPrice(stockFtAddress,count);
    console.log("price to buy is:", price.toString());

    
    const tx = await wm.portfolioContract.buy(stockFtAddress,count,{value:price});
    console.log("Transaction sent:", tx);
    try {
        const receipt = await tx.wait();
        console.log("Transaction mined in block:", receipt.blockNumber);
        alert("Stock bought successfully!");
        await getUpdatedPortfolio(); 
    } catch (error) {
        console.error("Transaction failed:", error);
    }
}

async function getUpdatedPortfolio() {
    if (!await checkConditions()) {
        return;
    }
    const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
    
    portfolioHtmlListElement.innerHTML = "";
    for (let key in wm.stockNameToAddress) {
        const stockFtAddress = wm.stockNameToAddress[key];
        let status = await wm.portfolioContract._tokenHasStock(tokenId, stockFtAddress)
        
        const stockContract = new ethers.Contract(stockFtAddress,wm.stockContractABI,wm.signer);
        const quantity = await stockContract.balanceOf(await wm.signer.getAddress());
        
        console.log("owns stock?", key, "is:", status, "quantity:", quantity.toString());
        let listItem = document.createElement("li");
        listItem.textContent = `owns stock? ${key}: ${status} quantity: ${quantity.toString()}`;
        portfolioHtmlListElement.appendChild(listItem);
    }
}

async function listStockForSale(){
    if (!await checkConditions()) {
        return;
    }

    // get the paramaters for the list for sale
    const stockName = document.getElementById("stockCompany").value;
    try {
        let stockFtAddress = wm.stockNameToAddress[stockName.toString()];
    }
    catch (error) {
        console.error("nvalid stock name or address not found.:", error);
        alert("Invalid stock name or address not found.");
        return;
    }
    const stockFtAddress = wm.stockNameToAddress[stockName.toString()];
    const count = document.getElementById("stockQuantity").value;

    //first check if the user has the stock and also if user has enough stock and if hes 
    try {
        const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
        const stockContract = new ethers.Contract(stockFtAddress,wm.stockContractABI,wm.signer);
        const balance  = await stockContract.balanceOf(await wm.signer.getAddress());
        console.log("quantity of stock owned:", balance.toString());
        if (balance.isZero()) { 
            alert("You do not own any stock of this company.");
            return;
        }
        if (balance.lt(count)) { 
            alert("You do not own enough stock of this company as what you're trying to list.");
            return;
        }
        const alreadyListed = await wm.portfolioContract._userListedStocks(await wm.signer.getAddress(), stockFtAddress);
        console.log("already listed + count:", alreadyListed.add(count).toString());
        if (alreadyListed.add(count).gt(balance)) {
            alert("Total amount you're trying to list exceeds your owned balance.");
            return;
        }
    } catch (error) {
        console.error("Error fetching stock balance of the user:", error);
        alert("Error fetching stock balance of the user");
        return;
    }

    // approve the portfolio contract as an approved spender in the stock contract
    try {
        const stockContract = new ethers.Contract(stockFtAddress, wm.stockContractABI, wm.signer);
    
        const allowance = await stockContract.allowance(await wm.signer.getAddress(), wm.portfolioContractAddress);
        const totalApproval = ethers.BigNumber.from(count).add(allowance); // add the count to the old allowance
    
        const tx = await stockContract.approve(wm.portfolioContractAddress, totalApproval);
        const receipt = await tx.wait(); // wait for transaction to be mined

        console.log(`The portfolio contract is approved to transfer ${totalApproval.toString()} stock(s).`);
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    } catch (error) {
        console.error("Error in approving the portfolio to spend the stock:", error);
        return;
    }
    

    // list the stock for sale
    try{
        const tx = await wm.portfolioContract.list_stock_to_sell(stockFtAddress, count);
        console.log("Transaction sent:", tx);
        const receipt = await tx.wait();
        console.log("Transaction mined in block:", receipt.blockNumber);
        alert("Stock listed for sale successfully!");
    }
    catch(error){
        console.error("Error in listing the stock for sale:", error);
        alert("Error in listing the stock for sale.");
    }
}

async function getUpdatedMarketListings() {
    if (!await checkConditions()) {
        return;
    }
    
    marketHtmlListElement.innerHTML = "";
    for (let key in wm.stockNameToAddress) {
        const stockFtAddress = wm.stockNameToAddress[key];
        try {
            const totalStockForSale = await wm.portfolioContract._totalSellCount(stockFtAddress);
            
            console.log(`Stock : ${key}, for Sale: ${totalStockForSale.toString()}`);
            let listItem = document.createElement("li");
            listItem.textContent = `Stock : ${key}, for Sale: ${totalStockForSale.toString()}`;
            marketHtmlListElement.appendChild(listItem);
            
        } catch (error) {
            console.error(`Error fetching listings for ${key}:`, error);
        }
    }
}

async function listTokenForSale() {
    const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());

    // approve the portfolio as the seller in the sotck contracts in the tokenId
    const addresses = await wm.portfolioContract.getTokenStockAddresses(tokenId);
    console.log("addresses of the stocks in the portfolio:", addresses);
    for (let i = 0; i < addresses.length; i++) {
        const stockFtAddress = addresses[i];
        const stockContract = new ethers.Contract(stockFtAddress,wm.stockContractABI,wm.signer);
        const balance = await stockContract.balanceOf(await wm.signer.getAddress());
        if (!balance.isZero())
            {
                try{
                    const tx = await stockContract.approve(wm.portfolioContractAddress, balance);
                    const receipt = await tx.wait(); // wait for transaction to be mined

                    console.log(`The portfolio contract is approved to transfer ${balance.toString()} stock(s).`);
                }
                catch(error){
                    console.error("Error in setting the allowance in the stock contract:", error);
                    alert(error.data.message);
                    return;
                }
            }
    }

    const tx = await wm.portfolioContract.listPortfolioToSell();
    const receipt = await tx.wait();
}

async function buyToken() {
    if (!wm.walletConnected) {
        alert("Please connect your wallet (metamask) first.");
        return ;
    }
    const tokenIdToBuy = document.getElementById("buy_token_number_inp").value;
    
    //calculate the toal price of the tokenId
    let totalPrice = ethers.BigNumber.from(0);
    const addresses = await wm.portfolioContract.getTokenStockAddresses(tokenIdToBuy);
    console.log("addresses of the stocks in the portfolio:", addresses);
    for (let i = 0; i < addresses.length; i++) {
        const stockFtAddress = addresses[i];
        const stockContract = new ethers.Contract(stockFtAddress,wm.stockContractABI,wm.signer);
        const portfolioOwnerAddress = await wm.portfolioContract._listedPortfolioOwner(tokenIdToBuy);
        const balance = await stockContract.balanceOf(portfolioOwnerAddress);
        const unit_price = await wm.portfolioContract.getAPrice(stockFtAddress);
        console.log("unit price of the stock:", unit_price.toString());
        console.log("quantity of stock owned:", balance.toString());
        totalPrice = totalPrice.add(unit_price.mul(balance));
    }
    console.log("total value of the tokenId:", totalPrice.toString());

    try {
        const tx = await wm.portfolioContract.buyPortfolio(tokenIdToBuy,{value:totalPrice});
        const receipt = await tx.wait();
        console.log("Transaction mined in block:", receipt.blockNumber);
        alert("Portfolio bought successfully!");
        
    } catch (error) {
        console.error("Error :", error);

        let errorMessage = "Transaction failed.";
        
        if (error.reason) {
            errorMessage = error.reason;  // Extract reason if available
        } else if (error.data && error.data.message) {
            errorMessage = error.data.message;  // Some providers put the message here
        }

        alert(errorMessage);
        return;
    }

    const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
    wm.hasMinted = true;
    let textbox = document.getElementById("tokenid");
    textbox.textContent = tokenId.toString();
    setVisibilityOfDivs();
    await getUpdatedPortfolio();

}