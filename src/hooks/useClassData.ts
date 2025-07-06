
import { useState, useEffect } from 'react';

export interface ClassData {
  className: string;
  classDate: string;
  dayOfWeek: string;
  classTime: string;
  location: string;
  teacherName: string;
  totalRevenue: number;
  basePayout: number;
  additionalPayout: number;
  totalPayout: number;
  tip: number;
  participants: number;
  checkedIn: number;
  comps: number;
  checkedInComps: number;
  lateCancellations: number;
  nonPaidCustomers: number;
  unique1: string;
  unique2: string;
}

export const useClassData = () => {
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClassData = async () => {
      try {
        const response = await fetch('/Classes.csv');
        if (!response.ok) {
          throw new Error('Failed to load Classes.csv file');
        }
        
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        setClassData(parsedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Error loading class data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassData();
  }, []);

  return { classData, isLoading, error };
};

const parseCSV = (csvText: string): ClassData[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data: ClassData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const classItem: ClassData = {
      className: cleanValue(values[headers.indexOf('Cleaned Class')] || values[headers.indexOf('Class Name')] || ''),
      classDate: cleanValue(values[headers.indexOf('Class date')] || ''),
      dayOfWeek: cleanValue(values[headers.indexOf('Day of the Week')] || ''),
      classTime: cleanValue(values[headers.indexOf('Class Time')] || ''),
      location: cleanValue(values[headers.indexOf('Location')] || ''),
      teacherName: cleanValue(values[headers.indexOf('Teacher Name')] || ''),
      totalRevenue: parseFloat(cleanValue(values[headers.indexOf('Total Revenue')] || '0')) || 0,
      basePayout: parseFloat(cleanValue(values[headers.indexOf('Base Payout')] || '0')) || 0,
      additionalPayout: parseFloat(cleanValue(values[headers.indexOf('Additional Payout')] || '0')) || 0,
      totalPayout: parseFloat(cleanValue(values[headers.indexOf('Total Payout')] || '0')) || 0,
      tip: parseFloat(cleanValue(values[headers.indexOf('Tip')] || '0')) || 0,
      participants: parseInt(cleanValue(values[headers.indexOf('Participants')] || '0')) || 0,
      checkedIn: parseInt(cleanValue(values[headers.indexOf('Checked in')] || '0')) || 0,
      comps: parseInt(cleanValue(values[headers.indexOf('Comps')] || '0')) || 0,
      checkedInComps: parseInt(cleanValue(values[headers.indexOf('Checked In Comps')] || '0')) || 0,
      lateCancellations: parseInt(cleanValue(values[headers.indexOf('Late cancellations')] || '0')) || 0,
      nonPaidCustomers: parseInt(cleanValue(values[headers.indexOf('Non Paid Customers')] || '0')) || 0,
      unique1: cleanValue(values[headers.indexOf('Unique 1')] || ''),
      unique2: cleanValue(values[headers.indexOf('Unique 2')] || ''),
    };

    data.push(classItem);
  }

  return data;
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
};

const cleanValue = (value: string): string => {
  return value.replace(/^"/, '').replace(/"$/, '').trim();
};
