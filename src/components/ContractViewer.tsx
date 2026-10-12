import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  ShieldCheck,
  Code2,
  Server,
} from 'lucide-react';
import { Language } from '../types';
import { SACRIFICE_MINTER_SOL } from '../contracts/SacrificeMinterSource';
import { getT } from '../locales/translations';

interface Props {
  lang: Language;
}

export const ContractViewer: React.FC<Props> = ({ lang }) => {
  const t = getT(lang);
  const [copied, setCopied] = useState<boolean>(false);

  const copyCode = () => {
    navigator.clipboard.writeText(SACRIFICE_MINTER_SOL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Specs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              {t.tabs.contract}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'zh'
                ? '经对抗性安全审计，字节码与链上完全一致，无任何管理员后门或资金托管'
                : 'Audited against adversarial vectors, strictly non-custodial with zero owner backdoors'}
            </p>
          </div>

          <button
            onClick={copyCode}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'zh' ? '已复制源码' : 'Copied Source!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '复制完整源码' : 'Copy Full Solidity'}</span>
              </>
            )}
          </button>
        </div>

        {/* Compiler Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block mb-0.5 font-sans">Compiler</span>
            <span className="text-slate-200 font-semibold">solc 0.8.26</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block mb-0.5 font-sans">Optimizer</span>
            <span className="text-slate-200 font-semibold">Enabled (200)</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block mb-0.5 font-sans">EVM Target</span>
            <span className="text-slate-200 font-semibold">paris</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block mb-0.5 font-sans">Batch Cap</span>
            <span className="text-slate-200 font-semibold">n ≤ 100 / tx</span>
          </div>
        </div>
      </div>

      {/* Security Mitigations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.h1Title}</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {t.h1Desc}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.m1Title}</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {t.m1Desc}
          </p>
        </div>
      </div>

      {/* Solidity Code viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-mono text-slate-300 flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            contracts/SacrificeMinter.sol
          </span>
          <span className="text-slate-500 font-mono text-[11px]">MIT</span>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[460px] select-all">
          {SACRIFICE_MINTER_SOL}
        </pre>
      </div>

      {/* Deployment Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-amber-400" />
          {lang === 'zh' ? '在任意 EVM 链部署工厂合约' : 'Deploying Factory on Any EVM Chain'}
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed pl-1">
          <li>
            {lang === 'zh'
              ? '使用 Remix 或 Foundry 编译 SacrificeMinter.sol（solc 0.8.26, 200 runs, evmVersion: paris）。'
              : 'Compile SacrificeMinter.sol in Remix or Foundry (solc 0.8.26, 200 runs, evmVersion: paris).'}
          </li>
          <li>
            {lang === 'zh'
              ? '直接部署 SacrificeMinter（无构造函数参数、无 owner、无管理员权限）。'
              : 'Deploy SacrificeMinter directly (no constructor arguments, no owner).'}
          </li>
          <li>
            {lang === 'zh'
              ? '在区块浏览器开源验证代码，将部署地址填入批量铸造规划器即可立即使用。'
              : 'Verify contract source on the explorer and paste the address into the planner.'}
          </li>
        </ol>
      </div>
    </div>
  );
};
