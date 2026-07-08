import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, RecoveryPlan, TaskSession } from "../types";
import { User } from "@supabase/supabase-js";
import { GlassStackCard, GlassCardItem } from "./ui/glass-stack-card";
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Plus, 
  AlertTriangle, 
  Calendar, 
  CalendarCheck,
  TrendingUp, 
  Sparkles, 
  Cpu,
  ChevronRight,
  Flame,
  UserCheck,
  Zap,
  Info,
  Compass,
  TrendingDown,
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
  Activity,
  Bookmark
} from "lucide-react";

interface DashboardProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onSelectTaskForRecovery: (task: Task) => void;
  onNavigate: (tab: string) => void;
  isDemoMode?: boolean;
  syncConfirmation?: { show: boolean; sessionsCount: number; nextSessionTitle: string; nextSessionTime: string } | null;
  onDismissSyncConfirmation?: () => void;
  
  // Newly passed callbacks to enable full-featured inline recovery & risk management
  onUpdateTaskRisk?: (taskId: string, riskData: Partial<Task>) => void;
  onUpdateTaskRecovery?: (taskId: string, recoveryData: RecoveryPlan) => void;
  onToggleSession?: (taskId: string, sessionId: string, status?: 'completed' | 'missed' | 'pending') => void;
  onIncrementMissedMilestone?: (taskId: string) => void;
  
  user?: User | null;
  onSyncCalendarPress?: () => void;
}

interface IntelligenceReport {
  summaryText: string;
  highestRiskTask: {
    title: string;
    reason: string;
    prediction: string;
    recommendedAction: string;
  } | null;
  portfolioHealth: number;
  alertCount: number;

  dailyBriefing?: {
    greeting: string;
    activeCount: number;
    mostImportantTask: string;
    todayTargetText: string;
  };
  autonomousRisk?: {
    taskName: string;
    whyAtRisk: string;
    recommendedAction: string;
  } | null;
  deadlineConflicts?: {
    conflictDetected: boolean;
    description: string;
    recommendedAction: string;
  } | null;
  recoverySuggestion?: {
    hasRecovery: boolean;
    taskName: string;
    steps: Array<{
      day: string;
      action: string;
      duration: string;
    }>;
  } | null;
  unifiedRecommendation?: string;
}

interface ReflectionInsights {
  insights: Array<{
    title: string;
    description: string;
    category: 'advantage' | 'pattern' | 'risk';
  }>;
  workloadTrends: string;
  recommendedImprovements: string[];
}

const demoIntelReport: IntelligenceReport = {
  summaryText: "You are tracking 3 active projects in Demo Mode. Your overall schedule pressure is Moderate (68%), and you have 2 critical milestones due in the next 4 days.",
  highestRiskTask: {
    title: "Client Pitch Deck Redesign",
    reason: "With 12 total hours required and 1 missed milestone, this task is at critical risk of delay.",
    prediction: "At risk of late delivery or shipping a rushed, lower-quality product.",
    recommendedAction: "Activate the 3-day recovery roadmap and block off 4 hours of design time today."
  },
  portfolioHealth: 68,
  alertCount: 2,
  dailyBriefing: {
    greeting: "Good morning, Demo User!",
    activeCount: 3,
    mostImportantTask: "Client Pitch Deck Redesign",
    todayTargetText: "Completing 3 hours of design adjustments today will salvage your timeline."
  },
  autonomousRisk: {
    taskName: "Client Pitch Deck Redesign",
    whyAtRisk: "Requires 12 hours of design work over 2 days. The window is tight and has no safety buffer.",
    recommendedAction: "Open the Recovery tab and execute Session 1 immediately."
  },
  deadlineConflicts: {
    conflictDetected: true,
    description: "You have 'Quarterly Financial Audit' (14h) and 'Client Pitch Deck Redesign' (12h) due within 48 hours of each other.",
    recommendedAction: "Focus exclusively on the Pitch Deck today, then audit financial logs tomorrow."
  },
  recoverySuggestion: {
    hasRecovery: true,
    taskName: "Quarterly Financial Audit Report",
    steps: [
      { day: "Today", action: "Verify Operating Revenue logs", duration: "4 hours" },
      { day: "Tomorrow", action: "Assemble Tax Deductions and Prepare draft", duration: "5 hours" },
      { day: "Friday", action: "Run consolidated adjustments & clean output", duration: "5 hours" }
    ]
  },
  unifiedRecommendation: "Our AI Coach recommends prioritizing the Client Pitch Deck Redesign today. Breaking down slide sections into 4-hour focused blocks will prevent last-minute formatting rushes and secure a high-quality delivery."
};

const demoReflection: ReflectionInsights = {
  insights: [
    {
      title: "Active Risk: Dual High-Effort Deadlines",
      description: "You have scheduled two heavy-effort tasks (Audit & Pitch Deck) close together. This creates peak workload stress.",
      category: "risk"
    },
    {
      title: "Behavioral Pattern: End-of-week Overload",
      description: "Most of your estimated effort is loaded near deadlines. Planning smaller, mid-week milestones can reduce peak stress by 40%.",
      category: "pattern"
    },
    {
      title: "Timeline Advantage: Documentation Buffer",
      description: "Cloud Deployment Documentation is well-spaced with a 10-day buffer, meaning you can safely put it on hold.",
      category: "advantage"
    }
  ],
  workloadTrends: "Workload spikes sharply in 2 days (Pitch Deck due) and in 4 days (Audit due). Expect peak effort of 8+ hours/day unless recovery steps are followed.",
  recommendedImprovements: [
    "Schedule a 3-hour focused block for the Pitch Deck before noon today.",
    "Delegate or split the Financial Audit review into two separate days.",
    "Utilize your 10-day buffer on Documentation to prioritize high-risk items."
  ]
};

