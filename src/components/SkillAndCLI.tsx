import React from 'react';
import {
  Terminal,
  Bot,
  HelpCircle,
} from 'lucide-react';
import { Language } from '../types';

interface Props {
  lang: Language;
}

export const SkillAndCLI: React.FC<Props> = ({ lang }) => {
  const isZh = lang === 'zh';

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-4 h-4 text-amber-400" />
            {isZh ? 'Claude Code / AI Agent Skill 规范' : 'AI Agent Skill Specification'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isZh
              ? '专为 AI 编码助手与自动化 Agent 设计的非托管 SeaDrop 批量铸造技能'
              : 'Turn-key non-custodial batch minting protocol specification for autonomous AI agents'}
          </p>
        </div>

        {/* 5 Mandatory Rules */}
        <div>
          <h3 className="text-xs font-semibold text-slate-300 mb-3">
            {isZh ? 'AI Agent 必须遵守的 4 条安全守则' : '4 Mandatory Agent Rules'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-200">
                1. {isZh ? '绝不索取或使用私钥' : 'Never Touch Private Keys'}
              </div>
              <p className="text-slate-400 leading-relaxed">
                {isZh
                  ? '永远不要索取、读取、保存或使用用户的私钥或助记词。只负责只读读链与模拟，交易由用户自己在钱包中签名。'
                  : 'Never ask for, read, store, or touch private keys. The skill only queries chain and simulates.'}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-200">
                2. {isZh ? '必须先模拟，失败绝不建议发送' : 'Always Simulate First'}
              </div>
              <p className="text-slate-400 leading-relaxed">
                {isZh
                  ? '对每笔交易执行 eth_estimateGas；任何一笔 simulation.ok=false 必须停止并告知用户原因，严禁盲目发送。'
                  : 'Must run eth_estimateGas on every transaction. If simulation reverts, explain why and abort.'}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-200">
                3. {isZh ? '充分揭示风险与合规性' : 'State Rules & Risks'}
              </div>
              <p className="text-slate-400 leading-relaxed">
                {isZh
                  ? '明确告知用户：突破每钱包上限是否违反项目方或市场规则由用户自行判断，链上交易不可逆，失败 gas 不退。'
                  : 'Warn users that exceeding caps may violate terms, on-chain actions are irreversible.'}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-200">
                4. {isZh ? '只做 SeaDrop 公售' : 'SeaDrop Public Sales Only'}
              </div>
              <p className="text-slate-400 leading-relaxed">
                {isZh
                  ? '白名单/签名预售阶段做不了（临时合约地址不在白名单中）；非 SeaDrop 合约直接判定不可行。'
                  : 'Cannot batch allowlists or signature mints (temporary addresses are unwhitelisted).'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CLI commands */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          {isZh ? 'Node.js 零依赖命令行运行' : 'Node.js Zero-Dependency Scripts'}
        </h3>
        <p className="text-xs text-slate-400">
          {isZh
            ? '本开源项目内置两个零依赖脚本，Node.js 18+ 原生直接运行，无需安装额外依赖：'
            : 'Two standalone scripts with zero dependencies running on Node.js 18+ natively:'}
        </p>

        {/* Script 1 */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 space-y-1">
          <div className="text-slate-400 font-sans text-[11px]">
            # 1. {isZh ? '检查合约兼容性 (只读)' : 'Probe Compatibility (Read-only)'}
          </div>
          <div className="text-amber-300 select-all overflow-x-auto py-1">
            node scripts/probe.mjs --rpc https://rpc.mainnet.chain.robinhood.com --nft 0x&lt;NFT_CONTRACT&gt;
          </div>
        </div>

        {/* Script 2 */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 space-y-1">
          <div className="text-slate-400 font-sans text-[11px]">
            # 2. {isZh ? '规划最省 gas 方案并模拟交易' : 'Plan Cheapest Route & Simulate'}
          </div>
          <div className="text-amber-300 select-all overflow-x-auto py-1 leading-relaxed">
            node scripts/plan.mjs --rpc https://rpc.mainnet.chain.robinhood.com --nft 0x&lt;NFT_CONTRACT&gt; \<br />
            &nbsp;&nbsp;--total 20 --factory 0xcf37f60c104aa82f7aadd0aa70eeeb0742324424 --from 0x&lt;YOUR_WALLET&gt;
          </div>
        </div>
      </div>

      {/* Deep-Dive FAQ */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          {isZh ? '底层原理与常见问题 (FAQ)' : 'Under the Hood & FAQ'}
        </h3>

        <div className="space-y-3">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <h4 className="font-semibold text-slate-200">
              {isZh
                ? '为什么 EXTCODESIZE 反合约检查对它无效？'
                : 'Why are EXTCODESIZE / isContract checks bypassed?'}
            </h4>
            <p className="text-slate-400 leading-relaxed">
              {isZh
                ? '因为临时 Minter 合约是在构造函数内部执行 mint 调用的。在 EVM 规范中，合约在构造期间 extcodesize 始终为 0，因此即使 NFT 合约调用 EXTCODESIZE 或 isContract，也会将其识别为普通 EOA 外部钱包。'
                : 'Because each Minter contract executes the mint call inside its own constructor where extcodesize == 0.'}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <h4 className="font-semibold text-slate-200">
              {isZh
                ? '如何确保 NFT 不会卡在合约里？'
                : 'How is it guaranteed that NFTs will never be stuck?'}
            </h4>
            <p className="text-slate-400 leading-relaxed">
              {isZh
                ? 'Minter 采用 [before, after] totalSupply 闭区间扫描并严格核验 balanceOf 与 ownerOf。如果任何一枚 token 没有如数成功转移给调用者，require(moved == want) 就会触发强制回滚，整笔交易彻底取消。'
                : 'The Minter scans the exact totalSupply interval and verifies balanceOf and ownerOf. If any token is not swept, it reverts atomically.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
