import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Rocket, 
  ShieldCheck, 
  Layers, 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Shuffle, 
  Image as ImageIcon, 
  CheckSquare, 
  Square as SquareIcon, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  Check, 
  Users, 
  Activity,
  Send,
  Sliders,
  Eye,
  Info,
  Tag,
  Tags,
  UserCheck,
  Upload,
  Trash2,
  Globe2,
  Flame,
  CheckCircle2,
  XCircle,
  Clock4,
  Percent,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  EngineStatusResponse, 
  GroupItem, 
  CampaignProgress,
  TagDefinition,
  ContactItem 
} from '../types';

interface CampaignTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
  preloadOptions?: {
    mode?: 'groups' | 'tagged_contacts';
    targetGroupJids?: string[];
    targetTags?: string[];
  } | null;
}

export const CampaignTab: React.FC<CampaignTabProps> = ({ 
  statusData, 
  onRefresh,
  preloadOptions 
}) => {
  // Campaign Mode: Target Groups vs Target Categorized Contacts by Tag
  const [campaignMode, setCampaignMode] = useState<'groups' | 'tagged_contacts'>('groups');

  // Groups State
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupJids, setSelectedGroupJids] = useState<string[]>([]);
  const [searchGroup, setSearchGroup] = useState('');

  // Tagged Contacts State
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadingTagsAndContacts, setLoadingTagsAndContacts] = useState(false);
  
  // Message & Spintax State
  const [templateText, setTemplateText] = useState(
    '{Hello|Hi|Greetings} {name|friend}! 🚀\n\n{Exciting news|Check out our latest update|Special announcement for you}: We have launched our automated broadcast campaign.\n\n{Let us know if you have questions!|Reply directly anytime!|Reach out for exclusive details!}'
  );
  const [imageUrl, setImageUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [spintaxSamples, setSpintaxSamples] = useState<string[]>([]);
  const [loadingSpintax, setLoadingSpintax] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Anti-Ban Safeguards Settings
  const [minDelaySec, setMinDelaySec] = useState(15);
  const [maxDelaySec, setMaxDelaySec] = useState(35);
  const [batchSize, setBatchSize] = useState(10);
  const [batchPauseMinutes, setBatchPauseMinutes] = useState(3);

  // Campaign State
  const [campaign, setCampaign] = useState<CampaignProgress | null>(statusData?.campaign || null);
  const [startingCampaign, setStartingCampaign] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Apply Preload Options from Group Manager if passed
  useEffect(() => {
    if (preloadOptions) {
      if (preloadOptions.mode) setCampaignMode(preloadOptions.mode);
      if (preloadOptions.targetGroupJids && preloadOptions.targetGroupJids.length > 0) {
        setSelectedGroupJids(preloadOptions.targetGroupJids);
      }
      if (preloadOptions.targetTags && preloadOptions.targetTags.length > 0) {
        setSelectedTags(preloadOptions.targetTags);
      }
    }
  }, [preloadOptions]);

  // Sync campaign state from statusData
  useEffect(() => {
    if (statusData?.campaign) {
      setCampaign(statusData.campaign);
    }
  }, [statusData?.campaign]);

  const fetchGroups = useCallback(async () => {
    if (statusData?.status !== 'connected') return;
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
      }
    } catch (e) {
      console.error('Failed to fetch groups', e);
    } finally {
      setLoadingGroups(false);
    }
  }, [statusData?.status]);

  const fetchTagsAndContacts = useCallback(async () => {
    if (statusData?.status !== 'connected') return;
    setLoadingTagsAndContacts(true);
    try {
      const [tagsRes, contactsRes] = await Promise.all([
        fetch('/api/tags'),
        fetch('/api/contacts')
      ]);
      const tagsData = await tagsRes.json();
      const contactsData = await contactsRes.json();
      if (tagsData.tags) setTags(tagsData.tags);
      if (contactsData.contacts) setContacts(contactsData.contacts);
    } catch (e) {
      console.error('Failed to fetch tags/contacts', e);
    } finally {
      setLoadingTagsAndContacts(false);
    }
  }, [statusData?.status]);

  useEffect(() => {
    if (statusData?.status === 'connected') {
      fetchGroups();
      fetchTagsAndContacts();
    }
  }, [statusData?.status, fetchGroups, fetchTagsAndContacts]);

  const toggleGroupSelection = (jid: string) => {
    setSelectedGroupJids(prev => 
      prev.includes(jid) ? prev.filter(id => id !== jid) : [...prev, jid]
    );
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSelectAllGroups = () => {
    if (selectedGroupJids.length === filteredGroups.length) {
      setSelectedGroupJids([]);
    } else {
      setSelectedGroupJids(filteredGroups.map(g => g.id));
    }
  };

  // Select all open & manageable groups for automated distribution
  const handleSelectAllOpenGroups = () => {
    const openGroups = groups.filter(g => !g.announce || g.isBotAdmin).map(g => g.id);
    setSelectedGroupJids(openGroups);
  };

  const handleSelectAllTags = () => {
    if (selectedTags.length === tags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(tags.map(t => t.id));
    }
  };

  // Direct Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 8MB. Please select a smaller image.');
      return;
    }

    setImageFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageUrl('');
    setImageFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateSpintaxPreview = async () => {
    setLoadingSpintax(true);
    try {
      const res = await fetch('/api/campaigns/spintax-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateText, samplesCount: 3 })
      });
      const data = await res.json();
      if (data.samples) {
        setSpintaxSamples(data.samples);
      }
    } catch (e) {
      console.error('Spintax preview error', e);
    } finally {
      setLoadingSpintax(false);
    }
  };

  const insertVariable = (variable: string) => {
    setTemplateText(prev => prev + variable);
  };

  // Calculate resolved target contact count for selected tags
  const matchedTaggedContacts = contacts.filter(c => 
    c.tags?.some(t => selectedTags.includes(t))
  );

  const handleStartCampaign = async () => {
    if (campaignMode === 'groups' && selectedGroupJids.length === 0) {
      setErrorMsg('Please select at least 1 WhatsApp group to launch campaign.');
      return;
    }
    if (campaignMode === 'tagged_contacts' && selectedTags.length === 0) {
      setErrorMsg('Please select at least 1 category tag to launch targeted broadcast.');
      return;
    }
    if (campaignMode === 'tagged_contacts' && matchedTaggedContacts.length === 0) {
      setErrorMsg('No contacts found matching the selected tags. Tag contacts in Group Manager first.');
      return;
    }
    if (!templateText && !imageUrl) {
      setErrorMsg('Please enter message text or attach an image.');
      return;
    }

    setErrorMsg(null);
    setStartingCampaign(true);

    try {
      const payload = {
        targetMode: campaignMode,
        targetGroupJids: campaignMode === 'groups' ? selectedGroupJids : [],
        targetTags: campaignMode === 'tagged_contacts' ? selectedTags : [],
        templateText,
        imageUrl,
        minDelaySec,
        maxDelaySec,
        batchSize,
        batchPauseMinutes
      };

      const res = await fetch('/api/campaigns/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCampaign(data.campaign);
        onRefresh();
      } else {
        setErrorMsg(data.error || 'Failed to start campaign.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error launching campaign.');
    } finally {
      setStartingCampaign(false);
    }
  };

  const handleCampaignAction = async (action: 'pause' | 'resume' | 'cancel') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.campaign) {
        setCampaign(data.campaign);
      }
      onRefresh();
    } catch (err) {
      console.error(`Error on campaign ${action}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredGroups = groups.filter(g => 
    g.subject.toLowerCase().includes(searchGroup.toLowerCase()) || g.id.includes(searchGroup)
  );

  const isCampaignActive = campaign && (campaign.status === 'running' || campaign.status === 'batch_pausing' || campaign.status === 'paused');
  const progressPercent = campaign && campaign.totalGroups > 0
    ? Math.round((campaign.sentCount / campaign.totalGroups) * 100)
    : 0;

  // Compute Summary Metrics for Recharts Widget
  const totalCampaignTarget = campaign?.totalGroups || (campaignMode === 'groups' ? selectedGroupJids.length : matchedTaggedContacts.length) || 0;
  const successfulSends = campaign?.sentCount || (statusData?.stats?.campaignMessagesSent || 0);
  const failedSends = campaign?.failedCount || 0;
  const pendingSends = campaign 
    ? Math.max(0, campaign.totalGroups - (campaign.sentCount + campaign.failedCount))
    : (totalCampaignTarget > 0 ? totalCampaignTarget : 0);

  const totalAttempted = successfulSends + failedSends;
  const successRate = totalAttempted > 0 
    ? Math.round((successfulSends / totalAttempted) * 100)
    : (successfulSends > 0 ? 100 : 100);

  // Pie Chart Distribution Data
  const hasData = successfulSends > 0 || failedSends > 0 || pendingSends > 0;
  const pieChartData = hasData
    ? [
        { name: 'Successful', value: successfulSends, color: '#10b981' },
        { name: 'Pending Queue', value: pendingSends, color: '#f59e0b' },
        { name: 'Failed', value: failedSends, color: '#f43f5e' }
      ].filter(d => d.value > 0)
    : [{ name: 'Ready', value: 1, color: '#1f2937' }];

  // Bar Chart Comparison Data
  const barChartData = [
    { name: 'Sent', count: successfulSends, fill: '#10b981' },
    { name: 'Pending', count: pendingSends, fill: '#f59e0b' },
    { name: 'Failed', count: failedSends, fill: '#f43f5e' }
  ];

  if (statusData?.status !== 'connected') {
    return (
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111b21] border border-[#202c33] text-center max-w-xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Connect WhatsApp To Launch Campaigns</h3>
        <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
          Link your WhatsApp number using the 8-Digit Pairing Code to broadcast multi-group messages with randomized anti-ban pacing and image attachments.
        </p>
        <button
          onClick={onRefresh}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg cursor-pointer"
        >
          Check Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      
      {/* 📊 RECHARTS SUMMARY STATS WIDGET AT THE TOP */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#111b21] border border-[#202c33] shadow-2xl space-y-5">
        
        {/* Widget Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#202c33]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Campaign Performance & Delivery Analytics
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Real-time delivery verification, success rates, queue status, and dropped packets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#0b141a] text-slate-300 border border-[#202c33] text-[11px] font-mono flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isCampaignActive ? 'Campaign Live' : 'Engine Idle'}</span>
            </span>
          </div>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Success Rate Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Success Rate</span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                {totalAttempted > 0 ? `${successRate}%` : '100%'}
              </span>
              <span className="text-[10px] text-slate-500">reliability</span>
            </div>
            <div className="mt-2 w-full bg-[#111b21] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalAttempted > 0 ? successRate : 100}%` }}
              />
            </div>
          </div>

          {/* Successful Sent Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Delivered (Sent)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {successfulSends}
              </span>
              <span className="text-[10px] text-emerald-400">verified</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Dispatched to recipient chats</p>
          </div>

          {/* Pending Queue Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Pending in Queue</span>
              <Clock4 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">
                {pendingSends}
              </span>
              <span className="text-[10px] text-slate-500">awaiting</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Paced with anti-ban delay</p>
          </div>

          {/* Failed Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Failed / Blocked</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-extrabold font-mono ${failedSends > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {failedSends}
              </span>
              <span className="text-[10px] text-slate-500">errors</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Restricted or closed groups</p>
          </div>

        </div>

        {/* Charts Row using Recharts */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
          
          {/* Donut Chart: Breakdown */}
          <div className="md:col-span-5 p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-300">Delivery Status Ratio</h4>
              <span className="text-[10px] text-slate-500 font-mono">Recharts Donut</span>
            </div>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#111b21',
                      borderColor: '#202c33',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie
                    data={pieChartData}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={hasData ? 4 : 0}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0b141a" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Overlay Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-bold text-white font-mono">{successfulSends}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Sent</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex items-center justify-around text-[10px] pt-2 border-t border-[#202c33]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-300 font-semibold">{successfulSends} Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-300 font-semibold">{pendingSends} Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-300 font-semibold">{failedSends} Failed</span>
              </div>
            </div>
          </div>

          {/* Bar Chart: Target vs Sent vs Pending */}
          <div className="md:col-span-7 p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-300">Message Volume Breakdown</h4>
              <span className="text-[10px] text-emerald-400 font-mono">{totalAttempted + pendingSends} Total In Scope</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#202c33" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    axisLine={{ stroke: '#202c33' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 10 }} 
                    axisLine={{ stroke: '#202c33' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      backgroundColor: '#111b21',
                      borderColor: '#202c33',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-[#202c33]">
              <span>Real-time Baileys delivery telemetry</span>
              <span className="font-mono text-emerald-400">Anti-Ban Pacing Active</span>
            </div>
          </div>

        </div>

      </div>
      
      {/* Live Campaign Status Banner if Active */}
      {isCampaignActive && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#111b21] to-[#0c1f17] border border-emerald-500/40 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    campaign.status === 'running' ? 'bg-emerald-400' : campaign.status === 'batch_pausing' ? 'bg-amber-400' : 'bg-slate-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    campaign.status === 'running' ? 'bg-emerald-500' : campaign.status === 'batch_pausing' ? 'bg-amber-500' : 'bg-slate-500'
                  }`}></span>
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {campaign.status === 'running' && 'Active Broadcast Campaign in Progress'}
                  {campaign.status === 'batch_pausing' && 'Anti-Ban Batch Pause Active (Resting)'}
                  {campaign.status === 'paused' && 'Campaign Paused'}
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Processed <span className="font-bold text-emerald-400">{campaign.sentCount}</span> of <span className="font-bold text-white">{campaign.totalGroups}</span> recipients ({progressPercent}%) • {campaign.failedCount} failed
              </p>
            </div>

            {/* Campaign Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {campaign.status === 'running' ? (
                <button
                  onClick={() => handleCampaignAction('pause')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              ) : campaign.status === 'paused' ? (
                <button
                  onClick={() => handleCampaignAction('resume')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              ) : null}

              <button
                onClick={() => handleCampaignAction('cancel')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" /> Stop / Cancel
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#0b141a] rounded-full h-3 p-0.5 border border-[#202c33] overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono flex-wrap gap-1">
              <span>Target: {campaign.currentGroupJid ? campaign.currentGroupJid.split('@')[0] : '–'}</span>
              {campaign.status === 'batch_pausing' ? (
                <span className="text-amber-400 font-bold">
                  Batch Pause: {Math.floor(campaign.batchPauseRemainingSec / 60)}m {campaign.batchPauseRemainingSec % 60}s remaining
                </span>
              ) : campaign.nextSendInSec > 0 ? (
                <span className="text-emerald-400 font-bold">
                  Next send in {campaign.nextSendInSec}s (Anti-Ban Pacing)
                </span>
              ) : (
                <span>Sending...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Mode Selection Tabs */}
      <div className="p-1.5 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col sm:flex-row items-center gap-2">
        <button
          onClick={() => setCampaignMode('groups')}
          className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
            campaignMode === 'groups'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Multi-Group Broadcast ({selectedGroupJids.length} Selected)</span>
        </button>

        <button
          onClick={() => setCampaignMode('tagged_contacts')}
          className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
            campaignMode === 'tagged_contacts'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Tag-Targeted Broadcast ({matchedTaggedContacts.length} Matched)</span>
        </button>
      </div>

      {/* Main Campaign Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Target Selector (Groups vs Tags) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col space-y-4 shadow-xl">
          
          {/* MODE A: GROUPS SELECTOR */}
          {campaignMode === 'groups' && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  1. Select Target Groups ({selectedGroupJids.length})
                </h4>
                <button
                  onClick={fetchGroups}
                  className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                  title="Refresh groups list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingGroups ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={handleSelectAllOpenGroups}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 transition-all cursor-pointer"
                >
                  ⚡ All Open Groups ({groups.filter(g => !g.announce || g.isBotAdmin).length})
                </button>

                <button
                  onClick={handleSelectAllGroups}
                  className="px-2.5 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-slate-300 transition-all cursor-pointer"
                >
                  {selectedGroupJids.length === filteredGroups.length && filteredGroups.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <input
                type="text"
                value={searchGroup}
                onChange={(e) => setSearchGroup(e.target.value)}
                placeholder="Search groups..."
                className="w-full bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500"
              />

              {/* Group Checklist */}
              <div className="flex-1 max-h-96 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {loadingGroups && groups.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading WhatsApp groups...
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No groups found.
                  </div>
                ) : (
                  filteredGroups.map(group => {
                    const isSelected = selectedGroupJids.includes(group.id);
                    return (
                      <div
                        key={group.id}
                        onClick={() => toggleGroupSelection(group.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow'
                            : 'bg-[#0b141a] border-[#202c33] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate min-w-0">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate">{group.subject}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">{group.id.split('@')[0]}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {group.announce && !group.isBotAdmin ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              Admin Only
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                              Open
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {group.size || group.participantsCount || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* MODE B: TAGGED CONTACTS SELECTOR */}
          {campaignMode === 'tagged_contacts' && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <Tags className="w-4 h-4 text-emerald-400" />
                  1. Target Categories ({selectedTags.length} Selected)
                </h4>
                <button
                  onClick={fetchTagsAndContacts}
                  className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                  title="Refresh tags"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTagsAndContacts ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">
                  Audience: {matchedTaggedContacts.length} Contacts
                </span>
                <button
                  onClick={handleSelectAllTags}
                  className="px-2.5 py-1 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-slate-300 transition-all cursor-pointer"
                >
                  {selectedTags.length === tags.length && tags.length > 0 ? 'Deselect All' : 'Select All Tags'}
                </button>
              </div>

              {/* Tag Selector Cards */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                {tags.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  const count = contacts.filter(c => c.tags?.includes(tag.id)).length;
                  return (
                    <div
                      key={tag.id}
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-white/40 shadow-lg'
                          : 'bg-[#0b141a] border-[#202c33] text-slate-300 hover:border-slate-700'
                      }`}
                      style={{
                        backgroundColor: isSelected ? `${tag.color}22` : undefined,
                        borderColor: isSelected ? tag.color : undefined
                      }}
                    >
                      <div className="flex items-center gap-3 truncate min-w-0">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${
                          isSelected ? 'text-white' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: isSelected ? tag.color : undefined, borderColor: isSelected ? tag.color : undefined }}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                            <p className="text-xs font-bold text-white truncate">{tag.name}</p>
                          </div>
                          {tag.description && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{tag.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white font-mono">{count}</span>
                        <span className="text-[10px] text-slate-500 block">contacts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>

        {/* Right Column: Template, Image Attachment & Anti-Ban Config */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Spintax Message Composer */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-emerald-400" />
                2. Spintax Message Composer
              </h4>
              <button
                onClick={generateSpintaxPreview}
                disabled={loadingSpintax}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-xs font-semibold text-emerald-400 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Preview Variations
              </button>
            </div>

            {/* Variables Bar */}
            {campaignMode === 'tagged_contacts' && (
              <div className="flex flex-wrap items-center gap-1.5 bg-[#0b141a] p-2.5 rounded-xl border border-[#202c33]">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Variables:</span>
                {['{name}', '{first_name}', '{phone}', '{tag}'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-1 rounded-lg bg-[#111b21] hover:bg-emerald-600/30 text-emerald-400 text-[11px] font-mono border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={5}
              placeholder="Type message using Spintax syntax like {Hello|Hi|Hey} {name|friend}..."
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl p-3 text-xs md:text-sm text-white placeholder-slate-600 outline-none font-mono leading-relaxed resize-none"
            />

            {/* Direct Image File Upload Section */}
            <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  Attach Campaign Image (Upload or URL)
                </label>
                <span className="text-[10px] text-slate-400">PNG, JPG, WebP</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="campaign-image-upload"
                />

                <label
                  htmlFor="campaign-image-upload"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold cursor-pointer transition-all w-full sm:w-auto justify-center"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{imageUrl ? 'Change Image File' : 'Upload Image File'}</span>
                </label>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* URL Fallback */}
              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or enter image URL: https://example.com/banner.jpg"
                className="w-full bg-[#111b21] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />

              {/* Image Preview Box */}
              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black/40 p-2 flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-[#202c33]"
                  />
                  <div className="text-xs space-y-0.5 truncate">
                    <p className="font-semibold text-emerald-300 truncate">
                      {imageFileName || 'Campaign Banner Image Attached'}
                    </p>
                    <p className="text-[10px] text-slate-400">Sent with caption to all recipients</p>
                  </div>
                </div>
              )}
            </div>

            {/* Spintax Samples Preview Box */}
            {spintaxSamples.length > 0 && (
              <div className="p-3 rounded-xl bg-[#0b141a] border border-emerald-500/20 space-y-2">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live Spintax Variations:</p>
                {spintaxSamples.map((sample, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#111b21] border border-[#202c33] text-xs text-slate-200 font-mono whitespace-pre-wrap">
                    <span className="text-slate-500 text-[10px] mr-2">#{idx + 1}</span>
                    {sample}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anti-Ban Pacing Controls */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4 shadow-xl">
            <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              3. Anti-Ban Random Pacing & Safeguards
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Random Jitter Interval</span>
                  <span className="text-emerald-400 font-mono">{minDelaySec}s – {maxDelaySec}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500">5s</span>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={minDelaySec}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMinDelaySec(val);
                      if (val > maxDelaySec) setMaxDelaySec(val + 5);
                    }}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={maxDelaySec}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxDelaySec(val);
                      if (val < minDelaySec) setMinDelaySec(val - 5);
                    }}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[9px] text-slate-500">90s</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Batch Rest Pause</span>
                  <span className="text-emerald-400 font-mono">{batchPauseMinutes}m rest / {batchSize} sends</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="bg-[#111b21] border border-[#202c33] rounded-lg px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value={5}>Every 5 sends</option>
                    <option value={10}>Every 10 sends</option>
                    <option value={15}>Every 15 sends</option>
                    <option value={20}>Every 20 sends</option>
                  </select>
                  <select
                    value={batchPauseMinutes}
                    onChange={(e) => setBatchPauseMinutes(Number(e.target.value))}
                    className="bg-[#111b21] border border-[#202c33] rounded-lg px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value={1}>1 Min Rest</option>
                    <option value={2}>2 Min Rest</option>
                    <option value={3}>3 Min Rest</option>
                    <option value={5}>5 Min Rest</option>
                  </select>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Launch Action */}
            <button
              onClick={handleStartCampaign}
              disabled={
                startingCampaign || 
                isCampaignActive || 
                (campaignMode === 'groups' && selectedGroupJids.length === 0) ||
                (campaignMode === 'tagged_contacts' && selectedTags.length === 0)
              }
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm transition-all shadow-xl disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {startingCampaign ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Initiating Automated Broadcast Campaign...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>
                    Launch {campaignMode === 'tagged_contacts' ? `Tag-Targeted Broadcast (${matchedTaggedContacts.length} Contacts)` : `Multi-Group Campaign (${selectedGroupJids.length} Groups)`}
                  </span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};
