import React, { useState, useEffect, useCallback } from 'react';
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
  Info
} from 'lucide-react';
import { EngineStatusResponse, GroupItem, CampaignProgress } from '../types';

interface CampaignTabProps {
  statusData: EngineStatusResponse | null;
  onRefresh: () => void;
}

export const CampaignTab: React.FC<CampaignTabProps> = ({ statusData, onRefresh }) => {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupJids, setSelectedGroupJids] = useState<string[]>([]);
  const [searchGroup, setSearchGroup] = useState('');
  
  // Message & Spintax State
  const [templateText, setTemplateText] = useState(
    '{Hello|Hi|Greetings} {team|leaders|friends}! 🚀\n\n{Exciting news|Check out our latest update|Important announcement}: We have launched our new automation system.\n\n{Let us know if you have questions!|Feel free to reply directly!|Reach out for details!}'
  );
  const [imageUrl, setImageUrl] = useState('');
  const [spintaxSamples, setSpintaxSamples] = useState<string[]>([]);
  const [loadingSpintax, setLoadingSpintax] = useState(false);

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

  useEffect(() => {
    if (statusData?.status === 'connected') {
      fetchGroups();
    }
  }, [statusData?.status, fetchGroups]);

  const toggleGroupSelection = (jid: string) => {
    setSelectedGroupJids(prev => 
      prev.includes(jid) ? prev.filter(id => id !== jid) : [...prev, jid]
    );
  };

  const handleSelectAll = () => {
    if (selectedGroupJids.length === filteredGroups.length) {
      setSelectedGroupJids([]);
    } else {
      setSelectedGroupJids(filteredGroups.map(g => g.id));
    }
  };

  const handleSelectAdminOnly = () => {
    const adminJids = groups.filter(g => g.isBotAdmin).map(g => g.id);
    setSelectedGroupJids(adminJids);
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

  const handleStartCampaign = async () => {
    if (selectedGroupJids.length === 0) {
      setErrorMsg('Please select at least 1 WhatsApp group to launch campaign.');
      return;
    }
    if (!templateText && !imageUrl) {
      setErrorMsg('Please enter message text or provide an image URL.');
      return;
    }

    setErrorMsg(null);
    setStartingCampaign(true);

    try {
      const res = await fetch('/api/campaigns/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGroupJids: selectedGroupJids,
          templateText,
          imageUrl,
          minDelaySec,
          maxDelaySec,
          batchSize,
          batchPauseMinutes
        })
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

  if (statusData?.status !== 'connected') {
    return (
      <div className="p-8 rounded-3xl bg-[#111b21] border border-[#202c33] text-center max-w-xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Connect WhatsApp To Launch Campaigns</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Link your WhatsApp number using the 8-Digit Pairing Code to broadcast multi-group messages with randomized anti-ban pacing.
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
      
      {/* Live Campaign Status Banner if Active */}
      {isCampaignActive && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#111b21] to-[#0c1f17] border border-emerald-500/40 shadow-2xl space-y-4">
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
                <h3 className="text-base font-bold text-white">
                  {campaign.status === 'running' && 'Active Multi-Group Campaign in Progress'}
                  {campaign.status === 'batch_pausing' && 'Anti-Ban Batch Pause Active (Resting)'}
                  {campaign.status === 'paused' && 'Campaign Paused'}
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Processed <span className="font-bold text-emerald-400">{campaign.sentCount}</span> of <span className="font-bold text-white">{campaign.totalGroups}</span> groups ({progressPercent}%) • {campaign.failedCount} failed
              </p>
            </div>

            {/* Campaign Action Controls */}
            <div className="flex items-center gap-2">
              {campaign.status === 'running' ? (
                <button
                  onClick={() => handleCampaignAction('pause')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              ) : campaign.status === 'paused' ? (
                <button
                  onClick={() => handleCampaignAction('resume')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              ) : null}

              <button
                onClick={() => handleCampaignAction('cancel')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" /> Stop / Cancel
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#0b141a] rounded-full h-3.5 p-0.5 border border-[#202c33] overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Current Target: {campaign.currentGroupJid ? campaign.currentGroupJid.split('@')[0] : '–'}</span>
              {campaign.status === 'batch_pausing' ? (
                <span className="text-amber-400 font-bold">
                  Batch Pause: {Math.floor(campaign.batchPauseRemainingSec / 60)}m {campaign.batchPauseRemainingSec % 60}s remaining
                </span>
              ) : campaign.nextSendInSec > 0 ? (
                <span className="text-emerald-400">
                  Next send in {campaign.nextSendInSec}s (Anti-Ban Jitter)
                </span>
              ) : (
                <span>Sending...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Campaign Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Group Selector */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              1. Select Target Groups ({selectedGroupJids.length} chosen)
            </h4>
            <button
              onClick={fetchGroups}
              className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 transition-all"
              title="Refresh groups list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGroups ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value)}
              placeholder="Search groups..."
              className="flex-1 bg-[#0b141a] border border-[#202c33] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-slate-300 transition-all cursor-pointer shrink-0"
            >
              {selectedGroupJids.length === filteredGroups.length && filteredGroups.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleSelectAdminOnly}
              className="px-2.5 py-1.5 rounded-xl bg-[#0b141a] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-emerald-400 transition-all cursor-pointer shrink-0"
            >
              Admin Only
            </button>
          </div>

          {/* Group Checklist */}
          <div className="flex-1 max-h-96 overflow-y-auto space-y-1.5 pr-1">
            {loadingGroups ? (
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
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-[#0b141a] border-[#202c33] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
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
                      {group.isBotAdmin && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          ADMIN
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
        </div>

        {/* Right Column: Template, Spintax & Anti-Ban Config */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Spintax Message Composer */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
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

            <div className="relative">
              <textarea
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                rows={5}
                placeholder="Type your message using Spintax syntax like {Hello|Hi|Hey} {leaders|friends}..."
                className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl p-3 text-xs md:text-sm text-white placeholder-slate-600 outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-[#0b141a] p-2.5 rounded-xl border border-[#202c33]">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Spintax Tip:</strong> Wrap words in <code className="text-emerald-400">{`{Option1|Option2|Option3}`}</code>. Every single group will receive a unique variation with a different hash to prevent automated spam filters.
              </span>
            </div>

            {/* Optional Image URL */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Optional Image Media URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/promo-banner.jpg"
                className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
            </div>

            {/* Spintax Samples Preview Box */}
            {spintaxSamples.length > 0 && (
              <div className="p-3 rounded-xl bg-[#0b141a] border border-emerald-500/20 space-y-2">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Live Spintax Variations Generated:</p>
                {spintaxSamples.map((sample, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#111b21] border border-[#202c33] text-xs text-slate-200 font-mono whitespace-pre-wrap">
                    <span className="text-slate-500 text-[10px] mr-2">#{idx + 1}</span>
                    {sample}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anti-Ban Pacing & Jitter Controls */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              3. Anti-Ban Pacing & Flood Safeguards
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Delay Range Slider */}
              <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Random Jitter Interval</span>
                  <span className="text-emerald-400 font-mono">{minDelaySec}s – {maxDelaySec}s</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">Min (5s)</span>
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
                  <span className="text-[10px] text-slate-500">Max (90s)</span>
                </div>
                <p className="text-[10px] text-slate-500">Adds unpredictable delay between every single group send.</p>
              </div>

              {/* Batch Pause Settings */}
              <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Batch Rest Pause</span>
                  <span className="text-emerald-400 font-mono">Rest {batchPauseMinutes}m every {batchSize} groups</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Batch Size</label>
                    <select
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      className="w-full bg-[#111b21] border border-[#202c33] rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value={5}>Every 5 groups</option>
                      <option value={10}>Every 10 groups</option>
                      <option value={15}>Every 15 groups</option>
                      <option value={20}>Every 20 groups</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Pause Duration</label>
                    <select
                      value={batchPauseMinutes}
                      onChange={(e) => setBatchPauseMinutes(Number(e.target.value))}
                      className="w-full bg-[#111b21] border border-[#202c33] rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value={1}>1 Minute</option>
                      <option value={2}>2 Minutes</option>
                      <option value={3}>3 Minutes (Recommended)</option>
                      <option value={5}>5 Minutes</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Launch Campaign Action */}
            <button
              onClick={handleStartCampaign}
              disabled={startingCampaign || isCampaignActive || selectedGroupJids.length === 0}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm transition-all shadow-xl disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {startingCampaign ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Initiating Multi-Group Campaign...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Launch Multi-Group Campaign ({selectedGroupJids.length} Groups)
                </>
              )}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};
