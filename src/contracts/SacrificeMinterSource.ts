export const SACRIFICE_MINTER_SOL = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title SacrificeMinter
 * @notice 一笔交易铸多份 NFT，绕过 OpenSea SeaDrop 公售的每钱包上限。
 * @dev 非托管: 工厂无 owner、无手续费、无升级逻辑。
 *      NFT 和花剩下的 ETH 全部归集回发起交易的 msg.sender。
 * 
 * 编译参数:
 *   - solc: 0.8.26
 *   - optimizer: 200 runs
 *   - evmVersion: paris
 */

interface IERC721Like {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

/// @notice 一次性铸造合约。全部动作在构造函数里完成，不部署 runtime code。
/// @dev 每个实例是一个独立的 msg.sender → 独立的 per-wallet 额度。构造期 extcodesize=0，
///      所以 _safeMint 把它当 EOA，也顺带绕过 extcodesize/isContract 反合约检查。
contract Minter {
    constructor(
        address drop,          // mint 目标合约 (SeaDrop 单例)
        bytes memory mintData, // mint 的 calldata (mintPublic)
        uint256 value,         // 这一个 Minter 要花的 mint 费
        address nft,           // NFT 合约
        address recipient      // 收款人 = 工厂的调用者 (msg.sender)
    ) payable {
        uint256 before = _supply(nft);

        // 1. 以「本 Minter 自己」为 minter 去铸 —— 独立地址，独立额度。
        (bool ok, ) = drop.call{value: value}(mintData);
        require(ok, "mint call failed");

        // 2. 把这一次铸到的 NFT 全部转回收款人。
        uint256 afterS = _supply(nft);
        uint256 moved;
        uint256 want = IERC721Like(nft).balanceOf(address(this));

        for (uint256 id = before; id <= afterS && moved < want; id++) {
            if (_ownerIs(nft, id, address(this))) {
                IERC721Like(nft).transferFrom(address(this), recipient, id);
                // M-1: 校验 transferFrom 是否真实变更了 ownership
                require(_ownerIs(nft, id, recipient), "transfer no-op");
                moved++;
            }
        }

        // 3. fail-safe: 没能把全部铸到的 NFT 转出去就整笔回滚
        require(moved == want && want > 0, "sweep incomplete");

        // 4. H-1: 若 drop 存在多付退款，退回 Minter 的 ETH 必须全额转给 recipient
        uint256 dust = address(this).balance;
        if (dust > 0) {
            (bool r, ) = payable(recipient).call{value: dust}("");
            require(r, "minter refund failed");
        }
    }

    function _supply(address nft) private view returns (uint256) {
        (bool ok, bytes memory d) = nft.staticcall(abi.encodeWithSignature("totalSupply()"));
        return (ok && d.length >= 32) ? abi.decode(d, (uint256)) : 0;
    }

    function _ownerIs(address nft, uint256 id, address who) private view returns (bool) {
        (bool ok, bytes memory d) = nft.staticcall(abi.encodeWithSignature("ownerOf(uint256)", id));
        return ok && d.length >= 32 && abi.decode(d, (address)) == who;
    }
}

contract SacrificeMinter {
    uint256 private _lock = 1;
    modifier nonReentrant() {
        require(_lock == 1, "reentrant");
        _lock = 2;
        _;
        _lock = 1;
    }

    event Batch(address indexed user, address indexed drop, uint256 n, uint256 minted, uint256 spent);

    /// @notice 一笔交易铸 N 份。调用者(msg.sender)付全部 gas + 全部 mint 费，NFT 全部回到调用者。
    /// @param drop     mint 目标合约 (SeaDrop 单例 0x00005EA00Ac477B1030CE78506496e8C2dE24bf5)
    /// @param mintData 每个 Minter 执行的 mint calldata
    /// @param perMint  每个 Minter 的 mint 费(wei)
    /// @param nft      NFT 合约地址
    /// @param n        份数
    function batchMint(
        address drop,
        bytes calldata mintData,
        uint256 perMint,
        address nft,
        uint256 n
    ) external payable nonReentrant {
        require(n > 0 && n <= 100, "n out of range");
        require(msg.value >= perMint * n, "insufficient value");

        address user = msg.sender;
        uint256 minted;

        for (uint256 i = 0; i < n; i++) {
            new Minter{value: perMint}(drop, mintData, perMint, nft, user);
            minted++;
        }

        // 花剩下的全额退回调用者
        uint256 leftover = address(this).balance;
        if (leftover > 0) {
            (bool ok, ) = payable(user).call{value: leftover}("");
            require(ok, "refund failed");
        }

        emit Batch(user, drop, n, minted, perMint * n);
    }
}
`;

export const BATCH_MINT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'drop', type: 'address' },
      { internalType: 'bytes', name: 'mintData', type: 'bytes' },
      { internalType: 'uint256', name: 'perMint', type: 'uint256' },
      { internalType: 'address', name: 'nft', type: 'address' },
      { internalType: 'uint256', name: 'n', type: 'uint256' },
    ],
    name: 'batchMint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const SEADROP_MINT_PUBLIC_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' },
      { internalType: 'address', name: 'minterIfNotPayer', type: 'address' },
      { internalType: 'uint256', name: 'quantity', type: 'uint256' },
    ],
    name: 'mintPublic',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;
