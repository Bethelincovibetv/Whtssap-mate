export interface EngineStats {
  statusesViewed: number;
  reactionsSent: number;
  aiRepliesSent: number;
  broadcastsSent: number;
  campaignMessagesSent: number;
  startedAt: string;
}

export interface FallbackRule {
  id: string;
  keywords: string[];
  reply: string;
  enabled: boolean;
}

export interface EngineConfig {
  autoView: boolean;
  autoReact: boolean;
  reactionEmojis: string[];
  aiResponder: boolean;
  aiTriggerMode: 'all' | 'keywords_only';
  triggerKeywords: string[];
  systemPrompt: string;
  geminiKey: string;
  viewDelaySeconds: number;
  typingDelaySeconds: number;
  fallbackRules: FallbackRule[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'event' | 'success' | 'warn' | 'error';
  category?: 'status' | 'group' | 'campaign' | 'ai' | 'system';
  metadata?: any;
}

export interface ViewedStatusItem {
  id: string;
  timestamp: string;
  senderPhone: string;
  senderName: string;
  reactedEmoji: string | null;
}

export interface GroupParticipantInfo {
  id: string;
  admin: 'admin' | 'superadmin' | null;
}

export interface GroupItem {
  id: string;
  subject: string;
  subjectOwner?: string;
  subjectTime?: number;
  size: number;
  creation?: number;
  owner?: string;
  desc?: string;
  isBotAdmin: boolean;
  participants?: GroupParticipantInfo[];
  announce?: boolean;
  restrict?: boolean;
  participantsCount?: number;
  tags?: string[];
}

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface ContactItem {
  jid: string;
  phone: string;
  name?: string;
  pushName?: string;
  tags: string[];
  notes?: string;
  groupJids?: string[];
  groupNames?: string[];
  lastUpdated?: string;
}

export interface VcfExportOptions {
  jid?: string;
  groupJids?: string[];
  contactJids?: string[];
  tagIds?: string[];
  prefix?: string;
  fileName?: string;
  customCaption?: string;
  sendToGroup?: boolean;
  excludeBot?: boolean;
  includeAdminsOnly?: boolean;
}

export interface CampaignProgress {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'batch_pausing' | 'completed' | 'cancelled' | 'error';
  targetMode?: 'groups' | 'tagged_contacts' | 'direct_contacts';
  targetGroupJids: string[];
  targetContactJids?: string[];
  targetTags?: string[];
  totalGroups: number;
  sentCount: number;
  failedCount: number;
  currentIndex: number;
  currentGroupJid: string | null;
  currentGroupName: string | null;
  minDelaySec: number;
  maxDelaySec: number;
  batchSize: number;
  batchPauseMinutes: number;
  templateText: string;
  imageUrl?: string;
  nextSendInSec: number;
  batchPauseRemainingSec: number;
  startedAt: string;
  completedAt?: string | null;
  logs: string[];
}

export interface EngineStatusResponse {
  status: 'disconnected' | 'connecting' | 'connected';
  phase?: string;
  phone: string | null;
  name: string | null;
  hasQr: boolean;
  qr: string | null;
  autoReact: boolean;
  autoView: boolean;
  aiResponder: boolean;
  aiTriggerMode?: 'all' | 'keywords_only';
  triggerKeywords?: string[];
  reactionEmojis: string[];
  systemPrompt: string;
  viewDelaySeconds?: number;
  typingDelaySeconds?: number;
  fallbackRules?: FallbackRule[];
  stats: EngineStats;
  campaign?: CampaignProgress;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
  status: 'active' | 'revoked';
  permissions: string[];
}

export interface WebhookConfig {
  url: string;
  enabled: boolean;
  events: string[];
  secret?: string;
}

