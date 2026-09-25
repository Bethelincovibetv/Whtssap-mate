import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Link as LinkIcon, 
  UserPlus, 
  UserMinus, 
  Shield, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  Send,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { EngineStatusResponse, GroupItem, GroupParticipantInfo } from '../types';

interface GroupManagerTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
  onSelectForCampaign?: (groupJids: string[]) => void;
}

export const GroupManagerTab: React.FC<GroupManagerTabProps> = ({ 
  statusData, 
  onRefresh,
  onSelectForCampaign 
}) => {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'admin_only' | 'member_only'>('all');
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [groupDetails, setGroupDetails] = useState<{
    id: string;
    subject: string;
    owner?: string;
    desc?: string;
    participants: GroupParticipantInfo[];
    size: number;
    isBotAdmin: boolean;
    announce?: boolean;
    restrict?: boolean;
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<{ jid: string; link: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    if (statusData?.status !== 'connected') return;
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
      }
    } catch (err: any) {
      console.error('Failed to load groups:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to fetch WhatsApp groups: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [statusData?.status]);

  useEffect(() => {
    if (statusData?.status === 'connected') {
      fetchGroups();
    }
  }, [statusData?.status, fetchGroups]);

  const fetchGroupDetails = async (jid: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(jid)}`);
      const data = await res.json();
      if (data.group) {
        setGroupDetails(data.group);
      }
    } catch (err: any) {
      console.error('Failed to load group details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenGroup = (group: GroupItem) => {
    setSelectedGroup(group);
    setGroupDetails(null);
    setParticipantSearch('');
    setInviteLink(null);
    fetchGroupDetails(group.id);
  };

  const handleParticipantAction = async (targetJid: string, action: 'promote' | 'demote' | 'remove') => {
    if (!selectedGroup) return;
    const actionNames = { promote: 'promote to admin', demote: 'demote from admin', remove: 'remove participant' };
    if (!confirm(`Are you sure you want to ${actionNames[action]} (${targetJid.split('@')[0]})?`)) return;

    setActionLoading(`${targetJid}_${action}`);
    try {
      const res = await fetch('/api/groups/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: selectedGroup.id,
          targetJid,
          action
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMsg({ type: 'success', text: `Action "${action}" applied successfully!` });
        await fetchGroupDetails(selectedGroup.id);
        fetchGroups();
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || `Failed to ${action} user. Ensure bot has admin permissions.` });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleGroupSetting = async (setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked') => {
    if (!selectedGroup) return;
    setActionLoading(`setting_${setting}`);
    try {
      const res = await fetch('/api/groups/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: selectedGroup.id,
          setting
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMsg({ type: 'success', text: `Group setting changed to ${setting}` });
        await fetchGroupDetails(selectedGroup.id);
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to update setting.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGetInviteCode = async (jid: string) => {
    setActionLoading('invite_' + jid);
    try {
      const res = await fetch('/api/groups/invite-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid })
      });
      const data = await res.json();
      if (data.link) {
        setInviteLink({ jid, link: data.link });
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Could not fetch invite link. Bot must be an admin.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.subject.toLowerCase().includes(search.toLowerCase()) || g.id.includes(search);
    if (filterMode === 'admin_only') return matchesSearch && g.isBotAdmin;
    if (filterMode === 'member_only') return matchesSearch && !g.isBotAdmin;
    return matchesSearch;
  });

  const totalAudienceReach = groups.reduce((acc, g) => acc + (g.size || g.participantsCount || 0), 0);
  const adminGroupsCount = groups.filter(g => g.isBotAdmin).length;

  if (statusData?.status !== 'connected') {
    return (
      <div className="p-8 rounded-3xl bg-[#111b21] border border-[#202c33] text-center max-w-xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">WhatsApp Account Not Connected</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Please link your WhatsApp account using the 8-Digit Pairing Code in the <strong>Connect Account</strong> tab first to manage your joined groups and communities.
        </p>
        <button
          onClick={onRefresh}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg cursor-pointer"
        >
          Check Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Joined Groups</p>
            <p className="text-2xl font-bold text-white mt-1">{groups.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Bot Admin Privileges</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{adminGroupsCount} <span className="text-xs text-slate-500 font-normal">of {groups.length}</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Audience Reach</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{totalAudienceReach.toLocaleString()} <span className="text-xs text-slate-500 font-normal">Members</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button 
            onClick={() => setFeedbackMsg(null)}
            className="text-xs text-slate-400 hover:text-white ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Group List & Actions Toolbar */}
      <div className="p-4 md:p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groups by name or JID..."
                className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm text-white placeholder-slate-600 outline-none"
              />
            </div>

            <div className="flex items-center bg-[#0b141a] p-1 rounded-xl border border-[#202c33]">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterMode === 'all'
                    ? 'bg-[#202c33] text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({groups.length})
              </button>
              <button
                onClick={() => setFilterMode('admin_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterMode === 'admin_only'
                    ? 'bg-[#202c33] text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admin ({adminGroupsCount})
              </button>
              <button
                onClick={() => setFilterMode('member_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterMode === 'member_only'
                    ? 'bg-[#202c33] text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Member ({groups.length - adminGroupsCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchGroups}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 hover:text-emerald-400 border border-[#202c33] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              Refresh Groups
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
            <p className="text-sm">Fetching all participating WhatsApp groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-sm">No WhatsApp groups found matching criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredGroups.map(group => (
              <div
                key={group.id}
                className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-emerald-400 transition-colors">
                      {group.subject}
                    </h4>
                    {group.isBotAdmin ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                        Member
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono line-clamp-1 mb-3">
                    {group.id}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {group.size || group.participantsCount || '–'} members
                    </span>
                    {group.announce && (
                      <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                        <Lock className="w-3 h-3" /> Announcements
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#202c33]">
                  <button
                    onClick={() => handleOpenGroup(group)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#111b21] hover:bg-emerald-600 hover:text-white text-emerald-400 border border-[#202c33] text-xs font-semibold transition-all text-center cursor-pointer"
                  >
                    Manage & Members
                  </button>
                  <button
                    onClick={() => handleGetInviteCode(group.id)}
                    title="Get Invite Link"
                    className="p-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-slate-400 hover:text-white border border-[#202c33] transition-all cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Detail & Participants Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-[#202c33] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#202c33] flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white">{selectedGroup.subject}</h3>
                  {selectedGroup.isBotAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      BOT IS ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">{selectedGroup.id}</p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="w-8 h-8 rounded-full bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Group Quick Settings */}
              {selectedGroup.isBotAdmin ? (
                <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-3">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Group Admin Controls</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleToggleGroupSetting(groupDetails?.announce ? 'not_announcement' : 'announcement')}
                      disabled={!!actionLoading}
                      className="p-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-left transition-all text-xs cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">Message Permissions</span>
                        {groupDetails?.announce ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {groupDetails?.announce ? 'Only Admins can send messages (Locked)' : 'All participants can send messages (Open)'}
                      </p>
                    </button>

                    <button
                      onClick={() => handleToggleGroupSetting(groupDetails?.restrict ? 'unlocked' : 'locked')}
                      disabled={!!actionLoading}
                      className="p-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-left transition-all text-xs cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">Edit Group Info</span>
                        {groupDetails?.restrict ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {groupDetails?.restrict ? 'Only Admins can edit info (Locked)' : 'All members can edit info'}
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>The connected WhatsApp account is a member, not an admin in this group. Admin permissions are required to modify settings or participants.</span>
                </div>
              )}

              {/* Invite Link Card */}
              {inviteLink && (
                <div className="p-4 rounded-2xl bg-[#0b141a] border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="truncate flex-1">
                    <p className="text-xs font-semibold text-emerald-400 mb-1">Group Invite Link:</p>
                    <p className="text-xs text-slate-300 font-mono truncate">{inviteLink.link}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(inviteLink.link)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Participants Section */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Participants ({groupDetails?.participants?.length || selectedGroup.size || 0})
                  </h4>
                  <div className="relative w-48">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      placeholder="Filter number..."
                      className="w-full bg-[#0b141a] border border-[#202c33] rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs">Loading member list from WhatsApp...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(groupDetails?.participants || [])
                      .filter(p => p.id.includes(participantSearch))
                      .map(p => {
                        const phone = p.id.split('@')[0];
                        const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                        return (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
                                {phone.slice(-2)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white">+{phone}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {p.admin ? `${p.admin.toUpperCase()}` : 'Participant'}
                                </p>
                              </div>
                            </div>

                            {selectedGroup.isBotAdmin && (
                              <div className="flex items-center gap-1.5">
                                {!isAdmin ? (
                                  <button
                                    onClick={() => handleParticipantAction(p.id, 'promote')}
                                    disabled={!!actionLoading}
                                    title="Promote to Admin"
                                    className="p-1.5 rounded-lg bg-[#111b21] hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 border border-[#202c33] transition-all text-xs cursor-pointer"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleParticipantAction(p.id, 'demote')}
                                    disabled={!!actionLoading}
                                    title="Demote to Member"
                                    className="p-1.5 rounded-lg bg-[#111b21] hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 border border-[#202c33] transition-all text-xs cursor-pointer"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleParticipantAction(p.id, 'remove')}
                                  disabled={!!actionLoading}
                                  title="Remove Member"
                                  className="p-1.5 rounded-lg bg-[#111b21] hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-[#202c33] transition-all text-xs cursor-pointer"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#202c33] bg-[#0b141a] flex items-center justify-between">
              <button
                onClick={() => handleGetInviteCode(selectedGroup.id)}
                disabled={!selectedGroup.isBotAdmin || !!actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-slate-300 text-xs font-semibold border border-[#202c33] transition-all disabled:opacity-40 cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                Generate Group Invite Link
              </button>

              <button
                onClick={() => setSelectedGroup(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
