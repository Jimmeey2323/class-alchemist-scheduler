import { ClassData, TopPerformingClass, ScheduledClass, TeacherHours } from '../types';

export const getClassDuration = (className: string): string => {
  const lowerName = className.toLowerCase();
  
  if (lowerName.includes('express')) {
    return '0.75'; // 45 minutes
  }
  
  if (lowerName.includes('recovery') || lowerName.includes('sweat in 30')) {
    return '0.5'; // 30 minutes
  }
  
  return '1'; // 60 minutes (default)
};

const isHostedClass = (className: string): boolean => {
  return className.toLowerCase().includes('hosted');
};

// Location-specific class format rules
export const isClassAllowedAtLocation = (classFormat: string, location: string): boolean => {
  const lowerFormat = classFormat.toLowerCase();
  
  if (location === 'Supreme HQ, Bandra') {
    // Supreme HQ: PowerCycle ONLY, NO Amped Up or HIIT
    if (lowerFormat.includes('amped up') || lowerFormat.includes('hiit')) {
      return false;
    }
    return true; // All other classes allowed
  } else {
    // Other locations: NO PowerCycle or PowerCycle Express
    if (lowerFormat.includes('powercycle') || lowerFormat.includes('power cycle')) {
      return false;
    }
    return true; // All other classes allowed
  }
};

// Get maximum parallel classes for each location (studio capacity)
const getMaxParallelClasses = (location: string): number => {
  switch (location) {
    case 'Supreme HQ, Bandra':
      return 3; // 3 studios
    case 'Kwality House, Kemps Corner':
      return 2; // 2 studios
    case 'Kenkere House':
      return 2; // 2 studios
    default:
      return 1;
  }
};

// Get all 30-minute time slots that a class occupies
const getOccupiedTimeSlots = (startTime: string, duration: string): string[] => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const durationMinutes = parseFloat(duration) * 60;
  
  const occupiedSlots: string[] = [];
  
  // Generate 30-minute intervals that this class occupies
  for (let i = 0; i < durationMinutes; i += 30) {
    const slotMinutes = startMinutes + i;
    const slotHours = Math.floor(slotMinutes / 60);
    const slotMins = slotMinutes % 60;
    
    const timeSlot = `${slotHours.toString().padStart(2, '0')}:${slotMins.toString().padStart(2, '0')}`;
    occupiedSlots.push(timeSlot);
  }
  
  return occupiedSlots;
};

// Check if a new class can be assigned to a studio without conflicts
const canAssignClassToStudio = (
  scheduledClasses: ScheduledClass[],
  newClass: { day: string; time: string; location: string; duration: string }
): boolean => {
  const maxParallel = getMaxParallelClasses(newClass.location);
  const newClassOccupiedSlots = getOccupiedTimeSlots(newClass.time, newClass.duration);
  
  // Check each time slot that the new class would occupy
  for (const timeSlot of newClassOccupiedSlots) {
    // Count how many existing classes are using studios at this time slot
    const conflictingClasses = scheduledClasses.filter(existingClass => {
      if (existingClass.location !== newClass.location || existingClass.day !== newClass.day) {
        return false;
      }
      
      const existingOccupiedSlots = getOccupiedTimeSlots(existingClass.time, existingClass.duration);
      return existingOccupiedSlots.includes(timeSlot);
    });
    
    // If adding this class would exceed studio capacity, return false
    if (conflictingClasses.length >= maxParallel) {
      return false;
    }
  }
  
  return true;
};

// Enhanced time restriction checking
export const isTimeRestricted = (time: string, day: string, isPrivateClass: boolean = false): boolean => {
  const hour = parseInt(time.split(':')[0]);
  const minute = parseInt(time.split(':')[1]);
  const timeInMinutes = hour * 60 + minute;
  
  // Restricted period: 12:00 PM to 5:00 PM (720 to 1020 minutes)
  const restrictedStart = 12 * 60; // 12:00 PM
  const restrictedEnd = 17 * 60; // 5:00 PM
  
  const isInRestrictedPeriod = timeInMinutes >= restrictedStart && timeInMinutes < restrictedEnd;
  
  // If it's a private class, it's allowed during restricted hours
  if (isPrivateClass && isInRestrictedPeriod) {
    return false; // Not restricted for private classes
  }
  
  // For regular classes, restricted during 12-5 PM
  return isInRestrictedPeriod;
};

// Get available time slots based on day and restrictions - NOW WITH 15 AND 45 MINUTE INTERVALS
export const getAvailableTimeSlots = (day: string): string[] => {
  // Generate more flexible time slots including 15 and 45 minute intervals
  const generateTimeSlots = (startHour: number, endHour: number): string[] => {
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:15`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
      slots.push(`${hour.toString().padStart(2, '0')}:45`);
    }
    return slots;
  };

  // Weekend restrictions
  if (day === 'Sunday') {
    // Sunday: 10:00 AM onwards only
    return [
      ...generateTimeSlots(10, 11),
      ...generateTimeSlots(17, 19)
    ].sort();
  }
  
  if (day === 'Saturday') {
    // Saturday: 8:30 AM or 9:00 AM onwards
    return [
      '08:30', '08:45',
      ...generateTimeSlots(9, 11),
      ...generateTimeSlots(17, 19)
    ].sort();
  }
  
  // Weekdays: Include 7:30 AM start with flexible intervals
  const morningSlots = [
    '07:30', '07:45',
    ...generateTimeSlots(8, 11)
  ];
  const eveningSlots = generateTimeSlots(17, 19);
  
  return [...morningSlots, ...eveningSlots].sort();
};

// Get restricted time slots (for display purposes)
export const getRestrictedTimeSlots = (): string[] => {
  // 12:00 PM to 5:00 PM slots
  return ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
};

// Check if time slot allows for balanced morning/evening distribution
const isMorningSlot = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  return hour < 12; // Before 12 PM is considered morning
};

const isEveningSlot = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  return hour >= 17; // 5 PM and after is considered evening
};

const isPeakHour = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  // Peak hours: 7:30-11:30 AM and 5:30-8:00 PM
  return (hour >= 7 && hour <= 11) || (hour >= 17 && hour <= 19);
};

// Get shift balance for a location and day
const getShiftBalance = (scheduledClasses: ScheduledClass[], location: string, day: string): { morning: number; evening: number } => {
  const dayClasses = scheduledClasses.filter(cls => cls.location === location && cls.day === day);
  
  const morning = dayClasses.filter(cls => isMorningSlot(cls.time)).length;
  const evening = dayClasses.filter(cls => isEveningSlot(cls.time)).length;
  
  return { morning, evening };
};

// Check if adding a class would maintain shift balance
const maintainsShiftBalance = (
  scheduledClasses: ScheduledClass[],
  newClass: { day: string; time: string; location: string }
): boolean => {
  const currentBalance = getShiftBalance(scheduledClasses, newClass.location, newClass.day);
  const isNewClassMorning = isMorningSlot(newClass.time);
  
  if (isNewClassMorning) {
    // Adding morning class - check if it doesn't create too much imbalance
    return (currentBalance.morning + 1) <= currentBalance.evening + 2;
  } else {
    // Adding evening class - check if it doesn't create too much imbalance
    return (currentBalance.evening + 1) <= currentBalance.morning + 2;
  }
};

// Get teacher's daily hours
const getTeacherDailyHours = (
  scheduledClasses: ScheduledClass[],
  teacherName: string,
  day: string
): number => {
  return scheduledClasses
    .filter(cls => 
      `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName && 
      cls.day === day
    )
    .reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
};

