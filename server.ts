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
import { GoogleGenAI } from '@google/genai';
import { 
  EngineConfig, 
  ActivityLog, 
  CampaignProgress, 
  ViewedStatusItem, 
  FallbackRule, 
  ApiKeyItem, 
  WebhookConfig,
  ContactItem,
  TagDefinition,
  VcfExportOptions
} from './src/types';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('[Engine Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Engine Unhandled Rejection]', reason);
});

// Defensive Baileys interop
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
  aiResponder: true,
  aiTriggerMode: 'all',
  triggerKeywords: ['price', 'info', 'buy', 'order', 'help', 'services', 'hi', 'hello', 'quote'],
  systemPrompt: `You are an elite sales consultant and friendly customer service executive. 
Respond to incoming WhatsApp inquiries with warmth, confidence, and professionalism.
Keep your replies concise, formatted cleanly for mobile (use *bold* and bullet points when listing items), and focused on helping the customer take the next action.`,
  geminiKey: process.env.GEMINI_API_KEY || '',
  viewDelaySeconds: 2,
  typingDelaySeconds: 2,
  fallbackRules: [
    {
      id: 'rule_1',
      keywords: ['price', 'pricing', 'cost', 'fee', 'package'],
      reply: 'Hello! 👋 Our standard plans start from $19/mo. Check our full package options here: https://example.com/pricing',
      enabled: true
    },
    {
      id: 'rule_2',
      keywords: ['support', 'help', 'issue', 'problem'],
      reply: 'Hi there! 🛠️ Our team is ready to assist. Please describe the issue in detail and an agent will follow up right away.',
      enabled: true
    },
    {
      id: 'rule_3',
      keywords: ['hours', 'location', 'address'],
      reply: '📍 We are open Monday–Friday from 9:00 AM to 6:00 PM. You can also reach us anytime right here on WhatsApp!',
      enabled: true
    }
  ]
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

let keepAliveTimer: NodeJS.Timeout | null = null;
let reconnectAttemptCount = 0;

function startKeepAliveLoop() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(async () => {
    try {
      if (sock && connectionStatus === 'connected') {
        // Send presence update to keep WhatsApp Web connection active
        await sock.sendPresenceUpdate('available').catch(() => {});
        // If websocket is available, ping to maintain TCP tunnel
        if (sock.ws && typeof sock.ws.ping === 'function') {
          try { sock.ws.ping(); } catch (e) {}
        }
      }
    } catch (err: any) {
      console.warn('[Keep-Alive Tick]', err?.message);
    }
  }, 20000);
}


let sock: any = null;
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let connectionPhase: string = 'idle';
let qrCodeDataUrl: string | null = null;
let activePhone: string | null = null;
let activePushName: string | null = null;
let recentLogs: ActivityLog[] = [];
let viewedStatusesLog: ViewedStatusItem[] = [];
let clientsSse: Response[] = [];
let isInitializing = false;

const stats = {
  statusesViewed: 0,
  reactionsSent: 0,
  aiRepliesSent: 0,
  broadcastsSent: 0,
  campaignMessagesSent: 0,
  startedAt: new Date().toISOString()
};

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

  const sseData = `data: ${JSON.stringify({ type: 'log', log: logItem, stats, campaign: currentCampaign })}\n\n`;
  clientsSse.forEach(client => {
    try { client.write(sseData); } catch (e) {}
  });
}

function broadcastStateUpdate() {
  const sseData = `data: ${JSON.stringify({
    type: 'state',
    status: connectionStatus,
    phase: connectionPhase,
    phone: activePhone,
    name: activePushName,
    hasQr: !!qrCodeDataUrl,
    qr: qrCodeDataUrl,
    stats,
    config,
    campaign: currentCampaign
  })}\n\n`;
  clientsSse.forEach(client => {
    try { client.write(sseData); } catch (e) {}
  });
}

