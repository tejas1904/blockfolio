import { wm } from "/src/core/walletManager.js";

import {
  displayBuyStockCounter,
  displaySellStockCounter,
  closeBuyStockPopup,
  closeSellStockPopup
} from "/src/ui/popups.js";

import { checkConditions, setVisibilityOfDivs } from "/src/services/conditions.js";
import { updateTransactionToDb, updateStockListToDb } from "/src/services/db.js";


let portfolioHtmlListElement = null;
let marketHtmlListElement = null;
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("connect_button").addEventListener("click", connectMetaMaskAndContract);
    //document.getElementById("create_wallet_button").addEventListener("click", createWallet);
    document.getElementById("transaction_history_button").addEventListener("click",function() {window.location.replace("/historyPage.html")} );
    document.getElementById("buy_stock_btn").addEventListener("click", buyStock);
    document.getElementById("cancel_buy_stock_btn").addEventListener("click", closeBuyStockPopup);
    document.getElementById("sell_stock_btn").addEventListener("click", listStockForSale);
    document.getElementById("cancel_sell_stock_btn").addEventListener("click", closeSellStockPopup);
    //document.getElementById("buy_token_button").addEventListener("click", buyToken);
    document.getElementById("list_token_button").addEventListener("click", listTokenForSale);
    window.addEventListener("load", connectMetaMaskAndContract);

});

function clearCookie() {
    // Set the cookie to expire in the past
    document.cookie = "portfolioData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    console.log("User data cleared from cookies.");
}

async function connectMetaMaskAndContract() {
    await wm.connectMetaMaskAndContract();
    let text = document.getElementById("connect_button").querySelector("span");
    text.textContent = 'Wallet Connected';

    if (wm.hasMinted == true) {
        let textbox = document.getElementById("token_id_text");
        const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
        textbox.textContent = tokenId.toString();
        getUpdatedPortfolio();
    }
    else{
        window.location.href = "signup.html";
    }
    
}

export async function createWallet() {
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

            let textbox = document.getElementById("token_id_text");
            const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
            textbox.textContent = tokenId.toString();
        } catch (error) {
            console.error("Transaction failed:", error);
        }
    } else {
        alert("Portfolio already created!");

        let textbox = document.getElementById("token_id_text");
        const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
        textbox.textContent = tokenId.toString();
    }

    getUpdatedPortfolio();
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

window.displayBuyStockCounter = displayBuyStockCounter;
window.displaySellStockCounter = displaySellStockCounter;

  
async function buyStock() {
    if (!await checkConditions()) {
        return;
    }

    const buyPopup = document.getElementById('stockBuyPopup');
    const stockName = buyPopup.querySelector('.stock__scrip span:nth-child(2)').textContent;
    const count = buyPopup.querySelector('#counter_value').textContent;

    try {
        let stockFtAddress = wm.stockNameToAddress[stockName.toString()];
    }
    catch (error) {
        console.error("Invalid stock name or address not found:", error);
        alert("Invalid stock name or address not found.");
        return;
    }
    const stockFtAddress = wm.stockNameToAddress[stockName.toString()];

    
    console.log("buying stock", stockName.toString(), " with address:", stockFtAddress, "and count:", count);
    const price = await getPrice(stockFtAddress, count);
    console.log("price to buy is:", price.toString());

    // First, we need to approve the portfolio contract to spend our payment tokens
    try {
        const yodaContract = new ethers.Contract(wm.yodaContractAddress, wm.yodaContractABI, wm.signer);
        const tx = await yodaContract.approve(wm.portfolioContractAddress, price);
        const receipt = await tx.wait(); // wait for transaction to be mined
        console.log(`The portfolio contract is approved to transfer ${price.toString()} payment tokens`);
    } catch (error) {
        console.error("Error in approving payment token transfer:", error);
        alert("Error in approving payment token transfer.");
        return;
    }
    
    // Then call the buy function (without sending ETH)
    try {
        const tx = await wm.portfolioContract.buy(stockFtAddress, count);
        console.log("Transaction sent:", tx);
        const receipt = await tx.wait();
        
        console.log("Transaction mined in block:", receipt.blockNumber);
        alert("Stock bought successfully!");
        
        await updateTransactionToDb(receipt);
        await getUpdatedPortfolio(); 
        
    } catch (error) {
        console.error("Transaction failed:", error);
        
        let errorMessage = "Transaction failed.";
        if (error.reason) {
            errorMessage = error.reason;
        } else if (error.data && error.data.message) {
            errorMessage = error.data.message;
        }
        
        alert(errorMessage);
    }
    closeBuyStockPopup();
}

async function fetchStockPrice(companyName) {
    try {
        const response = await fetch('/data/stockprice.json'); 
        const stockPrices = await response.json();

        if (stockPrices[companyName]) {
            return stockPrices[companyName]; 
        } else {
            console.error(`No stock price found for ${companyName}`);
            return 193;
        }
    } catch (error) {
        console.error("Error fetching stock price:", error);
        return 193; 
    }
}