// Check if teacher can take another class (max 4 hours per day)
const canTeacherTakeClass = (
  scheduledClasses: ScheduledClass[],
  teacherName: string,
  day: string,
  duration: string
): boolean => {
  const currentDailyHours = getTeacherDailyHours(scheduledClasses, teacherName, day);
  return currentDailyHours + parseFloat(duration) <= 4;
};

// Get teacher's days off
const getTeacherDaysOff = (
  scheduledClasses: ScheduledClass[],
  teacherName: string
): string[] => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const workingDays = new Set(
    scheduledClasses
      .filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName)
      .map(cls => cls.day)
  );
  
  return days.filter(day => !workingDays.has(day));
};

// Check if teacher has at least 2 days off
const hasMinimumDaysOff = (
  scheduledClasses: ScheduledClass[],
  teacherName: string
): boolean => {
  const daysOff = getTeacherDaysOff(scheduledClasses, teacherName);
  return daysOff.length >= 2;
};

// Get consecutive classes count for a teacher on a specific day
const getConsecutiveClassesCount = (
  scheduledClasses: ScheduledClass[],
  teacherName: string,
  day: string,
  newTime: string
): number => {
  const teacherDayClasses = scheduledClasses
    .filter(cls => 
      `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName && 
      cls.day === day
    )
    .map(cls => cls.time)
    .concat([newTime])
    .sort();

  let maxConsecutive = 1;
  let currentConsecutive = 1;

  for (let i = 1; i < teacherDayClasses.length; i++) {
    const prevTime = teacherDayClasses[i - 1];
    const currentTime = teacherDayClasses[i];
    
    // Check if times are consecutive (within 1.5 hours)
    const prevMinutes = parseInt(prevTime.split(':')[0]) * 60 + parseInt(prevTime.split(':')[1]);
    const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
    
    if (currentMinutes - prevMinutes <= 90) { // Within 1.5 hours
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }

  return maxConsecutive;
};

// Calculate class performance score
const calculateClassScore = (classData: ClassData[]): number => {
  if (classData.length === 0) return 0;
  
  const avgParticipants = classData.reduce((sum, cls) => sum + cls.participants, 0) / classData.length;
  const avgRevenue = classData.reduce((sum, cls) => sum + cls.totalRevenue, 0) / classData.length;
  const fillRate = avgParticipants / 20; // Assuming max capacity of 20
  const cancellationRate = classData.reduce((sum, cls) => sum + cls.lateCancellations, 0) / classData.length / avgParticipants;
  
  // Weighted score: 40% fill rate, 30% revenue, 20% participants, 10% low cancellation
  return (fillRate * 0.4) + ((avgRevenue / 10000) * 0.3) + ((avgParticipants / 20) * 0.2) + ((1 - cancellationRate) * 0.1);
};

// Get day-wise class guidelines
const getDayGuidelines = (day: string): { focus: string; avoid: string[]; priority: string[] } => {
  const guidelines = {
    'Monday': {
      focus: 'Strong start with high-demand formats & senior trainers - MUST start at 7:30 AM',
      avoid: ['Studio Recovery'],
      priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57']
    },
    'Tuesday': {
      focus: 'Balance beginner & intermediate classes - MUST start at 7:30 AM',
      avoid: ['Studio HIIT', 'Studio Amped Up!'],
      priority: ['Studio Barre 57', 'Studio Mat 57', 'Studio Foundations', 'Studio Cardio Barre']
    },
    'Wednesday': {
      focus: 'Midweek peak - repeat Monday\'s popular formats - MUST start at 7:30 AM',
      avoid: [],
      priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57']
    },
    'Thursday': {
      focus: 'Lighter mix with recovery formats - MUST start at 7:30 AM',
      avoid: [],
      priority: ['Studio Recovery', 'Studio Mat 57', 'Studio Cardio Barre', 'Studio Back Body Blaze']
    },
    'Friday': {
      focus: 'Energy-focused with HIIT/Advanced classes - MUST start at 7:30 AM',
      avoid: [],
      priority: ['Studio HIIT', 'Studio Amped Up!', 'Studio FIT', 'Studio Cardio Barre']
    },
    'Saturday': {
      focus: 'Family-friendly & community formats - Start 8:30 AM or 9:00 AM onwards',
      avoid: ['Studio HIIT'],
      priority: ['Studio Barre 57', 'Studio Foundations', 'Studio Recovery', 'Studio Mat 57']
    },
    'Sunday': {
      focus: 'Max 4-5 classes, highest scoring formats only - Start 10:00 AM onwards',
      avoid: ['Studio HIIT', 'Studio Amped Up!'],
      priority: ['Studio Barre 57', 'Studio Recovery', 'Studio Mat 57']
    }
  };
  
  return guidelines[day] || { focus: '', avoid: [], priority: [] };
};

// Default top performing classes that should be populated by default
export const getDefaultTopClasses = (): Array<{
  classFormat: string;
  day: string;
  time: string;
  location: string;
  teacher: string;
  avgParticipants: number;
  isLocked: boolean;
}> => {
  return [
    // Based on the sample schedule provided
    {
      classFormat: 'Studio Barre 57',
      day: 'Monday',
      time: '07:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 12,
      isLocked: true
    },
    {
      classFormat: 'Studio Mat 57',
      day: 'Monday',
      time: '08:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 10,
      isLocked: true
    },
    {
      classFormat: 'Studio Barre 57',
      day: 'Monday',
      time: '18:45',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Pranjali Jain',
      avgParticipants: 9,
      isLocked: true
    },
    {
      classFormat: 'Studio FIT',
      day: 'Tuesday',
      time: '07:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 11,
      isLocked: true
    },
    {
      classFormat: 'Studio FIT',
      day: 'Tuesday',
      time: '19:15',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Richard D\'Costa',
      avgParticipants: 9,
      isLocked: true
    },
    {
      classFormat: 'Studio Cardio Barre (Express)',
      day: 'Wednesday',
      time: '07:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 10,
      isLocked: true
    },
    {
      classFormat: 'Studio Mat 57 (Express)',
      day: 'Thursday',
      time: '07:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Mrigakshi Jaiswal',
      avgParticipants: 8,
      isLocked: true
    },
    {
      classFormat: 'Studio Back Body Blaze (Express)',
      day: 'Friday',
      time: '07:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Mrigakshi Jaiswal',
      avgParticipants: 9,
      isLocked: true
    },
    {
      classFormat: 'Studio Mat 57',
      day: 'Saturday',
      time: '10:15',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Pranjali Jain',
      avgParticipants: 12,
      isLocked: true
    },
    {
      classFormat: 'Studio Barre 57',
      day: 'Sunday',
      time: '11:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Rohan Dahima',
      avgParticipants: 10,
      isLocked: true
    }
  ];
};

// Enhanced AI optimization with comprehensive rules and optimization types
export const generateIntelligentSchedule = async (
  csvData: ClassData[],
  customTeachers: any[] = [],
  options: {
    prioritizeTopPerformers?: boolean;
    balanceShifts?: boolean;
    optimizeTeacherHours?: boolean;
    respectTimeRestrictions?: boolean;
    minimizeTrainersPerShift?: boolean;
    targetDay?: string;
    iteration?: number;
    optimizationType?: 'revenue' | 'attendance' | 'balanced';
  } = {}
): Promise<ScheduledClass[]> => {
  const optimizedClasses: ScheduledClass[] = [];
  const teacherHoursTracker: Record<string, number> = {};
  const teacherDailyHours: Record<string, Record<string, number>> = {};
  const teacherShiftAssignments: Record<string, Record<string, { morning: boolean; evening: boolean }>> = {};
  const teacherLocationsPerDay: Record<string, Record<string, string[]>> = {}; // NEW: Track teacher locations per day
  const teacherDailyClassCount: Record<string, Record<string, number>> = {}; // NEW: Track daily class count
  
  // Define trainer categories
  const seniorTrainers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const newTrainers = ['Kabir', 'Simonelle'];
  const underutilizedTrainers = ['Reshma', 'Karanvir', 'Richard'];
  const advancedFormats = ['Studio HIIT', 'Studio Amped Up!'];
  const beginnerFormats = ['Studio Barre 57', 'Studio Foundations', 'Studio Recovery', 'Studio powerCycle'];
  
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const days = options.targetDay ? [options.targetDay] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Get all available teachers using the utility function to ensure all teachers are included
  const allTeachers = getUniqueTeachers(csvData, customTeachers);

  // Initialize teacher tracking
  allTeachers.forEach(teacher => {
    teacherHoursTracker[teacher] = 0;
    teacherDailyHours[teacher] = {};
    teacherShiftAssignments[teacher] = {};
    teacherLocationsPerDay[teacher] = {}; // NEW
    teacherDailyClassCount[teacher] = {}; // NEW
    days.forEach(day => {
      teacherDailyHours[teacher][day] = 0;
      teacherShiftAssignments[teacher][day] = { morning: false, evening: false };
      teacherLocationsPerDay[teacher][day] = []; // NEW
      teacherDailyClassCount[teacher][day] = 0; // NEW
    });
  });
  
  // Helper function to check if teacher can take class with ENHANCED constraints
  const canAssignTeacher = (teacherName: string, day: string, time: string, duration: string, classFormat: string, location: string): boolean => {
    const weeklyHours = teacherHoursTracker[teacherName] || 0;
    const dailyHours = teacherDailyHours[teacherName]?.[day] || 0;
    const dailyClassCount = teacherDailyClassCount[teacherName]?.[day] || 0;
    const classDuration = parseFloat(duration);
    
    // Check new trainer restrictions
    const isNewTrainer = newTrainers.some(name => teacherName.includes(name));
    const maxWeeklyHours = isNewTrainer ? 10 : 15;
    
    // New trainers can only teach specific formats
    if (isNewTrainer) {
      const allowedFormats = ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'];
      if (!allowedFormats.includes(classFormat)) {
        return false;
      }
    }
    
    // Advanced formats only for senior trainers
    if (advancedFormats.includes(classFormat) && !seniorTrainers.some(name => teacherName.includes(name))) {
      return false;
    }
    
    // Check hour limits
    if (weeklyHours + classDuration > maxWeeklyHours || dailyHours + classDuration > 4) {
      return false;
    }
    
    // NEW: Check daily class limit (max 4 classes per day)
    if (dailyClassCount >= 4) {
      return false;
    }
    
    // NEW: Check consecutive classes limit (max 2 consecutive)
    const consecutiveCount = getConsecutiveClassesCount(optimizedClasses, teacherName, day, time);
    if (consecutiveCount > 2) {
      return false;
    }
    
    // NEW: Prevent cross-location assignments on same day (STRICT RULE)
    const teacherDayLocations = teacherLocationsPerDay[teacherName]?.[day] || [];
    if (teacherDayLocations.length > 0 && !teacherDayLocations.includes(location)) {
      return false; // Teacher already assigned to different location this day
    }
    
    // Check if teacher already has 2 days off
    const currentWorkingDays = Object.keys(teacherDailyHours[teacherName]).filter(d => teacherDailyHours[teacherName][d] > 0).length;
    if (currentWorkingDays >= 5 && teacherDailyHours[teacherName][day] === 0) {
      return false; // Would violate 2 days off rule
    }
    
    return true;
  };
  
  // Helper function to find best teacher with ENHANCED logic prioritizing location consistency and shift separation
  const findBestTeacherForClass = (classFormat: string, location: string, day: string, time: string): string | null => {
    const isNewClassMorning = isMorningSlot(time);
    const isPeak = isPeakHour(time);
    
    // Get best teacher from historic data
    const historicBestTeacher = getBestTeacherForClass(csvData, classFormat, location, day, time);
    
    // Create candidate list with priority order
    const candidateTeachers = allTeachers.filter(teacher => {
      const duration = getClassDuration(classFormat);
      return canAssignTeacher(teacher, day, time, duration, classFormat, location);
    });
    
    if (candidateTeachers.length === 0) return null;
    
    // Score teachers based on multiple criteria
    const scoredTeachers = candidateTeachers.map(teacher => {
      let score = 0;
      
      // 1. Historic performance (highest priority)
      if (teacher === historicBestTeacher) score += 100;
      
      // 2. Senior trainers for peak hours
      if (isPeak && seniorTrainers.some(st => teacher.includes(st))) score += 50;
      
      // 3. Location consistency (prefer teachers already at this location today)
      const teacherDayLocations = teacherLocationsPerDay[teacher]?.[day] || [];
      if (teacherDayLocations.includes(location)) score += 40;
      
      // 4. Shift separation preference (prefer teachers not working opposite shift)
      const teacherShifts = teacherShiftAssignments[teacher]?.[day];
      if (teacherShifts) {
        if (isNewClassMorning && !teacherShifts.evening) score += 30;
        if (!isNewClassMorning && !teacherShifts.morning) score += 30;
      }
      
      // 5. Underutilized teachers (encourage balanced workload)
      const currentHours = teacherHoursTracker[teacher] || 0;
      const targetHours = newTrainers.some(nt => teacher.includes(nt)) ? 10 : 15;
      if (currentHours < targetHours - 3) score += 20;
      
      // 6. Minimize trainers per shift (prefer teachers already working this shift)
      if (teacherShifts) {
        if (isNewClassMorning && teacherShifts.morning) score += 15;
        if (!isNewClassMorning && teacherShifts.evening) score += 15;
      }
      
      return { teacher, score };
    });
    
    // Return highest scoring teacher
    const bestCandidate = scoredTeachers.sort((a, b) => b.score - a.score)[0];
    return bestCandidate?.teacher || null;
  };
  
  // Helper function to assign class with studio capacity check and ENHANCED tracking
  const assignClass = (classData: any, teacher: string): boolean => {
    const duration = getClassDuration(classData.classFormat);
    
    // CRITICAL: Check studio capacity before assigning
    const newClass = {
      day: classData.day,
      time: classData.time,
      location: classData.location,
      duration: duration
    };
    
    if (!canAssignClassToStudio(optimizedClasses, newClass)) {
      console.log(`❌ Studio capacity exceeded for ${classData.location} on ${classData.day} at ${classData.time} - skipping class`);
      return false; // Cannot assign due to studio capacity
    }
    
    optimizedClasses.push({
      id: `ai-optimized-${classData.location}-${classData.day}-${classData.time}-${Date.now()}-${Math.random()}`,
      day: classData.day,
      time: classData.time,
      location: classData.location,
      classFormat: classData.classFormat,
      teacherFirstName: teacher.split(' ')[0],
      teacherLastName: teacher.split(' ').slice(1).join(' '),
      duration: duration,
      participants: classData.avgParticipants,
      revenue: classData.avgRevenue,
      isTopPerformer: classData.avgParticipants > 6,
      isPrivate: classData.isPrivate || false
    });
    
    // Update tracking
    teacherHoursTracker[teacher] = parseFloat(((teacherHoursTracker[teacher] || 0) + parseFloat(duration)).toFixed(1));
    teacherDailyHours[teacher][classData.day] = parseFloat(((teacherDailyHours[teacher][classData.day] || 0) + parseFloat(duration)).toFixed(1));
    teacherDailyClassCount[teacher][classData.day] = (teacherDailyClassCount[teacher][classData.day] || 0) + 1; // NEW
    
    // NEW: Track teacher location assignments
    if (!teacherLocationsPerDay[teacher][classData.day].includes(classData.location)) {
      teacherLocationsPerDay[teacher][classData.day].push(classData.location);
    }
    
    // Track shift assignments
    if (isMorningSlot(classData.time)) {
      teacherShiftAssignments[teacher][classData.day].morning = true;
    } else if (isEveningSlot(classData.time)) {
      teacherShiftAssignments[teacher][classData.day].evening = true;
    }
    
    console.log(`✅ Assigned ${classData.classFormat} at ${classData.location} on ${classData.day} at ${classData.time} to ${teacher} (${teacherDailyClassCount[teacher][classData.day]}/4 daily classes)`);
    return true;
  };

  // Helper function to get best class for slot based on optimization type
  const getBestClassForSlot = (location: string, day: string, time: string, guidelines: any): any => {
    const slotData = csvData.filter(item => 
      item.location === location &&
      item.dayOfWeek === day &&
      item.classTime.includes(time.slice(0, 5)) &&
      !isHostedClass(item.cleanedClass) &&
      isClassAllowedAtLocation(item.cleanedClass, location) &&
      !guidelines.avoid.includes(item.cleanedClass) &&
      item.participants >= 5.0 // Minimum threshold
    );

    if (slotData.length === 0) return null;

    // Group by class format and calculate performance
    const formatStats = slotData.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) {
        acc[item.cleanedClass] = { participants: 0, revenue: 0, count: 0 };
      }
      acc[item.cleanedClass].participants += item.participants;
      acc[item.cleanedClass].revenue += item.totalRevenue;
      acc[item.cleanedClass].count += 1;
      return acc;
    }, {} as any);

    // Convert to ranked array based on optimization type
    const rankedFormats = Object.entries(formatStats)
      .map(([format, stats]: [string, any]) => ({
        classFormat: format,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1)), // FIXED: 1 decimal place
        avgRevenue: stats.revenue / stats.count,
        count: stats.count,
        isPriority: guidelines.priority.includes(format),
        // Calculate optimization score based on type
        optimizationScore: (() => {
          const participantScore = stats.participants / stats.count;
          const revenueScore = (stats.revenue / stats.count) / 1000; // Normalize revenue
          
          switch (options.optimizationType) {
            case 'revenue':
              return revenueScore * 0.7 + participantScore * 0.3;
            case 'attendance':
              return participantScore * 0.8 + revenueScore * 0.2;
            case 'balanced':
            default:
              return participantScore * 0.5 + revenueScore * 0.5;
          }
        })()
      }))
      .sort((a, b) => {
        // Prioritize day guidelines first, then optimization score
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return b.optimizationScore - a.optimizationScore;
      });

    return rankedFormats[0] || null;
  };

  // Phase 0: Schedule default top performing classes first (locked classes)
  console.log('Phase 0: Scheduling default top performing classes...');
  
  const defaultTopClasses = getDefaultTopClasses();
  for (const defaultClass of defaultTopClasses) {
    if (options.targetDay && defaultClass.day !== options.targetDay) continue;
    
    if (canAssignTeacher(defaultClass.teacher, defaultClass.day, defaultClass.time, getClassDuration(defaultClass.classFormat), defaultClass.classFormat, defaultClass.location)) {
      const success = assignClass({
        classFormat: defaultClass.classFormat,
        location: defaultClass.location,
        day: defaultClass.day,
        time: defaultClass.time,
        avgParticipants: defaultClass.avgParticipants,
        avgRevenue: 0,
        isLocked: true
      }, defaultClass.teacher);
      
      if (!success) {
        console.log(`⚠️ Could not assign default class ${defaultClass.classFormat} at ${defaultClass.location} on ${defaultClass.day} at ${defaultClass.time} due to studio capacity`);
      }
    }
  }

  // Phase 1: MANDATORY 7:30 AM classes for weekdays at Kwality House
  console.log('Phase 1: Ensuring 7:30 AM weekday classes...');
  
  for (const day of days) {
    if (['Saturday', 'Sunday'].includes(day)) continue; // Skip weekends
    
    const existing730Class = optimizedClasses.find(cls => 
      cls.day === day && 
      cls.time === '07:30' && 
      cls.location === 'Kwality House, Kemps Corner'
    );
    
    if (!existing730Class) {
      const guidelines = getDayGuidelines(day);
      const bestClass = getBestClassForSlot('Kwality House, Kemps Corner', day, '07:30', guidelines);
      
      if (bestClass) {
        // Use enhanced teacher finding logic
        const bestTeacher = findBestTeacherForClass(bestClass.classFormat, 'Kwality House, Kemps Corner', day, '07:30');
        
        if (bestTeacher) {
          const success = assignClass({
            classFormat: bestClass.classFormat,
            location: 'Kwality House, Kemps Corner',
            day: day,
            time: '07:30',
            avgParticipants: bestClass.avgParticipants,
            avgRevenue: bestClass.avgRevenue
          }, bestTeacher);
          
          if (success) {
            console.log(`✅ Scheduled mandatory 7:30 AM class for ${day}: ${bestClass.classFormat} with ${bestTeacher}`);
          } else {
            console.log(`⚠️ Could not schedule mandatory 7:30 AM class for ${day} due to studio capacity`);
          }
        }
      }
    }
  }

  // Phase 2: Fill available time slots based on optimization strategy with studio capacity checks
  console.log(`Phase 2: Filling slots with ${options.optimizationType || 'balanced'} optimization...`);
  
  for (const day of days) {
    const guidelines = getDayGuidelines(day);
    const availableSlots = getAvailableTimeSlots(day);
    
    // Limit Sunday classes to max 5
    const maxClassesForDay = day === 'Sunday' ? 5 : availableSlots.length * locations.length;
    let classesScheduledForDay = optimizedClasses.filter(cls => cls.day === day).length;
    
    for (const location of locations) {
      for (const time of availableSlots) {
        if (classesScheduledForDay >= maxClassesForDay) break;
        
        const isPeak = isPeakHour(time);
        
        // Determine how many classes to try to schedule based on optimization type and peak hours
        let targetClasses = 1;
        
        if (options.optimizationType === 'revenue' && isPeak) {
          // Revenue optimization: try to maximize parallel classes in peak hours
          targetClasses = getMaxParallelClasses(location);
        } else if (options.optimizationType === 'attendance') {
          // Attendance optimization: spread classes more evenly
          targetClasses = Math.min(2, getMaxParallelClasses(location));
        } else {
          // Balanced approach
          if (location === 'Kwality House, Kemps Corner') {
            if (['07:30', '09:00', '11:00', '18:00', '19:15'].includes(time)) {
              targetClasses = 2;
            }
          } else if (location === 'Supreme HQ, Bandra') {
            if (['08:00', '09:00', '10:00', '18:00', '19:00'].includes(time)) {
              targetClasses = 2;
            }
          }
        }
        
        // Try to schedule classes up to studio capacity
        for (let attempt = 0; attempt < targetClasses; attempt++) {
          // Check if we can still add a class to this slot
          const testClass = {
            day: day,
            time: time,
            location: location,
            duration: '1' // Test with 1 hour duration
          };
          
          if (!canAssignClassToStudio(optimizedClasses, testClass)) {
            console.log(`🏢 Studio capacity reached for ${location} on ${day} at ${time} (${attempt + 1}/${targetClasses})`);
            break; // No more capacity at this time slot
          }
          
          const bestClass = getBestClassForSlot(location, day, time, guidelines);
          
          if (bestClass) {
            // Ensure different class formats in same slot
            const existingFormats = optimizedClasses
              .filter(cls => cls.location === location && cls.day === day && cls.time === time)
              .map(cls => cls.classFormat);
            
            if (existingFormats.includes(bestClass.classFormat)) continue;
            
            // Use enhanced teacher finding logic
            const bestTeacher = findBestTeacherForClass(bestClass.classFormat, location, day, time);
            
            if (bestTeacher) {
              const success = assignClass({
                classFormat: bestClass.classFormat,
                location: location,
                day: day,
                time: time,
                avgParticipants: bestClass.avgParticipants,
                avgRevenue: bestClass.avgRevenue
              }, bestTeacher);
              
              if (success) {
                classesScheduledForDay++;
              } else {
                console.log(`🏢 Could not assign ${bestClass.classFormat} at ${location} on ${day} at ${time} - studio capacity reached`);
                break; // Stop trying to add more classes to this slot
              }
            }
          }
        }
      }
    }
  }

  // Phase 3: Optimize teacher hours based on strategy with studio capacity checks
  console.log('Phase 3: Optimizing teacher utilization...');
  
  for (const teacher of allTeachers) {
    const currentHours = teacherHoursTracker[teacher] || 0;
    const isNewTrainer = newTrainers.some(name => teacher.includes(name));
    const targetHours = isNewTrainer ? 10 : 15;
    
    // Different strategies for reaching target hours
    if (options.optimizationType === 'revenue' && currentHours < targetHours - 2) {
      // Revenue optimization: prioritize high-revenue classes for underutilized teachers
      const teacherSpecialties = getTeacherSpecialties(csvData)[teacher] || [];
      const highRevenueSpecialties = teacherSpecialties
        .filter(spec => spec.avgParticipants > 8) // High-performing classes
        .slice(0, 2);
      
      for (const specialty of highRevenueSpecialties) {
        if (teacherHoursTracker[teacher] >= targetHours) break;
        
        // Find peak hour slots for this teacher
        for (const location of locations) {
          if (!isClassAllowedAtLocation(specialty.classFormat, location)) continue;
          
          for (const day of days) {
            if (teacherDailyHours[teacher][day] >= 4 || teacherDailyClassCount[teacher][day] >= 4) continue;
            
            const peakSlots = getAvailableTimeSlots(day).filter(time => isPeakHour(time));
            
            for (const time of peakSlots) {
              // Check studio capacity first
              const testClass = {
                day: day,
                time: time,
                location: location,
                duration: getClassDuration(specialty.classFormat)
              };
              
              if (!canAssignClassToStudio(optimizedClasses, testClass)) {
                continue; // Skip if no studio capacity
              }
              
              const existingClasses = optimizedClasses.filter(cls => 
                cls.location === location && cls.day === day && cls.time === time
              );
              
              if (existingClasses.some(cls => cls.classFormat === specialty.classFormat)) continue;
              
              if (canAssignTeacher(teacher, day, time, getClassDuration(specialty.classFormat), specialty.classFormat, location)) {
                const success = assignClass({
                  classFormat: specialty.classFormat,
                  location: location,
                  day: day,
                  time: time,
                  avgParticipants: specialty.avgParticipants,
                  avgRevenue: 0
                }, teacher);
                
                if (success) {
                  break;
                }
              }
            }
          }
        }
      }
    } else if (currentHours < targetHours - 1) {
      // Standard optimization for other strategies
      const teacherSpecialties = getTeacherSpecialties(csvData)[teacher] || [];
      
      for (const specialty of teacherSpecialties.slice(0, 3)) {
        if (teacherHoursTracker[teacher] >= targetHours) break;
        
        for (const location of locations) {
          if (!isClassAllowedAtLocation(specialty.classFormat, location)) continue;
          
          for (const day of days) {
            if (teacherDailyHours[teacher][day] >= 4 || teacherDailyClassCount[teacher][day] >= 4) continue;
            
            const availableSlots = getAvailableTimeSlots(day);
            
            for (const time of availableSlots) {
              // Check studio capacity first
              const testClass = {
                day: day,
                time: time,
                location: location,
                duration: getClassDuration(specialty.classFormat)
              };
              
              if (!canAssignClassToStudio(optimizedClasses, testClass)) {
                continue; // Skip if no studio capacity
              }
              
              const existingClasses = optimizedClasses.filter(cls => 
                cls.location === location && cls.day === day && cls.time === time
              );
              
              if (existingClasses.some(cls => cls.classFormat === specialty.classFormat)) continue;
              
              if (canAssignTeacher(teacher, day, time, getClassDuration(specialty.classFormat), specialty.classFormat, location)) {
                const success = assignClass({
                  classFormat: specialty.classFormat,
                  location: location,
                  day: day,
                  time: time,
                  avgParticipants: specialty.avgParticipants,
                  avgRevenue: 0
                }, teacher);
                
                if (success) {
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  console.log(`${options.optimizationType || 'Balanced'} optimization complete!`);
  console.log('Total classes scheduled:', optimizedClasses.length);
  console.log('Teacher utilization:', Object.entries(teacherHoursTracker).map(([teacher, hours]) => `${teacher}: ${hours}h`));
  
  // Log enhanced analytics
  console.log('\n👥 Teacher Assignment Analytics:');
  for (const teacher of allTeachers) {
    const hours = teacherHoursTracker[teacher] || 0;
    if (hours > 0) {
      const workingDays = Object.keys(teacherDailyHours[teacher]).filter(day => teacherDailyHours[teacher][day] > 0);
      const locations = Object.values(teacherLocationsPerDay[teacher]).flat();
      const uniqueLocations = [...new Set(locations)];
      const totalClasses = Object.values(teacherDailyClassCount[teacher]).reduce((sum, count) => sum + count, 0);
      
      console.log(`  ${teacher}: ${hours}h, ${totalClasses} classes, ${workingDays.length} days, ${uniqueLocations.length} location(s)`);
    }
  }
  
  // Log studio utilization for verification
  console.log('\n🏢 Studio Utilization Check:');
  for (const location of locations) {
    const maxCapacity = getMaxParallelClasses(location);
    console.log(`\n${location} (Max ${maxCapacity} studios):`);
    
    for (const day of days) {
      const dayClasses = optimizedClasses.filter(cls => cls.location === location && cls.day === day);
      if (dayClasses.length === 0) continue;
      
      // Group by time slot and check capacity
      const timeSlots = [...new Set(dayClasses.map(cls => cls.time))].sort();
      for (const time of timeSlots) {
        const slotClasses = dayClasses.filter(cls => cls.time === time);
        const capacityUsed = slotClasses.length;
        const status = capacityUsed <= maxCapacity ? '✅' : '❌';
        console.log(`  ${day} ${time}: ${capacityUsed}/${maxCapacity} studios ${status}`);
        
        if (capacityUsed > maxCapacity) {
          console.error(`⚠️ CAPACITY VIOLATION: ${location} on ${day} at ${time} has ${capacityUsed} classes but only ${maxCapacity} studios!`);
        }
      }
    }
  }
  
  return optimizedClasses;
};

// Enhanced validation with override capability
export const validateTeacherHours = (
  scheduledClasses: ScheduledClass[],
  newClass: ScheduledClass
): { isValid: boolean; warning?: string; error?: string; canOverride?: boolean } => {
  const teacherName = `${newClass.teacherFirstName} ${newClass.teacherLastName}`;
  
  // Calculate current hours for this teacher
  const currentHours = scheduledClasses
    .filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName)
    .reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
  
  const newTotal = currentHours + parseFloat(newClass.duration);
  
  // Check new trainer restrictions
  const newTrainers = ['Kabir', 'Simonelle'];
  const isNewTrainer = newTrainers.some(name => teacherName.includes(name));
  const maxHours = isNewTrainer ? 10 : 15;
  
  // Check location restrictions (non-overridable)
  if (!isClassAllowedAtLocation(newClass.classFormat, newClass.location)) {
    return {
      isValid: false,
      error: `${newClass.classFormat} is not allowed at ${newClass.location}`,
      canOverride: false
    };
  }
  
  // Check studio capacity (non-overridable)
  if (!canAssignClassToStudio(scheduledClasses, {
    day: newClass.day,
    time: newClass.time,
    location: newClass.location,
    duration: newClass.duration
  })) {
    const maxCapacity = getMaxParallelClasses(newClass.location);
    return {
      isValid: false,
      error: `Studio capacity exceeded at ${newClass.location} on ${newClass.day} at ${newClass.time}. Maximum ${maxCapacity} parallel classes allowed.`,
      canOverride: false
    };
  }
  
  // Check new trainer format restrictions (non-overridable)
  if (isNewTrainer) {
    const allowedFormats = ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'];
    if (!allowedFormats.includes(newClass.classFormat)) {
      return {
        isValid: false,
        error: `${teacherName} can only teach: ${allowedFormats.join(', ')}`,
        canOverride: false
      };
    }
  }
  
  // Check hour limits (overridable)
  if (newTotal > maxHours) {
    return {
      isValid: true, // Allow override
      warning: `This would exceed ${teacherName}'s ${maxHours}-hour weekly limit (currently ${currentHours.toFixed(1)}h, would be ${newTotal.toFixed(1)}h)`,
      canOverride: true
    };
  } else if (newTotal > (maxHours - 3)) {
    return {
      isValid: true,
      warning: `${teacherName} would have ${newTotal.toFixed(1)}h this week (approaching ${maxHours}h limit)`,
      canOverride: false
    };
  }
  
  return { isValid: true };
};

