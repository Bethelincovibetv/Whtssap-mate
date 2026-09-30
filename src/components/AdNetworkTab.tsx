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
  Tag,
  Flame,
  Send,
  Copy
} from 'lucide-react';
import { User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, isUserAdmin, ADMIN_EMAIL, sanitizeFirestoreData } from '../lib/firebase';
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
  const [activeSubTab, setActiveSubTab] = useState<'pool_manager' | 'adverts_feed' | 'sponsor_pitches' | 'sponsor_link' | 'admin_hub'>('pool_manager');
  const [localGroups, setLocalGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [pooledGroups, setPooledGroups] = useState<PooledGroup[]>([]);
  const [adverts, setAdverts] = useState<AdvertCampaign[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [loadingAdverts, setLoadingAdverts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [savingPool, setSavingPool] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [broadcastingAdvertId, setBroadcastingAdvertId] = useState<string | null>(null);
  const [copiedPersonalLink, setCopiedPersonalLink] = useState(false);

  const isAdmin = isUserAdmin(currentUser);
  const isConnected = statusData?.status === 'connected';

  // Personal Sponsor Submission Link for this user
  const personalSponsorLink = typeof window !== 'undefined' && currentUser?.uid 
    ? `${window.location.origin}/?promoter=${currentUser.uid}`
    : typeof window !== 'undefined' ? `${window.location.origin}/?promoter=demo` : '';

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

  // Fetch Server-stored Pooled Groups, Adverts, and Pitches
  const fetchNetworkData = useCallback(async () => {
    try {
      const hostParam = currentUser?.uid ? `?hostUid=${currentUser.uid}` : '';
      const [groupsRes, advertsRes, pitchesRes] = await Promise.all([
        fetch('/api/ad-network/pooled-groups'),
        fetch('/api/ad-network/adverts'),
        fetch(`/api/advert-pitches${hostParam}`).catch(() => null)
      ]);
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        if (data.groups && Array.isArray(data.groups)) {
          setPooledGroups(prev => {
            const map = new Map<string, PooledGroup>();
            prev.forEach(g => map.set(g.id, g));
            data.groups.forEach((g: PooledGroup) => map.set(g.id, g));
            return Array.from(map.values());
          });
        }
      }
      if (advertsRes.ok) {
        const data = await advertsRes.json();
        if (data.adverts && Array.isArray(data.adverts)) {
          setAdverts(prev => {
            const map = new Map<string, AdvertCampaign>();
            prev.forEach(a => map.set(a.id, a));
            data.adverts.forEach((a: AdvertCampaign) => map.set(a.id, a));
            return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      }
      if (pitchesRes && pitchesRes.ok) {
        const pData = await pitchesRes.json();
        if (pData.pitches) {
          setPitches(pData.pitches);
        }
      }
    } catch (e) {
      console.warn('Network data fetch note:', e);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // Listen to Firestore Pitches
  useEffect(() => {
    if (!auth.currentUser) return;
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(collection(db, 'advert_pitches'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((d) => {
          const item = d.data();
          if (isAdmin || item.targetHostUid === currentUser?.uid) {
            list.push(item);
          }
        });
        list.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
        setPitches(list);
      }, (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'advert_pitches');
        } catch (fsErr) {
          console.warn('Firestore pitches listener note:', fsErr);
        }
      });
    } catch (e) {
      console.warn('Firestore pitches subscription note:', e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [currentUser, isAdmin]);

  // Listen to Firestore Pooled Groups
  useEffect(() => {
    if (!auth.currentUser) return;
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(collection(db, 'pooled_groups'), (snapshot) => {
        const list: PooledGroup[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as PooledGroup);
        });
        setPooledGroups(list);
        
        // Sync selected group ids belonging to current user if logged in
        if (currentUser) {
          const userPooledIds = list
            .filter(g => g.ownerUid === currentUser.uid && g.isEnabled)
            .map(g => g.id);
          if (userPooledIds.length > 0) {
            setSelectedGroupIds(userPooledIds);
          }
        }
      }, (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'pooled_groups');
        } catch (fsErr) {
          console.warn('Firestore subscription fallback:', fsErr);
        }
      });
    } catch (e) {
      console.warn('Firestore pooled groups subscription note:', e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [currentUser]);

  // Listen to Firestore Adverts
  useEffect(() => {
    if (!auth.currentUser) return;
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(collection(db, 'adverts'), (snapshot) => {
        const list: AdvertCampaign[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as AdvertCampaign);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAdverts(list);
      }, (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'adverts');
        } catch (fsErr) {
          console.warn('Firestore adverts subscription fallback:', fsErr);
        }
      });
    } catch (e) {
      console.warn('Firestore adverts subscription note:', e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [currentUser]);

  // Sync connected WhatsApp session into Firestore
  useEffect(() => {
    if (isConnected && auth.currentUser && statusData?.phone) {
      const syncInstanceToFirestore = async () => {
        try {
          const instanceId = 'inst_' + (statusData.phone || 'session').replace(/[^0-9]/g, '');
          const instanceRef = doc(db, 'instances', instanceId);
          await setDoc(instanceRef, sanitizeFirestoreData({
            instanceId,
            ownerUid: auth.currentUser!.uid,
            ownerEmail: auth.currentUser!.email || '',
            phone: statusData.phone,
            name: statusData.name || 'Promoter Account',
            status: 'connected',
            groupsCount: localGroups.length,
            pooledGroupsCount: selectedGroupIds.length,
            totalAudienceReach: localGroups.reduce((acc, g) => acc + (g.size || g.participantsCount || 0), 0),
            autoAdPoolEnabled: selectedGroupIds.length > 0,
            lastActive: new Date().toISOString()
          }), { merge: true });
        } catch (e) {
          try {
            handleFirestoreError(e, OperationType.WRITE, 'instances');
          } catch (fsErr) {
            console.warn('Firebase instance sync note:', fsErr);
          }
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

    const pooledData: PooledGroup = sanitizeFirestoreData({
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
    }) as PooledGroup;

    try {
      // 1. Sync to server-side persistence
      if (isCurrentlyPooled) {
        await fetch(`/api/ad-network/pooled-groups/${encodeURIComponent(group.id)}`, { method: 'DELETE' }).catch(() => {});
        setPooledGroups(prev => prev.filter(g => g.id !== group.id));
        setFeedbackMsg({ type: 'success', text: `Removed "${group.subject}" from automated ad pool.` });
      } else {
        await fetch('/api/ad-network/pooled-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pooledData)
        }).catch(() => {});
        setPooledGroups(prev => [pooledData, ...prev.filter(g => g.id !== group.id)]);
        setFeedbackMsg({ type: 'success', text: `✓ Added "${group.subject}" to automated ad campaign network!` });
      }

      // 2. Sync to Firestore if authenticated
      if (auth.currentUser) {
        try {
          const groupDocRef = doc(db, 'pooled_groups', group.id.replace(/[^a-zA-Z0-9_-]/g, '_'));
          if (isCurrentlyPooled) {
            await deleteDoc(groupDocRef);
          } else {
            await setDoc(groupDocRef, pooledData);
          }
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, isCurrentlyPooled ? OperationType.DELETE : OperationType.WRITE, 'pooled_groups');
          } catch (e) {
            console.warn('Firestore pooled group sync note:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error saving pooled group:', err);
    } finally {
      setSavingPool(false);
    }
  };

  // Opt-in All Groups for Auto Adverts
  const handleOptInAllGroups = async () => {
    if (!currentUser) return;
    setSavingPool(true);
    try {
      const addedList: PooledGroup[] = [];
      for (const group of localGroups) {
        const safeId = group.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const pooledData: PooledGroup = sanitizeFirestoreData({
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
        }) as PooledGroup;

        addedList.push(pooledData);

        // Server-side
        await fetch('/api/ad-network/pooled-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pooledData)
        }).catch(() => {});

        // Firestore if authenticated
        if (auth.currentUser) {
          try {
            const groupDocRef = doc(db, 'pooled_groups', safeId);
            await setDoc(groupDocRef, pooledData);
          } catch (fsErr) {
            try {
              handleFirestoreError(fsErr, OperationType.WRITE, 'pooled_groups');
            } catch (e) {
              console.warn('Firestore batch pool sync note:', e);
            }
          }
        }
      }
      setSelectedGroupIds(localGroups.map(g => g.id));
      setPooledGroups(prev => {
        const map = new Map<string, PooledGroup>();
        prev.forEach(g => map.set(g.id, g));
        addedList.forEach(g => map.set(g.id, g));
        return Array.from(map.values());
      });
      setFeedbackMsg({ type: 'success', text: `✓ Successfully opted-in all ${localGroups.length} groups to automated ad network!` });
    } catch (err) {
      console.error('Error batch pooling groups:', err);
    } finally {
      setSavingPool(false);
    }
  };

  // Launch and distribute campaign to ALL available & selected automated groups
  const handleTriggerNetworkBroadcast = async (advert: AdvertCampaign) => {
    setBroadcastingAdvertId(advert.id);
    try {
      let broadcastText = advert.advertContent;
      if (advert.linkUrl && !broadcastText.includes(advert.linkUrl)) {
        broadcastText += `\n\n👉 *Official Link:* ${advert.linkUrl}`;
      }

      // Collect ALL target groups:
      // 1. User selected pooled groups
      // 2. Or all open / manageable groups in connected account
      let targetGroupJids = localGroups
        .filter(g => selectedGroupIds.includes(g.id))
        .map(g => g.id);

      if (targetGroupJids.length === 0) {
        targetGroupJids = localGroups
          .filter(g => !g.announce || g.isBotAdmin)
          .map(g => g.id);
      }

      if (targetGroupJids.length === 0) {
        setFeedbackMsg({ type: 'error', text: 'No active groups available in your pool. Connect WhatsApp or join open groups.' });
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
        // Update advert delivery count in Firestore if authenticated
        if (auth.currentUser) {
          try {
            const advertRef = doc(db, 'adverts', advert.id);
            await updateDoc(advertRef, {
              deliveredGroupsCount: (advert.deliveredGroupsCount || 0) + targetGroupJids.length,
              status: 'active'
            });
          } catch (e) {
            try {
              handleFirestoreError(e, OperationType.UPDATE, 'adverts');
            } catch (fsErr) {
              console.warn('Firestore update advert note:', fsErr);
            }
          }
        }

        if (data.queued || data.scheduled) {
          setFeedbackMsg({
            type: 'success',
            text: `⏰ Aligned with schedule! Advert "${advert.title}" is queued to broadcast automatically across ${targetGroupJids.length} groups once current active campaign completes.`
          });
        } else {
          setFeedbackMsg({
            type: 'success',
            text: `🚀 Automated broadcast started across ALL ${targetGroupJids.length} groups for "${advert.title}"!`
          });
        }
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

  // Sponsor Pitch Actions
  const handleApprovePitch = async (pitch: any) => {
    try {
      // 1. Server-side approve
      const res = await fetch(`/api/advert-pitches/${encodeURIComponent(pitch.id)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // 2. Firestore update if authenticated
        if (auth.currentUser) {
          try {
            await updateDoc(doc(db, 'advert_pitches', pitch.id), {
              status: 'approved',
              approvedAt: new Date().toISOString()
            });
          } catch (e) {}
        }
        setPitches(prev => prev.map(p => p.id === pitch.id ? { ...p, status: 'approved' } : p));
        setFeedbackMsg({ type: 'success', text: `✓ Sponsor pitch "${pitch.title}" approved & converted to active advert!` });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Failed to approve pitch.' });
    }
  };

  const handleRejectPitch = async (pitchId: string) => {
    try {
      await fetch(`/api/advert-pitches/${encodeURIComponent(pitchId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });
      if (auth.currentUser) {
        try {
          await updateDoc(doc(db, 'advert_pitches', pitchId), {
            status: 'rejected'
          });
        } catch (e) {}
      }
      setPitches(prev => prev.map(p => p.id === pitchId ? { ...p, status: 'rejected' } : p));
      setFeedbackMsg({ type: 'success', text: 'Sponsor pitch marked as rejected.' });
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Failed to reject pitch.' });
    }
  };

  const handleDeletePitch = async (pitchId: string) => {
    try {
      await fetch(`/api/advert-pitches/${encodeURIComponent(pitchId)}`, { method: 'DELETE' });
      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'advert_pitches', pitchId));
        } catch (e) {}
      }
      setPitches(prev => prev.filter(p => p.id !== pitchId));
      setFeedbackMsg({ type: 'success', text: 'Pitch removed.' });
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Failed to delete pitch.' });
    }
  };

  // Delete Advert (Admin or Owner)
  const handleDeleteAdvert = async (advertId: string) => {
    if (!confirm('Are you sure you want to delete this advert campaign?')) return;
    try {
      // 1. Server-side deletion
      await fetch(`/api/ad-network/adverts/${encodeURIComponent(advertId)}`, { method: 'DELETE' }).catch(() => {});
      setAdverts(prev => prev.filter(a => a.id !== advertId));
      
      // 2. Firestore deletion if authenticated
      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'adverts', advertId));
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, OperationType.DELETE, 'adverts');
          } catch (e) {
            console.warn('Firestore advert deletion note:', e);
          }
        }
      }

      setFeedbackMsg({ type: 'success', text: 'Advert campaign removed.' });
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Failed to remove advert.' });
    }
  };

  const pendingPitchesCount = pitches.filter(p => p.status === 'pending_approval').length;
  const totalNetworkReach = pooledGroups.reduce((acc, g) => acc + (g.participantsCount || 0), 0);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      
      {/* Network Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between min-w-0">
          <div className="truncate">
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Public Pooled Groups</p>
            <p className="text-lg sm:text-xl font-bold text-white mt-1">{pooledGroups.length}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Globe2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between min-w-0">
          <div className="truncate">
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Your Group Pool</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-400 mt-1">{selectedGroupIds.length} <span className="text-[10px] text-slate-500 font-normal">/ {localGroups.length}</span></p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between min-w-0">
          <div className="truncate">
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Live Adverts</p>
            <p className="text-lg sm:text-xl font-bold text-blue-400 mt-1">{adverts.length}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex items-center justify-between min-w-0">
          <div className="truncate">
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Total Reach</p>
            <p className="text-lg sm:text-xl font-bold text-purple-400 mt-1">{totalNetworkReach.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111b21] p-1.5 rounded-2xl border border-[#202c33]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('pool_manager')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'pool_manager'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Group Pool ({selectedGroupIds.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('adverts_feed')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'adverts_feed'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Adverts ({adverts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sponsor_pitches')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'sponsor_pitches'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Inbound Pitches</span>
            {pendingPitchesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                {pendingPitchesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('sponsor_link')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'sponsor_link'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-purple-400 hover:text-white hover:bg-[#202c33]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>My Ad Network Link</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('admin_hub')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'admin_hub'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                  : 'text-amber-400 hover:text-white hover:bg-[#202c33]'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Admin Hub</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow-lg cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Business Advert</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
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

      {/* SUB-TAB 1: GROUP POOL SETTINGS */}
      {activeSubTab === 'pool_manager' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-6 shadow-xl">
          
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0b141a] to-[#0c1f17] border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                Automated Campaign Group Pool
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Select which of your WhatsApp groups should participate in automated campaign broadcasts. When campaigns launch, the engine automatically distributes adverts across all selected groups with anti-ban pacing.
              </p>
            </div>

            <button
              onClick={handleOptInAllGroups}
              disabled={savingPool || localGroups.length === 0}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              Opt-in ALL ({localGroups.length}) Groups
            </button>
          </div>

          {!isConnected ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-400 font-medium">No WhatsApp Account Connected</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Connect using pairing code to view your groups and opt into the network.</p>
              <button
                onClick={onOpenConnect}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Connect WhatsApp
              </button>
            </div>
          ) : loadingGroups && localGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              <p className="text-xs">Loading joined groups from WhatsApp...</p>
            </div>
          ) : localGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-xs">No joined groups found in your WhatsApp account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {localGroups.map(group => {
                const isPooled = selectedGroupIds.includes(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => toggleGroupInPool(group)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 min-w-0 ${
                      isPooled
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg'
                        : 'bg-[#0b141a] border-[#202c33] hover:border-slate-700 opacity-75'
                    }`}
                  >
                    <div className="truncate min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-white text-xs truncate">{group.subject}</h5>
                        {group.announce && !group.isBotAdmin ? (
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                            Admin Only
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            Open Chat
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {group.size || group.participantsCount || 0} members • {isPooled ? '🟢 Auto-Ad Active' : '⚪ Not in Pool'}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              General Advert Campaigns
            </h3>
            <span className="text-xs text-slate-400">
              Active Campaigns: {adverts.length}
            </span>
          </div>

          {adverts.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#111b21] border border-[#202c33] text-center text-slate-500 space-y-3">
              <Rocket className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm text-slate-400 font-medium">No Advert Campaigns Yet</p>
              <p className="text-xs text-slate-500">Create an advert to broadcast across all pooled groups!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Create First Advert
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {adverts.map(adv => (
                <div
                  key={adv.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#111b21] border border-[#202c33] hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1.5 inline-block">
                          {adv.category || 'General'}
                        </span>
                        <h4 className="font-bold text-white text-sm truncate">{adv.title}</h4>
                        <p className="text-[10px] text-slate-500 truncate">By {adv.creatorName || adv.creatorEmail} • {new Date(adv.createdAt).toLocaleDateString()}</p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        adv.status === 'approved' || adv.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {adv.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Media Thumbnail if present */}
                    {adv.mediaUrl && (
                      <div className="rounded-xl overflow-hidden max-h-36 border border-[#202c33] bg-black/40">
                        <img src={adv.mediaUrl} alt="Ad media" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Content Box */}
                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
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
                  <div className="flex items-center justify-between pt-3 border-t border-[#202c33] flex-wrap gap-2">
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
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>{broadcastingAdvertId === adv.id ? 'Distributing...' : 'Broadcast to ALL Groups'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: INBOUND SPONSOR PITCHES */}
      {activeSubTab === 'sponsor_pitches' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#202c33]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Inbound Sponsor Pitches ({pitches.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                External clients can submit adverts to your ad network via your personal link without accessing your dashboard.
              </p>
            </div>

            <button
              onClick={() => setActiveSubTab('sponsor_link')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Get Sponsor Link</span>
            </button>
          </div>

          {pitches.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0b141a] border border-[#202c33] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#111b21] text-slate-500 flex items-center justify-center mx-auto border border-[#202c33]">
                <Send className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">No Inbound Pitches Yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Share your personal ad network link on social media, WhatsApp groups, or with clients. When someone submits an advert pitch, it appears here for your approval.
              </p>
              <button
                onClick={() => setActiveSubTab('sponsor_link')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
              >
                Copy My Sponsor Link
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pitches.map((pitch) => (
                <div 
                  key={pitch.id} 
                  className={`p-5 rounded-2xl bg-[#0b141a] border space-y-4 shadow-lg transition-all ${
                    pitch.status === 'approved' 
                      ? 'border-emerald-500/40 bg-emerald-950/10' 
                      : pitch.status === 'rejected' 
                      ? 'border-rose-500/30 opacity-75' 
                      : 'border-amber-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          pitch.status === 'approved' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : pitch.status === 'rejected' 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                        }`}>
                          {pitch.status === 'pending_approval' ? 'Pending Approval' : pitch.status}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(pitch.submittedAt || pitch.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{pitch.title}</h4>
                      <p className="text-[11px] text-slate-400">
                        By: <span className="text-slate-200 font-semibold">{pitch.submitterName}</span> ({pitch.submitterContact})
                      </p>
                    </div>

                    {pitch.budget > 0 && (
                      <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold shrink-0">
                        ${pitch.budget} Offer
                      </div>
                    )}
                  </div>

                  {pitch.mediaUrl && (
                    <div className="w-full h-32 rounded-xl overflow-hidden border border-[#202c33] bg-black/40">
                      <img src={pitch.mediaUrl} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-28 overflow-y-auto">
                    {pitch.advertContent}
                  </div>

                  {pitch.linkUrl && (
                    <a
                      href={pitch.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{pitch.linkUrl}</span>
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#202c33]">
                    <button
                      onClick={() => handleDeletePitch(pitch.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete pitch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      {pitch.status === 'pending_approval' && (
                        <>
                          <button
                            onClick={() => handleRejectPitch(pitch.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#111b21] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-[#202c33] text-xs font-semibold transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprovePitch(pitch)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Publish</span>
                          </button>
                        </>
                      )}

                      {pitch.status === 'approved' && (
                        <button
                          onClick={() => {
                            onOpenCampaign({
                              templateText: pitch.advertContent,
                              imageUrl: pitch.mediaUrl
                            });
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          <span>Schedule Broadcast</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: PERSONAL SPONSOR LINK GENERATOR */}
      {activeSubTab === 'sponsor_link' && (
        <div className="p-6 rounded-3xl bg-[#111b21] border border-[#202c33] space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-950/50">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Your Personal Ad Network Submission Link</h3>
              <p className="text-xs text-slate-400">Allows businesses, partners, and clients to submit adverts directly to your WhatsApp ad network.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0b141a] border border-purple-500/30 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Public Sponsor Pitch URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={personalSponsorLink}
                  className="w-full px-4 py-3 rounded-xl bg-[#111b21] border border-[#202c33] text-xs font-mono text-purple-300 outline-none select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(personalSponsorLink);
                    setCopiedPersonalLink(true);
                    setTimeout(() => setCopiedPersonalLink(false), 2000);
                  }}
                  className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow"
                >
                  {copiedPersonalLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPersonalLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33]">
                <p className="font-bold text-white">1. Share Your Link</p>
                <p className="text-[11px] text-slate-400 mt-1">Post your link on WhatsApp, status, Telegram, or send to business advertisers.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33]">
                <p className="font-bold text-white">2. Clients Submit Adverts</p>
                <p className="text-[11px] text-slate-400 mt-1">Clients fill out their advert details, banner, and proposed budget without accessing your account.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33]">
                <p className="font-bold text-white">3. Review & Approve</p>
                <p className="text-[11px] text-slate-400 mt-1">Approve adverts with 1-click to auto-broadcast across your pooled WhatsApp groups.</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <a
                href={personalSponsorLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 hover:underline font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Public Submission Page in New Tab</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: ADMIN MODERATION (Exclusive to bethelgoodgift3@gmail.com) */}
      {isAdmin && activeSubTab === 'admin_hub' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#111b21] border border-amber-500/30 space-y-6 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#202c33]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 truncate">
                  Super Admin Network Control Center
                </h3>
                <p className="text-[11px] text-amber-400 font-mono truncate">
                  Admin: {ADMIN_EMAIL}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/30 shrink-0">
              Master Admin
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33]">
              <p className="text-xs text-slate-400">Total Pooled Cloud Groups</p>
              <p className="text-xl font-bold text-white mt-1">{pooledGroups.length}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33]">
              <p className="text-xs text-slate-400">Total Audience Reach</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{totalNetworkReach.toLocaleString()} Members</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33]">
              <p className="text-xs text-slate-400">Total Adverts Published</p>
              <p className="text-xl font-bold text-blue-400 mt-1">{adverts.length}</p>
            </div>
          </div>

          {/* Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Network Group Inventory
            </h4>

            <div className="overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0b141a] text-slate-400 text-[10px] uppercase border-b border-[#202c33]">
                  <tr>
                    <th className="p-2.5">Group Subject</th>
                    <th className="p-2.5">Owner</th>
                    <th className="p-2.5">Members</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Added Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202c33]">
                  {pooledGroups.map(pg => (
                    <tr key={pg.id} className="hover:bg-[#0b141a]/50">
                      <td className="p-2.5 font-semibold text-white truncate max-w-xs">{pg.subject}</td>
                      <td className="p-2.5 text-slate-400 truncate max-w-[120px]">{pg.ownerEmail || pg.ownerUid}</td>
                      <td className="p-2.5 font-mono text-emerald-400">{pg.participantsCount}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pg.isOpenForMessages ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {pg.isOpenForMessages ? 'Open' : 'Admin Only'}
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
