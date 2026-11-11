// 連絡アプリ（れんらくちょう）へ当番表のデータを送る。
// 設定（送り先URL・教室コード・連携キー）は当番表のデータとは別に保存し、
// JSON バックアップに連携キーが入らないようにしている。
import { AppData } from '@/types';

export interface RenrakuSyncConfig {
  url: string;
  room: string;
  key: string;
  enabled: boolean;
}

export interface RenrakuSyncStatus {
  lastSentAt: number | null;
  error: string | null;
  sending: boolean;
}

const CONFIG_KEY = 'hero-duty-board-renraku-sync';

export const emptySyncConfig: RenrakuSyncConfig = { url: '', room: '', key: '', enabled: false };

export function loadSyncConfig(): RenrakuSyncConfig {
  if (typeof window === 'undefined') return emptySyncConfig;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    return raw ? { ...emptySyncConfig, ...JSON.parse(raw) } : emptySyncConfig;
  } catch {
    return emptySyncConfig;
  }
}

export function saveSyncConfig(config: RenrakuSyncConfig) {
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error(error);
  }
  notify();
}

let status: RenrakuSyncStatus = { lastSentAt: null, error: null, sending: false };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

function setStatus(next: Partial<RenrakuSyncStatus>) {
  status = { ...status, ...next };
  notify();
}

export function getSyncStatus(): RenrakuSyncStatus {
  return status;
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isSyncReady(config: RenrakuSyncConfig): boolean {
  return config.enabled && !!config.url && !!config.room && !!config.key;
}

// 連絡アプリが当番を計算するのに必要な部分だけを送る
function payload(data: AppData) {
  return {
    students: data.students,
    dutySlots: data.dutySlots,
    dutyGroups: data.dutyGroups,
    rotationConfig: data.rotationConfig,
    slotAssignment: data.slotAssignment,
    lastResetDate: data.lastResetDate,
    boardTitle: data.boardTitle,
    dateMode: 'local',
  };
}

export async function pushToRenraku(data: AppData, config: RenrakuSyncConfig = loadSyncConfig()): Promise<boolean> {
  if (!isSyncReady(config)) return false;
  setStatus({ sending: true });
  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: config.room, key: config.key, data: payload(data) }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setStatus({ sending: false, error: json?.error || `送信に失敗しました (${res.status})` });
      return false;
    }
    setStatus({ sending: false, error: null, lastSentAt: Date.now() });
    return true;
  } catch {
    setStatus({ sending: false, error: '連絡アプリにつながりませんでした。URLとインターネット接続を確認してください。' });
    return false;
  }
}
