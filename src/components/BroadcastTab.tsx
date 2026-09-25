import React, { useState, useRef } from 'react';
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
  Smartphone,
  Upload,
  Trash2
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
  const [imageFileName, setImageFileName] = useState('');
  const [bgColor, setBgColor] = useState('#075e54');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConnected = statusData?.status === 'connected';

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (PNG, JPG, WebP).' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size exceeds 8MB. Please choose a smaller image.' });
      return;
    }

    setImageFileName(file.name);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageUrl('');
    setImageFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        message: 'Please enter status text or provide an image.'
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
        setImageFileName('');
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
    <div className="space-y-6 max-w-full overflow-x-hidden">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm sm:text-base font-bold text-white">Status Broadcast Engine</h2>
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
        <div className="lg:col-span-7 bg-[#111b21] rounded-2xl border border-[#202c33] p-4 sm:p-6 shadow-xl space-y-5">
          <form onSubmit={handlePublish} className="space-y-4">
            
            {/* Status Text Area */}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Status Text & Caption
                </label>
                <div className="flex items-center gap-1">
                  {['🔥', '🚀', '✨', '🛍️', '💬', '👇'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="p-1 rounded hover:bg-[#202c33] text-xs transition-all cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                rows={4}
                placeholder="Write your announcement, daily deal, or motivational quote here..."
                className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-white text-xs sm:text-sm placeholder-slate-600 outline-none transition-all leading-relaxed resize-none"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Supports WhatsApp markdown (*bold*, _italic_).</span>
                <span>{statusText.length} chars</span>
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

            {/* Image Upload for Story */}
            <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  Attach Story Photo (Upload or URL)
                </label>
                <span className="text-[10px] text-slate-400">PNG, JPG, WebP</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                  id="story-image-upload"
                />

                <label
                  htmlFor="story-image-upload"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold cursor-pointer transition-all w-full sm:w-auto justify-center"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{imageUrl ? 'Change Photo File' : 'Upload Story Photo'}</span>
                </label>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste public image URL: https://images.unsplash.com/..."
                className="w-full bg-[#111b21] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />

              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black/40 p-2 flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-[#202c33]"
                  />
                  <div className="text-xs space-y-0.5 truncate">
                    <p className="font-semibold text-emerald-300 truncate">
                      {imageFileName || 'Story Photo Attached'}
                    </p>
                    <p className="text-[10px] text-slate-400">Broadcasted to all contact statuses</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Quick Story Templates
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => setStatusText(tmpl.text)}
                    className="p-2.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-left text-xs text-slate-300 transition-all hover:border-emerald-500/40 cursor-pointer"
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
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Publishing Story to WhatsApp...' : 'Broadcast Story Now'}</span>
            </button>

          </form>
        </div>

        {/* Live Smartphone Story Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Live Story Screen Preview
          </div>

          <div className="relative w-full max-w-[280px] sm:max-w-[300px] h-[480px] sm:h-[520px] rounded-[36px] bg-[#000] border-4 border-[#202c33] shadow-2xl overflow-hidden flex flex-col">
            
            {/* Story Top Progress Bars */}
            <div className="absolute top-3 left-4 right-4 z-20 flex gap-1">
              <div className="flex-1 h-0.5 bg-white rounded-full"></div>
            </div>

            {/* Status Header */}
            <div className="absolute top-6 left-4 right-4 z-20 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-[11px] border border-white/20">
                  WA
                </div>
                <div>
                  <p className="font-semibold text-xs leading-none">My Status</p>
                  <p className="text-[10px] text-white/70 mt-0.5">Just now</p>
                </div>
              </div>
            </div>

            {/* Status Story Body */}
            {imageUrl ? (
              <div className="relative w-full h-full flex flex-col justify-end">
                <img
                  src={imageUrl}
                  alt="Story Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                {statusText && (
                  <div className="relative z-10 p-4 text-center">
                    <p className="text-white text-xs sm:text-sm font-medium drop-shadow-md whitespace-pre-wrap leading-relaxed">
                      {statusText}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-6 text-center transition-colors duration-300"
                style={{ backgroundColor: bgColor }}
              >
                <p className="text-white text-sm sm:text-base font-medium leading-relaxed drop-shadow-sm whitespace-pre-wrap">
                  {statusText || 'Your status story preview will appear here in real-time...'}
                </p>
              </div>
            )}

            {/* Story Footer Input Mockup */}
            <div className="absolute bottom-3 left-4 right-4 z-20">
              <div className="bg-white/10 backdrop-blur-md rounded-full py-2 px-3 text-[11px] text-white/60 text-center border border-white/10">
                Reply to status...
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
