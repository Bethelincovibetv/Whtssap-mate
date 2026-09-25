import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  Send, 
  Code2, 
  Terminal, 
  Globe, 
  ShieldCheck, 
  Layers, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Zap,
  Webhook
} from 'lucide-react';
import { ApiKeyItem, EngineStatusResponse } from '../types';

interface ApiKeysTabProps {
  statusData: EngineStatusResponse | null;
}

export const ApiKeysTab: React.FC<ApiKeysTabProps> = ({ statusData }) => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  
  // Test Playground State
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [testEndpoint, setTestEndpoint] = useState<'send-message' | 'status' | 'groups'>('send-message');
  const [testPhone, setTestPhone] = useState('2348012345678');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message sent via the WhatsApp Growth Engine REST API 🚀');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState('');

  // Code sample tab
  const [codeLang, setCodeLang] = useState<'curl' | 'js' | 'python' | 'php'>('curl');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.onrender.com';

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        if (data.keys?.length > 0 && !selectedKey) {
          setSelectedKey(data.keys[0].key);
        }
      }
    } catch (e) {
      console.error('Failed to fetch API keys:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWebhookConfig = async () => {
    try {
      const res = await fetch('/api/webhook/config');
      if (res.ok) {
        const data = await res.json();
        setWebhookUrl(data.url || '');
        setWebhookSecret(data.secret || '');
        setWebhookEnabled(data.enabled ?? false);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchKeys();
    fetchWebhookConfig();
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(prev => [data.key, ...prev]);
        setSelectedKey(data.key.key);
        setNewKeyName('');
        // Make the new key visible temporarily
        setVisibleKeys(prev => ({ ...prev, [data.key.id]: true }));
      }
    } catch (e) {
      console.error('Generate key error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke and delete this API key? Any application using it will lose access.')) return;
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
        if (selectedKey === keys.find(k => k.id === id)?.key) {
          const remaining = keys.filter(k => k.id !== id);
          setSelectedKey(remaining[0]?.key || '');
        }
      }
    } catch (e) {
      console.error('Delete key error:', e);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRunTest = async () => {
    if (!selectedKey) {
      alert('Please generate or select an API key first.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const startTime = performance.now();

    try {
      let url = '';
      let method = 'GET';
      let body: any = undefined;

      if (testEndpoint === 'send-message') {
        url = '/api/v1/messages/send';
        method = 'POST';
        body = JSON.stringify({
          to: testPhone.trim(),
          message: testMessage
        });
      } else if (testEndpoint === 'status') {
        url = '/api/v1/status';
        method = 'GET';
      } else if (testEndpoint === 'groups') {
        url = '/api/v1/groups';
        method = 'GET';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'x-api-key': selectedKey,
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body
      });

      const responseTime = Math.round(performance.now() - startTime);
      const data = await res.json();

      setTestResult({
        status: res.status,
        statusText: res.statusText,
        timeMs: responseTime,
        data
      });
    } catch (e: any) {
      setTestResult({
        status: 500,
        statusText: 'Network / Client Error',
        timeMs: Math.round(performance.now() - startTime),
        data: { error: e.message }
      });
    } finally {
      setIsTesting(false);
      // Refresh key stats to show request count increase
      fetchKeys();
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    setWebhookMessage('');
    try {
      const res = await fetch('/api/webhook/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl.trim(),
          secret: webhookSecret.trim(),
          enabled: webhookEnabled
        })
      });
      if (res.ok) {
        setWebhookMessage('Webhook configuration saved successfully!');
        setTimeout(() => setWebhookMessage(''), 3000);
      }
    } catch (e: any) {
      setWebhookMessage('Failed to save webhook: ' + e.message);
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const activeKeyToken = selectedKey || (keys[0]?.key ?? 'wge_live_YOUR_API_KEY');

  const getCodeSnippet = () => {
    if (codeLang === 'curl') {
      return `# 1. Send WhatsApp Text Message via cURL
curl -X POST "${origin}/api/v1/messages/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeKeyToken}" \\
  -d '{
    "to": "${testPhone}",
    "message": "Hello from my app! 🚀"
  }'

# 2. Check WhatsApp Connection Status
curl "${origin}/api/v1/status" \\
  -H "x-api-key: ${activeKeyToken}"`;
    }

    if (codeLang === 'js') {
      return `// Node.js (Fetch) / Next.js / Express Integration
async function sendWhatsAppMessage(recipientPhone, messageText) {
  const response = await fetch('${origin}/api/v1/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${activeKeyToken}'
    },
    body: JSON.stringify({
      to: recipientPhone,
      message: messageText
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to dispatch message');
  }
  return data;
}

// Example Execution
sendWhatsAppMessage('${testPhone}', 'Order confirmed! Invoice #4892 is ready.')
  .then(res => console.log('Message delivered:', res.messageId))
  .catch(err => console.error('API Error:', err));`;
    }

    if (codeLang === 'python') {
      return `# Python 3 Integration using requests
import requests

API_KEY = "${activeKeyToken}"
API_URL = "${origin}/api/v1/messages/send"

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

payload = {
    "to": "${testPhone}",
    "message": "Hello from Python! Your verification code is 849102."
}

response = requests.post(API_URL, json=payload, headers=headers)
data = response.json()

if response.status_code == 200:
    print("Success! WhatsApp Message ID:", data.get("messageId"))
else:
    print("Error:", data.get("error"))`;
    }

    if (codeLang === 'php') {
      return `<?php
// PHP cURL WhatsApp API Client
$apiKey = '${activeKeyToken}';
$url = '${origin}/api/v1/messages/send';

$payload = [
    'to' => '${testPhone}',
    'message' => 'Thank you for your purchase! Tracking link: https://example.com/track'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);
if ($httpCode === 200) {
    echo "Message sent successfully! ID: " . $result['messageId'];
} else {
    echo "Failed: " . ($result['error'] ?? 'Unknown error');
}
?>`;
    }

    return '';
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111b21] via-[#0b141a] to-[#128C7E]/20 border border-[#202c33] p-6 lg:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <KeyRound className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              Developer REST API v1
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Connect External Apps, Websites & CRMs
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Generate secure API keys to send automated WhatsApp messages, dispatch group notifications, trigger broadcasts, and receive webhooks directly from your external software, mobile apps, e-commerce stores, or SaaS tools.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Token Protected</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-blue-400">
              <Zap className="w-4 h-4" />
              <span>Sub-second Latency</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-purple-400">
              <Layers className="w-4 h-4" />
              <span>Standard JSON / REST</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Key Management + Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: API Key Generator Card */}
        <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Generate New API Key</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Create an authentication key for an external website, mobile app backend, or Zapier/n8n workflow.
            </p>

            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Application / Service Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Next.js Store, Mobile App Backend"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33]/80 space-y-2 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300">Included Permissions:</p>
                <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                  <span className="flex items-center gap-1 text-emerald-400">✓ Send Messages</span>
                  <span className="flex items-center gap-1 text-emerald-400">✓ Send Media</span>
                  <span className="flex items-center gap-1 text-emerald-400">✓ Read Groups</span>
                  <span className="flex items-center gap-1 text-emerald-400">✓ Engine Status</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !newKeyName.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Key...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Create Live API Key</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-[#202c33] text-[11px] text-slate-400">
            Keys are passed in HTTP headers as <code className="text-emerald-400 font-mono">x-api-key: YOUR_KEY</code> or <code className="text-emerald-400 font-mono">Bearer YOUR_KEY</code>.
          </div>
        </div>

        {/* Right Column: Existing API Keys List (2 cols) */}
        <div className="lg:col-span-2 bg-[#111b21] border border-[#202c33] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Active API Keys</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {keys.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage and monitor tokens authorized to access this WhatsApp engine.</p>
            </div>

            <button
              onClick={fetchKeys}
              className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-white border border-[#202c33] transition-colors"
              title="Refresh Keys"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {keys.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-[#202c33] rounded-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">No API Keys Generated Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Generate your first API key on the left to start integrating this WhatsApp account into external websites and software.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {keys.map((k) => {
                const isVisible = visibleKeys[k.id];
                const displayKey = isVisible ? k.key : `${k.key.slice(0, 10)}••••••••••••••••${k.key.slice(-4)}`;
                const isSelected = selectedKey === k.key;

                return (
                  <div
                    key={k.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#14232c] border-emerald-500/50 shadow-md'
                        : 'bg-[#0b141a] border-[#202c33] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{k.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-mono font-bold">
                          {k.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedKey(k.key)}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Use in Tester'}
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                          title="Revoke / Delete Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Key Bar */}
                    <div className="flex items-center gap-2 bg-[#111b21] p-2 rounded-lg border border-[#202c33] font-mono text-xs">
                      <span className="flex-1 truncate text-slate-300 select-all">{displayKey}</span>
                      
                      <button
                        onClick={() => toggleKeyVisibility(k.id)}
                        className="text-slate-400 hover:text-slate-200 p-1"
                        title={isVisible ? 'Hide Key' : 'Reveal Key'}
                      >
                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                      </button>

                      <button
                        onClick={() => handleCopy(k.key, k.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#0b141a] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-[#202c33] text-[11px] font-sans font-medium transition-all"
                      >
                        {copiedId === k.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
                      <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                      <span className="font-mono text-slate-300 font-medium">
                        Requests: <span className="text-emerald-400 font-bold">{k.requestCount || 0}</span>
                      </span>
                      <span>Last Used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleTimeString() : 'Never'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Interactive API Tester & Code Integration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Interactive API Playground */}
        <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live API Explorer & Tester</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Test In-Browser</span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Execute live REST requests using your selected API key to verify WhatsApp dispatch in real-time.
            </p>

            <div className="space-y-3.5">
              {/* Endpoint selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select REST Endpoint
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestEndpoint('send-message')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      testEndpoint === 'send-message'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : 'bg-[#0b141a] text-slate-400 border-[#202c33] hover:text-slate-200'
                    }`}
                  >
                    POST /messages/send
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestEndpoint('status')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      testEndpoint === 'status'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : 'bg-[#0b141a] text-slate-400 border-[#202c33] hover:text-slate-200'
                    }`}
                  >
                    GET /status
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestEndpoint('groups')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      testEndpoint === 'groups'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : 'bg-[#0b141a] text-slate-400 border-[#202c33] hover:text-slate-200'
                    }`}
                  >
                    GET /groups
                  </button>
                </div>
              </div>

              {testEndpoint === 'send-message' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Recipient WhatsApp Phone (with Country Code)
                    </label>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g. 2348012345678"
                      className="w-full px-3 py-2 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Message Payload (supports emojis & text)
                    </label>
                    <textarea
                      rows={3}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleRunTest}
                disabled={isTesting || !selectedKey}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Request via REST API</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test Response Output */}
          {testResult && (
            <div className="mt-4 pt-4 border-t border-[#202c33]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  {testResult.status >= 200 && testResult.status < 300 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>HTTP {testResult.status} {testResult.statusText}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">{testResult.timeMs}ms</span>
              </div>
              <pre className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-40">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Code Snippets Integration Hub */}
        <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Code Integration Snippets</h3>
              </div>
              <button
                onClick={() => handleCopy(getCodeSnippet(), 'code-snippet')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-300 hover:text-white border border-[#202c33] text-xs font-semibold transition-all cursor-pointer"
              >
                {copiedId === 'code-snippet' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Copy-paste ready-to-run snippets directly into your backend code or client application.
            </p>

            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-[#0b141a] p-1 rounded-xl border border-[#202c33] mb-3">
              {(['curl', 'js', 'python', 'php'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCodeLang(lang)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    codeLang === lang
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang === 'js' ? 'Node.js / JS' : lang === 'python' ? 'Python' : 'PHP'}
                </button>
              ))}
            </div>

            {/* Code Block */}
            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs font-mono text-slate-200 overflow-x-auto max-h-[300px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                <code>{getCodeSnippet()}</code>
              </pre>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#202c33] flex items-center justify-between text-[11px] text-slate-400">
            <span>Server Base URL: <code className="text-emerald-400 font-mono">{origin}</code></span>
            <span className="text-emerald-400">RESTful v1</span>
          </div>
        </div>

      </div>

      {/* Webhook Configuration Section */}
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Webhook className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Incoming Webhooks (Optional)</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 max-w-2xl">
          Forward incoming WhatsApp direct messages and status updates to your external server URL in real-time.
        </p>

        <form onSubmit={handleSaveWebhook} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Webhook URL Endpoint (HTTP POST)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourapp.com/api/webhooks/whatsapp"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Webhook Secret Header (Optional Token Verification)
              </label>
              <input
                type="text"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_xxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookEnabled}
                onChange={(e) => setWebhookEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-[#0b141a]"
              />
              <span className="text-xs font-semibold text-slate-300">Enable Real-Time Inbound Webhooks</span>
            </label>

            <button
              type="submit"
              disabled={isSavingWebhook}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-emerald-950/40 disabled:opacity-50"
            >
              {isSavingWebhook ? 'Saving...' : 'Save Webhook Settings'}
            </button>
          </div>

          {webhookMessage && (
            <p className="text-xs text-emerald-400 font-medium">{webhookMessage}</p>
          )}
        </form>
      </div>

      {/* REST API Reference Cheat-Sheet */}
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Complete REST API Endpoints Reference</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#202c33] text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Endpoint</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Required Headers / Body</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202c33] text-slate-300 font-mono">
              <tr>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">POST</td>
                <td className="py-2.5 px-3 text-white">/api/v1/messages/send</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans">Send WhatsApp text message to any phone or group</td>
                <td className="py-2.5 px-3 text-slate-400">{`{ "to": "234...", "message": "..." }`}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">POST</td>
                <td className="py-2.5 px-3 text-white">/api/v1/messages/send-media</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans">Send image/media with optional caption</td>
                <td className="py-2.5 px-3 text-slate-400">{`{ "to": "...", "mediaUrl": "https://...", "caption": "..." }`}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-400 font-bold">GET</td>
                <td className="py-2.5 px-3 text-white">/api/v1/status</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans">Check connection status, active number & uptime</td>
                <td className="py-2.5 px-3 text-slate-400">Header: x-api-key</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-400 font-bold">GET</td>
                <td className="py-2.5 px-3 text-white">/api/v1/groups</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans">Retrieve all joined groups with IDs & member counts</td>
                <td className="py-2.5 px-3 text-slate-400">Header: x-api-key</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">POST</td>
                <td className="py-2.5 px-3 text-white">/api/v1/groups/send</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans">Send message to a specific group JID</td>
                <td className="py-2.5 px-3 text-slate-400">{`{ "groupId": "1203...@g.us", "message": "..." }`}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-400 font-bold">GET</td>
                <td className="py-2.5 px-3 text-white">/api/v1/stats</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans">Live counters for views, reacts, replies & broadcasts</td>
                <td className="py-2.5 px-3 text-slate-400">Header: x-api-key</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
