import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, isUserAdmin } from '../lib/firebase';
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
  const [musicUrl, setMusicUrl] = useState('');
  const [category, setCategory] = useState('Business & E-commerce');
  const [targetReach, setTargetReach] = useState<number>(5000);
  const [budget, setBudget] = useState<number>(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = isUserAdmin(currentUser);

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
      
      const newCampaign: AdvertCampaign = {
        id: advertId,
        creatorUid: currentUser.uid,
        creatorEmail: currentUser.email || 'anonymous',
        creatorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Advertiser',
        title: title.trim(),
        advertContent: advertContent.trim(),
        linkUrl: linkUrl.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        musicUrl: musicUrl.trim() || undefined,
        category,
        status: isAdmin ? 'approved' : 'approved', // Auto-approved or admin managed
        budget: Number(budget) || 25,
        targetReach: Number(targetReach) || 5000,
        deliveredGroupsCount: 0,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      };

      // Save into Firestore `/adverts/{advertId}`
      const advertRef = doc(db, 'adverts', advertId);
      await setDoc(advertRef, newCampaign);

      onSuccess(newCampaign);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111b21] border border-emerald-500/30 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#202c33] bg-gradient-to-r from-[#111b21] to-[#0c1f17] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Create & Publish WhatsApp Advert
              </h3>
              <p className="text-xs text-slate-300">
                Broadcasted automatically across hundreds of active pooled groups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Campaign Title */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Advert Campaign Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Mega Sale Promo - 50% Off"
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none"
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
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white outline-none"
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
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Advert Content / Spintax Copy */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                Advert Broadcast Copy (Spintax Supported)
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">Use {`{Hi|Hello}`} for anti-ban</span>
            </div>
            <textarea
              rows={4}
              required
              value={advertContent}
              onChange={(e) => setAdvertContent(e.target.value)}
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none font-mono leading-relaxed"
            />
          </div>

          {/* Action Link URL */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              Direct Action / Business Website URL
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://yourstore.com/promo"
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none"
            />
          </div>

          {/* Media & Music References */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                Banner Photo URL (Optional)
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                Soundtrack / Audio Link (Optional)
              </label>
              <input
                type="url"
                value={musicUrl}
                onChange={(e) => setMusicUrl(e.target.value)}
                placeholder="https://example.com/theme.mp3"
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          {/* Live Preview Bubble */}
          <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-400" /> Live WhatsApp Chat Simulation:
              </span>
              <span className="text-emerald-400 font-mono">Automated Publish Ready</span>
            </div>

            <div className="bg-[#005c4b] p-3.5 rounded-xl rounded-tr-none text-white text-xs space-y-2 max-w-sm ml-auto shadow-md">
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
              className="px-4 py-2 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 text-xs font-semibold transition-all cursor-pointer"
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
