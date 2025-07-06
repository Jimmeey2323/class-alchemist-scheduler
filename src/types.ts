export interface ClassData {
  variantName: string;
  classDate: string;
  location: string;
  payrate: string;
  totalRevenue: number;
  basePayout: number;
  additionalPayout: number;
  totalPayout: number;
  tip: number;
  participants: number;
  checkedIn: number;
  comps: number;
  checkedInComps: number;
  lateCancellations: number;
  nonPaidCustomers: number;
  timeHours: number;
  teacherFirstName: string;
  teacherLastName: string;
  teacherName: string;
  dayOfWeek: string;
  classTime: string;
  cleanedClass: string;
  unique1: string;
  unique2: string;
}

export interface ScheduledClass {
  id: string;
  day: string;
  time: string;
  location: string;
  classFormat: string;
  teacherFirstName: string;
  teacherLastName: string;
  duration: string;
  participants?: number;
  revenue?: number;
  isTopPerformer?: boolean;
  isLocked?: boolean;
  isPrivate?: boolean;
  coverTeacher?: string;
}

export interface TeacherHours {
  [teacherName: string]: number;
}

export interface TeacherAvailability {
  [teacherName: string]: {
    unavailableDates: string[];
    isOnLeave: boolean;
    leaveStartDate?: string;
    leaveEndDate?: string;
  };
}

export interface OptimizationSuggestion {
  type: 'teacher_change' | 'time_change' | 'format_change' | 'new_class';
  originalClass?: ScheduledClass;
  suggestedClass: ScheduledClass;
  reason: string;
  impact: string;
  priority: number;
}

interface HistoricData {
  averageParticipants: number;
  averageRevenue: number;
  successRate: number;
  bestTeacher: string;
  peakTimes: string[];
}

export interface AIProvider {
  name: string;
  key: string;
  endpoint: string;
}

export interface AIRecommendation {
  classFormat: string;
  teacher: string;
  reasoning: string;
  confidence: number;
  expectedParticipants: number;
  expectedRevenue: number;
  priority: number;
  timeSlot?: string;
  location?: string;
}

export interface TopPerformingClass {
  classFormat: string;
  location: string;
  day: string;
  time: string;
  teacher: string;
  avgParticipants: number;
  avgRevenue: number;
  frequency: number;
}

interface ClassCount {
  [classFormat: string]: number;
}

interface LocationClassCounts {
  [location: string]: {
    [day: string]: ClassCount;
  };
}

interface ViewMode {
  id: string;
  name: string;
  description: string;
}

export interface CustomTeacher {
  firstName: string;
  lastName: string;
  specialties: string[];
  isNew: boolean;
  avatar?: string;
  priority?: 'high' | 'normal' | 'low';
  preferredDays?: string[];
  maxHours?: number;
  minHours?: number;
}

interface FilterOptions {
  showTopPerformers: boolean;
  showPrivateClasses: boolean;
  showRegularClasses: boolean;
  selectedTeacher: string;
  selectedClassFormat: string;
}