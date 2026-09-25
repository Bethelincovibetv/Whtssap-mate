import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-Memory Configuration & Persistence
const CONFIG_FILE = path.join(__dirname, 'config.json');
export interface EngineConfig {
  autoView: boolean;
  autoReact: boolean;
  reactionEmojis: string[];
  aiResponder: boolean;
  systemPrompt: string;
  geminiKey: string;
  viewDelaySeconds: number;
}

let config: EngineConfig = {
  autoView: true,
  autoReact: true,
  reactionEmojis: ['🔥', '👏', '❤️', '🚀', '😍', '⚡'],
  aiResponder: true,
  systemPrompt: `You are an elite sales consultant and friendly customer service executive. 
Respond to incoming WhatsApp inquiries with warmth, confidence, and professionalism.
Keep your replies concise, formatted cleanly for mobile (use *bold* and bullet points when listing items), and focused on helping the customer take the next action.`,
  geminiKey: process.env.GEMINI_API_KEY || '',
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

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'event' | 'success' | 'warn' | 'error';
  metadata?: any;
}

let sock: any = null;
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let qrCodeDataUrl: string | null = null;
let activePhone: string | null = null;
let activePushName: string | null = null;
let recentLogs: ActivityLog[] = [];
let clientsSse: Response[] = [];

const stats = {
  statusesViewed: 0,
  reactionsSent: 0,
  aiRepliesSent: 0,
  broadcastsSent: 0,
  startedAt: new Date().toISOString()
};

