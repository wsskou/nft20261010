import React, { useState, useEffect } from 'react';
import { Zap, Search } from 'lucide-react';
import { ChainConfig, Language } from './types';
import { SUPPORTED_CHAINS } from './config/chains';
import { getT } from './locales/translations';
import { Header } from './components/Header';
import { BatchMintPlanner } from './components/BatchMintPlanner';
import { CompatibilityProbe } from './components/CompatibilityProbe';

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(SUPPORTED_CHAINS[0]); // Ethereum Mainnet
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [sharedNftAddress, setSharedNftAddress] = useState<string>('');

  const t = getT(lang);

  // Auto-detect existing wallet account
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = (window as any).ethereum;
      provider
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setConnectedAddress(accounts[0]);
          }
        })
        .catch(() => {});

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setConnectedAddress(accounts[0]);
        } else {
          setConnectedAddress(null);
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        const id = parseInt(chainIdHex, 16);
        const matched = SUPPORTED_CHAINS.find((c) => c.id === id);
        if (matched) {
          setSelectedChain(matched);
        }
      };

      provider.on?.('accountsChanged', handleAccountsChanged);
      provider.on?.('chainChanged', handleChainChanged);

      return () => {
        provider.removeListener?.('accountsChanged', handleAccountsChanged);
        provider.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      {/* Top Navbar */}
      <Header
        selectedChain={selectedChain}
        onSelectChain={setSelectedChain}
        connectedAddress={connectedAddress}
        onConnectWallet={setConnectedAddress}
        onDisconnectWallet={() => setConnectedAddress(null)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'en' ? 'zh' : 'en')}
      />

      {/* Main Workbench Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* Left Column: 字节码探测器 (先排雷与体检) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  {t.tabs.probe}
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Opcode Static Analyzer
              </span>
            </div>

            <CompatibilityProbe
              selectedChain={selectedChain}
              lang={lang}
              sharedNftAddress={sharedNftAddress}
              onNftAddressChange={setSharedNftAddress}
            />
          </div>

          {/* Right Column: 批量铸造规划 (后配置与批量开打) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  {t.tabs.planner}
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                SeaDrop 1.0 Singleton
              </span>
            </div>

            <BatchMintPlanner
              selectedChain={selectedChain}
              connectedAddress={connectedAddress}
              lang={lang}
              sharedNftAddress={sharedNftAddress}
              onNftAddressChange={setSharedNftAddress}
              isSideBySide={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
