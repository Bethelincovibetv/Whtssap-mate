import * as baileysPkg from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { 
  EngineConfig, 
  ActivityLog, 
  CampaignProgress, 
  ScheduledCampaign,
  ViewedStatusItem, 
  ApiKeyItem, 
  WebhookConfig,
  ContactItem,
  TagDefinition,
  VcfExportOptions,
  BroadcastHistoryItem,
  ConnectedAccount,
  EngineStats
} from './src/types';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('[Engine Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Engine Unhandled Rejection]', reason);
});

// Baileys interop
const baileys: any = (baileysPkg as any).default || baileysPkg;
const makeWASocket: any = baileys.default || baileys.makeWASocket || baileys;
const DisconnectReason = baileys.DisconnectReason || (baileysPkg as any).DisconnectReason || { loggedOut: 401 };
const useMultiFileAuthState = baileys.useMultiFileAuthState || (baileysPkg as any).useMultiFileAuthState;
const fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion || (baileysPkg as any).fetchLatestBaileysVersion;
const makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore || (baileysPkg as any).makeCacheableSignalKeyStore;
const Browsers = baileys.Browsers || (baileysPkg as any).Browsers;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// In-Memory Configuration & Persistence
const CONFIG_FILE = path.join(__dirname, 'config.json');

let config: EngineConfig = {
  autoView: true,
  autoReact: true,
  reactionEmojis: ['🔥', '👏', '❤️', '🚀', '😍', '⚡', '💯'],
  viewDelaySeconds: 2
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    config = { ...config, ...saved };
  } catch (e) {
    console.error('Error loading config.json:', e);
  }
}

function saveConfigToFile() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config.json:', e);
  }
}

// Broadcast Story History Persistence
const BROADCAST_HISTORY_FILE = path.join(__dirname, 'broadcast_history.json');
let broadcastHistory: BroadcastHistoryItem[] = [];

