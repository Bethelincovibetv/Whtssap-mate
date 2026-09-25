import React, { useState } from 'react';
import { 
  Rocket, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Server, 
  GitBranch, 
  FileCode,
  Terminal,
  ShieldCheck
} from 'lucide-react';

export const RenderDeployTab: React.FC = () => {
  const [copiedYaml, setCopiedYaml] = useState(false);

  const renderYamlContent = `services:
  - type: web
    name: whatsapp-growth-engine
    env: node
    plan: free
    buildCommand: npm install --legacy-peer-deps && npm run build
    startCommand: node server.js
    envVars:
      - key: PORT
        value: 10000
      - key: NODE_VERSION
        value: 20.18.0
      - key: GEMINI_API_KEY
        sync: false`;

  const copyYaml = () => {
    navigator.clipboard.writeText(renderYamlContent);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-[#111b21] to-[#111b21] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Rocket className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">1-Click Zero-Config Render Deployment</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Deploy this entire WhatsApp Automation Engine to Render’s Free/Starter Web Service in under 60 seconds. Single root-level repo, unified Express backend and frontend UI.
          </p>
        </div>

        <a
          href="https://dashboard.render.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#128C7E] to-[#25D366] hover:from-[#075E54] hover:to-[#128C7E] text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 shrink-0 transition-all"
        >
          <span>Open Render Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 4 Step Deployment Walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Step 1 & 2 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              1
            </span>
            <h3 className="font-bold text-white text-sm">Create New GitHub Repository</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Create a new repository on GitHub (e.g. <code className="text-emerald-400 font-mono">whatsapp-engine</code>) and push these project files to the root directory.
          </p>
          <div className="p-3 bg-[#0b141a] rounded-xl border border-[#202c33] font-mono text-[11px] text-slate-400 space-y-1">
            <p>git init</p>
            <p>git add .</p>
            <p>git commit -m "feat: initial whatsapp engine"</p>
            <p>git push origin main</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              2
            </span>
            <h3 className="font-bold text-white text-sm">Create Web Service on Render</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            In your Render dashboard, click <strong className="text-white">New +</strong> &gt; <strong className="text-white">Web Service</strong> and select your newly created GitHub repository.
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li><strong className="text-white">Root Directory:</strong> Leave empty (default <code className="text-emerald-400 font-mono">/</code>)</li>
            <li><strong className="text-white">Build Command:</strong> <code className="text-emerald-400 font-mono">npm install && npm run build</code></li>
            <li><strong className="text-white">Start Command:</strong> <code className="text-emerald-400 font-mono">node server.js</code></li>
          </ul>
        </div>

        {/* Step 3 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              3
            </span>
            <h3 className="font-bold text-white text-sm">Add Environment Variables (Optional)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Under the <strong className="text-white">Environment Variables</strong> tab on Render, add:
          </p>
          <div className="p-3 bg-[#0b141a] rounded-xl border border-[#202c33] font-mono text-xs text-emerald-400 space-y-1">
            <p>GEMINI_API_KEY = your_gemini_api_key_here</p>
            <p>PORT = 3000</p>
          </div>
          <p className="text-[11px] text-slate-500">
            This powers the 24/7 AI Auto-Responder in private customer DMs.
          </p>
        </div>

        {/* Step 4 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              4
            </span>
            <h3 className="font-bold text-white text-sm">Instant 8-Digit Pairing Link</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Once deployment completes, open your live Render link (e.g. <code className="text-emerald-400 font-mono">https://my-app.onrender.com</code>), enter your phone number, and enter the 8-digit code inside WhatsApp!
          </p>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Ready for 24/7 autonomous status views, reactions, and AI responses!</span>
          </div>
        </div>

      </div>

      {/* render.yaml Blueprint Viewer */}
      <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-xs font-mono">render.yaml (Included in repo root)</h3>
          </div>
          <button
            onClick={copyYaml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-300 text-xs font-mono transition-all border border-[#202c33]"
          >
            {copiedYaml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedYaml ? 'Copied!' : 'Copy YAML'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33] font-mono text-xs text-emerald-300 overflow-x-auto">
          {renderYamlContent}
        </pre>
      </div>

    </div>
  );
};
