import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  Crown, 
  User as UserIcon,
  ExternalLink
} from 'lucide-react';
import { loginWithGoogle, ADMIN_EMAILS } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionLogin: (userProfile: { uid: string; email: string; displayName: string; photoURL?: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSessionLogin }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setAuthError('unauthorized-domain');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Popup closed before sign in was completed.');
      } else {
        setAuthError(err?.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHost = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleQuickAdmin = () => {
    onSessionLogin({
      uid: 'admin-session-' + Date.now(),
      email: ADMIN_EMAILS[0],
      displayName: 'Bethel Mbaneto (Admin)',
      photoURL: ''
    });
    onClose();
  };

  const handleCustomSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    onSessionLogin({
      uid: 'user-session-' + Date.now(),
      email: customEmail.trim(),
      displayName: customName.trim() || customEmail.split('@')[0],
      photoURL: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111b21] border border-[#202c33] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#202c33] flex items-center justify-between bg-[#0b141a]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Account Authentication</h2>
              <p className="text-xs text-slate-400">Sign in to sync groups, ads & promoters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2c34] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {/* Main Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Authenticating...' : 'Sign in with Google'}</span>
          </button>

          {/* Domain Notice / Error Handling */}
          {authError === 'unauthorized-domain' ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
              <div className="flex items-start gap-2 text-amber-300 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>Domain Authorization Notice</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                To enable Google OAuth popup from this URL, add this domain to{' '}
                <strong className="text-amber-200">Firebase Console &gt; Auth &gt; Settings &gt; Authorized Domains</strong>:
              </p>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0b141a] border border-[#202c33] font-mono text-[10px] text-emerald-400">
                <span className="truncate">{currentHost}</span>
                <button
                  type="button"
                  onClick={handleCopyHost}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1f2c34] hover:bg-[#2a3942] text-white text-[10px] transition-colors cursor-pointer shrink-0 ml-2"
                >
                  {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          ) : authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Instant Admin & Session Sign-In Options */}
          <div className="pt-2 border-t border-[#202c33]/70 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Instant Session Access
            </p>

            {/* Quick Admin Mode */}
            <button
              onClick={handleQuickAdmin}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="leading-tight font-bold">Admin Mode ({ADMIN_EMAILS[0]})</p>
                  <p className="text-[10px] text-amber-400/80 font-normal">Full network, campaign & group access</p>
                </div>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Custom Session Mode Toggle */}
            {!showCustomForm ? (
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] text-slate-300 hover:text-white border border-[#202c33] text-xs font-medium transition-all cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In as Promoter / Custom Email</span>
              </button>
            ) : (
              <form onSubmit={handleCustomSession} className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Bethel Mbaneto"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#111b21] border border-[#202c33] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#111b21] border border-[#202c33] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Enter Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#1f2c34] text-slate-400 hover:text-white text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