if (fs.existsSync(BROADCAST_HISTORY_FILE)) {
  try {
    broadcastHistory = JSON.parse(fs.readFileSync(BROADCAST_HISTORY_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading broadcast_history.json:', e);
  }
}

function saveBroadcastHistoryToFile() {
  try {
    fs.writeFileSync(BROADCAST_HISTORY_FILE, JSON.stringify(broadcastHistory.slice(0, 100), null, 2));
  } catch (e) {
    console.error('Failed to save broadcast_history.json:', e);
  }
}

// API Keys & Webhook Persistence
const API_KEYS_FILE = path.join(__dirname, 'api_keys.json');
const WEBHOOK_FILE = path.join(__dirname, 'webhook.json');

let apiKeys: ApiKeyItem[] = [];
let webhookConfig: WebhookConfig = {
  url: '',
  enabled: false,
  events: ['messages.upsert', 'status.view'],
  secret: ''
};

if (fs.existsSync(API_KEYS_FILE)) {
  try {
    apiKeys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading api_keys.json:', e);
  }
} else {
  // Generate starter live key
  const starterKey: ApiKeyItem = {
    id: 'key_' + crypto.randomBytes(4).toString('hex'),
    name: 'Primary Integration Key',
    key: 'wge_live_' + crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    requestCount: 0,
    status: 'active',
    permissions: ['messages:send', 'messages:media', 'groups:read', 'groups:send', 'status:read']
  };
  apiKeys = [starterKey];
  try {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  } catch (e) {}
}

if (fs.existsSync(WEBHOOK_FILE)) {
  try {
    webhookConfig = JSON.parse(fs.readFileSync(WEBHOOK_FILE, 'utf-8'));
  } catch (e) {}
}

function saveApiKeysToFile() {
  try {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  } catch (e) {
    console.error('Failed to save api_keys.json:', e);
  }
}

function saveWebhookToFile() {
  try {
    fs.writeFileSync(WEBHOOK_FILE, JSON.stringify(webhookConfig, null, 2));
  } catch (e) {
    console.error('Failed to save webhook.json:', e);
  }
}

// Contact Tagging & Contact Gain (VCF) Persistence
const TAGS_FILE = path.join(__dirname, 'tags.json');
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const GROUP_TAGS_FILE = path.join(__dirname, 'group_tags.json');

let tagDefinitions: TagDefinition[] = [
  { id: 'vip', name: 'VIP', color: '#eab308', description: 'High priority contacts & key clients', createdAt: new Date().toISOString() },
  { id: 'lead', name: 'Hot Lead', color: '#ef4444', description: 'Inquiries & potential buyers', createdAt: new Date().toISOString() },
  { id: 'customer', name: 'Customer', color: '#10b981', description: 'Paying clients & active accounts', createdAt: new Date().toISOString() },
  { id: 'partner', name: 'Partner', color: '#8b5cf6', description: 'Business associates & affiliates', createdAt: new Date().toISOString() },
  { id: 'gain', name: 'Contact Gain', color: '#ec4899', description: 'Extracted from group audience expansion', createdAt: new Date().toISOString() },
  { id: 'member', name: 'Community Member', color: '#3b82f6', description: 'Active WhatsApp community participant', createdAt: new Date().toISOString() }
];

let contactsMap: Map<string, ContactItem> = new Map();
let groupTagsMap: Map<string, string[]> = new Map();

if (fs.existsSync(TAGS_FILE)) {
  try {
    tagDefinitions = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading tags.json:', e);
  }
} else {
  try {
    fs.writeFileSync(TAGS_FILE, JSON.stringify(tagDefinitions, null, 2));
  } catch (e) {}
}

if (fs.existsSync(CONTACTS_FILE)) {
  try {
    const loadedContacts: ContactItem[] = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
    loadedContacts.forEach(c => {
      if (c && c.jid) contactsMap.set(c.jid, c);
    });
  } catch (e) {
    console.error('Error loading contacts.json:', e);
  }
}

if (fs.existsSync(GROUP_TAGS_FILE)) {
  try {
    const loadedGroupTags: Record<string, string[]> = JSON.parse(fs.readFileSync(GROUP_TAGS_FILE, 'utf-8'));
    Object.entries(loadedGroupTags).forEach(([jid, tags]) => {
      groupTagsMap.set(jid, tags);
    });
  } catch (e) {
    console.error('Error loading group_tags.json:', e);
  }
}

function saveTagsToFile() {
  try {
    fs.writeFileSync(TAGS_FILE, JSON.stringify(tagDefinitions, null, 2));
  } catch (e) {
    console.error('Failed to save tags.json:', e);
  }
}

function saveContactsToFile() {
  try {
    const list = Array.from(contactsMap.values());
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(list, null, 2));
  } catch (e) {
    console.error('Failed to save contacts.json:', e);
  }
}

function saveGroupTagsToFile() {
  try {
    const obj: Record<string, string[]> = {};
    groupTagsMap.forEach((tags, jid) => { obj[jid] = tags; });
    fs.writeFileSync(GROUP_TAGS_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Failed to save group_tags.json:', e);
  }
}

// Ad Network & Pooled Groups Persistence
const POOLED_GROUPS_FILE = path.join(__dirname, 'pooled_groups.json');
const ADVERTS_FILE = path.join(__dirname, 'adverts.json');

let serverPooledGroups: any[] = [];
let serverAdverts: any[] = [];

if (fs.existsSync(POOLED_GROUPS_FILE)) {
  try {
    serverPooledGroups = JSON.parse(fs.readFileSync(POOLED_GROUPS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading pooled_groups.json:', e);
  }
}

if (fs.existsSync(ADVERTS_FILE)) {
  try {
    serverAdverts = JSON.parse(fs.readFileSync(ADVERTS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading adverts.json:', e);
  }
}

function savePooledGroupsToFile() {
  try {
    fs.writeFileSync(POOLED_GROUPS_FILE, JSON.stringify(serverPooledGroups, null, 2));
  } catch (e) {
    console.error('Failed to save pooled_groups.json:', e);
  }
}

function saveAdvertsToFile() {
  try {
    fs.writeFileSync(ADVERTS_FILE, JSON.stringify(serverAdverts, null, 2));
  } catch (e) {
    console.error('Failed to save adverts.json:', e);
  }
}

export function recordContact(
  jid: string, 
  pushName?: string, 
  groupJid?: string, 
  groupName?: string, 
  initialTags: string[] = []
): ContactItem {
  if (!jid) return {} as ContactItem;
  const rawPhone = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  const existing = contactsMap.get(jid);
  const now = new Date().toISOString();

  if (existing) {
    if (pushName && (!existing.name || existing.name.startsWith('+') || existing.name.includes('Member'))) {
      existing.name = pushName;
    }
    if (pushName) existing.pushName = pushName;
    if (groupJid && !existing.groupJids?.includes(groupJid)) {
      existing.groupJids = [...(existing.groupJids || []), groupJid];
    }
    if (groupName && !existing.groupNames?.includes(groupName)) {
      existing.groupNames = [...(existing.groupNames || []), groupName];
    }
    if (initialTags.length > 0) {
      existing.tags = Array.from(new Set([...(existing.tags || []), ...initialTags]));
    }
    existing.lastUpdated = now;
    return existing;
  }

  const newContact: ContactItem = {
    jid,
    phone: rawPhone,
    name: pushName || `+${rawPhone}`,
    pushName: pushName || undefined,
    tags: initialTags.length > 0 ? initialTags : ['member'],
    notes: '',
    groupJids: groupJid ? [groupJid] : [],
    groupNames: groupName ? [groupName] : [],
    lastUpdated: now
  };

  contactsMap.set(jid, newContact);
  return newContact;
}

export function buildVcfContent(contacts: { phone: string; name: string; org?: string; note?: string }[]): string {
  let vcf = '';
  for (const c of contacts) {
    const cleanPhone = c.phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) continue;
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    const cleanName = (c.name || `Contact ${formattedPhone}`).replace(/[\r\n;,]/g, ' ').trim();
    
    vcf += 'BEGIN:VCARD\r\n';
    vcf += 'VERSION:3.0\r\n';
    vcf += `FN:${cleanName}\r\n`;
    vcf += `N:;${cleanName};;;\r\n`;
    vcf += `TEL;TYPE=CELL,VOICE:${formattedPhone}\r\n`;
    if (c.org) {
      vcf += `ORG:${c.org.replace(/[\r\n;,]/g, ' ').trim()}\r\n`;
    }
    if (c.note) {
      vcf += `NOTE:${c.note.replace(/[\r\n;,]/g, ' ').trim()}\r\n`;
    } else {
      vcf += `NOTE:Generated by WhatsApp Growth & Automation Engine\r\n`;
    }
    vcf += 'END:VCARD\r\n';
  }
  return vcf;
}

let recentLogs: ActivityLog[] = [];
let viewedStatusesLog: ViewedStatusItem[] = [];
let clientsSse: Response[] = [];

const globalStats: EngineStats = {
  statusesViewed: 0,
  reactionsSent: 0,
  broadcastsSent: 0,
  campaignMessagesSent: 0,
  startedAt: new Date().toISOString()
};

// =======================================================
// MULTI-ACCOUNT PERSISTENCE & RUNTIME ENGINE
// =======================================================

export interface AccountRecord {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
  phone?: string | null;
  name?: string | null;
  lastConnectedAt?: string | null;
}

interface AccountRuntime {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
  phone: string | null;
  name: string | null;
  status: 'disconnected' | 'connecting' | 'connected';
  phase: string;
  sock: any | null;
  qr: string | null;
  pairingCode: string | null;
  authDir: string;
  keepAliveTimer: NodeJS.Timeout | null;
  reconnectAttemptCount: number;
  isInitializing: boolean;
  lastConnectedAt: string | null;
  stats: EngineStats;
}

function resolveSafeDataDir(): string {
  if (process.env.DATA_DIR && process.env.DATA_DIR.trim()) {
    const candidate = path.resolve(process.env.DATA_DIR.trim());
    try {
      if (!fs.existsSync(candidate)) {
        fs.mkdirSync(candidate, { recursive: true });
      }
      const testFile = path.join(candidate, '.write_test_' + Date.now());
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      return candidate;
    } catch (e: any) {
      console.warn(`[Storage Warning] DATA_DIR "${candidate}" is not writable (${e?.message}). Falling back to local workspace directory.`);
    }
  }

  try {
    const localDir = path.join(__dirname, 'session_auth');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch (e) {
    const tmpDir = path.join('/tmp', 'session_auth');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const SESSIONS_BASE_DIR = resolveSafeDataDir();

// Migrate legacy single session auth directory if needed
const legacyCreds = path.join(SESSIONS_BASE_DIR, 'creds.json');
const primaryAuthDir = path.join(SESSIONS_BASE_DIR, 'acc_primary');

if (fs.existsSync(legacyCreds) && !fs.existsSync(primaryAuthDir)) {
  try {
    fs.mkdirSync(primaryAuthDir, { recursive: true });
    const files = fs.readdirSync(SESSIONS_BASE_DIR);
    for (const file of files) {
      if (file !== 'acc_primary' && !file.startsWith('acc_')) {
        const src = path.join(SESSIONS_BASE_DIR, file);
        const dest = path.join(primaryAuthDir, file);
        if (fs.statSync(src).isFile()) {
          fs.renameSync(src, dest);
        }
      }
    }
    console.log('[Migration] Successfully migrated legacy single session to ./session_auth/acc_primary');
  } catch (e) {
    console.error('[Migration Error]', e);
  }
}

const accountsMap: Map<string, AccountRuntime> = new Map();
let activeAccountId = 'acc_primary';

function loadAccountsList(): AccountRecord[] {
  if (fs.existsSync(ACCOUNTS_FILE)) {
    try {
      const records: AccountRecord[] = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
      if (Array.isArray(records) && records.length > 0) {
        return records;
      }
    } catch (e) {
      console.error('Error loading accounts.json:', e);
    }
  }

  // Default fallback account
  const defaultAccounts: AccountRecord[] = [
    {
      id: 'acc_primary',
      label: 'Primary Account',
      isDefault: true,
      createdAt: new Date().toISOString(),
      phone: null,
      name: null,
      lastConnectedAt: null
    }
  ];
  saveAccountsToFile(defaultAccounts);
  return defaultAccounts;
}

function saveAccountsToFile(records?: AccountRecord[]) {
  try {
    const listToSave = records || Array.from(accountsMap.values()).map(acc => ({
      id: acc.id,
      label: acc.label,
      isDefault: acc.isDefault,
      createdAt: acc.createdAt,
      phone: acc.phone,
      name: acc.name,
      lastConnectedAt: acc.lastConnectedAt
    }));
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(listToSave, null, 2));
  } catch (e) {
    console.error('Failed to save accounts.json:', e);
  }
}

function getActiveAccount(): AccountRuntime {
  if (accountsMap.has(activeAccountId)) {
    return accountsMap.get(activeAccountId)!;
  }
  const first = accountsMap.values().next().value;
  if (first) {
    activeAccountId = first.id;
    return first;
  }
  // Create default fallback runtime
  const fallback: AccountRuntime = {
    id: 'acc_primary',
    label: 'Primary Account',
    isDefault: true,
    createdAt: new Date().toISOString(),
    phone: null,
    name: null,
    status: 'disconnected',
    phase: 'idle',
    sock: null,
    qr: null,
    pairingCode: null,
    authDir: path.join(SESSIONS_BASE_DIR, 'acc_primary'),
    keepAliveTimer: null,
    reconnectAttemptCount: 0,
    isInitializing: false,
    lastConnectedAt: null,
    stats: { ...globalStats }
  };
  accountsMap.set(fallback.id, fallback);
  return fallback;
}

function getAccount(id?: string): AccountRuntime {
  if (id && accountsMap.has(id)) {
    return accountsMap.get(id)!;
  }
  return getActiveAccount();
}

function getAllAccountsList(): ConnectedAccount[] {
  return Array.from(accountsMap.values()).map(acc => ({
    id: acc.id,
    label: acc.label || (acc.phone ? `+${acc.phone}` : 'Account'),
    phone: acc.phone,
    name: acc.name,
    status: acc.status,
    phase: acc.phase,
    hasQr: !!acc.qr,
    qr: acc.qr,
    pairingCode: acc.pairingCode,
    isDefault: acc.isDefault,
    createdAt: acc.createdAt,
    lastConnectedAt: acc.lastConnectedAt,
    stats: acc.stats
  }));
}

// Spintax Helper: Recursively parses {opt1|opt2|opt3}
export function parseSpintax(text: string): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}]+)\}/;
  let matches;
  while ((matches = spintaxRegex.exec(text)) !== null) {
    const choices = matches[1].split('|');
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    text = text.replace(matches[0], randomChoice);
  }
  return text;
}

// Campaign State
let currentCampaign: CampaignProgress = {
  id: '',
  status: 'idle',
  targetGroupJids: [],
  totalGroups: 0,
  sentCount: 0,
  failedCount: 0,
  currentIndex: 0,
  currentGroupJid: null,
  currentGroupName: null,
  minDelaySec: 15,
  maxDelaySec: 35,
  batchSize: 10,
  batchPauseMinutes: 3,
  templateText: '',
  imageUrl: '',
  nextSendInSec: 0,
  batchPauseRemainingSec: 0,
  startedAt: '',
  completedAt: null,
  logs: []
};

let campaignIntervalTimer: NodeJS.Timeout | null = null;
let campaignCountdownTimer: NodeJS.Timeout | null = null;
let currentScheduledCampaignId: string | null = null;

// Persistent Scheduled Recurring Auto-Campaigns
const SCHEDULED_CAMPAIGNS_FILE = path.join(__dirname, 'scheduled_campaigns.json');
let scheduledCampaigns: ScheduledCampaign[] = [];

if (fs.existsSync(SCHEDULED_CAMPAIGNS_FILE)) {
  try {
    scheduledCampaigns = JSON.parse(fs.readFileSync(SCHEDULED_CAMPAIGNS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading scheduled_campaigns.json:', e);
  }
}

function saveScheduledCampaignsToFile() {
  try {
    fs.writeFileSync(SCHEDULED_CAMPAIGNS_FILE, JSON.stringify(scheduledCampaigns, null, 2));
  } catch (e) {
    console.error('Failed to save scheduled_campaigns.json:', e);
  }
}

function handleScheduledCampaignFinished(isSuccess: boolean) {
  if (!currentScheduledCampaignId) return;
  const idx = scheduledCampaigns.findIndex(s => s.id === currentScheduledCampaignId);
  if (idx !== -1) {
    const sc = scheduledCampaigns[idx];
    sc.lastRunAt = new Date().toISOString();
    sc.lastRunStatus = isSuccess ? 'success' : 'failed';
    sc.lastRunStats = {
      sent: currentCampaign.sentCount,
      failed: currentCampaign.failedCount
    };
    sc.currentIteration = (sc.currentIteration || 0) + 1;

    if (sc.repeatEnabled) {
      if (!sc.maxIterations || sc.maxIterations <= 0 || sc.currentIteration < sc.maxIterations) {
        const intervalMs = Math.max(0.1, sc.repeatIntervalHours || 1) * 3600 * 1000;
        sc.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
        addLog(`🔁 Auto-Campaign "${sc.name}": Run #${sc.currentIteration} finished. Next automatic run scheduled at ${new Date(sc.nextRunAt).toLocaleTimeString()}.`, 'info', 'campaign');
      } else {
        sc.enabled = false;
        addLog(`🏁 Auto-Campaign "${sc.name}": Reached maximum repeat iterations (${sc.maxIterations}). Marked as completed.`, 'success', 'campaign');
      }
    } else {
      sc.enabled = false;
    }

    saveScheduledCampaignsToFile();
  }
  currentScheduledCampaignId = null;
}

function addLog(message: string, type: ActivityLog['type'] = 'info', category: ActivityLog['category'] = 'system', metadata?: any) {
  const logItem: ActivityLog = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    message,
    type,
    category,
    metadata
  };
  recentLogs.unshift(logItem);
  if (recentLogs.length > 300) recentLogs.pop();
  console.log(`[WA Engine][${category?.toUpperCase()}][${type.toUpperCase()}] ${message}`);

  const activeAcc = getActiveAccount();
  const sseData = `data: ${JSON.stringify({ 
    type: 'log', 
    log: logItem, 
    stats: globalStats, 
    campaign: currentCampaign,
    activeAccountId,
    accounts: getAllAccountsList()
  })}\n\n`;
  clientsSse.forEach(client => {
    try { client.write(sseData); } catch (e) {}
  });
}

function broadcastStateUpdate() {
  const activeAcc = getActiveAccount();
  const accountsList = getAllAccountsList();

  const sseData = `data: ${JSON.stringify({
    type: 'state',
    status: activeAcc.status,
    phase: activeAcc.phase,
    phone: activeAcc.phone,
    name: activeAcc.name,
    hasQr: !!activeAcc.qr,
    qr: activeAcc.qr,
    pairingCode: activeAcc.pairingCode,
    stats: globalStats,
    config,
    campaign: currentCampaign,
    activeAccountId,
    accounts: accountsList
  })}\n\n`;
  clientsSse.forEach(client => {
    try { client.write(sseData); } catch (e) {}
  });
}

function extractMessageText(message: any): string {
  if (!message) return '';
  if (message.ephemeralMessage?.message) return extractMessageText(message.ephemeralMessage.message);
  if (message.viewOnceMessage?.message) return extractMessageText(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2?.message) return extractMessageText(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage?.message) return extractMessageText(message.documentWithCaptionMessage.message);
  if (message.editedMessage?.message) return extractMessageText(message.editedMessage.message);
  if (message.protocolMessage?.editedMessage) return extractMessageText(message.protocolMessage.editedMessage);

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.templateButtonReplyMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
    ''
  );
}

function startAccountKeepAlive(acc: AccountRuntime) {
  if (acc.keepAliveTimer) clearInterval(acc.keepAliveTimer);
  acc.keepAliveTimer = setInterval(async () => {
    try {
      if (acc.sock && acc.status === 'connected') {
        await acc.sock.sendPresenceUpdate('available').catch(() => {});
        if (acc.sock.ws && typeof acc.sock.ws.ping === 'function') {
          try { acc.sock.ws.ping(); } catch (e) {}
        }
      }
    } catch (err: any) {
      // Quiet background keepalive
    }
  }, 25000);
}

async function initAccountSocket(accountId: string, forceFresh = false) {
  const acc = accountsMap.get(accountId);
  if (!acc) return;
  if (acc.isInitializing) return;
  acc.isInitializing = true;

  try {
    // 1. Cleanly tear down any prior socket instance
    if (acc.sock) {
      try {
        acc.sock.ev.removeAllListeners('connection.update');
        acc.sock.ev.removeAllListeners('creds.update');
        acc.sock.ev.removeAllListeners('messages.upsert');
        acc.sock.ev.removeAllListeners('groups.update');
        acc.sock.ev.removeAllListeners('group-participants.update');
        if (acc.sock.ws) {
          try { acc.sock.ws.close(); } catch (e) {}
        }
        try { acc.sock.end(undefined); } catch (e) {}
      } catch (e) {}
      acc.sock = null;
    }

    if (acc.keepAliveTimer) {
      clearInterval(acc.keepAliveTimer);
      acc.keepAliveTimer = null;
    }

    if (forceFresh) {
      addLog(`[${acc.label}] Clearing session credentials for fresh pairing...`, 'info', 'system');
      if (fs.existsSync(acc.authDir)) {
        fs.rmSync(acc.authDir, { recursive: true, force: true });
      }
      acc.phone = null;
      acc.name = null;
      acc.qr = null;
      acc.pairingCode = null;
      acc.status = 'disconnected';
      acc.phase = 'idle';
      saveAccountsToFile();
    }

    if (!fs.existsSync(acc.authDir)) {
      fs.mkdirSync(acc.authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(acc.authDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ 
      version: [2, 3000, 1015901307] as [number, number, number], 
      isLatest: true 
    }));

    addLog(`[${acc.label}] Initializing Baileys Socket v${(version as [number, number, number]).join('.')}...`, 'info', 'system');
    acc.status = 'connecting';
    acc.phase = 'initializing';
    broadcastStateUpdate();

    const browserTuple: [string, string, string] = ['Ubuntu', 'Chrome', '20.0.04'];

    const socketInstance = makeWASocket({
      version: version as [number, number, number],
      logger: pino({ level: 'silent' }) as any,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }) as any)
      },
      browser: browserTuple,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      retryRequestDelayMs: 250,
      getMessage: async () => ({ conversation: '' })
    });

    acc.sock = socketInstance;

    socketInstance.ev.on('creds.update', saveCreds);

    // Group Participants Event Listener
    socketInstance.ev.on('group-participants.update', async ({ id, participants, action }: any) => {
      try {
        const formattedAction = action === 'add' ? 'joined' : action === 'remove' ? 'left' : action;
        const members = (participants || []).map((p: string) => '+' + p.split('@')[0]).join(', ');
        addLog(`👥 [${acc.label}] Group Update: ${members} ${formattedAction} (${id.split('@')[0]})`, 'info', 'group');
        broadcastStateUpdate();
      } catch (e) {}
    });

    // Connection Update Event Listener
    socketInstance.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          acc.qr = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            color: { dark: '#075e54', light: '#ffffff' }
          });
          acc.status = 'connecting';
          acc.phase = 'awaiting_pair';
          addLog(`[${acc.label}] QR Code & Pairing ready. Enter phone number to link.`, 'info', 'system');
          broadcastStateUpdate();
        } catch (err) {
          console.error(`Failed to generate QR code for ${acc.label}`, err);
        }
      }

      if (connection === 'open') {
        acc.status = 'connected';
        acc.phase = 'ready';
        acc.qr = null;
        acc.pairingCode = null;
        acc.reconnectAttemptCount = 0;
        acc.lastConnectedAt = new Date().toISOString();
        acc.phone = socketInstance.user?.id?.split(':')[0]?.split('@')[0] || socketInstance.user?.id || 'Connected User';
        acc.name = socketInstance.user?.name || socketInstance.user?.notify || acc.label;
        
        saveAccountsToFile();
        addLog(`WhatsApp socket connected successfully for "${acc.label}" as +${acc.phone} (${acc.name})`, 'success', 'system');
        
        startAccountKeepAlive(acc);
        socketInstance.sendPresenceUpdate('available').catch(() => {});
        broadcastStateUpdate();
      }

      if (connection === 'close') {
        if (acc.keepAliveTimer) {
          clearInterval(acc.keepAliveTimer);
          acc.keepAliveTimer = null;
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const shouldReconnect = !isLoggedOut;

        if (isLoggedOut) {
          acc.status = 'disconnected';
          acc.phase = 'logged_out';
          acc.qr = null;
          acc.pairingCode = null;
          acc.phone = null;
          acc.name = null;
          saveAccountsToFile();
          addLog(`[${acc.label}] Session logged out by WhatsApp. Resetting session credentials...`, 'warn', 'system');
          
          try {
            if (fs.existsSync(acc.authDir)) {
              fs.rmSync(acc.authDir, { recursive: true, force: true });
            }
          } catch (e) {}

          broadcastStateUpdate();
          setTimeout(() => {
            acc.isInitializing = false;
            initAccountSocket(acc.id, true);
          }, 2000);
        } else if (shouldReconnect) {
          acc.status = 'connecting';
          acc.phase = 'reconnecting';
          broadcastStateUpdate();

          acc.reconnectAttemptCount++;
          const retryDelay = Math.min(1500 * Math.pow(1.2, Math.min(acc.reconnectAttemptCount, 5)), 10000);
          addLog(`[${acc.label}] Re-establishing socket in ${Math.round(retryDelay / 1000)}s (Code: ${statusCode || 'transient'})...`, 'info', 'system');
          
          setTimeout(() => {
            acc.isInitializing = false;
            initAccountSocket(acc.id, false);
          }, retryDelay);
        }
      }
    });

    // Inbound Messages & Statuses Listener
    socketInstance.ev.on('messages.upsert', async ({ messages }: any) => {
      if (!messages || !messages.length) return;

      for (const msg of messages) {
        if (!msg || !msg.key) continue;
        const remoteJid = msg.key?.remoteJid;
        const fromMe = msg.key?.fromMe;

        // 1. WhatsApp Status Broadcast Event
        if (remoteJid === 'status@broadcast') {
          if (fromMe) continue;

          const participant = msg.key?.participant || msg.participant || (msg.key as any)?.participantJid || '';
          if (!participant) continue;

          const senderPhone = participant.split('@')[0] || 'Contact';
          const senderName = msg.pushName || senderPhone;

          // Auto-View Status
          if (config.autoView && acc.sock && acc.status === 'connected') {
            try {
              const delay = (config.viewDelaySeconds || 2) * 1000 + Math.random() * 800;
              setTimeout(async () => {
                try {
                  if (acc.sock && acc.status === 'connected') {
                    await acc.sock.readMessages([{
                      remoteJid: 'status@broadcast',
                      id: msg.key.id,
                      participant: participant
                    }]);
                    globalStats.statusesViewed++;
                    acc.stats.statusesViewed++;
                    
                    const statusItem: ViewedStatusItem = {
                      id: msg.key.id || String(Date.now()),
                      timestamp: new Date().toISOString(),
                      senderPhone,
                      senderName,
                      reactedEmoji: null
                    };

                    viewedStatusesLog.unshift(statusItem);
                    if (viewedStatusesLog.length > 100) viewedStatusesLog.pop();

                    addLog(`👁️ [${acc.label}] Viewed story from ${senderName} (+${senderPhone})`, 'event', 'status');
                    broadcastStateUpdate();
                  }
                } catch (err: any) {
                  console.error(`[${acc.label}] Error auto-viewing status:`, err?.message);
                }
              }, delay);
            } catch (err: any) {
              console.error(`[${acc.label}] Error scheduling status view:`, err?.message);
            }
          }

          // Auto-React to Status
          if (config.autoReact && acc.sock && acc.status === 'connected' && config.reactionEmojis?.length > 0) {
            try {
              const randomEmoji = config.reactionEmojis[Math.floor(Math.random() * config.reactionEmojis.length)];
              const reactDelay = (config.viewDelaySeconds || 2) * 1000 + 1200 + Math.random() * 1500;
              setTimeout(async () => {
                try {
                  if (acc.sock && acc.status === 'connected') {
                    try {
                      await acc.sock.sendMessage('status@broadcast', {
                        react: { text: randomEmoji, key: msg.key }
                      }, {
                        statusJidList: [participant]
                      });
                    } catch (e1) {
                      try {
                        await acc.sock.sendMessage(participant, {
                          react: { text: randomEmoji, key: msg.key }
                        });
                      } catch (e2) {}
                    }

                    globalStats.reactionsSent++;
                    acc.stats.reactionsSent++;

                    const found = viewedStatusesLog.find(s => s.senderPhone === senderPhone);
                    if (found) found.reactedEmoji = randomEmoji;

                    addLog(`🔥 [${acc.label}] Auto-reacted ${randomEmoji} to story from ${senderName}`, 'event', 'status');
                    broadcastStateUpdate();
                  }
                } catch (reactErr: any) {
                  console.error(`[${acc.label}] Error auto-reacting:`, reactErr?.message);
                }
              }, reactDelay);
            } catch (err: any) {
              console.error(`[${acc.label}] Error preparing reaction:`, err?.message);
            }
          }
        }

        // 2. Direct 1-on-1 Messages
        const isDirectMessage = remoteJid && 
          !remoteJid.endsWith('@g.us') && 
          remoteJid !== 'status@broadcast' && 
          !remoteJid.includes('@broadcast');

        if (isDirectMessage && !fromMe) {
          const text = extractMessageText(msg.message);
          const senderName = msg.pushName || 'Contact';
          const senderPhone = remoteJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

          recordContact(remoteJid, senderName);

          if (text && !text.startsWith('/skip') && !text.startsWith('!stop')) {
            addLog(`📥 [${acc.label}] DM from ${senderName} (+${senderPhone}): "${text.slice(0, 60)}"`, 'info', 'group');

            if (webhookConfig.enabled && webhookConfig.url) {
              fetch(webhookConfig.url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(webhookConfig.secret ? { 'x-webhook-secret': webhookConfig.secret } : {})
                },
                body: JSON.stringify({
                  event: 'message.received',
                  account: { id: acc.id, label: acc.label, phone: acc.phone },
                  from: senderPhone,
                  name: senderName,
                  text: text,
                  timestamp: new Date().toISOString()
                })
              }).catch((err: any) => console.warn('[Webhook Dispatch Error]', err?.message));
            }
          }
        }
      }
    });

  } catch (error: any) {
    console.error(`Fatal initialization error for ${acc.label}:`, error);
    addLog(`Fatal engine error on ${acc.label}: ${error.message}`, 'error', 'system');
    acc.status = 'disconnected';
    acc.phase = 'error';
    setTimeout(() => {
      acc.isInitializing = false;
      initAccountSocket(acc.id, false);
    }, 5000);
  } finally {
    acc.isInitializing = false;
  }
}

