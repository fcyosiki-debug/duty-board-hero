'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppData, defaultAppData, DailySlotAssignment, SlotCompletion, Student, DutySlot } from '@/types';
import { useLocalStorage } from './useLocalStorage';

type AppContextType = {
  appData: AppData;
  setAppData: (data: AppData | ((prev: AppData) => AppData)) => void;
  resetDailyDuties: (forceRotate?: boolean) => void;
  reverseRotation: () => void;
  isMounted: boolean;
  getStudentForSlot: (slotPosition: number) => Student | undefined;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [appData, setAppData] = useLocalStorage<AppData>('hero-duty-board-v1', defaultAppData);
  const [isMounted, setIsMounted] = useState(false);

  // Migration layer
  useEffect(() => {
    setAppData(prev => {
      let migrated = false;
      let newPrev = { ...prev };
      
      if (!newPrev.dutyGroups) {
        newPrev.dutyGroups = [];
        migrated = true;
      }
      if (!newPrev.extraBoards) {
        newPrev.extraBoards = [];
        migrated = true;
      }
      if (!newPrev.boardTitle) {
        newPrev.boardTitle = 'きょうの おとうばん';
        migrated = true;
      }
      if (!newPrev.boardSubtitle) {
        newPrev.boardSubtitle = 'みんなのためによろしくね！';
        migrated = true;
      }

      // Migrate old duties to new dutySlots if needed
      if (!newPrev.dutySlots || newPrev.dutySlots.length === 0) {
        if (newPrev.duties && newPrev.duties.length > 0) {
          // Convert old duties → dutySlots
          newPrev.dutySlots = newPrev.duties.map((d, i) => ({
            id: `slot-migrated-${d.id}`,
            position: i + 1,
            upperDutyName: d.name,
            upperDutyFurigana: d.furigana,
            lowerDutyName: undefined,
            lowerDutyFurigana: undefined,
            groupId: d.groupId,
          }));
          migrated = true;
        } else {
          newPrev.dutySlots = defaultAppData.dutySlots;
          migrated = true;
        }
      }

      if (!newPrev.slotAssignment) {
        newPrev.slotAssignment = null;
        migrated = true;
      }

      // Ensure that dutySlots have strictly unique positions to prevent display overlaps 
      // where multiple items share a coordinate, which causes fewer visible slots to be detected.
      if (newPrev.dutySlots && newPrev.dutySlots.length > 0) {
        const positionCounts = new Map<number, number>();
        newPrev.dutySlots.forEach(s => {
          positionCounts.set(s.position, (positionCounts.get(s.position) || 0) + 1);
        });
        
        const hasDuplicates = Array.from(positionCounts.values()).some(count => count > 1);
        
        if (hasDuplicates) {
          newPrev.dutySlots = [...newPrev.dutySlots]
            .sort((a, b) => a.position - b.position)
            .map((s, i) => ({ ...s, position: i + 1 }));
          migrated = true;
        }
      }

      if (migrated) {
        return newPrev;
      }
      return prev;
    });
  }, [setAppData]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get student assigned to a given slot position (1-based)
  const getStudentForSlot = (slotPosition: number): Student | undefined => {
    // 1. Check if any excluded student is explicitly pinned to this position
    const pinnedStudent = appData.students.find(s => s.excludedFromRotation && s.pinnedSlotPositions?.includes(slotPosition));
    if (pinnedStudent) return pinnedStudent;

    const activeStudents = appData.students.filter(s => !s.excludedFromRotation);
    if (activeStudents.length === 0) return undefined;

    // 2. Discover all distinct slot positions
    const allPositions = Array.from(new Set((appData.dutySlots || []).map(s => s.position))).sort((a, b) => a - b);
    
    // 3. Find which positions are occupied by pinned students
    const pinnedPositions = new Set<number>();
    appData.students.forEach(s => {
      if (s.excludedFromRotation && s.pinnedSlotPositions) {
        s.pinnedSlotPositions.forEach(p => pinnedPositions.add(p));
      }
    });

    // 4. Get active slots mapping
    const activePositions = allPositions.filter(p => !pinnedPositions.has(p));
    const activeIndex = activePositions.indexOf(slotPosition);
    if (activeIndex === -1) {
      // Fallback: If not an active position and no one is pinned, just fallback to index math
      const offset = appData.rotationConfig.currentDutyIndex;
      const index = ((slotPosition - 1) + offset) % activeStudents.length;
      return activeStudents[index >= 0 ? index : index + activeStudents.length];
    }

    // 5. Map the sequential activeIndex to the activeStudents array with the rotation offset
    const offset = appData.rotationConfig.currentDutyIndex;
    const index = (activeIndex + offset) % activeStudents.length;
    return activeStudents[index >= 0 ? index : index + activeStudents.length];
  };

  // Reset daily slot assignments
  const resetDailyDuties = (forceRotate = false) => {
    setAppData(prev => {
      const today = new Date().toISOString().split('T')[0];
      
      const activeStudents = prev.students.filter(s => !s.excludedFromRotation);
      if (activeStudents.length === 0 || !prev.dutySlots || prev.dutySlots.length === 0) {
        return { ...prev, lastResetDate: today, slotAssignment: { date: today, completions: [] } };
      }

      let nextIndex = prev.rotationConfig.currentDutyIndex;
      
      if (prev.rotationConfig.type !== 'manual' || forceRotate) {
        const lastRotatedDate = prev.rotationConfig.lastRotatedDate;
        const dateObj = new Date();
        const isNewDay = lastRotatedDate !== today;
        
        if (forceRotate || isNewDay) {
          if (forceRotate || prev.rotationConfig.type === 'daily') {
            nextIndex = (nextIndex - 1 + activeStudents.length) % activeStudents.length;
          } else if (prev.rotationConfig.type === 'weekly' && dateObj.getDay() === 1) {
            nextIndex = (nextIndex - 1 + activeStudents.length) % activeStudents.length;
          }
        }
      }

      // Create fresh completions for all slots
      const completions: SlotCompletion[] = prev.dutySlots.map(slot => ({
        slotId: slot.id,
        upperCompleted: false,
        lowerCompleted: false,
      }));

      return {
        ...prev,
        lastResetDate: today,
        rotationConfig: {
          ...prev.rotationConfig,
          currentDutyIndex: nextIndex,
          lastRotatedDate: today
        },
        slotAssignment: {
          date: today,
          completions
        }
      };
    });
  };

  const reverseRotation = () => {
    setAppData(prev => {
      const today = new Date().toISOString().split('T')[0];
      const activeStudents = prev.students.filter(s => !s.excludedFromRotation);
      if (activeStudents.length === 0) return prev;

      const prevIndex = (prev.rotationConfig.currentDutyIndex + 1) % activeStudents.length;

      const completions: SlotCompletion[] = (prev.dutySlots || []).map(slot => ({
        slotId: slot.id,
        upperCompleted: false,
        lowerCompleted: false,
      }));

      return {
        ...prev,
        rotationConfig: {
          ...prev.rotationConfig,
          currentDutyIndex: prevIndex,
          lastRotatedDate: today
        },
        slotAssignment: {
          date: today,
          completions
        }
      };
    });
  };

  // Daily reset trigger
  useEffect(() => {
    if (isMounted) {
      const today = new Date().toISOString().split('T')[0];
      if (appData.lastResetDate !== today || !appData.slotAssignment || appData.slotAssignment.date !== today) {
        resetDailyDuties();
      }
    }
  }, [isMounted, appData.lastResetDate, appData.slotAssignment?.date]);


  return (
    <AppContext.Provider value={{ appData, setAppData, resetDailyDuties, reverseRotation, isMounted, getStudentForSlot }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
