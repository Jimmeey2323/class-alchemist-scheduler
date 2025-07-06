import OpenAI from 'openai';
import { ClassData, ScheduledClass, CustomTeacher } from '../types';
import { getClassDuration, getClassAverageForSlot, getBestTeacherForClass } from './classUtils';

interface AIProvider {
  name: string;
  key: string;
  endpoint: string;
}

interface AIRecommendation {
  classFormat: string;
  teacher: string;
  reasoning: string;
  confidence: number;
  expectedParticipants: number;
  expectedRevenue: number;
  priority: number;
  timeSlot?: string;
  location?: string;
}

interface OptimizationOptions {
  prioritizeTopPerformers?: boolean;
  balanceShifts?: boolean;
  optimizeTeacherHours?: boolean;
  respectTimeRestrictions?: boolean;
  minimizeTrainersPerShift?: boolean;
  iteration?: number;
  optimizationType?: 'revenue' | 'attendance' | 'balanced';
}

interface OptimizationIteration {
  iteration: number;
  schedule: ScheduledClass[];
  metrics: {
    totalRevenue: number;
    totalParticipants: number;
    teacherBalance: number;
  };
}

class AIService {
  private provider: AIProvider | null = null;
  private openai: OpenAI | null = null;

  constructor() {
    this.loadProvider();
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
    localStorage.setItem('ai_provider', provider.name);
    localStorage.setItem('ai_key', provider.key);
    localStorage.setItem('ai_endpoint', provider.endpoint);
    this.openai = new OpenAI({
      apiKey: provider.key,
      baseURL: provider.endpoint,
    });
  }

  getProvider(): AIProvider | null {
    return this.provider;
  }

  loadProvider() {
    const savedProvider = localStorage.getItem('ai_provider');
    const savedKey = localStorage.getItem('ai_key');
    const savedEndpoint = localStorage.getItem('ai_endpoint');

    if (savedProvider && savedKey && savedEndpoint) {
      this.setProvider({
        name: savedProvider,
        key: savedKey,
        endpoint: savedEndpoint,
      });
    }
  }

  async generateClassRecommendations(
    csvData: ClassData[],
    location: string,
    day: string,
    timeSlot: string
  ): Promise<AIRecommendation[]> {
    if (!this.openai) {
      throw new Error('AI provider not configured.');
    }

    const classAverages = getClassAverageForSlot(csvData, location, day, timeSlot);
    const topClass = Object.keys(classAverages).reduce((a, b) =>
      classAverages[a] > classAverages[b] ? a : b
    );

    const bestTeacher = getBestTeacherForClass(csvData, topClass);

    const prompt = `Analyze historical class data for ${location} on ${day} at ${timeSlot}.
    Based on class performance, teacher skills, and studio resources, suggest the best class format and teacher.
    Explain your reasoning and provide confidence level (0-100), expected participants, and revenue.
    The best class is ${topClass} taught by ${bestTeacher}.
    Give 3 recommendations.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        console.warn('No content in AI response.');
        return [];
      }

      const recommendations: AIRecommendation[] = response
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line, index) => {
          const parts = line.split(': ');
          if (parts.length < 2) {
            console.warn(`Skipping malformed line ${index + 1}: ${line}`);
            return null;
          }

          const details = parts[1].split(', ');
          if (details.length < 5) {
            console.warn(`Skipping line ${index + 1} due to insufficient details: ${line}`);
            return null;
          }

          return {
            classFormat: details[0].replace('Class', '').trim(),
            teacher: details[1].replace('Teacher', '').trim(),
            reasoning: details[2].replace('Reasoning', '').trim(),
            confidence: parseFloat(details[3].replace('Confidence', '').replace('%', '').trim()),
            expectedParticipants: parseFloat(details[4].replace('Participants', '').trim()),
            expectedRevenue: parseFloat(details[5]?.replace('Revenue', '').trim() || '0'),
            priority: index + 1,
            timeSlot: timeSlot,
            location: location,
          };
        })
        .filter((rec): rec is AIRecommendation => rec !== null);

      return recommendations;
    } catch (error) {
      console.error('Error generating class recommendations:', error);
      return [];
    }
  }

  async generateScheduleSuggestions(
    csvData: ClassData[],
    currentSchedule: ScheduledClass[]
  ): Promise<AIRecommendation[]> {
    if (!this.openai) {
      throw new Error('AI provider not configured.');
    }

    const prompt = `Analyze the current class schedule and historical class data to suggest improvements.
    Consider class attendance, revenue, teacher availability, and potential conflicts.
    Suggest three specific changes to optimize the schedule.
    Current schedule: ${JSON.stringify(currentSchedule)}
    Historical data: ${JSON.stringify(csvData.slice(0, 10))}
    Give 3 recommendations.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        console.warn('No content in AI response.');
        return [];
      }