// Initialize all accounts concurrently on startup
async function startAllAccounts() {
  const records = loadAccountsList();
  
  records.forEach(rec => {
    const runtime: AccountRuntime = {
      id: rec.id,
      label: rec.label,
      isDefault: rec.isDefault,
      createdAt: rec.createdAt,
      phone: rec.phone || null,
      name: rec.name || null,
      status: 'disconnected',
      phase: 'idle',
      sock: null,
      qr: null,
      pairingCode: null,
      authDir: path.join(SESSIONS_BASE_DIR, rec.id),
      keepAliveTimer: null,
      reconnectAttemptCount: 0,
      isInitializing: false,
      lastConnectedAt: rec.lastConnectedAt || null,
      stats: { ...globalStats }
    };
    accountsMap.set(rec.id, runtime);
  });

  if (records.length > 0) {
    activeAccountId = records[0].id;
  }

  console.log(`[Account Manager] Initializing ${accountsMap.size} account(s) concurrently...`);
  for (const accId of accountsMap.keys()) {
    initAccountSocket(accId, false);
  }
}

// REST API Endpoints

// 0. Keep-Alive / Health Endpoint
app.get(['/api/ping', '/api/health'], (req: Request, res: Response) => {
  const activeAcc = getActiveAccount();
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    connected: activeAcc.status === 'connected',
    phone: activeAcc.phone,
    accountsCount: accountsMap.size,
    connectedAccountsCount: Array.from(accountsMap.values()).filter(a => a.status === 'connected').length,
    timestamp: new Date().toISOString()
  });
});

// Middleware for Developer REST API v1
function validateApiKey(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'] as string;
  let token = apiKeyHeader;

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Missing API key. Pass via x-api-key header or Authorization: Bearer <key>'
    });
  }

  const foundKey = apiKeys.find(k => k.key === token && k.status === 'active');
  if (!foundKey) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or revoked API key.'
    });
  }

  foundKey.requestCount = (foundKey.requestCount || 0) + 1;
  foundKey.lastUsedAt = new Date().toISOString();
  saveApiKeysToFile();

  (req as any).apiKey = foundKey;
  next();
}

// API Key Management Routes
app.get('/api/keys', (req: Request, res: Response) => {
  res.json({ keys: apiKeys });
});

