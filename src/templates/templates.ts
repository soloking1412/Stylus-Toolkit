export const TEMPLATES: Record<string, any> = {
  basic: {
    name: 'Counter',
    rust: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

#[public]
impl Counter {
    pub fn number(&self) -> U256 {
        self.number.get()
    }

    pub fn set_number(&mut self, new_number: U256) {
        self.number.set(new_number);
    }

    pub fn increment(&mut self) {
        let number = self.number.get();
        self.set_number(number + U256::from(1));
    }
}
`,
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 private count;

    function increment() public {
        count += 1;
    }

    function getCount() public view returns (uint256) {
        return count;
    }

    function setCount(uint256 _count) public {
        count = _count;
    }
}
`,
  },
  erc20: {
    name: 'ERC20Token',
    rust: `#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    storage::{StorageMap, StorageU256},
};

#[storage]
#[entrypoint]
pub struct ERC20 {
    balances: StorageMap<Address, StorageU256>,
    total_supply: StorageU256,
}

#[public]
impl ERC20 {
    pub fn balance_of(&self, account: Address) -> U256 {
        self.balances.get(account)
    }

    pub fn total_supply(&self) -> U256 {
        self.total_supply.get()
    }

    pub fn transfer(&mut self, to: Address, amount: U256) -> bool {
        let sender = self.vm().msg_sender();
        let sender_balance = self.balances.get(sender);

        if sender_balance < amount {
            return false;
        }

        self.balances.insert(sender, sender_balance - amount);
        let to_balance = self.balances.get(to);
        self.balances.insert(to, to_balance + amount);

        true
    }

    pub fn mint(&mut self, to: Address, amount: U256) {
        let balance = self.balances.get(to);
        self.balances.insert(to, balance + amount);
        let supply = self.total_supply.get();
        self.total_supply.set(supply + amount);
    }
}
`,
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ERC20Token {
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    uint256 private totalSupply;

    string public name = "MyToken";
    string public symbol = "MTK";
    uint8 public decimals = 18;

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }

    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
}
`,
  },
  erc721: {
    name: 'NFTCounter',
    rust: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct NFTCounter {
        uint256 total_minted;
    }
}

#[public]
impl NFTCounter {
    pub fn total_minted(&self) -> U256 {
        self.total_minted.get()
    }

    pub fn mint(&mut self) -> U256 {
        let token_id = self.total_minted.get();
        self.total_minted.set(token_id + U256::from(1));
        token_id
    }
}
`,
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ERC721NFT {
    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;
    mapping(uint256 => address) private tokenApprovals;

    uint256 private nextTokenId;

    function ownerOf(uint256 tokenId) public view returns (address) {
        return owners[tokenId];
    }

    function balanceOf(address owner) public view returns (uint256) {
        return balances[owner];
    }

    function mint(address to) public returns (uint256) {
        uint256 tokenId = nextTokenId;

        owners[tokenId] = to;
        balances[to] += 1;
        nextTokenId += 1;

        return tokenId;
    }

    function transferFrom(address from, address to, uint256 tokenId) public returns (bool) {
        require(owners[tokenId] == from, "Not owner");

        owners[tokenId] = to;
        balances[from] -= 1;
        balances[to] += 1;

        return true;
    }
}
`,
  },
  defi: {
    name: 'LiquidityPool',
    rust: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct LiquidityPool {
        uint256 total_liquidity;
    }
}

#[public]
impl LiquidityPool {
    pub fn total_liquidity(&self) -> U256 {
        self.total_liquidity.get()
    }

    pub fn add_liquidity(&mut self, amount: U256) {
        let current = self.total_liquidity.get();
        self.total_liquidity.set(current + amount);
    }

    pub fn remove_liquidity(&mut self, amount: U256) -> bool {
        let current = self.total_liquidity.get();
        if current < amount {
            return false;
        }
        self.total_liquidity.set(current - amount);
        true
    }
}
`,
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleDEX {
    mapping(address => uint256) private liquidity;
    uint256 private reserves;

    function addLiquidity(uint256 amount) public {
        liquidity[msg.sender] += amount;
        reserves += amount;
    }

    function removeLiquidity(uint256 amount) public returns (bool) {
        require(liquidity[msg.sender] >= amount, "Insufficient liquidity");

        liquidity[msg.sender] -= amount;
        reserves -= amount;

        return true;
    }

    function getLiquidity(address provider) public view returns (uint256) {
        return liquidity[provider];
    }

    function getReserves() public view returns (uint256) {
        return reserves;
    }
}
`,
  },
};
