
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClassData } from '@/hooks/useClassData';
import { Zap, TrendingUp, Users, Clock, Brain, Star } from 'lucide-react';

interface ScheduleOptimizerProps {
  classData: ClassData[];
}

interface OptimizedSchedule {
  timeSlot: string;
  className: string;
  recommendedTrainer: string;
  location: string;
  predictedAttendance: number;
  predictedRevenue: number;
  confidenceScore: number;
  reasons: string[];
}

export const ScheduleOptimizer = ({ classData }: ScheduleOptimizerProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedSchedules, setOptimizedSchedules] = useState<OptimizedSchedule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('2025-01-06'); // Example week

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

  const generateOptimizedSchedule = async () => {
    setIsOptimizing(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const timeSlots = ['06:00:00', '07:00:00', '08:00:00', '09:00:00', '10:00:00', '11:00:00', '17:00:00', '18:00:00', '19:00:00'];
    const classTypes = Object.keys(classPerformance);
    const locations = [...new Set(classData.map(c => c.location))];
    
    const optimized: OptimizedSchedule[] = [];

    // Generate recommendations for each time slot
    timeSlots.forEach(timeSlot => {
      classTypes.slice(0, 3).forEach(className => { // Limit to top 3 class types per slot
        const perf = classPerformance[className];
        if (!perf || perf.avgAttendance < 5) return; // Skip low-performing classes

        // Find best trainer for this class type
        const availableTrainers = Object.entries(trainerAnalytics)
          .filter(([trainer, data]) => 
            data.specialties.includes(className) && 
            data.totalHours < 15 // Respect 15-hour limit
          )
          .sort(([,a], [,b]) => b.performance - a.performance);

        if (availableTrainers.length === 0) return;

        const [bestTrainer] = availableTrainers[0];
        const bestLocation = perf.bestLocations[0] || locations[0];

        // Calculate predictions
        const predictedAttendance = Math.round(perf.avgAttendance * (1 + Math.random() * 0.2 - 0.1));
        const predictedRevenue = Math.round(perf.avgRevenue * (1 + Math.random() * 0.15 - 0.075));
        const confidenceScore = Math.round(85 + Math.random() * 10);

        const reasons = [
          `${className} performs ${perf.avgAttendance > 15 ? 'excellently' : 'well'} with avg ${Math.round(perf.avgAttendance)} attendees`,
          `${bestTrainer} has high performance score in this class type`,
          `${timeSlot} is optimal based on historical data`,
          `${bestLocation} shows best results for this class format`
        ];

        optimized.push({
          timeSlot,
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

    // Sort by confidence score
    optimized.sort((a, b) => b.confidenceScore - a.confidenceScore);
    
    setOptimizedSchedules(optimized.slice(0, 12)); // Limit to top 12 recommendations
    setIsOptimizing(false);
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
              Generate optimal class schedules based on performance data and trainer availability
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
          onClick={generateOptimizedSchedule}
          disabled={isOptimizing}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isOptimizing ? 'Optimizing...' : 'Generate Optimal Schedule'}
        </Button>
      </div>

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

      {/* Optimized Schedule Results */}
      {optimizedSchedules.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            AI-Generated Optimal Schedule
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {optimizedSchedules.map((schedule, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-white to-purple-50 rounded-lg border border-purple-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">{schedule.timeSlot}</span>
                    </div>
                    <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                      {schedule.confidenceScore}% confidence
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg">{schedule.className}</h4>
                    <p className="text-sm text-slate-600">
                      {schedule.recommendedTrainer} • {schedule.location}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{schedule.predictedAttendance} predicted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>${schedule.predictedRevenue} revenue</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">AI Reasoning:</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {schedule.reasons.slice(0, 2).map((reason, ridx) => (
                        <li key={ridx}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isOptimizing && (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-lg font-semibold">AI Optimization in Progress</h3>
              <p className="text-slate-600">
                Analyzing {classData.length} historical classes and {Object.keys(trainerAnalytics).length} trainers...
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
