export function displayBuyStockCounter(stockCompanyName) {
    document.getElementById("popupBg").classList.add("popup-active");
    document.getElementById("stockBuyPopup").classList.add("popup__stock-buy-active");
  
    const buyPopup = document.getElementById("stockBuyPopup");
    buyPopup.querySelector(".stock__scrip span:nth-child(1)").textContent = stockCompanyName + " Inc";
    buyPopup.querySelector(".stock__scrip span:nth-child(2)").textContent = stockCompanyName;
    buyPopup.querySelector(".stock__info__meta img").src = `assets/icons/${stockCompanyName.toLowerCase()}.png`;
    buyPopup.querySelector(".stock__price span:nth-child(2)").textContent = "$ 134.56";
  
    // counter
    const qtyElem = document.getElementById("counter_value");
    let quantity = 50;
  
    document.getElementById("minusBtn").onclick = () => {
      if (quantity > 50) qtyElem.textContent = (quantity -= 50);
    };
    document.getElementById("plusBtn").onclick = () => {
      qtyElem.textContent = (quantity += 50);
    };
  }
  
  export function closeBuyStockPopup() {
    document.getElementById("popupBg").classList.remove("popup-active");
    document.getElementById("stockBuyPopup").classList.remove("popup__stock-buy-active");
  }
  
  export function displaySellStockCounter(stockCompanyName) {
    document.getElementById("popupBg").classList.add("popup-active");
    document.getElementById("stockSellPopup").classList.add("popup__stock-sell-active");
  
    const sellPopup = document.getElementById("stockSellPopup");
    sellPopup.querySelector(".stock__scrip span:nth-child(2)").textContent = stockCompanyName;
    sellPopup.querySelector(".stock__scrip span:nth-child(1)").textContent = stockCompanyName + " Inc";
    sellPopup.querySelector(".stock__info__meta img").src = `assets/icons/${stockCompanyName.toLowerCase()}.png`;
    sellPopup.querySelector(".stock__price span:nth-child(2)").textContent = "$ 134.56";
  
    const qtyElem = document.getElementById("counter_value_sell");
    let quantity = 50;
  
    document.getElementById("minusBtnSell").onclick = () => {
      if (quantity > 50) qtyElem.textContent = (quantity -= 50);
    };
    document.getElementById("plusBtnSell").onclick = () => {
      qtyElem.textContent = (quantity += 50);
    };
  }
  
  export function closeSellStockPopup() {
    document.getElementById("popupBg").classList.remove("popup-active");
    document.getElementById("stockSellPopup").classList.remove("popup__stock-sell-active");
  }
  