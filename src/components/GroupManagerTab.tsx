import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Link as LinkIcon, 
  UserMinus, 
  Shield, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  AlertCircle, 
  Send,
  Sparkles, 
  Info,
  Tag,
  Tags,
  Download,
  Plus,
  Trash2,
  Edit3,
  Filter,
  FileText,
  Share2,
  CheckSquare,
  Square,
  MessageSquare,
  Rocket
} from 'lucide-react';
import { 
  EngineStatusResponse, 
  GroupItem, 
  GroupParticipantInfo,
  ContactItem,
  TagDefinition,
  VcfExportOptions 
} from '../types';

interface GroupManagerTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
  onSelectForCampaign?: (options?: { mode: 'groups' | 'tagged_contacts'; targetGroupJids?: string[]; targetTags?: string[] }) => void;
}

const PRESET_TAG_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Amber / Gold
  '#10b981', // Emerald Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b'  // Slate
];

export const GroupManagerTab: React.FC<GroupManagerTabProps> = ({ 
  statusData, 
  onRefresh,
  onSelectForCampaign 
}) => {
  // Main Navigation Sub-view
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'contacts'>('groups');

  // Groups State
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
    participants: (GroupParticipantInfo & { phone?: string; name?: string; tags?: string[]; notes?: string })[];
    size: number;
    isBotAdmin: boolean;
    announce?: boolean;
    restrict?: boolean;
    tags?: string[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<{ jid: string; link: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Contact Tagging & CRM State
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactJids, setSelectedContactJids] = useState<string[]>([]);
  
  // Tag Creation / Editing Modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_TAG_COLORS[3]);
  const [newTagDesc, setNewTagDesc] = useState('');

  // Participant Tagging Dropdown / Modal
  const [taggingParticipant, setTaggingParticipant] = useState<{ jid: string; phone: string; name?: string; tags: string[] } | null>(null);
  const [bulkTagGroupModal, setBulkTagGroupModal] = useState<{ jid: string; subject: string; count: number } | null>(null);
  const [selectedBulkTag, setSelectedBulkTag] = useState<string>('');

  // Contact Gain (VCF) Modal State
  const [vcfModalGroup, setVcfModalGroup] = useState<{ jid: string; subject: string; count: number } | null>(null);
  const [vcfPrefix, setVcfPrefix] = useState<string>('');
  const [vcfExcludeBot, setVcfExcludeBot] = useState<boolean>(true);
  const [vcfIncludeAdminsOnly, setVcfIncludeAdminsOnly] = useState<boolean>(false);
  const [vcfCustomCaption, setVcfCustomCaption] = useState<string>('');
  const [sendingVcf, setSendingVcf] = useState<boolean>(false);
  const [downloadingVcf, setDownloadingVcf] = useState<boolean>(false);

  // Edit Contact Note/Name Modal
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const isConnected = statusData?.status === 'connected';

  // Fetch Groups
  const fetchGroups = useCallback(async () => {
    if (!isConnected) return;
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
  }, [isConnected]);

  // Fetch Tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.tags) {
        setTags(data.tags);
      }
    } catch (e) {
      console.error('Error loading tags:', e);
    }
  }, []);

  // Fetch Contacts
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (data.contacts) {
        setContacts(data.contacts);
      }
    } catch (e) {
      console.error('Error loading contacts:', e);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchGroups();
      fetchTags();
      fetchContacts();
    }
  }, [isConnected, fetchGroups, fetchTags, fetchContacts]);

  // Fetch Specific Group Details
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

  // Open Contact Gain VCF Modal
  const handleOpenVcfModal = (group: { id: string; subject: string; size?: number; participantsCount?: number }) => {
    const count = group.size || group.participantsCount || 0;
    const cleanSubject = (group.subject || 'Group').slice(0, 14);
    setVcfModalGroup({
      jid: group.id,
      subject: group.subject,
      count
    });
    setVcfPrefix(`[${cleanSubject}] `);
    setVcfExcludeBot(true);
    setVcfIncludeAdminsOnly(false);
    setVcfCustomCaption(
      `📁 *CONTACT GAIN VCF FILE — ${group.subject}*\n\n` +
      `👥 *Total Contacts:* ${count} verified group numbers\n` +
      `⚡ *How to use:* Download & tap this .vcf file to import all members into your phone contacts in 1-click!\n\n` +
      `🚀 *Save all numbers to view each other's WhatsApp status & expand your audience!*`
    );
  };

  // Send VCF directly into WhatsApp Group
  const handleSendVcfToGroup = async () => {
    if (!vcfModalGroup) return;
    setSendingVcf(true);
    try {
      const res = await fetch('/api/contacts/vcf/send-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: vcfModalGroup.jid,
          groupSubject: vcfModalGroup.subject,
          prefix: vcfPrefix,
          customCaption: vcfCustomCaption,
          excludeBot: vcfExcludeBot,
          includeAdminsOnly: vcfIncludeAdminsOnly
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMsg({
          type: 'success',
          text: `✓ Contact Gain VCF file containing ${data.count} contacts sent directly into "${vcfModalGroup.subject}"!`
        });
        setVcfModalGroup(null);
        onRefresh();
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to send VCF file into group.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error sending VCF file.' });
    } finally {
      setSendingVcf(false);
    }
  };

  // Download VCF File locally to browser
  const handleDownloadVcf = async () => {
    if (!vcfModalGroup) return;
    setDownloadingVcf(true);
    try {
      const res = await fetch('/api/contacts/vcf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: vcfModalGroup.jid,
          prefix: vcfPrefix,
          excludeBot: vcfExcludeBot,
          includeAdminsOnly: vcfIncludeAdminsOnly
        })
      });

      const data = await res.json();
      if (res.ok && data.vcfContent) {
        const blob = new Blob([data.vcfContent], { type: 'text/vcard;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', data.fileName || 'group_contacts.vcf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setFeedbackMsg({
          type: 'success',
          text: `✓ Downloaded VCF with ${data.count} contacts! Ready to import into Google/Apple Contacts.`
        });
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to generate VCF content.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error downloading VCF.' });
    } finally {
      setDownloadingVcf(false);
    }
  };

  // Bulk Tag all group participants
  const handleBulkTagGroup = async () => {
    if (!bulkTagGroupModal || !selectedBulkTag) return;
    setActionLoading('bulk_tag');
    try {
      const res = await fetch('/api/contacts/group-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: bulkTagGroupModal.jid,
          groupSubject: bulkTagGroupModal.subject,
          tags: [selectedBulkTag],
          tagParticipants: true
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMsg({
          type: 'success',
          text: `✓ Successfully assigned tag to group and all ${data.participantsTaggedCount} participants!`
        });
        setBulkTagGroupModal(null);
        fetchContacts();
        fetchGroups();
        if (selectedGroup) fetchGroupDetails(selectedGroup.id);
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to bulk tag group.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Single Contact Tag Toggle
  const handleToggleContactTag = async (jid: string, tagId: string) => {
    const contact = contacts.find(c => c.jid === jid);
    const currentTags = contact?.tags || (taggingParticipant?.jid === jid ? taggingParticipant.tags : []);
    const hasTag = currentTags.includes(tagId);
    const newTags = hasTag ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];

    try {
      const res = await fetch('/api/contacts/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jids: [jid],
          replaceTags: newTags
        })
      });
      if (res.ok) {
        // Update local state
        setContacts(prev => prev.map(c => c.jid === jid ? { ...c, tags: newTags } : c));
        if (taggingParticipant && taggingParticipant.jid === jid) {
          setTaggingParticipant({ ...taggingParticipant, tags: newTags });
        }
        if (groupDetails) {
          setGroupDetails({
            ...groupDetails,
            participants: groupDetails.participants.map(p => p.id === jid ? { ...p, tags: newTags } : p)
          });
        }
      }
    } catch (e) {
      console.error('Failed to toggle tag:', e);
    }
  };

  // Create Tag
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          tag: {
            name: newTagName.trim(),
            color: newTagColor,
            description: newTagDesc.trim()
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.tags) {
        setTags(data.tags);
        setNewTagName('');
        setNewTagDesc('');
        setShowTagModal(false);
        setFeedbackMsg({ type: 'success', text: `Tag "${newTagName}" created successfully!` });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message });
    }
  };

  // Delete Tag
  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove the tag from all contacts.`)) return;
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: tagId })
      });
      const data = await res.json();
      if (res.ok && data.tags) {
        setTags(data.tags);
        fetchContacts();
        setFeedbackMsg({ type: 'success', text: `Tag "${tagName}" deleted.` });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message });
    }
  };

  // Participant Promote / Demote / Remove
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

  // Group Admin Setting Toggle
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

  // Invite Code
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

  // Launch Campaign with selected Tag
  const handleLaunchCampaignWithTag = (tagId: string) => {
    if (onSelectForCampaign) {
      onSelectForCampaign({
        mode: 'tagged_contacts',
        targetTags: [tagId]
      });
    }
  };

  // Save Contact Edit
  const handleSaveContactEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      const res = await fetch('/api/contacts/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: editingContact.jid,
          name: editName.trim(),
          notes: editNotes.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.contact) {
        setContacts(prev => prev.map(c => c.jid === editingContact.jid ? data.contact : c));
        setEditingContact(null);
        setFeedbackMsg({ type: 'success', text: 'Contact updated successfully!' });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message });
    }
  };

  // Filtered Groups
  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.subject.toLowerCase().includes(search.toLowerCase()) || g.id.includes(search);
    if (filterMode === 'admin_only') return matchesSearch && g.isBotAdmin;
    if (filterMode === 'member_only') return matchesSearch && !g.isBotAdmin;
    return matchesSearch;
  });

  // Filtered Contacts
  const filteredContacts = contacts.filter(c => {
    const matchesTag = selectedTagFilter === 'all' || c.tags?.includes(selectedTagFilter);
    const q = contactSearch.toLowerCase();
    const matchesSearch = !q || 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q)) ||
      (c.groupNames && c.groupNames.some(gn => gn.toLowerCase().includes(q)));
    return matchesTag && matchesSearch;
  });

  const totalAudienceReach = groups.reduce((acc, g) => acc + (g.size || g.participantsCount || 0), 0);
  const adminGroupsCount = groups.filter(g => g.isBotAdmin).length;

  if (!isConnected) {
    return (
      <div className="p-8 rounded-3xl bg-[#111b21] border border-[#202c33] text-center max-w-xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">WhatsApp Account Not Connected</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Please link your WhatsApp account using the 8-Digit Pairing Code in the <strong>Connect Account</strong> tab first to manage your joined groups, contact tagging, and VCF files.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Joined Groups</p>
            <p className="text-xl font-bold text-white mt-1">{groups.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Bot Admin Groups</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{adminGroupsCount} <span className="text-xs text-slate-500 font-normal">of {groups.length}</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Indexed Contacts</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{contacts.length.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Audience Reach</p>
            <p className="text-xl font-bold text-purple-400 mt-1">{totalAudienceReach.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between bg-[#111b21] p-1.5 rounded-2xl border border-[#202c33]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'groups'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Joined Groups ({groups.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('contacts');
              fetchContacts();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'contacts'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Contact Tagging & CRM ({contacts.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchGroups();
              fetchContacts();
              fetchTags();
            }}
            disabled={loading || loadingContacts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 hover:text-emerald-400 border border-[#202c33] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingContacts ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
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
            className="text-xs text-slate-400 hover:text-white ml-3 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: GROUPS VIEW */}
      {activeSubTab === 'groups' && (
        <div className="p-4 md:p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4 shadow-xl">
          
          {/* Search & Filter Toolbar */}
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
          </div>

          {/* Groups Grid */}
          {loading && groups.length === 0 ? (
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
                  className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-lg"
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

                    <p className="text-[11px] text-slate-500 font-mono line-clamp-1 mb-2">
                      {group.id}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {group.size || group.participantsCount || '–'} members
                      </span>
                      {group.announce && (
                        <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                      {group.tags && group.tags.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-400 text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          <Tag className="w-2.5 h-2.5" /> {group.tags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Group Action Buttons: Contact Gain (VCF) + Manage */}
                  <div className="space-y-2 pt-3 border-t border-[#202c33]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenVcfModal(group)}
                        title="Generate & Send Contact Gain VCF to this group"
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600 hover:to-teal-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Contact Gain (VCF)</span>
                      </button>

                      <button
                        onClick={() => setBulkTagGroupModal({ jid: group.id, subject: group.subject, count: group.size || 0 })}
                        title="Bulk tag all participants in this group"
                        className="p-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-blue-400 hover:text-white border border-[#202c33] transition-all cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleGetInviteCode(group.id)}
                        title="Get Invite Link"
                        className="p-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-slate-400 hover:text-white border border-[#202c33] transition-all cursor-pointer"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenGroup(group)}
                      className="w-full py-2 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-slate-300 hover:text-emerald-400 border border-[#202c33] text-xs font-semibold transition-all text-center cursor-pointer"
                    >
                      Manage & View Members
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CONTACT TAGGING & CRM VIEW */}
      {activeSubTab === 'contacts' && (
        <div className="space-y-6">
          
          {/* Tag Categories Bar & Creator */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tags className="w-4 h-4 text-emerald-400" />
                  Contact Categories & Tag Definitions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Segment your WhatsApp contacts into targeted lists for precise broadcast messaging.
                </p>
              </div>

              <button
                onClick={() => setShowTagModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Tag</span>
              </button>
            </div>

            {/* Tags Pills Filter */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#202c33]">
              <button
                onClick={() => setSelectedTagFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedTagFilter === 'all'
                    ? 'bg-white text-slate-900 shadow'
                    : 'bg-[#0b141a] text-slate-400 hover:text-white border border-[#202c33]'
                }`}
              >
                All Contacts ({contacts.length})
              </button>

              {tags.map(tag => {
                const count = contacts.filter(c => c.tags?.includes(tag.id)).length;
                const isSelected = selectedTagFilter === tag.id;
                return (
                  <div key={tag.id} className="flex items-center">
                    <button
                      onClick={() => setSelectedTagFilter(tag.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'text-white ring-2 shadow-lg'
                          : 'bg-[#0b141a] text-slate-300 hover:text-white border border-[#202c33]'
                      }`}
                      style={{
                        backgroundColor: isSelected ? tag.color : undefined,
                        borderColor: isSelected ? tag.color : undefined,
                        boxShadow: isSelected ? `0 0 12px ${tag.color}66` : undefined
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span>{tag.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contacts Table & Toolbar */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search name, phone, notes, or group..."
                  className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Tagged Broadcast Quick Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selectedTagFilter !== 'all' && (
                  <button
                    onClick={() => handleLaunchCampaignWithTag(selectedTagFilter)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Broadcast to Tagged ({filteredContacts.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contacts Table */}
            {loadingContacts ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <p className="text-xs">Loading tagged contacts database...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Tag className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-sm text-slate-400">No contacts found matching filter.</p>
                <p className="text-xs text-slate-600 mt-1">Open any group to start tagging participants or use Bulk Tag!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0b141a] text-slate-400 uppercase tracking-wider text-[10px] border-b border-[#202c33]">
                    <tr>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Tags & Categories</th>
                      <th className="p-3">Seen In Groups</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202c33]">
                    {filteredContacts.slice(0, 100).map(c => (
                      <tr key={c.jid} className="hover:bg-[#0b141a]/60 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 font-bold text-[10px] flex items-center justify-center">
                              {c.phone.slice(-2)}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{c.name || `+${c.phone}`}</p>
                              <p className="text-[10px] text-slate-500 font-mono">+{c.phone}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {c.tags && c.tags.length > 0 ? (
                              c.tags.map(tId => {
                                const def = tags.find(t => t.id === tId);
                                return (
                                  <span
                                    key={tId}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm flex items-center gap-1"
                                    style={{ backgroundColor: def?.color || '#3b82f6' }}
                                  >
                                    {def?.name || tId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">No tags</span>
                            )}
                            <button
                              onClick={() => setTaggingParticipant({ jid: c.jid, phone: c.phone, name: c.name, tags: c.tags || [] })}
                              className="p-1 rounded bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all text-[10px]"
                              title="Edit tags"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        <td className="p-3 text-slate-400">
                          <p className="line-clamp-1 text-[11px]">
                            {c.groupNames?.join(', ') || 'Direct Contact'}
                          </p>
                        </td>

                        <td className="p-3 text-slate-400">
                          <p className="line-clamp-1 text-[11px] italic">
                            {c.notes || '–'}
                          </p>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setEditingContact(c);
                              setEditName(c.name || '');
                              setEditNotes(c.notes || '');
                            }}
                            className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                            title="Edit Contact Notes & Name"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CONTACT GAIN (.VCF) GENERATOR & GROUP SENDER */}
      {vcfModalGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-emerald-500/30 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#202c33] bg-gradient-to-r from-[#111b21] to-[#0c1f17] flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Contact Gain (VCF) Engine
                  </h3>
                  <p className="text-xs text-slate-300">
                    Group: <span className="font-semibold text-emerald-400">{vcfModalGroup.subject}</span> ({vcfModalGroup.count} members)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVcfModalGroup(null)}
                className="w-8 h-8 rounded-full bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              
              {/* How it works Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> What is Contact Gaining?
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Generates an all-in-one <strong>.VCF (vCard)</strong> file containing every member in this group. Sending it directly into the group allows all participants to tap and save everyone’s contact into their phone in 1-click to view each other’s status!
                </p>
              </div>

              {/* Naming Prefix Option */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Contact Name Prefix
                </label>
                <input
                  type="text"
                  value={vcfPrefix}
                  onChange={(e) => setVcfPrefix(e.target.value)}
                  placeholder="e.g. [Group] or Gain_ "
                  className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Preview in phone contacts: <span className="text-emerald-400 font-mono">{vcfPrefix}Gain 1 (+23480...)</span>
                </p>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#0b141a] border border-[#202c33] cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={vcfExcludeBot}
                    onChange={(e) => setVcfExcludeBot(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Exclude My Bot Number</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#0b141a] border border-[#202c33] cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={vcfIncludeAdminsOnly}
                    onChange={(e) => setVcfIncludeAdminsOnly(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Admins Only</span>
                </label>
              </div>

              {/* WhatsApp Announcement Caption */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Group Message Caption (Accompanies the VCF Document in WhatsApp)
                </label>
                <textarea
                  value={vcfCustomCaption}
                  onChange={(e) => setVcfCustomCaption(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none leading-relaxed"
                />
              </div>

            </div>

            {/* Modal Footer: Action Buttons */}
            <div className="p-4 border-t border-[#202c33] bg-[#0b141a] flex flex-col sm:flex-row items-center gap-2 justify-between">
              <button
                onClick={handleDownloadVcf}
                disabled={downloadingVcf || sendingVcf}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-slate-300 hover:text-white border border-[#202c33] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{downloadingVcf ? 'Generating...' : 'Download .VCF to Device'}</span>
              </button>

              <button
                onClick={handleSendVcfToGroup}
                disabled={sendingVcf || downloadingVcf}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                {sendingVcf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending .VCF into Group...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send .VCF Directly to Group Chat</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: GROUP DETAILS & MEMBER TAGGING MODAL */}
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
              
              {/* Group Quick Actions (VCF + Bulk Tag) */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-[#0b141a] border border-[#202c33]">
                <button
                  onClick={() => handleOpenVcfModal(selectedGroup)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Send Contact Gain (VCF) to Group</span>
                </button>

                <button
                  onClick={() => setBulkTagGroupModal({ jid: selectedGroup.id, subject: selectedGroup.subject, count: groupDetails?.participants?.length || selectedGroup.size || 0 })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Bulk Tag All Members</span>
                </button>
              </div>

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
                  <span>The connected WhatsApp account is a member. Admin permissions are required to modify settings or remove participants.</span>
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

              {/* Participants Section with Custom Tag Badges */}
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
                      .filter(p => p.id.includes(participantSearch) || (p.phone && p.phone.includes(participantSearch)) || (p.name && p.name.toLowerCase().includes(participantSearch.toLowerCase())))
                      .map(p => {
                        const phone = p.phone || p.id.split('@')[0].split(':')[0];
                        const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                        return (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {phone.slice(-2)}
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold text-white">+{phone}</p>
                                  {p.admin && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                                      {p.admin.toUpperCase()}
                                    </span>
                                  )}
                                </div>

                                {/* Participant Tags Badges */}
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {(p.tags || ['member']).map(tId => {
                                    const def = tags.find(t => t.id === tId);
                                    return (
                                      <span
                                        key={tId}
                                        className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-xs"
                                        style={{ backgroundColor: def?.color || '#3b82f6' }}
                                      >
                                        {def?.name || tId}
                                      </span>
                                    );
                                  })}
                                  <button
                                    onClick={() => setTaggingParticipant({ jid: p.id, phone, name: p.name, tags: p.tags || ['member'] })}
                                    className="p-0.5 rounded bg-[#111b21] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 text-[9px]"
                                    title="Edit tags"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {selectedGroup.isBotAdmin && (
                                <>
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
                                </>
                              )}
                            </div>
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

      {/* MODAL 3: PARTICIPANT TAGGING QUICK POPUP */}
      {taggingParticipant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-[#202c33] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-400" />
                Tag Contact (+{taggingParticipant.phone})
              </h4>
              <button
                onClick={() => setTaggingParticipant(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Click tags below to assign or remove categories for this contact:
            </p>

            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const isSelected = taggingParticipant.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleContactTag(taggingParticipant.jid, tag.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'text-white ring-2 ring-white/50 shadow-md'
                        : 'bg-[#0b141a] text-slate-400 border border-[#202c33] hover:text-white'
                    }`}
                    style={{
                      backgroundColor: isSelected ? tag.color : undefined
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span>{tag.name}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#202c33] flex justify-end">
              <button
                onClick={() => setTaggingParticipant(null)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK TAG GROUP MEMBERS */}
      {bulkTagGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-[#202c33] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-400" />
                Bulk Tag All Group Members
              </h4>
              <button
                onClick={() => setBulkTagGroupModal(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Assign a category tag to all participants of <strong>{bulkTagGroupModal.subject}</strong> at once:
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Select Tag:</label>
              <select
                value={selectedBulkTag}
                onChange={(e) => setSelectedBulkTag(e.target.value)}
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose Category Tag --</option>
                {tags.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.description || t.id})</option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-[#202c33] flex items-center justify-end gap-2">
              <button
                onClick={() => setBulkTagGroupModal(null)}
                className="px-3 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-400 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkTagGroup}
                disabled={!selectedBulkTag || actionLoading === 'bulk_tag'}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === 'bulk_tag' ? 'Applying...' : 'Apply Tag to All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE CUSTOM TAG */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateTag} className="bg-[#111b21] border border-[#202c33] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                Create Custom Tag
              </h4>
              <button
                type="button"
                onClick={() => setShowTagModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Tag Name</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g. VIP Buyer, Student, Crypto Lead"
                required
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Badge Color</label>
              <div className="flex items-center gap-2">
                {PRESET_TAG_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      newTagColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Description (Optional)</label>
              <input
                type="text"
                value={newTagDesc}
                onChange={(e) => setNewTagDesc(e.target.value)}
                placeholder="Brief purpose of this segment"
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-[#202c33] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTagModal(false)}
                className="px-3 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-400 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Create Tag
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: EDIT CONTACT NOTES / NAME */}
      {editingContact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveContactEdit} className="bg-[#111b21] border border-[#202c33] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Edit Contact Details
              </h4>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">+{editingContact.phone}</p>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Contact Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full or Display Name"
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Internal Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Interested in bulk order, contacted on Monday"
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-[#202c33] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="px-3 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-400 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
