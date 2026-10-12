import { SEADROP_SINGLETON } from '../config/chains';
import { BatchPlan, GeneratedTx, MintStats, ProbeResult, PublicDropInfo } from '../types';

const SEL = {
  getPublicDrop: '0xbc6a629c',
  getAllowedFeeRecipients: '0x68632274',
  mintPublic: '0x161ac21f',
  batchMint: '0x61da17ef',
  getMintStats: '0x840e15d4',
  totalSupply: '0x18160ddd',
};

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'; // EIP-1967
const MINIMAL_PROXY = /363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e/i; // EIP-1167

export const padWord = (n: number | bigint | string): string => {
  return BigInt(n).toString(16).padStart(64, '0');
};

export const padAddr = (addr: string): string => {
  return addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
};

export const toHex = (n: number | bigint): string => {
  return '0x' + BigInt(n).toString(16);
};

export const isValidAddress = (addr: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
};

export const formatEth = (wei: bigint): string => {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return '0 ETH (Free)';
  if (eth < 0.0001) return `${eth.toFixed(6)} ETH`;
  return `${eth.toFixed(4)} ETH`;
};

export async function callRpc(rpcUrl: string, method: string, params: unknown[]): Promise<any> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message || JSON.stringify(json.error));
    }
    return json.result;
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
      throw new Error(`RPC 节点网络响应超时或被浏览器拦截 (${rpcUrl})，请检查网络或在高级设置中更换自定义 RPC。`);
    }
    throw err;
  }
}

/** Opcode parser skipping PUSH immediate bytes */
export function extractOpcodes(hex: string): number[] {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }

  const ops: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const op = bytes[i];
    ops.push(op);
    if (op >= 0x60 && op <= 0x7f) {
      // PUSH1 (0x60) pushes 1 byte, PUSH32 (0x7f) pushes 32 bytes
      i += op - 0x5f;
    }
  }
  return ops;
}

/** Resolves contract bytecode, following EIP-1967 and EIP-1167 proxies */
export async function getLogicCode(
  rpcUrl: string,
  targetAddr: string
): Promise<{ code: string | null; via: string | null }> {
  const code = await callRpc(rpcUrl, 'eth_getCode', [targetAddr, 'latest']);
  if (!code || code === '0x' || code === '0x0') {
    return { code: null, via: null };
  }

  // Check EIP-1167 minimal proxy
  const minimalMatch = MINIMAL_PROXY.exec(code.slice(2));
  let implAddr = minimalMatch ? '0x' + minimalMatch[1] : null;

  // Check EIP-1967 implementation slot
  if (!implAddr) {
    try {
      const slotVal = await callRpc(rpcUrl, 'eth_getStorageAt', [targetAddr, IMPL_SLOT, 'latest']);
      if (slotVal && /[1-9a-f]/i.test(slotVal.slice(2))) {
        implAddr = '0x' + slotVal.slice(-40);
      }
    } catch {
      // Slot query may fail on some chains, ignore
    }
  }

  if (implAddr && isValidAddress(implAddr)) {
    try {
      const implCode = await callRpc(rpcUrl, 'eth_getCode', [implAddr, 'latest']);
      if (implCode && implCode !== '0x') {
        return { code: implCode, via: implAddr };
      }
    } catch {
      // fallback to original code
    }
  }

  return { code, via: null };
}

/** Bytecode compatibility probe for Sacrifice Minter pattern */
export async function probeNftContract(rpcUrl: string, nftAddress: string): Promise<ProbeResult> {
  const { code, via } = await getLogicCode(rpcUrl, nftAddress);
  if (!code) {
    return {
      nft: nftAddress,
      logicVia: null,
      codeBytes: 0,
      verdict: 'unknown',
      why: 'No bytecode found at this address on this network.',
      originCount: 0,
      hasGuard: false,
      extcodesizeChecks: 0,
      note: 'Ensure the address is a deployed contract and the selected network is correct.',
    };
  }

  const ops = extractOpcodes(code);
  let originCount = 0;
  let extcodesizeChecks = 0;
  let hasGuard = false;

  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === 0x32) originCount++; // ORIGIN
    if (ops[i] === 0x3b) extcodesizeChecks++; // EXTCODESIZE
    if (
      i + 2 < ops.length &&
      ops[i + 2] === 0x14 &&
      ((ops[i] === 0x33 && ops[i + 1] === 0x32) || (ops[i] === 0x32 && ops[i + 1] === 0x33))
    ) {
      // msg.sender == tx.origin or tx.origin == msg.sender
      hasGuard = true;
    }
  }

  const codeBytes = Math.floor((code.length - 2) / 2);
  let verdict: 'compatible' | 'uncertain' | 'incompatible' = 'compatible';
  let why = '';

  if (hasGuard) {
    verdict = 'incompatible';
    why = 'Contains strict require(msg.sender == tx.origin) guard. Any contract caller will revert.';
  } else if (originCount > 0) {
    verdict = 'uncertain';
    why = `tx.origin is referenced ${originCount} time(s). The per-wallet mint cap may be tied to the origin wallet. Verify with simulation.`;
  } else {
    verdict = 'compatible';
    why = 'Zero tx.origin opcodes found. Per-wallet limit is keyed only on msg.sender, enabling full multi-minter batching.';
  }

  return {
    nft: nftAddress,
    logicVia: via,
    codeBytes,
    verdict,
    why,
    originCount,
    hasGuard,
    extcodesizeChecks,
    note: 'EXTCODESIZE anti-bot checks are automatically bypassed because Sacrifice Minters execute during constructor creation (extcodesize == 0).',
  };
}

