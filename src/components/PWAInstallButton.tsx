import React, { useState } from 'react';
import { Download, Monitor, X, Smartphone, ExternalLink, Copy, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';

interface Props {
  lang: Language;
}

export const PWAInstallButton: React.FC<Props> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  // If already running in standalone app mode, hide install button
  if (isInstalled) {
    return null;
  }

  // Detect whether the app is currently running inside an iframe (like AI Studio preview)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const standaloneUrl =
    typeof window !== 'undefined'
      ? window.location.href.includes('ais-dev') || window.location.href.includes('ais-pre')
        ? window.location.href
        : 'https://ais-pre-ydnvm4rrgdkkz2nxke3gdl-450916944013.us-east5.run.app'
      : 'https://ais-pre-ydnvm4rrgdkkz2nxke3gdl-450916944013.us-east5.run.app';

  const handleButtonClick = async () => {
    if (isInIframe) {
      setShowGuide(true);
      return;
    }

    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(standaloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        title={lang === 'zh' ? '安装为电脑桌面独立程序' : 'Install as Desktop App'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-medium transition-colors cursor-pointer shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {lang === 'zh' ? '安装到电脑桌面' : 'Install App'}
        </span>
        <span className="sm:hidden">
          {lang === 'zh' ? '安装' : 'Install'}
        </span>
      </button>

      {/* Guided Install Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  {lang === 'zh' ? '安装到电脑桌面独立运行' : 'Install as Desktop App'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              {isInIframe ? (
                /* Notice for running inside AI Studio preview iframe */
                <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30 space-y-2">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <span>💡 核心提示：请在独立新标签页中打开安装</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    您当前处于 AI Studio 的<strong>内嵌预览画中画窗口</strong>内。出于浏览器安全规则，Chrome 与 Edge 禁止在内嵌 iframe 框架内直接安装应用。
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    只需<strong>点击下方黄色按钮在独立新标签页中打开</strong>，即可直接通过浏览器地址栏或本按钮一键安装到桌面！
                  </p>
                </div>
              ) : (
                <p className="leading-relaxed">
                  {lang === 'zh'
                    ? '安装后将成为电脑上的独立桌面软件，无浏览器顶栏干扰，且完整支持 MetaMask / OKX 等插件钱包！'
                    : 'Installs as a standalone desktop application with no browser bars, fully supporting your wallet extensions!'}
                </p>
              )}

              {/* Action 1: Open in independent tab */}
              <a
                href={standaloneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{lang === 'zh' ? '在独立浏览器新标签页打开' : 'Open in New Browser Tab'}</span>
              </a>

              {/* Action 2: Copy URL */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (lang === 'zh' ? '已复制独立网址' : 'Copied!') : (lang === 'zh' ? '复制独立访问链接' : 'Copy URL')}</span>
              </button>

              {/* Browser Steps */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-[11px]">
                <div className="font-semibold text-slate-200">
                  {lang === 'zh' ? '在独立标签页打开后两秒安装：' : 'After opening in new tab:'}
                </div>
                <div className="space-y-1 text-slate-400">
                  <p>1. 在新打开的页面顶部，直接点击右上角<strong>「安装到电脑桌面」</strong>按钮；</p>
                  <p>2. 或者看 Chrome/Edge 地址栏最右侧的<strong>「💻 安装」</strong>小图标；</p>
                  <p>3. 确定后电脑桌面就会生成独立软件图标，双击即可作为独立软件运行！</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {lang === 'zh' ? '关闭' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
