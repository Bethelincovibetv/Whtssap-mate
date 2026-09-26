var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "node_modules/dotenv/lib/main.js"(exports, module) {
    var fs2 = __require("fs");
    var path2 = __require("path");
    var os = __require("os");
    var crypto2 = __require("crypto");
    var TIPS = [
      "\u25C8 encrypted .env [www.dotenvx.com]",
      "\u25C8 secrets for agents [www.dotenvx.com]",
      "\u2301 auth for agents [www.vestauth.com]",
      "\u2318 custom filepath { path: '/custom/path/.env' }",
      "\u2318 enable debugging { debug: true }",
      "\u2318 override existing { override: true }",
      "\u2318 suppress logs { quiet: true }",
      "\u2318 multiple files { path: ['.env.local', '.env'] }"
    ];
    function _getRandomTip() {
      return TIPS[Math.floor(Math.random() * TIPS.length)];
    }
    function parseBoolean(value) {
      if (typeof value === "string") {
        return !["false", "0", "no", "off", ""].includes(value.toLowerCase());
      }
      return Boolean(value);
    }
    function supportsAnsi() {
      return process.stdout.isTTY;
    }
    function dim(text) {
      return supportsAnsi() ? `\x1B[2m${text}\x1B[0m` : text;
    }
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      options = options || {};
      const vaultPath = _vaultPath(options);
      options.path = vaultPath;
      const result = DotenvModule.configDotenv(options);
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.error(`\u26A0 ${message}`);
    }
    function _debug(message) {
      console.log(`\u2506 ${message}`);
    }
    function _log(message) {
      console.log(`\u25C7 ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs2.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path2.resolve(process.cwd(), ".env.vault");
      }
      if (fs2.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path2.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || options && options.debug);
      const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (debug || !quiet) {
        _log("loading env from encrypted .env.vault");
      }
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path2.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || options && options.debug);
      let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("no encoding is specified (UTF-8 is used by default)");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path3 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs2.readFileSync(path3, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`failed to load ${path3} ${e.message}`);
          }
          lastError = e;
        }
      }
      const populated = DotenvModule.populate(processEnv, parsedAll, options);
      debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug);
      quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet);
      if (debug || !quiet) {
        const keysCount = Object.keys(populated).length;
        const shortPaths = [];
        for (const filePath of optionPaths) {
          try {
            const relative = path2.relative(process.cwd(), filePath);
            shortPaths.push(relative);
          } catch (e) {
            if (debug) {
              _debug(`failed to load ${filePath} ${e.message}`);
            }
            lastError = e;
          }
        }
        _log(`injected env (${keysCount}) from ${shortPaths.join(",")} ${dim(`// tip: ${_getRandomTip()}`)}`);
      }
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config2(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`you set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto2.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      const populated = {};
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
            populated[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
          populated[key] = parsed[key];
        }
      }
      return populated;
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config: config2,
      decrypt,
      parse,
      populate
    };
    module.exports.configDotenv = DotenvModule.configDotenv;
    module.exports._configVault = DotenvModule._configVault;
    module.exports._parseVault = DotenvModule._parseVault;
    module.exports.config = DotenvModule.config;
    module.exports.decrypt = DotenvModule.decrypt;
    module.exports.parse = DotenvModule.parse;
    module.exports.populate = DotenvModule.populate;
    module.exports = DotenvModule;
  }
});

