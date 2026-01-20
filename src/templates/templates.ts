export const TEMPLATES: Record<string, any> = {
  basic: {
    name: 'Counter',
    rust: `#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*, storage::StorageU256};

#[storage]
#[entrypoint]
pub struct Counter {
    count: StorageU256,
}

#[public]
impl Counter {
    pub fn increment(&mut self) {
        let count = self.count.get() + U256::from(1);
        self.count.set(count);
    }

    pub fn get_count(&self) -> U256 {
        self.count.get()
    }

    pub fn set_count(&mut self, count: U256) {
        self.count.set(count);
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
    allowances: StorageMap<Address, StorageMap<Address, StorageU256>>,
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
        let sender = msg::sender();
        let sender_balance = self.balances.get(sender);

        if sender_balance < amount {
            return false;
        }

        self.balances.setter(sender).sub(amount);
        self.balances.setter(to).add(amount);

        true
    }

    pub fn approve(&mut self, spender: Address, amount: U256) -> bool {
        let owner = msg::sender();
        self.allowances.setter(owner).setter(spender).set(amount);
        true
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances.get(owner).get(spender)
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
    name: 'ERC721NFT',
    rust: `#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    storage::{StorageMap, StorageU256},
};

#[storage]
#[entrypoint]
pub struct ERC721 {
    owners: StorageMap<U256, Address>,
    balances: StorageMap<Address, StorageU256>,
    token_approvals: StorageMap<U256, Address>,
    next_token_id: StorageU256,
}

#[public]
impl ERC721 {
    pub fn owner_of(&self, token_id: U256) -> Address {
        self.owners.get(token_id)
    }

    pub fn balance_of(&self, owner: Address) -> U256 {
        self.balances.get(owner)
    }

    pub fn mint(&mut self, to: Address) -> U256 {
        let token_id = self.next_token_id.get();

        self.owners.setter(token_id).set(to);
        self.balances.setter(to).add(U256::from(1));
        self.next_token_id.set(token_id + U256::from(1));

        token_id
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) -> bool {
        let owner = self.owners.get(token_id);

        if owner != from {
            return false;
        }

        self.owners.setter(token_id).set(to);
        self.balances.setter(from).sub(U256::from(1));
        self.balances.setter(to).add(U256::from(1));

        true
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
    name: 'SimpleDEX',
    rust: `#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    storage::{StorageMap, StorageU256},
};

#[storage]
#[entrypoint]
pub struct SimpleDEX {
    liquidity: StorageMap<Address, StorageU256>,
    reserves: StorageU256,
}

#[public]
impl SimpleDEX {
    pub fn add_liquidity(&mut self, amount: U256) {
        let provider = msg::sender();
        self.liquidity.setter(provider).add(amount);
        self.reserves.set(self.reserves.get() + amount);
    }

    pub fn remove_liquidity(&mut self, amount: U256) -> bool {
        let provider = msg::sender();
        let current_liquidity = self.liquidity.get(provider);

        if current_liquidity < amount {
            return false;
        }

        self.liquidity.setter(provider).sub(amount);
        self.reserves.set(self.reserves.get() - amount);

        true
    }

    pub fn get_liquidity(&self, provider: Address) -> U256 {
        self.liquidity.get(provider)
    }

    pub fn get_reserves(&self) -> U256 {
        self.reserves.get()
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