// Rest of the existing utility functions remain the same...
const getLocationAverage = (csvData: ClassData[], location: string): number => {
  const locationData = csvData.filter(item => item.location === location && !isHostedClass(item.cleanedClass));
  if (locationData.length === 0) return 0;
  
  const totalParticipants = locationData.reduce((sum, item) => sum + item.participants, 0);
  return totalParticipants / locationData.length;
};

export const getTopPerformingClasses = (csvData: ClassData[], minAverage: number = 6, includeTeacher: boolean = true): TopPerformingClass[] => {
  // Always include the default top classes first
  const defaultClasses = getDefaultTopClasses();
  
  // Filter out hosted classes and apply location rules
  const validClasses = csvData.filter(item => 
    !isHostedClass(item.cleanedClass) && 
    isClassAllowedAtLocation(item.cleanedClass, item.location)
  );
  
  // Group by class format, location, day, time, and optionally teacher
  const classGroups = validClasses.reduce((acc, item) => {
    const key = includeTeacher 
      ? `${item.cleanedClass}-${item.location}-${item.dayOfWeek}-${item.classTime.slice(0, 5)}-${item.teacherName}`
      : `${item.cleanedClass}-${item.location}-${item.dayOfWeek}-${item.classTime.slice(0, 5)}`;
    
    if (!acc[key]) {
      acc[key] = {
        classFormat: item.cleanedClass,
        location: item.location,
        day: item.dayOfWeek,
        time: item.classTime.slice(0, 5),
        teacher: includeTeacher ? item.teacherName : '',
        totalParticipants: 0,
        totalRevenue: 0,
        count: 0
      };
    }
    
    acc[key].totalParticipants += item.participants;
    acc[key].totalRevenue += item.totalRevenue;
    acc[key].count += 1;
    
    return acc;
  }, {} as any);
  
  // Filter classes above minimum average and sort by performance
  const topClasses = Object.values(classGroups)
    .map((group: any) => ({
      classFormat: group.classFormat,
      location: group.location,
      day: group.day,
      time: group.time,
      teacher: group.teacher,
      avgParticipants: parseFloat((group.totalParticipants / group.count).toFixed(1)), // FIXED: 1 decimal place
      avgRevenue: parseFloat((group.totalRevenue / group.count).toFixed(1)),
      frequency: group.count
    }))
    .filter(cls => cls.frequency >= 2 && cls.avgParticipants >= minAverage)
    .sort((a, b) => {
      // Sort by average participants first, then by frequency
      const participantDiff = b.avgParticipants - a.avgParticipants;
      if (Math.abs(participantDiff) > 1) return participantDiff;
      return b.frequency - a.frequency;
    });
  
  // Convert default classes to TopPerformingClass format and merge
  const defaultTopClasses = defaultClasses.map(cls => ({
    classFormat: cls.classFormat,
    location: cls.location,
    day: cls.day,
    time: cls.time,
    teacher: cls.teacher,
    avgParticipants: cls.avgParticipants,
    avgRevenue: 0,
    frequency: 10 // High frequency to ensure they stay at top
  }));
  
  // Merge and deduplicate
  const allTopClasses = [...defaultTopClasses, ...topClasses];
  const uniqueClasses = allTopClasses.filter((cls, index, arr) => 
    arr.findIndex(c => 
      c.classFormat === cls.classFormat && 
      c.location === cls.location && 
      c.day === cls.day && 
      c.time === cls.time
    ) === index
  );
  
  return uniqueClasses;
};