async function getUpdatedPortfolio() {
    if (!await checkConditions()) {
        return;
    }

    //update some ui elements
    const yodaContract = await new ethers.Contract(wm.yodaContractAddress, wm.yodaContractABI, wm.signer);
    document.getElementById("did").textContent = (await wm.signer.getAddress()).slice(0, 40) ;
    
    const balance = await yodaContract.balanceOf(await wm.signer.getAddress())/100;
    document.getElementById("yoda_balance").textContent = balance.toString();
    

    console.log("getting updated portfolio");
    const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
    const portfolioContainer = document.querySelector(".grid_item_17.portfolio"); // Select the portfolio div
    portfolioContainer.innerHTML = ""; // Clear existing stock cards

    let count = 0;
    let totalPrice = 0;
    let totalPriceUSD = 0;
    for (let key in wm.stockNameToAddress) {
        count +=1 ;
        const stockFtAddress = wm.stockNameToAddress[key];
        let status = await wm.portfolioContract._tokenHasStock(tokenId, stockFtAddress)
        
        const stockContract = new ethers.Contract(stockFtAddress,wm.stockContractABI,wm.signer);
        const quantity = (await stockContract.balanceOf(await wm.signer.getAddress())).toNumber();
        let price = (await wm.portfolioContract.getAPrice(stockFtAddress)).toNumber();
        price = price * quantity;
        totalPrice = totalPrice  + price;
        console.log("total price of the stock:", totalPrice.toString());
        
        let stockPriceUSD = await fetchStockPrice(key);
        totalPriceUSD = totalPriceUSD + stockPriceUSD * quantity;
        console.log("total price of the stock in USD:", totalPriceUSD.toString());
        
        console.log("owns stock?", key, "is:", status, "quantity:", quantity.toString());
        
        let stockCard = document.createElement("div");
        stockCard.classList.add("stock__card__base");
        stockCard.innerHTML = `
            <img class="img_bg" src="assets/icons/${key}.png" alt="">

            <div class="stock__card">

                <div class="card__left">

                    <div class="left__stock">

                        <img src="assets/icons/${key}.png" alt="">

                        <div class="stock_qty">

                            <span>${quantity.toString()}</span>
                            <span>QTY</span>

                        </div>

                    </div>

                    <div class="left__info">

                        <div class="info__name stock-meta">
                            <span>${key} Inc</span>
                            <span id = "stock_card_company_name">${key}</span>
                        </div>

                        <div class="info__price stock-meta">
                            <span>Stock Price</span>
                            <span>${stockPriceUSD.toFixed(2)}</span>
                        </div>

                    </div>

                </div>

                <div class="dotted"></div>

                <div class="card__right">

                    <div class="right__pl">
                        <span>Total P/L</span>
                        <span>$ 100,000</span>
                    </div>

                    <div class="chart">
                        <svg viewBox="0 0 200 100" class="line">
                          <path d="M0,80 Q50,30 100,40 Q150,50 200,20" stroke="green" stroke-width="3" fill="none" />
                        </svg>
                        
                        <div class="label top">
                          <span>$193.67</span> ▶
                        </div>
                        
                        <div class="label bottom">
                          ◀ <span>$101.68</span>
                        </div>
                    </div>      

                </div>

                <div class="card__actions">
                    <div class="action" onclick="displayBuyStockCounter('${key}')">
                        <img src="assets/icons/plus_act.png" alt="">
                    </div>
                    <div class="action" onclick="displaySellStockCounter('${key}')">
                        <img src="assets/icons/minus_act.png" alt="">
                    </div>
                </div>

            </div>
        `;
        portfolioContainer.appendChild(stockCard);
        // if (count == 2) {
        //    break;
        // }
    
    }


    document.getElementById("portfolio_value_yoda").textContent = (totalPrice/100).toString();
    document.getElementById("portfolio_value_yoda").innerHTML = 
    `${(totalPrice / 100)}(Yoda) <br> $${totalPriceUSD.toFixed(2)}`;


}

async function listStockForSale(){
    if (!await checkConditions()) {
        return;
    }

    // get the paramaters for the list for sale
    const sellPopup = document.getElementById('stockSellPopup');
    const stockName = sellPopup.querySelector('.stock__scrip span:nth-child(2)').textContent;
    const count = parseInt(sellPopup.querySelector('#counter_value_sell').textContent, 10);
    console.log("selling stock", stockName.toString(), " with address:", wm.stockNameToAddress[stockName.toString()], "and count:", count);

    try {
        let stockFtAddress = wm.stockNameToAddress[stockName.toString()];
    }
    catch (error) {
        console.error("nvalid stock name or address not found.:", error);
        alert("Invalid stock name or address not found.");
        return;
    }
    const stockFtAddress = wm.stockNameToAddress[stockName.toString()];


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
        updateStockListToDb(receipt);
        console.log("Transaction mined in block:", receipt.blockNumber);
        alert("Stock listed for sale successfully!");
    }
    catch(error){
        console.error("Error in listing the stock for sale:", error);
        alert("Error in listing the stock for sale.");
    }

    closeSellStockPopup();
}

async function getUpdatedMarketListings() {
    console.log("getting updated market listings");
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

export async function buyToken() {
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

    const yodaContract = await new ethers.Contract(wm.yodaContractAddress, wm.yodaContractABI, wm.signer);
    const tx = await yodaContract.approve(wm.portfolioContractAddress, totalPrice);
    const receipt = await tx.wait(); // wait for transaction to be mined
    console.log(`The portfolio contract is approved to transfer yoda of ${totalPrice.toString()}`);
    // const allowance = await yodaContract.allowance(await wm.signer.getAddress(), wm.portfolioContractAddress);
    // console.log("The allowance is:",allowance.toString());

    try {

        const tx = await wm.portfolioContract.buyPortfolio(tokenIdToBuy);
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