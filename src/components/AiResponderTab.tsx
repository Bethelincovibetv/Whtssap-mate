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
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { EngineStatusResponse, FallbackRule } from '../types';

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

export const AiResponderTab: React.FC<AiResponderTabProps> = ({ statusData, onRefresh }) => {
  const [aiResponder, setAiResponder] = useState(statusData?.aiResponder ?? true);
  const [aiTriggerMode, setAiTriggerMode] = useState<'all' | 'keywords_only'>(
    statusData?.aiTriggerMode ?? 'all'
  );
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>(
    statusData?.triggerKeywords ?? ['price', 'info', 'buy', 'order', 'help', 'services', 'hi', 'hello']
  );
  const [newKeyword, setNewKeyword] = useState('');
  
  const [systemPrompt, setSystemPrompt] = useState(
    statusData?.systemPrompt || PERSONA_TEMPLATES[0].prompt
  );
  const [geminiKey, setGeminiKey] = useState('');
  const [typingDelaySeconds, setTypingDelaySeconds] = useState(
    statusData?.typingDelaySeconds ?? 2
  );

  // Fallback Rule-Based Auto-Responses
  const [fallbackRules, setFallbackRules] = useState<FallbackRule[]>(
    statusData?.fallbackRules ?? [
      {
        id: 'rule_1',
        keywords: ['price', 'pricing', 'cost', 'fee'],
        reply: 'Hello! 👋 Our standard plans start from $19/mo. Check our full package options here: https://example.com/pricing',
        enabled: true
      },
      {
        id: 'rule_2',
        keywords: ['support', 'help', 'issue', 'problem'],
        reply: 'Hi there! 🛠️ Our team is ready to assist. Please describe the issue in detail and an agent will follow up right away.',
        enabled: true
      },
      {
        id: 'rule_3',
        keywords: ['hours', 'location', 'address'],
        reply: '📍 We are open Monday–Friday from 9:00 AM to 6:00 PM. You can also reach us anytime right here on WhatsApp!',
        enabled: true
      }
    ]
  );
  const [newRuleKeywords, setNewRuleKeywords] = useState('');
  const [newRuleReply, setNewRuleReply] = useState('');

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
          aiTriggerMode,
          triggerKeywords,
          systemPrompt,
          geminiKey: geminiKey || undefined,
          typingDelaySeconds,
          fallbackRules
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        onRefresh();
      }
    } catch (e) {
      console.error('Error saving AI config:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    const clean = newKeyword.trim().toLowerCase();
    if (clean && !triggerKeywords.includes(clean)) {
      setTriggerKeywords([...triggerKeywords, clean]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setTriggerKeywords(triggerKeywords.filter(k => k !== keyword));
  };

  const handleAddFallbackRule = () => {
    if (!newRuleKeywords.trim() || !newRuleReply.trim()) return;
    const keywords = newRuleKeywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

    const newRule: FallbackRule = {
      id: 'rule_' + Date.now(),
      keywords,
      reply: newRuleReply.trim(),
      enabled: true
    };

    setFallbackRules([...fallbackRules, newRule]);
    setNewRuleKeywords('');
    setNewRuleReply('');
  };

  const handleRemoveFallbackRule = (id: string) => {
    setFallbackRules(fallbackRules.filter(r => r.id !== id));
  };

  const handleSendTestMessage = async () => {
    if (!testInput.trim()) return;

    const userMsg = testInput;
    setTestInput('');
    setTestChat(prev => [
      ...prev,
      {
        sender: 'user',
        text: userMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

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
      const reply = data.reply || "Sorry, I couldn't generate a response. Please check your Gemini API key.";

      setTestChat(prev => [
        ...prev,
        {
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e) {
      setTestChat(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Error contacting AI backend simulation.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Master Toggle Banner */}
      <div className="p-6 rounded-3xl bg-[#111b21] border border-[#202c33] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
            aiResponder
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5'
              : 'bg-slate-800/60 text-slate-500 border-slate-700'
          }`}>
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Gemini AI Auto-Responder & Inbound Manager
              {aiResponder && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LIVE & ACTIVE
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatically replies to direct 1-on-1 customer messages with realistic typing indicator simulations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const nextState = !aiResponder;
              setAiResponder(nextState);
              handleSave(nextState);
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
              aiResponder
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {aiResponder ? 'Enabled (Turn Off)' : 'Disabled (Turn On)'}
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: AI Instructions, Triggers & Rules */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Preset Persona Quick Select */}
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              1. Business Persona Presets
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PERSONA_TEMPLATES.map((item) => {
                const Icon = item.icon;
                const isSelected = systemPrompt === item.prompt;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSystemPrompt(item.prompt)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-[#0b141a] border-[#202c33] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold">{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                System Prompt & Persona Instructions
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none font-mono"
                placeholder="Describe how the AI should answer customer inquiries..."
              />
            </div>
          </div>

          {/* Inbound Trigger Filter Modes */}
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              2. Inbound Trigger Filtering
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setAiTriggerMode('all')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  aiTriggerMode === 'all'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white'
                    : 'bg-[#0b141a] border-[#202c33] text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">All Direct Messages</span>
                  {aiTriggerMode === 'all' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Respond to any incoming customer DM automatically (excluding group chats).
                </p>
              </button>

              <button
                onClick={() => setAiTriggerMode('keywords_only')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  aiTriggerMode === 'keywords_only'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white'
                    : 'bg-[#0b141a] border-[#202c33] text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Keyword Trigger Only</span>
                  {aiTriggerMode === 'keywords_only' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Only trigger auto-response when the incoming message matches specific keywords.
                </p>
              </button>
            </div>

            {aiTriggerMode === 'keywords_only' && (
              <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Active Trigger Keywords
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {triggerKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111b21] border border-[#202c33] text-xs font-mono text-emerald-400"
                    >
                      {kw}
                      <button
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-slate-500 hover:text-rose-400 ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="Add keyword (e.g. quote, book, catalog)..."
                    className="flex-1 bg-[#111b21] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none"
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fallback Rule-Based Responses */}
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              3. Fallback Instant Rule Responses (Works Even Without API Key)
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {fallbackRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {rule.keywords.map(kw => (
                        <span key={kw} className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{rule.reply}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFallbackRule(rule.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Rule */}
            <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-2">
              <input
                type="text"
                value={newRuleKeywords}
                onChange={(e) => setNewRuleKeywords(e.target.value)}
                placeholder="Trigger keywords (comma separated, e.g: address, location, find)"
                className="w-full bg-[#111b21] border border-[#202c33] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none"
              />
              <textarea
                value={newRuleReply}
                onChange={(e) => setNewRuleReply(e.target.value)}
                rows={2}
                placeholder="Instant response text..."
                className="w-full bg-[#111b21] border border-[#202c33] rounded-lg p-2 text-xs text-white placeholder-slate-600 outline-none"
              />
              <button
                onClick={handleAddFallbackRule}
                disabled={!newRuleKeywords.trim() || !newRuleReply.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Fallback Rule
              </button>
            </div>
          </div>

          {/* Typing Presence Simulator & API Key */}
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              4. Human Typing Presence & Model Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Typing Indicator Duration ({typingDelaySeconds}s)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={typingDelaySeconds}
                  onChange={(e) => setTypingDelaySeconds(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Shows "typing..." in WhatsApp for realistic human behavior.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Custom Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Leave empty to use GEMINI_API_KEY env"
                  className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2 border-t border-[#202c33]">
              {savedSuccess ? (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Settings Saved & Synced!
                </span>
              ) : (
                <span className="text-xs text-slate-500">Auto-applies to live WhatsApp socket</span>
              )}

              <button
                onClick={() => handleSave(aiResponder)}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: AI Live Testing Sandbox */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between pb-4 border-b border-[#202c33] mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">Interactive AI Simulator</h4>
              </div>
              <button
                onClick={() => setTestChat([])}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>

            {/* Chat Bubble Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              {testChat.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-[#005c4b] text-white rounded-br-xs'
                        : 'bg-[#202c33] text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
              {testLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#202c33] max-w-[70%] px-3.5 py-2.5 rounded-2xl rounded-bl-xs animate-pulse">
                  <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
                  Generating Gemini reply...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="pt-2 border-t border-[#202c33] flex items-center gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                placeholder="Test customer message..."
                className="flex-1 bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
              <button
                onClick={handleSendTestMessage}
                disabled={testLoading || !testInput.trim()}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
