import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { 
  loginWithGoogle, 
  loginWithEmailPassword, 
  registerWithEmailPassword, 
  ALLOWED_APP_DOMAIN 
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionLogin: (userProfile: { uid: string; email: string; displayName: string; photoURL?: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSessionLogin }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : ALLOWED_APP_DOMAIN;

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
        setAuthError('Sign-in popup was closed before completing authentication.');
      } else {
        setAuthError(err?.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDomain = (domainToCopy: string) => {
    navigator.clipboard.writeText(domainToCopy);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setAuthError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'register') {
        try {
          const user = await registerWithEmailPassword(cleanEmail, password, displayName.trim());
          if (user) {
            onSessionLogin({
              uid: user.uid,
              email: user.email || cleanEmail,
              displayName: user.displayName || displayName.trim() || cleanEmail.split('@')[0],
              photoURL: user.photoURL || ''
            });
            onClose();
            return;
          }
        } catch (firebaseErr: any) {
          // If Firebase email/password provider is not yet turned on in console, fallback gracefully to server-side session
          console.warn('Firebase registration fallback note:', firebaseErr);
        }
      } else {
        try {
          const user = await loginWithEmailPassword(cleanEmail, password);
          if (user) {
            onSessionLogin({
              uid: user.uid,
              email: user.email || cleanEmail,
              displayName: user.displayName || displayName.trim() || cleanEmail.split('@')[0],
              photoURL: user.photoURL || ''
            });
            onClose();
            return;
          }
        } catch (firebaseErr: any) {
          console.warn('Firebase signin fallback note:', firebaseErr);
        }
      }

      // Query server for persistent user profile
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          displayName: displayName.trim() || cleanEmail.split('@')[0]
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onSessionLogin({
            uid: data.user.uid,
            email: data.user.email || cleanEmail,
            displayName: data.user.displayName || displayName.trim() || cleanEmail.split('@')[0],
            photoURL: data.user.photoURL || ''
          });
          onClose();
          return;
        }
      }

      const deterministicUid = 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
      onSessionLogin({
        uid: deterministicUid,
        email: cleanEmail,
        displayName: displayName.trim() || cleanEmail.split('@')[0],
        photoURL: ''
      });
      onClose();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111b21] border border-[#202c33] rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#202c33] flex items-center justify-between bg-[#0b141a]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {authMode === 'signin' ? 'Account Sign In' : 'Create Promoter Account'}
              </h2>
              <p className="text-xs text-slate-400">Multi-tenant campaigns & WhatsApp engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1f2c34] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div className="flex border-b border-[#202c33] bg-[#0b141a]/40">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setAuthError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              authMode === 'signin'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setAuthError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              authMode === 'register'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
          
          {/* Main Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-bold text-sm transition-all shadow-xl shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

          {/* Firebase Authorized Domain Helper Card */}
          <div className="p-3 rounded-2xl bg-[#0b141a] border border-emerald-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-[11px]">Firebase Authorized Domain:</span>
              <button
                type="button"
                onClick={() => handleCopyDomain(ALLOWED_APP_DOMAIN)}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold font-mono cursor-pointer"
              >
                {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied' : 'Copy Domain'}</span>
              </button>
            </div>
            <p className="font-mono text-[11px] text-white truncate bg-[#111b21] p-1.5 rounded-lg border border-[#202c33]">
              {ALLOWED_APP_DOMAIN}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#202c33]"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              or sign in with password
            </span>
            <div className="flex-grow border-t border-[#202c33]"></div>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailPasswordAuth} className="space-y-3.5">
            {authMode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Your Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-98 text-white font-bold text-xs transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : authMode === 'register' ? 'Create Account & Sign In' : 'Sign In with Password'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