function addLog(message: string, type: ActivityLog['type'] = 'info', metadata?: any) {
  const logItem: ActivityLog = {
    id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    message,
    type,
    metadata
  };
  recentLogs.unshift(logItem);
  if (recentLogs.length > 300) recentLogs.pop();
  
  console.log(`[WA Engine][${type.toUpperCase()}] ${message}`);

  // Broadcast to SSE clients
  const sseData = `data: ${JSON.stringify({ type: 'log', log: logItem, stats })}\n\n`;
  clientsSse.forEach(client => {
    try {
      client.write(sseData);
    } catch (e) {}
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
    try {
      client.write(sseData);
    } catch (e) {}
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

    addLog(`Initializing Baileys WhatsApp Engine v${version.join('.')}${isLatest ? ' (latest)' : ''}...`, 'info');

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
          addLog('QR Code generated. Ready for pairing or direct scan.', 'info');
          broadcastStateUpdate();
        } catch (err: any) {
          console.error('Failed to generate QR code data URL', err);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        qrCodeDataUrl = null;
        activePhone = sock.user?.id?.split(':')[0]?.split('@')[0] || sock.user?.id || 'Connected User';
        activePushName = sock.user?.name || sock.user?.notify || 'My WhatsApp Account';
        addLog(`WhatsApp socket connected as +${activePhone} (${activePushName})`, 'success');
        broadcastStateUpdate();
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        qrCodeDataUrl = null;

        addLog(`Connection closed: ${lastDisconnect?.error?.message || 'Status code ' + statusCode}. Reconnect: ${shouldReconnect}`, 'warn');
        broadcastStateUpdate();

        if (statusCode === DisconnectReason.loggedOut) {
          addLog('Device logged out. Clearing auth credentials...', 'warn');
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

    // Background Inbound Messages Listener
    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
      if (!messages || !messages.length) return;

      for (const msg of messages) {
        const remoteJid = msg.key?.remoteJid;
        const fromMe = msg.key?.fromMe;

        // 1. Status Broadcast Handling (Auto-View & Auto-React)
        if (remoteJid === 'status@broadcast') {
          const participant = msg.key?.participant || 'Contact';
          const senderName = msg.pushName || participant.split('@')[0];
          const senderPhone = participant.split('@')[0];

          // Auto-View Status
          if (config.autoView && sock) {
            try {
              const delay = (config.viewDelaySeconds || 2) * 1000 + Math.random() * 1000;
              setTimeout(async () => {
                try {
                  if (sock) {
                    await sock.readMessages([msg.key]);
                    stats.statusesViewed++;
                    addLog(`👁️ Viewed status story from ${senderName} (+${senderPhone})`, 'event');
                    broadcastStateUpdate();
                  }
                } catch (e: any) {
                  console.error('Status view error:', e?.message);
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
              const reactDelay = 2500 + Math.random() * 2500;
              
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
                    addLog(`🔥 Auto-reacted ${randomEmoji} to story from ${senderName}`, 'event');
                    broadcastStateUpdate();
                  }
                } catch (reactErr: any) {
                  console.error('Status reaction error:', reactErr?.message);
                }
              }, reactDelay);
            } catch (err: any) {
              console.error('Error scheduling reaction:', err?.message);
            }
          }
        }

        // 2. Direct 1-on-1 Messages (AI Auto-Responder with Gemini)
        if (remoteJid && remoteJid.endsWith('@s.whatsapp.net') && !fromMe && config.aiResponder) {
          const text = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption || '';

          if (!text || text.startsWith('/skip') || text.startsWith('!stop')) continue;

          const senderName = msg.pushName || 'Customer';
          const senderPhone = remoteJid.split('@')[0];

          addLog(`📥 Incoming DM from ${senderName} (+${senderPhone}): "${text}"`, 'info');

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

              const userContext = `WhatsApp Contact: ${senderName} (Phone: +${senderPhone})\nReceived Message: "${text}"`;

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: userContext,
                config: {
                  systemInstruction: config.systemPrompt
                }
              });

              const replyText = response?.text?.trim();

              if (replyText && sock) {
                // Natural presence indicator
                await sock.sendPresenceUpdate('composing', remoteJid);
                
                setTimeout(async () => {
                  try {
                    if (sock) {
                      await sock.sendMessage(remoteJid, { text: replyText }, { quoted: msg });
                      stats.aiRepliesSent++;
                      addLog(`🤖 Sent Gemini AI Response to ${senderName}: "${replyText.slice(0, 60)}..."`, 'success');
                      await sock.sendPresenceUpdate('paused', remoteJid);
                      broadcastStateUpdate();
                    }
                  } catch (sendErr: any) {
                    console.error('Error sending AI response:', sendErr?.message);
                  }
                }, 1200 + Math.random() * 1500);
              }
            } else {
              addLog('⚠️ AI Auto-Responder skipped: GEMINI_API_KEY not configured.', 'warn');
            }
          } catch (aiErr: any) {
            console.error('Gemini AI generation failed:', aiErr?.message);
            addLog(`❌ AI Responder error: ${aiErr?.message}`, 'error');
          }
        }
      }
    });

  } catch (error: any) {
    console.error('Fatal initialization error in WhatsApp engine:', error);
    addLog(`Engine initial error: ${error.message}`, 'error');
    connectionStatus = 'disconnected';
    setTimeout(() => initWhatsApp(true), 5000);
  }
}

// REST API ROUTES

// 1. Status & Stats
app.get('/api/status', (req: Request, res: Response) => {
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

// 2. QR Code
app.get('/api/qr', (req: Request, res: Response) => {
  res.json({
    qr: qrCodeDataUrl,
    status: connectionStatus
  });
});

// 3. 8-Digit Pairing Code
app.post('/api/pairing-code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Please enter a valid WhatsApp phone number.' });
    }

    const cleanedNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    if (cleanedNumber.length < 8 || cleanedNumber.length > 16) {
      return res.status(400).json({ error: 'Invalid phone number format. Please include country code without symbols (e.g. 2347043537401 or 14155552671).' });
    }

    if (connectionStatus === 'connected') {
      return res.status(400).json({ error: 'WhatsApp is already connected! Disconnect first to link a new number.' });
    }

    if (!sock) {
      await initWhatsApp();
    }

    addLog(`Requesting 8-digit Pairing Code for +${cleanedNumber}...`, 'info');
    
    // Call Baileys requestPairingCode
    const code = await sock.requestPairingCode(cleanedNumber);
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

    addLog(`Pairing code generated: ${formattedCode}`, 'success');

    res.json({
      success: true,
      phoneNumber: cleanedNumber,
      code: formattedCode,
      rawCode: code
    });
  } catch (error: any) {
    console.error('Pairing code request error:', error);
    addLog(`Pairing code request failed: ${error.message}`, 'error');
    res.status(500).json({
      error: error.message || 'Failed to request pairing code from WhatsApp servers. Please retry in a few seconds.'
    });
  }
});

