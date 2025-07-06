import React, { useState } from 'react';
import { Clock, Users, TrendingUp, Star, Lock, Zap, Award, Calendar, Target, ChevronDown, ChevronUp, Filter, Eye, Edit, ChevronLeft, ChevronRight, AlertTriangle, Shield } from 'lucide-react';
import { ClassData, ScheduledClass } from '../types';
import { getClassAverageForSlot, getTimeSlotsWithData, getClassesAtTimeSlot, getAvailableTimeSlots, getRestrictedTimeSlots, isTimeRestricted } from '../utils/classUtils';
import DayViewModal from './DayViewModal';

interface WeeklyCalendarProps {
  location: string;
  csvData: ClassData[];
  scheduledClasses: ScheduledClass[];
  onSlotClick: (day: string, time: string, location: string) => void;
  onClassEdit: (classData: ScheduledClass) => void;
  lockedClasses?: Set<string>;
  isDarkMode: boolean;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  location,
  csvData,
  scheduledClasses,
  onSlotClick,
  onClassEdit,
  lockedClasses = new Set(),
  isDarkMode
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [minParticipants, setMinParticipants] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDayView, setShowDayView] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState<Record<string, number>>({});
  const [showRestrictedSlots, setShowRestrictedSlots] = useState(false); // Collapsed by default

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Get all time slots including restricted ones
  const availableTimeSlots = getAvailableTimeSlots('Monday'); // Same for all days
  const restrictedTimeSlots = getRestrictedTimeSlots();
  const allTimeSlots = [...availableTimeSlots, ...restrictedTimeSlots].sort();

  // Filter time slots based on collapsed state
  const visibleTimeSlots = showRestrictedSlots 
    ? allTimeSlots 
    : availableTimeSlots;

  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const timeSlotsWithData = getTimeSlotsWithData(csvData, location);

  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    setShowDayView(true);
  };

  const handleClassClick = (e: React.MouseEvent, scheduledClass: ScheduledClass) => {
    e.stopPropagation();
    onClassEdit(scheduledClass);
  };

  const navigateSlot = (day: string, time: string, direction: 'prev' | 'next') => {
    const slotKey = `${day}-${time}`;
    const classes = getScheduledClasses(day, time);
    const currentIndex = currentSlotIndex[slotKey] || 0;
    
    if (direction === 'prev') {
      setCurrentSlotIndex(prev => ({
        ...prev,
        [slotKey]: Math.max(0, currentIndex - 1)
      }));
    } else {
      setCurrentSlotIndex(prev => ({
        ...prev,
        [slotKey]: Math.min(classes.length - 1, currentIndex + 1)
      }));
    }
  };

  const getHistoricData = (day: string, time: string) => {
    // Only show historic data for time slots that actually have data
    if (!timeSlotsWithData.has(time)) return null;

    const historicClasses = csvData.filter(
      item => item.location === location && 
      item.dayOfWeek === day && 
      item.classTime.includes(time.slice(0, 5)) &&
      !item.cleanedClass.toLowerCase().includes('hosted')
    );
    
    if (historicClasses.length === 0) return null;
    
    const avgParticipants = historicClasses.reduce((sum, cls) => sum + cls.participants, 0) / historicClasses.length;
    const avgRevenue = historicClasses.reduce((sum, cls) => sum + cls.totalRevenue, 0) / historicClasses.length;
    const peakParticipants = Math.max(...historicClasses.map(cls => cls.participants));
    const checkedIn = historicClasses.reduce((sum, cls) => sum + cls.checkedIn, 0);
    const emptyClasses = historicClasses.filter(cls => cls.participants === 0).length;
    const lateCancellations = historicClasses.reduce((sum, cls) => sum + cls.lateCancellations, 0);
    const comps = historicClasses.reduce((sum, cls) => sum + cls.comps, 0);
    const totalRevenue = historicClasses.reduce((sum, cls) => sum + cls.totalRevenue, 0);
    
    // Get top 3 teachers for this slot
    const teacherStats = historicClasses.reduce((acc, cls) => {
      if (!acc[cls.teacherName]) {
        acc[cls.teacherName] = { participants: 0, count: 0 };
      }
      acc[cls.teacherName].participants += cls.participants;
      acc[cls.teacherName].count += 1;
      return acc;
    }, {} as any);

    const topTeachers = Object.entries(teacherStats)
      .map(([teacher, stats]: [string, any]) => ({
        teacher,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1))
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants)
      .slice(0, 3);

    // Get next best class formats
    const formatStats = historicClasses.reduce((acc, cls) => {
      if (!acc[cls.cleanedClass]) {
        acc[cls.cleanedClass] = { participants: 0, count: 0 };
      }
      acc[cls.cleanedClass].participants += cls.participants;
      acc[cls.cleanedClass].count += 1;
      return acc;
    }, {} as any);

    const topFormats = Object.entries(formatStats)
      .map(([format, stats]: [string, any]) => ({
        format,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1))
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants)
      .slice(0, 3);
    
    return {
      count: historicClasses.length,
      avgParticipants: parseFloat(avgParticipants.toFixed(1)),
      avgRevenue: parseFloat(avgRevenue.toFixed(1)),
      peakParticipants,
      checkedIn,
      emptyClasses,
      lateCancellations,
      compsPercentage: parseFloat((historicClasses.length > 0 ? (comps / historicClasses.length * 100) : 0).toFixed(1)),
      totalRevenue: parseFloat(totalRevenue.toFixed(1)),
      topTeachers,
      topFormats,
      popularClass: historicClasses.sort((a, b) => b.participants - a.participants)[0]?.cleanedClass || 'N/A',
      bestTeacher: historicClasses.sort((a, b) => b.participants - a.participants)[0]?.teacherName || 'N/A'
    };
  };

  const getScheduledClasses = (day: string, time: string) => {
    return getClassesAtTimeSlot(scheduledClasses, day, time, location);
  };

  const getTeacherAvatar = (teacherName: string) => {
    const initials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase();
    const isPriority = priorityTeachers.some(name => teacherName.includes(name));
    
    return (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
        isPriority ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}>
        {initials}
      </div>
    );
  };

  const renderCell = (day: string, time: string) => {
    const historicData = getHistoricData(day, time);
    const scheduledClassesInSlot = getScheduledClasses(day, time);
    const slotKey = `${day}-${time}`;
    const currentIndex = currentSlotIndex[slotKey] || 0;
    const currentClass = scheduledClassesInSlot[currentIndex];
    const isRestricted = isTimeRestricted(time, day);
    const hasPrivateClass = scheduledClassesInSlot.some(cls => cls.isPrivate);
    
    // Apply filters
    if (historicData && historicData.avgParticipants < minParticipants) {
      return (
        <div
          key={`${day}-${time}`}
          className={`relative h-32 border cursor-pointer transition-all duration-300 ${
            isDarkMode ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
          }`}
        />
      );
    }
    
    return (
      <div
        key={`${day}-${time}`}
        onClick={() => {
          if (scheduledClassesInSlot.length === 0) {
            onSlotClick(day, time, location);
          }
        }}
        className={`relative h-32 border cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group ${
          scheduledClassesInSlot.length > 0
            ? isDarkMode 
              ? 'bg-gradient-to-br from-green-400/20 to-emerald-500/20 hover:from-green-400/30 hover:to-emerald-500/30 border-green-400/50'
              : 'bg-gradient-to-br from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 border-green-300'
            : isRestricted
              ? isDarkMode
                ? 'bg-gradient-to-br from-red-400/10 to-orange-500/10 hover:from-red-400/20 hover:to-orange-500/20 border-red-400/30'
                : 'bg-gradient-to-br from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 border-red-200'
              : historicData 
                ? isDarkMode
                  ? 'bg-gradient-to-br from-blue-400/10 to-cyan-500/10 hover:from-blue-400/20 hover:to-cyan-500/20 border-blue-400/30 border-gray-600' 
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200'
                : isDarkMode
                  ? 'bg-gray-800/30 hover:bg-gray-700/50 border-gray-600'
                  : 'bg-white hover:bg-gray-50 border-gray-300'
        }`}
      >
        {/* Restricted Time Indicator */}
        {isRestricted && scheduledClassesInSlot.length === 0 && (
          <div className="absolute top-1 left-1 z-10">
            <div className={`flex items-center px-2 py-1 rounded text-xs ${
              isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600'
            }`}>
              <Shield className="h-3 w-3 mr-1" />
              <span>Private Only</span>
            </div>
          </div>
        )}

        {scheduledClassesInSlot.length > 0 && (
          <div className="absolute inset-0 p-2 overflow-hidden">
            {/* Navigation for multiple classes */}
            {scheduledClassesInSlot.length > 1 && (
              <div className="absolute top-1 right-1 flex space-x-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateSlot(day, time, 'prev');
                  }}
                  disabled={currentIndex === 0}
                  className="p-1 bg-gray-800/70 text-white rounded hover:bg-gray-700/70 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="px-2 py-1 bg-gray-800/70 text-white text-xs rounded">
                  {currentIndex + 1}/{scheduledClassesInSlot.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateSlot(day, time, 'next');
                  }}
                  disabled={currentIndex === scheduledClassesInSlot.length - 1}
                  className="p-1 bg-gray-800/70 text-white rounded hover:bg-gray-700/70 disabled:opacity-50"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Current class display */}
            {currentClass && (
              <div
                onClick={(e) => handleClassClick(e, currentClass)}
                className={`p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 h-full ${
                  currentClass.isTopPerformer 
                    ? isDarkMode
                      ? 'bg-yellow-400/20 border-yellow-400 hover:bg-yellow-400/30'
                      : 'bg-yellow-100 border-yellow-500 hover:bg-yellow-200'
                    : currentClass.isPrivate 
                    ? isDarkMode
                      ? 'bg-purple-400/20 border-purple-400 hover:bg-purple-400/30'
                      : 'bg-purple-100 border-purple-500 hover:bg-purple-200'
                    : isDarkMode
                      ? 'bg-green-400/20 border-green-400 hover:bg-green-400/30'
                      : 'bg-green-100 border-green-500 hover:bg-green-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs font-semibold truncate flex-1 ${
                    currentClass.isTopPerformer 
                      ? isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
                      : currentClass.isPrivate 
                      ? isDarkMode ? 'text-purple-200' : 'text-purple-700'
                      : isDarkMode ? 'text-green-200' : 'text-green-700'
                  }`}>
                    {currentClass.classFormat}
                  </div>
                  <div className="flex items-center space-x-1 ml-1">
                    {currentClass.isTopPerformer && <Star className="h-3 w-3 text-yellow-400" />}
                    {lockedClasses.has(currentClass.id) && <Lock className="h-3 w-3 text-red-400" />}
                    {currentClass.isPrivate && <Shield className="h-3 w-3 text-purple-400" />}
                    <Edit className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    {getTeacherAvatar(`${currentClass.teacherFirstName} ${currentClass.teacherLastName}`)}
                    <div className={`ml-2 text-xs truncate ${
                      currentClass.isTopPerformer 
                        ? isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                        : currentClass.isPrivate 
                        ? isDarkMode ? 'text-purple-300' : 'text-purple-600'
                        : isDarkMode ? 'text-green-300' : 'text-green-600'
                    }`}>
                      {currentClass.teacherFirstName}
                    </div>
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {parseFloat(currentClass.duration) * 60}min
                  </div>
                </div>
                
                {currentClass.participants && (
                  <div className={`text-xs flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Users className="h-3 w-3 mr-1" />
                    {currentClass.participants}
                  </div>
                )}

                {currentClass.coverTeacher && (
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    Cover: {currentClass.coverTeacher.split(' ')[0]}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Show restricted time message for empty restricted slots */}
        {isRestricted && scheduledClassesInSlot.length === 0 && (
          <div className="absolute inset-0 p-2 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
              <div className={`text-xs font-medium ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>Restricted</div>
              <div className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>Private Only</div>
            </div>
          </div>
        )}
        
        {/* Show historic data for available slots */}
        {historicData && scheduledClassesInSlot.length === 0 && !isRestricted && (
          <div className="absolute inset-0 p-2 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                {historicData.count} classes
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {historicData.avgParticipants} avg
              </div>
              <div className="flex justify-center mt-1">
                <div className={`w-2 h-2 rounded-full opacity-60 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced Hover Tooltip */}
        {(historicData || scheduledClassesInSlot.length > 0 || isRestricted) && (
          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-96 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} ${isDarkMode ? 'text-white' : 'text-gray-900'} text-xs rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-2xl`}>
            {scheduledClassesInSlot.length > 0 ? (
              <div>
                <div className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Zap className="h-4 w-4 mr-2 text-blue-400" />
                  Scheduled Classes ({scheduledClassesInSlot.length})
                </div>
                
                <div className="space-y-3">
                  {scheduledClassesInSlot.map((cls, index) => (
                    <div key={cls.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Class:</div>
                          <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cls.classFormat}</div>
                        </div>
                        <div>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Duration:</div>
                          <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{parseFloat(cls.duration) * 60} mins</div>
                        </div>
                        <div>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Teacher:</div>
                          <div className={`font-medium flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {getTeacherAvatar(`${cls.teacherFirstName} ${cls.teacherLastName}`)}
                            <span className="ml-2">{cls.teacherFirstName} {cls.teacherLastName}</span>
                          </div>
                        </div>
                        {cls.participants && (
                          <div>
                            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Expected:</div>
                            <div className="text-green-400 font-medium">{cls.participants} participants</div>
                          </div>
                        )}
                      </div>

                      {cls.isTopPerformer && (
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <div className="text-yellow-300 text-xs font-medium flex items-center">
                            <Award className="h-3 w-3 mr-1" />
                            Top performing class
                          </div>
                        </div>
                      )}

                      {cls.isPrivate && (
                        <div className="p-2 bg-purple-500/20 rounded-lg mt-2">
                          <div className="text-purple-300 text-xs font-medium flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            Private session
                          </div>
                        </div>
                      )}

                      {cls.coverTeacher && (
                        <div className="p-2 bg-blue-500/20 rounded-lg mt-2">
                          <div className="text-blue-300 text-xs font-medium">
                            Cover Teacher: {cls.coverTeacher}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : isRestricted ? (
              <div>
                <div className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                  Restricted Time Slot
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <div className="text-red-300 text-sm mb-2">
                    <strong>12:00 PM - 5:00 PM Restriction</strong>
                  </div>
                  <div className="text-red-200 text-xs space-y-1">
                    <div>• Only private classes allowed during this time</div>
                    <div>• Regular group classes are restricted</div>
                    <div>• Click to schedule a private session</div>
                  </div>
                </div>
              </div>
            ) : historicData ? (
              <div>
                <div className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-400" />
                  Historic Performance Analysis
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Classes Held:</div>
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{historicData.count}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Avg Participants:</div>
                    <div className="text-green-400 font-medium">{historicData.avgParticipants}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Check-ins:</div>
                    <div className="text-blue-400 font-medium">{historicData.checkedIn}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Empty Classes:</div>
                    <div className="text-red-400 font-medium">{historicData.emptyClasses}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Late Cancellations:</div>
                    <div className="text-orange-400 font-medium">{historicData.lateCancellations}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Comped %:</div>
                    <div className="text-purple-400 font-medium">{historicData.compsPercentage}%</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Total Revenue:</div>
                    <div className="text-green-400 font-medium">₹{Math.round(historicData.totalRevenue / 1000)}K</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Peak Attendance:</div>
                    <div className="text-blue-400 font-medium">{historicData.peakParticipants}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <div className="text-blue-300 text-xs font-medium mb-1">Top 3 Teachers:</div>
                    {historicData.topTeachers.map((teacher, index) => (
                      <div key={index} className="text-blue-200 text-xs">
                        {index + 1}. {teacher.teacher} ({teacher.avgParticipants} avg)
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <div className="text-green-300 text-xs font-medium mb-1">Best Class Formats:</div>
                    {historicData.topFormats.map((format, index) => (
                      <div key={index} className="text-green-200 text-xs">
                        {index + 1}. {format.format} ({format.avgParticipants} avg)
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <div className="text-green-300 text-xs flex items-center">
                    <Target className="h-3 w-3 mr-1" />
                    Click to schedule a class for this time slot
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // Calculate summary stats for this location
  const locationClasses = scheduledClasses.filter(cls => cls.location === location);
  const totalClasses = locationClasses.length;
  const topPerformers = locationClasses.filter(cls => cls.isTopPerformer).length;
  const privateClasses = locationClasses.filter(cls => cls.isPrivate).length;
  const totalParticipants = locationClasses.reduce((sum, cls) => sum + (cls.participants || 0), 0);
  const avgParticipants = totalClasses > 0 ? parseFloat((totalParticipants / totalClasses).toFixed(1)) : 0;

  // Get class mix by day
  const classMixByDay = days.reduce((acc, day) => {
    const dayClasses = locationClasses.filter(cls => cls.day === day);
    acc[day] = dayClasses.reduce((formatAcc, cls) => {
      formatAcc[cls.classFormat] = (formatAcc[cls.classFormat] || 0) + 1;
      return formatAcc;
    }, {} as Record<string, number>);
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const cardBg = isDarkMode 
    ? 'bg-gradient-to-br from-gray-800/50 to-gray-700/50' 
    : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-600' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <>
      <div className={`${cardBg} backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border ${borderColor}`}>
        <div className={`p-6 border-b ${borderColor} ${
          isDarkMode 
            ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30' 
            : 'bg-gradient-to-r from-blue-900 to-indigo-900'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? textPrimary : 'text-white'}`}>{location}</h2>
              <p className={isDarkMode ? textSecondary : 'text-blue-100'}>Weekly Schedule Overview</p>
            </div>
            
            {/* Location Summary Stats */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className={`p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-blue-500/20 border-blue-500/30' 
                  : 'bg-white/10 border-white/20 backdrop-blur-sm'
              }`}>
                <div className={`text-lg font-bold ${isDarkMode ? textPrimary : 'text-white'}`}>{totalClasses}</div>
                <div className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-100'}`}>Total Classes</div>
              </div>
              <div className={`p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-yellow-500/20 border-yellow-500/30' 
                  : 'bg-white/10 border-white/20 backdrop-blur-sm'
              }`}>
                <div className={`text-lg font-bold ${isDarkMode ? textPrimary : 'text-white'}`}>{topPerformers}</div>
                <div className={`text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-100'}`}>Top Performers</div>
              </div>
              <div className={`p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-purple-500/20 border-purple-500/30' 
                  : 'bg-white/10 border-white/20 backdrop-blur-sm'
              }`}>
                <div className={`text-lg font-bold ${isDarkMode ? textPrimary : 'text-white'}`}>{privateClasses}</div>
                <div className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-100'}`}>Private Classes</div>
              </div>
              <div className={`p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-white/10 border-white/20 backdrop-blur-sm'
              }`}>
                <div className={`text-lg font-bold ${isDarkMode ? textPrimary : 'text-white'}`}>{avgParticipants}</div>
                <div className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-100'}`}>Avg Participants</div>
              </div>
            </div>
          </div>

          {/* Restricted Time Slots Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowRestrictedSlots(!showRestrictedSlots)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700/50 hover:bg-gray-600/50' 
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              <Shield className="h-4 w-4 mr-2 text-red-400" />
              <span className={isDarkMode ? textPrimary : 'text-white'}>
                {showRestrictedSlots ? 'Hide' : 'Show'} Restricted Time Slots
              </span>
              {showRestrictedSlots ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </button>
          </div>

          {/* Class Mix Display */}
          <div className="mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700/50 hover:bg-gray-600/50' 
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              <Filter className="h-4 w-4 mr-2 text-blue-400" />
              <span className={isDarkMode ? textPrimary : 'text-white'}>Class Mix & Filters</span>
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </button>
            
            {showFilters && (
              <div className={`mt-4 p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800/30 border-gray-600' 
                  : 'bg-white/10 border-white/20 backdrop-blur-sm'
              }`}>
                {/* Class Mix by Day */}
                <div className="mb-6">
                  <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? textSecondary : 'text-blue-100'}`}>Class Mix by Day</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {days.map(day => (
                      <div key={day} className={`p-3 rounded-lg border ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600' 
                          : 'bg-white/10 border-white/20 backdrop-blur-sm'
                      }`}>
                        <div className={`text-sm font-medium mb-2 ${isDarkMode ? textPrimary : 'text-white'}`}>{day.slice(0, 3)}</div>
                        <div className="space-y-1">
                          {Object.entries(classMixByDay[day] || {}).map(([format, count]) => (
                            <div key={format} className="text-xs">
                              <span className={isDarkMode ? textSecondary : 'text-blue-200'}>{format.split(' ').slice(-1)[0]}:</span>
                              <span className={`ml-1 ${isDarkMode ? textPrimary : 'text-white'}`}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? textSecondary : 'text-blue-100'}`}>
                      Date Range
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white' 
                          : 'bg-white/20 border-white/30 text-white backdrop-blur-sm placeholder-white/70'
                      }`}
                    >
                      <option value="all">All Time</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="last90">Last 90 Days</option>
                      <option value="last180">Last 6 Months</option>
                      <option value="lastyear">Last Year</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? textSecondary : 'text-blue-100'}`}>
                      Min Participants
                    </label>
                    <input
                      type="number"
                      value={minParticipants}
                      onChange={(e) => setMinParticipants(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white' 
                          : 'bg-white/20 border-white/30 text-white backdrop-blur-sm placeholder-white/70'
                      }`}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setDateRange('all');
                        setMinParticipants(0);
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-blue-800 text-white hover:bg-blue-900'
                      }`}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded mr-2"></div>
              <span className={isDarkMode ? textSecondary : 'text-blue-100'}>Top Performer</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded mr-2"></div>
              <span className={isDarkMode ? textSecondary : 'text-blue-100'}>Private Class</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded mr-2"></div>
              <span className={isDarkMode ? textSecondary : 'text-blue-100'}>Regular Class</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-orange-500 rounded mr-2"></div>
              <span className={isDarkMode ? textSecondary : 'text-blue-100'}>Restricted (Private Only)</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded mr-2 ${isDarkMode ? 'bg-gradient-to-r from-blue-400 to-cyan-500' : 'bg-blue-300'}`}></div>
              <span className={isDarkMode ? textSecondary : 'text-blue-100'}>Historic Data</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded mr-2 ${isDarkMode ? 'bg-gray-600' : 'bg-blue-200'}`}></div>
              <span className={isDarkMode ? textSecondary : 'text-blue-100'}>Available</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header */}
            <div className="grid grid-cols-8 bg-gray-800/50">
              <div className={`p-4 text-sm font-semibold border-b ${borderColor} ${
                isDarkMode 
                  ? 'bg-gray-800/70 text-gray-300' 
                  : 'bg-blue-900 text-blue-100'
              }`}>
                <Clock className="h-4 w-4 inline mr-2" />
                Time
              </div>
              {days.map(day => (
                <div 
                  key={day} 
                  onClick={() => handleDayClick(day)}
                  className={`p-4 text-sm font-semibold border-b ${borderColor} text-center cursor-pointer transition-colors group ${
                    isDarkMode 
                      ? 'bg-gray-800/70 hover:bg-gray-700/70 text-gray-300' 
                      : 'bg-blue-900 hover:bg-blue-800 text-blue-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span>{day}</span>
                    <Eye className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-blue-200'
                  }`}>
                    {scheduledClasses.filter(cls => cls.location === location && cls.day === day).length} classes
                  </div>
                </div>
              ))}
            </div>
            
            {/* Time slots */}
            {visibleTimeSlots.map(time => (
              <div key={time} className={`grid grid-cols-8 transition-colors ${
                isDarkMode ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'
              }`}>
                <div className={`p-3 text-sm font-medium border-b ${borderColor} flex items-center ${
                  isDarkMode 
                    ? 'bg-gray-800/30 text-gray-300' 
                    : 'bg-gray-50 text-gray-700'
                }`}>
                  <div>
                    <div className="font-semibold flex items-center">
                      {time}
                      {isTimeRestricted(time, 'Monday') && (
                        <AlertTriangle className="h-3 w-3 ml-2 text-red-400" />
                      )}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {scheduledClasses.filter(cls => cls.location === location && cls.time === time).length} scheduled
                    </div>
                  </div>
                </div>
                {days.map(day => renderCell(day, time))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day View Modal */}
      <DayViewModal
        isOpen={showDayView}
        onClose={() => setShowDayView(false)}
        day={selectedDay || ''}
        location={location}
        csvData={csvData}
        scheduledClasses={scheduledClasses}
        onSlotClick={onSlotClick}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default WeeklyCalendar;
