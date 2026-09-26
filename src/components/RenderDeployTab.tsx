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
  ShieldCheck,
  Globe2,
  Lock
} from 'lucide-react';

export const RenderDeployTab: React.FC = () => {
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const deployedUrl = 'https://whtssap-mate.onrender.com';
  const deployedDomain = 'whtssap-mate.onrender.com';
  const firebaseProjectId = 'gen-lang-client-0116158889';

  const renderYamlContent = `services:
  - type: web
    name: whtssap-mate
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: PORT
        value: 10000
      - key: NODE_VERSION
        value: 22.23.2
      - key: GEMINI_API_KEY
        sync: false
      - key: DATA_DIR
        value: /var/data`;

  const copyYaml = () => {
    navigator.clipboard.writeText(renderYamlContent);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2500);
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(deployedDomain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Live Deployed Domain Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#111b21] to-[#111b21] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Globe2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Live Render Production Deployment</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Your live app is configured for: <span className="font-mono text-emerald-400 font-bold">{deployedUrl}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyDomain}
            className="px-4 py-2.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-200 border border-[#202c33] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDomain ? 'Domain Copied' : 'Copy Domain'}</span>
          </button>

          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Open Live App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Firebase Authorized Domain Guide Banner */}
      <div className="p-6 rounded-2xl bg-[#111b21] border border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Firebase Authentication Authorized Domain Setup
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Ensure Google Sign-In & Firebase Auth work seamlessly on your live Render domain.
              </p>
            </div>
          </div>

          <a
            href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Open Firebase Auth Settings</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-2 text-xs">
          <p className="text-slate-300 font-semibold">How to whitelist your domain in 3 clicks:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
            <li>Open the Firebase Console for project <code className="text-amber-400 font-mono">{firebaseProjectId}</code></li>
            <li>Navigate to <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong></li>
            <li>Click <strong>Add domain</strong>, paste <code className="text-emerald-400 font-mono font-bold">{deployedDomain}</code>, and save!</li>
          </ol>
        </div>
      </div>

      {/* 4 Step Deployment Walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Step 1 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              1
            </span>
            <h3 className="font-bold text-white text-sm">GitHub Repository Synced</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your repository contains the unified backend server and React client bundled together with standard Node.js 22 runtime commands.
          </p>
          <div className="p-3 bg-[#0b141a] rounded-xl border border-[#202c33] font-mono text-[11px] text-slate-400 space-y-1">
            <p className="text-emerald-400">git push origin main</p>
            <p className="text-slate-500">Auto-deploys to Render on every commit</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              2
            </span>
            <h3 className="font-bold text-white text-sm">Render Web Service Configuration</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Render runs the pre-configured build & start scripts automatically:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li><strong className="text-white">Build Command:</strong> <code className="text-emerald-400 font-mono">npm install && npm run build</code></li>
            <li><strong className="text-white">Start Command:</strong> <code className="text-emerald-400 font-mono">npm run start</code> (or <code className="text-emerald-400 font-mono">node server.js</code>)</li>
          </ul>
        </div>

        {/* Step 3 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              3
            </span>
            <h3 className="font-bold text-white text-sm">Environment Variables</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Under the <strong className="text-white">Environment</strong> tab on Render, ensure these keys are present:
          </p>
          <div className="p-3 bg-[#0b141a] rounded-xl border border-[#202c33] font-mono text-xs text-emerald-400 space-y-1">
            <p>PORT = 10000</p>
            <p>NODE_VERSION = 22.23.2</p>
            <p>GEMINI_API_KEY = your_gemini_api_key</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              4
            </span>
            <h3 className="font-bold text-white text-sm">Autonomous 24/7 Operations</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your live instance connects to WhatsApp, manages group pools, publishes advert campaigns, and responds to inquiries 24/7.
          </p>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Multi-Account Ad Pool & Firebase DB Synced</span>
          </div>
        </div>

      </div>

      {/* render.yaml Blueprint Viewer */}
      <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-xs font-mono">render.yaml</h3>
          </div>
          <button
            onClick={copyYaml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-300 text-xs font-mono transition-all border border-[#202c33] cursor-pointer"
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