// 4. Disconnect & Clear Auth
app.post('/api/logout', async (req: Request, res: Response) => {
  try {
    addLog('User requested WhatsApp session disconnect.', 'info');
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
    res.json({ success: true, message: 'WhatsApp session disconnected and storage cleared.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Post Status Broadcast
app.post('/api/status/post', async (req: Request, res: Response) => {
  try {
    const { text, imageUrl, backgroundColor } = req.body;

    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp is not connected. Link your device before posting status stories.' });
    }

    if (!text && !imageUrl) {
      return res.status(400).json({ error: 'Please enter status text or provide an image URL to broadcast.' });
    }

    addLog(`Publishing new WhatsApp Status Story...`, 'info');

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
        backgroundColor: backgroundColor || '#075e54'
      }, {
        statusJidList: []
      });
    }

    stats.broadcastsSent++;
    addLog(`📢 Status story published successfully to all saved contacts!`, 'success');
    broadcastStateUpdate();

    res.json({ success: true, message: 'Status story posted to WhatsApp.' });
  } catch (error: any) {
    console.error('Status post error:', error);
    addLog(`Status post failed: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// 6. Update Configuration
app.post('/api/config', (req: Request, res: Response) => {
  const { autoReact, reactionEmojis, autoView, aiResponder, systemPrompt, geminiKey, viewDelaySeconds } = req.body;

  if (typeof autoReact === 'boolean') config.autoReact = autoReact;
  if (Array.isArray(reactionEmojis)) config.reactionEmojis = reactionEmojis;
  if (typeof autoView === 'boolean') config.autoView = autoView;
  if (typeof aiResponder === 'boolean') config.aiResponder = aiResponder;
  if (typeof systemPrompt === 'string') config.systemPrompt = systemPrompt;
  if (typeof geminiKey === 'string') config.geminiKey = geminiKey;
  if (typeof viewDelaySeconds === 'number') config.viewDelaySeconds = viewDelaySeconds;

  saveConfigToFile();
  addLog('Engine configuration updated.', 'info');
  broadcastStateUpdate();
  res.json({ success: true, config });
});

// 7. Activity Logs
app.get('/api/logs', (req: Request, res: Response) => {
  res.json({ logs: recentLogs, stats });
});

// 8. Server-Sent Events (SSE) Stream
app.get('/api/logs/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clientsSse.push(res);

  // Send initial snapshot
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

// 9. AI Sandbox Test Endpoint
app.post('/api/ai/test', async (req: Request, res: Response) => {
  try {
    const { message, systemPrompt } = req.body;
    const apiKey = config.geminiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not set.' });
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
      contents: message || 'Hi! What are your prices and services?',
      config: {
        systemInstruction: systemPrompt || config.systemPrompt
      }
    });

    res.json({
      reply: response.text?.trim() || 'No response generated.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize Vite in Dev mode or serve static files in Production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    const publicPath = path.join(__dirname, 'public');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    } else {
      app.use(express.static(publicPath));
      app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 WhatsApp Growth & Automation Engine Online!`);
    console.log(`📡 Server running at http://0.0.0.0:${PORT}`);
    console.log(`====================================================`);

    // Start Baileys in background
    initWhatsApp();
  });
}

startServer();