export const getBestTeacherForClass = (
  csvData: ClassData[], 
  classFormat: string, 
  location: string, 
  day: string, 
  time: string
): string | null => {
  // Check if this is a default top class first
  const defaultClass = getDefaultTopClasses().find(cls => 
    cls.classFormat === classFormat &&
    cls.location === location &&
    cls.day === day &&
    cls.time === time
  );
  
  if (defaultClass) {
    return defaultClass.teacher;
  }
  
  const relevantClasses = csvData.filter(item => 
    item.cleanedClass === classFormat &&
    item.location === location &&
    item.dayOfWeek === day &&
    item.classTime.includes(time) &&
    !isHostedClass(item.cleanedClass) &&
    !item.teacherName.includes('Nishanth') &&
    !item.teacherName.includes('Saniya')
  );

  if (relevantClasses.length === 0) return null;

  // Group by teacher and calculate averages
  const teacherStats = relevantClasses.reduce((acc, item) => {
    if (!acc[item.teacherName]) {
      acc[item.teacherName] = { participants: 0, count: 0 };
    }
    acc[item.teacherName].participants += item.participants;
    acc[item.teacherName].count += 1;
    return acc;
  }, {} as any);

  // Find teacher with highest average
  const bestTeacher = Object.entries(teacherStats)
    .map(([teacher, stats]: [string, any]) => ({
      teacher,
      avgParticipants: stats.participants / stats.count
    }))
    .sort((a, b) => b.avgParticipants - a.avgParticipants)[0];

  return bestTeacher?.teacher || null;
};

