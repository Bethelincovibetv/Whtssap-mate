export interface EngineStats {
  statusesViewed: number;
  reactionsSent: number;
  aiRepliesSent: number;
  broadcastsSent: number;
  startedAt: string;
}

export interface EngineConfig {
  autoView: boolean;
  autoReact: boolean;
  reactionEmojis: string[];
  aiResponder: boolean;
  systemPrompt: string;
  geminiKey: string;
  viewDelaySeconds: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'event' | 'success' | 'warn' | 'error';
  metadata?: any;
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
  reactionEmojis: string[];
  systemPrompt: string;
  viewDelaySeconds?: number;
  stats: EngineStats;
}
