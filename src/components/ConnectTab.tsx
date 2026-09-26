import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle,
  Sparkles,
  Zap,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Search,
  Globe,
  Phone,
  Users,
  Plus,
  Trash2,
  LogOut,
  X
} from 'lucide-react';
import { EngineStatusResponse, ConnectedAccount } from '../types';
import { COUNTRIES, DEFAULT_COUNTRY, Country } from '../data/countries';

interface ConnectTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
  onSelectAccount?: (id: string) => void;
  onAddAccount?: (label: string) => Promise<void>;
  onDisconnectAccount?: (id: string) => void;
  onRemoveAccount?: (id: string) => void;
}

export const ConnectTab: React.FC<ConnectTabProps> = ({ 
  statusData, 
  onRefresh,
  onSelectAccount,
  onAddAccount,
  onDisconnectAccount,
  onRemoveAccount
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showQrFallback, setShowQrFallback] = useState(false);

  // Multi-Account Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const accounts = statusData?.accounts || [];
  const activeAccountId = statusData?.activeAccountId || accounts[0]?.id || 'acc_primary';
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  const isConnected = activeAccount ? activeAccount.status === 'connected' : statusData?.status === 'connected';
  const isConnecting = activeAccount ? activeAccount.status === 'connecting' : statusData?.status === 'connecting';
  const connectedCount = accounts.filter(a => a.status === 'connected').length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered countries
  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.dialCode.includes(q) || 
      c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  // Compute the clean international number
  const fullInternationalNumber = useMemo(() => {
    const rawInput = phoneNumber.replace(/[^0-9]/g, '');
    if (!rawInput) return '';

    const dialDigits = selectedCountry.dialCode.replace('+', '');
    if (rawInput.startsWith(dialDigits)) {
      return rawInput;
    }

    const strippedLocal = rawInput.replace(/^0+/, '');
    return dialDigits + strippedLocal;
  }, [phoneNumber, selectedCountry]);

  // Handle phone input change with auto-detection for paste
  const handlePhoneChange = (val: string) => {
    const cleaned = val.trim();
    if (cleaned.startsWith('+')) {
      const match = COUNTRIES.find(c => cleaned.startsWith(c.dialCode));
      if (match) {
        setSelectedCountry(match);
        setPhoneNumber(cleaned.slice(match.dialCode.length));
        return;
      }
    }
    setPhoneNumber(val);
  };

  const handleRequestPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPairingCode(null);

    const targetNumber = fullInternationalNumber;
    if (!targetNumber || targetNumber.length < 8 || targetNumber.length > 16) {
      setErrorMsg('Please enter a valid phone number (minimum 8 digits).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: targetNumber,
          accountId: activeAccountId
        })
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setPairingCode(data.code);
        onRefresh();
      } else {
        setErrorMsg(data.error || 'Failed to generate pairing code. If session is stuck, click "Reset Session" below.');
      }
    } catch (err: any) {
      setErrorMsg('Network error connecting to backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!confirm(`This will clear temporary authentication files for ${activeAccount?.label || 'this account'} and restart cleanly. Continue?`)) return;
    setResetting(true);
    setErrorMsg(null);
    setPairingCode(null);
    try {
      const res = await fetch('/api/reset-session', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: activeAccountId })
      });
      if (res.ok) {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3500);
        onRefresh();
      }
    } catch (e: any) {
      setErrorMsg('Reset failed: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace('-', ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountLabel.trim() || !onAddAccount) return;
    setIsCreatingAccount(true);
    try {
      await onAddAccount(newAccountLabel.trim());
      setNewAccountLabel('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg('Failed to create account: ' + err.message);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Multi-Account Hub: Connected Accounts Overview */}
      <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#202c33]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Connected WhatsApp Accounts</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                  {connectedCount} of {accounts.length} Online 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage multiple phone numbers and business lines simultaneously. Each line maintains its own 24/7 background session.
              </p>
            </div>
          </div>

          {onAddAccount && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Another Account</span>
            </button>
          )}
        </div>

        {/* Account Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-4">
          {accounts.map((acc) => {
            const isSelected = acc.id === activeAccountId;
            const isAccConnected = acc.status === 'connected';
            const isAccConnecting = acc.status === 'connecting';

            return (
              <div
                key={acc.id}
                onClick={() => onSelectAccount && onSelectAccount(acc.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-950/40 via-[#111b21] to-[#111b21] border-emerald-500/50 shadow-md shadow-emerald-950/50'
                    : 'bg-[#0b141a]/60 border-[#202c33] hover:border-slate-700 hover:bg-[#0b141a]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#111b21] border border-[#202c33] flex items-center justify-center text-xs font-bold text-slate-200">
                        {acc.phone ? acc.phone.slice(-2) : '#'}
                      </div>
                      <span className="text-xs font-bold text-white truncate max-w-[130px]">
                        {acc.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isSelected ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 group-hover:text-slate-200">
                          Click to Manage
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-mono font-bold text-slate-100 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        isAccConnected 
                          ? 'bg-emerald-400 animate-pulse' 
                          : isAccConnecting 
                          ? 'bg-amber-400 animate-ping' 
                          : 'bg-rose-500'
                      }`} />
                      <span>{acc.phone ? `+${acc.phone}` : 'Unpaired Account'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isAccConnected 
                        ? `Connected (${acc.name || 'Live'}) • Auto-Responder Online` 
                        : isAccConnecting 
                        ? 'Pairing Code / QR generated' 
                        : 'Ready to pair with phone number'}
                    </p>
                  </div>
                </div>

                {/* Account Card Bottom Actions */}
                <div className="pt-2 border-t border-[#202c33]/60 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-500 font-mono">
                    {acc.stats ? `${acc.stats.statusesViewed} views • ${acc.stats.reactionsSent} reacts` : 'Multi-Auth'}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAccConnected && onDisconnectAccount && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Disconnect account "${acc.label}"?`)) {
                            onDisconnectAccount(acc.id);
                          }
                        }}
                        className="p-1 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-semibold border border-rose-500/20 transition-colors"
                        title="Disconnect session"
                      >
                        Disconnect
                      </button>
                    )}

                    {accounts.length > 1 && onRemoveAccount && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete account "${acc.label}" completely?`)) {
                            onRemoveAccount(acc.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Connected State Banner */}
      {isConnected && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-transparent border border-emerald-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                WhatsApp Linked & Active ({activeAccount?.label})
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">Live Online</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Connected as <strong className="text-emerald-400 font-mono font-bold">+{activeAccount?.phone || statusData?.phone}</strong> ({activeAccount?.name || 'Primary WhatsApp'}).
                Auto-viewing, auto-reacting, and AI responses are live.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Connection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Mode 1: 8-Digit Pairing Code (Primary) */}
        <div className="lg:col-span-7 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 lg:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Link with Phone Number</h2>
                  <p className="text-[11px] text-slate-400">
                    Pairing Target: <strong className="text-emerald-400">{activeAccount?.label || 'Account 1'}</strong>
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Recommended
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Select your country and enter your WhatsApp phone number to generate an official 8-digit pairing code for <span className="text-emerald-400 font-bold">{activeAccount?.label}</span>. <span className="text-emerald-400 font-medium">No camera or second screen needed.</span>
            </p>

            <form onSubmit={handleRequestPairing} className="space-y-4">
              
              {/* WhatsApp-Style Country & Phone Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Country & Enter Phone Number
                </label>

                {/* Country Selector Dropdown Button */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    disabled={isConnected || loading}
                    className="w-full bg-[#0b141a] hover:bg-[#152026] border border-[#202c33] focus:border-emerald-500 rounded-xl px-4 py-3 flex items-center justify-between text-left transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none">{selectedCountry.flag}</span>
                      <span className="text-white text-sm font-medium">{selectedCountry.name}</span>
                      <span className="text-slate-400 text-xs font-mono font-semibold">({selectedCountry.dialCode})</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${countryDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                  </button>

                  {/* Searchable Country Modal Dropdown */}
                  {countryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#111b21] border border-[#202c33] rounded-2xl shadow-2xl overflow-hidden max-h-72 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                      
                      {/* Search Bar */}
                      <div className="p-3 border-b border-[#202c33] bg-[#0b141a]">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search country or code (e.g. Nigeria, +234, US)..."
                            autoFocus
                            className="w-full bg-[#111b21] border border-[#202c33] focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Countries List */}
                      <div className="overflow-y-auto divide-y divide-[#202c33]/40">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((c) => {
                            const isSelected = selectedCountry.code === c.code;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setCountryDropdownOpen(false);
                                  setCountrySearch('');
                                }}
                                className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#1a2730] transition-colors cursor-pointer ${isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-200'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{c.flag}</span>
                                  <span className="text-xs font-medium">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-semibold text-slate-400">{c.dialCode}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No countries found matching "{countrySearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dial Code & Phone Number Input Fields */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-[#0b141a] border border-[#202c33] rounded-xl px-3.5 py-3.5 text-emerald-400 font-mono text-sm font-bold flex items-center gap-1.5 shrink-0 select-none">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.dialCode}</span>
                  </div>

                  <div className="relative flex-1">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={selectedCountry.code === 'NG' ? 'e.g. 704 353 7401 or 0803 123 4567' : 'e.g. 555 123 4567'}
                      disabled={isConnected || loading}
                      className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3.5 text-white font-mono text-sm placeholder-slate-600 outline-none transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Formatted Number Live Indicator */}
                {fullInternationalNumber && (
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ready to link: <strong>+{fullInternationalNumber}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Notification */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Pairing Error</p>
                    <p className="mt-0.5 text-rose-300/90">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Reset Session Success Banner */}
              {resetSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Session storage cleared. Engine restarted fresh for {activeAccount?.label}!</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isConnected || !fullInternationalNumber}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting Baileys Socket...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Official 8-Digit Pairing Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Live Pairing Code Output Display */}
            {(pairingCode || activeAccount?.pairingCode) && (
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-[#0b141a] border-2 border-emerald-500/60 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Your WhatsApp Pairing Code</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Expires in ~60s</span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-[#0b141a] border border-emerald-500/40 p-4 rounded-xl">
                  <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-emerald-300 select-all">
                    {pairingCode || activeAccount?.pairingCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 bg-[#0b141a]/60 p-3 rounded-xl border border-[#202c33]">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>📱 How to enter code on WhatsApp:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed pl-1">
                    <li>Open <strong>WhatsApp</strong> on your phone</li>
                    <li>Tap <strong>Settings</strong> (iOS) or <strong>Three Dots</strong> (Android) &gt; <strong>Linked Devices</strong></li>
                    <li>Tap <strong>Link a Device</strong></li>
                    <li>Tap <strong>Link with phone number instead</strong> at the bottom</li>
                    <li>Enter the 8-digit code shown above</li>
                  </ol>
                </div>
              </div>
            )}

          </div>

          {/* Bottom Actions: Reset Session */}
          <div className="mt-6 pt-4 border-t border-[#202c33] flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px]">Stuck or need a clean start?</span>
            <button
              type="button"
              onClick={handleResetSession}
              disabled={resetting}
              className="text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Restarting socket...' : 'Reset Session'}</span>
            </button>
          </div>
        </div>

        {/* Mode 2: QR Scanner (Fallback) */}
        <div className="lg:col-span-5 bg-[#111b21] rounded-2xl border border-[#202c33] p-6 lg:p-7 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Scan QR Code</h2>
                  <p className="text-[11px] text-slate-400">Camera pairing fallback for {activeAccount?.label}</p>
                </div>
              </div>
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                title="Refresh QR Code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              WhatsApp &gt; Linked Devices &gt; Point phone camera at this QR code.
            </p>

            {/* QR Box */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#0b141a] rounded-2xl border border-[#202c33] min-h-[240px]">
              {(activeAccount?.qr || statusData?.qr) ? (
                <div className="text-center space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-2 border-emerald-500/40">
                    <img
                      src={activeAccount?.qr || statusData?.qr || ''}
                      alt="WhatsApp QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Live QR Code Active ({activeAccount?.label})</span>
                  </p>
                </div>
              ) : isConnected ? (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">Session Active</p>
                  <p className="text-xs text-slate-400">Account <strong>{activeAccount?.label}</strong> is linked & online.</p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {isConnecting ? 'Generating fresh QR code...' : 'Waiting for connection or phone pairing...'}
                  </p>
                  <button
                    onClick={onRefresh}
                    className="px-3 py-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-xs text-emerald-400 font-medium transition-all cursor-pointer"
                  >
                    Check Status
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#202c33] flex items-center justify-between text-[11px] text-slate-400">
            <span>Session Auth: <code className="text-emerald-400">./session_auth/{activeAccountId}</code></span>
            <span className="text-[10px] text-slate-500">Multi-Session</span>
          </div>
        </div>

      </div>

      {/* Modal: Add New Account */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-sm bg-[#111b21] border border-[#202c33] rounded-2xl shadow-2xl p-5 text-slate-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202c33] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Connect Another Account</h3>
                <p className="text-[11px] text-slate-400">Independent WhatsApp line & session</p>
              </div>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Name / Label
                </label>
                <input
                  type="text"
                  value={newAccountLabel}
                  onChange={(e) => setNewAccountLabel(e.target.value)}
                  placeholder="e.g. Sales SIM 2, Support Line, Nigeria SIM"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] text-[11px] text-slate-400 space-y-1">
                <p className="text-slate-300 font-semibold flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Independent Multi-Session
                </p>
                <p>This account will run concurrently in the background with its own keepalive loop, auto-responder, and campaigns.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 text-xs font-semibold border border-[#202c33] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAccount || !newAccountLabel.trim()}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isCreatingAccount ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Proceed to Pair</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#111b21] border border-[#202c33] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            👁️
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Auto Story Viewer</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automatically view every contact story in the background. Stay top-of-mind with your entire contact list.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111b21] border border-[#202c33] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            🔥
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Smart Emoji Reactions</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automatically react with chosen emojis (🔥, 👏, ❤️, 🚀) to engage contacts naturally.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111b21] border border-[#202c33] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            🤖
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Gemini AI Auto-Reply</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              24/7 autonomous sales rep answering questions and booking leads in direct messages.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
