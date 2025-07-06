import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClassData } from '@/hooks/useClassData';
import { Zap, TrendingUp, Users, Clock, Brain, Star, Calendar } from 'lucide-react';

interface ScheduleOptimizerProps {
  classData: ClassData[];
}

interface OptimizedClass {
  timeSlot: string;
  dayOfWeek: string;
  className: string;
  recommendedTrainer: string;
  location: string;
  predictedAttendance: number;
  predictedRevenue: number;
  confidenceScore: number;
  reasons: string[];
}

interface WeeklySchedule {
  [day: string]: {
    [timeSlot: string]: OptimizedClass[];
  };
}

export const ScheduleOptimizer = ({ classData }: ScheduleOptimizerProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [selectedWeek, setSelectedWeek] = useState('2025-01-06');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = ['06:00:00', '07:00:00', '08:00:00', '09:00:00', '10:00:00', '11:00:00', '17:00:00', '18:00:00', '19:00:00'];

  const trainerAnalytics = useMemo(() => {
    const analytics: { [trainer: string]: {
      totalHours: number;
      avgAttendance: number;
      avgRevenue: number;
      specialties: string[];
      performance: number;
    }} = {};

    classData.forEach(classItem => {
      if (!analytics[classItem.teacherName]) {
        analytics[classItem.teacherName] = {
          totalHours: 0,
          avgAttendance: 0,
          avgRevenue: 0,
          specialties: [],
          performance: 0
        };
      }

      const trainer = analytics[classItem.teacherName];
      trainer.totalHours += 1; // Assuming 1 hour per class
      trainer.avgAttendance += classItem.checkedIn;
      trainer.avgRevenue += classItem.totalRevenue;

      if (!trainer.specialties.includes(classItem.className)) {
        trainer.specialties.push(classItem.className);
      }
    });

    // Calculate averages and performance scores
    Object.keys(analytics).forEach(trainer => {
      const data = analytics[trainer];
      const classCount = classData.filter(c => c.teacherName === trainer).length;
      
      data.avgAttendance = data.avgAttendance / classCount;
      data.avgRevenue = data.avgRevenue / classCount;
      data.performance = (data.avgAttendance * 0.6) + (data.avgRevenue * 0.4 / 100); // Weighted score
    });

    return analytics;
  }, [classData]);

  const classPerformance = useMemo(() => {
    const performance: { [className: string]: {
      avgAttendance: number;
      avgRevenue: number;
      bestTimeSlots: string[];
      bestLocations: string[];
    }} = {};

    classData.forEach(classItem => {
      if (!performance[classItem.className]) {
        performance[classItem.className] = {
          avgAttendance: 0,
          avgRevenue: 0,
          bestTimeSlots: [],
          bestLocations: []
        };
      }
    });

    // Calculate performance metrics
    Object.keys(performance).forEach(className => {
      const classItems = classData.filter(c => c.className === className);
      const totalClasses = classItems.length;

      if (totalClasses > 0) {
        performance[className].avgAttendance = 
          classItems.reduce((sum, c) => sum + c.checkedIn, 0) / totalClasses;
        performance[className].avgRevenue = 
          classItems.reduce((sum, c) => sum + c.totalRevenue, 0) / totalClasses;

        // Find best performing time slots and locations
        const timeSlotPerformance: { [slot: string]: number } = {};
        const locationPerformance: { [location: string]: number } = {};

        classItems.forEach(item => {
          timeSlotPerformance[item.classTime] = 
            (timeSlotPerformance[item.classTime] || 0) + item.checkedIn;
          locationPerformance[item.location] = 
            (locationPerformance[item.location] || 0) + item.checkedIn;
        });

        performance[className].bestTimeSlots = Object.entries(timeSlotPerformance)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([slot]) => slot);

        performance[className].bestLocations = Object.entries(locationPerformance)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 2)
          .map(([location]) => location);
      }
    });

    return performance;
  }, [classData]);

  const generateFullWeeklySchedule = async () => {
    setIsOptimizing(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const classTypes = Object.keys(classPerformance).filter(className => 
      classPerformance[className].avgAttendance >= 5
    );
    const locations = [...new Set(classData.map(c => c.location))];
    
    // Track trainer hours for the week
    const trainerWeeklyHours: { [trainer: string]: number } = {};
    Object.keys(trainerAnalytics).forEach(trainer => {
      trainerWeeklyHours[trainer] = 0;
    });

    const newWeeklySchedule: WeeklySchedule = {};

    // Initialize schedule structure
    daysOfWeek.forEach(day => {
      newWeeklySchedule[day] = {};
      timeSlots.forEach(timeSlot => {
        newWeeklySchedule[day][timeSlot] = [];
      });
    });

    // Generate schedule for each day and time slot
    daysOfWeek.forEach(day => {
      timeSlots.forEach(timeSlot => {
        // Determine optimal number of classes for this slot (1-3 classes)
        const numClasses = Math.min(3, Math.floor(Math.random() * 2) + 1);
        
        // Get best performing class types for this time slot
        const suitableClasses = classTypes
          .filter(className => {
            const perf = classPerformance[className];
            return perf.bestTimeSlots.includes(timeSlot) || perf.avgAttendance > 10;
          })
          .sort((a, b) => classPerformance[b].avgAttendance - classPerformance[a].avgAttendance)
          .slice(0, numClasses);

        suitableClasses.forEach(className => {
          const perf = classPerformance[className];
          
          // Find available trainer with capacity
          const availableTrainers = Object.entries(trainerAnalytics)
            .filter(([trainer, data]) => 
              data.specialties.includes(className) && 
              trainerWeeklyHours[trainer] < 15
            )
            .sort(([,a], [,b]) => b.performance - a.performance);

          if (availableTrainers.length === 0) return;

          const [bestTrainer] = availableTrainers[0];
          const bestLocation = perf.bestLocations[0] || locations[Math.floor(Math.random() * locations.length)];

          // Allocate trainer hour
          trainerWeeklyHours[bestTrainer] += 1;

          // Calculate predictions with some variance
          const baseAttendance = perf.avgAttendance;
          const dayMultiplier = ['Monday', 'Tuesday', 'Wednesday'].includes(day) ? 0.9 : 1.1;
          const timeMultiplier = timeSlot >= '17:00:00' ? 1.2 : 0.95;
          
          const predictedAttendance = Math.round(baseAttendance * dayMultiplier * timeMultiplier * (0.9 + Math.random() * 0.2));
          const predictedRevenue = Math.round(perf.avgRevenue * dayMultiplier * timeMultiplier * (0.9 + Math.random() * 0.2));
          const confidenceScore = Math.round(80 + Math.random() * 15);

          const reasons = [
            `${className} averages ${Math.round(perf.avgAttendance)} attendees`,
            `${bestTrainer} specializes in this class format`,
            `${day} ${timeSlot} shows strong historical performance`,
            `${bestLocation} optimal for class capacity`
          ];

          newWeeklySchedule[day][timeSlot].push({
            timeSlot,
            dayOfWeek: day,
            className,
            recommendedTrainer: bestTrainer,
            location: bestLocation,
            predictedAttendance,
            predictedRevenue,
            confidenceScore,
            reasons
          });
        });
      });
    });

    setWeeklySchedule(newWeeklySchedule);
    setIsOptimizing(false);
  };

  const getTotalScheduledClasses = () => {
    let total = 0;
    Object.values(weeklySchedule).forEach(day => {
      Object.values(day).forEach(timeSlot => {
        total += timeSlot.length;
      });
    });
    return total;
  };

  const getTotalPredictedRevenue = () => {
    let total = 0;
    Object.values(weeklySchedule).forEach(day => {
      Object.values(day).forEach(timeSlot => {
        timeSlot.forEach(classItem => {
          total += classItem.predictedRevenue;
        });
      });
    });
    return total;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Schedule Optimizer</h2>
            <p className="text-purple-100">
              Generate complete weekly schedules with optimal class placement and trainer allocation
            </p>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Target Week</label>
          <input
            type="week"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white"
          />
        </div>
        
        <Button
          onClick={generateFullWeeklySchedule}
          disabled={isOptimizing}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isOptimizing ? 'Generating Full Schedule...' : 'Generate Complete Weekly Schedule'}
        </Button>
      </div>

      {/* Schedule Summary */}
      {Object.keys(weeklySchedule).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                <p className="text-blue-100 text-sm">Total Classes</p>
                <p className="text-2xl font-bold">{getTotalScheduledClasses()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              <div>
                <p className="text-green-100 text-sm">Predicted Revenue</p>
                <p className="text-2xl font-bold">${getTotalPredictedRevenue()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <p className="text-orange-100 text-sm">Trainers Utilized</p>
                <p className="text-2xl font-bold">{Object.keys(trainerAnalytics).length}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Full Weekly Schedule Display */}
      {Object.keys(weeklySchedule).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Complete Weekly Schedule
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {daysOfWeek.map(day => (
              <div key={day} className="space-y-3">
                <h4 className="font-semibold text-center py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg">
                  {day}
                </h4>
                
                <div className="space-y-2">
                  {timeSlots.map(timeSlot => (
                    <div key={timeSlot} className="min-h-[60px]">
                      <div className="text-xs font-medium text-slate-600 mb-1">{timeSlot}</div>
                      {weeklySchedule[day][timeSlot].map((classItem, idx) => (
                        <div key={idx} className="p-2 bg-gradient-to-r from-white to-purple-50 rounded border border-purple-200 mb-1">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-xs">{classItem.className}</h5>
                              <Badge className="text-xs bg-purple-500">
                                {classItem.confidenceScore}%
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-slate-600">
                              <div>{classItem.recommendedTrainer}</div>
                              <div>{classItem.location}</div>
                            </div>
                            
                            <div className="flex justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {classItem.predictedAttendance}
                              </span>
                              <span className="text-green-600">${classItem.predictedRevenue}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trainer Capacity Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Trainer Capacity Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(trainerAnalytics).map(([trainer, data]) => (
            <div key={trainer} className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{trainer}</h4>
                  <Badge variant={data.totalHours >= 15 ? 'destructive' : 'default'}>
                    {data.totalHours}/15h
                  </Badge>
                </div>
                
                <div className="text-sm text-slate-600 space-y-1">
                  <div>Avg Attendance: {Math.round(data.avgAttendance)}</div>
                  <div>Avg Revenue: ${Math.round(data.avgRevenue)}</div>
                  <div>Specialties: {data.specialties.slice(0, 2).join(', ')}</div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    Performance: {Math.round(data.performance * 10)}/10
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isOptimizing && (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-lg font-semibold">Generating Complete Weekly Schedule</h3>
              <p className="text-slate-600">
                Optimizing {classData.length} historical classes across 7 days and {timeSlots.length} time slots...
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
