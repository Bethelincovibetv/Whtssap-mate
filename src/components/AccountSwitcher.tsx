import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Check, 
  ChevronDown, 
  Smartphone, 
  Radio, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LogOut,
  X
} from 'lucide-react';
import { ConnectedAccount } from '../types';

interface AccountSwitcherProps {
  accounts: ConnectedAccount[];
  activeAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onAddAccount: (label: string) => Promise<void>;
  onDisconnectAccount: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
  accounts = [],
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  onDisconnectAccount,
  onRemoveAccount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const connectedCount = accounts.filter(a => a.status === 'connected').length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountLabel.trim()) return;
    setIsCreating(true);
    try {
      await onAddAccount(newAccountLabel.trim());
      setNewAccountLabel('');
      setShowAddModal(false);
      setIsOpen(false);
    } catch (e) {
      console.error('Error adding account:', e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button: Dynamically responsive so it never crowds header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] active:scale-95 border border-[#202c33] text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm group select-none"
        title="Switch WhatsApp Account"
        aria-label="Switch WhatsApp Account"
      >
        <div className="relative shrink-0">
          <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
            {activeAccount?.phone ? activeAccount.phone.slice(-2) : '1'}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#0b141a] ${
            activeAccount?.status === 'connected'
              ? 'bg-emerald-400 animate-pulse'
              : activeAccount?.status === 'connecting'
              ? 'bg-amber-400 animate-ping'
              : 'bg-rose-500'
          }`} />
        </div>

        {/* Account Details: Responsively truncated */}
        <div className="hidden xs:flex flex-col text-left leading-tight min-w-0">
          <span className="truncate max-w-[80px] sm:max-w-[110px] md:max-w-[130px] font-medium text-white text-[11px] sm:text-xs">
            {activeAccount?.phone ? `+${activeAccount.phone}` : activeAccount?.label || 'Account'}
          </span>
          <span className="text-[9px] text-slate-400 hidden sm:flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{connectedCount}</span>
            <span>of {accounts.length} active</span>
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown: Anchored strictly right-0 to prevent covering navigation or overlapping */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-[#111b21] border border-[#202c33] rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-3 space-y-2">
          
          <div className="flex items-center justify-between px-1 py-1 text-xs border-b border-[#202c33]/60 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-WhatsApp Accounts</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
              {connectedCount}/{accounts.length} Online
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {accounts.map((acc) => {
              const isSelected = acc.id === activeAccountId;
              const isConnected = acc.status === 'connected';
              const isConnecting = acc.status === 'connecting';

              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc.id);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/40 shadow-sm'
                      : 'bg-[#0b141a] border-[#202c33] hover:border-slate-700 hover:bg-[#1f2c34]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-[#111b21] border border-[#202c33] flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                        {acc.phone ? acc.phone.slice(-2) : '#'}
                      </div>
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111b21] ${
                        isConnected
                          ? 'bg-emerald-400 animate-pulse'
                          : isConnecting
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-rose-500'
                      }`} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate leading-tight">
                        {acc.label}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 truncate leading-tight mt-0.5">
                        {acc.phone ? `+${acc.phone}` : isConnected ? 'Connected' : isConnecting ? 'Awaiting Scan' : 'Disconnected'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold group-hover:bg-slate-700 transition-colors">
                        Select
                      </span>
                    )}

                    {accounts.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove account "${acc.label}"?`)) {
                            onRemoveAccount(acc.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove Account"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Account Button */}
          <div className="pt-2 border-t border-[#202c33]">
            <button
              onClick={() => {
                setShowAddModal(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Another WhatsApp Account</span>
            </button>
          </div>

        </div>
      )}

      {/* Modal: Add New Account */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-sm bg-[#111b21] border border-[#202c33] rounded-2xl shadow-2xl p-5 text-slate-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202c33] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Add WhatsApp Account</h3>
                <p className="text-[11px] text-slate-400">Connect a secondary line or business SIM</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Name / Label
                </label>
                <input
                  type="text"
                  value={newAccountLabel}
                  onChange={(e) => setNewAccountLabel(e.target.value)}
                  placeholder="e.g. Sales SIM 2, Support Line, Nigeria SIM"
                  className="w-full px-3 py-2 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] text-[11px] text-slate-400 space-y-1">
                <p className="text-slate-300 font-semibold flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Independent Multi-Session
                </p>
                <p>This account will run in its own session. All connected accounts stay online concurrently 24/7.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 text-xs font-semibold border border-[#202c33] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newAccountLabel.trim()}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isCreating ? (
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
    </div>
  );
};
