import React, { useState } from 'react';
import { 
  Smartphone, 
  Users, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  RefreshCw,
  Eye,
  Radio,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import pairingImg from '../assets/images/how_it_works_pairing_1790669396297.jpg';
import groupImg from '../assets/images/group_tagging_campaign_1790669408654.jpg';
import statusImg from '../assets/images/status_story_automation_1790669419518.jpg';

interface HowItWorksGuideProps {
  onGoToConnect?: () => void;
  onGoToCampaign?: () => void;
}

export const HowItWorksGuide: React.FC<HowItWorksGuideProps> = ({
  onGoToConnect,
  onGoToCampaign
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      id: 1,
      badge: 'Step 1 • Fast Pairing',
      title: 'Link Your WhatsApp in 60 Seconds',
      tagline: 'No camera or 2nd phone needed. Fast 8-digit pairing.',
      image: pairingImg,
      icon: Smartphone,
      accentColor: 'from-emerald-500 to-teal-500',
      bullets: [
        'Enter your phone number with your country code in the Connect tab.',
        'An official 8-digit WhatsApp pairing code is generated instantly.',
        'Open WhatsApp on your phone > Linked Devices > Link with phone number instead.',
        'Enter the 8-digit code. Your session is immediately synced and maintained 24/7 in the cloud.'
      ],
      tip: 'Tip: When you minimize the app to paste the code, your pairing session stays alive and auto-connects the second WhatsApp verifies!'
    },
    {
      id: 2,
      badge: 'Step 2 • Audience Pooling',
      title: 'Pool Groups & Tag Members with @everyone',
      tagline: 'Auto-sync thousands of real WhatsApp members.',
      image: groupImg,
      icon: Users,
      accentColor: 'from-cyan-500 to-blue-500',
      bullets: [
        'All groups you are in are automatically fetched and categorized.',
        'Tag all members in any group using high-converting @everyone mentions.',
        'Export unified VCF Contact Gain files with preserved original contact names.',
        'Share your groups with the Decentralized Ad Network to earn promoter reach.'
      ],
      tip: 'Tip: Contact names are cleanly preserved as "Name (Group)" so you never lose customer identity!'
    },
    {
      id: 3,
      badge: 'Step 3 • 24/7 Auto-Pilot',
      title: 'Viral Ad Broadcasts & 24h Status Reposter',
      tagline: 'Continuous marketing on auto-pilot even when your phone is off.',
      image: statusImg,
      icon: Send,
      accentColor: 'from-amber-500 to-orange-500',
      bullets: [
        'Set up 24-hour Auto-Reposting to automatically republish status stories right before they expire.',
        'Broadcast multimedia campaigns (images, videos, buttons) across dozens of groups on timed schedules.',
        'Auto-view incoming contact stories with randomized human delays and instant emoji reactions.',
        'Multi-account architecture allows managing 10+ WhatsApp business lines from one screen.'
      ],
      tip: 'Tip: The 24/7 Cloud Watchdog ensures recurring jobs run seamlessly around the clock!'
    }
  ];

  const currentStep = steps[activeStep];

  return (
    <div className="w-full bg-[#111b21] rounded-3xl border border-[#202c33] p-5 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#202c33]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Visual Guide</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            How WhatsApp Engine Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Follow this simple 3-step blueprint to connect your WhatsApp, pool high-intent groups, and launch automated 24/7 marketing campaigns.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0b141a] border border-[#202c33] shrink-0 self-start md:self-auto">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStep === idx
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#1a2730]'
              }`}
            >
              <span>0{s.id}</span>
              <span className="hidden sm:inline">{s.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Step Presentation Card */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left: AI Illustration with 3D Float Frame */}
        <div className="lg:col-span-6 relative group">
          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl bg-[#0b141a] aspect-video sm:aspect-[4/3] flex items-center justify-center">
            <img 
              src={currentStep.image} 
              alt={currentStep.title} 
              className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Step Overlay Pill */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-[#0b141a]/90 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentStep.badge}</span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Step Guide */}
        <div className="lg:col-span-6 space-y-4">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 font-mono">
              Step 0{currentStep.id} of 03
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {currentStep.tagline}
            </p>
          </div>

          {/* Action Bullets */}
          <div className="space-y-2.5 pt-2">
            {currentStep.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0b141a]/70 border border-[#202c33]">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {bullet}
                </p>
              </div>
            ))}
          </div>

          {/* Pro Tip Box */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px] sm:text-xs">
              {currentStep.tip}
            </p>
          </div>

          {/* Next / Previous Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-[#202c33]">
            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <button
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="px-3.5 py-2 rounded-xl bg-[#0b141a] hover:bg-[#1a2730] border border-[#202c33] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  Back
                </button>
              )}

              {activeStep < steps.length - 1 ? (
                <button
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                onGoToConnect && (
                  <button
                    onClick={onGoToConnect}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/60"
                  >
                    <span>Connect WhatsApp Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              {activeStep + 1} / {steps.length}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
