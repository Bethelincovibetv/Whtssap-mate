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
  Lock,
  Cloud,
  Layers,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const RenderDeployTab: React.FC = () => {
  const [platform, setPlatform] = useState<'render' | 'gcp'>('render');
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedGcpCmd, setCopiedGcpCmd] = useState(false);

  const deployedUrl = 'https://whtssap-mate.onrender.com';
  const deployedDomain = 'whtssap-mate.onrender.com';
  const firebaseProjectId = 'gen-lang-client-0116158889';

  const renderYamlContent = `services:
  - type: web
    name: whtssap-mate
    env: node
    plan: free
    buildCommand: npm install --include=dev && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: NODE_VERSION
        value: 22.23.2
      - key: GEMINI_API_KEY
        sync: false
      - key: DATA_DIR
        value: /tmp/session_auth`;

  const gcpDeployCommand = `gcloud run deploy whtssap-mate \\
  --source . \\
  --platform managed \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --port 8080 \\
  --memory 1Gi`;

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

  const copyGcp = () => {
    navigator.clipboard.writeText(gcpDeployCommand);
    setCopiedGcpCmd(true);
    setTimeout(() => setCopiedGcpCmd(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Platform Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-[#111b21] border border-[#202c33] rounded-2xl w-fit">
        <button
          onClick={() => setPlatform('render')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            platform === 'render' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Render Deployment</span>
        </button>
        <button
          onClick={() => setPlatform('gcp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            platform === 'gcp' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Google Cloud (Cloud Run / App Engine)</span>
        </button>
      </div>

      {/* Live Deployed Domain Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#111b21] to-[#111b21] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Globe2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Production Deployment Center</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {platform === 'render' 
              ? <>Live Render Service: <span className="font-mono text-emerald-400 font-bold">{deployedUrl}</span></>
              : <>Google Cloud Run & App Engine Ready: Pre-configured Dockerfile, app.yaml, and gcp-build hooks.</>
            }
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

      {/* Blank Screen Resolution Notice */}
      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3.5 text-xs text-emerald-200">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-emerald-300 text-sm">Deployment & Blank Screen Fix Applied</p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            1. All build dependencies (TypeScript, Tailwind) moved to <code className="text-emerald-400 font-mono">dependencies</code> so cloud builds with <code className="text-emerald-400 font-mono">NODE_ENV=production</code> never skip them.<br/>
            2. Added <code className="text-emerald-400 font-mono">gcp-build</code> and <code className="text-emerald-400 font-mono">prestart</code> hooks so <code className="text-emerald-400 font-mono">dist/</code> is guaranteed to compile before the engine starts.<br/>
            3. Updated server to automatically compile client assets on boot if <code className="text-emerald-400 font-mono">dist/</code> is ever absent, eliminating blank screens.<br/>
            4. Service Worker upgraded to Network-First navigation with automatic stale cache clearing.
          </p>
        </div>
      </div>

      {platform === 'render' ? (
        <>
          {/* 4 Step Deployment Walkthrough */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Step 1 */}
            <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <h3 className="font-bold text-white text-sm">Push to GitHub</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Commit and push your files to your GitHub repository:
              </p>
              <div className="p-3 bg-[#0b141a] rounded-xl border border-[#202c33] font-mono text-[11px] text-slate-400 space-y-1">
                <p className="text-emerald-400">git add .</p>
                <p className="text-emerald-400">git commit -m "Fix production build and deployment"</p>
                <p className="text-emerald-400">git push origin main</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <h3 className="font-bold text-white text-sm">Render Build Settings</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                In your Render Dashboard Web Service settings:
              </p>
              <ul className="text-xs text-slate-300 space-y-2 list-none">
                <li className="p-2.5 rounded-lg bg-[#0b141a] border border-[#202c33]">
                  <strong className="text-white">Build Command:</strong><br/>
                  <code className="text-emerald-400 font-mono text-[11px]">npm install --include=dev && npm run build</code>
                </li>
                <li className="p-2.5 rounded-lg bg-[#0b141a] border border-[#202c33]">
                  <strong className="text-white">Start Command:</strong><br/>
                  <code className="text-emerald-400 font-mono text-[11px]">npm run start</code>
                </li>
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
                <p>NODE_VERSION = 22.23.2</p>
                <p>PORT = 10000</p>
                <p>DATA_DIR = /tmp/session_auth</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <h3 className="font-bold text-white text-sm">Clear Browser Cache</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If Render previously deployed a blank bundle, perform a hard refresh (<code className="text-emerald-400 font-mono">Ctrl + Shift + R</code> or <code className="text-emerald-400 font-mono">Cmd + Shift + R</code>) to load the freshly compiled bundle.
              </p>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Self-healing preloader and auto-fallback active</span>
              </div>
            </div>

          </div>

          {/* render.yaml Blueprint Viewer */}
          <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-xs font-mono">render.yaml (Automated Blueprint)</h3>
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
        </>
      ) : (
        <>
          {/* Google Cloud Deployment Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Google Cloud Run */}
            <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <Cloud className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Deploy to Google Cloud Run (Recommended)</h3>
                  <p className="text-[11px] text-slate-400">Uses the production-ready Dockerfile with Debian node:22-slim</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                Run this single command from your project root in Google Cloud Shell or local terminal:
              </p>

              <div className="relative">
                <pre className="p-3.5 bg-[#0b141a] rounded-xl border border-[#202c33] font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  {gcpDeployCommand}
                </pre>
                <button
                  onClick={copyGcp}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded bg-[#111b21] hover:bg-[#202c33] text-slate-300 border border-[#202c33] text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                >
                  {copiedGcpCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedGcpCmd ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="space-y-1 text-xs text-slate-400">
                <p>✓ Container port: <code className="text-emerald-400 font-mono">8080</code></p>
                <p>✓ Auto-scales to 0 when idle to minimize costs</p>
                <p>✓ Built with full Vite client & Baileys backend</p>
              </div>
            </div>

            {/* Google App Engine */}
            <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Deploy to Google App Engine</h3>
                  <p className="text-[11px] text-slate-400">Uses the standard app.yaml with Node.js 22 runtime</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Run this command to publish directly with your pre-configured <code className="text-emerald-400 font-mono">app.yaml</code>:
              </p>

              <div className="p-3.5 bg-[#0b141a] rounded-xl border border-[#202c33] font-mono text-[11px] text-emerald-300">
                gcloud app deploy app.yaml
              </div>

              <div className="space-y-1 text-xs text-slate-400">
                <p>✓ Automated build hook: <code className="text-emerald-400 font-mono">npm run gcp-build</code></p>
                <p>✓ Safe writable storage: <code className="text-emerald-400 font-mono">/tmp/session_auth</code></p>
                <p>✓ Automatic HTTPS SSL certificate included</p>
              </div>
            </div>

          </div>
        </>
      )}

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
                Ensure Google Sign-In & Firebase Auth work seamlessly on your live Render or Google Cloud domain.
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
            <li>Click <strong>Add domain</strong>, paste your deployment domain (e.g. <code className="text-emerald-400 font-mono font-bold">{deployedDomain}</code> or your Cloud Run URL), and save!</li>
          </ol>
        </div>
      </div>

    </div>
  );
};
