import React, { useState } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Palette, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Smile,
  Copy,
  Layers,
  Smartphone
} from 'lucide-react';
import { EngineStatusResponse } from '../types';

interface BroadcastTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
}

const BG_COLORS = [
  { name: 'WhatsApp Teal', value: '#075e54' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Royal Purple', value: '#7c3aed' },
  { name: 'Crimson Wine', value: '#991b1b' },
  { name: 'Midnight Navy', value: '#1e3a8a' },
  { name: 'Sunset Amber', value: '#d97706' },
  { name: 'Obsidian Black', value: '#0f172a' }
];

const TEMPLATES = [
  {
    title: 'Flash Sale Promo',
    text: '🔥 24-HOUR FLASH SALE!\nGet 40% OFF everything when you order today. DM us "DEAL" now to claim your discount coupon! 🛍️⚡'
  },
  {
    title: 'New Service Announcement',
    text: '🚀 Exciting News! We have officially launched our new WhatsApp Consultation service. Reply "BOOK" to schedule your free 15-min discovery session today!'
  },
  {
    title: 'Engaging Question Poll',
    text: '🤔 Quick Question for everyone: What is your #1 biggest goal this month? Reply with 1 or 2 below 👇\n1️⃣ Scale revenue\n2️⃣ Automate operations'
  },
  {
    title: 'Weekend Working Hours',
    text: '✨ Weekend Update: Our team is fully operational this Saturday & Sunday. Send a message anytime and our AI assistant will assist you instantly! 💬'
  }
];

export const BroadcastTab: React.FC<BroadcastTabProps> = ({ statusData }) => {
  const [statusText, setStatusText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bgColor, setBgColor] = useState('#075e54');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isConnected = statusData?.status === 'connected';

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!isConnected) {
      setFeedback({
        type: 'error',
        message: 'WhatsApp is not connected. Please connect your account first in the "Connect Account" tab.'
      });
      return;
    }

    if (!statusText.trim() && !imageUrl.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please enter status text or provide an image URL.'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/status/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: statusText.trim(),
          imageUrl: imageUrl.trim() || undefined,
          backgroundColor: bgColor
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: '✓ Successfully published to your WhatsApp Status! Broadcast sent to all saved contacts.'
        });
        setStatusText('');
        setImageUrl('');
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to publish status.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Network error publishing status: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setStatusText(prev => prev + emoji);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-white">Status Broadcast Engine</h2>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
              status@broadcast
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Publish text or image stories that broadcast automatically to all your phone’s saved contacts at once.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-300">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Audience: <strong>All Contacts</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Composer Form */}
        <div className="lg:col-span-7 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-5">
          <form onSubmit={handlePublish} className="space-y-4">
            
            {/* Status Text Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Status Text & Caption
                </label>
                <div className="flex items-center gap-1">
                  {['🔥', '🚀', '✨', '🛍️', '💬', '👇'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="p-1 rounded hover:bg-[#202c33] text-xs transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                rows={5}
                placeholder="Write your announcement, daily deal, or motivational quote here..."
                className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-white text-sm placeholder-slate-600 outline-none transition-all leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Supports WhatsApp markdown (*bold*, _italic_, ~strike~).</span>
                <span>{statusText.length} characters</span>
              </div>
            </div>

            {/* Background Color Picker (For text status) */}
            {!imageUrl && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Story Background Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {BG_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setBgColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        bgColor === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                  <span className="text-[11px] text-slate-400 ml-2 font-mono">{bgColor}</span>
                </div>
              </div>
            )}

            {/* Image URL Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Image URL (Optional for Photo Stories)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-... or image direct link"
                  className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-white font-mono text-xs placeholder-slate-600 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Provide a public image link or leave empty to broadcast a clean colored text story.
              </p>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Quick Story Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => setStatusText(tmpl.text)}
                    className="p-2.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-left text-xs text-slate-300 transition-all hover:border-emerald-500/40"
                  >
                    <p className="font-semibold text-emerald-400">{tmpl.title}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{tmpl.text.replace('\n', ' ')}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isConnected}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#128C7E] to-[#25D366] hover:from-[#075E54] hover:to-[#128C7E] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Broadcasting Status Story...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish to WhatsApp Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Mobile Story Preview */}
        <div className="lg:col-span-5 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl flex flex-col items-center justify-between">
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live Story Preview</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Mobile Viewport</span>
            </div>

            {/* Smartphone Mockup */}
            <div className="mx-auto w-[240px] h-[380px] rounded-[32px] border-4 border-slate-800 bg-[#0b141a] p-3 shadow-2xl relative flex flex-col justify-between overflow-hidden">
              
              {/* Phone Top Notch & WhatsApp Story Bar */}
              <div>
                <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto mb-2" />
                <div className="flex gap-1 mb-2.5">
                  <div className="h-1 flex-1 bg-white rounded-full"></div>
                </div>

                {/* User Header */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-emerald-400">
                    WA
                  </div>
                  <div>
                    <p className="text-white text-[11px] font-bold leading-tight">My Status</p>
                    <p className="text-white/60 text-[9px]">Just now</p>
                  </div>
                </div>
              </div>

              {/* Story Content Canvas */}
              <div 
                className="flex-1 my-2 rounded-2xl flex items-center justify-center p-3 text-center transition-all duration-300 relative overflow-hidden"
                style={{
                  backgroundColor: imageUrl ? '#000000' : bgColor,
                  backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {imageUrl && (
                  <div className="absolute inset-0 bg-black/40" />
                )}
                <p className="text-white text-xs font-semibold leading-relaxed break-words relative z-10 drop-shadow-md">
                  {statusText || (imageUrl ? '' : 'Type text on the left to preview your live WhatsApp story...')}
                </p>
              </div>

              {/* Story Bottom Reply Mockup */}
              <div className="flex items-center justify-between text-white/70 text-[9px] px-1">
                <span>👁️ Views: 0</span>
                <span>Reply 💬</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 text-center">
            Statuses remain visible for 24 hours to all saved contacts.
          </p>
        </div>

      </div>

    </div>
  );
};
