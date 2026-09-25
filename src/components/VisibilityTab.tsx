import React, { useState } from 'react';
import { 
  Eye, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Clock, 
  TrendingUp, 
  ShieldCheck,
  Zap,
  Save
} from 'lucide-react';
import { EngineStatusResponse } from '../types';

interface VisibilityTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
}

const AVAILABLE_EMOJIS = ['🔥', '👏', '❤️', '🚀', '😍', '⚡', '💯', '🙌', '✨', '🎉', '💪', '🏆', '💎', '🌟', '🎯'];

export const VisibilityTab: React.FC<VisibilityTabProps> = ({ statusData }) => {
  const [autoView, setAutoView] = useState(statusData?.autoView ?? true);
  const [autoReact, setAutoReact] = useState(statusData?.autoReact ?? true);
  const [reactionEmojis, setReactionEmojis] = useState<string[]>(
    statusData?.reactionEmojis || ['🔥', '👏', '❤️', '🚀', '😍', '⚡']
  );
  const [viewDelay, setViewDelay] = useState(statusData?.viewDelaySeconds || 2);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleEmoji = (emoji: string) => {
    if (reactionEmojis.includes(emoji)) {
      if (reactionEmojis.length > 1) {
        setReactionEmojis(reactionEmojis.filter(e => e !== emoji));
      }
    } else {
      setReactionEmojis([...reactionEmojis, emoji]);
    }
  };

  const handleSaveConfig = async (newAutoView = autoView, newAutoReact = autoReact) => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoView: newAutoView,
          autoReact: newAutoReact,
          reactionEmojis,
          viewDelaySeconds: Number(viewDelay)
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update visibility settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Auto-Visibility & Engagement Engine
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
              Passive Growth
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Automatically view contacts' statuses and drop randomized emoji reactions to stay top-of-mind.
          </p>
        </div>

        <button
          onClick={() => handleSaveConfig()}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#128C7E] to-[#25D366] hover:from-[#075E54] hover:to-[#128C7E] text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
        >
          {saving ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : savedSuccess ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{savedSuccess ? 'Saved!' : 'Save Visibility Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Feature 1: Auto-View Stories */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Auto-View Statuses</h3>
                  <p className="text-[11px] text-slate-400">Appear first in your leads' viewers list</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoView}
                  onChange={(e) => {
                    setAutoView(e.target.checked);
                    handleSaveConfig(e.target.checked, autoReact);
                  }}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When enabled, the engine immediately marks new incoming status stories as read (`readMessages`). Your profile photo and name appear continuously on your leads' story viewers, driving organic recall and inbound chats.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Viewing Delay Simulation:</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">{viewDelay}s</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={viewDelay}
                onChange={(e) => setViewDelay(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Adds a small natural jitter (1-15s) so your views look 100% human and organic to WhatsApp algorithms.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Statuses Viewed:</span>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {statusData?.stats?.statusesViewed || 0}
            </span>
          </div>
        </div>

        {/* Feature 2: Auto-React to Stories */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Auto-React to Stories</h3>
                  <p className="text-[11px] text-slate-400">Randomized warm emoji reactions</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReact}
                  onChange={(e) => {
                    setAutoReact(e.target.checked);
                    handleSaveConfig(autoView, e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sends an instant WhatsApp story reaction using a randomly chosen emoji from your active reaction pool.
            </p>

            {/* Reaction Pool Selector */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Active Reaction Emojis Pool (Click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EMOJIS.map((emoji) => {
                  const isSelected = reactionEmojis.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => toggleEmoji(emoji)}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-2 border-amber-500 text-white scale-105 shadow-md shadow-amber-950/40'
                          : 'bg-[#0b141a] border border-[#202c33] opacity-40 hover:opacity-80'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Reactions Sent:</span>
            <span className="font-mono text-amber-400 font-bold text-sm">
              {statusData?.stats?.reactionsSent || 0}
            </span>
          </div>
        </div>

      </div>

      {/* Growth Strategy Insights Banner */}
      <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white">How this drives 5-10x more inbound sales:</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            WhatsApp contacts are accustomed to friends and warm connections viewing and reacting to their statuses. When your business profile automatically interacts with their stories, contacts remember you, click on your profile, and start direct chats asking about your offers.
          </p>
        </div>
      </div>

    </div>
  );
};