/** Queries SeaDrop public sale info */
export async function fetchPublicDropInfo(
  rpcUrl: string,
  nftAddress: string
): Promise<PublicDropInfo> {
  const callData = SEL.getPublicDrop + padAddr(nftAddress);
  const rawDrop = await callRpc(rpcUrl, 'eth_call', [
    { to: SEADROP_SINGLETON, data: callData },
    'latest',
  ]);

  const clean = rawDrop.replace(/^0x/, '');
  if (!clean || clean.length < 256) {
    throw new Error('Contract did not return valid SeaDrop PublicDrop data. It may not be registered on SeaDrop.');
  }

  const wordVal = (idx: number) => BigInt('0x' + clean.slice(idx * 64, (idx + 1) * 64));

  const priceWei = wordVal(0);
  const start = Number(wordVal(1));
  const end = Number(wordVal(2));
  const maxPerWallet = Number(wordVal(3));

  // Query Allowed Fee Recipient
  let feeRecipient: string | null = null;
  try {
    const frCallData = SEL.getAllowedFeeRecipients + padAddr(nftAddress);
    const rawFr = (
      await callRpc(rpcUrl, 'eth_call', [
        { to: SEADROP_SINGLETON, data: frCallData },
        'latest',
      ])
    ).replace(/^0x/, '');

    if (rawFr.length >= 192) {
      const count = parseInt(rawFr.slice(64, 128), 16);
      if (count > 0) {
        feeRecipient = '0x' + rawFr.slice(128 + 24, 192);
      }
    }
  } catch {
    // some drops might default to 0x0 fee recipient
  }

  const now = Math.floor(Date.now() / 1000);
  const live = end > now && start <= now && maxPerWallet > 0 && !!feeRecipient;

  let statusText = 'Active Public Sale';
  if (maxPerWallet === 0 && priceWei === 0n && start === 0) {
    statusText = 'Not Registered on SeaDrop';
  } else if (now < start) {
    const diffHours = Math.round((start - now) / 3600);
    statusText = `Sale Not Started (Starts in ~${diffHours}h)`;
  } else if (now > end) {
    statusText = 'Sale Has Ended';
  } else if (!feeRecipient) {
    statusText = 'No Allowed Fee Recipient Configured';
  }

  return {
    priceWei,
    priceEth: formatEth(priceWei),
    start,
    end,
    maxPerWallet,
    feeRecipient,
    live,
    statusText,
  };
}

/** Queries mint statistics (youMinted, totalMinted, maxSupply) */
export async function fetchMintStats(
  rpcUrl: string,
  nftAddress: string,
  userAddress?: string
): Promise<MintStats | null> {
  const queryAddr = userAddress && isValidAddress(userAddress) ? userAddress : ZERO_ADDR;
  try {
    const callData = SEL.getMintStats + padAddr(queryAddr);
    const res = (
      await callRpc(rpcUrl, 'eth_call', [{ to: nftAddress, data: callData }, 'latest'])
    ).replace(/^0x/, '');

    if (res.length >= 192) {
      return {
        youMinted: Number(BigInt('0x' + res.slice(0, 64))),
        minted: Number(BigInt('0x' + res.slice(64, 128))),
        max: Number(BigInt('0x' + res.slice(128, 192))),
      };
    }
  } catch {
    // fallback to totalSupply
    try {
      const resSupply = await callRpc(rpcUrl, 'eth_call', [
        { to: nftAddress, data: SEL.totalSupply },
        'latest',
      ]);
      const minted = Number(BigInt(resSupply));
      return { youMinted: 0, minted, max: 0 };
    } catch {
      // ignore
    }
  }
  return null;
}

