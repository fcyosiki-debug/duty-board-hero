export interface Student {
  id: string;
  studentNumber: number;
  name: string;
  furigana?: string;
  proxyCount: number;
  excludedFromRotation?: boolean;
  pinnedSlotPositions?: number[]; // The slot positions the student is pinned to while excluded
  skipDuties?: string[]; // duty IDs this student cannot do
}

export interface DutyGroup {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
}

// Legacy — kept for backward compatibility / migration
export interface Duty {
  id: string;
  name: string;
  furigana?: string;
  icon?: string;
  groupId: string | null;
}

// NEW: A single column in the duty table
export interface DutySlot {
  id: string;
  position: number;          // 1 = rightmost (first student position)
  upperDutyName: string;     // Top duty cell
  upperDutyFurigana?: string;
  lowerDutyName?: string;    // Bottom duty cell (optional, empty = 1 duty only)
  lowerDutyFurigana?: string;
  groupId: string | null;    // Which time period group this slot belongs to
}

// Completion status for a single slot on a given day
export interface SlotCompletion {
  slotId: string;
  upperCompleted: boolean;
  lowerCompleted: boolean;
}

// Daily assignment state for the table
export interface DailySlotAssignment {
  date: string;      // YYYY-MM-DD
  completions: SlotCompletion[];
}

// Legacy types kept for backward compatibility
export interface DailyDutyAssignment {
  dutyId: string;
  studentId: string | null;
  completed: boolean;
  completedBy: string | null;
}

export interface DailyAssignment {
  date: string;
  assignments: DailyDutyAssignment[];
}

export interface RewardMessage {
  id: string;
  text: string;
  weight: number; 
  type: 'normal' | 'hero' | 'all_completed';
}

export interface RotationConfig {
  type: 'manual' | 'daily' | 'weekly';
  lastRotatedDate: string | null;
  currentDutyIndex: number; // rotation offset for shifting students
}

// Legacy
export interface BoardDuty {
  id: string;
  name: string;
  furigana?: string;
}

// Legacy
export interface ExtraDutyBoard {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  duties: BoardDuty[];
  rotationConfig: RotationConfig;
  currentAssignment: DailyAssignment | null;
  lastResetDate: string;
}

export interface AppData {
  students: Student[];
  duties: Duty[];                              // Legacy, kept for migration
  dutySlots: DutySlot[];                       // NEW: table columns
  dutyGroups: DutyGroup[];
  currentAssignment: DailyAssignment | null;   // Legacy
  slotAssignment: DailySlotAssignment | null;  // NEW: daily completions
  rewardMessages: RewardMessage[];
  rotationConfig: RotationConfig;
  lastResetDate: string;
  extraBoards: ExtraDutyBoard[];               // Legacy
  boardTitle?: string;
  boardSubtitle?: string;
  hideTitleAndSubtitle?: boolean;
}

export const defaultAppData: AppData = {
  students: [],
  dutyGroups: [
    { id: 'grp-morning', name: '朝', startTime: '08:00', endTime: '08:30' },
    { id: 'grp-recess', name: '大休けい', startTime: '10:25', endTime: '10:45' },
    { id: 'grp-lunch', name: '給食', startTime: '12:15', endTime: '13:00' },
    { id: 'grp-cleaning', name: 'そうじ', startTime: '13:05', endTime: '13:25' },
    { id: 'grp-end', name: '帰りの会', startTime: '14:50', endTime: '15:10' },
  ],
  duties: [],
  dutySlots: [
    { id: 'slot-1', position: 1, upperDutyName: 'はいぜん', groupId: 'grp-lunch' },
    { id: 'slot-2', position: 2, upperDutyName: 'はいぜん', groupId: 'grp-lunch' },
    { id: 'slot-3', position: 3, upperDutyName: 'くばりもの', groupId: 'grp-morning' },
    { id: 'slot-4', position: 4, upperDutyName: 'くばりもの', groupId: 'grp-morning' },
    { id: 'slot-5', position: 5, upperDutyName: 'こくばんけし', groupId: 'grp-recess' },
  ],
  currentAssignment: null,
  slotAssignment: null,
  rewardMessages: [
    { id: '1', text: 'ありがとう！', weight: 50, type: 'normal' },
    { id: '2', text: 'おつかれさま！', weight: 50, type: 'normal' },
    { id: '3', text: 'クラスのヒーローだね！', weight: 40, type: 'hero' },
    { id: '4', text: 'みんなのためにありがとう！', weight: 40, type: 'hero' },
    { id: '5', text: '先生大助かり！神様！', weight: 20, type: 'hero' },
    { id: '6', text: 'ぜんいんたっせい！きょうも１日はなまるです💮', weight: 100, type: 'all_completed' }
  ],
  rotationConfig: {
    type: 'daily',
    lastRotatedDate: null,
    currentDutyIndex: 0
  },
  lastResetDate: new Date().toISOString().split('T')[0],
  extraBoards: [],
  boardTitle: 'きょうの おとうばん',
  boardSubtitle: 'みんなのためによろしくね！'
};
