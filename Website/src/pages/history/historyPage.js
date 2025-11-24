import { wm } from "/src/core/walletManager.js";
import { API_ENDPOINTS } from '/src/core/api.js';
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("connect_button").addEventListener("click", connectMetaMaskAndContract);
    document.getElementById("portfolio_button").addEventListener("click",function() {window.location.replace("/userPage.html")} );
    window.addEventListener("load", connectMetaMaskAndContract);
});

async function connectMetaMaskAndContract() {
    await wm.connectMetaMaskAndContract();
    let text = document.getElementById("connect_button").querySelector("span");
    text.textContent = 'Wallet Connected';

    if (wm.hasMinted == true) {
        const tokenId = await wm.portfolioContract._ownedToken(await wm.signer.getAddress());
        updateTransactionHistory(wm.userAddress);
    }
    else{
        window.location.href = "signup.html";
    }
    
}

const sampleData = {
    "transactions": [
        {
            "stockFtAddr": "0xa196769Ca67f4903eCa574F5e76e003071A4d84a",
            "type": "bought",
            "count": 10,
            "unit_price": 150.00,
            "total_price": 1500.00,
            "tx_hash": "0xabc123..."
        },
        {
            "stockFtAddr": "0x162459Bb429a63D2e31Fe2d1cdb5b058f2D31AdF",
            "type": "listed",
            "count": 10,
            "unit_price": null,
            "total_price": null,
            "tx_hash": "0xabc123..."
        },

        {
            "stockFtAddr": "0xd0F350b13465B5251bb03E4bbf9Fa1DbC4a378F3",
            "type": "sold",
            "count": 10,
            "unit_price": 250,
            "total_price": 2500,
            "tx_hash": "0xabc123..."

        }
    ]
}
async function updateTransactionHistory(userWalletAddress) {

    const response = await axios.get(
        API_ENDPOINTS.transactionHistory,
        {
          params: { wallet_address: userWalletAddress}
        }
    );

    const HistoryContainer = document.querySelector(".grid_item_17 .history-list");
    HistoryContainer.innerHTML = ""; // Clear existing content

    for (const data of response.data.data.transactions) {
        let cardHtml = "";

        if (data.type === "bought"){
            cardHtml = await boughtStockCard(data);
        }
        else if (data.type === "listed"){
            cardHtml = await listedStockCard(data);
        }
        else if (data.type === "sold"){
            cardHtml = await soldStockCard(data);
        }

        if (cardHtml){
            HistoryContainer.insertAdjacentHTML("beforeend", cardHtml);
        }
    }

}

async function boughtStockCard(data){
    const {stockFtAddr,type,count, unit_price, total_price, tx_hash} = data;
    const stockName = wm.stockAddressToName[stockFtAddr] || "UNKNOWN";
    const card = `
            <!-- Bought Transaction Example -->
        <div class="transaction__card" data-type="bought">

            <div class="transaction__card__inner">

                <div class="transaction__left">

                    <div class="transaction__icon bought-icon">
                        <img src="assets/icons/${stockName}.png" alt="TSLA">
                    </div>

                    <div class="transaction__info">

                        <div class="transaction__meta">
                            <span class="stock-symbol">${stockName} Inc</span>
                            <span class="stock-name">${stockName}</span>
                        </div>

                        <div class="transaction__details">
                            <div class="detail-item">
                                <span class="detail-label">Quantity</span>
                                <span class="detail-value">${count} shares</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Price per share</span>
                                <span class="detail-value">${unit_price}</span>
                            </div>
                        </div>

                    </div>

                </div>

                <div class="transaction__divider"></div>

                <div class="transaction__right">

                    <div class="transaction__status bought-status">
                        <span class="status-badge">Bought</span>
                    </div>

                    <div class="transaction__amount">
                        <span class="amount-label">Total Amount</span>
                        <span class="amount-value bought-color">¥ ${total_price}</span>
                    </div>

                    <div class="transaction__hash">
                        <span class="date-label">Transaction Hash</span>
                        <span class="date-value">
                            ${tx_hash.slice(0,10)}...
                            <a 
                                href="https://sepolia.etherscan.io/tx/${tx_hash}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="tx-link"
                            >
                            🔗
                            </a>

                        </span>
                    </div>

                </div>

            </div>

        </div>
        `;
    return card;
}