export const getClassAverageForSlot = (
  csvData: ClassData[],
  classFormat: string,
  location: string,
  day: string,
  time: string,
  teacherName?: string
): { average: number; count: number } => {
  let relevantClasses = csvData.filter(item => 
    item.cleanedClass === classFormat &&
    item.location === location &&
    item.dayOfWeek === day &&
    item.classTime.includes(time) &&
    !isHostedClass(item.cleanedClass)
  );

  if (teacherName) {
    relevantClasses = relevantClasses.filter(item => item.teacherName === teacherName);
  }

  if (relevantClasses.length === 0) {
    return { average: 0, count: 0 };
  }

  const totalParticipants = relevantClasses.reduce((sum, item) => sum + item.participants, 0);
  return {
    average: parseFloat((totalParticipants / relevantClasses.length).toFixed(1)), // FIXED: 1 decimal place
    count: relevantClasses.length
  };
};

export const getTeacherSpecialties = (csvData: ClassData[]): Record<string, Array<{ classFormat: string; avgParticipants: number; classCount: number }>> => {
  const teacherStats: Record<string, Record<string, { participants: number; count: number }>> = {};

  csvData.forEach(item => {
    if (isHostedClass(item.cleanedClass)) return;
    if (item.teacherName.includes('Nishanth') || item.teacherName.includes('Saniya')) return;

    if (!teacherStats[item.teacherName]) {
      teacherStats[item.teacherName] = {};
    }

    if (!teacherStats[item.teacherName][item.cleanedClass]) {
      teacherStats[item.teacherName][item.cleanedClass] = { participants: 0, count: 0 };
    }

    teacherStats[item.teacherName][item.cleanedClass].participants += item.participants;
    teacherStats[item.teacherName][item.cleanedClass].count += 1;
  });

  // Convert to sorted specialties for each teacher
  const specialties: Record<string, Array<{ classFormat: string; avgParticipants: number; classCount: number }>> = {};

  Object.entries(teacherStats).forEach(([teacher, classes]) => {
    specialties[teacher] = Object.entries(classes)
      .map(([classFormat, stats]) => ({
        classFormat,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1)), // FIXED: 1 decimal place
        classCount: stats.count
      }))
      .sort((a, b) => {
        // Sort by class count first (experience), then by average participants
        if (b.classCount !== a.classCount) {
          return b.classCount - a.classCount;
        }
        return b.avgParticipants - a.avgParticipants;
      })
      .slice(0, 5); // Top 5 specialties
  });

  return specialties;
};

