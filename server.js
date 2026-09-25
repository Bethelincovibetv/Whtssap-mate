import * as baileysPkg from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Safe import resolver for Baileys ESM & CJS compatibility
const makeWASocket = baileysPkg.default?.default || baileysPkg.default || baileysPkg.makeWASocket || baileysPkg;
const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = baileysPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static frontend serving
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
} else if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// In-Memory State & Configurations
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
  autoView: true,
  autoReact: true,
  reactionEmojis: ['🔥', '👏', '❤️', '🚀', '😍', '⚡'],
  aiResponder: true,
  systemPrompt: 'You are an intelligent, friendly AI assistant for WhatsApp. Help answer user questions, explain services, and qualify leads accurately and politely. Keep responses concise (under 3 sentences) unless asked for more details.',
  geminiKey: process.env.GEMINI_API_KEY || '',
  viewDelaySeconds: 2
};

// Load saved config if exists
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

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let qrCodeDataUrl = null;
let activePhone = null;
let activePushName = null;
let recentLogs = [];
let clientsSse = [];

let stats = {
  statusesViewed: 0,
  reactionsSent: 0,
  aiRepliesSent: 0,
  broadcastsSent: 0,
  startedAt: new Date().toISOString()
};

function addLog(message, type = 'info') {
  const logItem = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    message,
    type
  };
  recentLogs.unshift(logItem);
  if (recentLogs.length > 300) recentLogs.pop();
  console.log(`[WA Engine] ${message}`);

  const sseData = `data: ${JSON.stringify({ type: 'log', log: logItem, stats })}\n\n`;
  clientsSse.forEach(client => {
    try { client.write(sseData); } catch (e) {}
  });
}

function broadcastStateUpdate() {
  const sseData = `data: ${JSON.stringify({
    type: 'state',
    status: connectionStatus,
    phone: activePhone,
    name: activePushName,
    hasQr: !!qrCodeDataUrl,
    qr: qrCodeDataUrl,
    stats,
    config
  })}\n\n`;
  clientsSse.forEach(client => {
    try { client.write(sseData); } catch (e) {}
  });
}

const AUTH_DIR = path.join(__dirname, 'session_auth');

