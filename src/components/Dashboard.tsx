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
      <div className="bg-[#0b1220] border border-white/8 p-4 md:p-5 rounded-2xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/45 text-emerald-400 border border-emerald-900/25 text-[9px] font-mono rounded-full uppercase tracking-wider font-bold">
            <Cpu size={10} className="text-emerald-400 animate-spin" /> Temporal Outcome Sandbox
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            How does procrastinating alter your future?
          </h2>
          <p className="text-sm text-slate-300 leading-normal font-normal">
            Drag the temporal delay slider to simulate putting off starting on your workload. Watch how deadlines collapse, workloads compress, and stress rates spike in real-time.
          </p>
        </div>

        {/* The Futuristic Control Slider */}
        <div className="max-w-xl mx-auto space-y-2 pt-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>0 Days (Paced Flow)</span>
            <span>7 Days (1 Week)</span>
          </div>
          <div className="relative flex items-center py-1">
            <input
              type="range"
              min="0"
              max="7"
              value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 border border-white/8 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-center">
            <motion.div 
               key={delayDays}
               initial={{ scale: 0.95, opacity: 0.8 }}
               animate={{ scale: 1, opacity: 1 }}
               className={`inline-flex items-center gap-2 font-mono text-xs font-bold py-1.5 px-4 rounded-xl border ${
                delayDays === 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                  : delayDays <= 3
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-red-500/15 border-red-500/35 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              }`}
            >
              <Clock size={13} />
              Simulated Delay: {delayDays} {delayDays === 1 ? "Day" : "Days"}
            </motion.div>
          </div>
        </div>

        {/* =======================================
            HIGH-CONTRAST ALTERNATE FUTURE COMPARISON
            ======================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          {/* FUTURE A: DELAYED PATH (Hot Crimson Gradient) */}
          <motion.div 
            animate={delayDays > 0 ? {
              borderColor: "rgba(239, 68, 68, 0.45)",
              boxShadow: "0 0 20px rgba(239, 68, 68, 0.1)",
              scale: 1.01
            } : {
              borderColor: "rgba(255, 255, 255, 0.08)",
              boxShadow: "none",
              scale: 1
            }}
            transition={{ duration: 0.4 }}
            className="rounded-xl p-4 border relative overflow-hidden text-left bg-[#0b1220] space-y-3"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-white/8 pb-2">
              <span className="text-xs font-mono font-bold text-red-400 tracking-wider flex items-center gap-1.5 uppercase">
                <TrendingDown size={14} className={delayDays > 0 ? "animate-bounce" : ""} /> Future A: Procrastination Cram
              </span>
              <span className="text-[10px] font-mono text-red-500/80 bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded-full font-bold">
                Cramming Trajectory
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="p-2 bg-slate-950/50 border border-white/8 rounded-xl">
                <span className="text-[8px] text-slate-500 block uppercase">Missed Deadlines</span>
                <span className={`text-base font-bold block mt-0.5 ${dynamicMissedCount > 0 ? "text-red-400 animate-pulse" : "text-slate-350"}`}>
                  {dynamicMissedCount}
                </span>
              </div>
              <div className="p-2 bg-slate-950/50 border border-white/8 rounded-xl">
                <span className="text-[8px] text-slate-500 block uppercase">Success Rate</span>
                <span className={`text-base font-bold block mt-0.5 ${delayDays > 0 ? "text-red-400 font-bold" : "text-slate-350"}`}>
                  {dynamicAvgSuccess}%
                </span>
              </div>
              <div className="p-2 bg-slate-950/50 border border-white/8 rounded-xl">
                <span className="text-[8px] text-slate-500 block uppercase">Peak Daily Focus</span>
                <span className="text-base font-bold text-slate-350 block mt-0.5">
                  {delayDays === 0 ? "1.5h" : delayDays <= 3 ? "3.2h" : "7.5h+"}
                </span>
              </div>
            </div>

            {/* Custom SVG Path representing compression stress spike */}
            <div className="h-14 w-full bg-slate-950/50 rounded-xl border border-white/8 flex items-center justify-center relative px-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.02] via-transparent to-transparent pointer-events-none" />
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                {/* Horizontal Baseline */}
                <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,3" />
                
                {/* Simulated stress graph path */}
                <motion.path
                  key={delayDays}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                  d={
                    delayDays === 0
                      ? "M 0 70 Q 25 65, 50 60 T 100 50"
                      : delayDays <= 3
                      ? "M 0 70 Q 25 68, 50 50 T 100 25"
                      : "M 0 75 Q 35 70, 70 30 T 100 5"
                  }
                  fill="none"
                  stroke={delayDays === 0 ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.95)"}
                  strokeWidth="2.5"
                />
                
                {/* Warning dots */}
                {delayDays > 3 && (
                  <>
                    <circle cx="70" cy="30" r="3" fill="#ef4444" className="animate-ping" />
                    <circle cx="100" cy="5" r="4.5" fill="#ef4444" className="animate-pulse" />
                  </>
                )}
              </svg>
              <div className="absolute bottom-2 right-3 font-mono text-[8px] text-red-500 font-bold uppercase tracking-wider">
                {delayDays === 0 ? "Normal Load" : delayDays <= 3 ? "Compression" : "Overload Burst"}
              </div>
            </div>

            <p className="text-xs text-slate-355 font-normal leading-relaxed">
              {delayDays === 0 
                ? "Currently resting in the safe zone. Delaying starting on tasks will instantly compress your remaining hours."
                : `By postponing for ${delayDays} day${delayDays === 1 ? '' : 's'}, you run a serious risk of overload. On the final days, you will be forced to compress massive work sessions with zero breathing space.`
              }
            </p>
          </motion.div>

          {/* FUTURE B: AI-GUARDED PACED PATH (Bright Emerald Glow) */}
          <div className="rounded-xl p-4 border border-emerald-500/20 text-left bg-[#0b1220] space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-white/8 pb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 uppercase">
                <ShieldCheck size={14} className="text-emerald-400" /> Future B: AI-Guarded Paced Pathway
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                Secure Trajectory
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="p-2 bg-slate-950/50 border border-white/8 rounded-xl">
                <span className="text-[8px] text-slate-500 block uppercase">Missed Deadlines</span>
                <span className="text-base font-bold block mt-0.5 text-emerald-400 font-mono font-bold">
                  0
                </span>
              </div>
              <div className="p-2 bg-slate-950/50 border border-white/8 rounded-xl">
                <span className="text-[8px] text-slate-500 block uppercase">Success Rate</span>
                <span className="text-base font-bold block mt-0.5 text-emerald-400 font-mono font-bold">
                  98%
                </span>
              </div>
              <div className="p-2 bg-slate-950/50 border border-white/8 rounded-xl">
                <span className="text-[8px] text-slate-500 block uppercase">Steady Daily Time</span>
                <span className="text-base font-bold text-slate-350 block mt-0.5">
                  1.2h - 1.8h
                </span>
              </div>
            </div>

            {/* Stable SVG Path */}
            <div className="h-14 w-full bg-slate-950/50 rounded-xl border border-white/8 flex items-center justify-center relative px-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.02] via-transparent to-transparent pointer-events-none" />
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,3" />
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                  d="M 0 50 L 30 50 L 60 50 L 100 50"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.95)"
                  strokeWidth="2.5"
                />
                <circle cx="100" cy="50" r="4.5" fill="#10b981" />
              </svg>
              <div className="absolute bottom-2 right-3 font-mono text-[8px] text-emerald-400 font-bold uppercase tracking-wider">
                Steady Flow
              </div>
            </div>

            <p className="text-xs text-slate-355 font-normal leading-relaxed">
              Steadily breaking your effort down into distributed daily micro-sessions eliminates cramming entirely, protects your weekends, and guarantees flawless delivery with maximum peace of mind.
            </p>
          </div>

        </div>

      </div>

      {/* =======================================
          CO-PILOT AI BRIEFING (HUD BAR)
          ======================================= */}
      {intelReport && (
        <div className="relative overflow-hidden rounded-2xl bg-[#0b1220] border border-white/8 p-4 shadow-xl space-y-3 text-left">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent" />
          
          <div className="flex items-center justify-between border-b border-white/8 pb-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/40 border border-emerald-850/35 rounded-md text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
              <Cpu size={12} className={loading ? "animate-spin" : ""} /> Co-Pilot AI Briefing Stack
            </div>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              className="inline-flex items-center h-8 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] text-emerald-400 font-mono font-bold rounded-lg border border-emerald-400/20 cursor-pointer disabled:opacity-40 transition"
            >
              {loading ? "Analyzing..." : "Sync AI Engine"}
            </button>
          </div>

          <div>
            {loading ? (
              <div className="space-y-2 py-6 max-w-md mx-auto text-center">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mx-auto" />
                <p className="text-[10px] font-mono text-emerald-400">Syncing telemetry data...</p>
              </div>
            ) : (
              <div className="pt-1">
                <GlassStackCard
                  items={getBriefingCards()}
                  visibleBehind={2}
                  headerTitle="Predictive Insights Stack"
                  headerSubtitle="Swipe or drag to scan critical timeline updates"
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
        <div className="bg-[#0b1220] border border-dashed border-white/8 p-8 text-center rounded-2xl max-w-lg mx-auto space-y-3">
          <ShieldCheck size={28} className="mx-auto text-emerald-400" />
          <div>
            <h4 className="text-xs font-bold text-white">All Commitments Completed on Time</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-normal font-light">
              Add a new project or homework deadline in the 'Track New Deadline' tab to simulate.
            </p>
          </div>
          <button
            onClick={() => onNavigate("add-task")}
            className="px-3.5 py-1.5 bg-emerald-400 text-[#050816] font-mono text-[10px] rounded-lg hover:bg-[#10b981] transition font-bold"
          >
            Create Task Predictor &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
          
          {/* Left Column: Vertical Interactive Connecting Path */}
          <div className="lg:col-span-6 bg-[#0b1220] border border-white/8 p-4 rounded-2xl relative space-y-3">
            <div className="text-[10px] font-mono text-slate-500 tracking-wider pb-2 border-b border-white/8 flex items-center justify-between">
              <span>ACTIVE PREDICTION ROADMAP</span>
              <span>SELECT NODE TO INSPECT</span>
            </div>

            {/* The physical path */}
            <div className="relative pl-7 space-y-4">
              
              {/* Connecting vertical line */}
              <div className="absolute top-3 bottom-3 left-[13px] w-[2px] bg-gradient-to-b from-emerald-500/30 via-slate-850 to-transparent border-dashed border-l border-white/8" />

              {dynamicActiveStates.map((item, idx) => {
                const task = item.original;
                const simState = item.simulated;
                const active = task.id === selectedTaskNodeId;
                
                // Color selection
                let nodeColorClass = "bg-emerald-500 text-emerald-400 ring-emerald-500/20";
                let badgeLabel = "✓ SECURE";
                let badgeColorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

                if (simState.isMissed) {
                  nodeColorClass = "bg-red-500 text-red-500 ring-red-500/30 animate-pulse";
                  badgeLabel = "💥 DEADLINE IMPACTED";
                  badgeColorClass = "text-red-400 bg-red-500/15 border-red-500/20 animate-pulse";
                } else if (simState.riskScore >= 70) {
                  nodeColorClass = "bg-red-400 text-red-400 ring-red-400/20";
                  badgeLabel = "⚠️ CRITICAL COMPRESSION";
                  badgeColorClass = "text-red-400 bg-red-950/20 border-red-900/30";
                } else if (simState.riskScore >= 45) {
                  nodeColorClass = "bg-amber-500 text-amber-500 ring-amber-500/20";
                  badgeLabel = "⏳ BUFFER SHRINKING";
                  badgeColorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                }

                return (
                  <motion.div
                    key={task.id}
                    layoutId={`node-container-${task.id}`}
                    onClick={() => {
                      setSelectedTaskNodeId(task.id);
                      setPlanErrorMsg(prev => ({ ...prev, [task.id]: "" }));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group ${
                      active
                        ? "bg-emerald-500/5 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                        : "bg-[#0b1220]/50 border-white/8 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]"
                    }`}
                  >
                    {/* Floating connected circular point indicator */}
                    <div className="absolute top-4 left-[-31px] w-4 h-4 rounded-full bg-slate-950 flex items-center justify-center z-10">
                      <div className={`w-2.5 h-2.5 rounded-full ${nodeColorClass.split(" ")[0]} ring-4 ${nodeColorClass.split(" ")[2]}`} />
                    </div>

                    <div className="space-y-1.5 truncate max-w-xs">
                      <div className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1">
                        <Bookmark size={8} /> Category: {task.category}
                      </div>
                      <h4 className="font-sans font-bold text-white text-[13.5px] truncate">
                        {task.title}
                      </h4>
                      <p className="font-mono text-[10px] text-slate-450 leading-none">
                        Due: {task.deadline} &bull; Effort: {task.estimatedHours}h
                      </p>
                    </div>

                    {/* Node status indicators */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColorClass}`}>
                        {badgeLabel}
                      </span>
                      <div className="flex flex-col items-end text-right font-mono text-[10px]">
                        <span className="text-slate-500 font-light">Risk Factor</span>
                        <span className={`font-bold ${simState.riskScore >= 70 ? "text-red-400" : simState.riskScore >= 45 ? "text-amber-400" : "text-emerald-400"}`}>
                          {simState.riskScore}%
                        </span>
                      </div>
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
                  className="bg-[#0b1220] border border-white/8 p-4 rounded-2xl relative space-y-4 shadow-xl text-left"
                >
                  <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  
                  {/* Inspector Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-3">
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-850/45 rounded text-[8px] font-mono text-emerald-400 uppercase">
                        Node Inspector
                      </div>
                      <h3 className="font-sans font-bold text-white text-sm leading-tight tracking-tight">
                        {selectedNodeData.original.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-light max-w-md">
                        {selectedNodeData.original.description || "No project notes configured."}
                      </p>
                    </div>

                    <button
                      onClick={() => onToggleTask(selectedNodeData.id)}
                      className="px-3 py-1 bg-emerald-400 hover:bg-[#10b981] text-[#050816] text-[10px] font-mono font-bold rounded-md cursor-pointer transition shrink-0"
                    >
                      Complete Task
                    </button>
                  </div>

                  {/* Slider Adaptive Risk Panel */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Simulated Timeline Risk Assessment
                    </h4>

                    {/* The Bento Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-slate-950/40 border border-white/8 rounded-xl flex flex-col justify-center">
                        <span className="text-[8px] text-slate-500 font-mono block">COMPLETION CHANCE</span>
                        <span className={`text-sm font-mono font-bold block mt-0.5 ${selectedNodeData.simulated.riskScore >= 70 ? "text-red-400" : "text-emerald-400"}`}>
                          {100 - selectedNodeData.simulated.riskScore}%
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/40 border border-white/8 rounded-xl flex flex-col justify-center">
                        <span className="text-[8px] text-slate-500 font-mono block">DAYS REMAINING</span>
                        <span className="text-sm font-mono font-bold text-white block mt-0.5">
                          {selectedNodeData.simulated.daysRemaining}d
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/40 border border-white/8 rounded-xl flex flex-col justify-center">
                        <span className="text-[8px] text-slate-500 font-mono block">WORKLOAD INTENSITY</span>
                        <span className={`text-sm font-mono font-semibold block mt-0.5 ${selectedNodeData.simulated.hoursRequiredPerDay > 3.5 ? "text-red-400" : "text-amber-400"}`}>
                          {selectedNodeData.simulated.hoursRequiredPerDay}h/d
                        </span>
                      </div>
                    </div>

                    {/* Delay warning callouts */}
                    {selectedNodeData.simulated.isMissed ? (
                      <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-lg flex items-start gap-2.5">
                        <ShieldAlert size={14} className="text-red-400 animate-pulse shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-left">
                          <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wide block">💥 Critical Time Crunch Collapse</span>
                          <p className="text-[10.5px] text-red-200 font-semibold leading-relaxed">
                            Delaying starting on this task causes the required focus time to exceed manageable levels! Missed deadline expected.
                          </p>
                        </div>
                      </div>
                    ) : selectedNodeData.simulated.riskScore >= 65 ? (
                      <div className="bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg flex items-start gap-2">
                        <Flame size={13} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <p className="text-[10.5px] text-amber-200 leading-relaxed font-light">
                          If delayed, you will face an end-of-timeline rush. Start the recovery action steps below immediately to spread the load.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/5 border border-emerald-500/15 p-2.5 rounded-lg flex items-start gap-2">
                        <ShieldCheck size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-[10.5px] text-emerald-300 leading-relaxed font-light">
                          Current start window is comfortable. Breakdown is secure. Let's keep it steady.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Why At Risk Panel */}
                  {selectedNodeData.original.riskScore ? (
                    <div className="space-y-1.5 border-t border-white/8 pt-3">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">AI Prediction Context</span>
                      <p className="text-[11px] text-slate-350 leading-relaxed font-light font-sans pl-2.5 border-l border-white/8">
                        {selectedNodeData.original.riskExplanation || "The timeline requires disciplined pace slots to guarantee delivery."}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-white/8 flex items-center justify-between gap-3 text-left">
                      <div>
                        <span className="text-[8px] text-slate-500 font-mono block">Evaluation State</span>
                        <p className="text-[11px] text-slate-400 font-light mt-0.5">This task's baseline risk has not been analyzed by the coach yet.</p>
                      </div>
                      <button
                        onClick={() => handleRunRiskAnalysis(selectedNodeData.original)}
                        disabled={analyzingTaskId === selectedNodeData.id}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded border border-emerald-400/25 cursor-pointer disabled:opacity-40 transition shrink-0"
                      >
                        {analyzingTaskId === selectedNodeData.id ? "Analyzing..." : "Analyze Risk"}
                      </button>
                    </div>
                  )}

                  {/* =====================================
                      ACTION ROADMAP & FOCUS CHECKLIST
                      ===================================== */}
                  <div className="border-t border-white/8 pt-3 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Compass size={11} className="text-emerald-400" /> Catch-Up Action Roadmap
                      </h4>
                      {selectedNodeData.original.recoveryPlan && (
                        <button
                          onClick={() => handleRecalculatePlanForTask(selectedNodeData.original)}
                          disabled={generatingTaskId === selectedNodeData.id}
                          className="text-[8px] font-mono text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-400/20 cursor-pointer disabled:opacity-40 transition flex items-center gap-0.5"
                          title="Fallen behind? Recreate step intervals instantly"
                        >
                          <Zap size={8} /> {generatingTaskId === selectedNodeData.id ? "Recalculating..." : "Recalculate Flow"}
                        </button>
                      )}
                    </div>

                    {planErrorMsg[selectedNodeData.id] && (
                      <div className="p-2 bg-red-950/15 border border-red-500/15 rounded-lg text-[10px] text-red-400 font-mono flex items-center gap-1.5">
                        <AlertOctagon size={10} /> {planErrorMsg[selectedNodeData.id]}
                      </div>
                    )}

                    {selectedNodeData.original.recoveryPlan ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-300 bg-[#050816]/40 p-2.5 rounded-lg border border-white/8 font-light leading-relaxed font-sans">
                          <strong className="text-[9px] font-mono text-emerald-400 uppercase tracking-wide block mb-1 font-bold">AI Action Strategy:</strong>
                          {selectedNodeData.original.recoveryPlan.overallStrategy}
                        </p>

                        {/* List of focus sessions */}
                        <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 no-scrollbar">
                          {selectedNodeData.original.recoveryPlan.sessions.map((session: TaskSession, idx) => {
                            const overdue = !session.completed && session.dueDate < new Date().toISOString().split('T')[0];
                            return (
                              <div
                                key={session.id}
                                className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 text-xs transition ${
                                  session.completed
                                    ? "bg-[#0b1220]/30 border-white/8 opacity-65"
                                    : overdue
                                    ? "bg-red-950/5 border-red-500/15 shadow-[0_0_10px_rgba(239,68,68,0.03)]"
                                    : "bg-slate-950/40 border border-white/8"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => {
                                      if (onToggleSession) {
                                        onToggleSession(selectedNodeData.id, session.id, session.completed ? 'pending' : 'completed');
                                      }
                                    }}
                                    className="p-1 border border-white/8 hover:border-emerald-500/40 rounded-lg bg-slate-900 cursor-pointer text-slate-400 hover:text-emerald-400 transition"
                                  >
                                    {session.completed ? (
                                      <CheckCircle2 size={13} className="text-emerald-400" />
                                    ) : (
                                      <div className="w-3.5 h-3.5 bg-transparent" />
                                    )}
                                  </button>

                                  <div className="truncate text-left space-y-0.5">
                                    <span className={`text-[11.5px] block truncate ${session.completed ? "line-through text-slate-500 font-sans" : "text-slate-200 font-sans"}`}>
                                      {idx + 1}. {session.title}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 leading-none">
                                      <Calendar size={9} /> Due: {session.dueDate} &bull; <Clock size={9} /> {session.durationHours} hrs
                                      {session.missed && (
                                        <span className="text-red-400 font-bold ml-1">MISSED</span>
                                      )}
                                      {overdue && (
                                        <span className="text-red-400 font-bold ml-1 animate-pulse">OVERDUE</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Session custom check-off actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {!session.completed && onToggleSession && (
                                    <button
                                      onClick={() => onToggleSession(selectedNodeData.id, session.id, 'missed')}
                                      className="px-2 py-0.5 bg-red-500/5 hover:bg-red-500/15 text-[8px] font-mono text-red-400 border border-red-500/10 hover:border-red-500/25 rounded transition"
                                      title="Mark as missed to log a delay"
                                    >
                                      Missed
                                    </button>
                                  )}
                                  {session.googleEventId ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-[8px] font-mono font-bold text-emerald-400 border border-emerald-500/20 rounded">
                                      Synced to Cal
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Sync focus sessions to Google calendar link */}
                        <div className="pt-2 flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-500">Calendar Integration</span>
                          <button
                            onClick={() => {
                              if (!user && onSyncCalendarPress) {
                                onSyncCalendarPress();
                              } else {
                                onNavigate("insights");
                              }
                            }}
                            className="text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 font-bold"
                          >
                            Synchronize Focus Sessions to Google Calendar &rarr;
                          </button>
                        </div>

                      </div>
                    ) : (
                      <div className="p-5 bg-[#0b1220]/50 border border-dashed border-white/8 rounded-2xl text-center space-y-3.5">
                        <Compass size={22} className="mx-auto text-slate-500" />
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide block">Roadmap Not Structured</span>
                          <p className="text-[11px] text-slate-500 leading-normal max-w-xs mx-auto mt-0.5 font-light">
                            Let the AI Coach break this project's remaining hours down into step-by-step paced focus intervals ahead of your deadline.
                          </p>
                        </div>
                        <button
                          onClick={() => handleGeneratePlanForTask(selectedNodeData.original)}
                          disabled={generatingTaskId === selectedNodeData.id}
                          className="px-4 py-2 bg-emerald-400 text-[#050816] font-mono text-xs rounded-xl hover:bg-[#10b981] cursor-pointer font-bold transition inline-flex items-center gap-1.5"
                        >
                          {generatingTaskId === selectedNodeData.id ? (
                            <>Calculating Roadmap...</>
                          ) : (
                            <>
                              <Zap size={11} strokeWidth={2.5} /> Generate AI Recovery Roadmap
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
      <div className="border-t border-white/8 pt-4">
        <div className="flex justify-center">
          <button
            onClick={() => setShowSecondaryDetails(!showSecondaryDetails)}
            className="px-3.5 py-1 bg-[#0b1220] hover:bg-[#0b1220]/85 border border-white/8 hover:border-emerald-500/20 text-[9.5px] font-mono rounded-lg text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 font-bold"
          >
            {showSecondaryDetails ? "Collapse Habit Diagnostics" : "Expand Habit Diagnostics & Historical Logs"}
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${showSecondaryDetails ? "" : "animate-ping"}`} />
          </button>
        </div>

        {showSecondaryDetails && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-1 overflow-hidden"
          >
            {/* diagnostic 1 */}
            <div className="bg-[#0b1220] border border-white/8 p-4 rounded-xl shadow-lg space-y-3">
              <h3 className="text-[11px] font-mono font-medium text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-white/8 pb-2 uppercase">
                <UserCheck size={13} className="text-emerald-400" /> Dynamic My Habits Analysis
              </h3>
              
              {loading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-white/[0.03] rounded animate-pulse" />
                  <div className="h-10 bg-white/[0.02] rounded animate-pulse" />
                </div>
              ) : reflection && reflection.insights && reflection.insights.length > 0 ? (
                <div className="space-y-3">
                  {reflection.insights.map((insight, idx) => {
                    const labelColor = insight.category === "advantage" 
                      ? "text-emerald-400" 
                      : insight.category === "risk" 
                        ? "text-red-400" 
                        : "text-amber-500";
                    return (
                      <div key={idx} className="p-2.5 bg-slate-950/40 rounded-lg border border-white/8 space-y-0.5 text-left">
                        <div className={`font-mono text-[9px] font-bold ${labelColor} uppercase`}>
                           {insight.title}
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-light leading-relaxed font-sans">
                          {insight.description}
                        </p>
                      </div>
                    );
                  })}
                  
                  {reflection.workloadTrends && (
                    <div className="pt-2 text-[9px] font-mono text-slate-500 leading-normal border-t border-white/8 text-left">
                      <span className="text-slate-400 block pb-0.5">Progress trend index:</span>
                      "{reflection.workloadTrends}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-left">
                  <p className="text-[11px] text-slate-500 font-light italic">
                    Log some milestones and work habits to unlock custom behavioral predictions.
                  </p>
                </div>
              )}
            </div>

            {/* diagnostic 2 */}
            <div className="bg-[#0b1220] border border-white/8 p-4 rounded-xl shadow-lg text-left space-y-3">
              <h3 className="text-[11px] font-mono font-medium text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-white/8 pb-2 uppercase">
                <TrendingUp size={13} className="text-emerald-400" /> Portfolio Category Load
              </h3>
              
              <div className="space-y-2.5">
                {categoryStats.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">{cat.name}</span>
                      <span className="text-slate-350 font-bold">{cat.total} task{cat.total === 1 ? "" : "s"} ({cat.percent}%)</span>
                    </div>
                    <div className="h-1 bg-slate-950 rounded-full overflow-hidden border border-white/8">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" 
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* diagnostic 3 */}
            <div className="bg-[#0b1220] border border-white/8 p-4 rounded-xl shadow-lg text-left space-y-3">
              <h3 className="text-[11px] font-mono font-medium text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-white/8 pb-2 uppercase">
                <CheckCircle2 size={12} className="text-emerald-400" /> Logged Milestones
              </h3>
              <div className="space-y-1.5 max-h-[170px] overflow-y-auto no-scrollbar">
                {completedTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-500 font-light italic leading-normal">No completed milestones recorded yet in this session.</p>
                ) : (
                  completedTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-1.5 bg-slate-950/40 rounded-lg border border-white/8">
                      <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                      <span className="text-[10.5px] text-slate-400 truncate line-through font-mono">{t.title}</span>
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