/** Calculates the mint plan (supports 1-Tx pure batch or 2-Tx gas-saver) */
export function planBatch(
  total: number,
  maxPerWallet: number,
  priceWei: bigint,
  singleTxMode: boolean = false
): BatchPlan {
  const t = Math.max(1, total);
  const cap = maxPerWallet || 0;

  let strategy: 'direct' | 'sacrifice' = 'direct';
  let directQty = t;
  let minters = 0;
  let perMinterQty = 0;

  if (cap > 0 && t > cap) {
    strategy = 'sacrifice';
    if (singleTxMode) {
      // 纯一笔交易模式：全走工厂，零拆分，只需签名 1 次！
      minters = Math.ceil(t / cap);
      perMinterQty = Math.ceil(t / minters);
      if (perMinterQty > cap) {
        minters = Math.ceil(t / cap);
        perMinterQty = cap;
      }
      directQty = 0;
    } else {
      // 最省 Gas 混合模式：钱包自铸余数，省 1 个临时合约部署费
      minters = Math.ceil(t / cap) - 1;
      directQty = t - minters * cap;
      perMinterQty = cap;
    }
  }

  const effectiveTotal = singleTxMode && minters > 0 ? minters * perMinterQty : t;
  const totalMintCostWei = priceWei * BigInt(effectiveTotal);

  return {
    strategy,
    directQty,
    minters,
    perMinterQty,
    total: effectiveTotal,
    totalMintCostWei,
    totalMintCostEth: formatEth(totalMintCostWei),
  };
}

/** Encodes SeaDrop mintPublic calldata */
export function encodeMintPublicCalldata(
  nftAddress: string,
  feeRecipient: string,
  quantity: number
): string {
  return (
    SEL.mintPublic +
    padAddr(nftAddress) +
    padAddr(feeRecipient) +
    padAddr(ZERO_ADDR) +
    padWord(quantity)
  );
}

/** Encodes SacrificeMinter batchMint calldata */
export function encodeBatchMintCalldata(
  drop: string,
  mintData: string,
  perMintWei: bigint,
  nftAddress: string,
  mintersCount: number
): string {
  const d = mintData.replace(/^0x/, '');
  const len = d.length / 2;
  const paddingLength = (64 - (d.length % 64)) % 64;
  const padded = d + '0'.repeat(paddingLength);

  return (
    SEL.batchMint +
    padAddr(drop) +
    padWord(5 * 32) + // offset to bytes mintData (5 head parameters)
    padWord(perMintWei) +
    padAddr(nftAddress) +
    padWord(mintersCount) +
    padWord(len) +
    padded
  );
}

/** Builds the transaction list for the plan */
export function buildTransactions(
  nftAddress: string,
  feeRecipient: string,
  factoryAddress: string,
  plan: BatchPlan,
  priceWei: bigint
): GeneratedTx[] {
  const txs: GeneratedTx[] = [];
  let step = 1;

  if (plan.minters > 0) {
    const perMint = priceWei * BigInt(plan.perMinterQty);
    const factoryValueWei = perMint * BigInt(plan.minters);
    const mintData = encodeMintPublicCalldata(nftAddress, feeRecipient, plan.perMinterQty);
    const data = encodeBatchMintCalldata(
      SEADROP_SINGLETON,
      mintData,
      perMint,
      nftAddress,
      plan.minters
    );

    txs.push({
      id: 'factory-batch',
      step: step++,
      label: `Factory Batch Mint: Deploy ${plan.minters} Minters × ${plan.perMinterQty} NFTs`,
      to: factoryAddress,
      data,
      value: toHex(factoryValueWei),
      valueEth: formatEth(factoryValueWei),
      description: `Factory deploys ${plan.minters} ephemeral Minter contracts that each mint ${plan.perMinterQty} NFTs and instantly sweep tokens back to your wallet.`,
    });
  }

  if (plan.directQty > 0) {
    const directValueWei = priceWei * BigInt(plan.directQty);
    const data = encodeMintPublicCalldata(nftAddress, feeRecipient, plan.directQty);

    txs.push({
      id: 'direct-mint',
      step: step++,
      label: `Direct Mint: Your Wallet × ${plan.directQty} NFT${plan.directQty > 1 ? 's' : ''}`,
      to: SEADROP_SINGLETON,
      data,
      value: toHex(directValueWei),
      valueEth: formatEth(directValueWei),
      description: `Direct SeaDrop public sale mint from your connected wallet for the remainder of your total order.`,
    });
  }

  return txs;
}

/** Simulates a transaction using eth_estimateGas and eth_call */
export async function simulateTransaction(
  rpcUrl: string,
  tx: GeneratedTx,
  fromAddress: string
): Promise<{ ok: boolean; gas?: number; error?: string }> {
  try {
    const gasHex = await callRpc(rpcUrl, 'eth_estimateGas', [
      {
        from: fromAddress,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      },
    ]);
    return {
      ok: true,
      gas: Number(BigInt(gasHex)),
    };
  } catch (err: any) {
    const msg = err.message || String(err);
    return {
      ok: false,
      error: msg.length > 250 ? msg.slice(0, 250) + '...' : msg,
    };
  }
}
