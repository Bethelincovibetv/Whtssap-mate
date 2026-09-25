import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Check, 
  Key, 
  BrainCircuit, 
  MessageSquare, 
  Briefcase, 
  ShoppingBag, 
  Building, 
  Headphones, 
  Save,
  RotateCcw
} from 'lucide-react';
import { EngineStatusResponse } from '../types';

interface AiResponderTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
}

const PERSONA_TEMPLATES = [
  {
    id: 'sales',
    name: 'Elite Sales Closer',
    icon: Briefcase,
    color: 'emerald',
    prompt: `You are an elite sales consultant for our company.
Your goal is to answer inbound WhatsApp inquiries warmly, explain the key benefits of our solutions, qualify the lead, and encourage them to book a discovery call or place an order.
Rules:
1. Keep replies friendly, concise (under 3-4 sentences), and well-formatted.
2. Use *bold* for emphasis.
3. Always ask a helpful follow-up question to keep the conversation moving forward.`
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store Rep',
    icon: ShoppingBag,
    color: 'blue',
    prompt: `You are the customer care and order specialist for our online store.
Help customers with product specifications, size recommendations, payment methods, delivery timelines, and returns.
Rules:
1. Warm, enthusiastic, and polite tone.
2. Offer to help them complete their purchase directly.
3. Keep replies clear and concise.`
  },
  {
    id: 'realestate',
    name: 'Real Estate & Property',
    icon: Building,
    color: 'amber',
    prompt: `You are a real estate concierge.
Assist clients looking for residential and commercial properties, apartments, and land.
Rules:
1. Inquire about their target budget, preferred location, and timeline.
2. Offer to send a catalog of verified listings and book an inspection.`
  },
  {
    id: 'support',
    name: 'Customer Support 24/7',
    icon: Headphones,
    color: 'purple',
    prompt: `You are a dedicated 24/7 customer support specialist.
Resolve user inquiries, answer FAQs, troubleshoot common issues with empathy and technical accuracy.
Rules:
1. Acknowledge the user's issue with empathy.
2. Give clear step-by-step instructions.
3. If an issue requires human escalation, assure them a senior manager has been notified.`
  }
];

export const AiResponderTab: React.FC<AiResponderTabProps> = ({ statusData }) => {
  const [aiResponder, setAiResponder] = useState(statusData?.aiResponder ?? true);
  const [systemPrompt, setSystemPrompt] = useState(
    statusData?.systemPrompt || PERSONA_TEMPLATES[0].prompt
  );
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // AI Sandbox Playground State
  const [testInput, setTestInput] = useState('Hi! Do you have pricing details for your services?');
  const [testChat, setTestChat] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'user',
      text: 'Hi! Are you available to answer questions about your services?',
      time: '10:42 AM'
    },
    {
      sender: 'ai',
      text: 'Hello! 👋 Yes, absolutely! We are fully operational 24/7. What specific service can I assist you with today?',
      time: '10:42 AM'
    }
  ]);
  const [testLoading, setTestLoading] = useState(false);

  const handleSave = async (enabled = aiResponder) => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiResponder: enabled,
          systemPrompt,
          geminiKey: geminiKey || undefined
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save AI config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim() || testLoading) return;

    const userMsg = testInput.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setTestChat(prev => [...prev, { sender: 'user', text: userMsg, time: timeNow }]);
    setTestInput('');
    setTestLoading(true);

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          systemPrompt
        })
      });

      const data = await res.json();
      const replyText = data.reply || data.error || 'No response generated.';

      setTestChat(prev => [
        ...prev,
        {
          sender: 'ai',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setTestChat(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `[Error] ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Gemini AI Auto-Responder
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-mono">
                Powered by Gemini 3.8 Flash
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Autonomous 24/7 AI representative for 1-on-1 private WhatsApp customer conversations.
            </p>
          </div>
        </div>

        {/* Master AI Toggle */}
        <div className="flex items-center gap-3 bg-[#0b141a] px-4 py-2 rounded-xl border border-[#202c33]">
          <span className="text-xs font-semibold text-slate-300">AI Responder Status:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={aiResponder}
              onChange={(e) => {
                setAiResponder(e.target.checked);
                handleSave(e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* AI System Instructions & Configuration */}
        <div className="lg:col-span-7 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl space-y-5">
          
          {/* Persona Templates */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Select Business Persona Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PERSONA_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = systemPrompt === tmpl.prompt;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSystemPrompt(tmpl.prompt)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-purple-500/10 border-purple-500 text-purple-200 shadow-md shadow-purple-950/40'
                        : 'bg-[#0b141a] border-[#202c33] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">{tmpl.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Prompt Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                <span>AI System Instructions & Business Rules</span>
              </label>
              <button
                type="button"
                onClick={() => setSystemPrompt(PERSONA_TEMPLATES[0].prompt)}
                className="text-[11px] text-slate-400 hover:text-purple-400 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to default</span>
              </button>
            </div>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder="Define who the AI is, what products or pricing it should offer, and how it should close leads..."
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl p-3.5 text-white font-mono text-xs placeholder-slate-600 outline-none transition-all leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              The AI dynamically combines this prompt with the customer's WhatsApp profile name and context.
            </p>
          </div>

          {/* Optional Gemini API Key override */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>Gemini API Key (Optional Override)</span>
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Leave empty to use server GEMINI_API_KEY"
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-white font-mono text-xs placeholder-slate-600 outline-none transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              By default, the server securely reads <code className="text-purple-400 font-mono">process.env.GEMINI_API_KEY</code>.
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : savedSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{savedSuccess ? 'Settings Saved Successfully!' : 'Save AI Instructions'}</span>
          </button>
        </div>

        {/* Live AI Sandbox Simulator */}
        <div className="lg:col-span-5 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">AI Sandbox Simulator</h3>
              </div>
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                Interactive Test
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Test how your AI replies to simulated WhatsApp customer inquiries in real time.
            </p>

            {/* Chat Box Mockup */}
            <div className="bg-[#0b141a] rounded-2xl border border-[#202c33] p-4 h-[320px] overflow-y-auto space-y-3 font-sans text-xs">
              {testChat.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-[#005c4b] text-white rounded-br-none'
                        : 'bg-[#202c33] text-slate-100 rounded-bl-none border border-slate-700/50'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-emerald-300/80 mb-0.5">
                      {msg.sender === 'user' ? 'Customer' : 'Gemini AI Rep'}
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-[9px] text-slate-400 text-right mt-1">{msg.time}</p>
                  </div>
                </div>
              ))}

              {testLoading && (
                <div className="flex items-start">
                  <div className="bg-[#202c33] rounded-2xl rounded-bl-none p-3 border border-slate-700/50 text-slate-400 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                    <span>AI is typing response...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Input Form */}
          <form onSubmit={handleSendTestMessage} className="mt-4 flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type a test customer message..."
              disabled={testLoading}
              className="flex-1 bg-[#0b141a] border border-[#202c33] focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all placeholder-slate-600 font-sans"
            />
            <button
              type="submit"
              disabled={testLoading || !testInput.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