export const calculateTeacherHours = (scheduledClasses: ScheduledClass[]): TeacherHours => {
  return scheduledClasses.reduce((acc, cls) => {
    const teacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
    acc[teacherName] = parseFloat(((acc[teacherName] || 0) + parseFloat(cls.duration)).toFixed(1));
    return acc;
  }, {} as TeacherHours);
};

export const getClassCounts = (scheduledClasses: ScheduledClass[]) => {
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const counts = locations.reduce((acc, location) => {
    acc[location] = days.reduce((dayAcc, day) => {
      const dayClasses = scheduledClasses.filter(cls => cls.location === location && cls.day === day);
      dayAcc[day] = dayClasses.reduce((classAcc, cls) => {
        classAcc[cls.classFormat] = (classAcc[cls.classFormat] || 0) + 1;
        return classAcc;
      }, {} as any);
      return dayAcc;
    }, {} as any);
    return acc;
  }, {} as any);
  
  return counts;
};

export const getUniqueTeachers = (csvData: ClassData[], customTeachers: any[] = []): string[] => {
  const csvTeachers = csvData
    .map(item => item.teacherName)
    .filter(teacher => !teacher.includes('Nishanth') && !teacher.includes('Saniya'));
  const customTeacherNames = customTeachers.map(t => `${t.firstName} ${t.lastName}`);
  
  // Also include teachers from default top classes
  const defaultTopTeachers = getDefaultTopClasses().map(cls => cls.teacher);
  
  return [...new Set([...csvTeachers, ...customTeacherNames, ...defaultTopTeachers])].sort();
};

