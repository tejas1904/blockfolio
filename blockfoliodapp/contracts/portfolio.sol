// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ERC721 is IERC721 {
    event Transfer(
        address indexed from, address indexed to, uint256 indexed id
    );
    event Approval(
        address indexed owner, address indexed spender, uint256 indexed id
    );
    event ApprovalForAll(
        address indexed owner, address indexed operator, bool approved
    );

    // Mapping from token ID to owner address
    mapping(uint256 => address) internal _ownerOf;

    // Mapping owner address to token count
    mapping(address => uint256) internal _balanceOf;

    // Mapping from token ID to approved address
    mapping(uint256 => address) internal _approvals;

    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    function supportsInterface(bytes4 interfaceId)
        external
        pure
        returns (bool)
    {
        return interfaceId == type(IERC721).interfaceId
            || interfaceId == type(IERC165).interfaceId;
    }

    function ownerOf(uint256 id) external view returns (address owner) {
        owner = _ownerOf[id];
        require(owner != address(0), "token doesn't exist");
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "owner = zero address");
        return _balanceOf[owner];
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function approve(address spender, uint256 id) external {
        address owner = _ownerOf[id];
        require(
            msg.sender == owner || isApprovedForAll[owner][msg.sender],
            "not authorized"
        );

        _approvals[id] = spender;

        emit Approval(owner, spender, id);
    }

    function getApproved(uint256 id) external view returns (address) {
        require(_ownerOf[id] != address(0), "token doesn't exist");
        return _approvals[id];
    }

    function _isApprovedOrOwner(address owner, address spender, uint256 id)
        internal
        view
        returns (bool)
    {
        return (
            spender == owner || isApprovedForAll[owner][spender]
                || spender == _approvals[id]
        );
    }

    function transferFrom(address from, address to, uint256 id) public {
        require(from == _ownerOf[id], "from != owner");
        require(to != address(0), "transfer to zero address");

        require(_isApprovedOrOwner(from, msg.sender, id), "not authorized");

        _balanceOf[from]--;
        _balanceOf[to]++;
        _ownerOf[id] = to;

        delete _approvals[id];

        emit Transfer(from, to, id);
    }

    function safeTransferFrom(address from, address to, uint256 id) external {
        transferFrom(from, to, id);

        require(
            to.code.length == 0
                || IERC721Receiver(to).onERC721Received(msg.sender, from, id, "")
                    == IERC721Receiver.onERC721Received.selector,
            "unsafe recipient"
        );
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes calldata data
    ) external {
        transferFrom(from, to, id);

        require(
            to.code.length == 0
                || IERC721Receiver(to).onERC721Received(msg.sender, from, id, data)
                    == IERC721Receiver.onERC721Received.selector,
            "unsafe recipient"
        );
    }

}

