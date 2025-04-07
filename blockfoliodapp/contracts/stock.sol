// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract stock is ERC20, Ownable {
    uint8 private immutable _decimals;

    constructor(string memory _name, string memory _symbol) 
        ERC20(_name, _symbol)
        Ownable(msg.sender)
    {
        //fixing the number of decimals to zero
        _decimals = 0;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
