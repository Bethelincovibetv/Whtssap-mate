import React, { useState, useEffect, useRef } from 'react';
import { 
  Rocket, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Image as ImageIcon, 
  Globe2, 
  DollarSign, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Link as LinkIcon, 
  ShieldCheck, 
  Zap, 
  Upload, 
  X,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { db, sanitizeFirestoreData, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface PublicPitchPageProps {
  promoterUid: string;
  onBackToApp?: () => void;
}

export const PublicPitchPage: React.FC<PublicPitchPageProps> = ({ promoterUid, onBackToApp }) => {
  const [promoterProfile, setPromoterProfile] = useState<{ displayName?: string; email?: string; photoURL?: string } | null>(null);
  const [loadingPromoter, setLoadingPromoter] = useState<boolean>(true);

  const [title, setTitle] = useState('');
  const [advertContent, setAdvertContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [category, setCategory] = useState('Business & E-Commerce');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterContact, setSubmitterContact] = useState('');
  const [budget, setBudget] = useState<number>(20);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPitchId, setSubmittedPitchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchPromoter() {
      if (!promoterUid) {
        setLoadingPromoter(false);
        return;
      }
      try {
        const docRef = doc(db, 'users', promoterUid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setPromoterProfile(snap.data() as any);
        }
      } catch (e) {
        console.warn('Promoter profile fetch note:', e);
      } finally {
        setLoadingPromoter(false);
      }
    }
    fetchPromoter();
  }, [promoterUid]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, WebP).');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !advertContent.trim()) {
      setErrorMsg('Please enter an advert title and content.');
      return;
    }
    if (!submitterName.trim() || !submitterContact.trim()) {
      setErrorMsg('Please provide your name and WhatsApp number or email so the promoter can reach you.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const pitchId = 'ptc_' + Date.now() + '_' + Math.random().toString(36).substring(5);

    const pitchData = {
      id: pitchId,
      targetHostUid: promoterUid,
      targetHostEmail: promoterProfile?.email || '',
      title: title.trim(),
      advertContent: advertContent.trim(),
      linkUrl: linkUrl.trim() || undefined,
      mediaUrl: mediaUrl || undefined,
      submitterName: submitterName.trim(),
      submitterContact: submitterContact.trim(),
      category,
      budget: Number(budget) || 0,
      status: 'pending_approval',
      submittedAt: new Date().toISOString()
    };

    try {
      // 1. Save to server-side backend persistence
      await fetch('/api/advert-pitches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pitchData)
      }).catch(e => console.warn('Server pitch note:', e));

      // 2. Save directly into Firestore `/advert_pitches/{pitchId}`
      try {
        const pitchRef = doc(db, 'advert_pitches', pitchId);
        await setDoc(pitchRef, sanitizeFirestoreData(pitchData));
      } catch (fsErr) {
        try {
          handleFirestoreError(fsErr, OperationType.WRITE, 'advert_pitches');
        } catch (e) {
          console.warn('Firestore pitch write note:', e);
        }
      }

      setSubmittedPitchId(pitchId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit advert pitch. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const promoterName = promoterProfile?.displayName || 'WhatsApp Ad Promoter';

  return (
    <div className="min-h-screen bg-[#0b141a] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Navbar / Back */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center text-white shadow-md">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">WhatsApp Growth Ad Network</h1>
              <p className="text-[11px] text-slate-400">Sponsored Broadcast Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111b21] hover:bg-[#1f2c34] border border-[#202c33] text-xs font-semibold text-slate-300 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
            </button>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="text-xs text-emerald-400 hover:underline px-2 py-1 cursor-pointer"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Hero Banner for Host */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#111b21] via-[#111b21] to-emerald-950/40 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
          
          <div className="flex items-start sm:items-center gap-4">
            {promoterProfile?.photoURL ? (
              <img src={promoterProfile.photoURL} alt={promoterName} className="w-14 h-14 rounded-2xl border-2 border-emerald-500/60 object-cover shrink-0 shadow" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-emerald-950/50">
                {promoterName[0].toUpperCase()}
              </div>
            )}
            
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                Verified Ad Network Host
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate">
                Submit Your Advert to {promoterName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Reach thousands of active WhatsApp users, high-engagement groups, and status viewers through this promoter's automated ad network.
              </p>
            </div>
          </div>
        </div>

        {/* Success Screen if Submitted */}
        {submittedPitchId ? (
          <div className="p-8 rounded-3xl bg-[#111b21] border-2 border-emerald-500/60 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/30 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Advert Pitch Submitted Successfully!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                <span className="font-semibold text-emerald-400">{promoterName}</span> has received your campaign proposal. Once approved, your advert will be broadcasted across their active WhatsApp groups.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] max-w-md mx-auto text-left space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tracking Ref:</span>
                <span className="text-white font-bold">{submittedPitchId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Campaign Title:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[200px]">{title}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Proposed Budget:</span>
                <span className="text-amber-400 font-bold">${budget}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmittedPitchId(null);
                setTitle('');
                setAdvertContent('');
                setMediaUrl('');
              }}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              Submit Another Advert
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-[#111b21] border border-[#202c33] shadow-2xl space-y-6">
            <div className="border-b border-[#202c33] pb-4">
              <h3 className="text-base font-bold text-white">Campaign Details</h3>
              <p className="text-xs text-slate-400">Provide the text, banner, and target link for your advert</p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Campaign Title */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Campaign Title / Headline <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., 50% Off Flash Sale on Sneakers!"
                  className="w-full px-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  required
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 text-sm text-white outline-none transition-colors"
                  >
                    <option value="Business & E-Commerce">Business & E-Commerce</option>
                    <option value="Crypto & Web3">Crypto & Web3</option>
                    <option value="Real Estate & Housing">Real Estate & Housing</option>
                    <option value="Jobs & Freelancing">Jobs & Freelancing</option>
                    <option value="Tech & Apps">Tech & Apps</option>
                    <option value="Entertainment & Media">Entertainment & Media</option>
                    <option value="Health & Beauty">Health & Beauty</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Proposed Budget / Sponsorship Fee ($ USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="number"
                      min={0}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      placeholder="25"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 text-sm text-white outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Advert Copy / Content */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Advert Copy & Message Body <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={advertContent}
                  onChange={(e) => setAdvertContent(e.target.value)}
                  placeholder="Enter your advert message, offer details, bullet points, and WhatsApp formatting (*bold*, _italic_)..."
                  className="w-full px-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-colors font-sans leading-relaxed"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tip: Supports spintax formatting like <span className="font-mono text-emerald-400">{'{Special Deal|Exclusive Offer}'}</span> for varied broadcasts.
                </p>
              </div>

              {/* Website / Target URL */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Call-to-Action Link / Website URL
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://yourstore.com/deal"
                    className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Banner Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Banner Image / Flyer (Optional)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#0b141a] hover:bg-[#1f2c34] border border-[#202c33] text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Upload Image File</span>
                  </button>

                  <input
                    type="url"
                    value={mediaUrl.startsWith('data:') ? '' : mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      setImageFileName('');
                    }}
                    placeholder="Or paste image URL (https://...)"
                    className="flex-1 w-full px-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                {mediaUrl && (
                  <div className="mt-3 relative w-36 h-36 rounded-2xl overflow-hidden border border-emerald-500/40 group">
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setMediaUrl('');
                        setImageFileName('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submitter Contact Details */}
              <div className="pt-4 border-t border-[#202c33] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Your Name / Company <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="e.g., Alex Johnson / Nike Dealer"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Your WhatsApp Phone or Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={submitterContact}
                      onChange={(e) => setSubmitterContact(e.target.value)}
                      placeholder="+1 (555) 019-2834 or you@email.com"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/50 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-98 disabled:opacity-50"
              >
                <Rocket className="w-5 h-5" />
                <span>{isSubmitting ? 'Submitting Proposal...' : 'Submit Advert Proposal'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <p className="text-[11px] text-center text-slate-400 mt-2.5">
                🔒 Safe & Direct Submission. No account registration required for sponsors.
              </p>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