async function initWhatsApp(isRestart = false) {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    addLog(`Starting Baileys WA Engine v${version.join('.')}${isLatest ? ' (latest)' : ''}...`);

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: ['WhatsApp Growth Engine', 'Chrome', '1.0.0'],
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            color: { dark: '#075e54', light: '#ffffff' }
          });
          connectionStatus = 'connecting';
          addLog('QR Code generated. Scan with WhatsApp or use 8-digit Pairing Code.', 'info');
          broadcastStateUpdate();
        } catch (err) {
          console.error('Failed to generate QR code data URL', err);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        qrCodeDataUrl = null;
        activePhone = sock.user?.id?.split(':')[0]?.split('@')[0] || sock.user?.id || 'Connected User';
        activePushName = sock.user?.name || sock.user?.notify || 'My WhatsApp';
        addLog(`Successfully connected as +${activePhone} (${activePushName})`, 'success');
        broadcastStateUpdate();
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        qrCodeDataUrl = null;
        
        addLog(`Connection closed: ${lastDisconnect?.error?.message || 'Code ' + statusCode}. Reconnect: ${shouldReconnect}`, 'warn');
        broadcastStateUpdate();

        if (statusCode === DisconnectReason.loggedOut) {
          addLog('Session logged out by user. Cleaning session files...', 'warn');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          activePhone = null;
          activePushName = null;
          setTimeout(() => initWhatsApp(true), 2000);
        } else if (shouldReconnect) {
          setTimeout(() => initWhatsApp(true), 3000);
        }
      }
    });

    // Inbound Messages Listener
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (!messages || !messages.length) return;

      for (const msg of messages) {
        const remoteJid = msg.key?.remoteJid;
        const fromMe = msg.key?.fromMe;

        // 1. WhatsApp Status Broadcast Event
        if (remoteJid === 'status@broadcast') {
          const participant = msg.key?.participant || 'Contact';
          const senderName = msg.pushName || participant.split('@')[0];

          // Auto-View Status
          if (config.autoView && sock) {
            try {
              const delay = (config.viewDelaySeconds || 2) * 1000 + Math.random() * 1000;
              setTimeout(async () => {
                try {
                  if (sock) {
                    await sock.readMessages([msg.key]);
                    stats.statusesViewed++;
                    addLog(`👁️ Auto-viewed status from ${senderName} (+${participant.split('@')[0]})`, 'event');
                    broadcastStateUpdate();
                  }
                } catch (err) {
                  console.error('Error auto-viewing status:', err?.message);
                }
              }, delay);
            } catch (err) {
              console.error('Error scheduling status view:', err?.message);
            }
          }

          // Auto-React to Status
          if (config.autoReact && sock && config.reactionEmojis?.length > 0) {
            try {
              const randomEmoji = config.reactionEmojis[Math.floor(Math.random() * config.reactionEmojis.length)];
              setTimeout(async () => {
                try {
                  if (sock) {
                    await sock.sendMessage(remoteJid, {
                      react: {
                        text: randomEmoji,
                        key: msg.key
                      }
                    });
                    stats.reactionsSent++;
                    addLog(`🔥 Auto-reacted ${randomEmoji} to status from ${senderName}`, 'event');
                    broadcastStateUpdate();
                  }
                } catch (reactErr) {
                  console.error('Error auto-reacting:', reactErr?.message);
                }
              }, 1500 + Math.random() * 2000);
            } catch (err) {
              console.error('Error preparing reaction:', err?.message);
            }
          }
        }

        // 2. Direct 1-on-1 Messages (AI Auto-Responder)
        if (remoteJid && remoteJid.endsWith('@s.whatsapp.net') && !fromMe && config.aiResponder) {
          const text = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption || '';

          if (!text || text.startsWith('/skip')) continue;

          const senderName = msg.pushName || 'Customer';
          const senderPhone = remoteJid.split('@')[0];

          addLog(`📥 Incoming DM from ${senderName} (+${senderPhone}): "${text}"`, 'info');

          // Process with Gemini AI
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

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt
              });

              const replyText = response?.text?.trim();

              if (replyText && sock) {
                await sock.sendPresenceUpdate('composing', remoteJid);
                setTimeout(async () => {
                  try {
                    if (sock) {
                      await sock.sendMessage(remoteJid, { text: replyText }, { quoted: msg });
                      stats.aiRepliesSent++;
                      addLog(`🤖 Sent Gemini AI Reply to ${senderName}: "${replyText.slice(0, 60)}..."`, 'success');
                      await sock.sendPresenceUpdate('paused', remoteJid);
                      broadcastStateUpdate();
                    }
                  } catch (sendErr) {
                    console.error('Error sending AI reply:', sendErr?.message);
                  }
                }, 1000 + Math.random() * 1500);
              }
            } else {
              addLog('⚠️ AI Auto-Responder skipped: GEMINI_API_KEY not configured.', 'warn');
            }
          } catch (aiErr) {
            console.error('Gemini AI generation failed:', aiErr?.message);
            addLog(`❌ AI Responder error: ${aiErr?.message}`, 'error');
          }
        }
      }
    });

  } catch (error) {
    console.error('Fatal initialization error in WhatsApp engine:', error);
    addLog(`Fatal engine error: ${error.message}`, 'error');
    connectionStatus = 'disconnected';
    setTimeout(() => initWhatsApp(true), 5000);
  }
}

// REST API Endpoints

// 1. Engine Status
app.get('/api/status', (req, res) => {
  res.json({
    status: connectionStatus,
    phone: activePhone,
    name: activePushName,
    hasQr: !!qrCodeDataUrl,
    qr: qrCodeDataUrl,
    autoReact: config.autoReact,
    autoView: config.autoView,
    aiResponder: config.aiResponder,
    reactionEmojis: config.reactionEmojis,
    systemPrompt: config.systemPrompt,
    viewDelaySeconds: config.viewDelaySeconds,
    stats
  });
});

// 2. QR Code endpoint
app.get('/api/qr', (req, res) => {
  res.json({
    qr: qrCodeDataUrl,
    status: connectionStatus
  });
});

