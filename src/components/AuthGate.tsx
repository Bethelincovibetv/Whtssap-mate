import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  Rocket, 
  Repeat, 
  Smartphone, 
  Database,
  ArrowRight
} from 'lucide-react';

interface AuthGateProps {
  onSignIn: () => void;
  targetFeature?: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSignIn, targetFeature }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8 px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-gradient-to-b from-[#111b21] to-[#0b141a] border border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Header Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            <span>Authentication Required</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to Access {targetFeature || 'WhatsApp Promoters Engine'}
          </h2>

          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            To prevent unauthorized access, protect WhatsApp sessions, and sync your recurring broadcast campaigns to Firebase cloud storage, you must sign in to your account.
          </p>
        </div>

        {/* Main Sign In Action Button */}
        <div className="max-w-sm mx-auto space-y-3">
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-950/50 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-98"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span>Sign In to Continue</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <p className="text-[11px] text-center text-slate-400">
            Supports Google Account sign-in & instant email sessions
          </p>
        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#202c33]">
          <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Firebase Cloud Storage</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">All your campaigns and schedules are saved securely in your Firestore account.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">1m, 3m & 5m Fast Loops</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Customizable repeat posting intervals for high-frequency group exposure.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Cloud Baileys MD</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Runs in the cloud 24/7 without disconnecting when your phone is turned off.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Automatic Reconnect</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Auto-starts and resumes campaigns as soon as an account connects back.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