function extractMessageText(message: any): string {
  if (!message) return '';
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

const AUTH_DIR = process.env.DATA_DIR || path.join(__dirname, 'session_auth');

async function initWhatsApp(forceFresh = false) {
  if (isInitializing) return;
  isInitializing = true;

  try {
    // 1. Cleanly tear down any prior socket instance to prevent listener leaks and dead sockets
    if (sock) {
      try {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        sock.ev.removeAllListeners('messages.upsert');
        sock.ev.removeAllListeners('groups.update');
        sock.ev.removeAllListeners('group-participants.update');
        if (sock.ws) {
          try { sock.ws.close(); } catch (e) {}
        }
        try { sock.end(undefined); } catch (e) {}
      } catch (e) {}
      sock = null;
    }

    if (forceFresh) {
      addLog('Clearing session credentials for fresh connection...', 'info', 'system');
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      activePhone = null;
      activePushName = null;
      qrCodeDataUrl = null;
    }

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as [number, number, number], isLatest: true }));
    
    addLog(`Initializing Baileys Socket v${(version as [number, number, number]).join('.')}...`, 'info', 'system');
    connectionStatus = 'connecting';
    connectionPhase = 'initializing';
    broadcastStateUpdate();

    const browserTuple: [string, string, string] = ['Ubuntu', 'Chrome', '20.0.04'];

    sock = makeWASocket({
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
      getMessage: async (key: any) => {
        return { conversation: '' };
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Group Participants Event Listener
    sock.ev.on('group-participants.update', async ({ id, participants, action }: any) => {
      try {
        const formattedAction = action === 'add' ? 'joined' : action === 'remove' ? 'left' : action;
        const members = (participants || []).map((p: string) => '+' + p.split('@')[0]).join(', ');
        addLog(`👥 Group Update: ${members} ${formattedAction} (${id.split('@')[0]})`, 'info', 'group');
        broadcastStateUpdate();
      } catch (e) {}
    });

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            color: { dark: '#075e54', light: '#ffffff' }
          });
          connectionStatus = 'connecting';
          connectionPhase = 'awaiting_pair';
          addLog('QR Code & 8-Digit Pairing ready. Enter phone number to link.', 'info', 'system');
          broadcastStateUpdate();
        } catch (err) {
          console.error('Failed to generate QR code data URL', err);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        connectionPhase = 'ready';
        qrCodeDataUrl = null;
        reconnectAttemptCount = 0;
        activePhone = sock.user?.id?.split(':')[0]?.split('@')[0] || sock.user?.id || 'Connected User';
        activePushName = sock.user?.name || sock.user?.notify || 'My WhatsApp';
        addLog(`WhatsApp socket connected successfully as +${activePhone} (${activePushName})`, 'success', 'system');
        
        // Start 24/7 Keep-Alive heartbeat loop to prevent idle disconnects
        startKeepAliveLoop();
        sock.sendPresenceUpdate('available').catch(() => {});
        broadcastStateUpdate();
      }

      if (connection === 'close') {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const shouldReconnect = !isLoggedOut;
        connectionStatus = 'disconnected';
        connectionPhase = 'closed';
        qrCodeDataUrl = null;
        
        addLog(`Connection closed: ${lastDisconnect?.error?.message || 'Status ' + statusCode}. Reconnecting: ${shouldReconnect}`, 'warn', 'system');
        broadcastStateUpdate();

        if (isLoggedOut) {
          addLog('Session logged out. Cleaning session storage...', 'warn', 'system');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          activePhone = null;
          activePushName = null;
          setTimeout(() => {
            isInitializing = false;
            initWhatsApp(true);
          }, 2000);
        } else if (shouldReconnect) {
          reconnectAttemptCount++;
          const retryDelay = Math.min(2000 * Math.pow(1.3, Math.min(reconnectAttemptCount, 6)), 15000);
          addLog(`Auto-reconnecting socket in ${Math.round(retryDelay / 1000)}s (Attempt #${reconnectAttemptCount}, Code: ${statusCode || 'net'})...`, 'info', 'system');
          setTimeout(() => {
            isInitializing = false;
            initWhatsApp(false);
          }, retryDelay);
        }
      }
    });

    // Inbound Messages & Statuses Listener
    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
      if (!messages || !messages.length) return;

      for (const msg of messages) {
        if (!msg || !msg.key) continue;
        const remoteJid = msg.key?.remoteJid;
        const fromMe = msg.key?.fromMe;

        // 1. WhatsApp Status Broadcast Event
        if (remoteJid === 'status@broadcast') {
          // Never read or react to our own posted status
          if (fromMe) continue;

          const participant = msg.key?.participant || msg.participant || (msg.key as any)?.participantJid || '';
          if (!participant) continue;

          const senderPhone = participant.split('@')[0] || 'Contact';
          const senderName = msg.pushName || senderPhone;

          // Auto-View Status (marks contact story as viewed)
          if (config.autoView && sock) {
            try {
              const delay = (config.viewDelaySeconds || 2) * 1000 + Math.random() * 800;
              setTimeout(async () => {
                try {
                  if (sock && connectionStatus === 'connected') {
                    await sock.readMessages([{
                      remoteJid: 'status@broadcast',
                      id: msg.key.id,
                      participant: participant
                    }]);
                    stats.statusesViewed++;
                    
                    const statusItem: ViewedStatusItem = {
                      id: msg.key.id || String(Date.now()),
                      timestamp: new Date().toISOString(),
                      senderPhone,
                      senderName,
                      reactedEmoji: null
                    };

                    viewedStatusesLog.unshift(statusItem);
                    if (viewedStatusesLog.length > 100) viewedStatusesLog.pop();

                    addLog(`👁️ Viewed story from ${senderName} (+${senderPhone})`, 'event', 'status');
                    broadcastStateUpdate();
                  }
                } catch (err: any) {
                  console.error('Error auto-viewing status:', err?.message);
                }
              }, delay);
            } catch (err: any) {
              console.error('Error scheduling status view:', err?.message);
            }
          }

          // Auto-React to Status
          if (config.autoReact && sock && config.reactionEmojis?.length > 0) {
            try {
              const randomEmoji = config.reactionEmojis[Math.floor(Math.random() * config.reactionEmojis.length)];
              const reactDelay = (config.viewDelaySeconds || 2) * 1000 + 1200 + Math.random() * 1500;
              setTimeout(async () => {
                try {
                  if (sock && connectionStatus === 'connected') {
                    try {
                      await sock.sendMessage('status@broadcast', {
                        react: { text: randomEmoji, key: msg.key }
                      }, {
                        statusJidList: [participant]
                      });
                    } catch (e1) {
                      try {
                        await sock.sendMessage(participant, {
                          react: { text: randomEmoji, key: msg.key }
                        });
                      } catch (e2) {}
                    }

                    stats.reactionsSent++;

                    const found = viewedStatusesLog.find(s => s.senderPhone === senderPhone);
                    if (found) found.reactedEmoji = randomEmoji;

                    addLog(`🔥 Auto-reacted ${randomEmoji} to story from ${senderName}`, 'event', 'status');
                    broadcastStateUpdate();
                  }
                } catch (reactErr: any) {
                  console.error('Error auto-reacting:', reactErr?.message);
                }
              }, reactDelay);
            } catch (err: any) {
              console.error('Error preparing reaction:', err?.message);
            }
          }
        }

        // 2. Direct 1-on-1 Messages (AI Auto-Responder with Gemini & Smart Rule Fallbacks)
        if (remoteJid && remoteJid.endsWith('@s.whatsapp.net') && !fromMe && config.aiResponder) {
          const text = extractMessageText(msg.message);

          if (!text || text.startsWith('/skip') || text.startsWith('!stop')) continue;

          const senderName = msg.pushName || 'Customer';
          const senderPhone = remoteJid.split('@')[0];
          const textLower = text.toLowerCase();

          // Check Keyword Trigger Filter
          if (config.aiTriggerMode === 'keywords_only') {
            const hasMatchingTrigger = (config.triggerKeywords || []).some(kw => 
              textLower.includes(kw.toLowerCase())
            );
            if (!hasMatchingTrigger) {
              console.log(`[AI Responder] Skipped message from +${senderPhone} (No matching trigger keyword)`);
              continue;
            }
          }

          addLog(`📥 Incoming DM from ${senderName} (+${senderPhone}): "${text}"`, 'info', 'ai');

          // Forward to external Webhook if configured
          if (webhookConfig.enabled && webhookConfig.url) {
            fetch(webhookConfig.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(webhookConfig.secret ? { 'x-webhook-secret': webhookConfig.secret } : {})
              },
              body: JSON.stringify({
                event: 'message.received',
                from: senderPhone,
                name: senderName,
                text: text,
                timestamp: new Date().toISOString()
              })
            }).catch((err: any) => console.warn('[Webhook Dispatch Error]', err?.message));
          }

          // Check Fallback Rules first
          const matchedRule = (config.fallbackRules || []).find(r => 
            r.enabled && r.keywords.some(k => textLower.includes(k.toLowerCase()))
          );

          let replyText = '';

          if (matchedRule) {
            replyText = matchedRule.reply;
            addLog(`🎯 Matched Rule Response for keyword: "${matchedRule.keywords.join(', ')}"`, 'info', 'ai');
          }

          // If no rule matched, process with Gemini AI
          if (!replyText) {
            try {
              const apiKey = config.geminiKey || process.env.GEMINI_API_KEY;
              if (apiKey) {
                const ai = new GoogleGenAI({
                  apiKey: apiKey,
                  httpOptions: {
                    headers: {
                      'User-Agent': 'aistudio-build'
                    }
                  }
                });

                const prompt = `A customer named "${senderName}" (+${senderPhone}) sent the following message on WhatsApp: "${text}". Reply to them following these business instructions:\n\n${config.systemPrompt}\n\nKeep the reply natural, friendly, formatted for WhatsApp (use *bold* where appropriate), and concise.`;

                try {
                  const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                  });
                  replyText = response?.text?.trim() || '';
                } catch (modelErr) {
                  const response = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: prompt
                  });
                  replyText = response?.text?.trim() || '';
                }
              } else {
                // If API Key is missing and we have fallback rules, find the first default rule or give polite standard answer
                if (config.fallbackRules && config.fallbackRules.length > 0) {
                  replyText = config.fallbackRules[0].reply;
                }
              }
            } catch (aiErr: any) {
              console.error('Gemini AI generation failed:', aiErr?.message);
              addLog(`❌ AI Responder error: ${aiErr?.message}`, 'error', 'ai');
            }
          }

          // Send Reply with Typing Presence Simulation
          if (replyText && sock) {
            const typingDuration = (config.typingDelaySeconds || 2) * 1000;
            try {
              await sock.sendPresenceUpdate('composing', remoteJid);
            } catch (e) {}

            setTimeout(async () => {
              try {
                if (sock) {
                  await sock.sendMessage(remoteJid, { text: replyText }, { quoted: msg });
                  stats.aiRepliesSent++;
                  addLog(`🤖 Sent AI Reply to ${senderName}: "${replyText.slice(0, 60)}..."`, 'success', 'ai');
                  try {
                    await sock.sendPresenceUpdate('paused', remoteJid);
                  } catch (e) {}
                  broadcastStateUpdate();
                }
              } catch (sendErr: any) {
                console.error('Error sending AI reply:', sendErr?.message);
              }
            }, typingDuration);
          }
        }
      }
    });

  } catch (error: any) {
    console.error('Fatal initialization error in WhatsApp engine:', error);
    addLog(`Fatal engine error: ${error.message}`, 'error', 'system');
    connectionStatus = 'disconnected';
    connectionPhase = 'error';
    setTimeout(() => {
      isInitializing = false;
      initWhatsApp(false);
    }, 5000);
  } finally {
    isInitializing = false;
  }
}