// 3. 8-Digit Pairing Code API
app.post('/api/pairing-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Please provide a valid phoneNumber in request body.' });
    }

    const cleanedNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    if (cleanedNumber.length < 8 || cleanedNumber.length > 16) {
      return res.status(400).json({ error: 'Invalid phone number format. Include country code (e.g. 2347043537401 or 14155552671).' });
    }

    if (connectionStatus === 'connected') {
      return res.status(400).json({ error: 'WhatsApp is already connected. Disconnect first to link a new number.' });
    }

    if (!sock) {
      await initWhatsApp();
    }

    addLog(`Requesting 8-digit Pairing Code for +${cleanedNumber}...`);
    
    // Request code from Baileys
    const code = await sock.requestPairingCode(cleanedNumber);
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

    addLog(`Pairing code generated: ${formattedCode}`, 'success');

    res.json({
      success: true,
      phoneNumber: cleanedNumber,
      code: formattedCode,
      rawCode: code
    });
  } catch (error) {
    console.error('Pairing code request error:', error);
    addLog(`Pairing code request failed: ${error.message}`, 'error');
    res.status(500).json({
      error: error.message || 'Failed to request pairing code from WhatsApp servers.'
    });
  }
});

// 4. Logout / Reset Session
app.post('/api/logout', async (req, res) => {
  try {
    addLog('User requested WhatsApp session disconnect.');
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
      try {
        sock.end(undefined);
      } catch (e) {}
    }
    
    connectionStatus = 'disconnected';
    activePhone = null;
    activePushName = null;
    qrCodeDataUrl = null;

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }

    setTimeout(() => initWhatsApp(true), 1500);

    broadcastStateUpdate();
    res.json({ success: true, message: 'Session disconnected and cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Post Status Update (Story Broadcast)
app.post('/api/status/post', async (req, res) => {
  try {
    const { text, imageUrl } = req.body;

    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected. Link your device first.' });
    }

    if (!text && !imageUrl) {
      return res.status(400).json({ error: 'Provide either text or imageUrl to broadcast.' });
    }

    addLog(`Broadcasting new WhatsApp status story...`);

    if (imageUrl) {
      await sock.sendMessage('status@broadcast', {
        image: { url: imageUrl },
        caption: text || ''
      }, {
        statusJidList: []
      });
    } else {
      await sock.sendMessage('status@broadcast', {
        text: text,
        backgroundColor: '#075e54'
      }, {
        statusJidList: []
      });
    }

    stats.broadcastsSent++;
    addLog(`📢 Status broadcasted successfully to all contacts!`, 'success');
    broadcastStateUpdate();
    res.json({ success: true, message: 'Status story posted to WhatsApp.' });
  } catch (error) {
    console.error('Status post error:', error);
    addLog(`Status post failed: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// 6. Update Configuration
app.post('/api/config', (req, res) => {
  const { autoReact, reactionEmojis, autoView, aiResponder, systemPrompt, geminiKey, viewDelaySeconds } = req.body;

  if (typeof autoReact === 'boolean') config.autoReact = autoReact;
  if (Array.isArray(reactionEmojis)) config.reactionEmojis = reactionEmojis;
  if (typeof autoView === 'boolean') config.autoView = autoView;
  if (typeof aiResponder === 'boolean') config.aiResponder = aiResponder;
  if (typeof systemPrompt === 'string') config.systemPrompt = systemPrompt;
  if (typeof geminiKey === 'string') config.geminiKey = geminiKey;
  if (typeof viewDelaySeconds === 'number') config.viewDelaySeconds = viewDelaySeconds;

  saveConfigToFile();
  addLog('Automation configuration updated.', 'info');
  broadcastStateUpdate();
  res.json({ success: true, config });
});

// 7. Activity Logs
app.get('/api/logs', (req, res) => {
  res.json({ logs: recentLogs, stats });
});

// 8. Server-Sent Events (SSE) Stream
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clientsSse.push(res);

  res.write(`data: ${JSON.stringify({
    type: 'init',
    status: connectionStatus,
    phone: activePhone,
    name: activePushName,
    hasQr: !!qrCodeDataUrl,
    qr: qrCodeDataUrl,
    logs: recentLogs.slice(0, 50),
    stats,
    config
  })}\n\n`);

  req.on('close', () => {
    clientsSse = clientsSse.filter(c => c !== res);
  });
});

// 9. Test AI Simulator endpoint
app.post('/api/ai/test', async (req, res) => {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message || 'Hello, what services do you offer?',
      config: {
        systemInstruction: systemPrompt || config.systemPrompt
      }
    });

    res.json({
      reply: response.text?.trim() || 'No response generated.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route to serve index.html for SPA routing
app.get('*', (req, res) => {
  if (fs.existsSync(distDir)) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else if (fs.existsSync(publicDir)) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.send('WhatsApp Growth Engine is starting...');
  }
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 WhatsApp Growth & Automation Engine Online!`);
  console.log(`📡 Server listening on http://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
  
  // Start Baileys in background
  initWhatsApp();
});
