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
    

    struct StockListing {
        address seller;
        uint256 count;
    }
    //maping of a stockAddress to a listing
    mapping(address => StockListing[]) public _stocksForSale;
    mapping(address => uint256) public _totalSellCount;

    constructor(){
        tokenCount = 0;
    }
    

    function mint() external {

        require(_balanceOf[msg.sender] == 0 , "you have already already minted your portfolio !");

        tokenCount = tokenCount+1;
        _balanceOf[msg.sender]++;
        _ownerOf[tokenCount] = msg.sender;
        _ownedToken[msg.sender] = tokenCount;

        emit Transfer(address(0), msg.sender, tokenCount);
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

        _tokenHasStock[token_Id][stockFtAddress] = true;
        return balance;

    }

    function list_stock_to_sell(address stockFtAddress,uint256 count) public{
        uint256 token_id = _ownedToken[msg.sender];
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

        //check if the  owner of the stock has approved this contract as a spender
        uint256 authorized_count = IERC20(stockFtAddress).allowance(msg.sender,address(this));
        require(authorized_count >= count , "not enough stock is authorized to be sold");

        //now list the stock for sale 
        _stocksForSale[stockFtAddress].push(StockListing(msg.sender, count));
        _totalSellCount[stockFtAddress] += count;

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


    function buy(address stockFtAddress, uint256 count) public payable {
        require(IERC20(stockFtAddress).totalSupply() > 0, "Invalid ERC-20 contract");
        require(_totalSellCount[stockFtAddress] >= count, "Not enough stock available for sale");

        uint256 token_id = _ownedToken[msg.sender];
        // Check if the portfolio (tokenID) is owned by the sender
        require(_ownerOf[token_id] == msg.sender, "You are not the owner of this portfolio!");

        // Calculate total price
        uint256 totalPrice = getPrice(stockFtAddress, count);
        require(msg.value >= totalPrice, "Insufficient payment");

        uint256 remainingToBuy = count;
        uint256 i = 0;

        while (i < _stocksForSale[stockFtAddress].length && remainingToBuy > 0) {
            StockListing storage listing = _stocksForSale[stockFtAddress][i];

            if (remainingToBuy >= listing.count) {
                // Buy entire listing
                IERC20(stockFtAddress).transferFrom(listing.seller, msg.sender, listing.count);
                remainingToBuy -= listing.count;
                _totalSellCount[stockFtAddress] -= listing.count;
                
                // Remove this listing
                delistStockListing(stockFtAddress, i);
                // Note: delistStockListing will adjust the array, so don't increment i
            } else {
                // Partial buy
                IERC20(stockFtAddress).transferFrom(listing.seller, msg.sender, remainingToBuy);
                listing.count -= remainingToBuy;
                _totalSellCount[stockFtAddress] -= remainingToBuy;
                remainingToBuy = 0;
                i++;
            }
        }
        updatePortfolio(stockFtAddress);


        // refund any unfulfilled orders
        uint256 unitPrice = totalPrice / count;
        if (msg.value > unitPrice * remainingToBuy) {
            payable(msg.sender).transfer(msg.value - (unitPrice * remainingToBuy));
        }
    }

    function delistStockListing(address stockFtAddress, uint256 listingIndex) public {
        require(listingIndex < _stocksForSale[stockFtAddress].length, "Invalid listing index");
        
        // Remove the listing by replacing it with the last listing and then reducing the array length
        StockListing memory lastListing = _stocksForSale[stockFtAddress][_stocksForSale[stockFtAddress].length - 1];
        _stocksForSale[stockFtAddress][listingIndex] = lastListing;
        _stocksForSale[stockFtAddress].pop();
    }
}