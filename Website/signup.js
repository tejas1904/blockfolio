import {wm} from "./main.js";
import {createWallet,buyToken} from "./userPageScript.js";

document.addEventListener("DOMContentLoaded", function() {

    document.getElementById("create_wallet_button").addEventListener("click", createWalletHere);
    document.getElementById("buy_token_button").addEventListener("click", buyTokenHere);
    window.addEventListener("load", connectMetaMaskAndContract);

});

async function connectMetaMaskAndContract() {
    await wm.connectMetaMaskAndContract();
    if (wm.hasMinted == true) {
        window.location.href = "userPage.html";
    }
}

async function createWalletHere() {
    if(wm.hasMinted) {
        alert("You have already minted your token.");
        return;
    }
    await createWallet();
    window.location.href = "userPage.html";
}

async function buyTokenHere() {
    if(wm.hasMinted) {
        alert("You have already minted your token.");
        return;
    }
    await buyToken();
    window.location.href = "userPage.html";
}

