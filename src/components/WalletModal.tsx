import React, { useEffect, useState } from 'react';
import { X, Check, ExternalLink, Wallet } from 'lucide-react';
import { ChainConfig, Language } from '../types';

interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

interface WalletOption {
  id: string;
  name: string;
  iconBg: string;
  iconColor: string;
  symbol: string;
  downloadUrl: string;
  getProvider: () => any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedChain: ChainConfig;
  onConnect: (address: string, provider: any) => void;
  lang: Language;
}

export const WalletModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedChain,
  onConnect,
  lang,
}) => {
  const [discoveredProviders, setDiscoveredProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Standard wallet definitions with explicit provider paths
  const STANDARD_WALLETS: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask (小狐狸)',
      iconBg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      iconColor: 'text-orange-400',
      symbol: '🦊',
      downloadUrl: 'https://metamask.io/download/',
      getProvider: () => {
        if (typeof window === 'undefined') return null;
        const eth = (window as any).ethereum;
        if (eth?.providers) {
          return eth.providers.find((p: any) => p.isMetaMask && !p.isRabby && !p.isTokenPocket) || eth;
        }
        return eth?.isMetaMask ? eth : eth;
      },
    },
    {
      id: 'okx',
      name: 'OKX Wallet (欧易)',
      iconBg: 'bg-slate-800 border-slate-700 text-white',
      iconColor: 'text-white',
      symbol: '⬛',
      downloadUrl: 'https://www.okx.com/web3',
      getProvider: () => {
        if (typeof window === 'undefined') return null;
        return (window as any).okxwallet || ((window as any).ethereum?.isOkxWallet ? (window as any).ethereum : null);
      },
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet (兔子)',
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      iconColor: 'text-blue-400',
      symbol: '🐰',
      downloadUrl: 'https://rabby.io/',
      getProvider: () => {
        if (typeof window === 'undefined') return null;
        return (window as any).rabby || ((window as any).ethereum?.isRabby ? (window as any).ethereum : null);
      },
    },
    {
      id: 'phantom',
      name: 'Phantom (EVM)',
      iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      iconColor: 'text-purple-400',
      symbol: '👻',
      downloadUrl: 'https://phantom.app/',
      getProvider: () => {
        if (typeof window === 'undefined') return null;
        return (window as any).phantom?.ethereum;
      },
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      iconBg: 'bg-blue-600/10 border-blue-600/20 text-blue-500',
      iconColor: 'text-blue-500',
      symbol: '🔵',
      downloadUrl: 'https://www.coinbase.com/wallet',
      getProvider: () => {
        if (typeof window === 'undefined') return null;
        return (window as any).coinbaseWalletExtension;
      },
    },
    {
      id: 'bitget',
      name: 'Bitget Wallet',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      iconColor: 'text-emerald-400',
      symbol: '🟡',
      downloadUrl: 'https://web3.bitget.com/',
      getProvider: () => {
        if (typeof window === 'undefined') return null;
        return (window as any).bitkeep?.ethereum;
      },
    },
    {
      id: 'injected',
      name: lang === 'zh' ? '默认浏览器钱包' : 'Default Injected Wallet',
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      iconColor: 'text-amber-400',
      symbol: '🌐',
      downloadUrl: 'https://metamask.io/download/',
      getProvider: () => {
        if (typeof window === 'undefined') return null;
        return (window as any).ethereum;
      },
    },
  ];

  // EIP-6963 Auto Provider Discovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onAnnounceProvider = (event: any) => {
      const detail: EIP6963ProviderDetail = event.detail;
      setDiscoveredProviders((prev) => {
        if (prev.some((p) => p.info.uuid === detail.info.uuid)) return prev;
        return [...prev, detail];
      });
    };

    window.addEventListener('eip6963:announceProvider', onAnnounceProvider);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', onAnnounceProvider);
    };
  }, []);

  if (!isOpen) return null;

  const handleSelectProvider = async (provider: any, walletId: string) => {
    if (!provider) return;

    try {
      setConnectingId(walletId);
      setErrorMsg(null);

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected');
      }

      const activeAddress = accounts[0];

      // Save globally for transaction dispatching
      (window as any).__activeEvmProvider = provider;

      // Ensure network is switched to selectedChain
      try {
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
      } catch (chainErr) {
        console.warn('Network switch warning:', chainErr);
      }

      onConnect(activeAddress, provider);
      onClose();
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setErrorMsg(err.message || 'Connection rejected or failed');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              {lang === 'zh' ? '选择要连接的钱包' : 'Select a Wallet'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* EIP-6963 Discovered Wallets (if any) */}
        {discoveredProviders.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-slate-400 px-1">
              {lang === 'zh' ? '检测到的已安装插件 (EIP-6963)' : 'Installed Extensions (EIP-6963)'}
            </div>
            {discoveredProviders.map((dp) => (
              <button
                key={dp.info.uuid}
                type="button"
                onClick={() => handleSelectProvider(dp.provider, dp.info.uuid)}
                disabled={connectingId !== null}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-800 hover:border-slate-700 transition-colors text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={dp.info.icon}
                    alt={dp.info.name}
                    className="w-6 h-6 rounded-md object-contain"
                  />
                  <span className="font-medium text-slate-200 group-hover:text-white">
                    {dp.info.name}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {lang === 'zh' ? '已就绪' : 'Ready'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Standard Wallet List */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-400 px-1">
            {lang === 'zh' ? '常用钱包' : 'Popular Wallets'}
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
            {STANDARD_WALLETS.map((w) => {
              const prov = w.getProvider();
              const isInstalled = !!prov;
              const isConnecting = connectingId === w.id;

              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 transition-colors text-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isInstalled) {
                        handleSelectProvider(prov, w.id);
                      } else {
                        window.open(w.downloadUrl, '_blank');
                      }
                    }}
                    disabled={connectingId !== null}
                    className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-sm">
                      {w.symbol}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">{w.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {isInstalled
                          ? lang === 'zh'
                            ? '已检测到此插件'
                            : 'Detected'
                          : lang === 'zh'
                          ? '点击去官网安装'
                          : 'Not detected, click to install'}
                      </div>
                    </div>
                  </button>

                  {isInstalled ? (
                    <button
                      type="button"
                      onClick={() => handleSelectProvider(prov, w.id)}
                      disabled={connectingId !== null}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[11px] font-medium cursor-pointer"
                    >
                      {isConnecting
                        ? lang === 'zh'
                          ? '连接中...'
                          : 'Connecting...'
                        : lang === 'zh'
                        ? '连接'
                        : 'Connect'}
                    </button>
                  ) : (
                    <a
                      href={w.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
                    >
                      <span>{lang === 'zh' ? '安装' : 'Install'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 text-center pt-1 border-t border-slate-800/80">
          {lang === 'zh'
            ? '连接过程纯只读，无需输入密码，绝不索要离线签名。'
            : 'Read-only connection. No password or offline signature required.'}
        </div>
      </div>
    </div>
  );
};