// server.ts
var import_dotenv = __toESM(require_main(), 1);
import * as baileysPkg from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import_dotenv.default.config();
process.on("uncaughtException", (err) => {
  console.error("[Engine Uncaught Exception]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Engine Unhandled Rejection]", reason);
});
var baileys = baileysPkg.default || baileysPkg;
var makeWASocket = baileys.default || baileys.makeWASocket || baileys;
var DisconnectReason2 = baileys.DisconnectReason || baileysPkg.DisconnectReason || { loggedOut: 401 };
var useMultiFileAuthState2 = baileys.useMultiFileAuthState || baileysPkg.useMultiFileAuthState;
var fetchLatestBaileysVersion2 = baileys.fetchLatestBaileysVersion || baileysPkg.fetchLatestBaileysVersion;
var makeCacheableSignalKeyStore2 = baileys.makeCacheableSignalKeyStore || baileysPkg.makeCacheableSignalKeyStore;
var Browsers2 = baileys.Browsers || baileysPkg.Browsers;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
var isProduction = process.env.NODE_ENV === "production";
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
var CONFIG_FILE = path.join(__dirname, "config.json");
var config = {
  autoView: true,
  autoReact: true,
  reactionEmojis: ["\u{1F525}", "\u{1F44F}", "\u2764\uFE0F", "\u{1F680}", "\u{1F60D}", "\u26A1", "\u{1F4AF}"],
  aiResponder: true,
  aiTriggerMode: "all",
  triggerKeywords: ["price", "info", "buy", "order", "help", "services", "hi", "hello", "quote"],
  systemPrompt: `You are an elite sales consultant and friendly customer service executive. 
Respond to incoming WhatsApp inquiries with warmth, confidence, and professionalism.
Keep your replies concise, formatted cleanly for mobile (use *bold* and bullet points when listing items), and focused on helping the customer take the next action.`,
  geminiKey: process.env.GEMINI_API_KEY || "",
  viewDelaySeconds: 2,
  typingDelaySeconds: 2,
  fallbackRules: [
    {
      id: "rule_1",
      keywords: ["price", "pricing", "cost", "fee", "package"],
      reply: "Hello! \u{1F44B} Our standard plans start from $19/mo. Check our full package options here: https://example.com/pricing",
      enabled: true
    },
    {
      id: "rule_2",
      keywords: ["support", "help", "issue", "problem"],
      reply: "Hi there! \u{1F6E0}\uFE0F Our team is ready to assist. Please describe the issue in detail and an agent will follow up right away.",
      enabled: true
    },
    {
      id: "rule_3",
      keywords: ["hours", "location", "address"],
      reply: "\u{1F4CD} We are open Monday\u2013Friday from 9:00 AM to 6:00 PM. You can also reach us anytime right here on WhatsApp!",
      enabled: true
    }
  ]
};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    config = { ...config, ...saved };
  } catch (e) {
    console.error("Error loading config.json:", e);
  }
}
function saveConfigToFile() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error("Failed to save config.json:", e);
  }
}
var API_KEYS_FILE = path.join(__dirname, "api_keys.json");
var WEBHOOK_FILE = path.join(__dirname, "webhook.json");
var apiKeys = [];
var webhookConfig = {
  url: "",
  enabled: false,
  events: ["messages.upsert", "status.view"],
  secret: ""
};
if (fs.existsSync(API_KEYS_FILE)) {
  try {
    apiKeys = JSON.parse(fs.readFileSync(API_KEYS_FILE, "utf-8"));
  } catch (e) {
    console.error("Error loading api_keys.json:", e);
  }
} else {
  const starterKey = {
    id: "key_" + crypto.randomBytes(4).toString("hex"),
    name: "Primary Integration Key",
    key: "wge_live_" + crypto.randomBytes(16).toString("hex"),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastUsedAt: null,
    requestCount: 0,
    status: "active",
    permissions: ["messages:send", "messages:media", "groups:read", "groups:send", "status:read"]
  };
  apiKeys = [starterKey];
  try {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  } catch (e) {
  }
}
if (fs.existsSync(WEBHOOK_FILE)) {
  try {
    webhookConfig = JSON.parse(fs.readFileSync(WEBHOOK_FILE, "utf-8"));
  } catch (e) {
  }
}
function saveApiKeysToFile() {
  try {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  } catch (e) {
    console.error("Failed to save api_keys.json:", e);
  }
}
function saveWebhookToFile() {
  try {
    fs.writeFileSync(WEBHOOK_FILE, JSON.stringify(webhookConfig, null, 2));
  } catch (e) {
    console.error("Failed to save webhook.json:", e);
  }
}
var SESSIONS_BASE_DIR = process.env.DATA_DIR || path.join(__dirname, "session_auth");
var ACCOUNTS_FILE = path.join(__dirname, "accounts.json");
var accountsMap = /* @__PURE__ */ new Map();
var activeAccountId = "acc_primary";
function loadAccounts() {
  if (!fs.existsSync(SESSIONS_BASE_DIR)) {
    fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
  }
  let savedAccounts = [];
  if (fs.existsSync(ACCOUNTS_FILE)) {
    try {
      savedAccounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
    } catch (e) {
      console.error("Error loading accounts.json:", e);
    }
  }
  const legacyCreds = path.join(SESSIONS_BASE_DIR, "creds.json");
  const primaryDir = path.join(SESSIONS_BASE_DIR, "acc_primary");
  if (fs.existsSync(legacyCreds) && !fs.existsSync(primaryDir)) {
    try {
      fs.mkdirSync(primaryDir, { recursive: true });
      const entries = fs.readdirSync(SESSIONS_BASE_DIR);
      for (const entry of entries) {
        if (entry !== "acc_primary" && !entry.startsWith("acc_")) {
          const oldPath = path.join(SESSIONS_BASE_DIR, entry);
          const newPath = path.join(primaryDir, entry);
          if (fs.statSync(oldPath).isFile()) {
            fs.renameSync(oldPath, newPath);
          }
        }
      }
      console.log("[Migration] Migrated legacy single session to /acc_primary");
    } catch (err) {
      console.error("[Migration Error]", err);
    }
  }
  if (!savedAccounts || savedAccounts.length === 0) {
    savedAccounts = [
      {
        id: "acc_primary",
        label: "Account 1 (Primary)",
        phone: null,
        name: null,
        isDefault: true,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastConnectedAt: null
      }
    ];
    saveAccountsToFile(savedAccounts);
  }
  accountsMap.clear();
  for (const acc of savedAccounts) {
    accountsMap.set(acc.id, {
      id: acc.id,
      label: acc.label || "Account " + acc.id,
      phone: acc.phone || null,
      name: acc.name || null,
      status: "disconnected",
      phase: "idle",
      hasQr: false,
      qr: null,
      pairingCode: null,
      isDefault: !!acc.isDefault,
      createdAt: acc.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      lastConnectedAt: acc.lastConnectedAt || null,
      stats: {
        statusesViewed: 0,
        reactionsSent: 0,
        aiRepliesSent: 0,
        broadcastsSent: 0,
        campaignMessagesSent: 0,
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      sock: null,
      keepAliveTimer: null,
      reconnectAttemptCount: 0,
      isInitializing: false
    });
  }
  activeAccountId = savedAccounts[0]?.id || "acc_primary";
}
function saveAccountsToFile(customList) {
  try {
    const list = customList || Array.from(accountsMap.values()).map((a) => ({
      id: a.id,
      label: a.label,
      phone: a.phone,
      name: a.name,
      isDefault: a.id === activeAccountId,
      createdAt: a.createdAt,
      lastConnectedAt: a.lastConnectedAt
    }));
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2));
  } catch (e) {
    console.error("Failed to save accounts.json:", e);
  }
}
loadAccounts();
function getActiveAccount() {
  let acc = accountsMap.get(activeAccountId);
  if (!acc) {
    acc = accountsMap.values().next().value;
    if (acc) activeAccountId = acc.id;
  }
  return acc;
}
function getAllAccountsList() {
  return Array.from(accountsMap.values()).map((a) => ({
    id: a.id,
    label: a.label,
    phone: a.phone,
    name: a.name,
    status: a.status,
    phase: a.phase,
    hasQr: a.hasQr,
    qr: a.qr,
    pairingCode: a.pairingCode,
    isDefault: a.id === activeAccountId,
    createdAt: a.createdAt,
    lastConnectedAt: a.lastConnectedAt,
    stats: a.stats
  }));
}
var stats = {
  get statusesViewed() {
    return getActiveAccount()?.stats?.statusesViewed || 0;
  },
  set statusesViewed(v) {
    if (getActiveAccount()) getActiveAccount().stats.statusesViewed = v;
  },
  get reactionsSent() {
    return getActiveAccount()?.stats?.reactionsSent || 0;
  },
  set reactionsSent(v) {
    if (getActiveAccount()) getActiveAccount().stats.reactionsSent = v;
  },
  get aiRepliesSent() {
    return getActiveAccount()?.stats?.aiRepliesSent || 0;
  },
  set aiRepliesSent(v) {
    if (getActiveAccount()) getActiveAccount().stats.aiRepliesSent = v;
  },
  get broadcastsSent() {
    return getActiveAccount()?.stats?.broadcastsSent || 0;
  },
  set broadcastsSent(v) {
    if (getActiveAccount()) getActiveAccount().stats.broadcastsSent = v;
  },
  get campaignMessagesSent() {
    return getActiveAccount()?.stats?.campaignMessagesSent || 0;
  },
  set campaignMessagesSent(v) {
    if (getActiveAccount()) getActiveAccount().stats.campaignMessagesSent = v;
  },
  startedAt: (/* @__PURE__ */ new Date()).toISOString()
};
var recentLogs = [];
var viewedStatusesLog = [];
var clientsSse = [];
var sock = null;
var connectionStatus = "disconnected";
var connectionPhase = "idle";
var qrCodeDataUrl = null;
var activePhone = null;
var activePushName = null;
function parseSpintax(text) {
  if (!text) return "";
  const spintaxRegex = /\{([^{}]+)\}/;
  let matches;
  while ((matches = spintaxRegex.exec(text)) !== null) {
    const choices = matches[1].split("|");
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    text = text.replace(matches[0], randomChoice);
  }
  return text;
}
var currentCampaign = {
  id: "",
  status: "idle",
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
  templateText: "",
  imageUrl: "",
  nextSendInSec: 0,
  batchPauseRemainingSec: 0,
  startedAt: "",
  completedAt: null,
  logs: []
};
var campaignIntervalTimer = null;
var campaignCountdownTimer = null;
function addLog(message, type = "info", category = "system", metadata) {
  const logItem = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    message,
    type,
    category,
    metadata
  };
  recentLogs.unshift(logItem);
  if (recentLogs.length > 300) recentLogs.pop();
  console.log(`[WA Engine][${category?.toUpperCase()}][${type.toUpperCase()}] ${message}`);
  const sseData = `data: ${JSON.stringify({ type: "log", log: logItem, stats, campaign: currentCampaign })}

`;
  clientsSse.forEach((client) => {
    try {
      client.write(sseData);
    } catch (e) {
    }
  });
}
function broadcastStateUpdate() {
  const activeAcc = getActiveAccount();
  const accountsList = getAllAccountsList();
  sock = activeAcc?.sock || null;
  connectionStatus = activeAcc?.status || "disconnected";
  connectionPhase = activeAcc?.phase || "idle";
  qrCodeDataUrl = activeAcc?.qr || null;
  activePhone = activeAcc?.phone || null;
  activePushName = activeAcc?.name || null;
  const sseData = `data: ${JSON.stringify({
    type: "state",
    status: activeAcc?.status || "disconnected",
    phase: activeAcc?.phase || "idle",
    phone: activeAcc?.phone || null,
    name: activeAcc?.name || null,
    hasQr: !!activeAcc?.qr,
    qr: activeAcc?.qr || null,
    pairingCode: activeAcc?.pairingCode || null,
    stats: activeAcc?.stats || stats,
    config,
    campaign: currentCampaign,
    activeAccountId: activeAcc?.id,
    accounts: accountsList
  })}

`;
  clientsSse.forEach((client) => {
    try {
      client.write(sseData);
    } catch (e) {
    }
  });
}
function extractMessageText(message) {
  if (!message) return "";
  return message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || message.videoMessage?.caption || message.documentMessage?.caption || message.buttonsResponseMessage?.selectedDisplayText || message.templateButtonReplyMessage?.selectedDisplayText || message.listResponseMessage?.title || "";
}
async function initAccountSocket(accountId, forceFresh = false) {
  const account = accountsMap.get(accountId);
  if (!account) return;
  if (account.isInitializing) return;
  account.isInitializing = true;
  try {
    if (account.sock) {
      try {
        account.sock.ev.removeAllListeners("connection.update");
        account.sock.ev.removeAllListeners("creds.update");
        account.sock.ev.removeAllListeners("messages.upsert");
        account.sock.ev.removeAllListeners("groups.update");
        account.sock.ev.removeAllListeners("group-participants.update");
        if (account.sock.ws) {
          try {
            account.sock.ws.close();
          } catch (e) {
          }
        }
        try {
          account.sock.end(void 0);
        } catch (e) {
        }
      } catch (e) {
      }
      account.sock = null;
    }
    if (account.keepAliveTimer) {
      clearInterval(account.keepAliveTimer);
      account.keepAliveTimer = null;
    }
    const accAuthDir = path.join(SESSIONS_BASE_DIR, account.id);
    if (forceFresh) {
      addLog(`[${account.label}] Clearing credentials for fresh setup...`, "info", "system");
      if (fs.existsSync(accAuthDir)) {
        fs.rmSync(accAuthDir, { recursive: true, force: true });
      }
      account.phone = null;
      account.name = null;
      account.qr = null;
      account.pairingCode = null;
      saveAccountsToFile();
    }
    if (!fs.existsSync(accAuthDir)) {
      fs.mkdirSync(accAuthDir, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState2(accAuthDir);
    const { version } = await fetchLatestBaileysVersion2().catch(() => ({ version: [2, 3e3, 1015901307], isLatest: true }));
    addLog(`[${account.label}] Initializing Baileys Socket v${version.join(".")}...`, "info", "system");
    account.status = "connecting";
    account.phase = "initializing";
    broadcastStateUpdate();
    const browserTuple = ["Ubuntu", "Chrome", "20.0.04"];
    const sockInstance = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore2(state.keys, pino({ level: "silent" }))
      },
      browser: browserTuple,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      connectTimeoutMs: 6e4,
      defaultQueryTimeoutMs: 6e4,
      keepAliveIntervalMs: 1e4,
      retryRequestDelayMs: 250,
      getMessage: async () => ({ conversation: "" })
    });
    account.sock = sockInstance;
    sockInstance.ev.on("creds.update", saveCreds);
    sockInstance.ev.on("group-participants.update", async ({ id, participants, action }) => {
      try {
        const formattedAction = action === "add" ? "joined" : action === "remove" ? "left" : action;
        const members = (participants || []).map((p) => "+" + p.split("@")[0]).join(", ");
        addLog(`\u{1F465} [${account.label}] Group Update: ${members} ${formattedAction} (${id.split("@")[0]})`, "info", "group");
        broadcastStateUpdate();
      } catch (e) {
      }
    });
    sockInstance.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        try {
          account.qr = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: "M",
            margin: 2,
            color: { dark: "#075e54", light: "#ffffff" }
          });
          account.status = "connecting";
          account.phase = "awaiting_pair";
          addLog(`[${account.label}] QR Code ready. Scan or enter phone number to pair.`, "info", "system");
          broadcastStateUpdate();
        } catch (err) {
          console.error("Failed to generate QR code data URL", err);
        }
      }
      if (connection === "open") {
        account.status = "connected";
        account.phase = "ready";
        account.qr = null;
        account.pairingCode = null;
        account.reconnectAttemptCount = 0;
        account.phone = sockInstance.user?.id?.split(":")[0]?.split("@")[0] || sockInstance.user?.id || "Connected User";
        account.name = sockInstance.user?.name || sockInstance.user?.notify || account.label;
        account.lastConnectedAt = (/* @__PURE__ */ new Date()).toISOString();
        saveAccountsToFile();
        addLog(`\u2705 WhatsApp account [${account.label}] connected as +${account.phone} (${account.name})`, "success", "system");
        if (account.keepAliveTimer) clearInterval(account.keepAliveTimer);
        account.keepAliveTimer = setInterval(async () => {
          try {
            if (account.sock && account.status === "connected") {
              await account.sock.sendPresenceUpdate("available").catch(() => {
              });
              if (account.sock.ws && typeof account.sock.ws.ping === "function") {
                try {
                  account.sock.ws.ping();
                } catch (e) {
                }
              }
            }
          } catch (err) {
            console.warn(`[Keep-Alive ${account.label}]`, err?.message);
          }
        }, 2e4);
        sockInstance.sendPresenceUpdate("available").catch(() => {
        });
        broadcastStateUpdate();
      }
      if (connection === "close") {
        if (account.keepAliveTimer) {
          clearInterval(account.keepAliveTimer);
          account.keepAliveTimer = null;
        }
        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason2.loggedOut || statusCode === 401;
        const shouldReconnect = !isLoggedOut;
        account.status = "disconnected";
        account.phase = "closed";
        account.qr = null;
        addLog(`[${account.label}] Connection closed: ${lastDisconnect?.error?.message || "Status " + statusCode}. Reconnecting: ${shouldReconnect}`, "warn", "system");
        broadcastStateUpdate();
        if (isLoggedOut) {
          addLog(`[${account.label}] Session logged out. Cleaning storage...`, "warn", "system");
          try {
            fs.rmSync(accAuthDir, { recursive: true, force: true });
          } catch (e) {
          }
          account.phone = null;
          account.name = null;
          saveAccountsToFile();
          setTimeout(() => {
            account.isInitializing = false;
            initAccountSocket(account.id, true);
          }, 2e3);
        } else if (shouldReconnect) {
          account.reconnectAttemptCount++;
          const retryDelay = Math.min(2e3 * Math.pow(1.3, Math.min(account.reconnectAttemptCount, 6)), 15e3);
          addLog(`[${account.label}] Auto-reconnecting socket in ${Math.round(retryDelay / 1e3)}s (Attempt #${account.reconnectAttemptCount})...`, "info", "system");
          setTimeout(() => {
            account.isInitializing = false;
            initAccountSocket(account.id, false);
          }, retryDelay);
        }
      }
    });
    sockInstance.ev.on("messages.upsert", async ({ messages }) => {
      if (!messages || !messages.length) return;
      for (const msg of messages) {
        if (!msg || !msg.key) continue;
        const remoteJid = msg.key?.remoteJid;
        const fromMe = msg.key?.fromMe;
        if (remoteJid === "status@broadcast") {
          if (fromMe) continue;
          const participant = msg.key?.participant || msg.participant || msg.key?.participantJid || "";
          if (!participant) continue;
          const senderPhone = participant.split("@")[0] || "Contact";
          const senderName = msg.pushName || senderPhone;
          if (config.autoView && account.sock) {
            try {
              const delay = (config.viewDelaySeconds || 2) * 1e3 + Math.random() * 800;
              setTimeout(async () => {
                try {
                  if (account.sock && account.status === "connected") {
                    await account.sock.readMessages([{
                      remoteJid: "status@broadcast",
                      id: msg.key.id,
                      participant
                    }]);
                    account.stats.statusesViewed++;
                    stats.statusesViewed++;
                    const statusItem = {
                      id: msg.key.id || String(Date.now()),
                      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                      senderPhone,
                      senderName,
                      reactedEmoji: null
                    };
                    viewedStatusesLog.unshift(statusItem);
                    if (viewedStatusesLog.length > 100) viewedStatusesLog.pop();
                    addLog(`\u{1F441}\uFE0F [${account.label}] Viewed story from ${senderName} (+${senderPhone})`, "event", "status");
                    broadcastStateUpdate();
                  }
                } catch (err) {
                  console.error("Error auto-viewing status:", err?.message);
                }
              }, delay);
            } catch (err) {
              console.error("Error scheduling status view:", err?.message);
            }
          }
          if (config.autoReact && account.sock && config.reactionEmojis?.length > 0) {
            try {
              const randomEmoji = config.reactionEmojis[Math.floor(Math.random() * config.reactionEmojis.length)];
              const reactDelay = (config.viewDelaySeconds || 2) * 1e3 + 1200 + Math.random() * 1500;
              setTimeout(async () => {
                try {
                  if (account.sock && account.status === "connected") {
                    try {
                      await account.sock.sendMessage("status@broadcast", {
                        react: { text: randomEmoji, key: msg.key }
                      }, {
                        statusJidList: [participant]
                      });
                    } catch (e1) {
                      try {
                        await account.sock.sendMessage(participant, {
                          react: { text: randomEmoji, key: msg.key }
                        });
                      } catch (e2) {
                      }
                    }
                    account.stats.reactionsSent++;
                    stats.reactionsSent++;
                    const found = viewedStatusesLog.find((s) => s.senderPhone === senderPhone);
                    if (found) found.reactedEmoji = randomEmoji;
                    addLog(`\u{1F525} [${account.label}] Auto-reacted ${randomEmoji} to story from ${senderName}`, "event", "status");
                    broadcastStateUpdate();
                  }
                } catch (reactErr) {
                  console.error("Error auto-reacting:", reactErr?.message);
                }
              }, reactDelay);
            } catch (err) {
              console.error("Error preparing reaction:", err?.message);
            }
          }
        }
        if (remoteJid && remoteJid.endsWith("@s.whatsapp.net") && !fromMe && config.aiResponder) {
          const text = extractMessageText(msg.message);
          if (!text || text.startsWith("/skip") || text.startsWith("!stop")) continue;
          const senderName = msg.pushName || "Customer";
          const senderPhone = remoteJid.split("@")[0];
          const textLower = text.toLowerCase();
          if (config.aiTriggerMode === "keywords_only") {
            const hasMatchingTrigger = (config.triggerKeywords || []).some(
              (kw) => textLower.includes(kw.toLowerCase())
            );
            if (!hasMatchingTrigger) {
              continue;
            }
          }
          addLog(`\u{1F4E5} [${account.label}] Incoming DM from ${senderName} (+${senderPhone}): "${text}"`, "info", "ai");
          if (webhookConfig.enabled && webhookConfig.url) {
            fetch(webhookConfig.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...webhookConfig.secret ? { "x-webhook-secret": webhookConfig.secret } : {}
              },
              body: JSON.stringify({
                event: "message.received",
                accountId: account.id,
                accountLabel: account.label,
                from: senderPhone,
                name: senderName,
                text,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              })
            }).catch((err) => console.warn("[Webhook Dispatch Error]", err?.message));
          }
          const matchedRule = (config.fallbackRules || []).find(
            (r) => r.enabled && r.keywords.some((k) => textLower.includes(k.toLowerCase()))
          );
          let replyText = "";
          if (matchedRule) {
            replyText = matchedRule.reply;
            addLog(`\u{1F3AF} [${account.label}] Matched Rule Response for keyword: "${matchedRule.keywords.join(", ")}"`, "info", "ai");
          }
          if (!replyText) {
            try {
              const apiKey = config.geminiKey || process.env.GEMINI_API_KEY;
              if (apiKey) {
                const ai = new GoogleGenAI({
                  apiKey,
                  httpOptions: {
                    headers: {
                      "User-Agent": "aistudio-build"
                    }
                  }
                });
                const prompt = `A customer named "${senderName}" (+${senderPhone}) sent the following message on WhatsApp: "${text}". Reply to them following these business instructions:

${config.systemPrompt}

Keep the reply natural, friendly, formatted for WhatsApp (use *bold* where appropriate), and concise.`;
                try {
                  const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt
                  });
                  replyText = response?.text?.trim() || "";
                } catch (modelErr) {
                  const response = await ai.models.generateContent({
                    model: "gemini-3.8-flash",
                    contents: prompt
                  });
                  replyText = response?.text?.trim() || "";
                }
              } else {
                if (config.fallbackRules && config.fallbackRules.length > 0) {
                  replyText = config.fallbackRules[0].reply;
                }
              }
            } catch (aiErr) {
              console.error("Gemini AI generation failed:", aiErr?.message);
              addLog(`\u274C [${account.label}] AI Responder error: ${aiErr?.message}`, "error", "ai");
            }
          }
          if (replyText && account.sock) {
            const typingDuration = (config.typingDelaySeconds || 2) * 1e3;
            try {
              await account.sock.sendPresenceUpdate("composing", remoteJid);
            } catch (e) {
            }
            setTimeout(async () => {
              try {
                if (account.sock) {
                  await account.sock.sendMessage(remoteJid, { text: replyText }, { quoted: msg });
                  account.stats.aiRepliesSent++;
                  stats.aiRepliesSent++;
                  addLog(`\u{1F916} [${account.label}] Sent AI Reply to ${senderName}: "${replyText.slice(0, 60)}..."`, "success", "ai");
                  try {
                    await account.sock.sendPresenceUpdate("paused", remoteJid);
                  } catch (e) {
                  }
                  broadcastStateUpdate();
                }
              } catch (sendErr) {
                console.error("Error sending AI reply:", sendErr?.message);
              }
            }, typingDuration);
          }
        }
      }
    });
  } catch (error) {
    console.error(`Fatal initialization error for account ${account.label}:`, error);
    addLog(`[${account.label}] Fatal engine error: ${error.message}`, "error", "system");
    account.status = "disconnected";
    account.phase = "error";
    setTimeout(() => {
      account.isInitializing = false;
      initAccountSocket(account.id, false);
    }, 5e3);
  } finally {
    account.isInitializing = false;
  }
}
async function initAllAccounts() {
  for (const acc of accountsMap.values()) {
    initAccountSocket(acc.id, false);
  }
}
app.get(["/api/ping", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    connected: connectionStatus === "connected",
    phone: activePhone,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
function validateApiKey(req, res, next) {
  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"];
  let token = apiKeyHeader;
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    return res.status(401).json({
      error: "Unauthorized: Missing API key. Pass via x-api-key header or Authorization: Bearer <key>"
    });
  }
  const foundKey = apiKeys.find((k) => k.key === token && k.status === "active");
  if (!foundKey) {
    return res.status(401).json({
      error: "Unauthorized: Invalid or revoked API key."
    });
  }
  foundKey.requestCount = (foundKey.requestCount || 0) + 1;
  foundKey.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveApiKeysToFile();
  req.apiKey = foundKey;
  next();
}
app.get("/api/keys", (req, res) => {
  res.json({ keys: apiKeys });
});
app.post("/api/keys", (req, res) => {
  try {
    const { name, permissions } = req.body;
    const newKey = {
      id: "key_" + crypto.randomBytes(4).toString("hex"),
      name: (name || "API Client").trim(),
      key: "wge_live_" + crypto.randomBytes(16).toString("hex"),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastUsedAt: null,
      requestCount: 0,
      status: "active",
      permissions: permissions || ["messages:send", "messages:media", "groups:read", "groups:send", "status:read"]
    };
    apiKeys.unshift(newKey);
    saveApiKeysToFile();
    addLog(`\u{1F511} Generated new API Key: "${newKey.name}"`, "info", "system");
    res.json({ success: true, key: newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/keys/:id", (req, res) => {
  const { id } = req.params;
  const index = apiKeys.findIndex((k) => k.id === id);
  if (index !== -1) {
    const removed = apiKeys.splice(index, 1)[0];
    saveApiKeysToFile();
    addLog(`\u{1F5D1}\uFE0F Revoked API Key: "${removed.name}"`, "warn", "system");
    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: "API key not found" });
  }
});
app.get("/api/webhook/config", (req, res) => {
  res.json(webhookConfig);
});
app.post("/api/webhook/config", (req, res) => {
  try {
    const { url, secret, enabled } = req.body;
    webhookConfig = {
      ...webhookConfig,
      url: (url || "").trim(),
      secret: (secret || "").trim(),
      enabled: !!enabled
    };
    saveWebhookToFile();
    addLog(`\u{1F310} Webhook config updated: ${webhookConfig.enabled ? webhookConfig.url : "Disabled"}`, "info", "system");
    res.json({ success: true, config: webhookConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/v1/status", validateApiKey, (req, res) => {
  const activeAcc = getActiveAccount();
  res.json({
    status: activeAcc?.status || "disconnected",
    phase: activeAcc?.phase || "idle",
    phone: activeAcc?.phone || null,
    name: activeAcc?.name || null,
    connected: activeAcc?.status === "connected",
    activeAccountId: activeAcc?.id,
    accountsCount: accountsMap.size,
    uptime: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/v1/accounts", validateApiKey, (req, res) => {
  res.json({
    success: true,
    count: accountsMap.size,
    activeAccountId,
    accounts: getAllAccountsList()
  });
});
app.post("/api/v1/messages/send", validateApiKey, async (req, res) => {
  try {
    const { to, message, accountId } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: "to" and "message" are required.' });
    }
    const targetAcc = accountId && accountsMap.get(accountId) || getActiveAccount();
    if (!targetAcc || !targetAcc.sock || targetAcc.status !== "connected") {
      return res.status(503).json({
        error: `WhatsApp account "${targetAcc?.label || "Active"}" is not connected. Pair WhatsApp in dashboard first.`
      });
    }
    let cleanNumber = String(to).replace(/[^0-9]/g, "");
    let jid = "";
    if (String(to).endsWith("@g.us") || String(to).endsWith("@s.whatsapp.net")) {
      jid = to;
    } else {
      if (!cleanNumber || cleanNumber.length < 8) {
        return res.status(400).json({ error: "Invalid destination phone number. Include full country dial code." });
      }
      jid = `${cleanNumber}@s.whatsapp.net`;
    }
    const parsedText = parseSpintax(message);
    const result = await targetAcc.sock.sendMessage(jid, { text: parsedText });
    targetAcc.stats.campaignMessagesSent++;
    stats.campaignMessagesSent++;
    addLog(`\u{1F680} [REST API][${targetAcc.label}] Sent message to ${cleanNumber || jid}: "${parsedText.slice(0, 45)}..."`, "success", "system");
    broadcastStateUpdate();
    res.json({
      success: true,
      messageId: result?.key?.id || "msg_" + Date.now(),
      to: jid,
      accountId: targetAcc.id,
      accountLabel: targetAcc.label,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("API Send Message Error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/v1/messages/send-media", validateApiKey, async (req, res) => {
  try {
    const { to, mediaUrl, base64, mimeType, caption, fileName, accountId } = req.body;
    if (!to || !mediaUrl && !base64) {
      return res.status(400).json({ error: 'Missing required fields: "to" and either "mediaUrl" or "base64" are required.' });
    }
    const targetAcc = accountId && accountsMap.get(accountId) || getActiveAccount();
    if (!targetAcc || !targetAcc.sock || targetAcc.status !== "connected") {
      return res.status(503).json({ error: `WhatsApp account "${targetAcc?.label || "Active"}" is not connected.` });
    }
    let cleanNumber = String(to).replace(/[^0-9]/g, "");
    let jid = String(to).includes("@") ? to : `${cleanNumber}@s.whatsapp.net`;
    let buffer;
    if (base64) {
      const cleanB64 = base64.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(cleanB64, "base64");
    } else {
      const fetchRes = await fetch(mediaUrl);
      if (!fetchRes.ok) throw new Error(`Failed to download media from URL: ${fetchRes.statusText}`);
      const arrayBuf = await fetchRes.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    }
    const type = (mimeType || "image/jpeg").toLowerCase();
    let messagePayload = {};
    if (type.startsWith("image/")) {
      messagePayload = { image: buffer, caption: caption || "" };
    } else if (type.startsWith("audio/")) {
      messagePayload = { audio: buffer, mimetype: type, ptt: true };
    } else {
      messagePayload = { document: buffer, mimetype: type, fileName: fileName || "document", caption: caption || "" };
    }
    const result = await targetAcc.sock.sendMessage(jid, messagePayload);
    addLog(`\u{1F4CE} [REST API][${targetAcc.label}] Sent media to ${cleanNumber || jid}`, "success", "system");
    broadcastStateUpdate();
    res.json({
      success: true,
      messageId: result?.key?.id,
      to: jid,
      accountId: targetAcc.id,
      accountLabel: targetAcc.label,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/v1/groups", validateApiKey, async (req, res) => {
  try {
    if (!sock || connectionStatus !== "connected") {
      return res.status(503).json({ error: "WhatsApp socket is not connected." });
    }
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups).map((g) => ({
      id: g.id,
      subject: g.subject,
      size: g.size || g.participants?.length || 0,
      creation: g.creation,
      owner: g.owner
    }));
    res.json({ success: true, count: groupList.length, groups: groupList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/v1/groups/send", validateApiKey, async (req, res) => {
  try {
    const { groupId, message } = req.body;
    if (!groupId || !message) {
      return res.status(400).json({ error: 'Fields "groupId" and "message" are required.' });
    }
    if (!sock || connectionStatus !== "connected") {
      return res.status(503).json({ error: "WhatsApp socket is not connected." });
    }
    const jid = groupId.includes("@g.us") ? groupId : `${groupId}@g.us`;
    const parsedText = parseSpintax(message);
    const result = await sock.sendMessage(jid, { text: parsedText });
    stats.campaignMessagesSent++;
    addLog(`\u{1F465} [REST API] Dispatched message to group (${jid})`, "success", "group");
    broadcastStateUpdate();
    res.json({
      success: true,
      messageId: result?.key?.id,
      groupId: jid,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/v1/stats", validateApiKey, (req, res) => {
  res.json({
    success: true,
    stats,
    connected: connectionStatus === "connected",
    phone: activePhone,
    uptime: Math.floor(process.uptime())
  });
});
app.get("/api/accounts", (req, res) => {
  res.json({
    accounts: getAllAccountsList(),
    activeAccountId
  });
});
app.post("/api/accounts", async (req, res) => {
  try {
    const { label } = req.body;
    const newId = "acc_" + Date.now().toString(36);
    const newAccount = {
      id: newId,
      label: (label || `Account ${accountsMap.size + 1}`).trim(),
      phone: null,
      name: null,
      status: "disconnected",
      phase: "idle",
      hasQr: false,
      qr: null,
      pairingCode: null,
      isDefault: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastConnectedAt: null,
      stats: {
        statusesViewed: 0,
        reactionsSent: 0,
        aiRepliesSent: 0,
        broadcastsSent: 0,
        campaignMessagesSent: 0,
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      sock: null,
      keepAliveTimer: null,
      reconnectAttemptCount: 0,
      isInitializing: false
    };
    accountsMap.set(newId, newAccount);
    activeAccountId = newId;
    saveAccountsToFile();
    addLog(`\u2795 Created new WhatsApp account: "${newAccount.label}"`, "info", "system");
    initAccountSocket(newId, false);
    broadcastStateUpdate();
    res.json({ success: true, account: newAccount, activeAccountId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/accounts/:id/select", (req, res) => {
  const { id } = req.params;
  if (!accountsMap.has(id)) {
    return res.status(404).json({ error: "Account not found" });
  }
  activeAccountId = id;
  saveAccountsToFile();
  addLog(`\u{1F504} Switched active account to: "${accountsMap.get(id)?.label}"`, "info", "system");
  broadcastStateUpdate();
  res.json({ success: true, activeAccountId, account: accountsMap.get(id) });
});
app.patch("/api/accounts/:id", (req, res) => {
  const { id } = req.params;
  const { label } = req.body;
  const acc = accountsMap.get(id);
  if (!acc) return res.status(404).json({ error: "Account not found" });
  if (label && typeof label === "string") {
    acc.label = label.trim();
    saveAccountsToFile();
    broadcastStateUpdate();
  }
  res.json({ success: true, account: acc });
});
app.post("/api/accounts/:id/connect", async (req, res) => {
  const { id } = req.params;
  if (!accountsMap.has(id)) return res.status(404).json({ error: "Account not found" });
  await initAccountSocket(id, false);
  res.json({ success: true, message: `Started connection for ${id}` });
});
app.post("/api/accounts/:id/disconnect", async (req, res) => {
  const { id } = req.params;
  const acc = accountsMap.get(id);
  if (!acc) return res.status(404).json({ error: "Account not found" });
  if (acc.sock) {
    try {
      await acc.sock.logout();
    } catch (e) {
    }
    try {
      acc.sock.end(void 0);
    } catch (e) {
    }
    acc.sock = null;
  }
  if (acc.keepAliveTimer) {
    clearInterval(acc.keepAliveTimer);
    acc.keepAliveTimer = null;
  }
  acc.status = "disconnected";
  acc.phase = "closed";
  acc.phone = null;
  acc.name = null;
  acc.qr = null;
  acc.pairingCode = null;
  const accAuthDir = path.join(SESSIONS_BASE_DIR, id);
  if (fs.existsSync(accAuthDir)) {
    try {
      fs.rmSync(accAuthDir, { recursive: true, force: true });
    } catch (e) {
    }
  }
  saveAccountsToFile();
  addLog(`\u{1F50C} Disconnected account "${acc.label}"`, "warn", "system");
  setTimeout(() => initAccountSocket(id, true), 1500);
  broadcastStateUpdate();
  res.json({ success: true, message: `Account ${acc.label} disconnected.` });
});
app.delete("/api/accounts/:id", async (req, res) => {
  const { id } = req.params;
  if (accountsMap.size <= 1) {
    return res.status(400).json({ error: "Cannot delete the only account in system. Disconnect it instead." });
  }
  const acc = accountsMap.get(id);
  if (!acc) return res.status(404).json({ error: "Account not found" });
  if (acc.sock) {
    try {
      await acc.sock.logout();
    } catch (e) {
    }
    try {
      acc.sock.end(void 0);
    } catch (e) {
    }
    acc.sock = null;
  }
  if (acc.keepAliveTimer) {
    clearInterval(acc.keepAliveTimer);
    acc.keepAliveTimer = null;
  }
  const accAuthDir = path.join(SESSIONS_BASE_DIR, id);
  if (fs.existsSync(accAuthDir)) {
    try {
      fs.rmSync(accAuthDir, { recursive: true, force: true });
    } catch (e) {
    }
  }
  accountsMap.delete(id);
  if (activeAccountId === id) {
    const nextAcc = accountsMap.values().next().value;
    if (nextAcc) activeAccountId = nextAcc.id;
  }
  saveAccountsToFile();
  addLog(`\u{1F5D1}\uFE0F Removed account "${acc.label}"`, "warn", "system");
  broadcastStateUpdate();
  res.json({ success: true, message: `Account ${acc.label} deleted.`, activeAccountId });
});
app.get("/api/status", (req, res) => {
  const activeAcc = getActiveAccount();
  res.json({
    status: activeAcc?.status || "disconnected",
    phase: activeAcc?.phase || "idle",
    phone: activeAcc?.phone || null,
    name: activeAcc?.name || null,
    hasQr: !!activeAcc?.qr,
    qr: activeAcc?.qr || null,
    pairingCode: activeAcc?.pairingCode || null,
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
    stats: activeAcc?.stats || stats,
    campaign: currentCampaign,
    activeAccountId: activeAcc?.id,
    accounts: getAllAccountsList()
  });
});
app.get("/api/qr", (req, res) => {
  const activeAcc = getActiveAccount();
  res.json({
    qr: activeAcc?.qr || null,
    status: activeAcc?.status || "disconnected",
    phase: activeAcc?.phase || "idle"
  });
});
app.post("/api/pairing-code", async (req, res) => {
  try {
    const { phoneNumber, accountId } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: "Please provide a valid phone number in request body." });
    }
    const cleanedNumber = String(phoneNumber).replace(/[^0-9]/g, "");
    if (cleanedNumber.length < 8 || cleanedNumber.length > 16) {
      return res.status(400).json({ error: "Invalid phone number format. Include country code (e.g. 2347043537401 or 14155552671)." });
    }
    const targetAcc = accountId && accountsMap.get(accountId) || getActiveAccount();
    if (targetAcc.status === "connected") {
      return res.status(400).json({ error: `WhatsApp account [${targetAcc.label}] is already connected! Click "Disconnect" first to link a new number.` });
    }
    if (!targetAcc.sock || !targetAcc.sock.ws || targetAcc.sock.ws.readyState !== 1) {
      addLog(`[${targetAcc.label}] Socket connecting for pairing code request...`, "info", "system");
      await initAccountSocket(targetAcc.id, false);
      let retries = 0;
      while ((!targetAcc.sock || !targetAcc.sock.ws || targetAcc.sock.ws.readyState !== 1) && retries < 15) {
        await new Promise((r) => setTimeout(r, 400));
        retries++;
      }
    }
    if (!targetAcc.sock || typeof targetAcc.sock.requestPairingCode !== "function") {
      throw new Error(`Socket engine not ready for ${targetAcc.label}. Please try again or click Reset Session.`);
    }
    addLog(`Requesting official 8-digit Pairing Code for +${cleanedNumber} (${targetAcc.label})...`, "info", "system");
    const code = await targetAcc.sock.requestPairingCode(cleanedNumber);
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
    targetAcc.pairingCode = formattedCode;
    broadcastStateUpdate();
    addLog(`Pairing code generated for [${targetAcc.label}]: ${formattedCode}`, "success", "system");
    res.json({
      success: true,
      phoneNumber: cleanedNumber,
      code: formattedCode,
      rawCode: code,
      accountId: targetAcc.id
    });
  } catch (error) {
    console.error("Pairing code request error:", error);
    addLog(`Pairing code request failed: ${error.message}`, "error", "system");
    res.status(500).json({
      error: error.message || 'Failed to request pairing code. If session is stuck, click "Reset Session" and retry.'
    });
  }
});
app.post("/api/reset-session", async (req, res) => {
  try {
    const { accountId } = req.body || {};
    const targetAcc = accountId && accountsMap.get(accountId) || getActiveAccount();
    addLog(`User triggered Force Reset of session for "${targetAcc.label}".`, "info", "system");
    await initAccountSocket(targetAcc.id, true);
    res.json({ success: true, message: `Session storage cleared for ${targetAcc.label} and socket restarted.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/logout", async (req, res) => {
  try {
    const { accountId } = req.body || {};
    const targetAcc = accountId && accountsMap.get(accountId) || getActiveAccount();
    addLog(`User requested WhatsApp session disconnect for "${targetAcc.label}".`, "info", "system");
    if (targetAcc.sock) {
      try {
        await targetAcc.sock.logout();
      } catch (e) {
      }
      try {
        targetAcc.sock.end(void 0);
      } catch (e) {
      }
      targetAcc.sock = null;
    }
    if (targetAcc.keepAliveTimer) {
      clearInterval(targetAcc.keepAliveTimer);
      targetAcc.keepAliveTimer = null;
    }
    targetAcc.status = "disconnected";
    targetAcc.phase = "closed";
    targetAcc.phone = null;
    targetAcc.name = null;
    targetAcc.qr = null;
    targetAcc.pairingCode = null;
    const accAuthDir = path.join(SESSIONS_BASE_DIR, targetAcc.id);
    if (fs.existsSync(accAuthDir)) {
      try {
        fs.rmSync(accAuthDir, { recursive: true, force: true });
      } catch (e) {
      }
    }
    saveAccountsToFile();
    setTimeout(() => initAccountSocket(targetAcc.id, true), 1500);
    broadcastStateUpdate();
    res.json({ success: true, message: `Session for "${targetAcc.label}" disconnected and cleared.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/status/post", async (req, res) => {
  try {
    const { text, imageUrl, backgroundColor } = req.body;
    if (connectionStatus !== "connected" || !sock) {
      return res.status(400).json({ error: "WhatsApp is not connected. Link your device first." });
    }
    if (!text && !imageUrl) {
      return res.status(400).json({ error: "Provide either text or imageUrl to broadcast." });
    }
    addLog(`Broadcasting new WhatsApp status story...`, "info", "status");
    if (imageUrl) {
      await sock.sendMessage("status@broadcast", {
        image: { url: imageUrl },
        caption: text || ""
      }, {
        statusJidList: []
      });
    } else {
      await sock.sendMessage("status@broadcast", {
        text,
        backgroundColor: backgroundColor || "#075e54"
      }, {
        statusJidList: []
      });
    }
    stats.broadcastsSent++;
    addLog(`\u{1F4E2} Status broadcasted successfully to all contacts!`, "success", "status");
    broadcastStateUpdate();
    res.json({ success: true, message: "Status story posted to WhatsApp." });
  } catch (error) {
    console.error("Status post error:", error);
    addLog(`Status post failed: ${error.message}`, "error", "status");
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/status/viewed-log", (req, res) => {
  res.json({
    statuses: viewedStatusesLog,
    totalViewed: stats.statusesViewed,
    totalReacted: stats.reactionsSent
  });
});
app.get("/api/groups", async (req, res) => {
  try {
    if (connectionStatus !== "connected" || !sock) {
      return res.status(400).json({ error: "WhatsApp is not connected." });
    }
    const groupsData = await sock.groupFetchAllParticipating();
    const botJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
    const groupList = Object.values(groupsData).map((g) => {
      const isBotAdmin = !!g.participants?.find((p) => (p.id === botJid || activePhone && p.id?.includes(activePhone)) && (p.admin === "admin" || p.admin === "superadmin"));
      return {
        id: g.id,
        subject: g.subject || "Unnamed Group",
        subjectOwner: g.subjectOwner,
        subjectTime: g.subjectTime,
        size: g.size || g.participants?.length || 0,
        creation: g.creation,
        owner: g.owner,
        desc: g.desc ? String(g.desc) : "",
        isBotAdmin,
        announce: !!g.announce,
        restrict: !!g.restrict,
        participantsCount: g.participants?.length || 0
      };
    });
    res.json({
      success: true,
      groups: groupList
    });
  } catch (err) {
    console.error("Failed to fetch groups:", err);
    res.status(500).json({ error: err.message || "Failed to fetch WhatsApp groups." });
  }
});
app.get("/api/groups/:jid", async (req, res) => {
  try {
    if (connectionStatus !== "connected" || !sock) {
      return res.status(400).json({ error: "WhatsApp is not connected." });
    }
    const jid = req.params.jid;
    const metadata = await sock.groupMetadata(jid);
    const botJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
    const isBotAdmin = !!metadata.participants?.find((p) => (p.id === botJid || activePhone && p.id?.includes(activePhone)) && (p.admin === "admin" || p.admin === "superadmin"));
    res.json({
      success: true,
      group: {
        id: metadata.id,
        subject: metadata.subject,
        owner: metadata.owner,
        desc: metadata.desc ? String(metadata.desc) : "",
        participants: metadata.participants,
        size: metadata.participants?.length || 0,
        isBotAdmin,
        announce: !!metadata.announce,
        restrict: !!metadata.restrict
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/groups/participants", async (req, res) => {
  try {
    const { jid, targetJid, action } = req.body;
    if (!jid || !targetJid || !action) {
      return res.status(400).json({ error: "Provide jid, targetJid, and action (promote|demote|remove)." });
    }
    if (connectionStatus !== "connected" || !sock) {
      return res.status(400).json({ error: "WhatsApp is not connected." });
    }
    const formattedTarget = targetJid.includes("@") ? targetJid : `${targetJid.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
    const response = await sock.groupParticipantsUpdate(jid, [formattedTarget], action);
    addLog(`Group action "${action}" on participant ${formattedTarget} in group ${jid}`, "info", "group");
    res.json({ success: true, response });
  } catch (err) {
    console.error("Participant update error:", err);
    res.status(500).json({ error: err.message || "Failed to update participant." });
  }
});
app.post("/api/groups/settings", async (req, res) => {
  try {
    const { jid, setting } = req.body;
    if (!jid || !setting) {
      return res.status(400).json({ error: "Provide jid and setting." });
    }
    if (connectionStatus !== "connected" || !sock) {
      return res.status(400).json({ error: "WhatsApp is not connected." });
    }
    await sock.groupSettingUpdate(jid, setting);
    addLog(`Updated group ${jid} setting to "${setting}"`, "info", "group");
    res.json({ success: true, message: `Group setting updated to ${setting}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/groups/invite-code", async (req, res) => {
  try {
    const { jid } = req.body;
    if (!jid) return res.status(400).json({ error: "Provide group jid." });
    if (connectionStatus !== "connected" || !sock) {
      return res.status(400).json({ error: "WhatsApp is not connected." });
    }
    const code = await sock.groupInviteCode(jid);
    res.json({ success: true, code, link: `https://chat.whatsapp.com/${code}` });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get invite code. Ensure bot is group admin." });
  }
});
app.post("/api/campaigns/spintax-preview", (req, res) => {
  const { templateText, samplesCount = 3 } = req.body;
  if (!templateText) return res.json({ samples: [] });
  const samples = [];
  for (let i = 0; i < samplesCount; i++) {
    samples.push(parseSpintax(templateText));
  }
  res.json({ samples });
});
app.post("/api/campaigns/start", async (req, res) => {
  try {
    const {
      targetGroupJids,
      templateText,
      imageUrl,
      minDelaySec = 15,
      maxDelaySec = 35,
      batchSize = 10,
      batchPauseMinutes = 3
    } = req.body;
    if (connectionStatus !== "connected" || !sock) {
      return res.status(400).json({ error: "WhatsApp is not connected. Connect account first." });
    }
    if (!Array.isArray(targetGroupJids) || targetGroupJids.length === 0) {
      return res.status(400).json({ error: "Please select at least 1 target group." });
    }
    if (!templateText && !imageUrl) {
      return res.status(400).json({ error: "Please provide message template text or image URL." });
    }
    if (currentCampaign.status === "running" || currentCampaign.status === "batch_pausing") {
      return res.status(400).json({ error: "A campaign is already currently active. Cancel or wait for it to finish." });
    }
    if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
    if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
    currentCampaign = {
      id: "cmp_" + Date.now(),
      status: "running",
      targetGroupJids,
      totalGroups: targetGroupJids.length,
      sentCount: 0,
      failedCount: 0,
      currentIndex: 0,
      currentGroupJid: targetGroupJids[0],
      currentGroupName: null,
      minDelaySec: Math.max(5, Number(minDelaySec) || 15),
      maxDelaySec: Math.max(Number(minDelaySec) || 15, Number(maxDelaySec) || 35),
      batchSize: Math.max(1, Number(batchSize) || 10),
      batchPauseMinutes: Math.max(1, Number(batchPauseMinutes) || 3),
      templateText,
      imageUrl: imageUrl || "",
      nextSendInSec: 0,
      batchPauseRemainingSec: 0,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      completedAt: null,
      logs: []
    };
    addLog(`\u{1F680} Started Multi-Group Campaign across ${targetGroupJids.length} groups with Anti-Ban safeguards.`, "info", "campaign");
    broadcastStateUpdate();
    runCampaignStep();
    res.json({ success: true, campaign: currentCampaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function runCampaignStep() {
  if (currentCampaign.status !== "running") return;
  if (currentCampaign.currentIndex >= currentCampaign.totalGroups) {
    currentCampaign.status = "completed";
    currentCampaign.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    addLog(`\u{1F389} Multi-Group Campaign completed! Sent to ${currentCampaign.sentCount} groups (${currentCampaign.failedCount} failed).`, "success", "campaign");
    broadcastStateUpdate();
    return;
  }
  const jid = currentCampaign.targetGroupJids[currentCampaign.currentIndex];
  currentCampaign.currentGroupJid = jid;
  try {
    const messageContent = parseSpintax(currentCampaign.templateText);
    if (currentCampaign.imageUrl) {
      await sock.sendMessage(jid, {
        image: { url: currentCampaign.imageUrl },
        caption: messageContent
      });
    } else {
      await sock.sendMessage(jid, {
        text: messageContent
      });
    }
    currentCampaign.sentCount++;
    stats.campaignMessagesSent++;
    const progressMsg = `Sent to group ${currentCampaign.currentIndex + 1}/${currentCampaign.totalGroups} (${jid.split("@")[0]})`;
    currentCampaign.logs.unshift(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u2713 ${progressMsg}`);
    addLog(`\u{1F4E2} Campaign: ${progressMsg}`, "success", "campaign");
  } catch (sendErr) {
    currentCampaign.failedCount++;
    const failMsg = `Failed sending to group ${jid}: ${sendErr.message}`;
    currentCampaign.logs.unshift(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u274C ${failMsg}`);
    addLog(failMsg, "warn", "campaign");
  }
  currentCampaign.currentIndex++;
  broadcastStateUpdate();
  if (currentCampaign.currentIndex >= currentCampaign.totalGroups) {
    currentCampaign.status = "completed";
    currentCampaign.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    addLog(`\u{1F389} Multi-Group Campaign completed successfully!`, "success", "campaign");
    broadcastStateUpdate();
    return;
  }
  if (currentCampaign.sentCount > 0 && currentCampaign.sentCount % currentCampaign.batchSize === 0) {
    const pauseSeconds = currentCampaign.batchPauseMinutes * 60;
    currentCampaign.status = "batch_pausing";
    currentCampaign.batchPauseRemainingSec = pauseSeconds;
    addLog(`\u23F3 Anti-Ban Batch Pause: Completed batch of ${currentCampaign.batchSize} groups. Resting for ${currentCampaign.batchPauseMinutes} minutes...`, "info", "campaign");
    broadcastStateUpdate();
    campaignCountdownTimer = setInterval(() => {
      if (currentCampaign.status !== "batch_pausing") {
        if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
        return;
      }
      currentCampaign.batchPauseRemainingSec--;
      if (currentCampaign.batchPauseRemainingSec <= 0) {
        if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
        currentCampaign.status = "running";
        addLog(`\u25B6\uFE0F Batch rest period completed. Resuming campaign queue...`, "info", "campaign");
        broadcastStateUpdate();
        runCampaignStep();
      }
    }, 1e3);
    return;
  }
  const delaySec = Math.floor(
    Math.random() * (currentCampaign.maxDelaySec - currentCampaign.minDelaySec + 1)
  ) + currentCampaign.minDelaySec;
  currentCampaign.nextSendInSec = delaySec;
  addLog(`\u23F3 Waiting ${delaySec}s before sending next group (Anti-Ban Jitter)...`, "info", "campaign");
  broadcastStateUpdate();
  campaignCountdownTimer = setInterval(() => {
    if (currentCampaign.status !== "running") {
      if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
      return;
    }
    currentCampaign.nextSendInSec--;
    if (currentCampaign.nextSendInSec <= 0) {
      if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
    }
  }, 1e3);
  campaignIntervalTimer = setTimeout(() => {
    if (currentCampaign.status === "running") {
      runCampaignStep();
    }
  }, delaySec * 1e3);
}
app.post("/api/campaigns/pause", (req, res) => {
  if (currentCampaign.status === "running" || currentCampaign.status === "batch_pausing") {
    currentCampaign.status = "paused";
    if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
    if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
    addLog("\u23F8\uFE0F Campaign paused by user.", "warn", "campaign");
    broadcastStateUpdate();
    res.json({ success: true, campaign: currentCampaign });
  } else {
    res.status(400).json({ error: "Campaign is not currently running." });
  }
});
app.post("/api/campaigns/resume", (req, res) => {
  if (currentCampaign.status === "paused") {
    currentCampaign.status = "running";
    addLog("\u25B6\uFE0F Resuming campaign queue...", "info", "campaign");
    broadcastStateUpdate();
    runCampaignStep();
    res.json({ success: true, campaign: currentCampaign });
  } else {
    res.status(400).json({ error: "Campaign is not paused." });
  }
});
app.post("/api/campaigns/cancel", (req, res) => {
  currentCampaign.status = "cancelled";
  if (campaignIntervalTimer) clearTimeout(campaignIntervalTimer);
  if (campaignCountdownTimer) clearInterval(campaignCountdownTimer);
  addLog("\u{1F6D1} Campaign cancelled by user.", "warn", "campaign");
  broadcastStateUpdate();
  res.json({ success: true, campaign: currentCampaign });
});
app.get("/api/campaigns/status", (req, res) => {
  res.json({ campaign: currentCampaign });
});
app.post("/api/config", (req, res) => {
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
  if (typeof autoReact === "boolean") config.autoReact = autoReact;
  if (Array.isArray(reactionEmojis)) config.reactionEmojis = reactionEmojis;
  if (typeof autoView === "boolean") config.autoView = autoView;
  if (typeof aiResponder === "boolean") config.aiResponder = aiResponder;
  if (typeof aiTriggerMode === "string" && (aiTriggerMode === "all" || aiTriggerMode === "keywords_only")) {
    config.aiTriggerMode = aiTriggerMode;
  }
  if (Array.isArray(triggerKeywords)) config.triggerKeywords = triggerKeywords;
  if (typeof systemPrompt === "string") config.systemPrompt = systemPrompt;
  if (typeof geminiKey === "string") config.geminiKey = geminiKey;
  if (typeof viewDelaySeconds === "number") config.viewDelaySeconds = viewDelaySeconds;
  if (typeof typingDelaySeconds === "number") config.typingDelaySeconds = typingDelaySeconds;
  if (Array.isArray(fallbackRules)) config.fallbackRules = fallbackRules;
  saveConfigToFile();
  addLog("Automation configuration updated.", "info", "system");
  broadcastStateUpdate();
  res.json({ success: true, config });
});
app.get("/api/logs", (req, res) => {
  res.json({ logs: recentLogs, stats });
});
app.get("/api/logs/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  clientsSse.push(res);
  res.write(`data: ${JSON.stringify({
    type: "init",
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
  })}

`);
  req.on("close", () => {
    clientsSse = clientsSse.filter((c) => c !== res);
  });
});
app.post("/api/ai/test", async (req, res) => {
  try {
    const { message, systemPrompt } = req.body;
    const apiKey = config.geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    let reply = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message || "Hello, what services do you offer?",
        config: {
          systemInstruction: systemPrompt || config.systemPrompt
        }
      });
      reply = response.text?.trim() || "";
    } catch (e) {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: message || "Hello, what services do you offer?",
        config: {
          systemInstruction: systemPrompt || config.systemPrompt
        }
      });
      reply = response.text?.trim() || "";
    }
    res.json({
      reply: reply || "No response generated."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Running in static server mode");
      const distDir = path.join(__dirname, "dist");
      const publicDir = path.join(__dirname, "public");
      if (fs.existsSync(distDir)) {
        app.use(express.static(distDir));
      } else if (fs.existsSync(publicDir)) {
        app.use(express.static(publicDir));
      }
    }
  } else {
    const distDir = path.join(__dirname, "dist");
    const publicDir = path.join(__dirname, "public");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    } else if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
      app.get("*", (req, res) => {
        res.sendFile(path.join(publicDir, "index.html"));
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`\u{1F680} WhatsApp Growth & Automation Engine Online!`);
    console.log(`\u{1F4E1} Server listening on http://0.0.0.0:${PORT}`);
    console.log(`====================================================`);
    initAllAccounts();
  });
}
startServer();
export {
  parseSpintax
};
