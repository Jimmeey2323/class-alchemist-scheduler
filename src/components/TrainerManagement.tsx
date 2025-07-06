import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClassData } from '@/hooks/useClassData';
import { Users, Clock, TrendingUp, Award, AlertTriangle, CheckCircle } from 'lucide-react';

interface TrainerManagementProps {
  classData: ClassData[];
}

interface TrainerStats {
  name: string;
  totalClasses: number;
  totalHours: number;
  avgAttendance: number;
  avgRevenue: number;
  totalEarnings: number;
  specialties: string[];
  recentPerformance: number[];
  status: 'available' | 'at-limit' | 'over-limit';
  weeklySchedule: { [day: string]: string[] };
}

export const TrainerManagement = ({ classData }: TrainerManagementProps) => {
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'schedule' | 'performance'>('overview');

  const trainerStats = useMemo(() => {
    const stats: { [trainer: string]: TrainerStats } = {};

    classData.forEach(classItem => {
      if (!stats[classItem.teacherName]) {
        stats[classItem.teacherName] = {
          name: classItem.teacherName,
          totalClasses: 0,
          totalHours: 0,
          avgAttendance: 0,
          avgRevenue: 0,
          totalEarnings: 0,
          specialties: [],
          recentPerformance: [],
          status: 'available',
          weeklySchedule: {}
        };
      }

      const trainer = stats[classItem.teacherName];
      trainer.totalClasses += 1;
      trainer.totalHours += 1; // Assuming 1 hour per class
      trainer.avgAttendance += classItem.checkedIn;
      trainer.avgRevenue += classItem.totalRevenue;
      trainer.totalEarnings += classItem.totalPayout + classItem.tip;

      // Track specialties
      if (!trainer.specialties.includes(classItem.className)) {
        trainer.specialties.push(classItem.className);
      }

      // Build weekly schedule
      if (!trainer.weeklySchedule[classItem.dayOfWeek]) {
        trainer.weeklySchedule[classItem.dayOfWeek] = [];
      }
      const timeSlot = `${classItem.classTime} - ${classItem.className} @ ${classItem.location}`;
      if (!trainer.weeklySchedule[classItem.dayOfWeek].includes(timeSlot)) {
        trainer.weeklySchedule[classItem.dayOfWeek].push(timeSlot);
      }

      // Track recent performance (last 10 classes)
      const attendanceRate = classItem.participants > 0 ? 
        (classItem.checkedIn / classItem.participants) * 100 : 0;
      trainer.recentPerformance.push(attendanceRate);
    });

    // Calculate averages and determine status
    Object.keys(stats).forEach(trainerName => {
      const trainer = stats[trainerName];
      trainer.avgAttendance = trainer.avgAttendance / trainer.totalClasses;
      trainer.avgRevenue = trainer.avgRevenue / trainer.totalClasses;
      
      // Keep only last 10 performances
      trainer.recentPerformance = trainer.recentPerformance.slice(-10);
      
      // Determine weekly hour status (assuming weekly data)
      const weeklyHours = trainer.totalHours / (classData.length > 0 ? 
        Math.ceil(classData.length / 50) : 1); // Rough estimate
      
      if (weeklyHours >= 15) {
        trainer.status = weeklyHours > 15 ? 'over-limit' : 'at-limit';
      } else {
        trainer.status = 'available';
      }
    });

    return stats;
  }, [classData]);

  const getStatusColor = (status: TrainerStats['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'at-limit': return 'bg-yellow-500';
      case 'over-limit': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: TrainerStats['status']) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'at-limit': return <Clock className="w-4 h-4" />;
      case 'over-limit': return <AlertTriangle className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const selectedTrainerData = selectedTrainer ? trainerStats[selectedTrainer] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-green-500 to-teal-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Trainer Management</h2>
            <p className="text-green-100">
              Monitor trainer schedules, performance, and hour allocations
            </p>
          </div>
        </div>
      </Card>

      {/* View Mode Controls */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'overview' ? 'default' : 'outline'}
          onClick={() => setViewMode('overview')}
          size="sm"
        >
          Overview
        </Button>
        <Button
          variant={viewMode === 'schedule' ? 'default' : 'outline'}
          onClick={() => setViewMode('schedule')}
          size="sm"
        >
          Schedules
        </Button>
        <Button
          variant={viewMode === 'performance' ? 'default' : 'outline'}
          onClick={() => setViewMode('performance')}
          size="sm"
        >
          Performance
        </Button>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(trainerStats).map(trainer => (
            <Card key={trainer.name} className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedTrainer(trainer.name)}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{trainer.name}</h3>
                  <Badge className={`${getStatusColor(trainer.status)} text-white flex items-center gap-1`}>
                    {getStatusIcon(trainer.status)}
                    <span className="capitalize">{trainer.status}</span>
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{trainer.totalHours} hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <span>{Math.round(trainer.avgAttendance)} avg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <span>${Math.round(trainer.avgRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span>${Math.round(trainer.totalEarnings)}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-slate-600 mb-1">Specialties:</p>
                  <div className="flex flex-wrap gap-1">
                    {trainer.specialties.slice(0, 3).map(specialty => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {trainer.specialties.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{trainer.specialties.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Mode */}
      {viewMode === 'schedule' && (
        <div className="space-y-4">
          {Object.values(trainerStats).map(trainer => (
            <Card key={trainer.name} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{trainer.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(trainer.status)} text-white`}>
                    {trainer.totalHours}/15 hours
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <div key={day} className="space-y-2">
                    <h4 className="font-medium text-sm text-center py-1 bg-slate-100 rounded">
                      {day}
                    </h4>
                    <div className="space-y-1">
                      {(trainer.weeklySchedule[day] || []).map((slot, idx) => (
                        <div key={idx} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-500">
                          {slot}
                        </div>
                      ))}
                      {(!trainer.weeklySchedule[day] || trainer.weeklySchedule[day].length === 0) && (
                        <div className="text-xs text-slate-400 text-center py-2">
                          No classes
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Performance Mode */}
      {viewMode === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.values(trainerStats).map(trainer => (
            <Card key={trainer.name} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{trainer.name}</h3>
                  <Badge variant="outline">
                    {trainer.totalClasses} classes taught
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(trainer.avgAttendance)}
                    </div>
                    <div className="text-sm text-slate-600">Avg Attendance</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${Math.round(trainer.avgRevenue)}
                    </div>
                    <div className="text-sm text-slate-600">Avg Revenue</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Recent Performance Trend</h4>
                  <div className="flex items-end gap-1 h-16">
                    {trainer.recentPerformance.slice(-8).map((perf, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                        style={{
                          height: `${Math.max(perf / 2, 5)}%`,
                          width: '12px'
                        }}
                        title={`${Math.round(perf)}% attendance`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Last 8 classes attendance rates
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Total Earnings</h4>
                  <div className="text-2xl font-bold text-green-600">
                    ${Math.round(trainer.totalEarnings)}
                  </div>
                  <div className="text-sm text-slate-600">
                    From {trainer.totalClasses} classes
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Trainer Detail Modal */}
      {selectedTrainerData && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{selectedTrainerData.name}</h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedTrainer(null)}>
              Close
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Statistics</h4>
              <div className="space-y-1 text-sm">
                <div>Total Classes: {selectedTrainerData.totalClasses}</div>
                <div>Total Hours: {selectedTrainerData.totalHours}</div>
                <div>Avg Attendance: {Math.round(selectedTrainerData.avgAttendance)}</div>
                <div>Avg Revenue: ${Math.round(selectedTrainerData.avgRevenue)}</div>
                <div>Total Earnings: ${Math.round(selectedTrainerData.totalEarnings)}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Specialties</h4>
              <div className="space-y-1">
                {selectedTrainerData.specialties.map(specialty => (
                  <Badge key={specialty} variant="outline" className="mr-1 mb-1">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Status</h4>
              <Badge className={`${getStatusColor(selectedTrainerData.status)} text-white`}>
                {selectedTrainerData.status.replace('-', ' ').toUpperCase()}
              </Badge>
              <p className="text-sm text-slate-600">
                {selectedTrainerData.status === 'available' && 'Can take more classes'}
                {selectedTrainerData.status === 'at-limit' && 'At 15-hour weekly limit'}
                {selectedTrainerData.status === 'over-limit' && 'Exceeding recommended hours'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
