from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError
import datamodels
from datamodels import CreateUserBody, UpdateUserBody, PortfolioItemsBody, ResponseModel, StockTradeModel, StockListModel
import os
from dotenv import load_dotenv
load_dotenv()


app = FastAPI()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") #["http://localhost:3000", "http://...]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI") # e.g., "mongodb://localhost:27017"
DB_NAME = os.getenv("MONGO_DB_NAME", "blockfolio")

client = AsyncMongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db["users"]
transactions_collection = db["transactions"]
listings_collection = db["listings"]


def norm_wallet(addr: str) -> str:
    addr = (addr or "").strip()
    if not addr:
        raise HTTPException(status_code=400, detail="wallet_address is required")
    return addr


@app.get("/")
async def health():
    return {"status": "ok"}

# create a user
@app.post("/users", response_model=ResponseModel, status_code=200)
async def create_user(body: CreateUserBody):
    wallet = norm_wallet(body.wallet_address)

    doc = {
        "wallet_address": wallet,
        "name": body.name,
        "portfolionfts": body.portfolionfts,
    }

    try:
        await users_collection.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="User already exists")

    return ResponseModel(success=True, action="created")

# get details for a user
@app.get("/users/{wallet_address}", response_model=ResponseModel,status_code=200)
async def get_user(wallet_address: str):
    wallet = norm_wallet(wallet_address)

    user = await users_collection.find_one({"wallet_address": wallet}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return ResponseModel(success=True, action="fetched", data=user)

# update username
@app.put("/users/{wallet_address}/modify", response_model=ResponseModel, status_code=200)
async def update_user(wallet_address: str, body: UpdateUserBody):
    wallet = norm_wallet(wallet_address)

    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name

    if not update_data:
        return {"success": True, "action": "no_changes"}

    res = await users_collection.update_one({"wallet_address": wallet}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, "action": "updated"}

# add a nft to the users list
@app.patch("/users/{wallet_address}/portfolio/add", response_model=ResponseModel, status_code=200)
async def add_to_portfolio(wallet_address: str, body: PortfolioItemsBody):
    wallet = norm_wallet(wallet_address)

    deduped = list(set(body.nfts))

    res = await users_collection.update_one(
        {"wallet_address": wallet},
        {"$addToSet": {"portfolionfts": {"$each": deduped}}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return ResponseModel(success=True, action="portfolio(s)_added")

#remove an nft from the users list
@app.patch("/users/{wallet_address}/portfolio/delete", response_model=ResponseModel, status_code=200)
async def remove_from_portfolio(wallet_address: str, body: PortfolioItemsBody):
    wallet = norm_wallet(wallet_address)

    res = await users_collection.update_one(
        {"wallet_address": wallet},
        {"$pull": {"portfolionfts": {"$in": body.nfts}}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return ResponseModel(success=True, action="portfolio(s)_removed")


# add a transaction for a user

@app.post("/transactions/stocktrade")
async def add_transaction(body :StockTradeModel, response_model=ResponseModel, status_code=200):

    doc = {
        "buyer_address": body.buyer_address,
        "seller_address": body.seller_address,
        "stock_token_address": body.stock_token_address,
        "count": body.count,
        "unit_price": body.unit_price,
        "total_price": body.total_price,
        "tx_hash": body.tx_hash,
        "block_number": body.block_number,
        "timestamp": body.timestamp if body.timestamp else None
    }


    try:
        await transactions_collection.insert_one(doc)
    except PyMongoError as e:
        raise HTTPException(status_code=400, detail=str(e))


    return ResponseModel(success=True, action="transaction added")

@app.get("/transactions", response_model=ResponseModel, status_code=200)
async def get_transactions():
    query = {}
    transactions = await transactions_collection.find(
        query,
        {"_id": 0}
    ).sort("block_number", -1).to_list()
    

    return ResponseModel(success=True, action="fetched", data={"transactions": transactions})


@app.post("/listings/liststock", response_model=ResponseModel, status_code=200)
async def add_stock_list(body: StockListModel):
    doc = {
        "seller_address": body.seller_address,
        "stock_token_address": body.stock_token_address,
        "count": body.count,
        "tx_hash": body.tx_hash,
        "block_number": body.block_number,
        "timestamp": body.timestamp if body.timestamp else None,
    }

    try:
        await listings_collection.insert_one(doc)
    except PyMongoError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ResponseModel(success=True, action="stock listed")

@app.get("/listings/listedstock", response_model=ResponseModel, status_code=200)
async def get_stock_list():
    query = {}
    try:
        transactions = await listings_collection.find(
            query,
            {"_id": 0}
        ).sort("block_number", -1).to_list()

        return ResponseModel(success=True, action="fetched", data={"transactions": transactions})
    except PyMongoError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/transactionHistory", response_model=ResponseModel, status_code=200)
async def get_transaction_history(wallet_address: str):
    wallet = norm_wallet(wallet_address)

    try:
        soldtransactions = await transactions_collection.find(
            {"seller_address": wallet},
            {"_id": 0}
        ).sort("block_number", -1).to_list()

        buytransactions = await transactions_collection.find(
            {"buyer_address": wallet},
            {"_id": 0}
        ).sort("block_number", -1).to_list()

        stockListingTransactions = await listings_collection.find(
            {"seller_address": wallet},
            {"_id": 0}
        ).sort("block_number", -1).to_list()
        transactions = []
        for tx in buytransactions:
            transactions.append(
                {
                    "stockFtAddr": tx["stock_token_address"],
                    "type": "bought",
                    "count": tx["count"],
                    "unit_price":  tx["unit_price"],
                    "total_price": tx["total_price"],
                    "tx_hash": tx["tx_hash"],
                    "block_number": tx["block_number"]
                }
            )
        for tx in soldtransactions:
            transactions.append(
                {
                    "stockFtAddr": tx["stock_token_address"],
                    "type": "sold",
                    "count": tx["count"],
                    "unit_price":  tx["unit_price"],
                    "total_price": tx["total_price"],
                    "tx_hash": tx["tx_hash"],
                    "block_number": tx["block_number"]
                }
            )
        for tx in stockListingTransactions:
            transactions.append(
                {
                    "stockFtAddr": tx["stock_token_address"],
                    "type": "listed",
                    "count": tx["count"],
                    "unit_price":  None,
                    "total_price": None,
                    "tx_hash": tx["tx_hash"],
                    "block_number": tx["block_number"]
                }
            )
            
        transactions.sort(key=lambda x: x["block_number"], reverse=True)

        return ResponseModel(success=True, action="fetched", data={"transactions": transactions})
    except PyMongoError as e:
        raise HTTPException(status_code=400, detail=str(e))