export const getClassFormatsForDay = (scheduledClasses: ScheduledClass[], day: string): Record<string, number> => {
  const dayClasses = scheduledClasses.filter(cls => cls.day === day);
  return dayClasses.reduce((acc, cls) => {
    acc[cls.classFormat] = (acc[cls.classFormat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

export const getTimeSlotsWithData = (csvData: ClassData[], location: string): Set<string> => {
  const timeSlotsWithData = new Set<string>();
  
  csvData
    .filter(item => item.location === location && !isHostedClass(item.cleanedClass))
    .forEach(item => {
      const timeSlot = item.classTime.slice(0, 5); // Extract HH:MM format
      timeSlotsWithData.add(timeSlot);
    });
  
  return timeSlotsWithData;
};

export const getClassesAtTimeSlot = (
  scheduledClasses: ScheduledClass[],
  day: string,
  time: string,
  location: string
): ScheduledClass[] => {
  return scheduledClasses.filter(cls => 
    cls.day === day && cls.time === time && cls.location === location
  );
};

const hasTimeSlotCapacity = (
  scheduledClasses: ScheduledClass[],
  day: string,
  time: string,
  location: string
): boolean => {
  const existingClasses = getClassesAtTimeSlot(scheduledClasses, day, time, location);
  const maxClasses = getMaxParallelClasses(location);
  return existingClasses.length < maxClasses;
};