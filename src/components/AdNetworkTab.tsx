import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe2, 
  Users, 
  Rocket, 
  Share2, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  ExternalLink, 
  RefreshCw, 
  Sliders, 
  Check, 
  AlertCircle, 
  Lock, 
  DollarSign,
  Play,
  Layers,
  Crown,
  Eye,
  Trash2,
  Tag
} from 'lucide-react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, isUserAdmin, ADMIN_EMAIL } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { 
  EngineStatusResponse, 
  GroupItem, 
  AdvertCampaign, 
  PooledGroup,
  NetworkStats 
} from '../types';
import { CreateAdvertModal } from './CreateAdvertModal';

interface AdNetworkTabProps {
  statusData: EngineStatusResponse | null;
  currentUser: User | null;
  onRefresh: () => void;
  onOpenConnect: () => void;
  onOpenCampaign: (preload?: any) => void;
}

export const AdNetworkTab: React.FC<AdNetworkTabProps> = ({
  statusData,
  currentUser,
  onRefresh,
  onOpenConnect,
  onOpenCampaign
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pool_manager' | 'adverts_feed' | 'admin_hub'>('pool_manager');
  const [localGroups, setLocalGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [pooledGroups, setPooledGroups] = useState<PooledGroup[]>([]);
  const [adverts, setAdverts] = useState<AdvertCampaign[]>([]);
  const [loadingAdverts, setLoadingAdverts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [savingPool, setSavingPool] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [broadcastingAdvertId, setBroadcastingAdvertId] = useState<string | null>(null);

  const isAdmin = isUserAdmin(currentUser);
  const isConnected = statusData?.status === 'connected';

  // Fetch local groups from WhatsApp session
  const fetchLocalGroups = useCallback(async () => {
    if (!isConnected) return;
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (data.groups) {
        setLocalGroups(data.groups);
      }
    } catch (e) {
      console.error('Failed to load local groups:', e);
    } finally {
      setLoadingGroups(false);
    }
  }, [isConnected]);

  // Listen to Firestore Pooled Groups
  useEffect(() => {
    if (!currentUser) return;
    try {
      const unsub = onSnapshot(collection(db, 'pooled_groups'), (snapshot) => {
        const list: PooledGroup[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as PooledGroup);
        });
        setPooledGroups(list);
        
        // Sync selected group ids belonging to current user
        const userPooledIds = list
          .filter(g => g.ownerUid === currentUser.uid && g.isEnabled)
          .map(g => g.id);
        setSelectedGroupIds(userPooledIds);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'pooled_groups');
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore pooled groups subscription note:', e);
    }
  }, [currentUser]);

  // Listen to Firestore Adverts
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'adverts'), (snapshot) => {
        const list: AdvertCampaign[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as AdvertCampaign);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAdverts(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'adverts');
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore adverts subscription note:', e);
    }
  }, []);

  // Sync connected WhatsApp session into Firestore
  useEffect(() => {
    if (isConnected && currentUser && statusData?.phone) {
      const syncInstanceToFirestore = async () => {
        try {
          const instanceId = 'inst_' + (statusData.phone || 'session').replace(/[^0-9]/g, '');
          const instanceRef = doc(db, 'instances', instanceId);
          await setDoc(instanceRef, {
            instanceId,
            ownerUid: currentUser.uid,
            ownerEmail: currentUser.email || '',
            phone: statusData.phone,
            name: statusData.name || 'Promoter Account',
            status: 'connected',
            groupsCount: localGroups.length,
            pooledGroupsCount: selectedGroupIds.length,
            totalAudienceReach: localGroups.reduce((acc, g) => acc + (g.size || g.participantsCount || 0), 0),
            autoAdPoolEnabled: selectedGroupIds.length > 0,
            lastActive: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn('Firebase instance sync note:', e);
        }
      };
      syncInstanceToFirestore();
    }
  }, [isConnected, currentUser, statusData, localGroups.length, selectedGroupIds.length]);

  useEffect(() => {
    fetchLocalGroups();
  }, [fetchLocalGroups]);

  // Toggle single group in/out of the pool
  const toggleGroupInPool = async (group: GroupItem) => {
    if (!currentUser) {
      setFeedbackMsg({ type: 'error', text: 'Please log in with Google to manage your group pool in Firebase.' });
      return;
    }

    const isCurrentlyPooled = selectedGroupIds.includes(group.id);
    const newSelected = isCurrentlyPooled 
      ? selectedGroupIds.filter(id => id !== group.id)
      : [...selectedGroupIds, group.id];

    setSelectedGroupIds(newSelected);
    setSavingPool(true);

    try {
      const groupDocRef = doc(db, 'pooled_groups', group.id.replace(/[^a-zA-Z0-9_-]/g, '_'));
      
      if (isCurrentlyPooled) {
        await deleteDoc(groupDocRef);
        setFeedbackMsg({ type: 'success', text: `Removed "${group.subject}" from automated ad pool.` });
      } else {
        const pooledData: PooledGroup = {
          id: group.id,
          instanceId: 'inst_' + (statusData?.phone || 'session').replace(/[^0-9]/g, ''),
          ownerUid: currentUser.uid,
          ownerEmail: currentUser.email || '',
          subject: group.subject || 'WhatsApp Group',
          participantsCount: group.size || group.participantsCount || 0,
          isBotAdmin: !!group.isBotAdmin,
          isOpenForMessages: !group.announce,
          isEnabled: true,
          category: 'General',
          addedAt: new Date().toISOString()
        };
        await setDoc(groupDocRef, pooledData);
        setFeedbackMsg({ type: 'success', text: `✓ Added "${group.subject}" to automated ad campaign network!` });
      }
    } catch (err) {
      console.error('Error saving pooled group to Firestore:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'pooled_groups');
      } catch (fErr: any) {
        setFeedbackMsg({ type: 'error', text: fErr.message });
      }
    } finally {
      setSavingPool(false);
    }
  };

  // Opt-in All Groups for Auto Adverts
  const handleOptInAllGroups = async () => {
    if (!currentUser) return;
    setSavingPool(true);
    try {
      for (const group of localGroups) {
        const safeId = group.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const groupDocRef = doc(db, 'pooled_groups', safeId);
        const pooledData: PooledGroup = {
          id: group.id,
          instanceId: 'inst_' + (statusData?.phone || 'session').replace(/[^0-9]/g, ''),
          ownerUid: currentUser.uid,
          ownerEmail: currentUser.email || '',
          subject: group.subject || 'WhatsApp Group',
          participantsCount: group.size || group.participantsCount || 0,
          isBotAdmin: !!group.isBotAdmin,
          isOpenForMessages: !group.announce,
          isEnabled: true,
          category: 'General',
          addedAt: new Date().toISOString()
        };
        await setDoc(groupDocRef, pooledData);
      }
      setSelectedGroupIds(localGroups.map(g => g.id));
      setFeedbackMsg({ type: 'success', text: `✓ Successfully opted-in all ${localGroups.length} groups to automated ad network!` });
    } catch (err) {
      console.error('Error batch pooling groups:', err);
    } finally {
      setSavingPool(false);
    }
  };

  // Admin / Promoter: Dispatch automated campaign broadcast for an Advert across all pooled groups
  const handleTriggerNetworkBroadcast = async (advert: AdvertCampaign) => {
    if (!confirm(`Dispatch automated network broadcast for "${advert.title}" across your connected WhatsApp groups?`)) return;
    
    setBroadcastingAdvertId(advert.id);
    try {
      // Formulate Spintax template with advert copy & action link
      let broadcastText = advert.advertContent;
      if (advert.linkUrl && !broadcastText.includes(advert.linkUrl)) {
        broadcastText += `\n\n👉 *Official Link:* ${advert.linkUrl}`;
      }

      // Preload and trigger campaign
      const targetGroupJids = localGroups
        .filter(g => selectedGroupIds.includes(g.id) || g.isBotAdmin || !g.announce)
        .map(g => g.id);

      if (targetGroupJids.length === 0) {
        setFeedbackMsg({ type: 'error', text: 'No active groups available in pool to broadcast to. Connect account or opt-in groups.' });
        setBroadcastingAdvertId(null);
        return;
      }

      // Call Campaign Start API
      const res = await fetch('/api/campaigns/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMode: 'groups',
          targetGroupJids,
          templateText: broadcastText,
          imageUrl: advert.mediaUrl || '',
          minDelaySec: 15,
          maxDelaySec: 35,
          batchSize: 10,
          batchPauseMinutes: 2
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Update advert delivery count in Firestore
        try {
          const advertRef = doc(db, 'adverts', advert.id);
          await updateDoc(advertRef, {
            deliveredGroupsCount: (advert.deliveredGroupsCount || 0) + targetGroupJids.length,
            status: 'active'
          });
        } catch (e) {}

        setFeedbackMsg({
          type: 'success',
          text: `🚀 Automated broadcast initiated across ${targetGroupJids.length} groups for "${advert.title}"!`
        });
        onOpenCampaign();
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to start automated broadcast.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Broadcast error' });
    } finally {
      setBroadcastingAdvertId(null);
    }
  };

  // Delete Advert (Admin or Owner)
  const handleDeleteAdvert = async (advertId: string) => {
    if (!confirm('Are you sure you want to delete this advert campaign?')) return;
    try {
      await deleteDoc(doc(db, 'adverts', advertId));
      setFeedbackMsg({ type: 'success', text: 'Advert campaign removed.' });
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message });
    }
  };

  const totalNetworkReach = pooledGroups.reduce((acc, g) => acc + (g.participantsCount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Network Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Public Pooled Groups</p>
            <p className="text-xl font-bold text-white mt-1">{pooledGroups.length} <span className="text-xs text-emerald-400 font-normal">in Cloud Network</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Globe2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Your Group Contribution</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{selectedGroupIds.length} <span className="text-xs text-slate-500 font-normal">of {localGroups.length}</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Live Adverts in Queue</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{adverts.length} Campaigns</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Rocket className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Network Reach</p>
            <p className="text-xl font-bold text-purple-400 mt-1">{totalNetworkReach.toLocaleString()} <span className="text-xs text-slate-500 font-normal">Members</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111b21] p-1.5 rounded-2xl border border-[#202c33]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('pool_manager')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'pool_manager'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Group Pool Settings ({selectedGroupIds.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('adverts_feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'adverts_feed'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Adverts & Campaigns ({adverts.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('admin_hub')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'admin_hub'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                  : 'text-amber-400 hover:text-white hover:bg-[#202c33]'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Admin Moderation</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow-lg cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Business Advert</span>
        </button>
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

      {/* SUB-TAB 1: GROUP POOL SETTINGS (Select Groups for Automated Campaigns) */}
      {activeSubTab === 'pool_manager' && (
        <div className="p-5 md:p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-6 shadow-xl">
          
          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0b141a] to-[#0c1f17] border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                Automated Ad Campaign Group Pool
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Choose which of your WhatsApp groups should receive automated network adverts. As long as the group is open for member messages, our system utilizes your connected session to broadcast campaigns safely with randomized anti-ban pacing.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOptInAllGroups}
                disabled={savingPool || localGroups.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
              >
                Opt-in All ({localGroups.length}) Groups
              </button>
            </div>
          </div>

          {!isConnected ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-400 font-medium">No WhatsApp Account Connected</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Connect using pairing code to view your groups and opt into the network.</p>
              <button
                onClick={onOpenConnect}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Connect WhatsApp
              </button>
            </div>
          ) : loadingGroups ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              <p className="text-xs">Loading joined groups from WhatsApp...</p>
            </div>
          ) : localGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-xs">No joined groups found in your WhatsApp account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {localGroups.map(group => {
                const isPooled = selectedGroupIds.includes(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => toggleGroupInPool(group)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isPooled
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg'
                        : 'bg-[#0b141a] border-[#202c33] hover:border-slate-700 opacity-75'
                    }`}
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-white text-xs truncate">{group.subject}</h5>
                        {group.announce ? (
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Admins Only
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Open Chat
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {group.size || group.participantsCount || 0} participants • {isPooled ? '🟢 Auto-Ad Enabled' : '⚪ Pooled Disabled'}
                      </p>
                    </div>

                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                      isPooled
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-600 bg-[#111b21]'
                    }`}>
                      {isPooled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* SUB-TAB 2: ADVERTS & CAMPAIGNS FEED */}
      {activeSubTab === 'adverts_feed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              General Advert Campaigns Ready for Network Broadcast
            </h3>
            <span className="text-xs text-slate-400">
              Total Live Adverts: {adverts.length}
            </span>
          </div>

          {adverts.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#111b21] border border-[#202c33] text-center text-slate-500 space-y-3">
              <Rocket className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm text-slate-400 font-medium">No Advert Campaigns Yet</p>
              <p className="text-xs text-slate-500">Be the first to publish an advert to reach millions across WhatsApp!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Create First Advert
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adverts.map(adv => (
                <div
                  key={adv.id}
                  className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1.5 inline-block">
                          {adv.category || 'General'}
                        </span>
                        <h4 className="font-bold text-white text-sm">{adv.title}</h4>
                        <p className="text-[10px] text-slate-500">By {adv.creatorName || adv.creatorEmail} • {new Date(adv.createdAt).toLocaleDateString()}</p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        adv.status === 'approved' || adv.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {adv.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Content Box */}
                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-36 overflow-y-auto">
                      {adv.advertContent}
                    </div>

                    {adv.linkUrl && (
                      <a
                        href={adv.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{adv.linkUrl}</span>
                      </a>
                    )}
                  </div>

                  {/* Advert Card Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#202c33]">
                    <span className="text-[11px] text-slate-400">
                      Delivered to: <strong className="text-white">{adv.deliveredGroupsCount || 0}</strong> groups
                    </span>

                    <div className="flex items-center gap-2">
                      {(isAdmin || adv.creatorUid === currentUser?.uid) && (
                        <button
                          onClick={() => handleDeleteAdvert(adv.id)}
                          className="p-1.5 rounded-lg bg-[#0b141a] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete advert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleTriggerNetworkBroadcast(adv)}
                        disabled={broadcastingAdvertId === adv.id}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>Broadcast to My Pool</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ADMIN MODERATION (Exclusive to bethelgoodgift3@gmail.com) */}
      {isAdmin && activeSubTab === 'admin_hub' && (
        <div className="p-6 rounded-2xl bg-[#111b21] border border-amber-500/30 space-y-6 shadow-2xl">
          
          <div className="flex items-center justify-between pb-4 border-b border-[#202c33]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Super Admin Network Control Center
                </h3>
                <p className="text-xs text-amber-400 font-mono">
                  Authorized Admin: {ADMIN_EMAIL}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/30">
              Master Admin Access
            </span>
          </div>

          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33]">
              <p className="text-xs text-slate-400">Total Pooled Groups in Cloud</p>
              <p className="text-xl font-bold text-white mt-1">{pooledGroups.length}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33]">
              <p className="text-xs text-slate-400">Total Network Reach</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{totalNetworkReach.toLocaleString()} Members</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33]">
              <p className="text-xs text-slate-400">Total Adverts Published</p>
              <p className="text-xl font-bold text-blue-400 mt-1">{adverts.length}</p>
            </div>
          </div>

          {/* All Pooled Cloud Groups Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Network Group Inventory (All Connected Accounts)
            </h4>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0b141a] text-slate-400 text-[10px] uppercase border-b border-[#202c33]">
                  <tr>
                    <th className="p-2.5">Group Subject</th>
                    <th className="p-2.5">Owner / Contributor</th>
                    <th className="p-2.5">Members</th>
                    <th className="p-2.5">Open For Posts</th>
                    <th className="p-2.5">Added Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202c33]">
                  {pooledGroups.map(pg => (
                    <tr key={pg.id} className="hover:bg-[#0b141a]/50">
                      <td className="p-2.5 font-semibold text-white truncate max-w-xs">{pg.subject}</td>
                      <td className="p-2.5 text-slate-400">{pg.ownerEmail || pg.ownerUid}</td>
                      <td className="p-2.5 font-mono text-emerald-400">{pg.participantsCount}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pg.isOpenForMessages ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {pg.isOpenForMessages ? 'Open Chat' : 'Admins Only'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">{new Date(pg.addedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* CREATE ADVERT MODAL */}
      <CreateAdvertModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
        onSuccess={(newAdv) => {
          setFeedbackMsg({
            type: 'success',
            text: `✓ Advert "${newAdv.title}" published successfully to the cloud network!`
          });
          setActiveSubTab('adverts_feed');
        }}
      />

    </div>
  );
};
