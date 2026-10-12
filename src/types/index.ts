export interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  factoryAddress: string;
  isTestnet?: boolean;
}

export interface PublicDropInfo {
  priceWei: bigint;
  priceEth: string;
  start: number;
  end: number;
  maxPerWallet: number;
  feeRecipient: string | null;
  live: boolean;
  statusText: string;
}

export interface MintStats {
  youMinted: number;
  minted: number;
  max: number;
}

export interface BatchPlan {
  strategy: 'direct' | 'sacrifice';
  directQty: number;
  minters: number;
  perMinterQty: number;
  total: number;
  totalMintCostWei: bigint;
  totalMintCostEth: string;
}

export interface GeneratedTx {
  id: string;
  label: string;
  to: string;
  data: string;
  value: string; // hex
  valueEth: string;
  simulation?: {
    ok: boolean;
    gas?: number;
    error?: string;
  };
  step: number;
  description?: string;
  txHash?: string;
  status?: 'idle' | 'pending' | 'success' | 'error';
}

export interface ProbeResult {
  nft: string;
  logicVia: string | null;
  codeBytes: number;
  verdict: 'compatible' | 'uncertain' | 'incompatible' | 'unknown';
  why: string;
  originCount: number;
  hasGuard: boolean;
  extcodesizeChecks: number;
  note: string;
}

export type Language = 'en' | 'zh';
