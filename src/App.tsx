import React, { useState, useEffect } from 'react';
import { Upload, Calendar, Brain, Users, Clock, AlertTriangle, Settings, Star, Lock, Unlock, Plus, Download, Eye, Printer, RotateCcw, RotateCw, Trash2, Filter, BarChart3, TrendingUp, MapPin, UserPlus, Sun, Moon, Zap, Target, Sparkles } from 'lucide-react';
import CSVUpload from './components/CSVUpload';
import WeeklyCalendar from './components/WeeklyCalendar';
import ClassModal from './components/ClassModal';
import TeacherHourTracker from './components/TeacherHourTracker';
import SmartOptimizer from './components/SmartOptimizer';
import AISettings from './components/AISettings';
import ExportModal from './components/ExportModal';
import StudioSettings from './components/StudioSettings';
import MonthlyView from './components/MonthlyView';
import YearlyView from './components/YearlyView';
import AnalyticsView from './components/AnalyticsView';
import DailyAIOptimizer from './components/DailyAIOptimizer';
import EnhancedOptimizerModal from './components/EnhancedOptimizerModal';
import { ClassData, ScheduledClass, TeacherHours, CustomTeacher, TeacherAvailability } from './types';
import { getTopPerformingClasses, getClassDuration, calculateTeacherHours, getClassCounts, validateTeacherHours, getTeacherSpecialties, getClassAverageForSlot, getBestTeacherForClass, generateIntelligentSchedule, getDefaultTopClasses } from './utils/classUtils';
import { aiService } from './utils/aiService';
import { saveCSVData, loadCSVData, saveScheduledClasses, loadScheduledClasses, saveCustomTeachers, loadCustomTeachers, saveTeacherAvailability, loadTeacherAvailability } from './utils/dataStorage';

