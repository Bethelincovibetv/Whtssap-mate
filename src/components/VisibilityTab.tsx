import React, { useState, useEffect, useCallback } from 'react';
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
  Save,
  RefreshCw,
  Users,
  Smartphone
} from 'lucide-react';
import { EngineStatusResponse, ViewedStatusItem } from '../types';

interface VisibilityTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
}

const AVAILABLE_EMOJIS = ['🔥', '👏', '❤️', '🚀', '😍', '⚡', '💯', '🙌', '✨', '🎉', '💪', '🏆', '💎', '🌟', '🎯'];

export const VisibilityTab: React.FC<VisibilityTabProps> = ({ statusData, onRefresh }) => {
  const [autoView, setAutoView] = useState(statusData?.autoView ?? true);
  const [autoReact, setAutoReact] = useState(statusData?.autoReact ?? true);
  const [reactionEmojis, setReactionEmojis] = useState<string[]>(
    statusData?.reactionEmojis || ['🔥', '👏', '❤️', '🚀', '😍', '⚡']
  );
  const [viewDelay, setViewDelay] = useState(statusData?.viewDelaySeconds || 2);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live Viewed Status Feed
  const [viewedFeed, setViewedFeed] = useState<ViewedStatusItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const fetchViewedFeed = useCallback(async () => {
    try {
      setLoadingFeed(true);
      const res = await fetch('/api/status/viewed-log');
      const data = await res.json();
      if (data.statuses) {
        setViewedFeed(data.statuses);
      }
    } catch (e) {
      console.error('Failed to fetch viewed feed', e);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    fetchViewedFeed();
    const interval = setInterval(fetchViewedFeed, 5000);
    return () => clearInterval(interval);
  }, [fetchViewedFeed]);

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
        onRefresh();
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Toggles & Emoji Customizer */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Status Auto-Viewer Card */}
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Status Auto-Viewer (Ghost Mode)</h3>
                  <p className="text-xs text-slate-400">Instantly marks all contact stories as viewed.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoView}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoView(checked);
                    handleSaveConfig(checked, autoReact);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="pt-3 border-t border-[#202c33] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  View Delay Buffer
                </span>
                <span className="font-mono text-emerald-400">{viewDelay} seconds</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={viewDelay}
                onChange={(e) => setViewDelay(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Simulates human reaction time before marking story read.</p>
            </div>
          </div>

          {/* Smart Auto-Reactions Card */}
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Smart Story Auto-Reactions</h3>
                  <p className="text-xs text-slate-400">Randomly selects from your customized reaction pool.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReact}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoReact(checked);
                    handleSaveConfig(autoView, checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Custom Emoji Pool Editor */}
            <div className="pt-3 border-t border-[#202c33] space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Active Emoji Reaction Pool ({reactionEmojis.length} Selected)
              </label>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EMOJIS.map((emoji) => {
                  const isSelected = reactionEmojis.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleEmoji(emoji)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-md shadow-emerald-500/10 scale-105'
                          : 'bg-[#0b141a] border border-[#202c33] opacity-50 hover:opacity-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Feed of Viewed Stories */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col h-full min-h-[420px]">
            <div className="flex items-center justify-between pb-4 border-b border-[#202c33] mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-white text-sm">Recent Contact Stories Processed</h4>
              </div>
              <button
                onClick={fetchViewedFeed}
                className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                title="Refresh feed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFeed ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            {/* Stories Feed Stream */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
              {viewedFeed.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-600" />
                  <p>No contact stories processed yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">When contacts post statuses, they will be viewed and reacted to here automatically.</p>
                </div>
              ) : (
                viewedFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {item.senderName ? item.senderName.slice(0, 2).toUpperCase() : 'WA'}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{item.senderName || 'Contact'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">+{item.senderPhone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.reactedEmoji && (
                        <span className="text-sm bg-[#111b21] p-1.5 rounded-lg border border-[#202c33]">
                          {item.reactedEmoji}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
