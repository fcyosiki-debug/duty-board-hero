'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { cn } from '@/components/ui';
import * as LucideIcons from 'lucide-react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { DutySlot, SlotCompletion } from '@/types';

// Time-group color palette
const GROUP_COLORS = [
  { bg: 'bg-rose-200', headerBg: 'bg-rose-400', text: 'text-rose-900', cellBg: 'bg-rose-50', completedBg: 'bg-rose-100' },
  { bg: 'bg-sky-200', headerBg: 'bg-sky-400', text: 'text-sky-900', cellBg: 'bg-sky-50', completedBg: 'bg-sky-100' },
  { bg: 'bg-emerald-200', headerBg: 'bg-emerald-400', text: 'text-emerald-900', cellBg: 'bg-emerald-50', completedBg: 'bg-emerald-100' },
  { bg: 'bg-amber-200', headerBg: 'bg-amber-400', text: 'text-amber-900', cellBg: 'bg-amber-50', completedBg: 'bg-amber-100' },
  { bg: 'bg-violet-200', headerBg: 'bg-violet-400', text: 'text-violet-900', cellBg: 'bg-violet-50', completedBg: 'bg-violet-100' },
  { bg: 'bg-teal-200', headerBg: 'bg-teal-400', text: 'text-teal-900', cellBg: 'bg-teal-50', completedBg: 'bg-teal-100' },
  { bg: 'bg-orange-200', headerBg: 'bg-orange-400', text: 'text-orange-900', cellBg: 'bg-orange-50', completedBg: 'bg-orange-100' },
  { bg: 'bg-pink-200', headerBg: 'bg-pink-400', text: 'text-pink-900', cellBg: 'bg-pink-50', completedBg: 'bg-pink-100' },
];
const NOGROUP_COLOR = { bg: 'bg-slate-200', headerBg: 'bg-slate-400', text: 'text-slate-900', cellBg: 'bg-slate-50', completedBg: 'bg-slate-100' };

interface KidsViewProps {
  onNavigateToAdmin?: () => void;
}

