import React, { useState } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  Zap,
  Info,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { EngineStatusResponse } from '../types';

interface ConnectTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
}

export const ConnectTab: React.FC<ConnectTabProps> = ({ statusData, onRefresh }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showQrFallback, setShowQrFallback] = useState(false);

  const isConnected = statusData?.status === 'connected';
  const isConnecting = statusData?.status === 'connecting';

  const handleRequestPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPairingCode(null);

    // Clean phone number from spaces, dashes, parentheses and +
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleaned || cleaned.length < 8) {
      setErrorMsg('Please enter a valid international phone number with country code (e.g. 2347043537401 or 14155552671).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleaned })
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setPairingCode(data.code);
        onRefresh();
      } else {
        setErrorMsg(data.error || 'Failed to generate pairing code. If session is stuck, click "Reset Session" below.');
      }
    } catch (err: any) {
      setErrorMsg('Network error connecting to backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!confirm('This will clear temporary authentication files and restart the WhatsApp engine cleanly. Continue?')) return;
    setResetting(true);
    setErrorMsg(null);
    setPairingCode(null);
    try {
      const res = await fetch('/api/reset-session', { method: 'POST' });
      if (res.ok) {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3500);
        onRefresh();
      }
    } catch (e: any) {
      setErrorMsg('Reset failed: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace('-', ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Connected State Banner */}
      {isConnected && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-emerald-900/20 to-transparent border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                WhatsApp Linked & Active
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">Live</span>
              </h3>
              <p className="text-xs text-slate-300">
                Connected as <strong className="text-emerald-400 font-mono">+{statusData?.phone}</strong> ({statusData?.name || 'Primary WhatsApp'}).
                Auto-viewing, auto-reacting, and AI responses are live.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-xs font-semibold text-slate-300 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Connection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Mode 1: 8-Digit Pairing Code (Primary) */}
        <div className="lg:col-span-7 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 lg:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Link with Phone Number</h2>
                  <p className="text-[11px] text-slate-400">Official WhatsApp 8-digit pairing code</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Recommended
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Enter your WhatsApp phone number with your country code. You’ll receive an 8-digit code to type into WhatsApp on your phone. <span className="text-emerald-400 font-medium">No second phone or camera required.</span>
            </p>

            <form onSubmit={handleRequestPairing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  WhatsApp Phone Number (with Country Code)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +234 704 353 7401 or 14155552671"
                    disabled={isConnected || loading}
                    className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3.5 text-white font-mono text-sm placeholder-slate-600 outline-none transition-all disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                  <span>Include country code (e.g. 234 for Nigeria, 1 for USA/Canada, 44 for UK, 91 for India).</span>
                  <span className="text-slate-500">Auto-formatted</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>{errorMsg}</p>
                    <button
                      type="button"
                      onClick={handleResetSession}
                      className="underline text-rose-200 hover:text-white font-medium"
                    >
                      Click here to reset & restart WhatsApp socket
                    </button>
                  </div>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Session reset successfully! Socket is ready for a fresh connection.</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isConnected || loading || resetting}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#128C7E] to-[#25D366] hover:from-[#075E54] hover:to-[#128C7E] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Requesting 8-Digit Code...</span>
                    </>
                  ) : isConnected ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Device Connected</span>
                    </>
                  ) : (
                    <>
                      <span>Get 8-Digit Pairing Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetSession}
                  disabled={loading || resetting}
                  className="py-3 px-3.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Clear any cached or stuck session"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                  <span>{resetting ? 'Resetting...' : 'Reset Session'}</span>
                </button>
              </div>
            </form>

            {/* Pairing Code Display Card */}
            {pairingCode && (
              <div className="mt-6 p-5 rounded-2xl bg-[#0b141a] border border-emerald-500/40 shadow-inner">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your WhatsApp Pairing Code</span>
                  </div>

                  <div className="flex items-center justify-center gap-3 my-3">
                    <div className="font-mono text-3xl md:text-4xl font-extrabold tracking-widest text-emerald-400 bg-emerald-950/40 px-6 py-3 rounded-xl border border-emerald-500/40 shadow-lg select-all">
                      {pairingCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="p-3.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] active:scale-95 text-slate-200 hover:text-white transition-all border border-slate-700/50 shadow-md"
                      title="Copy code to clipboard"
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  {copied && (
                    <div className="text-xs text-emerald-400 font-semibold mb-2 animate-bounce">
                      ✓ Copied to clipboard!
                    </div>
                  )}

                  {/* Step-by-Step Instructions */}
                  <div className="mt-4 text-left p-4 rounded-xl bg-[#111b21] border border-[#202c33] text-xs space-y-2">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1 text-xs">
                      <span>📱</span> Complete linking on your phone:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed text-[11px]">
                      <li>Open <strong className="text-white">WhatsApp</strong> on your mobile device.</li>
                      <li>Tap <strong className="text-white">Settings</strong> (or 3 dots at top right) &gt; <strong className="text-white">Linked Devices</strong>.</li>
                      <li>Tap <strong className="text-white">Link a Device</strong>.</li>
                      <li>Tap <strong className="text-emerald-400 underline">Link with phone number instead</strong> (at the bottom).</li>
                      <li>Type in the 8-digit code <strong className="text-emerald-400 font-mono">{pairingCode}</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#202c33] flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted WhatsApp Protocol</span>
            </span>
            <button
              onClick={() => setShowQrFallback(!showQrFallback)}
              className="text-slate-400 hover:text-emerald-400 underline"
            >
              {showQrFallback ? 'Hide QR Code' : 'QR Code Scanner fallback'}
            </button>
          </div>
        </div>

        {/* Mode 2: QR Scanner (Fallback) */}
        <div className="lg:col-span-5 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 lg:p-7 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Scan QR Code</h2>
                  <p className="text-[11px] text-slate-400">Instant QR Camera fallback</p>
                </div>
              </div>
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all"
                title="Refresh QR Code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              WhatsApp &gt; Linked Devices &gt; Point phone camera at this QR code.
            </p>

            {/* QR Box */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#0b141a] rounded-2xl border border-[#202c33] min-h-[240px]">
              {statusData?.qr ? (
                <div className="text-center space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-2 border-emerald-500/40">
                    <img
                      src={statusData.qr}
                      alt="WhatsApp QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Live QR Code Active</span>
                  </p>
                </div>
              ) : isConnected ? (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">Session Active</p>
                  <p className="text-xs text-slate-400">Your device is linked to WhatsApp.</p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {isConnecting ? 'Generating fresh QR code...' : 'Waiting for connection or phone pairing...'}
                  </p>
                  <button
                    onClick={onRefresh}
                    className="px-3 py-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-xs text-emerald-400 font-medium transition-all"
                  >
                    Check Status
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#202c33] flex items-center justify-between text-[11px] text-slate-400">
            <span>Session Auth: <code className="text-emerald-400">./session_auth</code></span>
            <span className="text-[10px] text-slate-500">Persistent MultiFileAuth</span>
          </div>
        </div>

      </div>

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#111b21] border border-[#202c33] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            👁️
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Auto Story Viewer</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automatically view every contact story in the background. Stay top-of-mind with your entire contact list.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111b21] border border-[#202c33] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            🔥
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Smart Emoji Reactions</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automatically react with chosen emojis (🔥, 👏, ❤️, 🚀) to engage contacts naturally.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111b21] border border-[#202c33] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            🤖
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Gemini AI Auto-Reply</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              24/7 autonomous sales rep answering questions and booking leads in direct messages.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
