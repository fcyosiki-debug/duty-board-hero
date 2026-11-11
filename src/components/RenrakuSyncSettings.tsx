'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { Button, cn } from '@/components/ui';
import {
  RenrakuSyncConfig, loadSyncConfig, saveSyncConfig,
  getSyncStatus, subscribeSync, isSyncReady, pushToRenraku,
} from '@/lib/renrakuSync';

const serverStatus = getSyncStatus();

// 管理画面「システム管理」の中の、連絡アプリ（れんらくちょう）との連携設定
export default function RenrakuSyncSettings() {
  const { appData } = useAppContext();
  // 管理画面はログイン後にブラウザ上でだけ表示されるので、最初から localStorage を読んでよい
  const [config, setConfig] = useState<RenrakuSyncConfig>(loadSyncConfig);
  const [saved, setSaved] = useState<RenrakuSyncConfig>(loadSyncConfig);
  const status = useSyncExternalStore(subscribeSync, getSyncStatus, () => serverStatus);

  const changed = JSON.stringify(config) !== JSON.stringify(saved);

  // 連絡アプリの先生画面「3つをコピー」で写した3行をまとめて貼り付けられるようにする
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const lines = e.clipboardData.getData('text').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length >= 3 && /^https?:\/\//.test(lines[0])) {
      e.preventDefault();
      setConfig(c => ({ ...c, url: lines[0], room: lines[1], key: lines[2] }));
    }
  };

  const save = async (next: RenrakuSyncConfig) => {
    const cleaned = { ...next, url: next.url.trim(), room: next.room.trim().toUpperCase(), key: next.key.trim() };
    saveSyncConfig(cleaned);
    setConfig(cleaned);
    setSaved(cleaned);
    if (isSyncReady(cleaned)) {
      const ok = await pushToRenraku(appData, cleaned);
      if (ok) alert('連絡アプリにデータを送りました。');
    }
  };

  const field = (label: string, key: 'url' | 'room' | 'key', placeholder: string) => (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={config[key]}
        placeholder={placeholder}
        onPaste={handlePaste}
        onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
        className="w-full p-2 border rounded text-slate-800 focus:ring-2 focus:ring-blue-400 outline-none font-mono"
      />
    </div>
  );

  return (
    <section>
      <h2 className="text-xl font-bold border-b pb-2 mb-4">連絡アプリと連携</h2>
      <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl space-y-4 max-w-xl">
        <p className="text-sm text-violet-800">
          連絡アプリ（れんらくちょう）の先生画面「名簿・設定 → 当番表との連携」に出ている3つを入力すると、
          当番の割り当てと完了状況が子どものタブレットに表示されます。
          3行まとめてコピーした場合は、どの欄に貼り付けても3つとも入ります。
        </p>
        {field('送り先URL', 'url', 'https://〜/api/duty')}
        {field('教室コード', 'room', '例: 3KUMI')}
        {field('連携キー', 'key', '')}
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
            className={cn('w-12 h-7 rounded-full relative transition-colors', config.enabled ? 'bg-violet-500' : 'bg-slate-300')}
          >
            <span className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform', config.enabled ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
          <span className="text-sm font-bold text-slate-700">連携する（当番表が変わるたびに自動で送る）</span>
        </label>
        <div className="flex gap-3 flex-wrap items-center">
          <Button onClick={() => save(config)} disabled={!changed && !isSyncReady(config)}>
            {changed ? '保存して送る' : '今すぐ送る'}
          </Button>
          {status.sending && <span className="text-sm text-slate-500">送信中…</span>}
        </div>
        <div className="text-sm">
          {status.error ? (
            <p className="text-red-600 font-bold">⚠ {status.error}</p>
          ) : status.lastSentAt ? (
            <p className="text-green-700">✓ 最後に送った時刻: {new Date(status.lastSentAt).toLocaleString('ja-JP')}</p>
          ) : (
            <p className="text-slate-500">{isSyncReady(saved) ? 'まだこの画面を開いてから送っていません。' : '連携していません。'}</p>
          )}
        </div>
      </div>
    </section>
  );
}