async function listedStockCard(data){
    const {stockFtAddr,type,count, unit_price, total_price, tx_hash} = data;
    const stockName = wm.stockAddressToName[stockFtAddr] || "UNKNOWN";
    const card = `
            <!-- Listed Transaction Example -->
            <div class="transaction__card" data-type="listed">

            <div class="transaction__card__inner">

                <div class="transaction__left">

                    <div class="transaction__icon listed-icon">
                        <img src="assets/icons/${stockName}.png" alt="AAPL">
                    </div>

                    <div class="transaction__info">

                        <div class="transaction__meta">
                            <span class="stock-symbol">${stockName} Inc</span>
                            <span class="stock-name">${stockName}</span>
                        </div>

                        <div class="transaction__details">
                            <div class="detail-item">
                                <span class="detail-label">Quantity</span>
                                <span class="detail-value">${count} shares</span>
                            </div>
                            <!-- <div class="detail-item">
                                <span class="detail-label">Listed price</span>
                                <span class="detail-value">$ 245.50</span>
                            </div> -->
                        </div>

                    </div>

                </div>

                <div class="transaction__divider"></div>

                <div class="transaction__right">

                    <div class="transaction__status listed-status">
                        <span class="status-badge">Listed</span>
                    </div>

                    <!-- <div class="transaction__amount">
                        <span class="amount-label">Expected Amount</span>
                        <span class="amount-value listed-color">$ 3,682.50</span>
                    </div> -->

                    <div class="transaction__hash">
                        <span class="date-label">Transaction Hash</span>
                        <span class="date-value">
                            ${tx_hash.slice(0,10)}...
                            <a 
                                href="https://sepolia.etherscan.io/tx/${tx_hash}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="tx-link"
                            >
                            🔗
                            </a>

                        </span>
                    </div>
                    

                </div>

            </div>

        </div>
        `;
        return card;
}

async function soldStockCard(data){
    const {stockFtAddr,type,count, unit_price, total_price, tx_hash} = data;
    const stockName = wm.stockAddressToName[stockFtAddr] || "UNKNOWN";
    const card = `
            <!-- Sold Transaction Example -->
        <div class="transaction__card" data-type="sold">

            <div class="transaction__card__inner">

                <div class="transaction__left">

                    <div class="transaction__icon sold-icon">
                        <img src="assets/icons/${stockName}.png" alt="GOOGL">
                    </div>

                    <div class="transaction__info">

                        <div class="transaction__meta">
                            <span class="stock-symbol">${stockName}</span>
                            <span class="stock-name">${stockName} Inc.</span>
                        </div>

                        <div class="transaction__details">
                            <div class="detail-item">
                                <span class="detail-label">Quantity</span>
                                <span class="detail-value">${count} shares</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Sold price</span>
                                <span class="detail-value">${unit_price}</span>
                            </div>
                        </div>

                    </div>

                </div>

                <div class="transaction__divider"></div>

                <div class="transaction__right">

                    <div class="transaction__status sold-status">
                        <span class="status-badge">Sold</span>
                    </div>

                    <div class="transaction__amount">
                        <span class="amount-label">Total Amount</span>
                        <span class="amount-value sold-color">¥ ${total_price}</span>
                    </div>

                    <div class="transaction__hash">
                        <span class="date-label">Transaction Hash</span>
                        <span class="date-value">
                            ${tx_hash.slice(0,10)}...
                            <a 
                                href="https://sepolia.etherscan.io/tx/${tx_hash}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="tx-link"
                            >
                            🔗
                            </a>

                        </span>
                    </div>

                </div>

            </div>

        </div>
        `;
    
    return card;
}

