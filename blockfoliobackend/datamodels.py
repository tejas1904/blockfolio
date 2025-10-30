from pydantic import BaseModel, Field
from enum import Enum
# standard Response model
class ResponseModel(BaseModel):
    success: bool
    action: str
    data: dict|str|None = None

#data models for user operations
class CreateUserBody(BaseModel):
    wallet_address: str
    name: str = "blockfolio user"
    portfolionfts: list[str] = []


class UpdateUserBody(BaseModel):
    name: str | None = None 


class PortfolioItemsBody(BaseModel):
    nfts: list[str] = Field(min_length=1)

class stockTokenOptions(Enum):
    buy = "buy"
    sell = "sell"

#data model for transactions
class StockTradeModel(BaseModel):
    buyer_address: str
    seller_address: str
    stock_token_address: str
    count: int
    unit_price: float
    total_price: float
    tx_hash: str
    block_number: int
    timestamp: str|None = None

class StockListModel(BaseModel):
    seller_address: str
    stock_token_address: str
    count: int
    tx_hash: str
    block_number: int
    timestamp: str|None = None

