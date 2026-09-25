import React, { useState } from 'react';
import { 
  Rocket, 
  Users, 
  Share2, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Zap, 
  Globe2, 
  MessageSquare, 
  DollarSign, 
  Play, 
  FileText, 
  ExternalLink,
  Lock,
  Music,
  Image as ImageIcon,
  Flame,
  Check
} from 'lucide-react';
import { User } from 'firebase/auth';

interface LandingPageProps {
  onGetStarted: () => void;
  onCreateAdvert: () => void;
  currentUser: User | null;
  onLogin: () => void;
  networkStats?: {
    totalPromoters: number;
    totalPooledGroups: number;
    totalAudienceReach: number;
    totalAdvertsPublished: number;
  };
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onCreateAdvert,
  currentUser,
  onLogin,
  networkStats = {
    totalPromoters: 1420,
    totalPooledGroups: 3850,
    totalAudienceReach: 940000,
    totalAdvertsPublished: 12600
  }
}) => {
  const [selectedTab, setSelectedTab] = useState<'advertiser' | 'promoter'>('advertiser');
  const [estGroups, setEstGroups] = useState<number>(50);

  const calculatedReach = (estGroups * 260).toLocaleString();
  const calculatedCost = (estGroups * 0.45).toFixed(2);

  return (
    <div className="min-h-screen bg-[#0b141a] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Top Floating Announcement */}
      <div className="bg-gradient-to-r from-emerald-900/60 via-teal-900/60 to-emerald-900/60 border-b border-emerald-500/20 py-2.5 px-4 text-center">
        <p className="text-xs text-emerald-300 font-medium flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-bold">Live Ad Network Active:</span> Automated multi-account broadcast distribution across {networkStats.totalPooledGroups.toLocaleString()}+ public WhatsApp groups!
        </p>
      </div>

      {/* Main Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Decentralized WhatsApp Ad & Promoter Ecosystem</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Broadcast Your Business Adverts To <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Millions On WhatsApp</span>
        </h1>

        <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          The ultimate automated ad network. Connect your WhatsApp account to pool audience reach, or launch viral business campaigns broadcasted automatically across thousands of connected promoter groups.
        </p>

        {/* Dual Primary Call-to-Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={onCreateAdvert}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Rocket className="w-4 h-4" />
            <span>Create & Publish Advert</span>
          </button>

          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] hover:border-emerald-500/40 text-slate-200 hover:text-white font-bold text-sm transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Join As Promoter</span>
          </button>
        </div>

        {/* Live Network Metrics Grid */}
        <div className="mt-14 w-full grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
          <div className="p-4 rounded-2xl bg-[#111b21]/90 border border-[#202c33] backdrop-blur-md text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{networkStats.totalPromoters.toLocaleString()}+</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Active Promoters</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21]/90 border border-[#202c33] backdrop-blur-md text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">{networkStats.totalPooledGroups.toLocaleString()}+</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Pooled WhatsApp Groups</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21]/90 border border-[#202c33] backdrop-blur-md text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-teal-300 font-mono">{networkStats.totalAudienceReach.toLocaleString()}+</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Live Audience Reach</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21]/90 border border-[#202c33] backdrop-blur-md text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">{networkStats.totalAdvertsPublished.toLocaleString()}+</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Adverts Delivered</p>
          </div>
        </div>

      </section>

      {/* Dual Value Proposition: For Businesses vs For Promoters */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        <div className="flex items-center justify-center mb-10">
          <div className="bg-[#111b21] p-1.5 rounded-2xl border border-[#202c33] flex items-center gap-2">
            <button
              onClick={() => setSelectedTab('advertiser')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedTab === 'advertiser'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚀 For Businesses & Advertisers
            </button>
            <button
              onClick={() => setSelectedTab('promoter')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedTab === 'promoter'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💰 For WhatsApp Promoters & Influencers
            </button>
          </div>
        </div>

        {selectedTab === 'advertiser' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <span>Maximum Viral Engagement</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                Instantly Broadcast Your Products & Links Across Public WhatsApp Groups
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Reach direct WhatsApp consumers without paying exorbitant pay-per-click rates. Submit your advert message, music/media, and promotional links. Our automated engine publishes them with Spintax variation across verified open groups.
              </p>

              <div className="space-y-3">
                {[
                  'Over 90% open and notification read rates on mobile WhatsApp.',
                  'Anti-ban AI Spintax keeps every broadcast message unique.',
                  'Real-time delivery verification across active promoter accounts.',
                  'Support for rich media, photos, audio tracks, and tracked direct links.'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onCreateAdvert}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Business Advert Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive WhatsApp Ad Preview Card */}
            <div className="p-6 rounded-3xl bg-[#111b21] border border-[#202c33] shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#202c33] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-white">Live WhatsApp Message Preview</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Published To 3,850+ Groups
                </span>
              </div>

              {/* Message Bubble */}
              <div className="bg-[#005c4b] p-4 rounded-2xl rounded-tr-none text-white text-xs sm:text-sm space-y-3 max-w-md ml-auto shadow-lg">
                <p className="font-bold text-emerald-200">🚀 EXCLUSIVE SPECIAL OFFER</p>
                <p className="text-slate-100 leading-relaxed">
                  Boost your store sales & engagement today! Get up to 50% discount on all premium orders. Fast nationwide shipping & instant support.
                </p>
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/10 text-xs flex items-center justify-between">
                  <span className="font-mono text-emerald-300">https://yourbrand.com/promo</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-200/80 pt-1">
                  <span>Sponsored Broadcast</span>
                  <span>10:42 AM ✓✓</span>
                </div>
              </div>

              {/* Instant Campaign Estimator */}
              <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Estimated Target Groups:</span>
                  <span className="text-emerald-400 font-mono font-bold">{estGroups} Groups</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={estGroups}
                  onChange={(e) => setEstGroups(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#111b21] border border-[#202c33]">
                    <p className="text-[10px] text-slate-400">Estimated Reach</p>
                    <p className="font-bold text-emerald-400 text-sm mt-0.5">{calculatedReach} Users</p>
                  </div>
                  <div className="p-2 rounded-xl bg-[#111b21] border border-[#202c33]">
                    <p className="text-[10px] text-slate-400">Campaign Tier</p>
                    <p className="font-bold text-white text-sm mt-0.5">${calculatedCost} USD</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-bold border border-teal-500/20">
                <span>Earn & Monetize Your Audience</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                Connect Your WhatsApp Account & Pool Your Groups For Passive Income
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Do you belong to active WhatsApp groups? Link your WhatsApp session via 8-Digit Pairing Code and select which groups to opt into the automated network pool. Even without admin privileges, if the group is open for messages, our system publishes verified adverts safely.
              </p>

              <div className="space-y-3">
                {[
                  '100% Control: You choose exactly which groups participate in the pool.',
                  'Automated payout credit every time verified adverts are published.',
                  'Anti-ban pacing protects your phone number with randomized jitter.',
                  'Syncs directly to your Firebase promoter profile in real-time.'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onGetStarted}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Connect WhatsApp Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Promoter Dashboard Visual */}
            <div className="p-6 rounded-3xl bg-[#111b21] border border-[#202c33] shadow-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promoter Earnings & Pool Status</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33]">
                  <p className="text-xs text-slate-400">Total Group Pool</p>
                  <p className="text-2xl font-bold text-white mt-1">18 Groups</p>
                  <span className="text-[10px] text-emerald-400">✓ Opted in for auto-ads</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33]">
                  <p className="text-xs text-slate-400">Live Earnings</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">$148.50</p>
                  <span className="text-[10px] text-slate-400">Available to withdraw</span>
                </div>
              </div>

              {/* Sample Pooled Groups */}
              <div className="space-y-2">
                {[
                  { name: 'Tech Entrepreneurs Network', members: 480, status: 'Active In Pool' },
                  { name: 'Crypto & Forex Signals Hub', members: 620, status: 'Active In Pool' },
                  { name: 'Global Dropshipping Mastermind', members: 390, status: 'Active In Pool' }
                ].map((g, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{g.name}</p>
                      <p className="text-[10px] text-slate-500">{g.members} active participants</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      {g.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </section>

      {/* How it Works Step-by-Step */}
      <section className="py-16 bg-[#111b21]/50 border-y border-[#202c33] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          
          <div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">How The Automated Network Works</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-xl mx-auto">
              A 3-step engine synchronizing promoters and advertisers through Firebase cloud state.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-3xl bg-[#111b21] border border-[#202c33] space-y-3 relative">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold font-mono border border-emerald-500/20">
                01
              </div>
              <h3 className="text-base font-bold text-white">1. Link Account via Pairing Code</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your WhatsApp session securely in seconds using the official 8-digit pairing code. Your session is maintained in Firebase cloud persistence.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#111b21] border border-[#202c33] space-y-3 relative">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold font-mono border border-teal-500/20">
                02
              </div>
              <h3 className="text-base font-bold text-white">2. Select Pooled Groups or Submit Ad</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Promoters choose which of their groups to share in the public broadcast pool. Advertisers create high-converting promotional copies with media and links.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#111b21] border border-[#202c33] space-y-3 relative">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold font-mono border border-cyan-500/20">
                03
              </div>
              <h3 className="text-base font-bold text-white">3. Automated Anti-Ban Broadcast</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our central engine dispatches approved campaigns across all pooled groups with randomized Spintax text and pacing delays to protect every connected account.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer Call to Action */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          Ready To Scale Your WhatsApp Reach & Advertising?
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onCreateAdvert}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg cursor-pointer"
          >
            Create Business Advert
          </button>
          <button
            onClick={onGetStarted}
            className="px-6 py-3 rounded-2xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Promoter Dashboard
          </button>
        </div>
        <p className="text-[11px] text-slate-500 pt-6 border-t border-[#202c33]">
          WhatsApp Growth & Automation Ad Network • Powered by Firebase Firestore & Baileys Engine
        </p>
      </footer>

    </div>
  );
};