function App() {
  const [csvData, setCsvData] = useState<ClassData[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('calendar');
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduledClass[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string; location: string } | null>(null);
  const [editingClass, setEditingClass] = useState<ScheduledClass | null>(null);
  const [teacherHours, setTeacherHours] = useState<TeacherHours>({});
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [showEnhancedOptimizer, setShowEnhancedOptimizer] = useState(false);
  const [showDailyOptimizer, setShowDailyOptimizer] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStudioSettings, setShowStudioSettings] = useState(false);
  const [showTeacherCards, setShowTeacherCards] = useState(false);
  const [isPopulatingTopClasses, setIsPopulatingTopClasses] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lockedClasses, setLockedClasses] = useState<Set<string>>(new Set());
  const [lockedTeachers, setLockedTeachers] = useState<Set<string>>(new Set());
  const [classesLocked, setClassesLocked] = useState(false);
  const [teachersLocked, setTeachersLocked] = useState(false);
  const [customTeachers, setCustomTeachers] = useState<CustomTeacher[]>([]);
  const [teacherAvailability, setTeacherAvailability] = useState<TeacherAvailability>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [optimizationIteration, setOptimizationIteration] = useState(0);
  const [filterOptions, setFilterOptions] = useState({
    showTopPerformers: true,
    showPrivateClasses: true,
    showRegularClasses: true,
    selectedTeacher: '',
    selectedClassFormat: ''
  });

  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];

  const views = [
    { id: 'calendar', name: 'Weekly Calendar', icon: Calendar },
    { id: 'monthly', name: 'Monthly View', icon: BarChart3 },
    { id: 'yearly', name: 'Yearly View', icon: TrendingUp },
    { id: 'analytics', name: 'Analytics', icon: Eye }
  ];

  // Load data on app initialization
  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider');
    const savedKey = localStorage.getItem('ai_key');
    const savedEndpoint = localStorage.getItem('ai_endpoint');
    const savedTheme = localStorage.getItem('theme');

    // Load AI settings
    if (savedProvider && savedKey && savedEndpoint) {
      aiService.setProvider({
        name: savedProvider,
        key: savedKey,
        endpoint: savedEndpoint
      });
    }

    // Load theme
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }

    // Load persistent data
    const savedCsvData = loadCSVData();
    const savedScheduledClasses = loadScheduledClasses();
    const savedCustomTeachers = loadCustomTeachers();
    const savedTeacherAvailability = loadTeacherAvailability();

    if (savedCsvData.length > 0) {
      setCsvData(savedCsvData);
      const firstLocation = locations.find(loc => 
        savedCsvData.some((item: ClassData) => item.location === loc)
      ) || locations[0];
      setActiveTab(firstLocation);
    }

    if (savedScheduledClasses.length > 0) {
      setScheduledClasses(savedScheduledClasses);
      setTeacherHours(calculateTeacherHours(savedScheduledClasses));
    }

    if (savedCustomTeachers.length > 0) {
      setCustomTeachers(savedCustomTeachers);
    }

    if (Object.keys(savedTeacherAvailability).length > 0) {
      setTeacherAvailability(savedTeacherAvailability);
    }
  }, []);

  // Auto-populate default top classes on page load
  useEffect(() => {
    if (csvData.length > 0 && scheduledClasses.length === 0) {
      handleAutoPopulateTopClasses(csvData);
    }
  }, [csvData]);

  // Auto-save data when it changes
  useEffect(() => {
    if (csvData.length > 0) {
      saveCSVData(csvData);
    }
  }, [csvData]);

  useEffect(() => {
    saveScheduledClasses(scheduledClasses);
  }, [scheduledClasses]);

  useEffect(() => {
    saveCustomTeachers(customTeachers);
  }, [customTeachers]);

  useEffect(() => {
    saveTeacherAvailability(teacherAvailability);
  }, [teacherAvailability]);

  // Save to history when schedule changes
  useEffect(() => {
    if (scheduledClasses.length > 0) {
      const newHistory = scheduleHistory.slice(0, historyIndex + 1);
      newHistory.push([...scheduledClasses]);
      setScheduleHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [scheduledClasses]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const handleDataUpload = (data: ClassData[]) => {
    console.log('Data uploaded to App:', data.length, 'records');
    setCsvData(data);
    if (data.length > 0) {
      const firstLocation = locations.find(loc => 
        data.some(item => item.location === loc)
      ) || locations[0];
      setActiveTab(firstLocation);
    }
  };

  const handleSlotClick = (day: string, time: string, location: string) => {
    setSelectedSlot({ day, time, location });
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleClassEdit = (classData: ScheduledClass) => {
    setEditingClass(classData);
    setSelectedSlot({ day: classData.day, time: classData.time, location: classData.location });
    setIsModalOpen(true);
  };

  const handleClassSchedule = (classData: ScheduledClass) => {
    if (editingClass) {
      // Update existing class
      setScheduledClasses(prev => 
        prev.map(cls => cls.id === editingClass.id ? classData : cls)
      );
    } else {
      // Validate teacher hours before scheduling
      const validation = validateTeacherHours(scheduledClasses, classData);
      
      if (!validation.isValid && !validation.canOverride) {
        alert(validation.error);
        return;
      }

      // Handle override scenario
      if (validation.canOverride && validation.warning) {
        const proceed = confirm(`${validation.warning}\n\nDo you want to override this limit and proceed anyway?`);
        if (!proceed) return;
      } else if (validation.warning && !validation.canOverride) {
        const proceed = confirm(`${validation.warning}\n\nDo you want to proceed?`);
        if (!proceed) return;
      }

      setScheduledClasses(prev => [...prev, classData]);
    }
    
    // Update teacher hours
    setTeacherHours(calculateTeacherHours(scheduledClasses));
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const handleOptimizedSchedule = (optimizedClasses: ScheduledClass[]) => {
    // Validate all teacher hours in optimized schedule
    const teacherHoursCheck: Record<string, number> = {};
    const invalidTeachers: string[] = [];

    optimizedClasses.forEach(cls => {
      const teacherKey = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      teacherHoursCheck[teacherKey] = parseFloat(((teacherHoursCheck[teacherKey] || 0) + parseFloat(cls.duration || '1')).toFixed(1));
    });

    Object.entries(teacherHoursCheck).forEach(([teacher, hours]) => {
      if (hours > 15) {
        invalidTeachers.push(`${teacher}: ${hours.toFixed(1)}h`);
      }
    });

    if (invalidTeachers.length > 0) {
      const proceed = confirm(`The following teachers would exceed 15 hours:\n${invalidTeachers.join('\n')}\n\nDo you want to override these limits and apply the schedule anyway?`);
      if (!proceed) return;
    }

    setScheduledClasses(optimizedClasses);
    setTeacherHours(teacherHoursCheck);
    setShowOptimizer(false);
    setShowEnhancedOptimizer(false);
    setShowDailyOptimizer(false);
  };

  const handleAutoPopulateTopClasses = async (data: ClassData[] = csvData) => {
    // Validate that data is an array
    if (!Array.isArray(data)) {
      alert('Invalid data format. Please ensure CSV data is properly loaded.');
      return;
    }

    if (data.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsPopulatingTopClasses(true);

    try {
      // Filter classes with average > 5.0 participants
      const topPerformingClasses = getTopPerformingClasses(data, 5.0, true);
      const newScheduledClasses: ScheduledClass[] = [];
      const teacherHoursTracker: Record<string, number> = {};

      for (const topClass of topPerformingClasses.slice(0, 50)) { // Limit to top 50
        // Check if teacher can take more hours
        const teacherName = topClass.teacher;
        const currentHours = teacherHoursTracker[teacherName] || 0;
        const classDuration = parseFloat(getClassDuration(topClass.classFormat));

        if (currentHours + classDuration <= 15) {
          const scheduledClass: ScheduledClass = {
            id: `top-class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            day: topClass.day,
            time: topClass.time,
            location: topClass.location,
            classFormat: topClass.classFormat,
            teacherFirstName: topClass.teacher.split(' ')[0] || '',
            teacherLastName: topClass.teacher.split(' ').slice(1).join(' ') || '',
            duration: getClassDuration(topClass.classFormat),
            participants: Math.round(topClass.avgParticipants),
            revenue: Math.round(topClass.avgRevenue),
            isTopPerformer: true,
            isLocked: false
          };

          newScheduledClasses.push(scheduledClass);
          teacherHoursTracker[teacherName] = currentHours + classDuration;
        }
      }

      console.log('Top classes scheduled:', newScheduledClasses.length);

      if (newScheduledClasses.length > 0) {
        setScheduledClasses(newScheduledClasses);
        setTeacherHours(calculateTeacherHours(newScheduledClasses));
        
        alert(`Successfully populated ${newScheduledClasses.length} top performing classes (average > 5.0 participants)!`);
      } else {
        alert('No classes could be scheduled due to teacher hour constraints');
      }

    } catch (error) {
      console.error('Error populating top classes:', error);
      alert('Error populating top classes. Please try again.');
    } finally {
      setIsPopulatingTopClasses(false);
    }
  };

  const handleAutoOptimize = async () => {
    if (csvData.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsOptimizing(true);

    try {
      // Generate comprehensive AI-optimized schedule with balanced approach
      const optimizedSchedule = await generateIntelligentSchedule(csvData, customTeachers, {
        prioritizeTopPerformers: true,
        balanceShifts: true,
        optimizeTeacherHours: true,
        respectTimeRestrictions: true,
        minimizeTrainersPerShift: true,
        iteration: optimizationIteration,
        optimizationType: 'balanced' // Default to balanced optimization
      });
      
      console.log('Generated comprehensive optimized schedule:', optimizedSchedule.length, 'classes');
      
      // Validate the schedule meets all constraints
      const teacherHoursCheck: Record<string, number> = {};
      const invalidTeachers: string[] = [];

      // Check teacher hours
      optimizedSchedule.forEach(cls => {
        const teacherKey = `${cls.teacherFirstName} ${cls.teacherLastName}`;
        teacherHoursCheck[teacherKey] = parseFloat(((teacherHoursCheck[teacherKey] || 0) + parseFloat(cls.duration || '1')).toFixed(1));
      });

      Object.entries(teacherHoursCheck).forEach(([teacher, hours]) => {
        if (hours > 15) {
          invalidTeachers.push(`${teacher}: ${hours.toFixed(1)}h`);
        }
      });

      if (invalidTeachers.length > 0) {
        const proceed = confirm(`Warning: The following teachers exceed 15 hours:\n${invalidTeachers.join('\n')}\n\nDo you want to override these limits and apply the schedule anyway?`);
        if (!proceed) {
          setIsOptimizing(false);
          return;
        }
      }

      setOptimizationIteration(prev => prev + 1);
      setScheduledClasses(optimizedSchedule);
      setTeacherHours(calculateTeacherHours(optimizedSchedule));

      // Show optimization results
      const totalClasses = optimizedSchedule.length;
      const totalTeachers = Object.keys(teacherHoursCheck).length;
      const avgUtilization = Object.values(teacherHoursCheck).reduce((sum, hours) => sum + hours, 0) / totalTeachers / 15;
      
      alert(`AI Optimization Complete! 🎯

📊 Results:
• ${totalClasses} classes scheduled
• ${totalTeachers} teachers utilized
• ${(avgUtilization * 100).toFixed(1)}% average teacher utilization
• Iteration ${optimizationIteration + 1}

✅ All scheduling rules enforced:
• Classes filtered by average > 5.0 participants
• Peak hours prioritized
• Teacher hour limits respected (with override option)
• Location-specific formats applied
• Day-wise guidelines followed
• Shift balance maintained`);

    } catch (error) {
      console.error('Error optimizing schedule:', error);
      alert('Error optimizing schedule. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setScheduledClasses(scheduleHistory[historyIndex - 1]);
      setTeacherHours(calculateTeacherHours(scheduleHistory[historyIndex - 1]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < scheduleHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setScheduledClasses(scheduleHistory[historyIndex + 1]);
      setTeacherHours(calculateTeacherHours(scheduleHistory[historyIndex + 1]));
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all scheduled classes?')) {
      setScheduledClasses([]);
      setTeacherHours({});
      setLockedClasses(new Set());
      setLockedTeachers(new Set());
      setClassesLocked(false);
      setTeachersLocked(false);
    }
  };

  const toggleClassLock = () => {
    setClassesLocked(!classesLocked);
    if (!classesLocked) {
      const classIds = new Set(scheduledClasses.map(cls => cls.id));
      setLockedClasses(classIds);
    } else {
      setLockedClasses(new Set());
    }
  };

  const toggleTeacherLock = () => {
    setTeachersLocked(!teachersLocked);
    if (!teachersLocked) {
      const teacherNames = new Set(scheduledClasses.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`));
      setLockedTeachers(teacherNames);
    } else {
      setLockedTeachers(new Set());
    }
  };

  const classCounts = getClassCounts(scheduledClasses);

  // Show upload screen if no data
  if (csvData.length === 0) {
    return <CSVUpload onDataUpload={handleDataUpload} isDarkMode={isDarkMode} />;
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'monthly':
        return <MonthlyView scheduledClasses={scheduledClasses} csvData={csvData} />;
      case 'yearly':
        return <YearlyView scheduledClasses={scheduledClasses} csvData={csvData} />;
      case 'analytics':
        return <AnalyticsView scheduledClasses={scheduledClasses} csvData={csvData} />;
      default:
        return (
          <>
            {/* Location Tabs */}
            <div className={`flex space-x-1 mb-6 ${isDarkMode ? 'bg-gray-800/30' : 'bg-white/90 shadow-lg'} backdrop-blur-xl rounded-2xl p-1 border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-300'}`}>
              {locations.map((location) => (
                <button
                  key={location}
                  onClick={() => setActiveTab(location)}
                  className={`flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === location
                      ? isDarkMode
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                        : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg transform scale-105'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {location.split(',')[0]}
                  </div>
                </button>
              ))}
            </div>

            {/* Teacher Hours Tracker - Collapsible */}
            <div className="mb-6">
              <TeacherHourTracker 
                teacherHours={teacherHours} 
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Weekly Calendar */}
            {activeTab && (
              <WeeklyCalendar
                location={activeTab}
                csvData={csvData}
                scheduledClasses={scheduledClasses.filter(cls => {
                  if (!filterOptions.showTopPerformers && cls.isTopPerformer) return false;
                  if (!filterOptions.showPrivateClasses && cls.isPrivate) return false;
                  if (!filterOptions.showRegularClasses && !cls.isTopPerformer && !cls.isPrivate) return false;
                  if (filterOptions.selectedTeacher && `${cls.teacherFirstName} ${cls.teacherLastName}` !== filterOptions.selectedTeacher) return false;
                  if (filterOptions.selectedClassFormat && cls.classFormat !== filterOptions.selectedClassFormat) return false;
                  return true;
                })}
                onSlotClick={handleSlotClick}
                onClassEdit={handleClassEdit}
                lockedClasses={lockedClasses}
                isDarkMode={isDarkMode}
              />
            )}
          </>
        );
    }
  };

  const themeClasses = isDarkMode 
    ? 'min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
    : 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50';

  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={themeClasses}>
      <div className="container mx-auto px-4 py-6">
        {/* Sleek Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="relative mr-4">
              <Sparkles className="h-12 w-12 text-purple-400" />
              <div className="absolute inset-0 h-12 w-12 bg-purple-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${textPrimary} bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                Smart Class Scheduler
              </h1>
              <p className={textSecondary}>AI-powered optimization for fitness studios</p>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-800/50 text-yellow-400 hover:bg-gray-700/50' 
                : 'bg-white/80 text-gray-600 hover:bg-white shadow-lg border border-gray-200'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Action Buttons Grid */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {/* History Controls */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700' 
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-lg border border-gray-300'
              }`}
              title="Undo"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Undo</span>
            </button>

            <button
              onClick={handleRedo}
              disabled={historyIndex >= scheduleHistory.length - 1}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700' 
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-lg border border-gray-300'
              }`}
              title="Redo"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Redo</span>
            </button>

            <button
              onClick={handleClearAll}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                isDarkMode
                  ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-lg'
              }`}
              title="Clear All"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Clear</span>
            </button>

            <button
              onClick={() => handleAutoPopulateTopClasses(csvData)}
              disabled={isPopulatingTopClasses}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
              }`}
              title="Populate classes with average > 5.0 participants"
            >
              {isPopulatingTopClasses ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Star className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">Top Classes</span>
            </button>
            
            <button
              onClick={handleAutoOptimize}
              disabled={isOptimizing}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              }`}
              title="Comprehensive AI optimization with all rules and override capability"
            >
              {isOptimizing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">AI Optimize</span>
            </button>

            <button
              onClick={() => setShowEnhancedOptimizer(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
              }`}
              title="Enhanced AI optimizer with multiple strategies (Revenue, Attendance, Balanced)"
            >
              <Target className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Enhanced AI</span>
            </button>

            <button
              onClick={() => setShowDailyOptimizer(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              <Zap className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Daily AI</span>
            </button>

            <button
              onClick={toggleClassLock}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                classesLocked 
                  ? isDarkMode
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }`}
            >
              {classesLocked ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              <span className="text-sm font-medium">{classesLocked ? 'Unlock' : 'Lock'} Classes</span>
            </button>

            <button
              onClick={toggleTeacherLock}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                teachersLocked 
                  ? isDarkMode
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }`}
            >
              {teachersLocked ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              <span className="text-sm font-medium">{teachersLocked ? 'Unlock' : 'Lock'} Teachers</span>
            </button>
            
            <button
              onClick={() => setShowOptimizer(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
              }`}
            >
              <Target className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Optimizer</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
              }`}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Export</span>
            </button>

            <button
              onClick={() => setShowStudioSettings(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode
                  ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white hover:from-teal-700 hover:to-green-700'
                  : 'bg-gradient-to-r from-teal-500 to-green-500 text-white hover:from-teal-600 hover:to-green-600'
              }`}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Studio</span>
            </button>
            
            <button
              onClick={() => setShowAISettings(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">AI Settings</span>
            </button>
            
            <button
              onClick={() => setCsvData([])}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">New CSV</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className={`flex space-x-1 mb-6 ${isDarkMode ? 'bg-gray-800/30' : 'bg-white/90 shadow-lg'} backdrop-blur-xl rounded-2xl p-1 border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-300'}`}>
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeView === view.id
                  ? isDarkMode
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg transform scale-105'
                  : isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <view.icon className="h-5 w-5 mr-2" />
              {view.name}
            </button>
          ))}
        </div>

        {/* Main Content */}
        {renderMainContent()}

        {/* Class Scheduling Modal */}
        {isModalOpen && selectedSlot && (
          <ClassModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingClass(null);
            }}
            selectedSlot={selectedSlot}
            editingClass={editingClass}
            csvData={csvData}
            teacherHours={teacherHours}
            customTeachers={customTeachers}
            teacherAvailability={teacherAvailability}
            scheduledClasses={scheduledClasses}
            onSchedule={handleClassSchedule}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Smart Optimizer Modal */}
        {showOptimizer && (
          <SmartOptimizer
            isOpen={showOptimizer}
            onClose={() => setShowOptimizer(false)}
            csvData={csvData}
            currentSchedule={scheduledClasses}
            onOptimize={handleOptimizedSchedule}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Enhanced Optimizer Modal */}
        {showEnhancedOptimizer && (
          <EnhancedOptimizerModal
            isOpen={showEnhancedOptimizer}
            onClose={() => setShowEnhancedOptimizer(false)}
            csvData={csvData}
            currentSchedule={scheduledClasses}
            onOptimize={handleOptimizedSchedule}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Daily AI Optimizer Modal */}
        {showDailyOptimizer && (
          <DailyAIOptimizer
            isOpen={showDailyOptimizer}
            onClose={() => setShowDailyOptimizer(false)}
            csvData={csvData}
            currentSchedule={scheduledClasses}
            onOptimize={handleOptimizedSchedule}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          scheduledClasses={scheduledClasses}
          location={activeTab}
        />

        {/* Studio Settings Modal */}
        <StudioSettings
          isOpen={showStudioSettings}
          onClose={() => setShowStudioSettings(false)}
          customTeachers={customTeachers}
          onUpdateTeachers={setCustomTeachers}
          teacherAvailability={teacherAvailability}
          onUpdateAvailability={setTeacherAvailability}
          isDarkMode={isDarkMode}
        />

        {/* AI Settings Modal */}
        <AISettings
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export default App;
