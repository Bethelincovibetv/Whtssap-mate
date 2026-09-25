import React, { useState, useRef } from 'react';
import { 
  Rocket, 
  Sparkles, 
  Image as ImageIcon, 
  Music, 
  Link as LinkIcon, 
  Eye, 
  HelpCircle, 
  Check, 
  AlertCircle,
  ExternalLink,
  Upload,
  X,
  Trash2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, isUserAdmin, sanitizeFirestoreData } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AdvertCampaign } from '../types';

interface CreateAdvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSuccess: (newAdvert: AdvertCampaign) => void;
}

export const CreateAdvertModal: React.FC<CreateAdvertModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [advertContent, setAdvertContent] = useState(
    '🔥 {EXCLUSIVE DEAL|SPECIAL OFFER}! Check out the latest products on our store.\n\n⚡ Up to 50% discount on all orders placed today!\n\n👇 Tap the official link below to claim:'
  );
  const [linkUrl, setLinkUrl] = useState('https://example.com/special-deal');
  const [mediaUrl, setMediaUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [category, setCategory] = useState('Business & E-commerce');
  const [targetReach, setTargetReach] = useState<number>(5000);
  const [budget, setBudget] = useState<number>(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isAdmin = isUserAdmin(currentUser);

  // Handle local image file upload & compression to base64
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 8MB. Please choose a smaller image.');
      return;
    }

    setImageFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setMediaUrl('');
    setImageFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !advertContent.trim()) {
      setErrorMsg('Please provide a campaign title and advert copy.');
      return;
    }

    if (!currentUser) {
      setErrorMsg('Please log in with Google to publish an advert campaign.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const advertId = 'adv_' + Date.now() + '_' + Math.random().toString(36).substring(5);
      
      const payload: Record<string, any> = {
        id: advertId,
        creatorUid: currentUser.uid,
        creatorEmail: currentUser.email || 'anonymous',
        creatorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Advertiser',
        title: title.trim(),
        advertContent: advertContent.trim(),
        category: category || 'General',
        status: 'approved',
        budget: Number(budget) || 25,
        targetReach: Number(targetReach) || 5000,
        deliveredGroupsCount: 0,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      };

      if (linkUrl && linkUrl.trim()) {
        payload.linkUrl = linkUrl.trim();
      }
      if (mediaUrl && mediaUrl.trim()) {
        payload.mediaUrl = mediaUrl.trim();
      }
      if (musicUrl && musicUrl.trim()) {
        payload.musicUrl = musicUrl.trim();
      }

      const cleanData = sanitizeFirestoreData(payload) as AdvertCampaign;

      // Save into Firestore `/adverts/{advertId}`
      const advertRef = doc(db, 'adverts', advertId);
      await setDoc(advertRef, cleanData);

      onSuccess(cleanData);
      onClose();
    } catch (err) {
      console.error('Failed to create advert campaign:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'adverts');
      } catch (fErr: any) {
        setErrorMsg(fErr.message || 'Error submitting advert to Firebase.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-x-hidden">
      <div className="bg-[#111b21] border border-emerald-500/30 rounded-2xl sm:rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[#202c33] bg-gradient-to-r from-[#111b21] to-[#0c1f17] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                Create & Publish WhatsApp Advert
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Broadcasted automatically across hundreds of active pooled groups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Campaign Title */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Advert Campaign Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Mega Sale Promo - 50% Off"
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
            />
          </div>

          {/* Category & Budget Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Target Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
              >
                <option value="Business & E-commerce">Business & E-commerce</option>
                <option value="Crypto & Forex Signals">Crypto & Forex Signals</option>
                <option value="Tech & Apps">Tech & Software Apps</option>
                <option value="Fashion & Lifestyle">Fashion & Lifestyle</option>
                <option value="Education & Jobs">Education & Jobs</option>
                <option value="General Community">General Community</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Estimated Audience Target
              </label>
              <input
                type="number"
                min="500"
                step="500"
                value={targetReach}
                onChange={(e) => setTargetReach(Number(e.target.value))}
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Advert Content / Spintax Copy */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-bold text-slate-300">
                Advert Broadcast Copy (Spintax Supported) *
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">Use {`{Hi|Hello}`} for anti-ban</span>
            </div>
            <textarea
              rows={4}
              required
              value={advertContent}
              onChange={(e) => setAdvertContent(e.target.value)}
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none font-mono leading-relaxed resize-none"
            />
          </div>

          {/* Direct File Upload for Image (FEATURE REQUEST) */}
          <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                Upload Campaign Banner Image
              </label>
              <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 8MB</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
                id="advert-image-upload"
              />

              <label
                htmlFor="advert-image-upload"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold cursor-pointer transition-all w-full sm:w-auto justify-center"
              >
                <Upload className="w-4 h-4" />
                <span>{mediaUrl ? 'Change Uploaded Image' : 'Choose Image File'}</span>
              </label>

              {mediaUrl && (
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Image</span>
                </button>
              )}
            </div>

            {/* Optional Image URL Input */}
            <div className="pt-1">
              <input
                type="url"
                value={mediaUrl.startsWith('data:') ? '' : mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Or paste image URL: https://images.unsplash.com/..."
                className="w-full bg-[#111b21] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
            </div>

            {/* Image Preview Thumbnail */}
            {mediaUrl && (
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black/40 p-2 flex items-center gap-3">
                <img
                  src={mediaUrl}
                  alt="Campaign Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-[#202c33]"
                />
                <div className="text-xs space-y-0.5 truncate">
                  <p className="font-semibold text-emerald-300 truncate">
                    {imageFileName || 'Uploaded Banner Image'}
                  </p>
                  <p className="text-[10px] text-slate-400">Attached to automated broadcast</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Link URL */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              Direct Action / Website URL (Optional)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://yourstore.com/promo"
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
            />
          </div>

          {/* Live Preview Bubble */}
          <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-400" /> Live WhatsApp Chat Simulation:
              </span>
              <span className="text-emerald-400 font-mono">Auto-Broadcast Ready</span>
            </div>

            <div className="bg-[#005c4b] p-3.5 rounded-xl rounded-tr-none text-white text-xs space-y-2 max-w-sm ml-auto shadow-md">
              {mediaUrl && (
                <div className="rounded-lg overflow-hidden max-h-40 border border-white/10">
                  <img src={mediaUrl} alt="Ad media" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="font-bold text-emerald-200 line-clamp-1">{title || 'Special Announcement'}</p>
              <p className="text-slate-100 text-[11px] leading-relaxed whitespace-pre-wrap">
                {advertContent.replace(/\{([^}]+)\}/g, (_, choices) => choices.split('|')[0])}
              </p>
              {linkUrl && (
                <div className="p-2 rounded-lg bg-black/20 text-[10px] font-mono text-emerald-300 flex items-center justify-between">
                  <span className="truncate">{linkUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 ml-1" />
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publishing Advert...' : 'Submit & Broadcast Advert'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
