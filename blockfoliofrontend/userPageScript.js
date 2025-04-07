import {wm} from "./main.js";

let portfolioListElement = null;
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("conect_button").addEventListener("click", connectMetaMaskAndContract);
    document.getElementById("create_wallet_button").addEventListener("click" , createWallet);
    document.getElementById("buy_stock_btn").addEventListener("click", buyStock);
    document.getElementById("get_updated_portfolio_btn").addEventListener("click", getUpdatedPortfolio);
    document.getElementById("clear_cookies_btn").addEventListener("click", clearCookie);
    portfolioListElement = document.getElementById("portfolio_list");
    
});

function clearCookie() {
    // Set the cookie to expire in the past
    document.cookie = "portfolioData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    console.log("User data cleared from cookies.");
}


async function connectMetaMaskAndContract() {
    await wm.connectMetaMaskAndContract();
    let textbox = document.getElementById("connectionstatus");
    textbox.textContent = `Connected! to account: ${await wm.signer.getAddress()}`;
}
async function createWallet() {
    console.log("the status of the wallet is:", wm.hasMinted);
    if (!wm.hasMinted) {
        const tx = await wm.portfolioContract.mint();
        console.log("Transaction sent:", tx);
        tx.wait().then((receipt) => {
            console.log("Transaction mined in block:", receipt.blockNumber);
            alert("Wallet created successfully!");
            wm.hasMinted = true;
            wm.saveUserData();
        }).catch(error => {
            console.error("Transaction failed:", error);
        });
    }
    else{
        alert("portfolio already created!");
    }
}

async function getPrice(address,count) {
 
        try{
            const price = await wm.portfolioContract.getPrice(address,count);
            console.log("Price is:", price.toString());
            return price;
        }
        catch(error){
            console.error("Error fetching price:", error);
            alert("Error fetching price. Please check the address and try again.");
            throw error;
        }
}


async function buyStock() {
    if (!wm.walletConnected) {
        alert("Please connect your wallet first.");
        return;
    }
    if (!wm.hasMinted) {
        alert("Please create your portfolio first.");
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
    tx.wait().then((receipt) => {
        console.log("Transaction mined in block:", receipt.blockNumber);
        alert("Stock bought successfully!");
        getUpdatedPortfolio();
    }).catch(error => {
        console.error("Transaction failed:", error);
    });
}

async function getUpdatedPortfolio() {
    const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
    
    portfolioListElement.innerHTML = "";
    for (let key in wm.stockNameToAddress) {
        const stockFtAddress = wm.stockNameToAddress[key];
        let status = await wm.portfolioContract._tokenHasStock(tokenId, stockFtAddress)
        
        console.log("stock address:", stockFtAddress);
        const stockContract = new ethers.Contract(stockFtAddress,wm.stockContractABI,wm.signer);
        const quantity = await stockContract.balanceOf(await wm.signer.getAddress());
        
        console.log("owns stock?", key, "is:", status, "quantity:", quantity.toString());
        let listItem = document.createElement("li");
        listItem.textContent = `owns stock? ${key}: ${status} quantity: ${quantity.toString()}`;
        portfolioListElement.appendChild(listItem);
    }
}