// REST API Endpoints

// 0. Keep-Alive / Health Endpoint
app.get(['/api/ping', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    connected: connectionStatus === 'connected',
    phone: activePhone,
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
// PUBLIC DEVELOPER REST API v1
// ==========================================

// 1. Connection Status Check
app.get('/api/v1/status', validateApiKey, (req: Request, res: Response) => {
  res.json({
    status: connectionStatus,
    phase: connectionPhase,
    phone: activePhone,
    name: activePushName,
    connected: connectionStatus === 'connected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 2. Send WhatsApp Message
app.post('/api/v1/messages/send', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: "to" and "message" are required.' });
    }

    if (!sock || connectionStatus !== 'connected') {
      return res.status(503).json({ error: 'WhatsApp socket is not connected. Pair your WhatsApp account in the dashboard first.' });
    }

    // Format destination JID
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
    const result = await sock.sendMessage(jid, { text: parsedText });

    stats.campaignMessagesSent++;
    addLog(`🚀 [REST API] Sent message to ${cleanNumber || jid}: "${parsedText.slice(0, 45)}..."`, 'success', 'system');
    broadcastStateUpdate();

    res.json({
      success: true,
      messageId: result?.key?.id || ('msg_' + Date.now()),
      to: jid,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('API Send Message Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Send WhatsApp Media (Image / Document)
app.post('/api/v1/messages/send-media', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { to, mediaUrl, base64, mimeType, caption, fileName } = req.body;

    if (!to || (!mediaUrl && !base64)) {
      return res.status(400).json({ error: 'Missing required fields: "to" and either "mediaUrl" or "base64" are required.' });
    }

    if (!sock || connectionStatus !== 'connected') {
      return res.status(503).json({ error: 'WhatsApp socket is not connected.' });
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

    const result = await sock.sendMessage(jid, messagePayload);
    addLog(`📎 [REST API] Sent media to ${cleanNumber || jid}`, 'success', 'system');
    broadcastStateUpdate();

    res.json({
      success: true,
      messageId: result?.key?.id,
      to: jid,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. List Joined Groups
app.get('/api/v1/groups', validateApiKey, async (req: Request, res: Response) => {
  try {
    if (!sock || connectionStatus !== 'connected') {
      return res.status(503).json({ error: 'WhatsApp socket is not connected.' });
    }
    const groups = await sock.groupFetchAllParticipating();
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
    const { groupId, message } = req.body;
    if (!groupId || !message) {
      return res.status(400).json({ error: 'Fields "groupId" and "message" are required.' });
    }
    if (!sock || connectionStatus !== 'connected') {
      return res.status(503).json({ error: 'WhatsApp socket is not connected.' });
    }

    const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
    const parsedText = parseSpintax(message);
    const result = await sock.sendMessage(jid, { text: parsedText });

    stats.campaignMessagesSent++;
    addLog(`👥 [REST API] Dispatched message to group (${jid})`, 'success', 'group');
    broadcastStateUpdate();

    res.json({
      success: true,
      messageId: result?.key?.id,
      groupId: jid,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Live Engine Stats
app.get('/api/v1/stats', validateApiKey, (req: Request, res: Response) => {
  res.json({
    success: true,
    stats,
    connected: connectionStatus === 'connected',
    phone: activePhone,
    uptime: Math.floor(process.uptime())
  });
});

// 1. Engine Status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: connectionStatus,
    phase: connectionPhase,
    phone: activePhone,
    name: activePushName,
    hasQr: !!qrCodeDataUrl,
    qr: qrCodeDataUrl,
    autoReact: config.autoReact,
    autoView: config.autoView,
    aiResponder: config.aiResponder,
    aiTriggerMode: config.aiTriggerMode,
    triggerKeywords: config.triggerKeywords,
    reactionEmojis: config.reactionEmojis,
    systemPrompt: config.systemPrompt,
    viewDelaySeconds: config.viewDelaySeconds,
    typingDelaySeconds: config.typingDelaySeconds,
    fallbackRules: config.fallbackRules,
    stats,
    campaign: currentCampaign
  });
});

// 2. QR Code endpoint
app.get('/api/qr', (req: Request, res: Response) => {
  res.json({
    qr: qrCodeDataUrl,
    status: connectionStatus,
    phase: connectionPhase
  });
});

// 3. 8-Digit Pairing Code API
app.post('/api/pairing-code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Please provide a valid phone number in request body.' });
    }

    const cleanedNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    if (cleanedNumber.length < 8 || cleanedNumber.length > 16) {
      return res.status(400).json({ error: 'Invalid phone number format. Include country code (e.g. 2347043537401 or 14155552671).' });
    }

    if (connectionStatus === 'connected') {
      return res.status(400).json({ error: 'WhatsApp is already connected! Click "Disconnect" first to link a new number.' });
    }

    if (!sock || !sock.ws || sock.ws.readyState !== 1) {
      addLog('Socket connecting for pairing code request...', 'info', 'system');
      await initWhatsApp(false);
      let retries = 0;
      while ((!sock || !sock.ws || sock.ws.readyState !== 1) && retries < 15) {
        await new Promise(r => setTimeout(r, 400));
        retries++;
      }
    }

    if (!sock || typeof sock.requestPairingCode !== 'function') {
      throw new Error('Socket engine not ready. Please try again or click Reset Session.');
    }

    addLog(`Requesting official 8-digit Pairing Code for +${cleanedNumber}...`, 'info', 'system');
    
    const code = await sock.requestPairingCode(cleanedNumber);
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

    addLog(`Pairing code generated: ${formattedCode}`, 'success', 'system');

    res.json({
      success: true,
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

// 4. Force Reset & Reconnect Session
app.post('/api/reset-session', async (req: Request, res: Response) => {
  try {
    addLog('User triggered Force Reset of WhatsApp session.', 'info', 'system');
    await initWhatsApp(true);
    res.json({ success: true, message: 'Session storage cleared and socket restarted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Logout / Disconnect
app.post('/api/logout', async (req: Request, res: Response) => {
  try {
    addLog('User requested WhatsApp session disconnect.', 'info', 'system');
    if (sock) {
      try { await sock.logout(); } catch (e) {}
      try { sock.end(undefined); } catch (e) {}
    }
    
    connectionStatus = 'disconnected';
    connectionPhase = 'closed';
    activePhone = null;
    activePushName = null;
    qrCodeDataUrl = null;

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }

    setTimeout(() => initWhatsApp(true), 1500);

    broadcastStateUpdate();
    res.json({ success: true, message: 'Session disconnected and cleared.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function prepareImagePayload(imageUrlOrData: string): { image: any } {
  if (imageUrlOrData.startsWith('data:')) {
    const base64Index = imageUrlOrData.indexOf(';base64,');
    if (base64Index !== -1) {
      const base64Data = imageUrlOrData.slice(base64Index + 8);
      return { image: Buffer.from(base64Data, 'base64') };
    }
  }
  return { image: { url: imageUrlOrData } };
}

// 6. Post Status Update (Story Broadcast)
app.post('/api/status/post', async (req: Request, res: Response) => {
  try {
    const { text, imageUrl, backgroundColor } = req.body;

    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected. Link your device first.' });
    }

    if (!text && !imageUrl) {
      return res.status(400).json({ error: 'Provide either text or imageUrl to broadcast.' });
    }

    addLog(`Broadcasting new WhatsApp status story...`, 'info', 'status');

    if (imageUrl) {
      const imgPayload = prepareImagePayload(imageUrl);
      await sock.sendMessage('status@broadcast', {
        ...imgPayload,
        caption: text || ''
      }, {
        statusJidList: []
      });
    } else {
      await sock.sendMessage('status@broadcast', {
        text: text,
        backgroundColor: backgroundColor || '#075e54'
      }, {
        statusJidList: []
      });
    }

    stats.broadcastsSent++;
    addLog(`📢 Status broadcasted successfully to all contacts!`, 'success', 'status');
    broadcastStateUpdate();
    res.json({ success: true, message: 'Status story posted to WhatsApp.' });
  } catch (error: any) {
    console.error('Status post error:', error);
    addLog(`Status post failed: ${error.message}`, 'error', 'status');
    res.status(500).json({ error: error.message });
  }
});

// 7. Viewed Statuses Log Feed
app.get('/api/status/viewed-log', (req: Request, res: Response) => {
  res.json({
    statuses: viewedStatusesLog,
    totalViewed: stats.statusesViewed,
    totalReacted: stats.reactionsSent
  });
});

// 8. GROUP MANAGEMENT & CONTACT TAGGING APIS

// Fetch all joined groups
app.get('/api/groups', async (req: Request, res: Response) => {
  try {
    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const groupsData = await sock.groupFetchAllParticipating();
    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

    const groupList = Object.values(groupsData).map((g: any) => {
      const isBotAdmin = !!g.participants?.find((p: any) => (p.id === botJid || (activePhone && p.id?.includes(activePhone))) && (p.admin === 'admin' || p.admin === 'superadmin'));
      
      // Auto-index participants into contactsMap
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
      groups: groupList
    });
  } catch (err: any) {
    console.error('Failed to fetch groups:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch WhatsApp groups.' });
  }
});

// Fetch detailed group metadata (including participants with tag details)
app.get('/api/groups/:jid', async (req: Request, res: Response) => {
  try {
    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const jid = req.params.jid;
    const metadata = await sock.groupMetadata(jid);
    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const isBotAdmin = !!metadata.participants?.find((p: any) => (p.id === botJid || (activePhone && p.id?.includes(activePhone))) && (p.admin === 'admin' || p.admin === 'superadmin'));

    const groupTags = groupTagsMap.get(jid) || [];

    // Map participants with contact tag data
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
      
      // Remove deleted tag from contacts
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

// Group Tagging (Tag group itself + optionally tag all group participants)
app.post('/api/contacts/group-tag', async (req: Request, res: Response) => {
  try {
    const { jid, groupSubject, tags = [], tagParticipants = true } = req.body;
    if (!jid) return res.status(400).json({ error: 'Provide group jid.' });

    groupTagsMap.set(jid, tags);
    saveGroupTagsToFile();

    let participantsTaggedCount = 0;
    if (tagParticipants && sock) {
      try {
        const metadata = await sock.groupMetadata(jid);
        if (metadata && metadata.participants) {
          metadata.participants.forEach((p: any) => {
            const contact = recordContact(p.id, undefined, jid, groupSubject || metadata.subject, tags);
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

// Edit Contact Info (Name, Notes, Tags)
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

// Generate VCF Data for a Group or Tagged Contacts
app.post('/api/contacts/vcf/generate', async (req: Request, res: Response) => {
  try {
    const { 
      jid, 
      groupJids = [], 
      contactJids = [], 
      tagIds = [], 
      prefix, 
      excludeBot = true,
      includeAdminsOnly = false 
    } = req.body;

    let targetContacts: { phone: string; name: string; org?: string; note?: string }[] = [];
    let groupSubject = 'WhatsApp Contacts';

    const botPhone = activePhone || sock?.user?.id?.split(':')[0]?.split('@')[0];

    // Case 1: Single Group VCF Generation
    if (jid) {
      if (sock && connectionStatus === 'connected') {
        const metadata = await sock.groupMetadata(jid);
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
        // Fallback to indexed contacts
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
    } 
    // Case 2: Tag-Based Contacts VCF Generation
    else if (tagIds.length > 0) {
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
    }
    // Case 3: Explicit Contact JIDs
    else if (contactJids.length > 0) {
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

// Send VCF File Directly Into WhatsApp Group for all members to download & save
app.post('/api/contacts/vcf/send-group', async (req: Request, res: Response) => {
  try {
    const { 
      jid, 
      groupSubject, 
      prefix, 
      customCaption, 
      excludeBot = true, 
      includeAdminsOnly = false 
    } = req.body;

    if (!jid) return res.status(400).json({ error: 'Provide group jid.' });
    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    addLog(`📁 Generating Contact Gain VCF for group ${jid.split('@')[0]}...`, 'info', 'group');

    const metadata = await sock.groupMetadata(jid);
    const subject = groupSubject || metadata.subject || 'Group Contacts';
    const cleanGroupName = subject.replace(/[^\w\s-]/g, '').trim();
    const botPhone = activePhone || sock.user?.id?.split(':')[0]?.split('@')[0];

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

    // Send Document via Baileys
    await sock.sendMessage(jid, {
      document: vcfBuffer,
      mimetype: 'text/vcard',
      fileName: safeFileName,
      caption: captionToSend
    });

    stats.broadcastsSent++;
    addLog(`📁✓ Contact Gain VCF (${targetContacts.length} contacts) sent successfully to group "${subject}"!`, 'success', 'group');
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
    const { jid, tag, prefix } = req.query;
    let targetContacts: { phone: string; name: string; org?: string }[] = [];
    let title = 'contacts';

    if (jid && sock && connectionStatus === 'connected') {
      const metadata = await sock.groupMetadata(String(jid));
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

// Update group participants (promote / demote / remove)
app.post('/api/groups/participants', async (req: Request, res: Response) => {
  try {
    const { jid, targetJid, action } = req.body;
    if (!jid || !targetJid || !action) {
      return res.status(400).json({ error: 'Provide jid, targetJid, and action (promote|demote|remove).' });
    }

    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const formattedTarget = targetJid.includes('@') ? targetJid : `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const response = await sock.groupParticipantsUpdate(jid, [formattedTarget], action);

    addLog(`Group action "${action}" on participant ${formattedTarget} in group ${jid}`, 'info', 'group');
    res.json({ success: true, response });
  } catch (err: any) {
    console.error('Participant update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update participant.' });
  }
});

// Update group settings (announcement lock / info edit)
app.post('/api/groups/settings', async (req: Request, res: Response) => {
  try {
    const { jid, setting } = req.body;
    if (!jid || !setting) {
      return res.status(400).json({ error: 'Provide jid and setting.' });
    }

    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    await sock.groupSettingUpdate(jid, setting);
    addLog(`Updated group ${jid} setting to "${setting}"`, 'info', 'group');
    res.json({ success: true, message: `Group setting updated to ${setting}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get group invite code
app.post('/api/groups/invite-code', async (req: Request, res: Response) => {
  try {
    const { jid } = req.body;
    if (!jid) return res.status(400).json({ error: 'Provide group jid.' });

    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const code = await sock.groupInviteCode(jid);
    res.json({ success: true, code, link: `https://chat.whatsapp.com/${code}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get invite code. Ensure bot is group admin.' });
  }
});

// Image Upload Endpoint (stores or returns data URL / local asset)
app.post('/api/upload-image', (req: Request, res: Response) => {
  try {
    const { dataUrl, fileName } = req.body;
    if (!dataUrl) return res.status(400).json({ error: 'Provide dataUrl.' });
    res.json({ success: true, url: dataUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. AUTOMATED MULTI-GROUP & TAGGED CONTACT BROADCAST CAMPAIGN ENGINE (ANTI-BAN SAFEGUARDS)

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

// Start Campaign (Supports Groups or Tagged Contacts Direct Broadcast)
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
      batchPauseMinutes = 3
    } = req.body;

    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected. Connect account first.' });
    }

    // Resolve target JIDs based on targetMode
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

    addLog(`🚀 Started Broadcast Campaign across ${targetDesc} with Anti-Ban safeguards.`, 'info', 'campaign');
    broadcastStateUpdate();

    runCampaignStep();

    res.json({ success: true, campaign: currentCampaign });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function runCampaignStep() {
  if (currentCampaign.status !== 'running') return;

  const targetList = currentCampaign.targetMode === 'tagged_contacts' || currentCampaign.targetMode === 'direct_contacts'
    ? (currentCampaign.targetContactJids || [])
    : currentCampaign.targetGroupJids;

  if (currentCampaign.currentIndex >= targetList.length) {
    currentCampaign.status = 'completed';
    currentCampaign.completedAt = new Date().toISOString();
    addLog(`🎉 Campaign completed! Sent to ${currentCampaign.sentCount} recipients (${currentCampaign.failedCount} failed).`, 'success', 'campaign');
    broadcastStateUpdate();
    return;
  }

  const jid = targetList[currentCampaign.currentIndex];
  currentCampaign.currentGroupJid = jid;

  try {
    // Dynamic Personalization Variables Replacement for Tagged Contacts
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
      const imgPayload = prepareImagePayload(currentCampaign.imageUrl);
      await sock.sendMessage(jid, {
        ...imgPayload,
        caption: messageContent
      });
    } else {
      await sock.sendMessage(jid, {
        text: messageContent
      });
    }

    currentCampaign.sentCount++;
    stats.campaignMessagesSent++;
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
    return;
  }

  // Check Batch Pause Anti-Ban rule
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
        runCampaignStep();
      }
    }, 1000);

    return;
  }

  // Randomized Pacing Jitter Delay
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
      runCampaignStep();
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
    runCampaignStep();
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
  res.json({ success: true, campaign: currentCampaign });
});

// Get Campaign Status
app.get('/api/campaigns/status', (req: Request, res: Response) => {
  res.json({ campaign: currentCampaign });
});

// 10. Update Configuration
app.post('/api/config', (req: Request, res: Response) => {
  const { 
    autoReact, 
    reactionEmojis, 
    autoView, 
    aiResponder, 
    aiTriggerMode, 
    triggerKeywords, 
    systemPrompt, 
    geminiKey, 
    viewDelaySeconds,
    typingDelaySeconds,
    fallbackRules 
  } = req.body;

  if (typeof autoReact === 'boolean') config.autoReact = autoReact;
  if (Array.isArray(reactionEmojis)) config.reactionEmojis = reactionEmojis;
  if (typeof autoView === 'boolean') config.autoView = autoView;
  if (typeof aiResponder === 'boolean') config.aiResponder = aiResponder;
  if (typeof aiTriggerMode === 'string' && (aiTriggerMode === 'all' || aiTriggerMode === 'keywords_only')) {
    config.aiTriggerMode = aiTriggerMode;
  }
  if (Array.isArray(triggerKeywords)) config.triggerKeywords = triggerKeywords;
  if (typeof systemPrompt === 'string') config.systemPrompt = systemPrompt;
  if (typeof geminiKey === 'string') config.geminiKey = geminiKey;
  if (typeof viewDelaySeconds === 'number') config.viewDelaySeconds = viewDelaySeconds;
  if (typeof typingDelaySeconds === 'number') config.typingDelaySeconds = typingDelaySeconds;
  if (Array.isArray(fallbackRules)) config.fallbackRules = fallbackRules;

  saveConfigToFile();
  addLog('Automation configuration updated.', 'info', 'system');
  broadcastStateUpdate();
  res.json({ success: true, config });
});

// 11. Activity Logs
app.get('/api/logs', (req: Request, res: Response) => {
  res.json({ logs: recentLogs, stats });
});

// 12. Server-Sent Events (SSE) Stream
app.get('/api/logs/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clientsSse.push(res);

  res.write(`data: ${JSON.stringify({
    type: 'init',
    status: connectionStatus,
    phase: connectionPhase,
    phone: activePhone,
    name: activePushName,
    hasQr: !!qrCodeDataUrl,
    qr: qrCodeDataUrl,
    logs: recentLogs.slice(0, 50),
    stats,
    config,
    campaign: currentCampaign
  })}\n\n`);

  req.on('close', () => {
    clientsSse = clientsSse.filter(c => c !== res);
  });
});

// 13. Test AI Simulator endpoint
app.post('/api/ai/test', async (req: Request, res: Response) => {
  try {
    const { message, systemPrompt } = req.body;
    const apiKey = config.geminiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    let reply = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message || 'Hello, what services do you offer?',
        config: {
          systemInstruction: systemPrompt || config.systemPrompt
        }
      });
      reply = response.text?.trim() || '';
    } catch (e) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message || 'Hello, what services do you offer?',
        config: {
          systemInstruction: systemPrompt || config.systemPrompt
        }
      });
      reply = response.text?.trim() || '';
    }

    res.json({
      reply: reply || 'No response generated.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dev / Prod Vite Middleware Mount
async function startServer() {
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log('Running in static server mode');
      const distDir = path.join(__dirname, 'dist');
      const publicDir = path.join(__dirname, 'public');
      if (fs.existsSync(distDir)) {
        app.use(express.static(distDir));
      } else if (fs.existsSync(publicDir)) {
        app.use(express.static(publicDir));
      }
    }
  } else {
    const distDir = path.join(__dirname, 'dist');
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    } else if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
      app.get('*', (req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 WhatsApp Growth & Automation Engine Online!`);
    console.log(`📡 Server listening on http://0.0.0.0:${PORT}`);
    console.log(`====================================================`);
    
    initWhatsApp(false);
  });
}

startServer();