      const recommendations: AIRecommendation[] = response
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line, index) => {
          const parts = line.split(': ');
          if (parts.length < 2) {
            console.warn(`Skipping malformed line ${index + 1}: ${line}`);
            return null;
          }

          const details = parts[1].split(', ');
          if (details.length < 5) {
            console.warn(`Skipping line ${index + 1} due to insufficient details: ${line}`);
            return null;
          }

          return {
            classFormat: details[0].replace('Class', '').trim(),
            teacher: details[1].replace('Teacher', '').trim(),
            reasoning: details[2].replace('Reasoning', '').trim(),
            confidence: parseFloat(details[3].replace('Confidence', '').replace('%', '').trim()),
            expectedParticipants: parseFloat(details[4].replace('Participants', '').trim()),
            expectedRevenue: parseFloat(details[5]?.replace('Revenue', '').trim() || '0'),
            priority: index + 1,
          };
        })
        .filter((rec): rec is AIRecommendation => rec !== null);

      return recommendations;
    } catch (error) {
      console.error('Error generating schedule suggestions:', error);
      return [];
    }
  }

  async generateOptimizedSchedule(
    csvData: ClassData[],
    options: OptimizationOptions = {}
  ): Promise<ScheduledClass[]> {
    if (!this.openai) {
      throw new Error('AI provider not configured.');
    }

    const prompt = `Optimize the class schedule based on historical class data.
    Consider class attendance, revenue, teacher skills, and studio resources.
    Create a schedule with the best possible combination of classes and teachers.
    Historical data: ${JSON.stringify(csvData.slice(0, 10))}
    Give me a JSON array of classes.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        console.warn('No content in AI response.');
        return [];
      }

      const optimizedSchedule: ScheduledClass[] = JSON.parse(response);
      return optimizedSchedule;
    } catch (error) {
      console.error('Error generating optimized schedule:', error);
      return [];
    }
  }

  async generateDailySchedule(
    csvData: ClassData[],
    currentSchedule: ScheduledClass[],
    day: string,
    location: string
  ): Promise<ScheduledClass[]> {
    if (!this.openai) {
      throw new Error('AI provider not configured.');
    }

    const prompt = `Optimize the class schedule for ${day} at ${location} based on historical class data.
    Consider class attendance, revenue, teacher skills, and studio resources.
    Current schedule: ${JSON.stringify(currentSchedule)}
    Historical data: ${JSON.stringify(csvData.slice(0, 10))}
    Give me a JSON array of classes.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        console.warn('No content in AI response.');
        return [];
      }

      const optimizedSchedule: ScheduledClass[] = JSON.parse(response);
      return optimizedSchedule;
    } catch (error) {
      console.error('Error generating daily schedule:', error);
      return [];
    }
  }

  async generateOptimizationIterations(
    csvData: ClassData[],
    optimizationType: 'revenue' | 'attendance' | 'balanced' = 'balanced'
  ): Promise<OptimizationIteration[]> {
    if (!this.openai) {
      throw new Error('AI provider not configured.');
    }

    const prompt = `Generate multiple iterations of class schedule optimization based on historical class data.
    Optimize for ${optimizationType}, considering class attendance, revenue, teacher skills, and studio resources.
    Provide 3 schedule options, each with different class combinations and teacher assignments.
    Historical data: ${JSON.stringify(csvData.slice(0, 10))}
    Give me a JSON array of 3 schedule options.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        console.warn('No content in AI response.');
        return [];
      }

      const iterations: ScheduledClass[][] = JSON.parse(response);
      return iterations.map((schedule, index) => ({
        iteration: index + 1,
        schedule: schedule,
        metrics: {
          totalRevenue: schedule.reduce((sum, cls) => sum + (cls.revenue || 0), 0),
          totalParticipants: schedule.reduce((sum, cls) => sum + (cls.participants || 0), 0),
          teacherBalance: 0,
        },
      }));
    } catch (error) {
      console.error('Error generating optimization iterations:', error);
      return [];
    }
  }

  private async generateOptimizedScheduleInternal(
    csvData: ClassData[],
    customTeachers: CustomTeacher[] = [],
    options: OptimizationOptions = {}
  ): Promise<ScheduledClass[]> {
    if (!this.openai) {
      throw new Error('AI provider not configured.');
    }

    const {
      prioritizeTopPerformers = true,
      balanceShifts = true,
      optimizeTeacherHours = true,
      respectTimeRestrictions = true,
      minimizeTrainersPerShift = true,
      iteration = 0,
      optimizationType = 'balanced',
    } = options;

    const topClasses = csvData.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
    const teacherList = customTeachers.map(teacher => `${teacher.firstName} ${teacher.lastName}`).join(', ');

    const prompt = `Optimize the class schedule based on historical class data, custom teacher preferences, and various optimization goals.
    Consider class attendance, revenue, teacher skills, and studio resources.
    
    Optimization Type: ${optimizationType} (balance revenue, attendance, and teacher workload)
    Iteration: ${iteration}
    
    Goals:
    - Prioritize top-performing classes: ${prioritizeTopPerformers ? 'Yes' : 'No'}
    - Balance teacher shifts: ${balanceShifts ? 'Yes' : 'No'}
    - Optimize teacher hours: ${optimizeTeacherHours ? 'Yes' : 'No'}
    - Respect time restrictions: ${respectTimeRestrictions ? 'Yes' : 'No'}
    - Minimize trainers per shift: ${minimizeTrainersPerShift ? 'Yes' : 'No'}
    
    Top Classes: ${JSON.stringify(topClasses)}
    Custom Teachers: ${teacherList}
    
    Historical data: ${JSON.stringify(csvData.slice(0, 10))}
    
    Give me a JSON array of classes with the following properties: id, day, time, location, classFormat, teacherFirstName, teacherLastName, duration, participants, revenue, isTopPerformer, isLocked, isPrivate.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        console.warn('No content in AI response.');
        return [];
      }

      let optimizedSchedule: ScheduledClass[];
      try {
        optimizedSchedule = JSON.parse(response);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.log('AI Response:', response);
        return [];
      }

      return optimizedSchedule;
    } catch (error) {
      console.error('Error generating optimized schedule:', error);
      return [];
    }
  }

  // Find and fix the Promise return issue around line 405
  public generateIntelligentSchedule = async (
    csvData: ClassData[],
    customTeachers: CustomTeacher[] = [],
    options: OptimizationOptions = {}
  ): Promise<ScheduledClass[]> => {
    try {
      const schedule = await this.generateOptimizedScheduleInternal(csvData, customTeachers, options);
      return schedule;
    } catch (error) {
      console.error('Error generating intelligent schedule:', error);
      return [];
    }
  };
}

export const aiService = new AIService();