export default function KidsView({ onNavigateToAdmin }: KidsViewProps) {
  const { appData, setAppData, getStudentForSlot, isMounted } = useAppContext();
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ slotId: string; cell: 'upper' | 'lower' } | null>(null);
  const [showProxySelect, setShowProxySelect] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { students, dutySlots, dutyGroups, slotAssignment, rewardMessages } = appData;

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get dynamic message
  const getDynamicMessage = useCallback((type: 'normal' | 'hero' | 'all_completed') => {
    const validMessages = rewardMessages.filter(m => m.type === type);
    if (validMessages.length === 0) return type === 'hero' ? 'ヒーローだ！ありがとう！' : type === 'all_completed' ? 'ぜんいんたっせい！' : 'おつかれさま！';
    const totalWeight = validMessages.reduce((sum, m) => sum + m.weight, 0);
    let randomNum = Math.random() * totalWeight;
    for (const m of validMessages) {
      randomNum -= m.weight;
      if (randomNum <= 0) return m.text;
    }
    return validMessages[0].text;
  }, [rewardMessages]);

  // Build sorted slots (highest position first = leftmost in display)
  const sortedSlots = [...(dutySlots || [])].sort((a, b) => b.position - a.position);

  // Build group color map
  const groupColorMap = new Map<string, typeof GROUP_COLORS[0]>();
  dutyGroups.forEach((g, i) => {
    groupColorMap.set(g.id, GROUP_COLORS[i % GROUP_COLORS.length]);
  });

  // Build header groups (consecutive slots with same groupId, in display order)
  const headerGroups: { groupId: string | null; groupName: string; count: number; color: typeof GROUP_COLORS[0] }[] = [];
  for (const slot of sortedSlots) {
    const last = headerGroups[headerGroups.length - 1];
    if (last && last.groupId === slot.groupId) {
      last.count++;
    } else {
      const group = dutyGroups.find(g => g.id === slot.groupId);
      headerGroups.push({
        groupId: slot.groupId,
        groupName: group?.name || 'その他',
        count: 1,
        color: slot.groupId ? (groupColorMap.get(slot.groupId) || NOGROUP_COLOR) : NOGROUP_COLOR,
      });
    }
  }

  // Find current active time group
  const currentGroupId = dutyGroups.find(g => {
    if (!g.startTime || !g.endTime) return false;
    return currentTimeStr >= g.startTime && currentTimeStr <= g.endTime;
  })?.id || null;

  // Auto-scroll to current time group on mount
  useEffect(() => {
    if (!isMounted || !scrollRef.current || !currentGroupId) return;
    const firstSlotOfGroup = sortedSlots.find(s => s.groupId === currentGroupId);
    if (firstSlotOfGroup) {
      const el = document.getElementById(`slot-col-${firstSlotOfGroup.id}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 500);
      }
    }
  }, [isMounted, currentGroupId]);

  // Get completion status
  const getCompletion = (slotId: string): SlotCompletion | undefined => {
    return slotAssignment?.completions.find(c => c.slotId === slotId);
  };

  // Handle duty cell click
  const handleDutyClick = (slotId: string, cell: 'upper' | 'lower') => {
    const completion = getCompletion(slotId);
    const isAlreadyCompleted = cell === 'upper' ? completion?.upperCompleted : completion?.lowerCompleted;
    if (isAlreadyCompleted) return;

    // Check if the cell has content
    const slot = dutySlots.find(s => s.id === slotId);
    if (!slot) return;
    if (cell === 'upper' && !slot.upperDutyName) return;
    if (cell === 'lower' && !slot.lowerDutyName) return;

    setSelectedSlot({ slotId, cell });
    setShowProxySelect(false);
  };

  // Complete a duty
  const completeAssignment = (type: 'normal' | 'hero', proxyStudentId?: string) => {
    if (!selectedSlot) return;

    setAppData(prev => {
      const newCompletions = (prev.slotAssignment?.completions || []).map(c => {
        if (c.slotId === selectedSlot.slotId) {
          return {
            ...c,
            upperCompleted: selectedSlot.cell === 'upper' ? true : c.upperCompleted,
            lowerCompleted: selectedSlot.cell === 'lower' ? true : c.lowerCompleted,
          };
        }
        return c;
      });

      let updatedStudents = [...prev.students];
      if (type === 'hero' && proxyStudentId) {
        updatedStudents = updatedStudents.map(s =>
          s.id === proxyStudentId ? { ...s, proxyCount: s.proxyCount + 1 } : s
        );
      }

      return {
        ...prev,
        students: updatedStudents,
        slotAssignment: prev.slotAssignment ? { ...prev.slotAssignment, completions: newCompletions } : null,
      };
    });

    // Celebrate
    setCelebrationMessage(getDynamicMessage(type));
    setShowConfetti(true);
    setSelectedSlot(null);
    setShowProxySelect(false);
    setTimeout(() => { setShowConfetti(false); setCelebrationMessage(null); }, 3500);
  };

  // Check all completed
  const allCompleted = slotAssignment && slotAssignment.completions.length > 0 &&
    slotAssignment.completions.every(c => {
      const slot = dutySlots.find(s => s.id === c.slotId);
      if (!slot) return true;
      const upperDone = !slot.upperDutyName || c.upperCompleted;
      const lowerDone = !slot.lowerDutyName || c.lowerCompleted;
      return upperDone && lowerDone;
    });

  if (!isMounted) {
    return <div className="w-full h-screen flex items-center justify-center text-2xl text-slate-400">じゅんびちゅう...</div>;
  }

  if (!dutySlots || dutySlots.length === 0 || students.length === 0) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-6 p-8 relative bg-slate-50">
        <div className="absolute top-4 right-4">
          <button
            onClick={onNavigateToAdmin}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-100 p-3 rounded-full shadow-md border border-slate-200 flex items-center justify-center"
            title="管理画面へ"
          >
            <LucideIcons.Settings size={24} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <LucideIcons.AlertCircle className="w-20 h-20 text-slate-300" />
          <p className="text-2xl md:text-3xl font-bold text-slate-500">当番スロットまたは児童が登録されていません</p>
          <p className="text-slate-400 text-lg">右上の歯車ボタンから管理者画面を開き、初期設定を行ってください</p>
          
          <button
            onClick={onNavigateToAdmin}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-sm"
          >
            <LucideIcons.Settings size={20} />
            設定をはじめる
          </button>
        </div>
      </div>
    );
  }

  // Vertical text style
  const verticalStyle: React.CSSProperties = {
    writingMode: 'vertical-rl',
    textOrientation: 'upright',
    letterSpacing: '0.1em',
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-gradient-to-b from-blue-50 via-white to-slate-50">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti numberOfPieces={300} recycle={false} gravity={0.2} />
        </div>
      )}

      {/* Floating celebration message */}
      <AnimatePresence>
        {celebrationMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="px-8 py-4 rounded-3xl shadow-xl text-2xl font-bold text-white border-4 bg-gradient-to-r from-yellow-400 to-amber-500 border-yellow-200">
              {celebrationMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={cn(
        "flex-shrink-0 flex items-center justify-between border-b bg-white/80 backdrop-blur-sm",
        appData.hideTitleAndSubtitle ? "px-2 py-1" : "px-4 md:px-8 py-3"
      )}>
        {!appData.hideTitleAndSubtitle && (
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
              {appData.boardTitle || 'きょうの おとうばん'}
            </h1>
            <p className="text-xs md:text-sm text-slate-400">{appData.boardSubtitle || ''}</p>
          </div>
        )}
        <div className={cn("flex items-center gap-3", appData.hideTitleAndSubtitle && "ml-auto")}>
          <div className={cn(
            "font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl",
            appData.hideTitleAndSubtitle ? "text-sm" : "text-lg md:text-2xl"
          )}>
            {currentTimeStr}
          </div>
          {allCompleted && (
            <div className="bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <LucideIcons.Trophy className="w-4 h-4" /> ぜんいんたっせい！
            </div>
          )}
          <button
            onClick={onNavigateToAdmin}
            className="text-slate-300 hover:text-slate-500 transition-colors bg-white/50 hover:bg-slate-100 p-2 rounded-full shadow-sm border border-slate-200"
          >
            <LucideIcons.Settings size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable Table */}
      <div ref={scrollRef} className={cn("flex-1 overflow-x-auto overflow-y-auto", appData.hideTitleAndSubtitle ? "px-1 py-1" : "px-2 py-4")}>
        <table className="border-collapse mx-auto min-w-max">
          {/* Time group header row */}
          <thead>
            <tr>
              {headerGroups.map((hg, i) => (
                <th
                  key={`hg-${i}`}
                  colSpan={hg.count}
                  className={cn(
                    'px-1 py-2 text-center font-black text-base md:text-xl border border-slate-300',
                    hg.color.headerBg, 'text-white',
                    hg.groupId === currentGroupId && 'ring-4 ring-yellow-400 ring-inset'
                  )}
                >
                  {hg.groupName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Upper duty row */}
            <tr>
              {sortedSlots.map(slot => {
                const hasAnyLowerDuty = sortedSlots.some(s => !!s.lowerDutyName);
                const comp = getCompletion(slot.id);
                const done = comp?.upperCompleted || false;
                const color = slot.groupId ? (groupColorMap.get(slot.groupId) || NOGROUP_COLOR) : NOGROUP_COLOR;
                const isCurrentGroup = slot.groupId === currentGroupId;
                return (
                  <td
                    key={`upper-${slot.id}`}
                    id={`slot-col-${slot.id}`}
                    rowSpan={hasAnyLowerDuty && !slot.lowerDutyName ? 2 : 1}
                    onClick={() => !done && slot.upperDutyName && handleDutyClick(slot.id, 'upper')}
                    className={cn(
                      'border border-slate-300 px-1 py-2 text-center align-middle transition-all',
                      'min-w-[48px] md:min-w-[60px]',
                      slot.upperDutyName ? 'cursor-pointer hover:brightness-90' : '',
                      done ? cn(color.completedBg, 'opacity-50') : color.cellBg,
                      isCurrentGroup && !done && 'ring-2 ring-yellow-300 ring-inset',
                    )}
                  >
                    {slot.upperDutyName ? (
                      <div className="relative flex items-center justify-center">
                        <span
                          style={verticalStyle}
                          className={cn(
                            'text-sm md:text-lg font-bold leading-tight min-h-[60px] md:min-h-[100px] flex items-center justify-center',
                            done ? 'line-through text-slate-400' : color.text
                          )}
                        >
                          {slot.upperDutyName}
                        </span>
                        {done && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LucideIcons.Check className="w-6 h-6 md:w-8 md:h-8 text-green-500 drop-shadow" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="min-h-[60px] md:min-h-[100px]" />
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Lower duty row */}
            {sortedSlots.some(s => !!s.lowerDutyName) && (
              <tr>
                {sortedSlots.map(slot => {
                  if (!slot.lowerDutyName) return null; // Upper row spans into this space
                  const comp = getCompletion(slot.id);
                const done = comp?.lowerCompleted || false;
                const color = slot.groupId ? (groupColorMap.get(slot.groupId) || NOGROUP_COLOR) : NOGROUP_COLOR;
                const isCurrentGroup = slot.groupId === currentGroupId;
                return (
                  <td
                    key={`lower-${slot.id}`}
                    onClick={() => !done && slot.lowerDutyName && handleDutyClick(slot.id, 'lower')}
                    className={cn(
                      'border border-slate-300 px-1 py-2 text-center align-middle transition-all',
                      'min-w-[48px] md:min-w-[60px]',
                      slot.lowerDutyName ? 'cursor-pointer hover:brightness-90' : '',
                      done ? cn(color.completedBg, 'opacity-50') : (slot.lowerDutyName ? color.cellBg : 'bg-white'),
                      isCurrentGroup && slot.lowerDutyName && !done && 'ring-2 ring-yellow-300 ring-inset',
                    )}
                  >
                    {slot.lowerDutyName ? (
                      <div className="relative flex items-center justify-center">
                        <span
                          style={verticalStyle}
                          className={cn(
                            'text-sm md:text-lg font-bold leading-tight min-h-[60px] md:min-h-[100px] flex items-center justify-center',
                            done ? 'line-through text-slate-400' : color.text
                          )}
                        >
                          {slot.lowerDutyName}
                        </span>
                        {done && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LucideIcons.Check className="w-6 h-6 md:w-8 md:h-8 text-green-500 drop-shadow" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="min-h-[60px] md:min-h-[100px]" />
                    )}
                  </td>
                );
              })}
              </tr>
            )}

            {/* Student number row */}
            <tr>
              {sortedSlots.map(slot => {
                const student = getStudentForSlot(slot.position);
                return (
                  <td key={`num-${slot.id}`} className="border border-slate-300 px-1 py-1 text-center bg-white font-bold text-base md:text-xl text-slate-700">
                    {student?.studentNumber ?? ''}
                  </td>
                );
              })}
            </tr>

            {/* Student name row (vertical) */}
            <tr>
              {sortedSlots.map(slot => {
                const student = getStudentForSlot(slot.position);
                return (
                  <td key={`name-${slot.id}`} className="border border-slate-300 px-1 py-2 text-center bg-white align-middle">
                    {student ? (
                      <span
                        style={verticalStyle}
                        className="text-base md:text-xl font-extrabold text-slate-800 leading-tight min-h-[60px] md:min-h-[100px] inline-flex items-center justify-center"
                      >
                        {student.name}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Completion Dialog */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-lg w-full relative"
            >
              <button
                className="absolute top-4 right-4 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-500"
                onClick={() => setSelectedSlot(null)}
              >
                <LucideIcons.X size={24} />
              </button>

              {!showProxySelect ? (
                <>
                  <div className="text-center mb-8">
                    {(() => {
                      const slot = dutySlots.find(s => s.id === selectedSlot.slotId);
                      const student = slot ? getStudentForSlot(slot.position) : undefined;
                      return (
                        <h3 className="text-3xl font-black text-slate-800 mb-2">
                          {student ? `${student.name}さん、` : ''}おわりましたか？
                        </h3>
                      );
                    })()}
                    <p className="text-slate-500 text-lg">どうやっておわったか おしえてね</p>
                  </div>
                  <div className="space-y-4">
                    <button
                      className="w-full h-20 bg-blue-400 text-white rounded-2xl text-2xl font-bold shadow-lg hover:bg-blue-500 active:scale-95 transition-all"
                      onClick={() => completeAssignment('normal')}
                    >
                      👍 じぶんでやりました
                    </button>
                    <button
                      className="w-full h-20 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-white rounded-2xl text-2xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all ring-2 ring-yellow-300"
                      onClick={() => setShowProxySelect(true)}
                    >
                      🦸 かわりにやりました (ヒーロー)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-black text-amber-500 mb-2">ヒーローはだれですか？</h3>
                    <p className="text-slate-500">かわりにやってくれたひとの なまえをえらんでね</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto pr-2 grid grid-cols-2 gap-2 mb-6">
                    {students.map(s => (
                      <button
                        key={s.id}
                        className="p-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-lg font-bold text-slate-700 transition-colors"
                        onClick={() => completeAssignment('hero', s.id)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <button
                    className="w-full p-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                    onClick={() => setShowProxySelect(false)}
                  >
                    もどる
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
