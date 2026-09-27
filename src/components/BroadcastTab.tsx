import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Video, 
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
  Trash2,
  Users,
  Check,
  Type,
  RotateCcw,
  History,
  Clock,
  Flame,
  ShieldCheck,
  RefreshCw,
  Share2,
  Tag,
  MessageSquare
} from 'lucide-react';
import { EngineStatusResponse, BroadcastHistoryItem, TagDefinition } from '../types';

interface BroadcastTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
}

const BG_COLORS = [
  { name: 'WhatsApp Teal', value: '#075e54', textClass: 'text-white' },
  { name: 'Emerald Forest', value: '#059669', textClass: 'text-white' },
  { name: 'Royal Purple', value: '#7c3aed', textClass: 'text-white' },
  { name: 'Crimson Wine', value: '#991b1b', textClass: 'text-white' },
  { name: 'Midnight Navy', value: '#1e3a8a', textClass: 'text-white' },
  { name: 'Sunset Amber', value: '#d97706', textClass: 'text-white' },
  { name: 'Hot Magenta', value: '#db2777', textClass: 'text-white' },
  { name: 'Obsidian Black', value: '#0f172a', textClass: 'text-white' }
];

const FONTS = [
  { id: 1, name: 'Modern Sans', style: 'font-sans' },
  { id: 2, name: 'Classic Serif', style: 'font-serif' },
  { id: 3, name: 'Casual Script', style: 'italic font-sans' },
  { id: 4, name: 'Clean Mono', style: 'font-mono' },
  { id: 5, name: 'Bold Display', style: 'font-black tracking-wide' }
];

const TEMPLATES = [
  {
    title: '⚡ Flash Sale & Deal',
    category: 'Sales',
    text: '🔥 24-HOUR FLASH SALE!\nGet 40% OFF everything when you order today. DM us "DEAL" now to claim your discount voucher! 🛍️⚡'
  },
  {
    title: '📇 Contact Gain & Save Me',
    category: 'Audience Growth',
    text: '👋 Hey everyone! Please save my contact as [Your Brand] so you can view daily exclusive deals & updates.\n\nReply "SAVED" and I will save your number back right away! 🤝✨'
  },
  {
    title: '🚀 New Service / Product Launch',
    category: 'Announcement',
    text: '🚀 Exciting News! We have officially launched our new WhatsApp Consultation service.\nReply "BOOK" to schedule your free 15-min discovery session today! 📅'
  },
  {
    title: '💬 Question & Poll Sticker',
    category: 'Engagement',
    text: '🤔 Quick Question for everyone: What is your #1 biggest goal this month? Reply with 1 or 2 below 👇\n\n1️⃣ Scale business revenue\n2️⃣ Automate customer operations'
  },
  {
    title: '🏆 Customer Review & Proof',
    category: 'Social Proof',
    text: '⭐ "They doubled our daily customer inquiries in less than 48 hours!" — Thank you to our amazing community for trusting our services. DM us to get started! 💼📈'
  },
  {
    title: '🚨 Urgent Update & Business Hours',
    category: 'Update',
    text: '📢 Service Notice: Our team is fully active today for expedited orders and fast delivery! Send a message anytime and we will respond in minutes. 💬'
  }
];

