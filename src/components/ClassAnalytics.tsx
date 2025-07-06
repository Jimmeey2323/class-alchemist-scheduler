
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClassData } from '@/hooks/useClassData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, MapPin } from 'lucide-react';

interface ClassAnalyticsProps {
  classData: ClassData[];
}

export const ClassAnalytics = ({ classData }: ClassAnalyticsProps) => {
  const analytics = useMemo(() => {
    // Class performance by type
    const classPerformance: { [className: string]: {
      totalClasses: number;
      totalAttendance: number;
      totalRevenue: number;
      avgAttendance: number;
      avgRevenue: number;
      attendanceRate: number;
    }} = {};

    // Time slot performance
    const timeSlotPerformance: { [timeSlot: string]: {
      totalClasses: number;
      totalAttendance: number;
      avgAttendance: number;
    }} = {};

    // Location performance
    const locationPerformance: { [location: string]: {
      totalClasses: number;
      totalAttendance: number;
      totalRevenue: number;
    }} = {};

    // Day of week performance
    const dayPerformance: { [day: string]: {
      totalClasses: number;
      totalAttendance: number;
      totalRevenue: number;
    }} = {};

    classData.forEach(classItem => {
      // Class type analysis
      if (!classPerformance[classItem.className]) {
        classPerformance[classItem.className] = {
          totalClasses: 0,
          totalAttendance: 0,
          totalRevenue: 0,
          avgAttendance: 0,
          avgRevenue: 0,
          attendanceRate: 0
        };
      }
      
      const classPerf = classPerformance[classItem.className];
      classPerf.totalClasses += 1;
      classPerf.totalAttendance += classItem.checkedIn;
      classPerf.totalRevenue += classItem.totalRevenue;

      // Time slot analysis
      if (!timeSlotPerformance[classItem.classTime]) {
        timeSlotPerformance[classItem.classTime] = {
          totalClasses: 0,
          totalAttendance: 0,
          avgAttendance: 0
        };
      }
      
      const timePerf = timeSlotPerformance[classItem.classTime];
      timePerf.totalClasses += 1;
      timePerf.totalAttendance += classItem.checkedIn;

      // Location analysis
      if (!locationPerformance[classItem.location]) {
        locationPerformance[classItem.location] = {
          totalClasses: 0,
          totalAttendance: 0,
          totalRevenue: 0
        };
      }
      
      const locPerf = locationPerformance[classItem.location];
      locPerf.totalClasses += 1;
      locPerf.totalAttendance += classItem.checkedIn;
      locPerf.totalRevenue += classItem.totalRevenue;

      // Day analysis
      if (!dayPerformance[classItem.dayOfWeek]) {
        dayPerformance[classItem.dayOfWeek] = {
          totalClasses: 0,
          totalAttendance: 0,
          totalRevenue: 0
        };
      }
      
      const dayPerf = dayPerformance[classItem.dayOfWeek];
      dayPerf.totalClasses += 1;
      dayPerf.totalAttendance += classItem.checkedIn;
      dayPerf.totalRevenue += classItem.totalRevenue;
    });

    // Calculate averages
    Object.keys(classPerformance).forEach(className => {
      const perf = classPerformance[className];
      perf.avgAttendance = perf.totalAttendance / perf.totalClasses;
      perf.avgRevenue = perf.totalRevenue / perf.totalClasses;
      
      // Calculate attendance rate (checked in vs registered)
      const totalRegistered = classData
        .filter(c => c.className === className)
        .reduce((sum, c) => sum + c.participants, 0);
      perf.attendanceRate = totalRegistered > 0 ? (perf.totalAttendance / totalRegistered) * 100 : 0;
    });

    Object.keys(timeSlotPerformance).forEach(timeSlot => {
      const perf = timeSlotPerformance[timeSlot];
      perf.avgAttendance = perf.totalAttendance / perf.totalClasses;
    });

    return {
      classPerformance,
      timeSlotPerformance,
      locationPerformance,
      dayPerformance
    };
  }, [classData]);

  // Prepare chart data
  const classChartData = Object.entries(analytics.classPerformance)
    .map(([name, data]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      attendance: Math.round(data.avgAttendance),
      revenue: Math.round(data.avgRevenue),
      rate: Math.round(data.attendanceRate)
    }))
    .sort((a, b) => b.attendance - a.attendance);

  const timeSlotChartData = Object.entries(analytics.timeSlotPerformance)
    .map(([time, data]) => ({
      time,
      attendance: Math.round(data.avgAttendance),
      classes: data.totalClasses
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const dayChartData = Object.entries(analytics.dayPerformance)
    .map(([day, data]) => ({
      day,
      attendance: data.totalAttendance,
      revenue: Math.round(data.totalRevenue),
      classes: data.totalClasses
    }));

  const locationPieData = Object.entries(analytics.locationPerformance)
    .map(([location, data]) => ({
      name: location,
      value: data.totalAttendance,
      revenue: data.totalRevenue
    }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

  // Key insights
  const totalClasses = classData.length;
  const totalAttendance = classData.reduce((sum, c) => sum + c.checkedIn, 0);
  const totalRevenue = classData.reduce((sum, c) => sum + c.totalRevenue, 0);
  const avgAttendanceRate = classData.length > 0 ? 
    (classData.reduce((sum, c) => sum + (c.participants > 0 ? c.checkedIn / c.participants : 0), 0) / classData.length) * 100 : 0;

  const topPerformingClass = Object.entries(analytics.classPerformance)
    .sort(([,a], [,b]) => b.avgAttendance - a.avgAttendance)[0];

  const bestTimeSlot = Object.entries(analytics.timeSlotPerformance)
    .sort(([,a], [,b]) => b.avgAttendance - a.avgAttendance)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Class Analytics</h2>
            <p className="text-orange-100">
              Deep insights into class performance, attendance patterns, and revenue trends
            </p>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            <div>
              <p className="text-blue-100 text-sm">Total Classes</p>
              <p className="text-2xl font-bold">{totalClasses}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <p className="text-green-100 text-sm">Total Attendance</p>
              <p className="text-2xl font-bold">{totalAttendance}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            <div>
              <p className="text-purple-100 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold">${Math.round(totalRevenue)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            <div>
              <p className="text-orange-100 text-sm">Avg Attendance Rate</p>
              <p className="text-2xl font-bold">{Math.round(avgAttendanceRate)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Top Performing Class</h3>
          </div>
          {topPerformingClass && (
            <div>
              <p className="text-lg font-bold text-green-700">{topPerformingClass[0]}</p>
              <p className="text-sm text-green-600">
                {Math.round(topPerformingClass[1].avgAttendance)} avg attendance • 
                ${Math.round(topPerformingClass[1].avgRevenue)} avg revenue
              </p>
            </div>
          )}
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Best Time Slot</h3>
          </div>
          {bestTimeSlot && (
            <div>
              <p className="text-lg font-bold text-blue-700">{bestTimeSlot[0]}</p>
              <p className="text-sm text-blue-600">
                {Math.round(bestTimeSlot[1].avgAttendance)} avg attendance • 
                {bestTimeSlot[1].totalClasses} classes
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Performance Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Class Type Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classChartData.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="attendance" fill="#3b82f6" name="Avg Attendance" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Time Slot Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Time Slot Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSlotChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="attendance" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Avg Attendance"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Day of Week Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="attendance" fill="#8b5cf6" name="Total Attendance" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Location Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Location Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={locationPieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {locationPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Performance Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Class Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-2">Class Type</th>
                <th className="text-right p-2">Total Classes</th>
                <th className="text-right p-2">Avg Attendance</th>
                <th className="text-right p-2">Attendance Rate</th>
                <th className="text-right p-2">Avg Revenue</th>
                <th className="text-right p-2">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analytics.classPerformance)
                .sort(([,a], [,b]) => b.totalRevenue - a.totalRevenue)
                .map(([className, data]) => (
                  <tr key={className} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{className}</td>
                    <td className="text-right p-2">{data.totalClasses}</td>
                    <td className="text-right p-2">{Math.round(data.avgAttendance)}</td>
                    <td className="text-right p-2">
                      <Badge 
                        variant={data.attendanceRate >= 80 ? 'default' : data.attendanceRate >= 60 ? 'secondary' : 'destructive'}
                      >
                        {Math.round(data.attendanceRate)}%
                      </Badge>
                    </td>
                    <td className="text-right p-2">${Math.round(data.avgRevenue)}</td>
                    <td className="text-right p-2 font-medium">${Math.round(data.totalRevenue)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
