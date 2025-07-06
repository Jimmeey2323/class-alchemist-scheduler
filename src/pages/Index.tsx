
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleDashboard } from '@/components/ScheduleDashboard';
import { ClassAnalytics } from '@/components/ClassAnalytics';
import { TrainerManagement } from '@/components/TrainerManagement';
import { ScheduleOptimizer } from '@/components/ScheduleOptimizer';
import { useClassData } from '@/hooks/useClassData';
import { Calendar, BarChart3, Users, Zap } from 'lucide-react';

const Index = () => {
  const { classData, isLoading, error } = useClassData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg text-slate-600">Loading class data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Class Scheduling Studio
              </h1>
              <p className="text-slate-600">
                AI-powered class scheduling with performance optimization
              </p>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                <div>
                  <p className="text-blue-100 text-sm">Total Classes</p>
                  <p className="text-2xl font-bold">{classData?.length || 0}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8" />
                <div>
                  <p className="text-green-100 text-sm">Active Trainers</p>
                  <p className="text-2xl font-bold">
                    {new Set(classData?.map(c => c.teacherName) || []).size}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8" />
                <div>
                  <p className="text-purple-100 text-sm">Avg Attendance</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      (classData?.reduce((sum, c) => sum + c.checkedIn, 0) || 0) / 
                      (classData?.length || 1)
                    )}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8" />
                <div>
                  <p className="text-orange-100 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    ${Math.round(classData?.reduce((sum, c) => sum + c.totalRevenue, 0) || 0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="optimizer" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Optimizer
            </TabsTrigger>
            <TabsTrigger value="trainers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Trainers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <ScheduleDashboard classData={classData || []} />
          </TabsContent>

          <TabsContent value="optimizer" className="space-y-6">
            <ScheduleOptimizer classData={classData || []} />
          </TabsContent>

          <TabsContent value="trainers" className="space-y-6">
            <TrainerManagement classData={classData || []} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ClassAnalytics classData={classData || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
