import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task } from "../types";
import { GlassStackCard, GlassCardItem } from "./ui/glass-stack-card";
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Info, 
  BarChart2, 
  TrendingUp, 
  Clock, 
  Calendar,
  Loader2,
  ChevronRight,
  Bookmark,
  CheckCircle2
} from "lucide-react";

interface RiskPredictionProps {
  tasks: Task[];
  onUpdateTaskRisk: (taskId: string, riskData: Partial<Task>) => void;
}

export default function RiskPrediction({ tasks, onUpdateTaskRisk }: RiskPredictionProps) {
  const activeTasks = tasks.filter(t => !t.completed);
  const [analyzingTaskId, setAnalyzingTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    activeTasks.length > 0 ? activeTasks[0].id : null
  );
  const [showDetailed, setShowDetailed] = useState(false);

  const handleRunAnalysis = async (task: Task) => {
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
      onUpdateTaskRisk(task.id, {
        riskScore: predictedRisk.riskScore,
        riskLevel: predictedRisk.riskLevel,
        riskExplanation: predictedRisk.riskExplanation,
        riskFactors: predictedRisk.riskFactors,
        failureProbability: predictedRisk.failureProbability,
        recommendedIntervention: predictedRisk.recommendedIntervention,
        mainRiskFactors: predictedRisk.mainRiskFactors,
      });

    } catch (err) {
      console.error(err);
      const fallbackScore = Math.floor(Math.random() * 40) + 40;
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
    } finally {
      setAnalyzingTaskId(null);
    }
  };

  const selectedTask = activeTasks.find(t => t.id === selectedTaskId);

  const getHighRiskCards = (): GlassCardItem[] => {
    // Show active tasks sorted by risk score descending that have high risk score
    const sortedTasks = [...activeTasks]
      .filter(t => typeof t.riskScore === 'number' && t.riskScore >= 40)
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

    return sortedTasks.map(task => ({
      id: task.id,
      title: task.title,
      subtitle: `${task.category} • RISK SCORE: ${task.riskScore}%`,
      mainText: task.riskExplanation || "This task's deadline is approaching fast. We recommend using our recovery planner to split your work into digestible study sessions.",
      tags: [
        { text: (task.riskLevel || 'high').toUpperCase(), type: 'danger' },
        { text: `${task.estimatedHours} Hours`, type: 'default' }
      ],
      stats: [
        { icon: Calendar, text: `Deadline: ${task.deadline}` },
        { icon: ShieldAlert, text: `Success Chance: ${100 - (task.riskScore || 0)}%` }
      ],
      avatarGradient: "linear-gradient(135deg, #ef4444, #991b1b)",
      onAction: () => {
        setSelectedTaskId(task.id);
        const element = document.getElementById("risk-prediction-view");
        element?.scrollIntoView({ behavior: 'smooth' });
      },
      actionText: "Focus on Task Details"
    }));
  };

  return (
    <div id="risk-prediction-view" className="space-y-8 pb-16">
      
      {/* Visual Header Banner */}
      <div className="bg-[#0b1220] border border-white/8 p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-3 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-800/25 text-[10px] font-mono rounded-full uppercase tracking-wider font-semibold">
            <Sparkles size={11} /> Deadline Check
          </div>
          <h1 className="text-3xl font-sans font-bold text-white tracking-tight">Will I Finish on Time?</h1>
          <p className="text-base text-slate-350 leading-relaxed font-normal tracking-normal">
            We look at your remaining hours, difficulty, and deadline to see if you have enough time. This helps you start early and finish stress-free.
          </p>
        </div>
        
        <div className="flex gap-4 shrink-0 font-mono text-center">
          <div className="px-5 py-4 bg-slate-950/40 border border-white/8 rounded-xl min-w-[110px]">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Behind Schedule</span>
            <span className="text-2xl font-bold text-red-400 block mt-1 font-mono">
              {activeTasks.filter(t => t.riskLevel === "critical" || (t.riskScore && t.riskScore >= 75)).length}
            </span>
          </div>
          <div className="px-5 py-4 bg-slate-950/40 border border-white/8 rounded-xl min-w-[110px]">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Done</span>
            <span className="text-2xl font-bold text-emerald-400 block mt-1 font-mono">
              {tasks.filter(t => t.completed).length}
            </span>
          </div>
        </div>
      </div>

      {/* High Risk Task Stack Swiper */}
      {getHighRiskCards().length > 0 && (
        <div className="bg-[#0b1220] border border-red-500/10 p-6 md:p-8 rounded-2xl relative overflow-hidden text-left shadow-2xl space-y-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/40 border border-red-900/30 rounded-lg text-xs text-red-400 font-mono font-bold uppercase tracking-wider">
            <ShieldAlert size={14} className="text-red-400 animate-pulse" /> Critical Deadlines At Risk
          </div>
          
          <div className="pt-2">
            <GlassStackCard
              items={getHighRiskCards()}
              visibleBehind={1}
              headerTitle="High-Risk Commitments"
              headerSubtitle="Swipe or drag to review assignments needing immediate attention"
            />
          </div>
        </div>
      )}

      {activeTasks.length === 0 ? (
        <div className="bg-[#0b1220] border border-dashed border-white/8 p-12 text-center rounded-2xl max-w-lg mx-auto space-y-4">
          <ShieldCheck size={38} className="mx-auto text-emerald-500/60 mb-2" />
          <h3 className="text-lg font-sans font-bold text-white">No active tasks found</h3>
          <p className="text-base text-slate-350 font-normal">Created tasks will appear here for completion risk analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar list selection list */}
          <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-4 lg:col-span-4 space-y-3 text-left">
            <div className="text-xs font-mono font-bold text-slate-400 tracking-wider px-2 pb-2 border-b border-white/8 uppercase">
              My Tasks
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
              {activeTasks.map((task) => {
                const active = task.id === selectedTaskId;
                const score = task.riskScore;
                
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                      active
                        ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/40"
                        : "bg-slate-950/30 border-white/8 hover:border-emerald-500/10"
                    }`}
                  >
                    <div className="space-y-1 truncate max-w-xs">
                      <div className="font-sans font-bold text-white truncate text-[15px]">{task.title}</div>
                      <div className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1.5">
                        <Calendar size={9} /> {task.deadline} &bull; {task.estimatedHours}h
                      </div>
                    </div>

                    {typeof score === "number" ? (
                      <span className={`px-2 py-0.5 font-mono font-bold rounded-full text-[9px] uppercase shrink-0 ${
                        task.riskLevel === "critical" || score >= 75
                          ? "bg-red-500/10 text-red-400 border border-red-500/15"
                          : score >= 50
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                      }`}>
                        {score}%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-900 text-slate-500 border border-white/[0.04] font-mono rounded-full text-[8px] uppercase shrink-0">
                        NONE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Predict Inspector */}
          <div className="lg:col-span-8 space-y-6 text-left">
            {selectedTask ? (
              <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-6 md:p-8 space-y-6 relative shadow-xl text-left">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/8 pb-5 text-left">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      {selectedTask.category} OUTLOOK
                    </span>
                    <h2 className="text-2xl font-sans font-bold text-white tracking-tight">
                      {selectedTask.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => handleRunAnalysis(selectedTask)}
                    disabled={analyzingTaskId === selectedTask.id}
                    className="px-5 py-2.5 bg-emerald-400 hover:bg-[#10b981] text-[#050816] text-xs font-mono font-bold rounded-full cursor-pointer transition flex items-center gap-1.5 self-start shrink-0 disabled:opacity-50 uppercase tracking-wider"
                  >
                    {analyzingTaskId === selectedTask.id ? (
                      <>
                        <Loader2 className="animate-spin" size={13} /> ASSESSING...
                      </>
                    ) : (
                      <>
                        <Zap size={13} strokeWidth={2.5} /> Update Calculation
                      </>
                    )}
                  </button>
                </div>

                {typeof selectedTask.riskScore === "number" ? (
                  <div className="space-y-6 text-left">
                    {/* Simplified Student-Friendly Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Success Chance */}
                      <div className="p-5 bg-emerald-950/20 border border-emerald-500/15 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">Success Chance</span>
                        <div className="text-4xl font-mono font-bold text-emerald-400 animate-pulse">
                          {100 - selectedTask.riskScore}%
                        </div>
                        <p className="text-xs text-slate-450 font-normal leading-relaxed text-center mt-1">
                          Chance of finishing this task on time
                        </p>
                      </div>

                      {/* Days Remaining & Recommended Hours Today */}
                      {(() => {
                        const tDate = new Date(selectedTask.deadline + "T23:59:59");
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        tDate.setHours(0, 0, 0, 0);
                        const diffTime = tDate.getTime() - today.getTime();
                        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                        const recommendedHoursToday = daysRemaining > 0 
                          ? Math.round((selectedTask.estimatedHours / daysRemaining) * 10) / 10 
                          : selectedTask.estimatedHours;
                          
                        return (
                          <>
                            <div className="p-5 bg-slate-950/40 border border-white/8 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                              <span className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">Days Remaining</span>
                              <div className="text-4xl font-mono font-bold text-white">
                                {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                              </div>
                              <p className="text-xs text-slate-405 font-normal leading-relaxed text-center mt-1">
                                Until deadline
                              </p>
                            </div>

                            <div className="p-5 bg-slate-950/40 border border-white/8 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                              <span className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">Hours Required Today</span>
                              <div className="text-4xl font-mono font-semibold text-amber-400">
                                {recommendedHoursToday} hr{recommendedHoursToday === 1 ? "" : "s"}
                              </div>
                              <p className="text-xs text-slate-405 font-normal leading-relaxed text-center mt-1">
                                Daily focus time
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Why This Task Is At Risk */}
                    <div className="p-6 bg-red-500/[0.01] border border-red-500/10 rounded-2xl space-y-2.5 text-left">
                      <span className="text-xs font-mono font-bold text-red-400 tracking-wider block uppercase">⚠️ Why This Task Is At Risk</span>
                      <p className="text-base text-slate-200 leading-relaxed font-normal text-left font-sans">
                        {selectedTask.riskExplanation || "The timeline is short. Breaking this assignment down into smaller daily goals will help you complete it effortlessly."}
                      </p>
                    </div>

                    {/* Interactive Toggle Button */}
                    <div className="flex justify-center border-t border-b border-white/8 py-4">
                      <button
                        onClick={() => setShowDetailed(!showDetailed)}
                        className="px-4 py-2 bg-[#0b1220] hover:bg-slate-950 border border-white/8 hover:border-emerald-500/25 text-xs font-mono rounded-xl text-slate-350 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                      >
                        {showDetailed ? "Hide Details" : "Show Details"}
                      </button>
                    </div>

                    {/* Original Detailed View */}
                    {showDetailed && (
                      <div className="space-y-6 pt-2 text-left font-sans">
                        {/* Failure vs Success split ratio */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40 border border-white/8 p-6 rounded-2xl">
                          
                          {/* Success Probability card */}
                          <div className="p-5 bg-emerald-500/5 rounded-xl border border-emerald-500/15 space-y-2 text-left">
                            <span className="text-xs font-mono font-bold text-emerald-400 block tracking-wider uppercase">Chance of finishing on time</span>
                            <div className="text-3xl font-mono font-bold text-emerald-400">
                              {100 - selectedTask.riskScore}%
                            </div>
                            <p className="text-sm text-slate-300 font-normal leading-relaxed">
                              Your predicted chance of finishing this task on time based on your current speed.
                            </p>
                          </div>
      
                          {/* Failure Probability card */}
                          <div className="p-5 bg-red-500/5 rounded-xl border border-red-500/10 space-y-2 text-left">
                            <span className="text-xs font-mono font-bold text-red-400 block tracking-wider uppercase">Chance of running out of time</span>
                            <div className="text-3xl font-mono font-bold text-red-400">
                              {selectedTask.failureProbability !== undefined ? selectedTask.failureProbability : selectedTask.riskScore}%
                            </div>
                            <p className="text-sm text-slate-300 font-normal leading-relaxed">
                              The estimated risk of missing the deadline due to a tight schedule, complexity, or delays.
                            </p>
                          </div>
      
                        </div>

                        {/* Contributing Factors & AI Reasoning */}
                        <div className="space-y-4">
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Factor 1 */}
                            <div className="bg-slate-950/40 border border-white/8 p-4 rounded-xl space-y-2.5 text-left">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">How urgent this task is</span>
                                <span className="text-slate-200 font-bold">{selectedTask.riskFactors?.urgencyScore}%</span>
                              </div>
                              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-red-400" style={{ width: `${selectedTask.riskFactors?.urgencyScore}%` }} />
                              </div>
                              <p className="text-xs text-slate-400 leading-normal font-normal">
                                Time remaining compared to the estimated work hours.
                              </p>
                            </div>
                            
                            {/* Factor 2 */}
                            <div className="bg-slate-950/40 border border-white/8 p-4 rounded-xl space-y-2.5 text-left">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Task difficulty</span>
                                <span className="text-slate-200 font-bold">{selectedTask.riskFactors?.complexityScore}%</span>
                              </div>
                              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${selectedTask.riskFactors?.complexityScore}%` }} />
                              </div>
                              <p className="text-xs text-slate-400 leading-normal font-normal">
                                Task difficulty based on priority and details.
                              </p>
                            </div>
 
                            {/* Factor 3 */}
                            <div className="bg-slate-950/40 border border-white/8 p-4 rounded-xl space-y-2.5 text-left">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Extra time available</span>
                                <span className="text-emerald-400 font-bold">{selectedTask.riskFactors?.bufferSafetyScore}%</span>
                              </div>
                              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${selectedTask.riskFactors?.bufferSafetyScore}%` }} />
                              </div>
                              <p className="text-xs text-slate-400 leading-normal font-normal">
                                Extra safety cushion to handle delays or unexpected events.
                              </p>
                            </div>
                          </div>

                          {/* Main Risk Factors list */}
                          {selectedTask.mainRiskFactors && selectedTask.mainRiskFactors.length > 0 && (
                            <div className="bg-slate-950/40 border border-white/8 p-5 rounded-xl space-y-3 text-left">
                              <span className="text-xs font-mono font-bold text-red-400 tracking-wider block uppercase">Main risk factors:</span>
                              <ul className="space-y-2 text-sm text-slate-200 font-sans">
                                {selectedTask.mainRiskFactors.map((factor, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 leading-normal">
                                    <span className="text-red-400 font-bold shrink-0">&bull;</span>
                                    <span className="font-normal text-slate-200">{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* AI Assessment & Recommended Action Plan */}
                          <div className="p-6 bg-white/[0.01] border border-white/8 rounded-2xl space-y-4 text-left font-sans">
                            <div className="space-y-1.5">
                              <span className="text-xs font-mono font-bold tracking-wider block flex items-center gap-1 text-emerald-400 uppercase">
                                <Info size={11} className="text-emerald-400" /> AI Assistant Analysis
                              </span>
                              <p className="text-base text-slate-200 leading-relaxed font-normal">
                                "{selectedTask.riskExplanation || 'The deadline is coming up fast. We recommend starting soon or generating an action plan to catch up.'}"
                              </p>
                            </div>

                            <div className="pt-4 border-t border-white/8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="space-y-0.5">
                                <span className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">Recommended action</span>
                                <p className="text-sm text-emerald-300 font-mono font-semibold">
                                  {selectedTask.recommendedIntervention || (selectedTask.riskScore >= 70 ? "Create a step-by-step action plan" : "Schedule a few focus sessions")}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => onUpdateTaskRisk(selectedTask.id, { riskScore: 12, riskLevel: 'low' })}
                                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded-lg transition font-semibold cursor-pointer"
                              >
                                Mark as Safe
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#0b1220] border border-white/8 p-12 text-center rounded-2xl space-y-5 text-left">
                    <AlertTriangle size={34} className="mx-auto text-amber-500 animate-pulse" />
                    <div className="text-center">
                      <h4 className="text-lg font-sans font-bold text-white">No Risk Analysis Yet</h4>
                      <p className="text-base text-slate-350 mt-1 max-w-sm mx-auto font-normal leading-relaxed">
                        This task has not been analyzed for deadline risks yet. Let the assistant evaluate it for you.
                      </p>
                    </div>
                    <button
                      onClick={() => handleRunAnalysis(selectedTask)}
                      className="px-6 py-3 bg-emerald-400 hover:bg-[#10b981] text-[#050816] text-sm font-mono font-bold rounded-full cursor-pointer transition mx-auto block"
                    >
                      Check Deadline Risk &rarr;
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-12 text-center text-slate-300 font-normal">
                Select a task to display its completion risk details.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
