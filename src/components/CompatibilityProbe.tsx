import React, { useState } from 'react';
import {
  Search,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { ChainConfig, Language, ProbeResult } from '../types';
import { isValidAddress, probeNftContract } from '../services/rpc';
import { getT } from '../locales/translations';

interface Props {
  selectedChain: ChainConfig;
  lang: Language;
  sharedNftAddress?: string;
  onNftAddressChange?: (addr: string) => void;
}

export const CompatibilityProbe: React.FC<Props> = ({
  selectedChain,
  lang,
  sharedNftAddress,
  onNftAddressChange,
}) => {
  const t = getT(lang);
  const [nftAddress, setNftAddress] = useState<string>(sharedNftAddress || '');
  const [rpcUrl, setRpcUrl] = useState<string>(selectedChain.rpcUrl);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Sync with shared address
  React.useEffect(() => {
    if (sharedNftAddress !== undefined && sharedNftAddress !== nftAddress) {
      setNftAddress(sharedNftAddress);
    }
  }, [sharedNftAddress]);

  // Sync with selectedChain changes
  React.useEffect(() => {
    setRpcUrl(selectedChain.rpcUrl);
    setError(null);
    setResult(null);
  }, [selectedChain]);

  const handleProbe = async () => {
    if (!isValidAddress(nftAddress)) {
      setError(
        lang === 'zh'
          ? '请输入有效的 42 位 NFT 合约地址 (0x...)'
          : 'Please enter a valid 42-character NFT contract address (0x...)'
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const probeData = await probeNftContract(rpcUrl, nftAddress);
      setResult(probeData);
    } catch (err: any) {
      console.error('Probe failed:', err);
      setError(err.message || 'Failed to inspect contract bytecode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Probe Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              {t.probeTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.probeSubtitle}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t.nftAddressLabel}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={nftAddress}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setNftAddress(val);
                  onNftAddressChange?.(val);
                }}
                placeholder="0x..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                onClick={handleProbe}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>{loading ? t.probing : t.probeButton}</span>
              </button>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>{showAdvanced ? 'Hide Custom RPC' : 'Custom RPC Endpoint'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2">
                <input
                  type="text"
                  value={rpcUrl}
                  onChange={(e) => setRpcUrl(e.target.value.trim())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-300"
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Probe Result Display */}
      {result && (
        <div className="space-y-4">
          {/* Main Verdict Card */}
          <div
            className={`p-5 rounded-xl border text-xs ${
              result.verdict === 'compatible'
                ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200'
                : result.verdict === 'uncertain'
                ? 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {result.verdict === 'compatible' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                )}
                {result.verdict === 'uncertain' && (
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                )}
                {result.verdict === 'incompatible' && (
                  <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {result.verdict === 'compatible' && t.verdictCompatible}
                    {result.verdict === 'uncertain' && t.verdictUncertain}
                    {result.verdict === 'incompatible' && t.verdictIncompatible}
                    {result.verdict === 'unknown' && t.verdictUnknown}
                  </h3>
                  <p className="mt-1 opacity-90 leading-relaxed">{result.why}</p>
                </div>
              </div>

              <span className="font-mono text-slate-400 shrink-0">
                {result.codeBytes.toLocaleString()} bytes
              </span>
            </div>
          </div>

          {/* Opcode Analysis Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block">{t.opcodeOrigin}</span>
              <div className="text-xl font-mono font-bold text-amber-400">
                {result.originCount}
              </div>
              <p className="text-slate-500 text-[11px]">
                {result.originCount === 0
                  ? 'No origin dependencies found'
                  : 'Contract reads tx.origin'}
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block">{t.hasGuard}</span>
              <div
                className={`text-xl font-mono font-bold ${
                  result.hasGuard ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {result.hasGuard ? 'DETECTED' : 'NONE'}
              </div>
              <p className="text-slate-500 text-[11px]">
                {result.hasGuard ? 'Blocks contract callers' : 'Safe to call from contracts'}
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block">{t.opcodeExtcode}</span>
              <div className="text-xl font-mono font-bold text-slate-200">
                {result.extcodesizeChecks}
              </div>
              <p className="text-slate-500 text-[11px]">
                Bypassed during constructor mint
              </p>
            </div>
          </div>

          {/* Proxy Resolution Details */}
          {result.logicVia && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block font-medium">{t.proxyResolution}:</span>
              <div className="font-mono text-slate-300 select-all">
                {result.logicVia}
              </div>
              <p className="text-slate-500 text-[11px]">
                Resolved via EIP-1967 / EIP-1167 proxy introspection.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
