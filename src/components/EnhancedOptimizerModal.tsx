import React, { useState } from 'react';
import { X, Brain, Zap, TrendingUp, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { ClassData, ScheduledClass } from '../types';
import { aiService } from '../utils/aiService';

interface EnhancedOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvData: ClassData[];
  currentSchedule: ScheduledClass[];
  onOptimize: (optimizedSchedule: ScheduledClass[]) => void;
  isDarkMode: boolean;
}

interface OptimizationIteration {
  iteration: number;
  schedule: ScheduledClass[];
  metrics: {
    expectedRevenue: number;
    expectedAttendance: number;
  };
  reasoning: string;
}

const EnhancedOptimizerModal: React.FC<EnhancedOptimizerModalProps> = ({
  isOpen,
  onClose,
  csvData,
  currentSchedule,
  onOptimize,
  isDarkMode
}) => {
  const [optimizationType, setOptimizationType] = useState<'revenue' | 'attendance' | 'balanced'>('balanced');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [iterations, setIterations] = useState<OptimizationIteration[]>([]);
  const [selectedIteration, setSelectedIteration] = useState<number>(0);

  const handleOptimize = async () => {
    if (csvData.length === 0) return;

    setIsOptimizing(true);
    setIterations([]);

    try {
      const optimizationResults = await aiService.generateOptimizationIterations(csvData, optimizationType);
      // Transform the results to match our local interface
      const transformedResults: OptimizationIteration[] = optimizationResults.map((result, index) => ({
        iteration: index + 1,
        schedule: result.schedule,
        metrics: {
          expectedRevenue: result.metrics.totalRevenue || 0,
          expectedAttendance: result.metrics.totalParticipants || 0,
        },
        reasoning: `Optimization iteration ${index + 1} for ${optimizationType} strategy`
      }));
      setIterations(transformedResults);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = () => {
    if (iterations.length > 0 && selectedIteration >= 0 && selectedIteration < iterations.length) {
      onOptimize(iterations[selectedIteration].schedule);
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalBg = isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
    : 'bg-gradient-to-br from-white to-gray-50';
  
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${modalBg} rounded-2xl shadow-2xl max-w-4xl w-full m-4 border ${borderColor}`}>
        <div className={`flex items-center justify-between p-6 border-b ${borderColor} bg-gradient-to-r from-purple-600/20 to-pink-600/20`}>
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Enhanced AI Optimizer</h2>
              <p className={textSecondary}>Choose an optimization strategy to generate different schedule options.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textPrimary} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
              Optimization Strategy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: 'revenue', label: 'Maximize Revenue', icon: TrendingUp },
                { value: 'attendance', label: 'Maximize Attendance', icon: Users },
                { value: 'balanced', label: 'Balanced Approach', icon: Zap }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setOptimizationType(value as any)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    optimizationType === value
                      ? 'border-purple-500 bg-purple-500/20'
                      : isDarkMode
                        ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                        : 'border-gray-300 bg-white hover:border-gray-400 shadow-sm'
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-2 text-purple-400" />
                  <div className={`font-medium ${textPrimary}`}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="w-full mb-6 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-3" />
                Generate Optimized Schedules
              </>
            )}
          </button>

          {iterations.length > 0 && (
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${textPrimary}`}>Optimization Results:</h3>
              <div className="grid grid-cols-1 gap-4">
                {iterations.map((iteration, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedIteration(index)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedIteration === index
                        ? 'border-purple-500 bg-purple-500/20'
                        : isDarkMode
                          ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                          : 'border-gray-300 bg-white hover:border-gray-400 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-medium ${textPrimary}`}>Iteration {iteration.iteration}</h4>
                      {selectedIteration === index && (
                        <CheckCircle className="h-5 w-5 text-purple-400" />
                      )}
                    </div>
                    <p className={`text-sm ${textSecondary} mb-3`}>{iteration.reasoning}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-2 bg-green-500/10 rounded-lg">
                        <div className="text-lg font-bold text-green-300">₹{iteration.metrics.expectedRevenue.toFixed(0)}</div>
                        <div className="text-xs text-green-400">Expected Revenue</div>
                      </div>
                      <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                        <div className="text-lg font-bold text-blue-300">{iteration.metrics.expectedAttendance.toFixed(0)}</div>
                        <div className="text-xs text-blue-400">Expected Attendance</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700 mt-8">
            <button
              onClick={onClose}
              className={`px-6 py-3 ${textSecondary} hover:${textPrimary} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyOptimization}
              disabled={iterations.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Selected Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedOptimizerModal;
