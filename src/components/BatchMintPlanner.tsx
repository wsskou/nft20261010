import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Zap,
  Play,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Info,
  Sliders,
  Send,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  BatchPlan,
  ChainConfig,
  GeneratedTx,
  Language,
  MintStats,
  PublicDropInfo,
} from '../types';
import { SEADROP_SINGLETON } from '../config/chains';
import {
  buildTransactions,
  fetchMintStats,
  fetchPublicDropInfo,
  formatEth,
  isValidAddress,
  planBatch,
  simulateTransaction,
} from '../services/rpc';
import { getT } from '../locales/translations';

interface Props {
  selectedChain: ChainConfig;
  connectedAddress: string | null;
  lang: Language;
  sharedNftAddress?: string;
  onNftAddressChange?: (addr: string) => void;
  isSideBySide?: boolean;
}

export const BatchMintPlanner: React.FC<Props> = ({
  selectedChain,
  connectedAddress,
  lang,
  sharedNftAddress,
  onNftAddressChange,
  isSideBySide = true,
}) => {
  const t = getT(lang);

  // Form states
  const [nftAddress, setNftAddress] = useState<string>(sharedNftAddress || '');
  const [totalWanted, setTotalWanted] = useState<number>(20);
  const [singleTxMode, setSingleTxMode] = useState<boolean>(true);
  const [factoryAddress, setFactoryAddress] = useState<string>(selectedChain.factoryAddress);
  const [payerAddress, setPayerAddress] = useState<string>(connectedAddress || '');
  const [rpcUrl, setRpcUrl] = useState<string>(selectedChain.rpcUrl);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Keep in sync with shared address
  useEffect(() => {
    if (sharedNftAddress !== undefined && sharedNftAddress !== nftAddress) {
      setNftAddress(sharedNftAddress);
    }
  }, [sharedNftAddress]);

  // Query & Computation states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dropInfo, setDropInfo] = useState<PublicDropInfo | null>(null);
  const [mintStats, setMintStats] = useState<MintStats | null>(null);
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [transactions, setTransactions] = useState<GeneratedTx[]>([]);

  // Simulation states
  const [simulating, setSimulating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingTxId, setSendingTxId] = useState<string | null>(null);

  // Sync chain changes
  useEffect(() => {
    setFactoryAddress(selectedChain.factoryAddress);
    setRpcUrl(selectedChain.rpcUrl);
    setDropInfo(null);
    setMintStats(null);
    setPlan(null);
    setTransactions([]);
  }, [selectedChain]);

  // Sync connected wallet
  useEffect(() => {
    if (connectedAddress && !payerAddress) {
      setPayerAddress(connectedAddress);
    }
  }, [connectedAddress, payerAddress]);

  // Inspect drop & generate plan
  const handleInspectAndPlan = async () => {
    if (!isValidAddress(nftAddress)) {
      setError(
        lang === 'zh'
          ? '请输入有效的 42 位 NFT 合约地址 (0x...)'
          : 'Please enter a valid 42-character NFT contract address (0x...)'
      );
      return;
    }

    if (!isValidAddress(factoryAddress)) {
      setError(
        lang === 'zh'
          ? '请输入有效的工厂合约地址'
          : 'Please enter a valid SacrificeMinter factory address'
      );
      return;
    }

    const currentPayer = payerAddress || connectedAddress || '0x0000000000000000000000000000000000000001';

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch public sale info from SeaDrop singleton
      const drop = await fetchPublicDropInfo(rpcUrl, nftAddress);
      setDropInfo(drop);

      // 2. Fetch mint stats
      const stats = await fetchMintStats(rpcUrl, nftAddress, currentPayer);
      setMintStats(stats);

      // 3. Calculate optimal allocation plan
      let effectiveSingleMode = singleTxMode;
      if (stats && stats.youMinted >= drop.maxPerWallet) {
        effectiveSingleMode = true;
        setSingleTxMode(true);
      }
      const calculatedPlan = planBatch(totalWanted, drop.maxPerWallet, drop.priceWei, effectiveSingleMode);
      setPlan(calculatedPlan);

      // 4. Build non-custodial transactions
      const feeRecipient = drop.feeRecipient || '0x0000000000000000000000000000000000000000';
      const txList = buildTransactions(
        nftAddress,
        feeRecipient,
        factoryAddress,
        calculatedPlan,
        drop.priceWei
      );
      setTransactions(txList);
    } catch (err: any) {
      console.error('Inspect drop failed:', err);
      setError(err.message || 'Failed to inspect drop on SeaDrop singleton');
    } finally {
      setLoading(false);
    }
  };

  const updatePlanMode = (isSingle: boolean) => {
    setSingleTxMode(isSingle);
    if (!dropInfo) return;
    const feeRecipient = dropInfo.feeRecipient || '0x0000000000000000000000000000000000000000';
    const newPlan = planBatch(totalWanted, dropInfo.maxPerWallet, dropInfo.priceWei, isSingle);
    setPlan(newPlan);
    const newTxs = buildTransactions(
      nftAddress,
      feeRecipient,
      factoryAddress,
      newPlan,
      dropInfo.priceWei
    );
    setTransactions(newTxs);
  };

  // Simulate all generated transactions on RPC
  const handleSimulateAll = async () => {
    if (transactions.length === 0) return;
    const simFrom = payerAddress || connectedAddress;
    if (!simFrom || !isValidAddress(simFrom)) {
      setError(
        lang === 'zh'
          ? '模拟需要提供一个发起者钱包地址，请连接钱包或在配置中填写'
          : 'Simulation requires a payer address. Please connect your wallet or provide one in settings.'
      );
      return;
    }

    try {
      setSimulating(true);
      const updatedTxs = [...transactions];

      for (let i = 0; i < updatedTxs.length; i++) {
        const simResult = await simulateTransaction(rpcUrl, updatedTxs[i], simFrom);
        updatedTxs[i] = {
          ...updatedTxs[i],
          simulation: simResult,
        };
      }

      setTransactions(updatedTxs);
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Send transaction via connected Web3 wallet
  const handleSendTx = async (tx: GeneratedTx) => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert(
        lang === 'zh'
          ? '未检测到浏览器钱包。请直接复制 Calldata 在支持的钱包或 Safe 中发送。'
          : 'No browser wallet detected. You can copy the Calldata and execute via Safe or your preferred wallet.'
      );
      return;
    }

    try {
      setSendingTxId(tx.id);

      // Pre-flight simulation check to prevent greyed-out wallet confirm button
      const sim = await simulateTransaction(rpcUrl, tx, connectedAddress || payerAddress);
      if (!sim.ok) {
        alert(
          lang === 'zh'
            ? `⚠️ 交易无法执行（链上预检回滚）：\n\n原因: ${sim.error || 'mint call failed'}\n\n钱包因为检测到交易会失败，所以将「确认」按钮置灰以保护您的 Gas。\n请检查：\n1. 填写的 NFT 是否为有效的 SeaDrop 活跃公售\n2. 钱包余额是否充足支付费用与 Gas`
            : `⚠️ Transaction reverted during pre-flight simulation:\n\nReason: ${sim.error || 'revert'}\n\nThe wallet disables the "Confirm" button to protect your gas when a transaction is expected to fail.`
        );
        return;
      }

      const provider = (window as any).ethereum;
      const txParams: any = {
        from: connectedAddress,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      };

      if (sim.gas) {
        // Add 25% safety buffer to gas limit
        txParams.gas = '0x' + Math.ceil(sim.gas * 1.25).toString(16);
      }

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setTransactions((prev) =>
        prev.map((item) =>
          item.id === tx.id ? { ...item, txHash, status: 'success' } : item
        )
      );
    } catch (err: any) {
      console.error('Send transaction error:', err);
      alert(`Transaction failed: ${err.message || err}`);
    } finally {
      setSendingTxId(null);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Responsive Workbench Grid */}
      <div className={isSideBySide ? 'space-y-5' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}>
        {/* Form Controls & Inputs */}
        <div className={`${isSideBySide ? 'w-full' : 'lg:col-span-5'} bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4`}>
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white tracking-tight">
              {lang === 'zh' ? '铸造参数配置' : 'Mint Configuration'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'zh'
                ? '输入目标 NFT 合约与期望数量，系统自动解析 SeaDrop 公售并规划最优路径。'
                : 'Enter target NFT contract and total wanted to plan optimal non-custodial batching.'}
            </p>
          </div>

          {/* NFT Address Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                {t.nftAddressLabel}
              </label>
              {nftAddress && (
                <span className="text-[11px] text-slate-500">
                  {isValidAddress(nftAddress) ? 'Valid address' : 'Invalid format'}
                </span>
              )}
            </div>
            <input
              type="text"
              value={nftAddress}
              onChange={(e) => {
                const val = e.target.value.trim();
                setNftAddress(val);
                onNftAddressChange?.(val);
              }}
              placeholder="0x..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Quantity Stepper & Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                {t.totalWantedLabel}
              </label>
              <span className="text-xs font-mono font-semibold text-amber-400">
                {totalWanted} NFTs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={totalWanted}
                onChange={(e) =>
                  setTotalWanted(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                }
                className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1.5 flex-1">
                {[5, 10, 20, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTotalWanted(num)}
                    className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                      totalWanted === num
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 1-Tx vs 2-Tx Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                {lang === 'zh' ? '签名执行模式' : 'Signature Mode'}
              </label>
              <span className="text-[11px] text-amber-400 font-medium">
                {singleTxMode
                  ? lang === 'zh'
                    ? '⚡ 只需签名 1 次'
                    : '1 Signature Only'
                  : lang === 'zh'
                  ? '⛽ 签名 2 次 (省 Gas)'
                  : '2 Signatures (Saves Gas)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => updatePlanMode(true)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  singleTxMode
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-medium'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>{lang === 'zh' ? '纯 1 笔交易' : '1-Tx Pure Batch'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {lang === 'zh' ? '推荐' : 'Recommended'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {lang === 'zh' ? '全部由工厂临时合约完成并归集，只需点 1 次签名！' : 'All minted via factory minters, sign only once!'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => updatePlanMode(false)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  !singleTxMode
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-medium'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>{lang === 'zh' ? '省 Gas 模式' : 'Gas-Saver Mode'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {lang === 'zh' ? '签 2 笔' : '2 Txs'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {lang === 'zh' ? '主钱包直铸余数，省 1 个临时合约部署费。' : 'Wallet mints remainder directly to save ~120k gas.'}
                </div>
              </button>
            </div>
          </div>

          {/* Recipient / Payer Address */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t.payerAddressLabel}
            </label>
            <input
              type="text"
              value={payerAddress}
              onChange={(e) => setPayerAddress(e.target.value.trim())}
              placeholder={connectedAddress || '0x... (Will receive all minted tokens)'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Advanced toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>{showAdvanced ? 'Hide Advanced Config' : 'Show Advanced Config (RPC / Factory)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {t.factoryAddressLabel}
                  </label>
                  <input
                    type="text"
                    value={factoryAddress}
                    onChange={(e) => setFactoryAddress(e.target.value.trim())}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">RPC URL</label>
                  <input
                    type="text"
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value.trim())}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={handleInspectAndPlan}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{loading ? t.loadingDrop : t.fetchDropButton}</span>
          </button>
        </div>

        {/* Live Drop State & Allocation Strategy */}
        <div className={isSideBySide ? 'w-full space-y-4' : 'lg:col-span-7 space-y-5'}>
          {!dropInfo ? (
            isSideBySide ? null : (
            /* Clean Empty / Educational State */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-300 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white">
                  {lang === 'zh' ? 'SeaDrop 批量铸造原理' : 'How SeaDrop Batch Minting Works'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'zh'
                    ? '只需填入 NFT 合约并点击「读取公售参数并规划」，即可获取链上实时发售状态。'
                    : 'Configure parameters on the left and click "Inspect Drop & Plan" to fetch real-time state.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                  <div className="font-semibold text-slate-200">1. {lang === 'zh' ? '独立额度' : 'Individual Caps'}</div>
                  <p className="text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '工厂在同一笔交易内部署多个一次性 Minter，每个合约都是独立 msg.sender。'
                      : 'Factory deploys disposable Minters in 1 transaction, each being a distinct msg.sender.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                  <div className="font-semibold text-slate-200">2. {lang === 'zh' ? '反反合约' : 'Bypass Checks'}</div>
                  <p className="text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '在构造函数期间铸造（extcodesize == 0），完全绕过反合约与 bot 检测。'
                      : 'Mints inside constructor where extcodesize == 0, bypassing anti-bot filters.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                  <div className="font-semibold text-slate-200">3. {lang === 'zh' ? '全额归集' : 'Instant Sweep'}</div>
                  <p className="text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '铸到的 NFT 与未花完的 ETH 立即全部转回你的主钱包，零资产残留。'
                      : 'All NFTs and refunded ETH sweep back to your wallet instantly.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>{lang === 'zh' ? '已验证网络与工厂' : 'Verified Chains & Factory'}:</span>
                <span className="font-mono text-slate-300">
                  Robinhood (4663) · Ink (57073) · Arc (5042) · Base (8453)
                </span>
              </div>
            </div>
            )
          ) : (
            /* Live On-Chain Parameters and Calculated Strategy */
            <div className="space-y-4">
              {/* Drop Overview Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dropInfo.live ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <h3 className="text-sm font-semibold text-white">
                      {dropInfo.statusText}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {t.dropDetails}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">{t.price}</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {dropInfo.priceEth}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">{t.cap}</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {dropInfo.maxPerWallet} / wallet
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">{t.feeRecipient}</span>
                    <span
                      className="font-mono text-slate-300 truncate block"
                      title={dropInfo.feeRecipient || 'None'}
                    >
                      {dropInfo.feeRecipient ? `${dropInfo.feeRecipient.slice(0, 6)}...` : 'None'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">{lang === 'zh' ? '单例合约' : 'Singleton'}</span>
                    <span className="font-mono text-slate-400 text-[11px] block truncate">
                      SeaDrop 1.0
                    </span>
                  </div>
                </div>

                {mintStats && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {t.supplyStats}:{' '}
                      <span className="font-mono text-slate-200">
                        {mintStats.minted}
                        {mintStats.max > 0 ? ` / ${mintStats.max}` : ''}
                      </span>
                    </span>
                    {mintStats.youMinted > 0 && (
                      <span className="text-amber-400">
                        {lang === 'zh' ? '你的钱包已铸' : 'Already minted'}: {mintStats.youMinted}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Optimal Strategy Card */}
              {plan && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      {t.cheapestPlan}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {plan.strategy === 'direct' ? t.strategyDirect : t.strategySacrifice}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 block mb-0.5">{t.mintersNeeded}</span>
                      <span className="text-base font-mono font-bold text-amber-400">
                        {plan.minters}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {plan.minters > 0 ? `${plan.minters} × ${plan.perMinterQty}` : '0'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 block mb-0.5">{t.directMintCount}</span>
                      <span className="text-base font-mono font-bold text-slate-200">
                        {plan.directQty}
                      </span>
                      <span className="text-[10px] text-slate-500 block">From your wallet</span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 block mb-0.5">{t.totalCost}</span>
                      <span className="text-base font-mono font-bold text-emerald-400">
                        {plan.totalMintCostEth}
                      </span>
                      <span className="text-[10px] text-slate-500 block">For {plan.total} total</span>
                    </div>
                  </div>

                  {/* Execution Flow Diagram */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span>Caller</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                      <span>Factory</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                      <span>{plan.minters} Disposable Minters</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-emerald-400">Tokens & ETH Swept Back</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generated Transactions Queue */}
      {transactions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {lang === 'zh' ? '待发送交易清单' : 'Transactions Queue'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'zh'
                  ? '请严格按顺序执行：先发送工厂批量交易，再发送自己钱包的直接铸造交易。'
                  : 'Execute in sequence: Factory batch mint first, then wallet direct mint.'}
              </p>
            </div>

            <button
              onClick={handleSimulateAll}
              disabled={simulating}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>{simulating ? t.simulating : t.simulateAll}</span>
            </button>
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => {
              const isFactoryTx = tx.id === 'factory-batch';
              const isSimSuccess = tx.simulation?.ok;
              const hasSim = tx.simulation !== undefined;

              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-bold text-xs">
                        {tx.step}
                      </span>
                      <span className="font-semibold text-slate-200">{tx.label}</span>
                    </div>

                    {hasSim && (
                      <div>
                        {isSimSuccess ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.simulationPassed} ({tx.simulation?.gas?.toLocaleString()} gas)
                          </span>
                        ) : (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {t.simulationFailed}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Transaction specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 font-sans block">To:</span>
                      <span className="text-slate-300 truncate block select-all">{tx.to}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-sans block">Value:</span>
                      <span className="text-slate-200">{tx.valueEth}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-sans block">Calldata:</span>
                      <span className="text-slate-400">
                        {Math.floor((tx.data.length - 2) / 2)} bytes
                      </span>
                    </div>
                  </div>

                  {tx.simulation && !tx.simulation.ok && (
                    <div className="p-2.5 rounded bg-rose-950/30 border border-rose-900/50 text-rose-300 font-mono text-[11px]">
                      Revert error: {tx.simulation.error}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => copyToClipboard(tx.data, tx.id)}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedId === tx.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{t.calldataCopied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{t.copyCalldata}</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify({ to: tx.to, data: tx.data, value: tx.value }, null, 2),
                            `json-${tx.id}`
                          )
                        }
                        className="px-3 py-1 rounded border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        {copiedId === `json-${tx.id}` ? 'Copied' : 'Copy JSON'}
                      </button>

                      {connectedAddress && (
                        <button
                          onClick={() => handleSendTx(tx)}
                          disabled={sendingTxId === tx.id}
                          className="px-3.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium transition-colors cursor-pointer"
                        >
                          {sendingTxId === tx.id ? 'Sending...' : t.sendTx}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
