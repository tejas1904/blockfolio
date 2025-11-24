import { wm } from "/src/core/walletManager.js";

export function setVisibilityOfDivs() {
  if (wm.hasMinted) {
    document.getElementById("sell_token_div").style.visibility = "visible";
    document.getElementById("buy_token_div").style.visibility = "hidden";
  } else {
    document.getElementById("sell_token_div").style.visibility = "hidden";
    document.getElementById("buy_token_div").style.visibility = "visible";
  }
}

export async function checkConditions() {
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
