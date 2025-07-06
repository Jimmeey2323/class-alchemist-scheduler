import React, { useState, useEffect } from 'react';
import { X, Clock, Users, MapPin, AlertTriangle, Brain, TrendingUp, Star, Zap, Target, Award, Calendar, User, Sparkles, Shield } from 'lucide-react';
import { ClassData, ScheduledClass, TeacherHours, AIRecommendation, CustomTeacher, TeacherAvailability } from '../types';
import { getClassDuration, validateTeacherHours, getClassAverageForSlot, getBestTeacherForClass, getUniqueTeachers, getClassFormatsForDay, isClassAllowedAtLocation } from '../utils/classUtils';
import { aiService } from '../utils/aiService';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: { day: string; time: string; location: string };
  csvData: ClassData[];
  teacherHours: TeacherHours;
  customTeachers: CustomTeacher[];
  teacherAvailability: TeacherAvailability;
  scheduledClasses: ScheduledClass[];
  onSchedule: (classData: ScheduledClass) => void;
  editingClass?: ScheduledClass | null;
  isDarkMode: boolean;
}

const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  selectedSlot,
  csvData,
  teacherHours,
  customTeachers,
  teacherAvailability,
  scheduledClasses,
  onSchedule,
  editingClass,
  isDarkMode
}) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedTime, setSelectedTime] = useState(selectedSlot.time);
  const [duration, setDuration] = useState('1');
  const [isPrivate, setIsPrivate] = useState(false);
  const [expectedParticipants, setExpectedParticipants] = useState<number>(0);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [coverTeacher, setCoverTeacher] = useState('');

  // Get unique values for dropdowns - filter by location rules
  const uniqueClasses = [...new Set(csvData
    .filter(item => 
      item.location === selectedSlot.location && 
      !item.cleanedClass.toLowerCase().includes('hosted') &&
      isClassAllowedAtLocation(item.cleanedClass, selectedSlot.location)
    )
    .map(item => item.cleanedClass)
  )];

  const allTeachers = getUniqueTeachers(csvData, customTeachers)
    .filter(teacher => !teacher.includes('Nishanth') && !teacher.includes('Saniya')); // Exclude inactive trainers

  const timeSlots = [
    '07:30', '07:45', '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00',
    '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00'
  ];

  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const newTrainers = ['Kabir', 'Simonelle'];
  const newTrainerFormats = ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'];

  // Get class formats for the selected day to show counts
  const dayClassFormats = getClassFormatsForDay(scheduledClasses, selectedSlot.day);

  // Populate form when editing a class
  useEffect(() => {
    if (editingClass) {
      setSelectedClass(editingClass.classFormat);
      setSelectedTeacher(`${editingClass.teacherFirstName} ${editingClass.teacherLastName}`);
      setSelectedTime(editingClass.time);
      setDuration(editingClass.duration);
      setIsPrivate(editingClass.isPrivate || false);
      setExpectedParticipants(editingClass.participants || 0);
      setCoverTeacher(editingClass.coverTeacher || '');
    } else {
      // Reset form for new class
      setSelectedClass('');
      setSelectedTeacher('');
      setSelectedTime(selectedSlot.time);
      setDuration('1');
      setIsPrivate(false);
      setExpectedParticipants(0);
      setCoverTeacher('');
    }
  }, [editingClass, selectedSlot]);

  // Load AI recommendations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAIRecommendations();
    }
  }, [isOpen, selectedSlot]);

  // Update duration when class is selected
  useEffect(() => {
    if (selectedClass) {
      const classDuration = getClassDuration(selectedClass);
      setDuration(classDuration);
      
      // Get class average and set expected participants
      const classAverage = getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime);
      setExpectedParticipants(Math.round(classAverage.average));
    }
  }, [selectedClass, selectedSlot, selectedTime, csvData]);

  const loadAIRecommendations = async () => {
    setIsLoadingAI(true);
    try {
      const recommendations = await aiService.generateRecommendations(
        csvData,
        selectedSlot.day,
        selectedSlot.time,
        selectedSlot.location
      );
      // Ensure priority is 1-5 scale
      const scaledRecommendations = recommendations.map(rec => ({
        ...rec,
        priority: Math.min(5, Math.max(1, Math.ceil(rec.priority / 2)))
      }));
      setAiRecommendations(scaledRecommendations);
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Get historic data for recommendations
  const getHistoricData = () => {
    const historicClasses = csvData.filter(
      item => item.location === selectedSlot.location && 
      item.dayOfWeek === selectedSlot.day && 
      item.classTime.includes(selectedTime.slice(0, 5))
    );
    
    if (historicClasses.length === 0) return null;
    
    const avgParticipants = historicClasses.reduce((sum, cls) => sum + cls.participants, 0) / historicClasses.length;
    const avgRevenue = historicClasses.reduce((sum, cls) => sum + cls.totalRevenue, 0) / historicClasses.length;
    const bestPerformingClass = historicClasses.sort((a, b) => b.participants - a.participants)[0];
    const classFormats = [...new Set(historicClasses.map(cls => cls.cleanedClass))];
    const teachers = [...new Set(historicClasses.map(cls => cls.teacherName))];
    
    // Extended metrics
    const peakParticipants = Math.max(...historicClasses.map(cls => cls.participants));
    const minParticipants = Math.min(...historicClasses.map(cls => cls.participants));
    const totalRevenue = historicClasses.reduce((sum, cls) => sum + cls.totalRevenue, 0);
    const checkedIn = historicClasses.reduce((sum, cls) => sum + cls.checkedIn, 0);
    const comps = historicClasses.reduce((sum, cls) => sum + cls.comps, 0);
    const lateCancellations = historicClasses.reduce((sum, cls) => sum + cls.lateCancellations, 0);
    const emptyClasses = historicClasses.filter(cls => cls.participants === 0).length;
    const fullClasses = historicClasses.filter(cls => cls.participants >= 15).length;
    
    return {
      count: historicClasses.length,
      avgParticipants: parseFloat(avgParticipants.toFixed(1)), // FIXED: 1 decimal place
      avgRevenue: Math.round(avgRevenue),
      bestClass: bestPerformingClass?.cleanedClass || 'N/A',
      bestTeacher: bestPerformingClass?.teacherName || 'N/A',
      classFormats,
      teachers,
      peakParticipants,
      minParticipants,
      totalRevenue,
      checkedIn,
      comps,
      lateCancellations,
      emptyClasses,
      fullClasses,
      successRate: historicClasses.filter(cls => cls.participants > avgParticipants).length / historicClasses.length,
      revenuePerParticipant: avgRevenue / avgParticipants,
      attendanceRate: checkedIn / historicClasses.reduce((sum, cls) => sum + cls.participants, 0),
      compRate: comps / historicClasses.reduce((sum, cls) => sum + cls.participants, 0)
    };
  };

  // Check if teacher is approaching hour limit
  const getTeacherValidation = (teacherName: string) => {
    if (!teacherName) return null;
    
    const mockClass: ScheduledClass = {
      id: 'temp',
      day: selectedSlot.day,
      time: selectedTime,
      location: selectedSlot.location,
      classFormat: selectedClass || 'Test Class',
      teacherFirstName: teacherName.split(' ')[0] || '',
      teacherLastName: teacherName.split(' ').slice(1).join(' ') || '',
      duration: duration
    };

    return validateTeacherHours(
      Object.entries(teacherHours).map(([name, hours]) => ({
        id: `existing-${name}`,
        teacherFirstName: name.split(' ')[0],
        teacherLastName: name.split(' ').slice(1).join(' '),
        duration: hours.toString(),
        day: 'Monday',
        time: '09:00',
        location: selectedSlot.location,
        classFormat: 'Existing'
      })),
      mockClass
    );
  };

  const handleAIRecommendationSelect = (recommendation: AIRecommendation) => {
    setSelectedClass(recommendation.classFormat);
    setSelectedTeacher(recommendation.teacher);
    setDuration(getClassDuration(recommendation.classFormat));
    setExpectedParticipants(recommendation.expectedParticipants);
    setActiveTab('form');
  };

  const handleSchedule = () => {
    if (!selectedClass || !selectedTeacher || !selectedTime) {
      alert('Please fill in all required fields');
      return;
    }

    // Check location-specific rules
    if (!isClassAllowedAtLocation(selectedClass, selectedSlot.location)) {
      if (selectedSlot.location === 'Supreme HQ, Bandra') {
        if (selectedClass.toLowerCase().includes('amped up') || selectedClass.toLowerCase().includes('hiit')) {
          alert('Amped Up and HIIT classes are not allowed at Supreme HQ. Please choose a different class format.');
          return;
        }
      } else {
        if (selectedClass.toLowerCase().includes('powercycle') || selectedClass.toLowerCase().includes('power cycle')) {
          alert('PowerCycle classes can only be scheduled at Supreme HQ. Please choose a different class format or location.');
          return;
        }
      }
    }

    // Check new trainer restrictions
    const isNewTrainer = newTrainers.some(name => selectedTeacher.includes(name));
    if (isNewTrainer && !newTrainerFormats.includes(selectedClass)) {
      alert(`${selectedTeacher} can only teach: ${newTrainerFormats.join(', ')}`);
      return;
    }

    // Check new trainer hour limits
    if (isNewTrainer) {
      const currentHours = teacherHours[selectedTeacher] || 0;
      if (currentHours + parseFloat(duration) > 10) {
        alert(`${selectedTeacher} cannot exceed 10 hours per week (currently ${currentHours}h)`);
        return;
      }
    }

    const teacher = allTeachers.find(t => t === selectedTeacher);
    const validation = getTeacherValidation(selectedTeacher);
    
    if (validation && !validation.isValid) {
      alert(validation.error);
      return;
    }

    if (validation?.warning) {
      const proceed = confirm(`${validation.warning}\n\nDo you want to proceed?`);
      if (!proceed) return;
    }

    // Check if selected teacher is optimal for this class
    const bestTeacher = getBestTeacherForClass(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime);
    const classAverage = getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime);
    const teacherClassAverage = getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime, selectedTeacher);

    if (bestTeacher && bestTeacher !== selectedTeacher && teacherClassAverage.average < classAverage.average) {
      const proceed = confirm(
        `Warning: ${selectedTeacher} has an average of ${teacherClassAverage.average.toFixed(1)} participants for this class, ` +
        `while ${bestTeacher} has ${classAverage.average.toFixed(1)} participants. ` +
        `Consider assigning ${bestTeacher} for better performance.\n\nDo you want to proceed with ${selectedTeacher}?`
      );
      if (!proceed) return;
    }

    const scheduledClass: ScheduledClass = {
      id: editingClass ? editingClass.id : `${selectedSlot.day}-${selectedTime}-${selectedSlot.location}-${Date.now()}`,
      day: selectedSlot.day,
      time: selectedTime,
      location: selectedSlot.location,
      classFormat: selectedClass,
      teacherFirstName: selectedTeacher.split(' ')[0] || '',
      teacherLastName: selectedTeacher.split(' ').slice(1).join(' ') || '',
      duration: duration,
      participants: expectedParticipants || undefined,
      isPrivate: isPrivate,
      coverTeacher: coverTeacher || undefined
    };

    onSchedule(scheduledClass);
  };

  const getTeacherAvatar = (teacherName: string) => {
    const initials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase();
    const isPriority = priorityTeachers.some(name => teacherName.includes(name));
    const isNew = newTrainers.some(name => teacherName.includes(name));
    const teacher = customTeachers.find(t => `${t.firstName} ${t.lastName}` === teacherName);
    
    return (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm relative ${
        isPriority ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        isNew ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
        teacher?.isNew ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
        'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}>
        {initials}
        {isPriority && (
          <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
        )}
        {isNew && (
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-green-400" />
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const modalBg = isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
    : 'bg-gradient-to-br from-white to-gray-50';
  
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  const historicData = getHistoricData();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${modalBg} rounded-2xl shadow-2xl max-w-7xl w-full m-4 max-h-[95vh] overflow-y-auto border ${borderColor}`}>
        <div className={`flex items-center justify-between p-6 border-b ${borderColor} bg-gradient-to-r from-purple-600/20 to-pink-600/20`}>
          <div>
            <h2 className={`text-xl font-bold ${textPrimary}`}>
              {editingClass ? 'Edit Class' : 'Schedule Class'}
            </h2>
            <p className={textSecondary}>AI-powered class scheduling with smart recommendations</p>
          </div>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textPrimary} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Slot Info */}
        <div className={`p-6 border-b ${borderColor}`}>
          <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-4 rounded-xl border border-indigo-500/30">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-indigo-400 mr-2" />
                <span className={`font-medium ${textPrimary}`}>{selectedSlot.day}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-indigo-400 mr-2" />
                <span className={`font-medium ${textPrimary}`}>{selectedSlot.time}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-indigo-400 mr-2" />
                <span className={`font-medium ${textPrimary}`}>{selectedSlot.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderColor}`}>
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'form'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <Target className="h-5 w-5 inline mr-2" />
            Class Details
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <Brain className="h-5 w-5 inline mr-2" />
            AI Recommendations
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <TrendingUp className="h-5 w-5 inline mr-2" />
            Historic Analytics
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form */}
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
                    Class Format *
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="">Select a class format</option>
                    {uniqueClasses.map(className => {
                      const dayCount = dayClassFormats[className] || 0;
                      return (
                        <option key={className} value={className}>
                          {className} ({dayCount} scheduled today)
                        </option>
                      );
                    })}
                  </select>
                  {selectedClass && (
                    <div className="mt-2 text-sm text-blue-400">
                      Class average: {getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime).average.toFixed(1)} participants
                      ({getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime).count} historic classes)
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
                    Time Slot *
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    {timeSlots.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
                    Instructor *
                  </label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="">Select an instructor</option>
                    {allTeachers.map(teacher => {
                      const currentHours = teacherHours[teacher] || 0;
                      const isPriority = priorityTeachers.some(name => teacher.includes(name));
                      const isNew = newTrainers.some(name => teacher.includes(name));
                      return (
                        <option key={teacher} value={teacher}>
                          {teacher} ({currentHours.toFixed(1)}h) {isPriority ? '⭐' : ''} {isNew ? '🆕' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {selectedTeacher && selectedClass && (
                    <div className="mt-2 text-sm">
                      <div className="text-green-400">
                        Teacher average for this class: {getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime, selectedTeacher).average.toFixed(1)} participants
                      </div>
                      {getBestTeacherForClass(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime) !== selectedTeacher && (
                        <div className="text-yellow-400">
                          Best teacher for this slot: {getBestTeacherForClass(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
                      Duration
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    >
                      <option value="0.5">30 minutes</option>
                      <option value="0.75">45 minutes</option>
                      <option value="1">1 hour</option>
                      <option value="1.5">1.5 hours</option>
                      <option value="2">2 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
                      Expected Participants
                    </label>
                    <input
                      type="number"
                      value={expectedParticipants}
                      onChange={(e) => setExpectedParticipants(parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      placeholder="0"
                      min="0"
                      max="30"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
                    Cover/Contingency Teacher
                  </label>
                  <select
                    value={coverTeacher}
                    onChange={(e) => setCoverTeacher(e.target.value)}
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="">Select cover teacher (optional)</option>
                    {allTeachers.filter(t => t !== selectedTeacher).map(teacher => (
                      <option key={teacher} value={teacher}>
                        {teacher}
                      </option>
                    ))}
                  </select>
                  <p className={`text-xs ${textSecondary} mt-1`}>
                    Backup teacher in case primary instructor is unavailable
                  </p>
                </div>

                <div>
                  <label className={`flex items-center text-sm ${textSecondary}`}>
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="mr-3 rounded"
                    />
                    Private Class Session
                  </label>
                  <p className={`text-xs ${textSecondary} mt-1 ml-6`}>
                    Mark this as a private or specialized session
                  </p>
                </div>

                {/* Teacher Validation Warning */}
                {selectedTeacher && getTeacherValidation(selectedTeacher) && (
                  <div className={`p-4 rounded-xl flex items-center border ${
                    getTeacherValidation(selectedTeacher)?.isValid === false
                      ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  }`}>
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="text-sm">
                      {getTeacherValidation(selectedTeacher)?.error || getTeacherValidation(selectedTeacher)?.warning}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column - Teacher Info & Quick Stats */}
              <div className="space-y-6">
                {selectedTeacher && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
                    <h3 className="font-semibold text-purple-300 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Teacher Profile
                    </h3>
                    <div className="flex items-center mb-4">
                      {getTeacherAvatar(selectedTeacher)}
                      <div className="ml-4">
                        <div className={`font-medium ${textPrimary}`}>{selectedTeacher}</div>
                        <div className={`text-sm ${textSecondary}`}>
                          {(teacherHours[selectedTeacher] || 0).toFixed(1)} hours this week
                        </div>
                      </div>
                    </div>
                    
                    {/* Teacher specialties if custom teacher */}
                    {customTeachers.find(t => `${t.firstName} ${t.lastName}` === selectedTeacher)?.specialties && (
                      <div className="mb-4">
                        <div className="text-sm text-purple-300 mb-2">Specialties:</div>
                        <div className="flex flex-wrap gap-2">
                          {customTeachers.find(t => `${t.firstName} ${t.lastName}` === selectedTeacher)?.specialties?.map(specialty => (
                            <span key={specialty} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teacher availability */}
                    {teacherAvailability[selectedTeacher] && (
                      <div className={`p-3 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'} rounded-lg`}>
                        <div className={`text-sm ${textSecondary}`}>
                          {teacherAvailability[selectedTeacher].isOnLeave ? (
                            <span className="text-red-300">Currently on leave</span>
                          ) : teacherAvailability[selectedTeacher].unavailableDates.length > 0 ? (
                            <span className="text-yellow-300">
                              {teacherAvailability[selectedTeacher].unavailableDates.length} unavailable dates
                            </span>
                          ) : (
                            <span className="text-green-300">Available</span>
                          )}
                        </div>
                      </div>
                    )}

                    {coverTeacher && (
                      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="flex items-center text-blue-300">
                          <Shield className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Cover Teacher: {coverTeacher}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Stats */}
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-6 rounded-xl border border-blue-500/20">
                  <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Quick Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${textPrimary}`}>{historicData?.avgParticipants || 0}</div>
                      <div className="text-xs text-blue-300">Avg Participants</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${textPrimary}`}>₹{Math.round((historicData?.avgRevenue || 0) / 1000)}K</div>
                      <div className="text-xs text-blue-300">Avg Revenue</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${textPrimary}`}>{historicData?.count || 0}</div>
                      <div className="text-xs text-blue-300">Historic Classes</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${textPrimary}`}>{Math.round((historicData?.successRate || 0) * 100)}%</div>
                      <div className="text-xs text-blue-300">Success Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-purple-300 flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    AI-Powered Recommendations for {selectedSlot.day} {selectedSlot.time}
                  </h3>
                  {isLoadingAI && (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-transparent"></div>
                  )}
                </div>
                
                {aiRecommendations.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {aiRecommendations.slice(0, 6).map((rec, index) => (
                      <div
                        key={index}
                        onClick={() => handleAIRecommendationSelect(rec)}
                        className={`p-4 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} rounded-xl border border-purple-500/30 cursor-pointer hover:border-purple-400 hover:${isDarkMode ? 'bg-gray-800/70' : 'bg-white'} transition-all duration-200 group`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`font-medium ${textPrimary}`}>{rec.classFormat}</div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-green-400">
                              <Users className="h-4 w-4 mr-1" />
                              <span className="text-sm">{rec.expectedParticipants}</span>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rec.priority >= 4 ? 'bg-green-500/20 text-green-300' :
                              rec.priority >= 3 ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              Priority {rec.priority}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm ${textSecondary} mb-2`}>
                          <strong>Teacher:</strong> {rec.teacher}
                        </div>
                        <div className="text-xs text-purple-300 mb-3">
                          {rec.reasoning}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-xs ${textSecondary}`}>
                            Confidence: {(rec.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-green-400">
                            ₹{rec.expectedRevenue} expected
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isLoadingAI ? (
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 text-purple-400 mx-auto mb-3 opacity-50" />
                    <div className="text-sm text-purple-300">
                      Configure AI settings to get personalized recommendations
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-pulse">
                      <Brain className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                      <div className="text-sm text-purple-300">
                        Analyzing data for smart recommendations...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && historicData && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-6 rounded-xl border border-blue-500/30">
                <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Extended Historic Analytics - {selectedSlot.day} {selectedSlot.time}
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className={`p-4 bg-blue-500/10 rounded-lg`}>
                      <div className="text-sm text-blue-300 mb-2">Performance Overview</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className={`${textPrimary} font-medium`}>{historicData.count}</div>
                          <div className={textSecondary}>Classes Held</div>
                        </div>
                        <div>
                          <div className="text-green-400 font-medium">{historicData.avgParticipants}</div>
                          <div className={textSecondary}>Avg Participants</div>
                        </div>
                        <div>
                          <div className="text-blue-400 font-medium">₹{Math.round(historicData.avgRevenue / 1000)}K</div>
                          <div className={textSecondary}>Avg Revenue</div>
                        </div>
                        <div>
                          <div className="text-purple-400 font-medium">{historicData.peakParticipants}</div>
                          <div className={textSecondary}>Peak Attendance</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <div className="text-sm text-green-300 mb-2">Attendance Metrics</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className={`${textPrimary} font-medium`}>{historicData.checkedIn}</div>
                          <div className={textSecondary}>Total Check-ins</div>
                        </div>
                        <div>
                          <div className="text-green-400 font-medium">{(historicData.attendanceRate * 100).toFixed(1)}%</div>
                          <div className={textSecondary}>Attendance Rate</div>
                        </div>
                        <div>
                          <div className="text-red-400 font-medium">{historicData.emptyClasses}</div>
                          <div className={textSecondary}>Empty Classes</div>
                        </div>
                        <div>
                          <div className="text-blue-400 font-medium">{historicData.fullClasses}</div>
                          <div className={textSecondary}>Full Classes (15+)</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-500/10 rounded-lg">
                      <div className="text-sm text-purple-300 mb-2">Revenue Analytics</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className={`${textPrimary} font-medium`}>₹{Math.round(historicData.totalRevenue / 1000)}K</div>
                          <div className={textSecondary}>Total Revenue</div>
                        </div>
                        <div>
                          <div className="text-purple-400 font-medium">₹{Math.round(historicData.revenuePerParticipant)}</div>
                          <div className={textSecondary}>Per Participant</div>
                        </div>
                        <div>
                          <div className="text-orange-400 font-medium">{historicData.comps}</div>
                          <div className={textSecondary}>Comped Classes</div>
                        </div>
                        <div>
                          <div className="text-yellow-400 font-medium">{(historicData.compRate * 100).toFixed(1)}%</div>
                          <div className={textSecondary}>Comp Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-orange-500/10 rounded-lg">
                      <div className="text-sm text-orange-300 mb-2">Operational Metrics</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className={`${textPrimary} font-medium`}>{historicData.lateCancellations}</div>
                          <div className={textSecondary}>Late Cancellations</div>
                        </div>
                        <div>
                          <div className="text-orange-400 font-medium">{Math.round(historicData.successRate * 100)}%</div>
                          <div className={textSecondary}>Success Rate</div>
                        </div>
                        <div>
                          <div className="text-red-400 font-medium">{historicData.minParticipants}</div>
                          <div className={textSecondary}>Min Attendance</div>
                        </div>
                        <div>
                          <div className="text-green-400 font-medium">{historicData.peakParticipants}</div>
                          <div className={textSecondary}>Max Attendance</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-indigo-500/10 rounded-lg">
                      <div className="text-sm text-indigo-300 mb-2">Best Performers</div>
                      <div className="space-y-2">
                        <div>
                          <div className={`text-sm ${textSecondary}`}>Top Class:</div>
                          <div className={`font-medium ${textPrimary}`}>{historicData.bestClass}</div>
                        </div>
                        <div>
                          <div className={`text-sm ${textSecondary}`}>Best Teacher:</div>
                          <div className={`font-medium ${textPrimary}`}>{historicData.bestTeacher}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-teal-500/10 rounded-lg">
                      <div className="text-sm text-teal-300 mb-2">Class Variety</div>
                      <div className="space-y-1">
                        {historicData.classFormats.slice(0, 5).map((format, index) => (
                          <div key={format} className="flex justify-between text-sm">
                            <span className={textPrimary}>{format}</span>
                            <span className="text-teal-300">#{index + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-500/10 rounded-lg">
                  <div className="text-sm text-indigo-300 mb-2">AI Insights & Recommendations</div>
                  <ul className={`text-sm ${textSecondary} space-y-1`}>
                    <li>• Best time slot performance: {selectedSlot.time} shows {historicData.successRate > 0.7 ? 'strong' : 'moderate'} historic success</li>
                    <li>• Recommended class format: {historicData.bestClass} (highest average attendance)</li>
                    <li>• Suggested teacher: {historicData.bestTeacher} (best performance at this time)</li>
                    <li>• Expected participants: {historicData.avgParticipants} (based on {historicData.count} historic classes)</li>
                    <li>• Revenue optimization: Target ₹{Math.round(historicData.revenuePerParticipant)} per participant</li>
                    <li>• Risk factors: {historicData.emptyClasses > 0 ? `${historicData.emptyClasses} empty classes in history` : 'Low risk slot'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={`flex justify-end space-x-4 pt-6 border-t ${borderColor} mt-8`}>
            <button
              onClick={onClose}
              className={`px-6 py-3 ${textSecondary} hover:${textPrimary} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={!selectedClass || !selectedTeacher || !selectedTime}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingClass ? 'Update Class' : 'Schedule Class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassModal;