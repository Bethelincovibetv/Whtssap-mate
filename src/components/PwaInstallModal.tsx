import React from 'react';
import { Share, PlusSquare, X, Smartphone, Download } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#111b21] border border-[#202c33] rounded-2xl shadow-2xl p-6 text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202c33] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center shadow-lg shadow-emerald-950/60">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Install WhatsApp Engine</h3>
            <p className="text-xs text-slate-400">Add to your Home Screen for app experience</p>
          </div>
        </div>

        <div className="space-y-3.5 my-5 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0b141a] border border-[#202c33]">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
              1
            </div>
            <div>
              <p className="font-semibold text-slate-200">Tap the Share button</p>
              <p className="text-slate-400 mt-0.5 flex items-center gap-1.5">
                In Safari, tap the <Share className="w-3.5 h-3.5 text-blue-400 inline" /> icon on the browser toolbar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0b141a] border border-[#202c33]">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
              2
            </div>
            <div>
              <p className="font-semibold text-slate-200">Select "Add to Home Screen"</p>
              <p className="text-slate-400 mt-0.5 flex items-center gap-1.5">
                Scroll through options and tap <PlusSquare className="w-3.5 h-3.5 text-slate-200 inline" /> <span className="font-medium">Add to Home Screen</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0b141a] border border-[#202c33]">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
              3
            </div>
            <div>
              <p className="font-semibold text-slate-200">Confirm & Launch</p>
              <p className="text-slate-400 mt-0.5">
                Tap <span className="text-emerald-400 font-semibold">Add</span> in the top-right corner. The app will appear on your phone screen!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-950/50"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
