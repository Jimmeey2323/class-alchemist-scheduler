
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClassData } from '@/hooks/useClassData';
import { Calendar, Clock, MapPin, User, TrendingUp, Users } from 'lucide-react';

interface ScheduleDashboardProps {
  classData: ClassData[];
}

export const ScheduleDashboard = ({ classData }: ScheduleDashboardProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const scheduleData = useMemo(() => {
    if (viewMode === 'day') {
      return classData.filter(c => c.classDate.startsWith(selectedDate));
    } else {
      // Week view - get current week
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date.toISOString().split('T')[0];
      });
      
      return classData.filter(c => weekDates.some(date => c.classDate.startsWith(date)));
    }
  }, [classData, selectedDate, viewMode]);

  const groupedSchedule = useMemo(() => {
    const grouped: { [key: string]: ClassData[] } = {};
    
    scheduleData.forEach(classItem => {
      const key = viewMode === 'day' 
        ? classItem.classTime 
        : `${classItem.dayOfWeek}-${classItem.classTime}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(classItem);
    });
    
    return grouped;
  }, [scheduleData, viewMode]);

  const getAttendanceRate = (classItem: ClassData) => {
    return classItem.participants > 0 ? 
      Math.round((classItem.checkedIn / classItem.participants) * 100) : 0;
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            onClick={() => setViewMode('day')}
            size="sm"
          >
            Day View
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            onClick={() => setViewMode('week')}
            size="sm"
          >
            Week View
          </Button>
        </div>
        
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        />
      </div>

      {/* Schedule Grid */}
      <div className="grid gap-4">
        {viewMode === 'week' ? (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {daysOfWeek.map(day => (
              <div key={day} className="space-y-3">
                <h3 className="font-semibold text-lg text-center py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg">
                  {day}
                </h3>
                
                <div className="space-y-2">
                  {Object.entries(groupedSchedule)
                    .filter(([key]) => key.startsWith(day))
                    .sort(([a], [b]) => a.split('-')[1].localeCompare(b.split('-')[1]))
                    .map(([key, classes]) => (
                      <div key={key} className="space-y-1">
                        {classes.map((classItem, idx) => (
                          <Card key={idx} className="p-3 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-sm">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{classItem.className}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {classItem.classTime}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <MapPin className="w-3 h-3" />
                                <span>{classItem.location}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <User className="w-3 h-3" />
                                <span>{classItem.teacherName}</span>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{classItem.checkedIn}/{classItem.participants}</span>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${getPerformanceColor(getAttendanceRate(classItem))}`}></div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSchedule)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([timeSlot, classes]) => (
                <Card key={timeSlot} className="p-6 bg-white/70 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">{timeSlot}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((classItem, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-white to-slate-50 rounded-lg border">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{classItem.className}</h4>
                            <Badge className={`${getPerformanceColor(getAttendanceRate(classItem))} text-white`}>
                              {getAttendanceRate(classItem)}%
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{classItem.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{classItem.teacherName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{classItem.checkedIn} attended / {classItem.participants} registered</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              <span>${classItem.totalRevenue.toFixed(2)} revenue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
