'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { Button, cn } from '@/components/ui';
import * as LucideIcons from 'lucide-react';
import { Student, DutySlot } from '@/types';

type Tab = 'students' | 'slots' | 'rewards' | 'settings';

interface AdminViewProps {
  onNavigateToKids?: () => void;
}

export default function AdminView({ onNavigateToKids }: AdminViewProps) {
  const { appData, setAppData, resetDailyDuties, reverseRotation } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('students');
  
  // Custom Confirm Modals State
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  
  // Bulk Import state
  const [pasteData, setPasteData] = useState('');

  const handleBulkImport = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.split('\n').filter(l => l.trim() !== '');
    const newStudents: Student[] = lines.map((line, index) => {
      const parts = line.split('\t');
      return {
        id: crypto.randomUUID(),
        studentNumber: isNaN(Number(parts[0])) ? appData.students.length + index + 1 : Number(parts[0]),
        name: isNaN(Number(parts[0])) ? parts[0] : (parts[1] || `無名${index}`),
        furigana: parts.length > 2 ? parts[2] : undefined,
        proxyCount: 0
      };
    });

    setAppData(prev => ({
      ...prev,
      students: [...prev.students, ...newStudents],
      lastResetDate: '' // trigger re-assignment
    }));
    setPasteData('');
    alert(`${newStudents.length}名の児童を追加しました`);
  };

  const requestRemoveStudent = (id: string) => setStudentToDelete(id);
  const confirmRemoveStudent = () => {
    if (studentToDelete) {
      setAppData(prev => ({ ...prev, students: prev.students.filter(s => s.id !== studentToDelete), lastResetDate: '' }));
      setStudentToDelete(null);
    }
  };
  const requestClearStudents = () => setShowClearAllConfirm(true);
  const confirmClearStudents = () => {
    setAppData(prev => ({ ...prev, students: [], lastResetDate: '' }));
    setShowClearAllConfirm(false);
  };

  const manualRotate = () => { resetDailyDuties(true); alert('ローテーションしました！'); };
  const manualReverseRotate = () => { reverseRotation(); alert('ローテーションを一つ戻しました！'); };

  const toggleExclusion = (studentId: string) => {
    setAppData(prev => {
      const student = prev.students.find(s => s.id === studentId);
      if (!student) return prev;

      if (student.excludedFromRotation) {
        // Including again
        return {
          ...prev,
          students: prev.students.map(s => s.id === studentId ? { ...s, excludedFromRotation: false, pinnedSlotPositions: undefined } : s)
        };
      } else {
        // Excluding: Find their current positions
        const allPositions = Array.from(new Set((prev.dutySlots || []).map(s => s.position))).sort((a, b) => a - b);
        const pinnedPositions = new Set<number>();
        prev.students.forEach(s => {
          if (s.excludedFromRotation && s.pinnedSlotPositions) {
            s.pinnedSlotPositions.forEach(p => pinnedPositions.add(p));
          }
        });

        const activePositions = allPositions.filter(p => !pinnedPositions.has(p));
        const activeStudents = prev.students.filter(s => !s.excludedFromRotation);
        
        const mySlots: number[] = [];
        if (activeStudents.length > 0) {
           activePositions.forEach((pos, idx) => {
             const offset = prev.rotationConfig.currentDutyIndex;
             const activeIdx = (idx + offset) % activeStudents.length;
             const studentIndex = activeIdx >= 0 ? activeIdx : activeIdx + activeStudents.length;
             if (activeStudents[studentIndex].id === studentId) {
                 mySlots.push(pos);
             }
           });
        }

        return {
          ...prev,
          students: prev.students.map(s => s.id === studentId ? { ...s, excludedFromRotation: true, pinnedSlotPositions: mySlots } : s)
        };
      }
    });
  };

  // Slot management helpers
  const addSlot = () => {
    const maxPos = (appData.dutySlots || []).reduce((max, s) => Math.max(max, s.position), 0);
    setAppData(prev => ({
      ...prev,
      dutySlots: [...(prev.dutySlots || []), {
        id: crypto.randomUUID(),
        position: maxPos + 1,
        upperDutyName: '新しい仕事',
        groupId: null,
      }],
      lastResetDate: '' // trigger reset
    }));
  };

  const removeSlot = (slotId: string) => {
    setAppData(prev => ({
      ...prev,
      dutySlots: (prev.dutySlots || []).filter(s => s.id !== slotId),
      lastResetDate: ''
    }));
  };

  const updateSlot = (slotId: string, updates: Partial<DutySlot>) => {
    setAppData(prev => {
      const currentSlot = (prev.dutySlots || []).find(s => s.id === slotId);
      let newSlots = [...(prev.dutySlots || [])];
      
      if (updates.position !== undefined && currentSlot && currentSlot.position !== updates.position) {
        // Swap positions if another slot has the target position
        const targetPos = updates.position;
        const oldPos = currentSlot.position;
        newSlots = newSlots.map(s => {
          if (s.id === slotId) return { ...s, ...updates };
          if (s.position === targetPos) return { ...s, position: oldPos }; // Swap
          return s;
        });
      } else {
        newSlots = newSlots.map(s => s.id === slotId ? { ...s, ...updates } : s);
      }

      return {
        ...prev,
        dutySlots: newSlots
      };
    });
  };

  const sortedSlots = [...(appData.dutySlots || [])].sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <LucideIcons.Settings className="text-blue-500" />
            管理者画面 (先生用)
          </h1>
          <p className="text-slate-500">児童データ・当番表・システム設定の管理</p>
        </div>
        <Button variant="ghost" className="bg-slate-200" onClick={onNavigateToKids}>
          <LucideIcons.ArrowLeft className="mr-2 w-4 h-4" />児童用画面へ戻る
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          {[
            { id: 'students', label: '児童管理＆ヒーローログ', icon: LucideIcons.Users },
            { id: 'slots', label: '当番スロット設定', icon: LucideIcons.Briefcase },
            { id: 'rewards', label: 'メッセージ設定', icon: LucideIcons.MessageSquare },
            { id: 'settings', label: 'システム管理', icon: LucideIcons.Database },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left",
                activeTab === tab.id 
                  ? "bg-blue-500 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

          {/* ===== STUDENTS TAB ===== */}
          {activeTab === 'students' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-bold border-b pb-2 mb-4">クラス名簿の登録</h2>
                <div className="bg-slate-50 p-4 rounded-xl border mb-4">
                  <p className="text-sm text-slate-600 mb-2">
                    Excelやスプレッドシートからコピー＆ペーストで一括登録できます。<br/>
                    フォーマット(TSV): <code>出席番号(省略可) [TAB] 名前 [TAB] ふりがな(省略可)</code>
                  </p>
                  <textarea 
                    className="w-full h-32 p-3 border rounded-lg text-sm"
                    placeholder={"1\t山田太郎\tやまだたろう\n2\t鈴木花子\tすずきはなこ"}
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={handleBulkImport} disabled={!pasteData.trim()}>一括登録する</Button>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold border-b pb-2 flex-1">ヒーローログ（代理回数）</h2>
                  {appData.students.length > 0 && (
                    <Button variant="danger" size="sm" onClick={requestClearStudents}>全児童削除</Button>
                  )}
                </div>
                
                {appData.students.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">まだ児童が登録されていません。</p>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b">
                          <th className="p-3 w-20">番号</th>
                          <th className="p-3">名前</th>
                          <th className="p-3">ふりがな</th>
                          <th className="p-3 w-24 text-center border-l border-orange-200 bg-orange-50 text-orange-800">ローテ除外</th>
                          <th className="p-3 w-32 border-l border-amber-200 bg-amber-50 text-amber-800 text-center">ヒーロー回数</th>
                          <th className="p-3 w-20 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...appData.students]
                          .sort((a, b) => a.studentNumber - b.studentNumber)
                          .map((student) => (
                          <tr key={student.id} className={cn("border-b hover:bg-slate-50", student.excludedFromRotation && "bg-red-50/50")}>
                            <td className="p-3 text-slate-500">{student.studentNumber}</td>
                            <td className="p-3 font-medium">
                              {student.name}
                              {student.excludedFromRotation && <span className="ml-2 text-xs text-red-400 font-bold">除外中</span>}
                            </td>
                            <td className="p-3 text-sm text-slate-400">{student.furigana}</td>
                            <td className="p-3 border-l border-orange-100 bg-orange-50/30 text-center">
                              <button
                                onClick={() => toggleExclusion(student.id)}
                                className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
                                  student.excludedFromRotation ? "bg-red-500 border-red-500 text-white" : "bg-white border-slate-300 text-slate-300 hover:border-red-400"
                                )}
                              >
                                {student.excludedFromRotation ? <LucideIcons.X size={14}/> : <LucideIcons.Minus size={14}/>}
                              </button>
                            </td>
                            <td className="p-3 border-l border-amber-100 bg-amber-50/50 text-center">
                              {student.proxyCount > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                                  <LucideIcons.Award className="w-4 h-4 fill-amber-500" />
                                  {student.proxyCount}回
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => requestRemoveStudent(student.id)}
                                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                              >
                                <LucideIcons.Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ===== DUTY SLOTS TAB ===== */}
          {activeTab === 'slots' && (
            <div className="space-y-6">
              {/* Time group setup */}
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-xl font-bold">時間帯グループ設定</h2>
                <Button size="sm" onClick={() => {
                  setAppData(p => ({
                    ...p,
                    dutyGroups: [...p.dutyGroups, { id: crypto.randomUUID(), name: '新グループ', startTime: '', endTime: '' }]
                  }));
                }}>+ グループを追加</Button>
              </div>
              
              <div className="space-y-3 mb-8">
                {appData.dutyGroups.length === 0 ? (
                   <div className="text-slate-400 text-sm">グループはありません。</div>
                ) : (
                  appData.dutyGroups.map(group => (
                    <div key={group.id} className="p-3 border rounded-xl flex flex-wrap gap-3 items-end bg-slate-50">
                      <div className="flex-1 min-w-[150px]">
                        <label className="text-xs text-slate-500 block mb-1">グループ名</label>
                        <input 
                          className="w-full p-2 border rounded font-bold" 
                          value={group.name} 
                          onChange={(e) => setAppData(p => ({
                            ...p, dutyGroups: p.dutyGroups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g)
                          }))} 
                        />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <label className="text-xs text-slate-500 block mb-1">開始時刻</label>
                        <input type="time" className="w-full p-2 border rounded" value={group.startTime || ''}
                          onChange={(e) => setAppData(p => ({
                            ...p, dutyGroups: p.dutyGroups.map(g => g.id === group.id ? { ...g, startTime: e.target.value } : g)
                          }))}
                        />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <label className="text-xs text-slate-500 block mb-1">終了時刻</label>
                        <input type="time" className="w-full p-2 border rounded" value={group.endTime || ''}
                          onChange={(e) => setAppData(p => ({
                            ...p, dutyGroups: p.dutyGroups.map(g => g.id === group.id ? { ...g, endTime: e.target.value } : g)
                          }))}
                        />
                      </div>
                      <button onClick={() => {
                        if(window.confirm('このグループを削除しますか？')) {
                          setAppData(p => ({
                            ...p,
                            dutyGroups: p.dutyGroups.filter(g => g.id !== group.id),
                            dutySlots: (p.dutySlots || []).map(s => s.groupId === group.id ? { ...s, groupId: null } : s)
                          }));
                        }
                      }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                        <LucideIcons.Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Duty slots */}
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-xl font-bold">当番スロット（テーブルの列）</h2>
                <Button size="sm" onClick={addSlot}>+ スロットを追加</Button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                各スロットは当番表の1列です。児童が左にローテーションするとき、ここで設定した仕事が固定で残り、児童名だけがずれていきます。
                上段・下段の2つの仕事を設定できます。
              </p>

              <div className="space-y-3">
                {sortedSlots.map(slot => (
                  <div key={slot.id} className="p-4 border rounded-xl bg-slate-50 flex flex-wrap gap-3 items-end">
                    <div className="w-16">
                      <label className="text-xs text-slate-500 block mb-1">位置</label>
                      <input 
                        type="number" min={1}
                        className="w-full p-2 border rounded text-center font-bold"
                        value={slot.position}
                        onChange={(e) => updateSlot(slot.id, { position: Number(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-slate-500 block mb-1">上段の仕事名</label>
                      <input 
                        className="w-full p-2 border rounded"
                        value={slot.upperDutyName}
                        onChange={(e) => updateSlot(slot.id, { upperDutyName: e.target.value })}
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-slate-500 block mb-1">下段の仕事名（任意）</label>
                      <input 
                        className="w-full p-2 border rounded"
                        value={slot.lowerDutyName || ''}
                        placeholder="空欄なら上段のみ"
                        onChange={(e) => updateSlot(slot.id, { lowerDutyName: e.target.value || undefined })}
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-slate-500 block mb-1">所属グループ</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={slot.groupId || ''}
                        onChange={(e) => updateSlot(slot.id, { groupId: e.target.value === '' ? null : e.target.value })}
                      >
                        <option value="">グループなし</option>
                        {appData.dutyGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => {
                      if(window.confirm('このスロットを削除しますか？')) removeSlot(slot.id);
                    }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <LucideIcons.Trash2 size={20} />
                    </button>
                  </div>
                ))}
                {sortedSlots.length === 0 && (
                  <p className="text-slate-400 text-center py-8">スロットがありません。「+ スロットを追加」で追加してください。</p>
                )}
              </div>

              {/* Rotation controls */}
              <h2 className="text-xl font-bold border-b pb-2 mt-8">ローテーション設定</h2>
              <div className="p-4 border rounded-xl space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">自動ローテーション</label>
                  <select 
                    className="border p-2 rounded-lg w-full max-w-xs"
                    value={appData.rotationConfig.type}
                    onChange={(e) => setAppData(p => ({
                      ...p, 
                      rotationConfig: { ...p.rotationConfig, type: e.target.value as any }
                    }))}
                  >
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週（月曜日）</option>
                    <option value="manual">手動のみ</option>
                  </select>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-2">児童名を左に1つずらします。</p>
                  <div className="flex gap-3">
                    <Button onClick={manualRotate} variant="secondary">
                      <LucideIcons.RotateCw className="w-4 h-4 mr-1" />ローテーション（進める）
                    </Button>
                    <Button onClick={manualReverseRotate} variant="ghost" className="border">
                      <LucideIcons.RotateCcw className="w-4 h-4 mr-1" />戻す
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== REWARDS TAB ===== */}
          {activeTab === 'rewards' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-xl font-bold">お祝いメッセージ設定</h2>
                <Button size="sm" onClick={() => {
                  setAppData(p => ({
                    ...p,
                    rewardMessages: [...p.rewardMessages, { id: crypto.randomUUID(), text: '新しいメッセージ', weight: 50, type: 'normal' }]
                  }));
                }}>+ メッセージ追加</Button>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                ※ 数字（比重）を設定すると、同じ種類（通常・ヒーロー・全員達成）の中での出現率（％）が自動で計算されます。
              </p>

              <div className="space-y-2">
                {appData.rewardMessages.map(msg => {
                  const totalForType = appData.rewardMessages.filter(m => m.type === msg.type).reduce((s, m) => s + m.weight, 0);
                  const percent = totalForType > 0 ? Math.round((msg.weight / totalForType) * 100) : 0;
                  return (
                  <div key={msg.id} className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-xl border">
                    <div className="flex-1 min-w-[200px]">
                      <input className="w-full p-2 border rounded" value={msg.text}
                        onChange={e => setAppData(p => ({ ...p, rewardMessages: p.rewardMessages.map(m => m.id === msg.id ? { ...m, text: e.target.value } : m) }))}
                      />
                    </div>
                    <div className="w-24">
                      <div className="flex items-center gap-2">
                        <input type="number" className="w-16 p-2 border rounded text-center" value={msg.weight}
                          onChange={e => setAppData(p => ({ ...p, rewardMessages: p.rewardMessages.map(m => m.id === msg.id ? { ...m, weight: Number(e.target.value) || 1 } : m) }))}
                        />
                        <span className="text-xs font-bold text-slate-400 w-8 text-right">{percent}%</span>
                      </div>
                    </div>
                    <select className="p-2 border rounded" value={msg.type}
                      onChange={e => setAppData(p => ({ ...p, rewardMessages: p.rewardMessages.map(m => m.id === msg.id ? { ...m, type: e.target.value as any } : m) }))}
                    >
                      <option value="normal">通常</option>
                      <option value="hero">ヒーロー</option>
                      <option value="all_completed">全員達成</option>
                    </select>
                    <button onClick={() => {
                      if(window.confirm('削除しますか？')) {
                        setAppData(p => ({ ...p, rewardMessages: p.rewardMessages.filter(m => m.id !== msg.id) }));
                      }
                    }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <LucideIcons.Trash2 size={16} />
                    </button>
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
               <section>
                 <h2 className="text-xl font-bold border-b pb-2 mb-4">画面表示設定</h2>
                 <div className="space-y-4 max-w-xl">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">メインタイトル</label>
                     <input type="text" value={appData.boardTitle || ''} 
                       onChange={e => setAppData(p => ({ ...p, boardTitle: e.target.value }))}
                       className="w-full p-2 border rounded text-slate-800 focus:ring-2 focus:ring-blue-400 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">サブタイトル</label>
                     <input type="text" value={appData.boardSubtitle || ''} 
                       onChange={e => setAppData(p => ({ ...p, boardSubtitle: e.target.value }))}
                       className="w-full p-2 border rounded text-slate-800 focus:ring-2 focus:ring-blue-400 outline-none"
                       disabled={appData.hideTitleAndSubtitle}
                     />
                   </div>
                   <div className="pt-2">
                     <label className="flex items-center gap-3 cursor-pointer">
                       <button
                         onClick={() => setAppData(p => ({ ...p, hideTitleAndSubtitle: !p.hideTitleAndSubtitle }))}
                         className={cn(
                           "w-12 h-7 rounded-full relative transition-colors",
                           appData.hideTitleAndSubtitle ? "bg-blue-500" : "bg-slate-300"
                         )}
                       >
                         <span className={cn(
                           "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform",
                           appData.hideTitleAndSubtitle ? "translate-x-5" : "translate-x-0.5"
                         )} />
                       </button>
                       <span className="text-sm font-bold text-slate-700">タイトルとサブタイトルを非表示にする（画面を広く使う）</span>
                     </label>
                   </div>
                 </div>
               </section>
               <section>
                 <h2 className="text-xl font-bold border-b pb-2 mb-4">データ管理</h2>
                 <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                   <h3 className="font-bold text-orange-800 mb-2">データのバックアップ (JSON)</h3>
                   <p className="text-sm text-orange-700 mb-4">
                     システム全データをダウンロードしたり復元できます。
                   </p>
                   <div className="flex gap-4">
                     <Button onClick={() => {
                       const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
                       const a = document.createElement('a');
                       a.setAttribute("href", dataStr);
                       a.setAttribute("download", "duty-board-backup.json");
                       document.body.appendChild(a);
                       a.click();
                       a.remove();
                     }}>エクスポート</Button>
                     <Button variant="ghost" onClick={() => {
                       const input = prompt('JSONデータを貼り付けてください。');
                       if(input) {
                         try {
                           const parsed = JSON.parse(input);
                           if(parsed && parsed.students) {
                             setAppData(parsed);
                             alert('復元しました。');
                           }
                         } catch { alert('無効なJSONです。'); }
                       }
                     }}>インポート (復元)</Button>
                   </div>
                 </div>
               </section>
            </div>
          )}

        </div>
      </div>

      {/* Custom Modals for Deletion Confirmation */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">児童の削除</h3>
            <p className="text-slate-600 mb-6">本当にこの児童を削除しますか？</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setStudentToDelete(null)}>キャンセル</Button>
              <Button variant="danger" onClick={confirmRemoveStudent}>削除する</Button>
            </div>
          </div>
        </div>
      )}

      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-200">
            <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2"><LucideIcons.AlertTriangle size={24}/> 全員削除</h3>
            <p className="text-slate-600 mb-6 font-bold">全員のデータを削除します。本当によろしいですか？</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowClearAllConfirm(false)}>キャンセル</Button>
              <Button variant="danger" onClick={confirmClearStudents}>全員削除する</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
