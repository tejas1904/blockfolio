import { API_ENDPOINTS } from '/src/core/api.js';

export async function updateTransactionToDb(receipt) {
    const txHash = receipt.transactionHash;
    const block_number = receipt.blockNumber;
    const events = receipt.events ?? [];
    const stockEvents = events.filter(e => e.event === "StockTraded");
  
    if (!txHash) throw new Error("Missing transactionHash in receipt");
    if (stockEvents.length === 0) return [];
  
    const results = [];
  
    for (const event of stockEvents) {
      const args = event.args ?? [];
      const payload = {
        buyer_address: args[0],
        seller_address: args[1],
        stock_token_address: args[2],
        count: Number(args[3].toString()),
        unit_price: Number(args[4].toString()),
        total_price: Number(args[5].toString()),
        tx_hash: txHash,
        block_number
      };
  
      const response = await axios.post(API_ENDPOINTS.stocktrade, payload);
      results.push(response.data);
    }
  
    return results;
  }
  
  export async function updateStockListToDb(receipt) {
    const txHash = receipt.transactionHash;
    const block_number = receipt.blockNumber;
    const events = receipt.events ?? [];
    const stockEvents = events.filter(e => e.event === "StockListed");
  
    if (!txHash) throw new Error("Missing transactionHash in receipt");
    if (stockEvents.length === 0) return [];
  
    const results = [];
  
    for (const event of stockEvents) {
      const args = event.args ?? [];
      const payload = {
        seller_address: args[0],
        stock_token_address: args[1],
        count: Number(args[2].toString()),
        tx_hash: txHash,
        block_number
      };
  
      const response = await axios.post(API_ENDPOINTS.liststock, payload);
      results.push(response.data);
    }
  
    return results;
  }  