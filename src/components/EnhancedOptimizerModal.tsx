import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogActions, Button, RadioGroup, Radio, FormControlLabel, CircularProgress, Typography } from '@mui/material';
import { ClassData, ScheduledClass } from '../types';
import { generateOptimizationIterations } from '../utils/aiService';

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
      const optimizationResults = await generateOptimizationIterations(csvData, optimizationType);
      setIterations(optimizationResults);
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

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Enhanced AI Optimizer</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Choose an optimization strategy to generate different schedule options.
        </Typography>

        <RadioGroup
          aria-label="optimization-type"
          name="optimizationType"
          value={optimizationType}
          onChange={(e) => setOptimizationType(e.target.value as 'revenue' | 'attendance' | 'balanced')}
          row
        >
          <FormControlLabel value="revenue" control={<Radio />} label="Maximize Revenue" />
          <FormControlLabel value="attendance" control={<Radio />} label="Maximize Attendance" />
          <FormControlLabel value="balanced" control={<Radio />} label="Balanced Approach" />
        </RadioGroup>

        <Button
          variant="contained"
          color="primary"
          onClick={handleOptimize}
          disabled={isOptimizing}
          style={{ marginTop: '20px' }}
        >
          {isOptimizing ? <CircularProgress size={24} color="inherit" /> : 'Generate Optimized Schedules'}
        </Button>

        {iterations.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <Typography variant="h6">Optimization Iterations:</Typography>
            {iterations.map((iteration, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #ddd',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '5px',
                  backgroundColor: selectedIteration === index ? '#f0f0f0' : 'white',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedIteration(index)}
              >
                <Typography variant="subtitle1">Iteration {iteration.iteration}</Typography>
                <Typography variant="body2">Reasoning: {iteration.reasoning}</Typography>
                <Typography variant="body2">Expected Revenue: ${iteration.metrics.expectedRevenue.toFixed(2)}</Typography>
                <Typography variant="body2">Expected Attendance: {iteration.metrics.expectedAttendance.toFixed(1)}</Typography>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleApplyOptimization}
          disabled={iterations.length === 0}
        >
          Apply Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedOptimizerModal;