export default function Dashboard({ 
  tasks, 
  onToggleTask, 
  onSelectTaskForRecovery, 
  onNavigate, 
  isDemoMode = false,
  syncConfirmation = null,
  onDismissSyncConfirmation,
  onUpdateTaskRisk,
  onUpdateTaskRecovery,
  onToggleSession,
  onIncrementMissedMilestone,
  user,
  onSyncCalendarPress
}: DashboardProps) {
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  
  // Real-time slider simulation delay state
  const [delayDays, setDelayDays] = useState<number>(0);
  const [selectedTaskNodeId, setSelectedTaskNodeId] = useState<string | null>(
    activeTasks.length > 0 ? activeTasks[0].id : null
  );

  // Risk evaluation and plan calculation loader states
  const [analyzingTaskId, setAnalyzingTaskId] = useState<string | null>(null);
  const [generatingTaskId, setGeneratingTaskId] = useState<string | null>(null);
  const [planErrorMsg, setPlanErrorMsg] = useState<Record<string, string>>({});

  // Dynamic formula helper to evaluate a task's state in the selected Future Delay Alternate Timeline
  const getDelayedTaskState = (task: Task, delay: number) => {
    const dDate = new Date(task.deadline + "T23:59:59");
    const today = new Date();
    today.setHours(0,0,0,0);
    dDate.setHours(0,0,0,0);
    const diffTime = dDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0.1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // Remaining time compressed by delay
    const dynamicDaysRemaining = Math.max(0, daysRemaining - delay);
    const hrs = task.estimatedHours || 3;
    const initialRisk = task.riskScore || 30;
    
    // Risk increments exponentially with fewer remaining days
    const delayImpact = delay * 12 + (delay > 0 ? (hrs / Math.max(dynamicDaysRemaining, 0.5)) * 14 : 0);
    const dynamicRiskScore = Math.min(100, Math.round(initialRisk + delayImpact));
    
    let dynamicLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (dynamicRiskScore >= 80) dynamicLevel = 'critical';
    else if (dynamicRiskScore >= 55) dynamicLevel = 'high';
    else if (dynamicRiskScore >= 35) dynamicLevel = 'moderate';

    const dynamicFailureProbability = Math.min(100, Math.round((task.failureProbability || initialRisk) + delay * 11));
    const dynamicHoursRequiredPerDay = dynamicDaysRemaining > 0 
      ? Math.round((hrs / dynamicDaysRemaining) * 10) / 10 
      : hrs;

    // Extreme compression means missed deadline!
    const isMissed = dynamicDaysRemaining < 1 || (hrs / Math.max(dynamicDaysRemaining, 0.1)) > 6.5;

    return {
      riskScore: dynamicRiskScore,
      riskLevel: dynamicLevel,
      failureProbability: dynamicFailureProbability,
      daysRemaining: Math.max(0, Math.round(dynamicDaysRemaining)),
      hoursRequiredPerDay: dynamicHoursRequiredPerDay,
      isMissed
    };
  };

  // Portfolio-wide dynamic stats based on chosen delay simulation
  const dynamicActiveStates = activeTasks.map(t => ({
    id: t.id,
    original: t,
    simulated: getDelayedTaskState(t, delayDays)
  }));

  const dynamicMissedCount = dynamicActiveStates.filter(ds => ds.simulated.isMissed).length;
  const dynamicAvgRisk = dynamicActiveStates.length > 0
    ? Math.round(dynamicActiveStates.reduce((acc, ds) => acc + ds.simulated.riskScore, 0) / dynamicActiveStates.length)
    : 0;
  const dynamicAvgSuccess = 100 - dynamicAvgRisk;

  const getBriefingCards = (): GlassCardItem[] => {
    if (!intelReport) return [];
    const cards: GlassCardItem[] = [];

    // Card 1: Daily Overview Briefing
    cards.push({
      id: "briefing-overview",
      title: intelReport.dailyBriefing?.greeting || "Daily Analysis Briefing",
      subtitle: "Dynamic Agenda",
      mainText: `${intelReport.summaryText} ${intelReport.dailyBriefing?.todayTargetText || ""}`,
      tags: [
        { text: `Active Items: ${intelReport.dailyBriefing?.activeCount || activeTasks.length}`, type: "featured" }
      ],
      stats: [
        { icon: Bookmark, text: `Priority: ${intelReport.dailyBriefing?.mostImportantTask || "N/A"}` }
      ],
      avatarGradient: "linear-gradient(135deg, #10b981, #34d399)"
    });

    // Card 2: Highest Risk Task Assessment
    if (intelReport.highestRiskTask) {
      cards.push({
        id: "briefing-risk",
        title: "High Risk Assessment",
        subtitle: intelReport.highestRiskTask.title,
        mainText: `${intelReport.highestRiskTask.reason} ${intelReport.highestRiskTask.prediction}`,
        tags: [
          { text: "CRITICAL", type: "danger" }
        ],
        stats: [
          { icon: ShieldAlert, text: "Focus Required" }
        ],
        avatarGradient: "linear-gradient(135deg, #ef4444, #b91c1c)"
      });
    }

    // Card 3: Deadline Conflicts
    if (intelReport.deadlineConflicts && intelReport.deadlineConflicts.conflictDetected) {
      cards.push({
        id: "briefing-conflict",
        title: "Timeline Intersections",
        subtitle: "Overlapping Deadlines",
        mainText: intelReport.deadlineConflicts.description,
        tags: [
          { text: "CONFLICT DETECTED", type: "warning" }
        ],
        stats: [
          { icon: Zap, text: "Action Plan Configured" }
        ],
        avatarGradient: "linear-gradient(135deg, #f59e0b, #d97706)"
      });
    }

    // Card 4: AI Coaching Guidance
    if (intelReport.unifiedRecommendation) {
      cards.push({
        id: "briefing-recommendation",
        title: "AI Coaching Insight",
        subtitle: "Recommended Pace Strategy",
        mainText: intelReport.unifiedRecommendation,
        tags: [
          { text: "COACHING", type: "success" }
        ],
        stats: [
          { icon: Sparkles, text: "Optimized Roadmap" }
        ],
        avatarGradient: "linear-gradient(135deg, #10b981, #34d399)"
      });
    }

    return cards;
  };

  // AI generative reports triggers
  const [intelReport, setIntelReport] = useState<IntelligenceReport | null>(() => {
    try {
      const cached = localStorage.getItem("guardian_ai_cached_intel");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [reflection, setReflection] = useState<ReflectionInsights | null>(() => {
    try {
      const cached = localStorage.getItem("guardian_ai_cached_reflection");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [showSecondaryDetails, setShowSecondaryDetails] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAIReports = async () => {
      if (isDemoMode) {
        setLoading(true);
        setErrorState(null);
        setTimeout(() => {
          if (active) {
            const activeCount = tasks.filter(t => !t.completed).length;
            const updatedBriefing = {
              ...demoIntelReport,
              dailyBriefing: demoIntelReport.dailyBriefing ? {
                ...demoIntelReport.dailyBriefing,
                activeCount
              } : undefined
            };
            setIntelReport(updatedBriefing);
            setReflection(demoReflection);
            setLoading(false);
          }
        }, 150);
        return;
      }

      // If we already have cached reports on initial load (refreshTrigger === 0),
      // do not fetch again to prevent exhausting the Gemini API quota.
      if (refreshTrigger === 0 && intelReport && reflection) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorState(null);

        const [intelRes, reflectRes] = await Promise.all([
          fetch("/api/intelligence-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tasks })
          }),
          fetch("/api/reflection-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tasks })
          })
        ]);

        if (!intelRes.ok || !reflectRes.ok) {
          throw new Error("Unable to connect to the prediction server.");
        }

        const intelData = await intelRes.json();
        const reflectData = await reflectRes.json();

        if (active) {
          setIntelReport(intelData);
          setReflection(reflectData);
          try {
            localStorage.setItem("guardian_ai_cached_intel", JSON.stringify(intelData));
            localStorage.setItem("guardian_ai_cached_reflection", JSON.stringify(reflectData));
          } catch (e) {
            console.error("Failed to cache AI reports to localStorage:", e);
          }
        }
      } catch (err: any) {
        console.warn("Dashboard AI analysis failed:", err);
        if (active) {
          setErrorState("We couldn't load your personalized AI predictions right now. Showing default guidelines.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (tasks.length > 0) {
      fetchAIReports();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [refreshTrigger, tasks.length, isDemoMode]);

  const categories = ["Work", "Study", "Finance", "Life", "Personal"];
  const categoryStats = categories.map(cat => {
    const total = activeTasks.filter(t => t.category === cat).length;
    const percent = activeTasks.length > 0 ? Math.round((total / activeTasks.length) * 100) : 0;
    return { name: cat, total, percent };
  });

  // Action Plan Generator Fetch Call
  const handleGeneratePlanForTask = async (task: Task) => {
    setGeneratingTaskId(task.id);
    setPlanErrorMsg(prev => ({ ...prev, [task.id]: "" }));

    try {
      const res = await fetch("/api/recovery-planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          estimatedHours: task.estimatedHours,
          category: task.category,
          currentProgress: 0,
          missedCount: task.missedMilestonesCount || 0
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to load recovery plan from the server");
      }

      const planData = await res.json();
      
      const newPlan: RecoveryPlan = {
        overallStrategy: planData.overallStrategy,
        sessions: planData.sessions.map((s: any) => ({
          ...s,
          completed: false
        })),
        recalcCount: 0,
        rebuiltAt: new Date().toISOString().split('T')[0]
      };

      if (onUpdateTaskRecovery) {
        onUpdateTaskRecovery(task.id, newPlan);
      }

    } catch (err: any) {
      console.error(err);
      setPlanErrorMsg(prev => ({ ...prev, [task.id]: "Offline backup plan created." }));
      
      const totalHours = task.estimatedHours;
      const partHours = Math.round(totalHours / 3) || 1;
      const today = new Date();
      
      const sessionList: TaskSession[] = [
        {
          id: "s1",
          title: "Get started, drafts, and planning",
          durationHours: partHours,
          dueDate: new Date(today.getTime() + 24*3600*1000).toISOString().split('T')[0],
          completed: false
        },
        {
          id: "s2",
          title: "Drafting and main building",
          durationHours: partHours,
          dueDate: new Date(today.getTime() + 48*3600*1000).toISOString().split('T')[0],
          completed: false
        },
        {
          id: "s3",
          title: "Polishing details and final touchups",
          durationHours: partHours,
          dueDate: task.deadline,
          completed: false
        }
      ];

      if (onUpdateTaskRecovery) {
        onUpdateTaskRecovery(task.id, {
          overallStrategy: "Divide your total work hours into a few simple sessions before the deadline.",
          sessions: sessionList,
          recalcCount: 1,
          rebuiltAt: today.toISOString().split("T")[0]
        });
      }

    } finally {
      setGeneratingTaskId(null);
    }
  };

  // Recalculator Fetch Call
  const handleRecalculatePlanForTask = async (task: Task) => {
    if (!task.recoveryPlan) return;
    setGeneratingTaskId(task.id);
    setPlanErrorMsg(prev => ({ ...prev, [task.id]: "" }));

    if (onIncrementMissedMilestone) {
      onIncrementMissedMilestone(task.id);
    }
    const updatedMissedCount = (task.missedMilestonesCount || 0) + 1;

    try {
      const res = await fetch("/api/recovery-planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          estimatedHours: task.estimatedHours,
          category: task.category,
          currentProgress: Math.round(
            (task.recoveryPlan.sessions.filter(s => s.completed).length / task.recoveryPlan.sessions.length) * 100
          ),
          missedCount: updatedMissedCount,
          missedSessionsCount: task.recoveryPlan.sessions.filter(s => s.missed).length
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to connect to the AI model.");
      }

      const planData = await res.json();
      
      const newPlan: RecoveryPlan = {
        overallStrategy: planData.overallStrategy,
        sessions: planData.sessions.map((s: any) => ({
          ...s,
          completed: false
        })),
        recalcCount: task.recoveryPlan.recalcCount + 1,
        rebuiltAt: new Date().toISOString().split('T')[0]
      };

      if (onUpdateTaskRecovery) {
        onUpdateTaskRecovery(task.id, newPlan);
      }

    } catch (err) {
      console.error(err);
      setPlanErrorMsg(prev => ({ ...prev, [task.id]: "Updated your schedule offline." }));
      
      const today = new Date();
      const updatedSessions = task.recoveryPlan.sessions.map((s, idx) => {
        if (s.completed) return s;
        const offset = idx + 1;
        const targetDate = new Date(today.getTime() + offset * 24 * 3600 * 1000);
        return {
          ...s,
          dueDate: targetDate.toISOString().split("T")[0]
        };
      });

      if (onUpdateTaskRecovery) {
        onUpdateTaskRecovery(task.id, {
          overallStrategy: "Pushed remaining sessions forward to help you catch up.",
          sessions: updatedSessions,
          recalcCount: task.recoveryPlan.recalcCount + 1,
          rebuiltAt: today.toISOString().split('T')[0]
        });
      }
    } finally {
      setGeneratingTaskId(null);
    }
  };

  // Real-time Risk Prediction calculation on-demand
  const handleRunRiskAnalysis = async (task: Task) => {
    setAnalyzingTaskId(task.id);
    try {
      const res = await fetch("/api/risk-prediction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          estimatedHours: task.estimatedHours,
          category: task.category,
          priority: task.priority,
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to load prediction from server.");
      }

      const predictedRisk = await res.json();
      if (onUpdateTaskRisk) {
        onUpdateTaskRisk(task.id, {
          riskScore: predictedRisk.riskScore,
          riskLevel: predictedRisk.riskLevel,
          riskExplanation: predictedRisk.riskExplanation,
          riskFactors: predictedRisk.riskFactors,
          failureProbability: predictedRisk.failureProbability,
          recommendedIntervention: predictedRisk.recommendedIntervention,
          mainRiskFactors: predictedRisk.mainRiskFactors,
        });
      }

    } catch (err) {
      console.error(err);
      const fallbackScore = Math.floor(Math.random() * 40) + 40;
      if (onUpdateTaskRisk) {
        onUpdateTaskRisk(task.id, {
          riskScore: fallbackScore,
          riskLevel: fallbackScore > 75 ? "critical" : fallbackScore > 50 ? "high" : fallbackScore > 25 ? "moderate" : "low",
          riskExplanation: "The deadline is coming up fast. We recommend scheduling simple study or work sessions to finish planning and drafting on time.",
          riskFactors: {
            urgencyScore: 70,
            complexityScore: 65,
            bufferSafetyScore: 30
          }
        });
      }
    } finally {
      setAnalyzingTaskId(null);
    }
  };

  const selectedNodeData = dynamicActiveStates.find(ds => ds.id === selectedTaskNodeId);

  return (
    <div id="temporal-outcome-center" className="space-y-6 pb-6 text-slate-100 selection:bg-emerald-500/30">
      
      {/* Demo Mode Notification */}
      {isDemoMode && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-850/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-white tracking-wider">Demo Mode Interactive Sandbox</h4>
              <p className="text-xs text-slate-400 leading-normal font-light mt-0.5">
                We've loaded realistic sample tasks, deadlines, and pre-calculated recovery plans. Drag the simulator slider to see alternate timelines unfold.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span className="text-[10px] text-slate-500 font-mono">No account required</span>
          </div>
        </motion.div>
      )}

      {/* Sync Calendar Feedback Banner */}
      {syncConfirmation?.show && (
        <motion.div 
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.04] to-[#0b1220]/40 border border-emerald-500/35 shadow-[0_0_35px_rgba(16,185,129,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-5"
        >
          <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
              <CalendarCheck size={22} className="animate-bounce" />
            </div>
            
            <div className="space-y-1.5 text-left">
              <h3 className="text-sm sm:text-base font-display font-bold text-white tracking-tight">
                {syncConfirmation.sessionsCount} focus sessions synchronized with Google Calendar
              </h3>
              <div className="space-y-1">
                <p className="text-xs text-slate-350 leading-relaxed font-light">
                  <span className="text-emerald-400 font-semibold font-mono text-[10px] tracking-wider mr-1.5 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Next Focus Block</span> 
                  <strong className="text-white font-medium">{syncConfirmation.nextSessionTitle}</strong>
                </p>
                <p className="text-xs text-slate-400 font-light flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Scheduled: <span className="font-mono text-emerald-300 font-medium">{syncConfirmation.nextSessionTime}</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
            <button
              onClick={onDismissSyncConfirmation}
              className="px-3.5 py-2 bg-[#0b1220]/60 hover:bg-[#0b1220]/90 border border-white/8 text-slate-450 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* =======================================
          HERO ELEMENT: THE TEMPORAL PROJECTION BAR
          ======================================= */}
      <div className="bg-[#111111] border border-white/5 p-6 md:p-8 rounded-2xl relative overflow-hidden space-y-6 shadow-sm">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 text-white/70 text-[11px] font-medium rounded-full uppercase tracking-widest">
            <Cpu size={12} className="text-white/40" /> Temporal Outcome Sandbox
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">
            How does procrastination alter your outcome?
          </h2>
          <p className="text-base text-white/50 leading-relaxed font-light">
            Drag the slider to simulate delaying your work. Watch how deadlines compress and stress levels spike.
          </p>
        </div>

        {/* The Futuristic Control Slider */}
        <div className="max-w-xl mx-auto space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs text-white/40 px-2 font-medium tracking-wide">
            <span>0 Days (Paced Flow)</span>
            <span>7 Days (Max Delay)</span>
          </div>
          <div className="relative flex items-center py-2">
            <input
              type="range"
              min="0"
              max="7"
              value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>
          <div className="flex justify-center mt-4">
            <motion.div 
               key={delayDays}
               initial={{ scale: 0.98, opacity: 0.8 }}
               animate={{ scale: 1, opacity: 1 }}
               className={`inline-flex items-center gap-2 text-sm font-medium py-2 px-5 rounded-full border transition-colors ${
                delayDays === 0
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : delayDays <= 3
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              <Clock size={16} />
              Simulated Delay: {delayDays} {delayDays === 1 ? "Day" : "Days"}
            </motion.div>
          </div>
        </div>

        {/* =======================================
            CLEAN NOTION-STYLE SPLIT VIEW COMPARISON
            ======================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          
          {/* FUTURE A: DELAYED PATH */}
          <div className={`rounded-2xl p-6 border transition-all duration-300 ${delayDays > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-[#161616]'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <span className={`text-sm font-semibold tracking-wide flex items-center gap-2 ${delayDays > 0 ? 'text-red-400' : 'text-white/60'}`}>
                <TrendingDown size={18} /> If You Wait
              </span>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <span className="text-xs text-white/40 block mb-1 uppercase tracking-wider font-semibold">Expected Missed Deadlines</span>
                <span className={`text-3xl font-bold ${dynamicMissedCount > 0 ? "text-red-400" : "text-white"}`}>
                  {dynamicMissedCount}
                </span>
              </div>
              
              <div>
                <span className="text-xs text-white/40 block mb-1 uppercase tracking-wider font-semibold">Peak Daily Workload</span>
                <span className="text-xl font-medium text-white/80 block">
                  {delayDays === 0 ? "1.5 hours" : delayDays <= 3 ? "3.2 hours" : "7.5+ hours (Overload)"}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm text-white/50 leading-relaxed">
                {delayDays === 0 
                  ? "Delaying starting on tasks will instantly compress your remaining hours."
                  : `Postponing for ${delayDays} day${delayDays === 1 ? '' : 's'} forces you to compress massive work sessions into a tight window.`
                }
              </p>
            </div>
          </div>

          {/* FUTURE B: PACED PATH */}
          <div className="rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <span className="text-sm font-semibold text-emerald-400 tracking-wide flex items-center gap-2">
                <ShieldCheck size={18} /> AI Recommended Plan
              </span>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <span className="text-xs text-emerald-500/60 block mb-1 uppercase tracking-wider font-semibold">Expected Missed Deadlines</span>
                <span className="text-3xl font-bold text-emerald-400">
                  0
                </span>
              </div>
              
              <div>
                <span className="text-xs text-emerald-500/60 block mb-1 uppercase tracking-wider font-semibold">Peak Daily Workload</span>
                <span className="text-xl font-medium text-emerald-100/80 block">
                  1.5 hours (Paced)
                </span>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm text-emerald-100/60 leading-relaxed">
                Steadily breaking your effort down into daily micro-sessions eliminates cramming and guarantees flawless delivery with zero stress.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* =======================================
          CO-PILOT AI BRIEFING (HUD BAR)
          ======================================= */}
      {intelReport && (
        <div className="relative overflow-hidden rounded-2xl bg-[#161616] border border-white/5 p-6 shadow-sm space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/80 font-medium tracking-wide">
              <Sparkles size={14} className={loading ? "animate-pulse" : "text-white/60"} /> Your AI Assistant
            </div>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              className="inline-flex items-center h-8 px-4 bg-white/5 hover:bg-white/10 text-xs text-white font-medium rounded-full border border-white/10 cursor-pointer disabled:opacity-40 transition-colors"
            >
              {loading ? "Thinking..." : "Refresh Insights"}
            </button>
          </div>

          <div>
            {loading ? (
              <div className="space-y-3 py-8 max-w-md mx-auto text-center">
                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/60 animate-spin mx-auto" />
                <p className="text-xs font-medium text-white/50 tracking-wide">Analyzing your workload...</p>
              </div>
            ) : (
              <div className="pt-2">
                <GlassStackCard
                  items={getBriefingCards()}
                  visibleBehind={2}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          THE TEMPORAL PROGRESS PATH (INTERCONNECTED ROADMAP NODES)
          ========================================================= */}
      {activeTasks.length === 0 ? (
        <div className="bg-[#111111] border border-dashed border-white/10 p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
          <ShieldCheck size={36} className="mx-auto text-emerald-400 opacity-80" />
          <div>
            <h4 className="text-lg font-medium text-white">All Clear</h4>
            <p className="text-sm text-white/50 mt-2 leading-relaxed">
              You have no active deadlines right now. Track a new project to simulate the roadmap.
            </p>
          </div>
          <button
            onClick={() => onNavigate("add-task")}
            className="px-6 py-3 mt-4 bg-white text-black font-semibold text-sm rounded-full hover:bg-gray-200 transition-colors"
          >
            Track New Deadline
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          
          {/* Left Column: Vertical Interactive Connecting Path */}
          <div className="lg:col-span-6 bg-[#111111] border border-white/5 p-6 rounded-2xl relative space-y-6 shadow-sm">
            <div className="text-xs font-semibold text-white/40 tracking-widest pb-4 border-b border-white/5 flex items-center justify-between uppercase">
              <span>Your Roadmap</span>
              <span>Select to Inspect</span>
            </div>

            {/* The physical path */}
            <div className="relative pl-8 space-y-6">
              
              {/* Connecting vertical line */}
              <div className="absolute top-4 bottom-4 left-[15px] w-[2px] bg-white/5" />

              {dynamicActiveStates.map((item, idx) => {
                const task = item.original;
                const simState = item.simulated;
                const active = task.id === selectedTaskNodeId;
                
                // Color selection
                let nodeColorClass = "bg-emerald-500 ring-emerald-500/20";
                let badgeLabel = "Secure";
                let badgeColorClass = "text-emerald-400 bg-emerald-500/10";

                if (simState.isMissed) {
                  nodeColorClass = "bg-red-500 ring-red-500/30 animate-pulse";
                  badgeLabel = "Delayed";
                  badgeColorClass = "text-red-400 bg-red-500/10";
                } else if (simState.riskScore >= 70) {
                  nodeColorClass = "bg-red-400 ring-red-400/20";
                  badgeLabel = "At Risk";
                  badgeColorClass = "text-red-400 bg-red-500/10";
                } else if (simState.riskScore >= 45) {
                  nodeColorClass = "bg-amber-500 ring-amber-500/20";
                  badgeLabel = "Shrinking Buffer";
                  badgeColorClass = "text-amber-400 bg-amber-500/10";
                }

                return (
                  <motion.div
                    key={task.id}
                    layoutId={`node-container-${task.id}`}
                    onClick={() => {
                      setSelectedTaskNodeId(task.id);
                      setPlanErrorMsg(prev => ({ ...prev, [task.id]: "" }));
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group ${
                      active
                        ? "bg-white/5 border-white/20 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Floating connected circular point indicator */}
                    <div className="absolute top-6 left-[-35px] w-5 h-5 rounded-full bg-[#111111] flex items-center justify-center z-10">
                      <div className={`w-2.5 h-2.5 rounded-full ${nodeColorClass} ring-4 ${nodeColorClass}`} />
                    </div>

                    <div className="space-y-2 truncate max-w-xs">
                      <h4 className="font-display font-semibold text-white text-base truncate">
                        {task.title}
                      </h4>
                      <p className="text-sm text-white/50">
                        Due {task.deadline}
                      </p>
                    </div>

                    {/* Node status indicators */}
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColorClass}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep Predictor & Action Plan Inspector */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              {selectedNodeData ? (
                <motion.div
                  key={selectedNodeData.id}
                  initial={{ opacity: 0, scale: 0.98, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="bg-[#161616] border border-white/5 p-6 rounded-2xl relative space-y-6 shadow-sm text-left"
                >
                  
                  {/* Inspector Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-white/40 uppercase tracking-widest">
                        Your Progress
                      </div>
                      <h3 className="font-display font-semibold text-white text-xl leading-tight">
                        {selectedNodeData.original.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => onToggleTask(selectedNodeData.id)}
                      className="px-4 py-2 bg-white hover:bg-gray-200 text-black text-sm font-semibold rounded-full cursor-pointer transition shrink-0"
                    >
                      Complete
                    </button>
                  </div>

                  {/* Slider Adaptive Risk Panel */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                      Chance of Missing Deadline
                    </h4>

                    {/* The Bento Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center">
                        <span className="text-xs text-white/50 font-medium block mb-1">Success</span>
                        <span className={`text-xl font-bold block ${selectedNodeData.simulated.riskScore >= 70 ? "text-red-400" : "text-white"}`}>
                          {100 - selectedNodeData.simulated.riskScore}%
                        </span>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center">
                        <span className="text-xs text-white/50 font-medium block mb-1">Time Left</span>
                        <span className="text-xl font-bold text-white block">
                          {selectedNodeData.simulated.daysRemaining}d
                        </span>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center">
                        <span className="text-xs text-white/50 font-medium block mb-1">Daily Work</span>
                        <span className={`text-xl font-bold block ${selectedNodeData.simulated.hoursRequiredPerDay > 3.5 ? "text-red-400" : "text-white"}`}>
                          {selectedNodeData.simulated.hoursRequiredPerDay}h/d
                        </span>
                      </div>
                    </div>

                    {/* Delay warning callouts */}
                    {selectedNodeData.simulated.isMissed ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                        <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-left">
                          <span className="text-sm font-semibold text-red-400 block">Critical Crunch</span>
                          <p className="text-sm text-red-200/80 leading-relaxed">
                            Delaying this task means you will not have enough hours in the day to finish it.
                          </p>
                        </div>
                      </div>
                    ) : selectedNodeData.simulated.riskScore >= 65 ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                        <Flame size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-200/80 leading-relaxed font-normal">
                          You are approaching the danger zone. Follow the recovery plan below to spread out the work.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
                        <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-emerald-200/80 leading-relaxed font-normal">
                          You have plenty of time. Stick to a steady pace and you'll finish early.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Why At Risk Panel */}
                  {selectedNodeData.original.riskScore ? (
                    <details className="group border-t border-white/5 pt-4">
                      <summary className="text-xs font-semibold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white/60 transition-colors flex items-center justify-between">
                        See AI Insights
                        <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                      </summary>
                      <p className="text-sm text-white/60 leading-relaxed font-light mt-4 pl-4 border-l-2 border-white/10">
                        {selectedNodeData.original.riskExplanation || "The timeline requires disciplined pacing."}
                      </p>
                    </details>
                  ) : (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between gap-4 text-left">
                      <div>
                        <span className="text-xs text-white/50 font-medium block">Evaluation State</span>
                        <p className="text-sm text-white/80 font-light mt-1">This task has not been analyzed by the coach yet.</p>
                      </div>
                      <button
                        onClick={() => handleRunRiskAnalysis(selectedNodeData.original)}
                        disabled={analyzingTaskId === selectedNodeData.id}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-full border border-white/10 cursor-pointer disabled:opacity-40 transition shrink-0"
                      >
                        {analyzingTaskId === selectedNodeData.id ? "Analyzing..." : "Analyze Risk"}
                      </button>
                    </div>
                  )}

                  {/* =====================================
                      ACTION ROADMAP & FOCUS CHECKLIST
                      ===================================== */}
                  <div className="border-t border-white/5 pt-4 space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <Compass size={14} className="text-white/60" /> Catch-Up Action Roadmap
                      </h4>
                      {selectedNodeData.original.recoveryPlan && (
                        <button
                          onClick={() => handleRecalculatePlanForTask(selectedNodeData.original)}
                          disabled={generatingTaskId === selectedNodeData.id}
                          className="text-xs font-semibold text-white/60 hover:text-white px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 cursor-pointer disabled:opacity-40 transition flex items-center gap-1.5"
                          title="Fallen behind? Recreate step intervals instantly"
                        >
                          <Zap size={12} /> {generatingTaskId === selectedNodeData.id ? "Recalculating..." : "Recalculate"}
                        </button>
                      )}
                    </div>

                    {planErrorMsg[selectedNodeData.id] && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
                        <AlertOctagon size={16} /> {planErrorMsg[selectedNodeData.id]}
                      </div>
                    )}

                    {selectedNodeData.original.recoveryPlan ? (
                      <div className="space-y-4">
                        <p className="text-sm text-white/80 bg-white/5 p-4 rounded-xl border border-white/10 font-light leading-relaxed">
                          <strong className="text-xs text-white/40 uppercase tracking-widest block mb-2 font-semibold">AI Action Strategy:</strong>
                          {selectedNodeData.original.recoveryPlan.overallStrategy}
                        </p>

                        {/* List of focus sessions */}
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 no-scrollbar">
                          {selectedNodeData.original.recoveryPlan.sessions.map((session: TaskSession, idx) => {
                            const overdue = !session.completed && session.dueDate < new Date().toISOString().split('T')[0];
                            return (
                              <div
                                key={session.id}
                                className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all ${
                                  session.completed
                                    ? "bg-transparent border-white/5 opacity-50"
                                    : overdue
                                    ? "bg-red-500/5 border-red-500/20 shadow-sm"
                                    : "bg-[#111111] border-white/10"
                                }`}
                              >
                                <div className="flex items-center gap-4 truncate">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => {
                                      if (onToggleSession) {
                                        onToggleSession(selectedNodeData.id, session.id, session.completed ? 'pending' : 'completed');
                                      }
                                    }}
                                    className="p-1 border border-white/20 hover:border-white/50 rounded-lg bg-transparent cursor-pointer text-white/50 hover:text-white transition-colors"
                                  >
                                    {session.completed ? (
                                      <CheckCircle2 size={16} className="text-white" />
                                    ) : (
                                      <div className="w-4 h-4 bg-transparent" />
                                    )}
                                  </button>

                                  <div className="truncate text-left space-y-1">
                                    <span className={`text-base block truncate font-medium ${session.completed ? "line-through text-white/50" : "text-white/90"}`}>
                                      {idx + 1}. {session.title}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-white/40">
                                      <Calendar size={12} /> Due: {session.dueDate} &bull; <Clock size={12} /> {session.durationHours} hrs
                                      {session.missed && (
                                        <span className="text-red-400 font-bold ml-2">MISSED</span>
                                      )}
                                      {overdue && (
                                        <span className="text-red-400 font-bold ml-2 animate-pulse">OVERDUE</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Session custom check-off actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {!session.completed && onToggleSession && (
                                    <button
                                      onClick={() => onToggleSession(selectedNodeData.id, session.id, 'missed')}
                                      className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/20 rounded-lg transition-colors"
                                      title="Mark as missed to log a delay"
                                    >
                                      Missed
                                    </button>
                                  )}
                                  {session.googleEventId ? (
                                    <span className="px-3 py-1 bg-emerald-500/10 text-xs font-semibold text-emerald-400 border border-emerald-500/20 rounded-lg">
                                      Synced to Cal
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Sync focus sessions to Google calendar link */}
                        <div className="pt-4 flex justify-between items-center text-xs font-semibold text-white/40">
                          <span>Calendar Integration</span>
                          <button
                            onClick={() => {
                              if (!user && onSyncCalendarPress) {
                                onSyncCalendarPress();
                              } else {
                                onNavigate("insights");
                              }
                            }}
                            className="text-white hover:text-white/80 transition-colors flex items-center gap-1 font-semibold underline underline-offset-4"
                          >
                            Synchronize Sessions to Google Calendar &rarr;
                          </button>
                        </div>

                      </div>
                    ) : (
                      <div className="p-8 bg-white/5 border border-dashed border-white/20 rounded-2xl text-center space-y-4">
                        <Compass size={28} className="mx-auto text-white/40" />
                        <div>
                          <span className="text-sm font-semibold text-white uppercase tracking-widest block">No Roadmap Yet</span>
                          <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto mt-2 font-light">
                            Let the AI Coach break this project's remaining hours down into step-by-step paced focus intervals ahead of your deadline.
                          </p>
                        </div>
                        <button
                          onClick={() => handleGeneratePlanForTask(selectedNodeData.original)}
                          disabled={generatingTaskId === selectedNodeData.id}
                          className="px-6 py-2.5 mt-4 bg-white text-black font-semibold text-sm rounded-full hover:bg-gray-200 cursor-pointer transition-colors inline-flex items-center gap-2"
                        >
                          {generatingTaskId === selectedNodeData.id ? (
                            <>Calculating Roadmap...</>
                          ) : (
                            <>
                              <Zap size={14} /> Generate Action Plan
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                </motion.div>
              ) : (
                <div className="bg-[#0b1220] border border-white/8 p-12 rounded-3xl text-center text-slate-500 font-light text-xs">
                  Select a task node from the roadmap list to inspect its Alternate Future timelines.
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

      {/* =======================================
          SECONDARY COLLAPSIBLE HUD (DETAILED HISTORIC INSIGHTS)
          ======================================= */}
      <div className="border-t border-white/5 pt-6 mt-8">
        <div className="flex justify-center">
          <button
            onClick={() => setShowSecondaryDetails(!showSecondaryDetails)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-full text-white/60 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
          >
            {showSecondaryDetails ? "Hide Diagnostics" : "Show Habit Diagnostics"}
            <ChevronRight size={14} className={`transition-transform ${showSecondaryDetails ? "rotate-90" : ""}`} />
          </button>
        </div>

        {showSecondaryDetails && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 overflow-hidden"
          >
            {/* diagnostic 1 */}
            <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-white/40 tracking-widest flex items-center gap-2 border-b border-white/5 pb-4 uppercase">
                <UserCheck size={16} className="text-white/60" /> Dynamic Habits Analysis
              </h3>
              
              {loading ? (
                <div className="space-y-3">
                  <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                  <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                </div>
              ) : reflection && reflection.insights && reflection.insights.length > 0 ? (
                <div className="space-y-4">
                  {reflection.insights.map((insight, idx) => {
                    const labelColor = insight.category === "advantage" 
                      ? "text-emerald-400" 
                      : insight.category === "risk" 
                        ? "text-red-400" 
                        : "text-amber-500";
                    return (
                      <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1 text-left">
                        <div className={`text-xs font-bold ${labelColor} uppercase tracking-widest`}>
                           {insight.title}
                        </div>
                        <p className="text-sm text-white/60 font-light leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    );
                  })}
                  
                  {reflection.workloadTrends && (
                    <div className="pt-4 text-xs font-semibold text-white/40 leading-relaxed border-t border-white/5 text-left">
                      <span className="text-white/60 block mb-1">Progress trend index:</span>
                      "{reflection.workloadTrends}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-left">
                  <p className="text-sm text-white/50 font-light italic leading-relaxed">
                    Log some milestones and work habits to unlock custom behavioral predictions.
                  </p>
                </div>
              )}
            </div>

            {/* diagnostic 2 */}
            <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl shadow-sm text-left space-y-4">
              <h3 className="text-xs font-semibold text-white/40 tracking-widest flex items-center gap-2 border-b border-white/5 pb-4 uppercase">
                <TrendingUp size={16} className="text-white/60" /> Portfolio Category Load
              </h3>
              
              <div className="space-y-4">
                {categoryStats.map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                      <span>{cat.name}</span>
                      <span className="text-white">{cat.total} task{cat.total === 1 ? "" : "s"} ({cat.percent}%)</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500" 
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* diagnostic 3 */}
            <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl shadow-sm text-left space-y-4">
              <h3 className="text-xs font-semibold text-white/40 tracking-widest flex items-center gap-2 border-b border-white/5 pb-4 uppercase">
                <CheckCircle2 size={16} className="text-white/60" /> Logged Milestones
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                {completedTasks.length === 0 ? (
                  <p className="text-sm text-white/50 font-light italic leading-relaxed">No completed milestones recorded yet in this session.</p>
                ) : (
                  completedTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <CheckCircle2 size={16} className="text-white/40 shrink-0" />
                      <span className="text-sm text-white/60 truncate line-through">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
}
