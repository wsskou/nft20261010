import React, { useState } from 'react';
import { Flame, Globe, ChevronDown, Check, LogOut } from 'lucide-react';
import { ChainConfig, Language } from '../types';
import { SUPPORTED_CHAINS } from '../config/chains';
import { getT } from '../locales/translations';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  selectedChain: ChainConfig;
  onSelectChain: (chain: ChainConfig) => void;
  connectedAddress: string | null;
  onConnectWallet: (address: string) => void;
  onDisconnectWallet: () => void;
  lang: Language;
  onToggleLang: () => void;
}

export const Header: React.FC<Props> = ({
  selectedChain,
  onSelectChain,
  connectedAddress,
  onConnectWallet,
  onDisconnectWallet,
  lang,
  onToggleLang,
}) => {
  const t = getT(lang);
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleWalletConnect = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setConnecting(true);
        const provider = (window as any).ethereum;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          onConnectWallet(accounts[0]);
          const currentHexChain = await provider.request({ method: 'eth_chainId' });
          const targetHexChain = '0x' + selectedChain.id.toString(16);
          if (currentHexChain !== targetHexChain) {
            try {
              await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetHexChain }],
              });
            } catch (switchErr: any) {
              if (switchErr.code === 4902) {
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: targetHexChain,
                      chainName: selectedChain.name,
                      rpcUrls: [selectedChain.rpcUrl],
                      nativeCurrency: {
                        name: selectedChain.symbol,
                        symbol: selectedChain.symbol,
                        decimals: 18,
                      },
                      blockExplorerUrls: [selectedChain.explorerUrl],
                    },
                  ],
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Wallet connect error:', err);
      } finally {
        setConnecting(false);
      }
    } else {
      const input = prompt(
        lang === 'zh'
          ? '未检测到浏览器钱包插件（如 MetaMask）。请输入用于模拟与计算的钱包地址 (0x...):'
          : 'No browser wallet detected. Enter your wallet address for simulation & planning (0x...):'
      );
      if (input && /^0x[0-9a-fA-F]{40}$/.test(input.trim())) {
        onConnectWallet(input.trim());
      }
    }
  };

  const formatShortAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-base text-white tracking-tight">
                {t.appTitle}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                SeaDrop Batch Minter
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton lang={lang} />

          {/* Language Switch */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-xs font-medium cursor-pointer"
            title="Switch Language / 切换语言"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang === 'en' ? '中文' : 'EN'}</span>
          </button>

          {/* Network Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setChainDropdownOpen(!chainDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800/80 text-xs transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-medium max-w-[120px] sm:max-w-none truncate">{selectedChain.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {chainDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 text-xs backdrop-blur-xl"
                onMouseLeave={() => setChainDropdownOpen(false)}
              >
                <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  {t.selectNetwork}
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {SUPPORTED_CHAINS.map((chain) => {
                    const isSelected = chain.id === selectedChain.id;
                    return (
                      <button
                        key={chain.id}
                        onClick={() => {
                          onSelectChain(chain);
                          setChainDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          isSelected ? 'text-amber-400 bg-slate-800/50 font-medium' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-amber-400' : 'bg-slate-500'
                            }`}
                          />
                          <div>
                            <div>{chain.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Chain ID {chain.id} {chain.isTestnet ? '· Testnet' : ''}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Wallet Connect / Account Display */}
          {connectedAddress ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <div className="px-2.5 py-1 text-slate-200 font-mono text-xs">
                {formatShortAddress(connectedAddress)}
              </div>
              <button
                onClick={onDisconnectWallet}
                title={t.disconnect}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleWalletConnect}
              disabled={connecting}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              {connecting ? 'Connecting...' : t.connectWallet}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
