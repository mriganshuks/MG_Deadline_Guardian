export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO string YYYY-MM-DD
  estimatedHours: number;
  category: string; // Work, Study, Finance, Life, Personal
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  
  // AI Risk Prediction
  riskScore?: number; // 0 - 100
  riskLevel?: 'low' | 'moderate' | 'high' | 'critical';
  riskExplanation?: string;
  failureProbability?: number; // 0 - 100
  recommendedIntervention?: string;
  mainRiskFactors?: string[];
  riskFactors?: {
    urgencyScore: number; // 0 - 100
    complexityScore: number; // 0 - 100
    bufferSafetyScore: number; // 0 - 100
  };
  
  // AI Recovery Plan
  recoveryPlan?: RecoveryPlan;
  missedMilestonesCount?: number;
  lastRecalculatedAt?: string;
  googleEventId?: string;
}

export interface RecoveryPlan {
  overallStrategy: string;
  sessions: TaskSession[];
  recalcCount: number;
  rebuiltAt: string;
}

export interface TaskSession {
  id: string;
  title: string;
  durationHours: number;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  missed?: boolean;
  googleEventId?: string;
}

export interface SimulationResult {
  days: SimulationDay[];
  comparisonSummary: string;
  currentTrajectory: TrajectoryStats;
  recoveryTrajectory: TrajectoryStats;
}

export interface SimulationDay {
  dayIndex: number;
  date: string;
  currentProgress: number; // 0 - 100%
  recoveryProgress: number; // 0 - 100%
}

export interface TrajectoryStats {
  name: string;
  finalProgress: number; // 0 - 100
  successProbability: number; // 0 - 100 %
  dailyCommitmentHours: number;
  description: string;
  expectedMissedDeadlines?: string;
  stressScore?: number;
  workloadPressure?: string;
}