app.post('/api/keys', (req: Request, res: Response) => {
  try {
    const { name, permissions } = req.body;
    const newKey: ApiKeyItem = {
      id: 'key_' + crypto.randomBytes(4).toString('hex'),
      name: (name || 'API Client').trim(),
      key: 'wge_live_' + crypto.randomBytes(16).toString('hex'),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      requestCount: 0,
      status: 'active',
      permissions: permissions || ['messages:send', 'messages:media', 'groups:read', 'groups:send', 'status:read']
    };
    apiKeys.unshift(newKey);
    saveApiKeysToFile();
    addLog(`🔑 Generated new API Key: "${newKey.name}"`, 'info', 'system');
    res.json({ success: true, key: newKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/keys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = apiKeys.findIndex(k => k.id === id);
  if (index !== -1) {
    const removed = apiKeys.splice(index, 1)[0];
    saveApiKeysToFile();
    addLog(`🗑️ Revoked API Key: "${removed.name}"`, 'warn', 'system');
    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: 'API key not found' });
  }
});

// Webhook Configuration
app.get('/api/webhook/config', (req: Request, res: Response) => {
  res.json(webhookConfig);
});

app.post('/api/webhook/config', (req: Request, res: Response) => {
  try {
    const { url, secret, enabled } = req.body;
    webhookConfig = {
      ...webhookConfig,
      url: (url || '').trim(),
      secret: (secret || '').trim(),
      enabled: !!enabled
    };
    saveWebhookToFile();
    addLog(`🌐 Webhook config updated: ${webhookConfig.enabled ? webhookConfig.url : 'Disabled'}`, 'info', 'system');
    res.json({ success: true, config: webhookConfig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MULTI-ACCOUNT MANAGEMENT REST APIS
// ==========================================

// 1. List All Accounts
app.get('/api/accounts', (req: Request, res: Response) => {
  res.json({
    success: true,
    activeAccountId,
    accounts: getAllAccountsList()
  });
});

// 2. Add New WhatsApp Account
app.post('/api/accounts', async (req: Request, res: Response) => {
  try {
    const { label } = req.body;
    const accountIndex = accountsMap.size + 1;
    const newId = 'acc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newLabel = (label && label.trim()) ? label.trim() : `WhatsApp Line ${accountIndex}`;

    const newRuntime: AccountRuntime = {
      id: newId,
      label: newLabel,
      isDefault: accountsMap.size === 0,
      createdAt: new Date().toISOString(),
      phone: null,
      name: null,
      status: 'disconnected',
      phase: 'idle',
      sock: null,
      qr: null,
      pairingCode: null,
      authDir: path.join(SESSIONS_BASE_DIR, newId),
      keepAliveTimer: null,
      reconnectAttemptCount: 0,
      isInitializing: false,
      lastConnectedAt: null,
      stats: { ...globalStats }
    };

    accountsMap.set(newId, newRuntime);
    saveAccountsToFile();
    activeAccountId = newId;

    addLog(`📱 Added new WhatsApp account "${newLabel}". Initializing background socket...`, 'info', 'system');
    
    // Start its independent socket
    initAccountSocket(newId, false);
    broadcastStateUpdate();

    res.json({
      success: true,
      account: {
        id: newRuntime.id,
        label: newRuntime.label,
        status: newRuntime.status,
        phase: newRuntime.phase,
        isDefault: newRuntime.isDefault
      },
      activeAccountId: newId,
      accounts: getAllAccountsList()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Switch / Select Active Account
app.post('/api/accounts/:id/select', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!accountsMap.has(id)) {
    return res.status(404).json({ error: 'Account not found' });
  }
  activeAccountId = id;
  const acc = accountsMap.get(id)!;
  addLog(`🔄 Switched active view to account: "${acc.label}"`, 'info', 'system');
  broadcastStateUpdate();
  res.json({
    success: true,
    activeAccountId,
    account: {
      id: acc.id,
      label: acc.label,
      phone: acc.phone,
      status: acc.status
    }
  });
});

// 4. Disconnect / Logout Specific Account
app.post('/api/accounts/:id/disconnect', async (req: Request, res: Response) => {
  const { id } = req.params;
  const acc = accountsMap.get(id);
  if (!acc) {
    return res.status(404).json({ error: 'Account not found' });
  }

  try {
    addLog(`[${acc.label}] User requested disconnect.`, 'info', 'system');
    if (acc.sock) {
      try { await acc.sock.logout(); } catch (e) {}
      try { acc.sock.end(undefined); } catch (e) {}
    }

    acc.status = 'disconnected';
    acc.phase = 'closed';
    acc.phone = null;
    acc.name = null;
    acc.qr = null;
    acc.pairingCode = null;

    if (fs.existsSync(acc.authDir)) {
      fs.rmSync(acc.authDir, { recursive: true, force: true });
    }
    saveAccountsToFile();

    setTimeout(() => initAccountSocket(acc.id, true), 1500);

    broadcastStateUpdate();
    res.json({ success: true, message: `Account "${acc.label}" disconnected and session cleared.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Delete Account
app.delete('/api/accounts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const acc = accountsMap.get(id);
  if (!acc) {
    return res.status(404).json({ error: 'Account not found' });
  }

  if (accountsMap.size <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining account. You can reset or disconnect it instead.' });
  }

  try {
    if (acc.sock) {
      try { acc.sock.logout(); } catch (e) {}
      try { acc.sock.end(undefined); } catch (e) {}
    }
    if (acc.keepAliveTimer) {
      clearInterval(acc.keepAliveTimer);
    }
    if (fs.existsSync(acc.authDir)) {
      try { fs.rmSync(acc.authDir, { recursive: true, force: true }); } catch (e) {}
    }

    accountsMap.delete(id);
    saveAccountsToFile();

    if (activeAccountId === id) {
      activeAccountId = accountsMap.keys().next().value || 'acc_primary';
    }

    addLog(`🗑️ Removed WhatsApp account "${acc.label}".`, 'warn', 'system');
    broadcastStateUpdate();
    res.json({ success: true, activeAccountId, accounts: getAllAccountsList() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reset Specific Account
app.post('/api/accounts/:id/reset', async (req: Request, res: Response) => {
  const { id } = req.params;
  const acc = accountsMap.get(id);
  if (!acc) return res.status(404).json({ error: 'Account not found' });

  try {
    addLog(`[${acc.label}] User triggered force reset of session credentials.`, 'info', 'system');
    await initAccountSocket(acc.id, true);
    res.json({ success: true, message: `Session storage cleared and socket restarted for "${acc.label}".` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// STATUS, QR & PAIRING ENDPOINTS
// ==========================================

// 1. Engine Status
app.get('/api/status', (req: Request, res: Response) => {
  const activeAcc = getActiveAccount();
  const accountsList = getAllAccountsList();

  res.json({
    status: activeAcc.status,
    phase: activeAcc.phase,
    phone: activeAcc.phone,
    name: activeAcc.name,
    hasQr: !!activeAcc.qr,
    qr: activeAcc.qr,
    pairingCode: activeAcc.pairingCode,
    autoReact: config.autoReact,
    autoView: config.autoView,
    reactionEmojis: config.reactionEmojis,
    viewDelaySeconds: config.viewDelaySeconds,
    stats: globalStats,
    campaign: currentCampaign,
    activeAccountId,
    accounts: accountsList
  });
});

// 2. QR Code endpoint
app.get('/api/qr', (req: Request, res: Response) => {
  const { accountId } = req.query;
  const acc = getAccount(String(accountId || ''));
  res.json({
    qr: acc.qr,
    status: acc.status,
    phase: acc.phase,
    accountId: acc.id
  });
});

// 3. 8-Digit Pairing Code API (Supports multi-account & individual line pairing)
app.post('/api/pairing-code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, accountId } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Please provide a valid phone number in request body.' });
    }

    const cleanedNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    if (cleanedNumber.length < 8 || cleanedNumber.length > 16) {
      return res.status(400).json({ error: 'Invalid phone number format. Include country code (e.g. 2347043537401 or 14155552671).' });
    }

    const targetAccount = getAccount(accountId || activeAccountId);

    if (targetAccount.status === 'connected') {
      return res.status(400).json({ 
        error: `Account "${targetAccount.label}" is already paired & connected (+${targetAccount.phone})! Click "Connect Another Account" above to link a second WhatsApp line, or disconnect this one first.` 
      });
    }

    // Ensure socket is initialized and connected to Baileys WS
    if (!targetAccount.sock || !targetAccount.sock.ws || targetAccount.sock.ws.readyState !== 1) {
      addLog(`[${targetAccount.label}] Connecting socket for pairing code request...`, 'info', 'system');
      await initAccountSocket(targetAccount.id, false);
      let retries = 0;
      while ((!targetAccount.sock || !targetAccount.sock.ws || targetAccount.sock.ws.readyState !== 1) && retries < 18) {
        await new Promise(r => setTimeout(r, 400));
        retries++;
      }
    }

    if (!targetAccount.sock || typeof targetAccount.sock.requestPairingCode !== 'function') {
      throw new Error(`Socket engine not ready for ${targetAccount.label}. Please click "Reset Session" and retry.`);
    }

    addLog(`[${targetAccount.label}] Requesting official 8-digit Pairing Code for +${cleanedNumber}...`, 'info', 'system');
    
    const code = await targetAccount.sock.requestPairingCode(cleanedNumber);
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

    targetAccount.pairingCode = formattedCode;
    addLog(`[${targetAccount.label}] Pairing code generated: ${formattedCode}`, 'success', 'system');
    broadcastStateUpdate();

    res.json({
      success: true,
      accountId: targetAccount.id,
      accountLabel: targetAccount.label,
      phoneNumber: cleanedNumber,
      code: formattedCode,
      rawCode: code
    });
  } catch (error: any) {
    console.error('Pairing code request error:', error);
    addLog(`Pairing code request failed: ${error.message}`, 'error', 'system');
    res.status(500).json({
      error: error.message || 'Failed to request pairing code. If session is stuck, click "Reset Session" and retry.'
    });
  }
});

// 4. Force Reset & Reconnect Session (Supports specific account or active account)
app.post('/api/reset-session', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;
    const targetAccount = getAccount(accountId || activeAccountId);
    addLog(`User triggered Force Reset of session for "${targetAccount.label}".`, 'info', 'system');
    await initAccountSocket(targetAccount.id, true);
    res.json({ success: true, message: `Session storage cleared and socket restarted for "${targetAccount.label}".` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Logout / Disconnect (Supports specific account or active account)
app.post('/api/logout', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;
    const targetAccount = getAccount(accountId || activeAccountId);
    addLog(`User requested session disconnect for "${targetAccount.label}".`, 'info', 'system');
    
    if (targetAccount.sock) {
      try { await targetAccount.sock.logout(); } catch (e) {}
      try { targetAccount.sock.end(undefined); } catch (e) {}
    }
    
    targetAccount.status = 'disconnected';
    targetAccount.phase = 'closed';
    targetAccount.phone = null;
    targetAccount.name = null;
    targetAccount.qr = null;
    targetAccount.pairingCode = null;

    if (fs.existsSync(targetAccount.authDir)) {
      fs.rmSync(targetAccount.authDir, { recursive: true, force: true });
    }
    saveAccountsToFile();

    setTimeout(() => initAccountSocket(targetAccount.id, true), 1500);

    broadcastStateUpdate();
    res.json({ success: true, message: `Session for "${targetAccount.label}" disconnected and cleared.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PUBLIC DEVELOPER REST API v1
// ==========================================

// 1. Connection Status Check
app.get('/api/v1/status', validateApiKey, (req: Request, res: Response) => {
  const activeAcc = getActiveAccount();
  res.json({
    status: activeAcc.status,
    phase: activeAcc.phase,
    phone: activeAcc.phone,
    name: activeAcc.name,
    connected: activeAcc.status === 'connected',
    uptime: Math.floor(process.uptime()),
    accounts: getAllAccountsList(),
    timestamp: new Date().toISOString()
  });
});

// 2. Send WhatsApp Message
app.post('/api/v1/messages/send', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { to, message, accountId } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: "to" and "message" are required.' });
    }

    const acc = getAccount(accountId);
    if (!acc.sock || acc.status !== 'connected') {
      return res.status(503).json({ error: `WhatsApp socket for "${acc.label}" is not connected. Pair account in dashboard first.` });
    }

    let cleanNumber = String(to).replace(/[^0-9]/g, '');
    let jid = '';
    if (String(to).endsWith('@g.us') || String(to).endsWith('@s.whatsapp.net')) {
      jid = to;
    } else {
      if (!cleanNumber || cleanNumber.length < 8) {
        return res.status(400).json({ error: 'Invalid destination phone number. Include full country dial code.' });
      }
      jid = `${cleanNumber}@s.whatsapp.net`;
    }

    const parsedText = parseSpintax(message);
    const result = await acc.sock.sendMessage(jid, { text: parsedText });

    globalStats.campaignMessagesSent++;
    acc.stats.campaignMessagesSent++;
    addLog(`🚀 [REST API][${acc.label}] Sent message to ${cleanNumber || jid}: "${parsedText.slice(0, 45)}..."`, 'success', 'system');
    broadcastStateUpdate();

    res.json({
      success: true,
      messageId: result?.key?.id || ('msg_' + Date.now()),
      to: jid,
      accountId: acc.id,
      accountLabel: acc.label,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('API Send Message Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Send WhatsApp Media
app.post('/api/v1/messages/send-media', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { to, mediaUrl, base64, mimeType, caption, fileName, accountId } = req.body;

    if (!to || (!mediaUrl && !base64)) {
      return res.status(400).json({ error: 'Missing required fields: "to" and either "mediaUrl" or "base64" are required.' });
    }

    const acc = getAccount(accountId);
    if (!acc.sock || acc.status !== 'connected') {
      return res.status(503).json({ error: `WhatsApp socket for "${acc.label}" is not connected.` });
    }

    let cleanNumber = String(to).replace(/[^0-9]/g, '');
    let jid = String(to).includes('@') ? to : `${cleanNumber}@s.whatsapp.net`;

    let buffer: Buffer;
    if (base64) {
      const cleanB64 = base64.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(cleanB64, 'base64');
    } else {
      const fetchRes = await fetch(mediaUrl);
      if (!fetchRes.ok) throw new Error(`Failed to download media from URL: ${fetchRes.statusText}`);
      const arrayBuf = await fetchRes.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    }

    const type = (mimeType || 'image/jpeg').toLowerCase();
    let messagePayload: any = {};

    if (type.startsWith('image/')) {
      messagePayload = { image: buffer, caption: caption || '' };
    } else if (type.startsWith('audio/')) {
      messagePayload = { audio: buffer, mimetype: type, ptt: true };
    } else {
      messagePayload = { document: buffer, mimetype: type, fileName: fileName || 'document', caption: caption || '' };
    }

    const result = await acc.sock.sendMessage(jid, messagePayload);
    addLog(`📎 [REST API][${acc.label}] Sent media to ${cleanNumber || jid}`, 'success', 'system');
    broadcastStateUpdate();

    res.json({
      success: true,
      messageId: result?.key?.id,
      to: jid,
      accountId: acc.id,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. List Joined Groups
app.get('/api/v1/groups', validateApiKey, async (req: Request, res: Response) => {
  try {
    const acc = getAccount(req.query.accountId as string);
    if (!acc.sock || acc.status !== 'connected') {
      return res.status(503).json({ error: `WhatsApp socket for "${acc.label}" is not connected.` });
    }
    const groups = await acc.sock.groupFetchAllParticipating();
    const groupList = Object.values(groups).map((g: any) => ({
      id: g.id,
      subject: g.subject,
      size: g.size || g.participants?.length || 0,
      creation: g.creation,
      owner: g.owner
    }));
    res.json({ success: true, count: groupList.length, groups: groupList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Send Message to Group
app.post('/api/v1/groups/send', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { groupId, message, accountId } = req.body;
    if (!groupId || !message) {
      return res.status(400).json({ error: 'Fields "groupId" and "message" are required.' });
    }
    const acc = getAccount(accountId);
    if (!acc.sock || acc.status !== 'connected') {
      return res.status(503).json({ error: `WhatsApp socket for "${acc.label}" is not connected.` });
    }

    const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
    const parsedText = parseSpintax(message);
    const result = await acc.sock.sendMessage(jid, { text: parsedText });

    globalStats.campaignMessagesSent++;
    acc.stats.campaignMessagesSent++;
    addLog(`👥 [REST API][${acc.label}] Dispatched message to group (${jid})`, 'success', 'group');
    broadcastStateUpdate();

    res.json({
      success: true,
      messageId: result?.key?.id,
      groupId: jid,
      accountId: acc.id,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Live Engine Stats
app.get('/api/v1/stats', validateApiKey, (req: Request, res: Response) => {
  const activeAcc = getActiveAccount();
  res.json({
    success: true,
    stats: globalStats,
    connected: activeAcc.status === 'connected',
    phone: activeAcc.phone,
    uptime: Math.floor(process.uptime()),
    accounts: getAllAccountsList()
  });
});

function prepareMediaPayload(mediaUrlOrData: string, mediaType: 'image' | 'video' = 'image'): { image?: any; video?: any } {
  if (mediaUrlOrData.startsWith('data:')) {
    const base64Index = mediaUrlOrData.indexOf(';base64,');
    if (base64Index !== -1) {
      const mime = mediaUrlOrData.slice(5, base64Index);
      const base64Data = mediaUrlOrData.slice(base64Index + 8);
      const buffer = Buffer.from(base64Data, 'base64');
      if (mime.startsWith('video/') || mediaType === 'video') {
        return { video: buffer };
      }
      return { image: buffer };
    }
  }
  if (mediaType === 'video' || mediaUrlOrData.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i)) {
    return { video: { url: mediaUrlOrData } };
  }
  return { image: { url: mediaUrlOrData } };
}

function parseColorToArgb(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    return parseInt('FF' + clean, 16);
  }
  if (clean.length === 8) {
    return parseInt(clean, 16);
  }
  return 0xFF075E54;
}

function getTargetStatusJids(targetTags?: string[], targetContactJids?: string[]): string[] {
  let targetJids: string[] = [];
  if (Array.isArray(targetContactJids) && targetContactJids.length > 0) {
    targetJids = targetContactJids.map(j => j.includes('@') ? j : `${j.replace(/[^0-9]/g, '')}@s.whatsapp.net`);
  } else if (Array.isArray(targetTags) && targetTags.length > 0) {
    const tagged = Array.from(contactsMap.values()).filter(c => 
      c.tags?.some(t => targetTags.includes(t))
    );
    targetJids = tagged.map(c => c.jid);
  } else {
    targetJids = Array.from(contactsMap.keys());
  }

  return targetJids.filter(jid => 
    jid && 
    !jid.endsWith('@g.us') && 
    jid !== 'status@broadcast' && 
    !jid.includes('@broadcast')
  );
}

// 6. Post Status Update (High-Engagement Story Broadcast)
app.post('/api/status/post', async (req: Request, res: Response) => {
  try {
    const { 
      text, 
      imageUrl, 
      videoUrl, 
      backgroundColor = '#075e54', 
      font = 1,
      mediaType = 'text',
      targetTags,
      targetContactJids,
      broadcastToAllAccounts = false,
      accountId
    } = req.body;

    const effectiveText = text?.trim() || '';
    const hasMedia = !!(imageUrl || videoUrl);

    if (!effectiveText && !hasMedia) {
      return res.status(400).json({ error: 'Provide either status text, photo, or video to broadcast.' });
    }

    // Resolve target account sockets
    const targetSockets: { id: string; label: string; sockInstance: any }[] = [];
    
    if (broadcastToAllAccounts) {
      accountsMap.forEach(acc => {
        if (acc.sock && acc.status === 'connected') {
          targetSockets.push({ id: acc.id, label: acc.label, sockInstance: acc.sock });
        }
      });
    }

    if (targetSockets.length === 0) {
      const targetAcc = getAccount(accountId || activeAccountId);
      if (!targetAcc.sock || targetAcc.status !== 'connected') {
        return res.status(400).json({ error: `Account "${targetAcc.label}" is not connected. Link your device first.` });
      }
      targetSockets.push({
        id: targetAcc.id,
        label: targetAcc.label,
        sockInstance: targetAcc.sock
      });
    }

    const targetJids = getTargetStatusJids(targetTags, targetContactJids);
    const audienceDesc = targetTags && targetTags.length > 0 
      ? `Tagged contacts [${targetTags.join(', ')}] (${targetJids.length} contacts)`
      : targetContactJids && targetContactJids.length > 0
      ? `Selected audience (${targetJids.length} contacts)`
      : `All Contacts (${targetJids.length > 0 ? targetJids.length : 'All Contacts'})`;

    addLog(`📢 Broadcasting status story across ${targetSockets.length} account(s) to ${audienceDesc}...`, 'info', 'status');

    let sendResults = [];
    for (const item of targetSockets) {
      try {
        const msgOptions = targetJids.length > 0 ? { statusJidList: targetJids } : {};

        if (videoUrl || mediaType === 'video') {
          const vidPayload = prepareMediaPayload(videoUrl || imageUrl, 'video');
          await item.sockInstance.sendMessage('status@broadcast', {
            ...vidPayload,
            caption: effectiveText
          }, msgOptions);
        } else if (imageUrl || mediaType === 'image') {
          const imgPayload = prepareMediaPayload(imageUrl, 'image');
          await item.sockInstance.sendMessage('status@broadcast', {
            ...imgPayload,
            caption: effectiveText
          }, msgOptions);
        } else {
          await item.sockInstance.sendMessage('status@broadcast', {
            text: effectiveText,
            backgroundColor: parseColorToArgb(backgroundColor),
            font: Number(font) || 1
          }, msgOptions);
        }

        sendResults.push({ id: item.id, label: item.label, success: true });
        addLog(`📢✓ Story published successfully from ${item.label}!`, 'success', 'status');
      } catch (sendErr: any) {
        console.error(`Status broadcast error for ${item.label}:`, sendErr);
        sendResults.push({ id: item.id, label: item.label, success: false, error: sendErr.message });
        addLog(`❌ Failed to publish story from ${item.label}: ${sendErr.message}`, 'error', 'status');
      }
    }

    const anySuccess = sendResults.some(r => r.success);
    if (anySuccess) {
      globalStats.broadcastsSent++;
      
      const historyItem: BroadcastHistoryItem = {
        id: 'bcast_' + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        type: (videoUrl || mediaType === 'video') ? 'video' : (imageUrl || mediaType === 'image') ? 'image' : 'text',
        text: effectiveText,
        mediaUrl: imageUrl || videoUrl || undefined,
        backgroundColor: backgroundColor || '#075e54',
        font: Number(font) || 1,
        recipientsCount: targetJids.length,
        accountId: targetSockets[0]?.id,
        accountLabel: targetSockets.map(s => s.label).join(', '),
        success: true
      };

      broadcastHistory.unshift(historyItem);
      if (broadcastHistory.length > 100) broadcastHistory.pop();
      saveBroadcastHistoryToFile();

      broadcastStateUpdate();
      return res.json({
        success: true,
        message: `Status story broadcasted successfully to ${audienceDesc}!`,
        recipientsCount: targetJids.length,
        accountsDispatched: sendResults
      });
    } else {
      return res.status(500).json({
        error: sendResults[0]?.error || 'Failed to broadcast status to WhatsApp.'
      });
    }
  } catch (error: any) {
    console.error('Status post endpoint fatal error:', error);
    addLog(`Status broadcast failed: ${error.message}`, 'error', 'status');
    res.status(500).json({ error: error.message || 'Fatal status broadcast error.' });
  }
});

// Broadcast History API
app.get('/api/status/broadcast-history', (req: Request, res: Response) => {
  res.json({
    success: true,
    history: broadcastHistory,
    totalBroadcasts: globalStats.broadcastsSent
  });
});

app.delete('/api/status/broadcast-history', (req: Request, res: Response) => {
  broadcastHistory = [];
  saveBroadcastHistoryToFile();
  res.json({ success: true, message: 'Broadcast history cleared.' });
});

// 7. Viewed Statuses Log Feed
app.get('/api/status/viewed-log', (req: Request, res: Response) => {
  res.json({
    statuses: viewedStatusesLog,
    totalViewed: globalStats.statusesViewed,
    totalReacted: globalStats.reactionsSent
  });
});

// 7B. AD NETWORK POOLED GROUPS & ADVERTS APIS
app.get('/api/ad-network/pooled-groups', (req: Request, res: Response) => {
  res.json({ success: true, count: serverPooledGroups.length, groups: serverPooledGroups });
});

app.post('/api/ad-network/pooled-groups', (req: Request, res: Response) => {
  try {
    const groupData = req.body;
    if (!groupData || !groupData.id) {
      return res.status(400).json({ error: 'Invalid group data: id is required.' });
    }
    const existingIndex = serverPooledGroups.findIndex(g => g.id === groupData.id);
    if (existingIndex !== -1) {
      serverPooledGroups[existingIndex] = { ...serverPooledGroups[existingIndex], ...groupData };
    } else {
      serverPooledGroups.unshift(groupData);
    }
    savePooledGroupsToFile();
    addLog(`🌐 Pooled Group registered: "${groupData.subject || groupData.id}"`, 'info', 'group');
    res.json({ success: true, group: groupData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ad-network/pooled-groups/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    serverPooledGroups = serverPooledGroups.filter(g => g.id !== id && g.id.replace(/[^a-zA-Z0-9_-]/g, '_') !== id);
    savePooledGroupsToFile();
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ad-network/adverts', (req: Request, res: Response) => {
  res.json({ success: true, count: serverAdverts.length, adverts: serverAdverts });
});

app.post('/api/ad-network/adverts', (req: Request, res: Response) => {
  try {
    const advertData = req.body;
    if (!advertData || !advertData.id || !advertData.title) {
      return res.status(400).json({ error: 'Invalid advert: id and title are required.' });
    }
    const existingIndex = serverAdverts.findIndex(a => a.id === advertData.id);
    if (existingIndex !== -1) {
      serverAdverts[existingIndex] = { ...serverAdverts[existingIndex], ...advertData };
    } else {
      serverAdverts.unshift(advertData);
    }
    saveAdvertsToFile();
    addLog(`📢 New Advert Campaign Published: "${advertData.title}"`, 'success', 'campaign');
    res.json({ success: true, advert: advertData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ad-network/adverts/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    serverAdverts = serverAdverts.filter(a => a.id !== id);
    saveAdvertsToFile();
    addLog(`🗑️ Removed advert campaign: "${id}"`, 'info', 'campaign');
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GROUP MANAGEMENT & CONTACT TAGGING APIS
app.get('/api/groups', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query;
    let targetAcc = getAccount(String(accountId || ''));

    // If specified account is not connected, try to find any connected account
    if (!targetAcc.sock || targetAcc.status !== 'connected') {
      const anyConnected = Array.from(accountsMap.values()).find(a => a.sock && a.status === 'connected');
      if (anyConnected) {
        targetAcc = anyConnected;
      } else {
        return res.status(400).json({ error: 'WhatsApp is not connected on any account.' });
      }
    }

    const groupsData = await targetAcc.sock.groupFetchAllParticipating();
    const botJid = targetAcc.sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const currentPhone = targetAcc.phone;

    const groupList = Object.values(groupsData).map((g: any) => {
      const isBotAdmin = !!g.participants?.find((p: any) => (p.id === botJid || (currentPhone && p.id?.includes(currentPhone))) && (p.admin === 'admin' || p.admin === 'superadmin'));
      
      if (Array.isArray(g.participants)) {
        g.participants.forEach((p: any) => {
          recordContact(p.id, undefined, g.id, g.subject || 'Unnamed Group');
        });
      }

      const tags = groupTagsMap.get(g.id) || [];

      return {
        id: g.id,
        subject: g.subject || 'Unnamed Group',
        subjectOwner: g.subjectOwner,
        subjectTime: g.subjectTime,
        size: g.size || g.participants?.length || 0,
        creation: g.creation,
        owner: g.owner,
        desc: g.desc ? String(g.desc) : '',
        isBotAdmin,
        announce: !!g.announce,
        restrict: !!g.restrict,
        participantsCount: g.participants?.length || 0,
        tags
      };
    });

    saveContactsToFile();

    res.json({
      success: true,
      accountId: targetAcc.id,
      accountLabel: targetAcc.label,
      groups: groupList
    });
  } catch (err: any) {
    console.error('Failed to fetch groups:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch WhatsApp groups.' });
  }
});

// Fetch detailed group metadata
app.get('/api/groups/:jid', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query;
    let targetAcc = getAccount(String(accountId || ''));

    if (!targetAcc.sock || targetAcc.status !== 'connected') {
      const anyConnected = Array.from(accountsMap.values()).find(a => a.sock && a.status === 'connected');
      if (anyConnected) targetAcc = anyConnected;
      else return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const jid = req.params.jid;
    const metadata = await targetAcc.sock.groupMetadata(jid);
    const botJid = targetAcc.sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const currentPhone = targetAcc.phone;
    const isBotAdmin = !!metadata.participants?.find((p: any) => (p.id === botJid || (currentPhone && p.id?.includes(currentPhone))) && (p.admin === 'admin' || p.admin === 'superadmin'));

    const groupTags = groupTagsMap.get(jid) || [];

    const enrichedParticipants = (metadata.participants || []).map((p: any) => {
      const contact = recordContact(p.id, undefined, metadata.id, metadata.subject);
      return {
        id: p.id,
        admin: p.admin,
        phone: contact.phone,
        name: contact.name,
        tags: contact.tags || ['member'],
        notes: contact.notes || ''
      };
    });

    saveContactsToFile();

    res.json({
      success: true,
      group: {
        id: metadata.id,
        subject: metadata.subject,
        owner: metadata.owner,
        desc: metadata.desc ? String(metadata.desc) : '',
        participants: enrichedParticipants,
        size: metadata.participants?.length || 0,
        isBotAdmin,
        announce: !!metadata.announce,
        restrict: !!metadata.restrict,
        tags: groupTags
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tag Definitions CRUD
app.get('/api/tags', (req: Request, res: Response) => {
  res.json({
    success: true,
    tags: tagDefinitions
  });
});

app.post('/api/tags', (req: Request, res: Response) => {
  try {
    const { action, tag, id } = req.body;
    
    if (action === 'create' && tag) {
      const newTag: TagDefinition = {
        id: (tag.name || 'tag').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36).substring(4),
        name: tag.name?.trim() || 'New Tag',
        color: tag.color || '#3b82f6',
        description: tag.description || '',
        createdAt: new Date().toISOString()
      };
      tagDefinitions.push(newTag);
      saveTagsToFile();
      addLog(`🏷️ Created custom contact tag: "${newTag.name}"`, 'info', 'group');
      return res.json({ success: true, tags: tagDefinitions, tag: newTag });
    }

    if (action === 'update' && tag && id) {
      const index = tagDefinitions.findIndex(t => t.id === id);
      if (index !== -1) {
        tagDefinitions[index] = { ...tagDefinitions[index], ...tag, id };
        saveTagsToFile();
        addLog(`🏷️ Updated tag: "${tagDefinitions[index].name}"`, 'info', 'group');
        return res.json({ success: true, tags: tagDefinitions });
      }
      return res.status(404).json({ error: 'Tag not found' });
    }

    if (action === 'delete' && id) {
      tagDefinitions = tagDefinitions.filter(t => t.id !== id);
      saveTagsToFile();
      
      contactsMap.forEach(c => {
        if (c.tags.includes(id)) {
          c.tags = c.tags.filter(t => t !== id);
        }
      });
      saveContactsToFile();

      addLog(`🏷️ Deleted contact tag: "${id}"`, 'info', 'group');
      return res.json({ success: true, tags: tagDefinitions });
    }

    res.status(400).json({ error: 'Invalid tag action' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contacts Query API
app.get('/api/contacts', (req: Request, res: Response) => {
  try {
    const { tag, search, groupJid } = req.query;
    let list = Array.from(contactsMap.values());

    if (groupJid) {
      list = list.filter(c => c.groupJids?.includes(String(groupJid)));
    }

    if (tag && tag !== 'all') {
      const tagStr = String(tag);
      list = list.filter(c => c.tags?.includes(tagStr));
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.groupNames && c.groupNames.some(gn => gn.toLowerCase().includes(q)))
      );
    }

    res.json({
      success: true,
      total: list.length,
      contacts: list
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk / Single Contact Tagging
app.post('/api/contacts/tag', (req: Request, res: Response) => {
  try {
    const { jids, addTags = [], removeTags = [], replaceTags } = req.body;
    if (!Array.isArray(jids) || jids.length === 0) {
      return res.status(400).json({ error: 'Please provide array of contact JIDs.' });
    }

    let updatedCount = 0;
    jids.forEach(jid => {
      const contact = recordContact(jid);
      if (replaceTags && Array.isArray(replaceTags)) {
        contact.tags = [...replaceTags];
      } else {
        if (addTags.length > 0) {
          contact.tags = Array.from(new Set([...contact.tags, ...addTags]));
        }
        if (removeTags.length > 0) {
          contact.tags = contact.tags.filter(t => !removeTags.includes(t));
        }
      }
      contact.lastUpdated = new Date().toISOString();
      contactsMap.set(jid, contact);
      updatedCount++;
    });

    saveContactsToFile();
    addLog(`🏷️ Updated tags on ${updatedCount} contacts.`, 'success', 'group');

    res.json({
      success: true,
      updatedCount,
      contacts: jids.map(jid => contactsMap.get(jid))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Group Tagging
app.post('/api/contacts/group-tag', async (req: Request, res: Response) => {
  try {
    const { jid, groupSubject, tags = [], tagParticipants = true, accountId } = req.body;
    if (!jid) return res.status(400).json({ error: 'Provide group jid.' });

    groupTagsMap.set(jid, tags);
    saveGroupTagsToFile();

    const targetAcc = getAccount(accountId);
    let participantsTaggedCount = 0;

    if (tagParticipants && targetAcc.sock && targetAcc.status === 'connected') {
      try {
        const metadata = await targetAcc.sock.groupMetadata(jid);
        if (metadata && metadata.participants) {
          metadata.participants.forEach((p: any) => {
            recordContact(p.id, undefined, jid, groupSubject || metadata.subject, tags);
            participantsTaggedCount++;
          });
          saveContactsToFile();
        }
      } catch (e) {}
    }

    addLog(`🏷️ Tagged group "${groupSubject || jid.split('@')[0]}" with [${tags.join(', ')}] (${participantsTaggedCount} participants tagged)`, 'success', 'group');

    res.json({
      success: true,
      jid,
      tags,
      participantsTaggedCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Contact Info
app.post('/api/contacts/edit', (req: Request, res: Response) => {
  try {
    const { jid, name, notes, tags } = req.body;
    if (!jid) return res.status(400).json({ error: 'Provide contact jid.' });

    const contact = recordContact(jid);
    if (name !== undefined) contact.name = name;
    if (notes !== undefined) contact.notes = notes;
    if (tags !== undefined && Array.isArray(tags)) contact.tags = tags;
    contact.lastUpdated = new Date().toISOString();

    contactsMap.set(jid, contact);
    saveContactsToFile();

    res.json({ success: true, contact });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8B. CONTACT GAIN & VCF GENERATION APIS
app.post('/api/contacts/vcf/generate', async (req: Request, res: Response) => {
  try {
    const { 
      jid, 
      tagIds = [], 
      contactJids = [], 
      prefix, 
      excludeBot = true,
      includeAdminsOnly = false,
      accountId
    } = req.body;

    let targetContacts: { phone: string; name: string; org?: string; note?: string }[] = [];
    let groupSubject = 'WhatsApp Contacts';

    const targetAcc = getAccount(accountId);
    const botPhone = targetAcc.phone;

    if (jid) {
      if (targetAcc.sock && targetAcc.status === 'connected') {
        const metadata = await targetAcc.sock.groupMetadata(jid);
        groupSubject = metadata.subject || 'WhatsApp Group';
        const cleanGroupName = groupSubject.replace(/[^\w\s-]/g, '').trim();

        (metadata.participants || []).forEach((p: any, idx: number) => {
          const rawPhone = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
          if (excludeBot && botPhone && rawPhone.includes(botPhone)) return;
          if (includeAdminsOnly && p.admin !== 'admin' && p.admin !== 'superadmin') return;

          const contact = contactsMap.get(p.id);
          const contactPrefix = prefix !== undefined ? prefix : `[${cleanGroupName.slice(0, 15)}] `;
          const contactName = contact?.name && !contact.name.startsWith('+') 
            ? `${contactPrefix}${contact.name}` 
            : `${contactPrefix}Gain ${idx + 1} (+${rawPhone})`;

          targetContacts.push({
            phone: rawPhone,
            name: contactName,
            org: groupSubject,
            note: `Extracted from group: ${groupSubject} (${metadata.id})`
          });
        });
      } else {
        const groupMembers = Array.from(contactsMap.values()).filter(c => c.groupJids?.includes(jid));
        groupMembers.forEach((c, idx) => {
          const contactPrefix = prefix !== undefined ? prefix : '[Gain] ';
          targetContacts.push({
            phone: c.phone,
            name: `${contactPrefix}${c.name || 'Member ' + (idx + 1)}`,
            org: groupSubject
          });
        });
      }
    } else if (tagIds.length > 0) {
      const tagged = Array.from(contactsMap.values()).filter(c => 
        c.tags?.some(t => tagIds.includes(t))
      );
      tagged.forEach((c, idx) => {
        const contactPrefix = prefix !== undefined ? prefix : '[Tagged] ';
        targetContacts.push({
          phone: c.phone,
          name: `${contactPrefix}${c.name || 'Contact ' + (idx + 1)}`,
          org: c.tags.join(', ')
        });
      });
      groupSubject = `Tagged Contacts (${tagIds.join('_')})`;
    } else if (contactJids.length > 0) {
      contactJids.forEach((cJid: string, idx: number) => {
        const c = contactsMap.get(cJid) || recordContact(cJid);
        const contactPrefix = prefix !== undefined ? prefix : '[Gain] ';
        targetContacts.push({
          phone: c.phone,
          name: `${contactPrefix}${c.name || 'Contact ' + (idx + 1)}`
        });
      });
      groupSubject = 'Selected Contacts';
    }

    const vcfContent = buildVcfContent(targetContacts);
    const safeFileName = `${groupSubject.toLowerCase().replace(/[^a-z0-9]/g, '_')}_contacts_${Date.now().toString(36)}.vcf`;

    res.json({
      success: true,
      fileName: safeFileName,
      count: targetContacts.length,
      sampleContacts: targetContacts.slice(0, 5).map(c => `${c.name} (+${c.phone})`),
      vcfContent
    });
  } catch (err: any) {
    console.error('VCF generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate VCF file.' });
  }
});

// Send VCF File Directly Into WhatsApp Group
app.post('/api/contacts/vcf/send-group', async (req: Request, res: Response) => {
  try {
    const { 
      jid, 
      groupSubject, 
      prefix, 
      customCaption, 
      excludeBot = true, 
      includeAdminsOnly = false,
      accountId
    } = req.body;

    if (!jid) return res.status(400).json({ error: 'Provide group jid.' });
    const targetAcc = getAccount(accountId);
    if (!targetAcc.sock || targetAcc.status !== 'connected') {
      return res.status(400).json({ error: `WhatsApp is not connected for "${targetAcc.label}".` });
    }

    addLog(`📁 [${targetAcc.label}] Generating Contact Gain VCF for group ${jid.split('@')[0]}...`, 'info', 'group');

    const metadata = await targetAcc.sock.groupMetadata(jid);
    const subject = groupSubject || metadata.subject || 'Group Contacts';
    const cleanGroupName = subject.replace(/[^\w\s-]/g, '').trim();
    const botPhone = targetAcc.phone;

    const targetContacts: { phone: string; name: string; org?: string; note?: string }[] = [];

    (metadata.participants || []).forEach((p: any, idx: number) => {
      const rawPhone = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
      if (excludeBot && botPhone && rawPhone.includes(botPhone)) return;
      if (includeAdminsOnly && p.admin !== 'admin' && p.admin !== 'superadmin') return;

      const contact = contactsMap.get(p.id);
      const contactPrefix = prefix !== undefined ? prefix : `[${cleanGroupName.slice(0, 15)}] `;
      const contactName = contact?.name && !contact.name.startsWith('+') 
        ? `${contactPrefix}${contact.name}` 
        : `${contactPrefix}Gain ${idx + 1} (+${rawPhone})`;

      targetContacts.push({
        phone: rawPhone,
        name: contactName,
        org: subject,
        note: `Exported from group: ${subject}`
      });
    });

    if (targetContacts.length === 0) {
      return res.status(400).json({ error: 'No valid participants found to include in VCF file.' });
    }

    const vcfString = buildVcfContent(targetContacts);
    const vcfBuffer = Buffer.from(vcfString, 'utf-8');
    const safeFileName = `${cleanGroupName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_contacts.vcf`;

    const defaultCaption = `📁 *CONTACT GAIN VCF FILE — ${subject}*\n\n` +
      `👥 *Total Contacts:* ${targetContacts.length} verified numbers\n` +
      `⚡ *How to use:* Tap this .vcf file to import all members directly into your phone contacts in 1-click!\n\n` +
      `🚀 *Save all numbers to view each other's status & scale your WhatsApp reach!*`;

    const captionToSend = customCaption?.trim() || defaultCaption;

    await targetAcc.sock.sendMessage(jid, {
      document: vcfBuffer,
      mimetype: 'text/vcard',
      fileName: safeFileName,
      caption: captionToSend
    });

    globalStats.broadcastsSent++;
    targetAcc.stats.broadcastsSent++;
    addLog(`📁✓ Contact Gain VCF (${targetContacts.length} contacts) sent successfully to "${subject}" from ${targetAcc.label}!`, 'success', 'group');
    broadcastStateUpdate();

    res.json({
      success: true,
      fileName: safeFileName,
      count: targetContacts.length,
      sentToGroup: true,
      message: `VCF file containing ${targetContacts.length} contacts sent directly to "${subject}"!`
    });
  } catch (err: any) {
    console.error('Send group VCF error:', err);
    addLog(`Failed to send VCF into group: ${err.message}`, 'error', 'group');
    res.status(500).json({ error: err.message || 'Failed to send VCF to WhatsApp group.' });
  }
});

// Direct Download VCF File
app.get('/api/contacts/vcf/download', async (req: Request, res: Response) => {
  try {
    const { jid, tag, prefix, accountId } = req.query;
    let targetContacts: { phone: string; name: string; org?: string }[] = [];
    let title = 'contacts';

    const targetAcc = getAccount(String(accountId || ''));

    if (jid && targetAcc.sock && targetAcc.status === 'connected') {
      const metadata = await targetAcc.sock.groupMetadata(String(jid));
      title = (metadata.subject || 'group').replace(/[^\w\s-]/g, '').trim();
      (metadata.participants || []).forEach((p: any, idx: number) => {
        const rawPhone = p.id.split('@')[0].replace(/[^0-9]/g, '');
        const contact = contactsMap.get(p.id);
        const contactPrefix = prefix ? String(prefix) : `[${title.slice(0, 15)}] `;
        targetContacts.push({
          phone: rawPhone,
          name: contact?.name && !contact.name.startsWith('+') ? `${contactPrefix}${contact.name}` : `${contactPrefix}Gain ${idx + 1}`,
          org: metadata.subject
        });
      });
    } else if (tag) {
      title = `tag_${tag}`;
      const tagged = Array.from(contactsMap.values()).filter(c => c.tags?.includes(String(tag)));
      tagged.forEach((c, idx) => {
        targetContacts.push({
          phone: c.phone,
          name: c.name || `Contact ${idx + 1}`,
          org: String(tag)
        });
      });
    } else {
      const all = Array.from(contactsMap.values());
      all.forEach((c, idx) => {
        targetContacts.push({
          phone: c.phone,
          name: c.name || `Contact ${idx + 1}`
        });
      });
    }

    const vcfString = buildVcfContent(targetContacts);
    const safeName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_contacts.vcf`;

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(vcfString);
  } catch (err: any) {
    res.status(500).send('Error generating VCF download: ' + err.message);
  }
});

// Update group participants
app.post('/api/groups/participants', async (req: Request, res: Response) => {
  try {
    const { jid, targetJid, action, accountId } = req.body;
    if (!jid || !targetJid || !action) {
      return res.status(400).json({ error: 'Provide jid, targetJid, and action (promote|demote|remove).' });
    }

    const targetAcc = getAccount(accountId);
    if (!targetAcc.sock || targetAcc.status !== 'connected') {
      return res.status(400).json({ error: `WhatsApp is not connected on "${targetAcc.label}".` });
    }

    const formattedTarget = targetJid.includes('@') ? targetJid : `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const response = await targetAcc.sock.groupParticipantsUpdate(jid, [formattedTarget], action);

    addLog(`Group action "${action}" on participant ${formattedTarget} in group ${jid}`, 'info', 'group');
    res.json({ success: true, response });
  } catch (err: any) {
    console.error('Participant update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update participant.' });
  }
});

// Update group settings
app.post('/api/groups/settings', async (req: Request, res: Response) => {
  try {
    const { jid, setting, accountId } = req.body;
    if (!jid || !setting) {
      return res.status(400).json({ error: 'Provide jid and setting.' });
    }

    const targetAcc = getAccount(accountId);
    if (!targetAcc.sock || targetAcc.status !== 'connected') {
      return res.status(400).json({ error: `WhatsApp is not connected on "${targetAcc.label}".` });
    }

    await targetAcc.sock.groupSettingUpdate(jid, setting);
    addLog(`Updated group ${jid} setting to "${setting}"`, 'info', 'group');
    res.json({ success: true, message: `Group setting updated to ${setting}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get group invite code
app.post('/api/groups/invite-code', async (req: Request, res: Response) => {
  try {
    const { jid, accountId } = req.body;
    if (!jid) return res.status(400).json({ error: 'Provide group jid.' });

    const targetAcc = getAccount(accountId);
    if (!targetAcc.sock || targetAcc.status !== 'connected') {
      return res.status(400).json({ error: `WhatsApp is not connected on "${targetAcc.label}".` });
    }

    const code = await targetAcc.sock.groupInviteCode(jid);
    res.json({ success: true, code, link: `https://chat.whatsapp.com/${code}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get invite code. Ensure bot is group admin.' });
  }
});

// Image Upload Endpoint
app.post('/api/upload-image', (req: Request, res: Response) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl) return res.status(400).json({ error: 'Provide dataUrl.' });
    res.json({ success: true, url: dataUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. AUTOMATED MULTI-GROUP & TAGGED CONTACT BROADCAST CAMPAIGN ENGINE

// Spintax Preview API
app.post('/api/campaigns/spintax-preview', (req: Request, res: Response) => {
  const { templateText, samplesCount = 3 } = req.body;
  if (!templateText) return res.json({ samples: [] });

  const samples: string[] = [];
  for (let i = 0; i < samplesCount; i++) {
    samples.push(parseSpintax(templateText));
  }
  res.json({ samples });
});

// Start Campaign
app.post('/api/campaigns/start', async (req: Request, res: Response) => {
  try {
    const {
      targetMode = 'groups',
      targetGroupJids = [],
      targetContactJids = [],
      targetTags = [],
      templateText,
      imageUrl,
      minDelaySec = 15,
      maxDelaySec = 35,
      batchSize = 10,
      batchPauseMinutes = 3,
      accountId
    } = req.body;

    const targetAcc = getAccount(accountId);
    if (!targetAcc.sock || targetAcc.status !== 'connected') {
      return res.status(400).json({ error: `WhatsApp is not connected on "${targetAcc.label}". Connect account first.` });
    }

    let resolvedTargetJids: string[] = [];
    if (targetMode === 'tagged_contacts' || targetMode === 'direct_contacts') {
      if (targetTags.length > 0) {
        const taggedContacts = Array.from(contactsMap.values()).filter(c => 
          c.tags?.some(t => targetTags.includes(t))
        );
        resolvedTargetJids = taggedContacts.map(c => c.jid);
      } else if (Array.isArray(targetContactJids) && targetContactJids.length > 0) {
        resolvedTargetJids = targetContactJids;
      }
    } else {
      resolvedTargetJids = Array.isArray(targetGroupJids) ? targetGroupJids : [];
    }

    if (resolvedTargetJids.length === 0) {
      return res.status(400).json({ error: 'Please select at least 1 target group or tagged contact.' });
    }

    if (!templateText && !imageUrl) {
      return res.status(400).json({ error: 'Please provide message template text or image URL.' });
    }

    if (currentCampaign.status === 'running' || currentCampaign.status === 'batch_pausing') {
      return res.status(400).json({ error: 'A campaign is already currently active. Cancel or wait for it to finish.' });
    }

    if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
    if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);

    currentCampaign = {
      id: 'cmp_' + Date.now(),
      status: 'running',
      targetMode,
      targetGroupJids: targetMode === 'groups' ? resolvedTargetJids : [],
      targetContactJids: targetMode !== 'groups' ? resolvedTargetJids : [],
      targetTags,
      totalGroups: resolvedTargetJids.length,
      sentCount: 0,
      failedCount: 0,
      currentIndex: 0,
      currentGroupJid: resolvedTargetJids[0],
      currentGroupName: null,
      minDelaySec: Math.max(5, Number(minDelaySec) || 15),
      maxDelaySec: Math.max(Number(minDelaySec) || 15, Number(maxDelaySec) || 35),
      batchSize: Math.max(1, Number(batchSize) || 10),
      batchPauseMinutes: Math.max(1, Number(batchPauseMinutes) || 3),
      templateText,
      imageUrl: imageUrl || '',
      nextSendInSec: 0,
      batchPauseRemainingSec: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      logs: []
    };

    const targetDesc = targetMode === 'tagged_contacts' 
      ? `Tagged Contacts [${targetTags.join(', ')}] (${resolvedTargetJids.length} recipients)`
      : `${resolvedTargetJids.length} Groups`;

    addLog(`🚀 [${targetAcc.label}] Started Broadcast Campaign across ${targetDesc} with Anti-Ban safeguards.`, 'info', 'campaign');
    broadcastStateUpdate();

    runCampaignStep(targetAcc.id);

    res.json({ success: true, campaign: currentCampaign });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function runCampaignStep(accountId?: string) {
  if (currentCampaign.status !== 'running') return;

  const targetAcc = getAccount(accountId);
  if (!targetAcc.sock || targetAcc.status !== 'connected') {
    currentCampaign.status = 'error';
    addLog(`❌ Campaign aborted: WhatsApp socket on "${targetAcc.label}" disconnected.`, 'error', 'campaign');
    broadcastStateUpdate();
    return;
  }

  const targetList = currentCampaign.targetMode === 'tagged_contacts' || currentCampaign.targetMode === 'direct_contacts'
    ? (currentCampaign.targetContactJids || [])
    : currentCampaign.targetGroupJids;

  if (currentCampaign.currentIndex >= targetList.length) {
    currentCampaign.status = 'completed';
    currentCampaign.completedAt = new Date().toISOString();
    addLog(`🎉 Campaign completed! Sent to ${currentCampaign.sentCount} recipients (${currentCampaign.failedCount} failed).`, 'success', 'campaign');
    broadcastStateUpdate();
    handleScheduledCampaignFinished(true);
    return;
  }

  const jid = targetList[currentCampaign.currentIndex];
  currentCampaign.currentGroupJid = jid;

  try {
    let rawText = currentCampaign.templateText || '';
    if (currentCampaign.targetMode === 'tagged_contacts' || currentCampaign.targetMode === 'direct_contacts') {
      const contact = contactsMap.get(jid) || recordContact(jid);
      const cleanName = contact.name && !contact.name.startsWith('+') ? contact.name : 'Friend';
      const firstName = cleanName.split(' ')[0];
      const primaryTag = contact.tags?.[0] || 'Member';

      rawText = rawText
        .replace(/\{name\}/gi, cleanName)
        .replace(/\{first_name\}/gi, firstName)
        .replace(/\{phone\}/gi, `+${contact.phone}`)
        .replace(/\{tag\}/gi, primaryTag);
    }

    const messageContent = parseSpintax(rawText);
    
    if (currentCampaign.imageUrl) {
      const imgPayload = prepareMediaPayload(currentCampaign.imageUrl, 'image');
      await targetAcc.sock.sendMessage(jid, {
        ...imgPayload,
        caption: messageContent
      });
    } else {
      await targetAcc.sock.sendMessage(jid, {
        text: messageContent
      });
    }

    currentCampaign.sentCount++;
    globalStats.campaignMessagesSent++;
    targetAcc.stats.campaignMessagesSent++;
    const recipientLabel = currentCampaign.targetMode === 'tagged_contacts' || currentCampaign.targetMode === 'direct_contacts' ? 'Contact' : 'Group';
    const progressMsg = `Sent to ${recipientLabel} ${currentCampaign.currentIndex + 1}/${targetList.length} (+${jid.split('@')[0]})`;
    currentCampaign.logs.unshift(`[${new Date().toLocaleTimeString()}] ✓ ${progressMsg}`);
    addLog(`📢 Campaign: ${progressMsg}`, 'success', 'campaign');

  } catch (sendErr: any) {
    currentCampaign.failedCount++;
    const failMsg = `Failed sending to ${jid}: ${sendErr.message}`;
    currentCampaign.logs.unshift(`[${new Date().toLocaleTimeString()}] ❌ ${failMsg}`);
    addLog(failMsg, 'warn', 'campaign');
  }

  currentCampaign.currentIndex++;
  broadcastStateUpdate();

  if (currentCampaign.currentIndex >= targetList.length) {
    currentCampaign.status = 'completed';
    currentCampaign.completedAt = new Date().toISOString();
    addLog(`🎉 Campaign broadcast queue completed successfully!`, 'success', 'campaign');
    broadcastStateUpdate();
    handleScheduledCampaignFinished(true);
    return;
  }

  // Anti-Ban Batch Pause
  if (currentCampaign.sentCount > 0 && currentCampaign.sentCount % currentCampaign.batchSize === 0) {
    const pauseSeconds = currentCampaign.batchPauseMinutes * 60;
    currentCampaign.status = 'batch_pausing';
    currentCampaign.batchPauseRemainingSec = pauseSeconds;
    
    addLog(`⏳ Anti-Ban Batch Pause: Completed batch of ${currentCampaign.batchSize} messages. Resting for ${currentCampaign.batchPauseMinutes} minutes...`, 'info', 'campaign');
    broadcastStateUpdate();

    campaignCountdownTimer = setInterval(() => {
      if (currentCampaign.status !== 'batch_pausing') {
        if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
        return;
      }
      currentCampaign.batchPauseRemainingSec--;
      if (currentCampaign.batchPauseRemainingSec <= 0) {
        if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
        currentCampaign.status = 'running';
        addLog(`▶️ Batch rest period completed. Resuming campaign queue...`, 'info', 'campaign');
        broadcastStateUpdate();
        runCampaignStep(targetAcc.id);
      }
    }, 1000);

    return;
  }

  // Randomized Pacing Delay
  const delaySec = Math.floor(
    Math.random() * (currentCampaign.maxDelaySec - currentCampaign.minDelaySec + 1)
  ) + currentCampaign.minDelaySec;

  currentCampaign.nextSendInSec = delaySec;
  addLog(`⏳ Waiting ${delaySec}s before sending next message (Anti-Ban Jitter)...`, 'info', 'campaign');
  broadcastStateUpdate();

  campaignCountdownTimer = setInterval(() => {
    if (currentCampaign.status !== 'running') {
      if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
      return;
    }
    currentCampaign.nextSendInSec--;
    if (currentCampaign.nextSendInSec <= 0) {
      if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
    }
  }, 1000);

  campaignIntervalTimer = setTimeout(() => {
    if (currentCampaign.status === 'running') {
      runCampaignStep(targetAcc.id);
    }
  }, delaySec * 1000);
}

// Pause Campaign
app.post('/api/campaigns/pause', (req: Request, res: Response) => {
  if (currentCampaign.status === 'running' || currentCampaign.status === 'batch_pausing') {
    currentCampaign.status = 'paused';
    if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
    if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
    addLog('⏸️ Campaign paused by user.', 'warn', 'campaign');
    broadcastStateUpdate();
    res.json({ success: true, campaign: currentCampaign });
  } else {
    res.status(400).json({ error: 'Campaign is not currently running.' });
  }
});

// Resume Campaign
app.post('/api/campaigns/resume', (req: Request, res: Response) => {
  if (currentCampaign.status === 'paused') {
    currentCampaign.status = 'running';
    addLog('▶️ Resuming campaign queue...', 'info', 'campaign');
    broadcastStateUpdate();
    runCampaignStep(activeAccountId);
    res.json({ success: true, campaign: currentCampaign });
  } else {
    res.status(400).json({ error: 'Campaign is not paused.' });
  }
});

// Cancel Campaign
app.post('/api/campaigns/cancel', (req: Request, res: Response) => {
  currentCampaign.status = 'cancelled';
  if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
  if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
  addLog('🛑 Campaign cancelled by user.', 'warn', 'campaign');
  broadcastStateUpdate();
  handleScheduledCampaignFinished(false);
  res.json({ success: true, campaign: currentCampaign });
});

// Delete / Reset Current Campaign Progress (Clears completed or cancelled campaign state)
app.post('/api/campaigns/delete', (req: Request, res: Response) => {
  if (currentCampaign.status === 'running' || currentCampaign.status === 'batch_pausing') {
    return res.status(400).json({ error: 'Cannot delete an actively running campaign. Please cancel it first.' });
  }
  if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
  if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
  currentScheduledCampaignId = null;
  currentCampaign = {
    id: '',
    status: 'idle',
    targetGroupJids: [],
    totalGroups: 0,
    sentCount: 0,
    failedCount: 0,
    currentIndex: 0,
    currentGroupJid: null,
    currentGroupName: null,
    minDelaySec: 15,
    maxDelaySec: 35,
    batchSize: 10,
    batchPauseMinutes: 3,
    templateText: '',
    imageUrl: '',
    nextSendInSec: 0,
    batchPauseRemainingSec: 0,
    startedAt: '',
    completedAt: null,
    logs: []
  };
  addLog('🗑️ Cleared previous campaign history and reset engine state.', 'info', 'campaign');
  broadcastStateUpdate();
  res.json({ success: true, campaign: currentCampaign });
});

// Get Campaign Status
app.get('/api/campaigns/status', (req: Request, res: Response) => {
  res.json({ 
    campaign: currentCampaign,
    scheduledCampaigns,
    currentScheduledCampaignId
  });
});

// =======================================================
// SCHEDULED & RECURRING AUTO-CAMPAIGN ENGINE (AUTO-POSTER)
// =======================================================

async function triggerScheduledCampaign(sc: ScheduledCampaign): Promise<boolean> {
  if (currentCampaign.status === 'running' || currentCampaign.status === 'batch_pausing') {
    return false;
  }
  const targetAcc = getAccount(sc.accountId || activeAccountId);
  if (!targetAcc.sock || targetAcc.status !== 'connected') {
    return false;
  }

  let resolvedTargetJids: string[] = [];
  if (sc.targetMode === 'all_open_groups') {
    try {
      const groupsData = await targetAcc.sock.groupFetchAllParticipating();
      resolvedTargetJids = Object.values(groupsData)
        .filter((g: any) => !g.announce || g.isBotAdmin)
        .map((g: any) => g.id);
    } catch (e) {
      resolvedTargetJids = sc.targetGroupJids || [];
    }
  } else if (sc.targetMode === 'tagged_contacts') {
    if (sc.targetTags && sc.targetTags.length > 0) {
      const tagged = Array.from(contactsMap.values()).filter(c => 
        c.tags?.some(t => sc.targetTags.includes(t))
      );
      resolvedTargetJids = tagged.map(c => c.jid);
    } else {
      resolvedTargetJids = sc.targetContactJids || [];
    }
  } else {
    resolvedTargetJids = sc.targetGroupJids || [];
  }

  if (resolvedTargetJids.length === 0) {
    addLog(`⚠️ Auto-Campaign "${sc.name}": No target groups/contacts found for this scheduled run.`, 'warn', 'campaign');
    return false;
  }

  if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
  if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);

  currentScheduledCampaignId = sc.id;
  currentCampaign = {
    id: 'cmp_auto_' + Date.now(),
    status: 'running',
    targetMode: sc.targetMode as any,
    targetGroupJids: sc.targetMode === 'tagged_contacts' ? [] : resolvedTargetJids,
    targetContactJids: sc.targetMode === 'tagged_contacts' ? resolvedTargetJids : [],
    targetTags: sc.targetTags || [],
    totalGroups: resolvedTargetJids.length,
    sentCount: 0,
    failedCount: 0,
    currentIndex: 0,
    currentGroupJid: resolvedTargetJids[0],
    currentGroupName: null,
    minDelaySec: Math.max(5, sc.minDelaySec || 15),
    maxDelaySec: Math.max(10, sc.maxDelaySec || 35),
    batchSize: Math.max(1, sc.batchSize || 10),
    batchPauseMinutes: Math.max(1, sc.batchPauseMinutes || 3),
    templateText: sc.templateText,
    imageUrl: sc.imageUrl || '',
    nextSendInSec: 0,
    batchPauseRemainingSec: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    logs: []
  };

  addLog(`🤖 [24/7 Auto-Poster] Auto-posting started for "${sc.name}" across ${resolvedTargetJids.length} targets (Run #${(sc.currentIteration || 0) + 1}, Repeat: every ${sc.repeatIntervalHours}h).`, 'info', 'campaign');
  broadcastStateUpdate();
  runCampaignStep(targetAcc.id);
  return true;
}

// Background Cron-style Checker for Scheduled Auto-Campaigns
setInterval(async () => {
  if (currentCampaign.status === 'running' || currentCampaign.status === 'batch_pausing') {
    return;
  }
  const now = Date.now();
  for (const sc of scheduledCampaigns) {
    if (sc.enabled && sc.nextRunAt) {
      const scheduledTime = new Date(sc.nextRunAt).getTime();
      if (scheduledTime <= now) {
        const started = await triggerScheduledCampaign(sc);
        if (started) break;
      }
    }
  }
}, 20000);

// 9B. SCHEDULED RECURRING CAMPAIGNS REST APIS

// Get All Scheduled Auto-Campaigns
app.get('/api/campaigns/scheduled', (req: Request, res: Response) => {
  res.json({ success: true, campaigns: scheduledCampaigns });
});

// Create or Update Scheduled Auto-Campaign
app.post('/api/campaigns/scheduled', async (req: Request, res: Response) => {
  try {
    const {
      id,
      name,
      targetMode = 'groups',
      targetGroupJids = [],
      targetContactJids = [],
      targetTags = [],
      templateText,
      imageUrl,
      minDelaySec = 15,
      maxDelaySec = 35,
      batchSize = 10,
      batchPauseMinutes = 3,
      repeatEnabled = true,
      repeatIntervalHours = 2,
      maxIterations,
      enabled = true,
      accountId,
      runImmediately = false
    } = req.body;

    if (!templateText && !imageUrl) {
      return res.status(400).json({ error: 'Provide either message text or image URL.' });
    }

    const campaignId = id || ('sch_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'));
    const safeInterval = Math.max(0.1, Number(repeatIntervalHours) || 2);
    const nextRunTime = runImmediately 
      ? new Date().toISOString()
      : new Date(Date.now() + safeInterval * 3600 * 1000).toISOString();

    const newScheduledCampaign: ScheduledCampaign = {
      id: campaignId,
      name: name?.trim() || `Auto-Post Campaign (${new Date().toLocaleDateString()})`,
      targetMode: targetMode as any,
      targetGroupJids: Array.isArray(targetGroupJids) ? targetGroupJids : [],
      targetContactJids: Array.isArray(targetContactJids) ? targetContactJids : [],
      targetTags: Array.isArray(targetTags) ? targetTags : [],
      templateText: templateText || '',
      imageUrl: imageUrl || '',
      minDelaySec: Math.max(5, Number(minDelaySec) || 15),
      maxDelaySec: Math.max(10, Number(maxDelaySec) || 35),
      batchSize: Math.max(1, Number(batchSize) || 10),
      batchPauseMinutes: Math.max(1, Number(batchPauseMinutes) || 3),
      repeatEnabled: Boolean(repeatEnabled),
      repeatIntervalHours: safeInterval,
      maxIterations: maxIterations ? Number(maxIterations) : undefined,
      currentIteration: 0,
      enabled: Boolean(enabled),
      accountId: accountId || activeAccountId,
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunAt: nextRunTime,
      lastRunStatus: undefined,
      lastRunStats: undefined
    };

    const existingIdx = scheduledCampaigns.findIndex(s => s.id === campaignId);
    if (existingIdx !== -1) {
      scheduledCampaigns[existingIdx] = {
        ...scheduledCampaigns[existingIdx],
        ...newScheduledCampaign,
        currentIteration: scheduledCampaigns[existingIdx].currentIteration || 0,
        createdAt: scheduledCampaigns[existingIdx].createdAt || newScheduledCampaign.createdAt
      };
    } else {
      scheduledCampaigns.unshift(newScheduledCampaign);
    }

    saveScheduledCampaignsToFile();
    addLog(`⏰ Saved Scheduled Recurring Campaign: "${newScheduledCampaign.name}" (Repeats every ${safeInterval}h)`, 'success', 'campaign');
    broadcastStateUpdate();

    // If requested to run immediately, trigger now
    if (runImmediately) {
      setTimeout(() => {
        triggerScheduledCampaign(newScheduledCampaign);
      }, 500);
    }

    res.json({ success: true, campaign: newScheduledCampaign });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Scheduled Auto-Campaign (Directly fulfills user request to delete campaign)
app.delete('/api/campaigns/scheduled/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const initialLen = scheduledCampaigns.length;
    const removedCampaign = scheduledCampaigns.find(s => s.id === id);
    scheduledCampaigns = scheduledCampaigns.filter(s => s.id !== id);

    if (currentScheduledCampaignId === id) {
      currentScheduledCampaignId = null;
    }

    saveScheduledCampaignsToFile();
    addLog(`🗑️ Deleted scheduled campaign: "${removedCampaign?.name || id}"`, 'info', 'campaign');
    broadcastStateUpdate();

    res.json({
      success: true,
      id,
      deleted: scheduledCampaigns.length < initialLen,
      message: 'Scheduled campaign deleted successfully. Auto-posting has been stopped.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Scheduled Campaign Active/Pause State
app.post('/api/campaigns/scheduled/:id/toggle', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const sc = scheduledCampaigns.find(s => s.id === id);
    if (!sc) {
      return res.status(404).json({ error: 'Scheduled campaign not found.' });
    }

    sc.enabled = !sc.enabled;
    if (sc.enabled) {
      // Refresh next run time if it was in the past
      if (new Date(sc.nextRunAt).getTime() <= Date.now()) {
        sc.nextRunAt = new Date(Date.now() + Math.max(0.1, sc.repeatIntervalHours || 1) * 3600 * 1000).toISOString();
      }
      addLog(`▶️ Resumed scheduled auto-campaign: "${sc.name}"`, 'info', 'campaign');
    } else {
      addLog(`⏸️ Paused scheduled auto-campaign: "${sc.name}"`, 'info', 'campaign');
    }

    saveScheduledCampaignsToFile();
    broadcastStateUpdate();
    res.json({ success: true, campaign: sc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run Scheduled Campaign Immediately (Run Now)
app.post('/api/campaigns/scheduled/:id/run-now', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const sc = scheduledCampaigns.find(s => s.id === id);
    if (!sc) {
      return res.status(404).json({ error: 'Scheduled campaign not found.' });
    }

    if (currentCampaign.status === 'running' || currentCampaign.status === 'batch_pausing') {
      return res.status(400).json({ error: 'Another campaign is currently running. Please wait for it to finish or cancel it.' });
    }

    const started = await triggerScheduledCampaign(sc);
    if (!started) {
      return res.status(400).json({ error: 'Failed to initiate campaign. Ensure WhatsApp is connected and target groups exist.' });
    }

    res.json({ success: true, message: `Auto-campaign "${sc.name}" started successfully!`, campaign: sc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Update Configuration
app.post('/api/config', (req: Request, res: Response) => {
  const { 
    autoReact, 
    reactionEmojis, 
    autoView, 
    viewDelaySeconds 
  } = req.body;

  if (typeof autoReact === 'boolean') config.autoReact = autoReact;
  if (Array.isArray(reactionEmojis)) config.reactionEmojis = reactionEmojis;
  if (typeof autoView === 'boolean') config.autoView = autoView;
  if (typeof viewDelaySeconds === 'number') config.viewDelaySeconds = viewDelaySeconds;

  saveConfigToFile();
  addLog('Automation configuration updated.', 'info', 'system');
  broadcastStateUpdate();
  res.json({ success: true, config });
});

// 11. Activity Logs
app.get('/api/logs', (req: Request, res: Response) => {
  res.json({ logs: recentLogs, stats: globalStats });
});

// 12. Server-Sent Events (SSE) Stream
app.get('/api/logs/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const activeAcc = getActiveAccount();
  const accountsList = getAllAccountsList();

  clientsSse.push(res);

  res.write(`data: ${JSON.stringify({
    type: 'init',
    status: activeAcc.status,
    phase: activeAcc.phase,
    phone: activeAcc.phone,
    name: activeAcc.name,
    hasQr: !!activeAcc.qr,
    qr: activeAcc.qr,
    pairingCode: activeAcc.pairingCode,
    logs: recentLogs.slice(0, 50),
    stats: globalStats,
    config,
    campaign: currentCampaign,
    activeAccountId,
    accounts: accountsList
  })}\n\n`);

  req.on('close', () => {
    clientsSse = clientsSse.filter(c => c !== res);
  });
});

// Dev / Prod Vite Middleware Mount
async function startServer() {
  const distDir = path.join(__dirname, 'dist');
  const distHtml = path.join(distDir, 'index.html');
  const rootHtml = path.join(__dirname, 'index.html');

  // Robust production detection across Render, Google Cloud, Docker, and standard Node
  const isProdDeployment = 
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.K_SERVICE) ||
    Boolean(process.env.GAE_SERVICE) ||
    !fs.existsSync(path.join(__dirname, 'src'));

  // Ensure production bundle exists if running in production mode
  let hasDist = fs.existsSync(distHtml);
  if (!hasDist && isProdDeployment) {
    console.log('[Engine Boot] Production dist/ not found. Compiling client bundle on the fly...');
    try {
      const { build } = await import('vite');
      await build({
        configFile: path.join(__dirname, 'vite.config.ts'),
        mode: 'production'
      });
      hasDist = fs.existsSync(distHtml);
      console.log(`[Engine Boot] Client bundle compilation ${hasDist ? 'succeeded' : 'completed without dist'}.`);
    } catch (buildErr: any) {
      console.error('[Engine Boot] Client build failed during startup:', buildErr?.message || buildErr);
    }
  }

  console.log(`[Engine Boot] Environment: ${isProdDeployment ? 'PRODUCTION' : 'DEVELOPMENT'} | Static Bundle: ${hasDist ? 'AVAILABLE' : 'ABSENT'}`);

  if (hasDist) {
    console.log('[Engine Boot] Serving precompiled production build from ./dist');
    
    // Serve hashed assets with aggressive immutable caching
    app.use('/assets', express.static(path.join(distDir, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));

    // Serve public static assets (icons, manifest, etc.)
    app.use(express.static(distDir, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json') || filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    
    // SPA Wildcard Route: Always serve index.html with no-cache headers to prevent stale bundle mismatch
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: `API endpoint ${req.originalUrl} not found` });
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(distHtml);
    });
  } else if (!isProdDeployment) {
    // Development mode with Vite dev middleware
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) return next();
        try {
          if (fs.existsSync(rootHtml)) {
            let template = fs.readFileSync(rootHtml, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
          } else if (fs.existsSync(distHtml)) {
            res.sendFile(distHtml);
          } else {
            next();
          }
        } catch (e: any) {
          vite.ssrFixStacktrace?.(e);
          next(e);
        }
      });
    } catch (e: any) {
      console.warn('[Engine Boot] Vite middleware initialization note:', e?.message || e);
    }
  } else {
    // Production emergency fallback if dist bundle could not be generated
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: `API endpoint ${req.originalUrl} not found` });
      }
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>WhatsApp Engine • Building</title>
          <style>
            body { background: #0b141a; color: #e2e8f0; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
            .card { background: #111b21; border: 1px solid #202c33; border-radius: 1.5rem; padding: 2rem; max-width: 440px; text-align: center; }
            .btn { background: #10b981; color: white; border: none; padding: 0.65rem 1.25rem; border-radius: 0.75rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="color:#10b981;margin-top:0;">WhatsApp Engine Online</h2>
            <p style="color:#94a3b8;font-size:0.875rem;">Backend automation is running. The client interface is completing its initial compilation.</p>
            <a href="/" class="btn" onclick="window.location.reload()">Reload Application</a>
          </div>
        </body>
        </html>
      `);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 WhatsApp Growth & Automation Engine Online!`);
    console.log(`📡 Multi-Account Manager active on http://0.0.0.0:${PORT}`);
    console.log(`====================================================`);
    
    startAllAccounts();
  });
}

startServer();