export const BroadcastTab: React.FC<BroadcastTabProps> = ({ statusData, onRefresh }) => {
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  const [statusText, setStatusText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [bgColor, setBgColor] = useState('#075e54');
  const [fontStyle, setFontStyle] = useState<number>(1);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [targetAudience, setTargetAudience] = useState<'all' | 'tag'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [contactsCount, setContactsCount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConnected = statusData?.status === 'connected';
  const accounts = statusData?.accounts || [];
  const connectedAccounts = accounts.filter(a => a.status === 'connected');

  // Load tags, contacts summary, and broadcast history
  useEffect(() => {
    fetchTagsAndContacts();
    fetchHistory();
  }, []);

  const fetchTagsAndContacts = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.tags) setTags(data.tags);
      if (typeof data.totalContacts === 'number') setContactsCount(data.totalContacts);
    } catch (e) {
      console.warn('Error fetching tags:', e);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/status/broadcast-history');
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) {
      console.warn('Error fetching broadcast history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');

    if (!isVid && !isImg) {
      setFeedback({ type: 'error', message: 'Please select a valid image (PNG, JPG, WebP) or video (MP4, WebM) file.' });
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Media size exceeds 16MB limit. Please choose a smaller file.' });
      return;
    }

    setMediaType(isVid ? 'video' : 'image');
    setMediaFileName(file.name);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearMedia = () => {
    setMediaUrl('');
    setMediaFileName('');
    setMediaType('text');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertEmoji = (emoji: string) => {
    setStatusText(prev => prev + emoji);
  };

  const insertMarkdown = (prefix: string, suffix: string = prefix) => {
    setStatusText(prev => `${prev} ${prefix}Text${suffix} `);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!isConnected && connectedAccounts.length === 0) {
      setFeedback({
        type: 'error',
        message: 'WhatsApp is not connected. Please pair your account first in the "Connect Account" tab.'
      });
      return;
    }

    if (!statusText.trim() && !mediaUrl.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please write status text or attach a photo/video.'
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        text: statusText.trim(),
        mediaType: mediaType,
        backgroundColor: bgColor,
        font: fontStyle,
        broadcastToAllAccounts: selectedAccountId === 'all',
        accountId: selectedAccountId !== 'all' ? selectedAccountId : undefined,
        targetTags: targetAudience === 'tag' && selectedTag !== 'all' ? [selectedTag] : undefined
      };

      if (mediaType === 'image') {
        payload.imageUrl = mediaUrl;
      } else if (mediaType === 'video') {
        payload.videoUrl = mediaUrl;
      }

      const res = await fetch('/api/status/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || '✓ Successfully broadcasted to your WhatsApp Status!'
        });
        setStatusText('');
        handleClearMedia();
        fetchHistory();
        onRefresh();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to publish status story.'
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

  const handleRebroadcast = (item: BroadcastHistoryItem) => {
    setStatusText(item.text || '');
    if (item.type === 'image' || item.type === 'video') {
      setMediaType(item.type);
      setMediaUrl(item.mediaUrl || '');
    } else {
      setMediaType('text');
      setBgColor(item.backgroundColor || '#075e54');
      setFontStyle(item.font || 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your status broadcast archive?')) return;
    try {
      await fetch('/api/status/broadcast-history', { method: 'DELETE' });
      setHistory([]);
    } catch (e) {}
  };

  const currentFontObj = FONTS.find(f => f.id === fontStyle) || FONTS[0];

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      
      {/* Top Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#111b21] via-[#111b21] to-emerald-950/40 border border-[#202c33] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              <span>Status Broadcast Engine</span>
            </h2>
            <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold">
              status@broadcast
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Publish high-impact text, photo, or video stories broadcasted automatically to your saved contacts. Run single or multi-account status campaigns in 1-click.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-2xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Audience: <strong>{contactsCount > 0 ? `${contactsCount.toLocaleString()} Contacts` : 'All Saved Contacts'}</strong></span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Broadcast</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Composer & Mobile Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Broadcast Composer Form */}
        <div className="lg:col-span-7 bg-[#111b21] rounded-3xl border border-[#202c33] p-4 sm:p-6 shadow-xl space-y-5">
          
          <form onSubmit={handlePublish} className="space-y-5">
            
            {/* Account & Audience Selection Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33]">
              
              {/* Account Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Sending WhatsApp Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-[#111b21] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">⚡ Broadcast To All Connected Lines ({connectedAccounts.length || 1})</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.label} {acc.phone ? `(+${acc.phone})` : ''} — {acc.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Audience Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Audience Targeting
                </label>
                <select
                  value={targetAudience === 'tag' ? selectedTag : 'all'}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setTargetAudience('all');
                      setSelectedTag('all');
                    } else {
                      setTargetAudience('tag');
                      setSelectedTag(e.target.value);
                    }
                  }}
                  className="w-full bg-[#111b21] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">👥 All Indexed Contacts ({contactsCount || 'All'})</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id}>
                      🏷️ Tag: {t.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Story Type Selector (Text / Photo / Video) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Story Media Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('text');
                    setMediaUrl('');
                    setMediaFileName('');
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mediaType === 'text'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                      : 'bg-[#0b141a] text-slate-400 border-[#202c33] hover:text-white'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span>Text Story</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mediaType === 'image'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                      : 'bg-[#0b141a] text-slate-400 border-[#202c33] hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Photo Story</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mediaType === 'video'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                      : 'bg-[#0b141a] text-slate-400 border-[#202c33] hover:text-white'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Video Story</span>
                </button>
              </div>
            </div>

            {/* Photo / Video Upload Attachment Box */}
            {(mediaType === 'image' || mediaType === 'video') && (
              <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-3 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    {mediaType === 'image' ? <ImageIcon className="w-4 h-4 text-emerald-400" /> : <Video className="w-4 h-4 text-teal-400" />}
                    <span>Attach {mediaType === 'image' ? 'Story Photo' : 'Story Video'} (File or URL)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Max 16MB</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={mediaType === 'image' ? 'image/*' : 'video/*,image/*'}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="story-media-upload"
                  />

                  <label
                    htmlFor="story-media-upload"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold cursor-pointer transition-all w-full sm:w-auto justify-center"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{mediaUrl ? 'Change Media File' : `Upload ${mediaType === 'image' ? 'Photo' : 'Video'}`}</span>
                  </label>

                  {mediaUrl && (
                    <button
                      type="button"
                      onClick={handleClearMedia}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  value={mediaUrl.startsWith('data:') ? '' : mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    if (e.target.value.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                      setMediaType('video');
                    }
                  }}
                  placeholder="Or paste public image/video URL: https://..."
                  className="w-full bg-[#111b21] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                />

                {mediaUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black/40 p-2.5 flex items-center gap-3">
                    {mediaType === 'video' ? (
                      <video src={mediaUrl} className="w-16 h-16 object-cover rounded-lg border border-[#202c33]" />
                    ) : (
                      <img src={mediaUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-[#202c33]" />
                    )}
                    <div className="text-xs space-y-0.5 truncate">
                      <p className="font-semibold text-emerald-300 truncate">
                        {mediaFileName || `${mediaType === 'video' ? 'Video' : 'Photo'} Attached`}
                      </p>
                      <p className="text-[10px] text-slate-400">Broadcasts with custom caption overlay</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Background Color & Font Typography Pickers (For Text Story) */}
            {mediaType === 'text' && (
              <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-3.5 animate-fade-in">
                
                {/* Background Color Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Story Background Color</span>
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400">{bgColor}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {BG_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setBgColor(c.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                          bgColor === c.value ? 'border-white scale-110 shadow-lg ring-2 ring-emerald-500/50' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Typography Font Selector */}
                <div className="pt-2 border-t border-[#202c33]">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Typography Font Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {FONTS.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontStyle(f.id)}
                        className={`py-1.5 px-2 rounded-xl text-xs text-center border transition-all cursor-pointer ${
                          fontStyle === f.id
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-bold'
                            : 'bg-[#111b21] text-slate-400 border-[#202c33] hover:text-white'
                        }`}
                      >
                        <span className={f.style}>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Status Text / Caption Input */}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {mediaType === 'text' ? 'Status Story Text' : 'Media Caption & Copy'}
                </label>
                
                {/* Emoji Quick Toolbar */}
                <div className="flex items-center gap-1">
                  {['🔥', '🚀', '✨', '🛍️', '💬', '👇', '❤️', '👏'].map(emoji => (
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

              {/* Formatting Helper Buttons */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => insertMarkdown('*')}
                  className="px-2 py-0.5 rounded bg-[#0b141a] hover:bg-[#202c33] text-[10px] font-bold text-slate-300 border border-[#202c33]"
                  title="Bold"
                >
                  *Bold*
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('_')}
                  className="px-2 py-0.5 rounded bg-[#0b141a] hover:bg-[#202c33] text-[10px] italic text-slate-300 border border-[#202c33]"
                  title="Italic"
                >
                  _Italic_
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('~')}
                  className="px-2 py-0.5 rounded bg-[#0b141a] hover:bg-[#202c33] text-[10px] line-through text-slate-300 border border-[#202c33]"
                  title="Strikethrough"
                >
                  ~Strike~
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('```')}
                  className="px-2 py-0.5 rounded bg-[#0b141a] hover:bg-[#202c33] text-[10px] font-mono text-slate-300 border border-[#202c33]"
                  title="Monospace Code"
                >
                  `Code`
                </button>
              </div>

              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                rows={mediaType === 'text' ? 5 : 3}
                placeholder={
                  mediaType === 'text'
                    ? 'Write your status announcement, promotion, daily motivational quote, or call-to-action...'
                    : 'Add an engaging caption for your status photo/video (e.g. "DM DEAL now for 50% discount!")...'
                }
                className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3.5 text-white text-xs sm:text-sm placeholder-slate-600 outline-none transition-all leading-relaxed resize-none"
              />

              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Markdown enabled (*bold*, _italic_).</span>
                <span>{statusText.length} characters</span>
              </div>
            </div>

            {/* Quick High-Converting Templates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Quick Story Templates
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold">Click to apply</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => {
                      setStatusText(tmpl.text);
                      setMediaType('text');
                    }}
                    className="p-3 rounded-2xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-left transition-all hover:border-emerald-500/40 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-emerald-400 group-hover:text-emerald-300">{tmpl.title}</p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">{tmpl.category}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-1">{tmpl.text.replace('\n', ' ')}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2 animate-fade-in ${
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

            {/* Publish Action Button */}
            <button
              type="submit"
              disabled={loading || (!isConnected && connectedAccounts.length === 0)}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Broadcasting Story to Contacts...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Broadcast Story to WhatsApp Now</span>
                </>
              )}
            </button>

          </form>

        </div>

        {/* Right Column: Interactive Smartphone Story Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Real-Time Story Preview</span>
          </div>

          <div className="relative w-full max-w-[280px] sm:max-w-[310px] h-[500px] sm:h-[540px] rounded-[40px] bg-[#000] border-4 border-[#202c33] shadow-2xl overflow-hidden flex flex-col">
            
            {/* Story Top Progress Bars */}
            <div className="absolute top-3 left-4 right-4 z-20 flex gap-1">
              <div className="flex-1 h-0.5 bg-white rounded-full"></div>
              <div className="flex-1 h-0.5 bg-white/40 rounded-full"></div>
            </div>

            {/* Status Header Overlay */}
            <div className="absolute top-6 left-4 right-4 z-20 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs border-2 border-white/20 shadow">
                  WA
                </div>
                <div>
                  <p className="font-bold text-xs leading-none text-white drop-shadow">My Status</p>
                  <p className="text-[10px] text-white/80 mt-0.5 drop-shadow">Just now • {contactsCount || 'All'} contacts</p>
                </div>
              </div>
            </div>

            {/* Status Story Body Render */}
            {mediaUrl ? (
              <div className="relative w-full h-full flex flex-col justify-end bg-black">
                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Story Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />
                {statusText && (
                  <div className="relative z-10 p-5 text-center">
                    <p className={`text-white text-xs sm:text-sm font-medium drop-shadow-lg whitespace-pre-wrap leading-relaxed ${currentFontObj.style}`}>
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
                <p className={`text-white text-sm sm:text-base font-semibold leading-relaxed drop-shadow-md whitespace-pre-wrap ${currentFontObj.style}`}>
                  {statusText || 'Your status story preview will appear here in real-time...'}
                </p>
              </div>
            )}

            {/* Story Bottom Reply Mockup */}
            <div className="absolute bottom-3 left-4 right-4 z-20">
              <div className="bg-white/15 backdrop-blur-md rounded-full py-2.5 px-4 text-[11px] text-white/80 text-center border border-white/20 shadow-lg">
                💬 Reply to status...
              </div>
            </div>

          </div>

          {/* Quick Info Card */}
          <div className="w-full max-w-[310px] p-3.5 rounded-2xl bg-[#111b21] border border-[#202c33] text-[11px] text-slate-400 space-y-1.5">
            <p className="text-slate-200 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Broadcast Privacy Rules</span>
            </p>
            <p>Stories expire after 24 hours. Contacts who have your number saved will receive this update instantly.</p>
          </div>

        </div>

      </div>

      {/* Broadcast History & Past Story Archive Section */}
      <div className="bg-[#111b21] rounded-3xl border border-[#202c33] p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Broadcasted Story Archive</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {history.length} published
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-white border border-[#202c33] transition-colors cursor-pointer"
              title="Refresh Archive"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[11px] text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                Clear Archive
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center bg-[#0b141a] rounded-2xl border border-[#202c33] text-slate-500 text-xs">
            <p>No broadcast stories published yet. Compose your first story above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      {item.type === 'video' ? '🎬 Video' : item.type === 'image' ? '📸 Photo' : '📝 Text'} Story
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {item.mediaUrl && (
                    <div className="rounded-xl overflow-hidden h-24 bg-black border border-[#202c33]">
                      {item.type === 'video' ? (
                        <video src={item.mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.mediaUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {item.text || '(Media without text caption)'}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#202c33] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {item.accountLabel || 'All Contacts'}
                  </span>
                  <button
                    onClick={() => handleRebroadcast(item)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Re-Broadcast</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