contract portfolio is ERC721{
    //token id
    uint256 public tokenCount;
    // Mapping from tokenCount to stock contract address to a bool
    mapping (uint256 => mapping (address => bool)) public _tokenHasStock;
    // Mapping from owner to owned token ID
    mapping(address => uint256) public _ownedToken;
    
    address _paymentTokenAddress;

    struct StockListing {
        address seller;
        uint256 count;
    }
    //maping of a stockAddress to a listing
    mapping(address => StockListing[]) public _stocksForSale;

    // mapping of a stockAddress to the total count of how many are listed to be sold
    mapping(address => uint256) public _totalSellCount;

    // User address -> stock address -> number of stock alreay listed for sale
    mapping(address => mapping(address => uint256)) public _userListedStocks;

    //---stuff for selling of porfolios---
    // Mapping from portfolio token ID to its listing
    mapping(uint256 => bool) public _isPortfolioForSale;
    // Mapping of tokenId -> array of addresses
    mapping(uint256 => address[]) public _tokenStockAddresses;
    //mapping of a tokenId->address of owner
    mapping(uint256 => address)public _listedPortfolioOwner;

    event StockListed(
        address indexed seller,
        address indexed stockToken,
        uint256 count
    );
    event StockTraded(
        address indexed buyer,
        address indexed seller,
        address indexed stockToken,
        uint256 count,
        uint256 unitPrice,
        uint256 totalPrice
    );
    event PortfolioListed(address indexed seller, uint256 indexed tokenId);
    event PortfolioTraded(
        address indexed buyer,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 totalPrice
    );
    event PortfolioTradeItem(
        address indexed buyer,
        address indexed seller,
        uint256 indexed tokenId,
        address stockToken,
        uint256 count,
        uint256 unitPrice,
        uint256 totalPrice
    );

    event StockListingDelisted(
        address indexed stockFtAddress,
        address indexed seller
    );

    function getTokenStockAddresses(uint256 tokenId) public view returns (address[] memory) {
        require(_tokenStockAddresses[tokenId].length > 0, "No stocks found for this token ID");
        return _tokenStockAddresses[tokenId];
    }

    function listPortfolioToSell() public {
        uint256 token_id = _ownedToken[msg.sender];
        require(_ownerOf[token_id] == msg.sender, "you are not the owner of this portfolio!");
        require(_isPortfolioForSale[token_id] == false, "your portfolio has already been listed for sale");
        
        // List the portfolio for sale
        _isPortfolioForSale[token_id] = true;
        _listedPortfolioOwner[token_id] = msg.sender;
        emit PortfolioListed(msg.sender, token_id);
    }

    function buyPortfolio(uint256 token_id) public {
        require(_isPortfolioForSale[token_id], "the portfolio hasn't been listed for sale yet");
        address portfolioOwnerAddress = _listedPortfolioOwner[token_id];
        require(portfolioOwnerAddress != address(0), "Invalid portfolio owner");
        require(portfolioOwnerAddress != msg.sender, "You cannot buy your own portfolio");

        // Calculate the total value of all stocks in the portfolio
        uint256 totalPortfolioValue = 0;
        for (uint256 i = 0; i < _tokenStockAddresses[token_id].length; i++) {
            address stockAddress = _tokenStockAddresses[token_id][i];
            if (_tokenHasStock[token_id][stockAddress]) {
                uint256 stockBalance = IERC20(stockAddress).balanceOf(portfolioOwnerAddress);
                uint256 stockPrice = getAPrice(stockAddress);
                totalPortfolioValue += stockPrice*stockBalance;
            }
        }
    

        uint256 authorized_count = IERC20(_paymentTokenAddress).allowance(msg.sender,address(this));
        require(authorized_count >= totalPortfolioValue, "Insufficient authorization");
        
        // Transfer all stocks in the portfolio
        for (uint256 i = 0; i < _tokenStockAddresses[token_id].length; i++) {
            address stockAddress = _tokenStockAddresses[token_id][i];
            if (_tokenHasStock[token_id][stockAddress]) {
                uint256 balanceOfStock = IERC20(stockAddress).balanceOf(portfolioOwnerAddress);
                if (balanceOfStock > 0) {
                    uint256 unitPrice = getAPrice(stockAddress);
                    uint256 itemTotal = unitPrice * balanceOfStock;
                    IERC20(stockAddress).transferFrom(portfolioOwnerAddress, msg.sender, balanceOfStock);
                    emit PortfolioTradeItem(
                        msg.sender,
                        portfolioOwnerAddress,
                        token_id,
                        stockAddress,
                        balanceOfStock,
                        unitPrice,
                        itemTotal
                    );
                }
            }
        }

        // Transfer the ERC721 portfolio token

        myTransferFrom(portfolioOwnerAddress, msg.sender, token_id);
        
        // Update ownership records
        _ownedToken[msg.sender] = token_id;
        _ownedToken[portfolioOwnerAddress] = 0 ;
        delete _ownedToken[portfolioOwnerAddress];
        
        // Clean up listings
        _isPortfolioForSale[token_id] = false;
        delete _listedPortfolioOwner[token_id];
        
        // Forward payment to seller
        IERC20(_paymentTokenAddress).transferFrom(msg.sender,portfolioOwnerAddress,totalPortfolioValue);
        emit PortfolioTraded(msg.sender, portfolioOwnerAddress, token_id, totalPortfolioValue);
        
    }
    function myTransferFrom(address from, address to, uint256 id) public {
        require(from == _ownerOf[id], "from != owner");
        require(to != address(0), "transfer to zero address");

        _balanceOf[from]--;
        _balanceOf[to]++;
        _ownerOf[id] = to;

        emit Transfer(from, to, id);
    }


    constructor(address paymentTokenAddress){
        tokenCount = 0;
        _paymentTokenAddress = paymentTokenAddress;
    }

    function getStockListingsLength(address stockAddress) public view returns (uint256) {
    return _stocksForSale[stockAddress].length;
    }
    

    function mint() external {

        require(_balanceOf[msg.sender] == 0 , "you have already already minted your portfolio !");

        tokenCount = tokenCount+1;
        _balanceOf[msg.sender]++;
        _ownerOf[tokenCount] = msg.sender;
        _ownedToken[msg.sender] = tokenCount;

        emit Transfer(address(0), msg.sender, tokenCount);
    }

    string private constant _name = "Blockfolio";
    string private constant _symbol = "BFOL";
    string private constant TOKEN_URI = "https://raw.githubusercontent.com/tejas1904/blockfolio/refs/heads/main/metadata/stock-nft.json";

    function name() external view  returns (string memory) {
        return _name;
    }

    function symbol() external view  returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) external view  returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "ERC721Metadata: URI query for nonexistent token");
        return TOKEN_URI;
    }


    //given the tokenId of a portfolio and a stockFtAddress update the portfolio with the msg.senders ownership
    function updatePortfolio (address stockFtAddress) public returns (uint){
        //check if erc20 is valid 
        require(IERC20(stockFtAddress).totalSupply() > 0, "Invalid ERC-20 contract");

        uint256 token_Id = _ownedToken[msg.sender];
        //check if the sender is owner of the  portfolio nft token first of all
        require(_ownerOf[token_Id] == msg.sender, "you are not the owner of this portfolio!");
        
        //check if the balance of the stock is greater than zero
        uint256 balance = IERC20(address(stockFtAddress)).balanceOf(msg.sender);
        require(balance>0,"you dont own any stock in this company !!");

        if (_tokenHasStock[token_Id][stockFtAddress] != true){
            _tokenHasStock[token_Id][stockFtAddress] = true;
            _tokenStockAddresses[token_Id].push(stockFtAddress);
        }
        return balance;

    }

    function list_stock_to_sell(address stockFtAddress,uint256 count) public{
        uint256 token_id = _ownedToken[msg.sender];

        //cant list if portfolio is listed for sale
        require(!_isPortfolioForSale[token_id],"portfolio is listed for sale");
        
        updatePortfolio(stockFtAddress);
        //check if erc20 is valid 
        require(IERC20(stockFtAddress).totalSupply() > 0, "Invalid ERC-20 contract");

        //check if the sender is owner of the  portfolio nft token first of all
        require(_ownerOf[token_id] == msg.sender, "you are not the owner of this portfolio!");

        //check if the sender actually owns any stock in this company
        require(_tokenHasStock[token_id][stockFtAddress] == true, "your portfolio(tokennID) has no stock this company");
        
        //check if the sender has enough stock in the company to sell
        uint256 balance = IERC20(address(stockFtAddress)).balanceOf(msg.sender);
        require(count<= balance,"you cant list more stock than you own in the company!!");

        // Making sure the user doesn't list more than they own
        uint256 alreadyListed = _userListedStocks[msg.sender][stockFtAddress];
        require(alreadyListed + count <= balance, "Total listed amount would exceed owned balance");

        //check if the  owner of the stock has approved this contract as a spender
        uint256 authorized_count = IERC20(stockFtAddress).allowance(msg.sender,address(this));
        require(authorized_count >= count , "not enough stock is authorized to be sold");

        //now list the stock for sale 
        _stocksForSale[stockFtAddress].push(StockListing(msg.sender, count));
        _totalSellCount[stockFtAddress] += count;

        // Update the user's listed amount
        _userListedStocks[msg.sender][stockFtAddress] += count;

        emit StockListed(
            msg.sender,
            stockFtAddress,
            count
        );
    }

    function getPrice(address stockFtAddress,uint count) public view  returns (uint256){
        //check if erc20 is valid 
        require(IERC20(stockFtAddress).totalSupply() > 0, "Invalid ERC-20 contract");

        //check if enough stock requested is available for sale
        require(_totalSellCount[stockFtAddress] >= count , "sorry , not enough stock has been listed up for sale");

        //now ferch the price form the orcle and multiply it with the cout
        uint256 price  = 100;

        return price*count;
    }

    function getAPrice(address stockFtAddress)public pure   returns (uint256){
        //now ferch the price form the orcle and multiply it with the cout
        require(stockFtAddress != address(0), "you sent zero address!");
        uint256 price  = 100;
        return price;
    }


    function buy(address stockFtAddress, uint256 count) public {
    require(IERC20(stockFtAddress).totalSupply() > 0, "Invalid ERC-20 contract");
    require(_totalSellCount[stockFtAddress] >= count, "Not enough stock available for sale");

    uint256 token_id = _ownedToken[msg.sender];
    //cant buy  if portfolio is listed for sale
    require(!_isPortfolioForSale[token_id],"portfolio is listed for sale you cant buy");
    // Check if the portfolio (tokenID) is owned by the sender
    require(_ownerOf[token_id] == msg.sender, "You are not the owner of this portfolio!");

    // Calculate total price
    uint256 totalPrice = getPrice(stockFtAddress, count);
    
    // Check if buyer has authorized enough payment tokens
    uint256 authorized_count = IERC20(_paymentTokenAddress).allowance(msg.sender, address(this));
    require(authorized_count >= totalPrice, "Insufficient authorization");

    uint256 remainingToBuy = count;
    uint256 i = 0;

    while (i < _stocksForSale[stockFtAddress].length && remainingToBuy > 0) {
        StockListing storage listing = _stocksForSale[stockFtAddress][i];

        if (remainingToBuy >= listing.count) {
            // Buy entire listing
            uint256 unitPrice = getAPrice(stockFtAddress);
            uint256 partialPrice = unitPrice * listing.count;
            
            // Transfer stock from seller to buyer
            IERC20(stockFtAddress).transferFrom(listing.seller, msg.sender, listing.count);
            
            // Transfer payment from buyer to seller
            IERC20(_paymentTokenAddress).transferFrom(msg.sender, listing.seller, partialPrice);

            emit StockTraded(
                msg.sender,
                listing.seller,
                stockFtAddress,
                listing.count,
                unitPrice,
                partialPrice
            );
            
            remainingToBuy -= listing.count;
            _totalSellCount[stockFtAddress] -= listing.count;
            _userListedStocks[listing.seller][stockFtAddress] -= listing.count;
            
            // Remove this listing
            delistStockListing(stockFtAddress, i);
            // Note: delistStockListing will adjust the array, so don't increment i
        } else {
            // Partial buy
            uint256 unitPrice = getAPrice(stockFtAddress);
            uint256 partialPrice = unitPrice * remainingToBuy;
            
            // Transfer stock from seller to buyer
            IERC20(stockFtAddress).transferFrom(listing.seller, msg.sender, remainingToBuy);
            
            // Transfer payment from buyer to seller
            IERC20(_paymentTokenAddress).transferFrom(msg.sender, listing.seller, partialPrice);

            emit StockTraded(
                msg.sender,
                listing.seller,
                stockFtAddress,
                remainingToBuy,
                unitPrice,
                partialPrice
            );
            
            listing.count -= remainingToBuy;
            _totalSellCount[stockFtAddress] -= remainingToBuy;
            _userListedStocks[listing.seller][stockFtAddress] -= remainingToBuy;
            remainingToBuy = 0;
            i++;
        }
    }
    updatePortfolio(stockFtAddress);
}

    function delistStockListing(address stockFtAddress, uint256 listingIndex) private {
        require(listingIndex < _stocksForSale[stockFtAddress].length, "Invalid listing index");

            
        // Update the user's tracked listed amount
        address seller = _stocksForSale[stockFtAddress][listingIndex].seller;
        if (_userListedStocks[seller][stockFtAddress] ==0){
            delete _userListedStocks[seller][stockFtAddress];
        }
        
        // Remove the listing by replacing it with the last listing and then reducing the array length
        StockListing memory lastListing = _stocksForSale[stockFtAddress][_stocksForSale[stockFtAddress].length - 1];
        _stocksForSale[stockFtAddress][listingIndex] = lastListing;
        _stocksForSale[stockFtAddress].pop();

        emit StockListingDelisted(stockFtAddress,seller);
    }
}