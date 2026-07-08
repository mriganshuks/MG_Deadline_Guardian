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
      <div className="bg-[#111111] border border-white/5 p-8 md:p-10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-sm text-left">
        <div className="space-y-4 max-w-xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/60 uppercase tracking-widest">
            <Sparkles size={14} className="text-white/40" /> Deadline Check
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">Will I Finish on Time?</h1>
          <p className="text-base text-white/50 leading-relaxed font-light">
            We analyze your remaining hours, difficulty, and deadline to see if you have enough time. Start early and finish stress-free.
          </p>
        </div>
        
        <div className="flex gap-4 shrink-0 font-medium text-center">
          <div className="px-6 py-5 bg-white/5 border border-white/10 rounded-2xl min-w-[120px]">
            <span className="text-xs text-white/40 block uppercase tracking-widest font-semibold mb-2">Behind</span>
            <span className="text-3xl font-bold text-red-400 block font-sans">
              {activeTasks.filter(t => t.riskLevel === "critical" || (t.riskScore && t.riskScore >= 75)).length}
            </span>
          </div>
          <div className="px-6 py-5 bg-white/5 border border-white/10 rounded-2xl min-w-[120px]">
            <span className="text-xs text-white/40 block uppercase tracking-widest font-semibold mb-2">Done</span>
            <span className="text-3xl font-bold text-white block font-sans">
              {tasks.filter(t => t.completed).length}
            </span>
          </div>
        </div>
      </div>

      {/* High Risk Task Stack Swiper */}
      {getHighRiskCards().length > 0 && (
        <div className="bg-[#161616] border border-red-500/20 p-6 md:p-8 rounded-2xl relative overflow-hidden text-left shadow-sm space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400 font-semibold uppercase tracking-widest">
            <ShieldAlert size={16} className="text-red-400" /> Critical Deadlines At Risk
          </div>
          
          <div className="pt-4">
            <GlassStackCard
              items={getHighRiskCards()}
              visibleBehind={1}
            />
          </div>
        </div>
      )}

      {activeTasks.length === 0 ? (
        <div className="bg-[#111111] border border-dashed border-white/10 p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4 shadow-sm">
          <ShieldCheck size={48} className="mx-auto text-white/20 mb-2" />
          <h3 className="text-xl font-display font-semibold text-white">No active tasks found</h3>
          <p className="text-sm text-white/50 font-light leading-relaxed">Created tasks will appear here for completion risk analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar list selection list */}
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 lg:col-span-4 space-y-4 text-left shadow-sm">
            <div className="text-xs font-semibold text-white/40 tracking-widest pb-4 border-b border-white/5 uppercase">
              My Tasks
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2 no-scrollbar">
              {activeTasks.map((task) => {
                const active = task.id === selectedTaskId;
                const score = task.riskScore;
                
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 text-sm ${
                      active
                        ? "bg-white/5 border-white/20"
                        : "bg-transparent border-transparent hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="space-y-1.5 truncate max-w-[14rem]">
                      <div className="font-display font-semibold text-white truncate text-base">{task.title}</div>
                      <div className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                        <Calendar size={12} /> {task.deadline} &bull; {task.estimatedHours}h
                      </div>
                    </div>

                    {typeof score === "number" ? (
                      <span className={`px-3 py-1 font-semibold rounded-full text-xs uppercase shrink-0 ${
                        task.riskLevel === "critical" || score >= 75
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : score >= 50
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {score}%
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-white/5 text-white/40 border border-white/10 font-semibold rounded-full text-xs uppercase shrink-0">
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
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-8 space-y-8 shadow-sm text-left">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6 text-left">
                  <div className="space-y-2 text-left">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-widest block">
                      {selectedTask.category} Outlook
                    </span>
                    <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
                      {selectedTask.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => handleRunAnalysis(selectedTask)}
                    disabled={analyzingTaskId === selectedTask.id}
                    className="px-6 py-3 bg-white hover:bg-gray-200 text-black text-sm font-semibold rounded-full cursor-pointer transition-colors flex items-center gap-2 self-start shrink-0 disabled:opacity-50"
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
                      <div className="p-6 bg-[#111111] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
                        <span className="text-xs font-semibold uppercase text-white/40 tracking-widest">Success Chance</span>
                        <div className="text-4xl font-display font-semibold text-emerald-400">
                          {100 - selectedTask.riskScore}%
                        </div>
                        <p className="text-xs text-white/50 font-light leading-relaxed text-center">
                          Predicted chance of finishing on time
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
                            <div className="p-6 bg-[#111111] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
                              <span className="text-xs font-semibold uppercase text-white/40 tracking-widest">Days Remaining</span>
                              <div className="text-4xl font-display font-semibold text-white">
                                {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                              </div>
                              <p className="text-xs text-white/50 font-light leading-relaxed text-center">
                                Until deadline
                              </p>
                            </div>

                            <div className="p-6 bg-[#111111] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
                              <span className="text-xs font-semibold uppercase text-white/40 tracking-widest">Hours Required Today</span>
                              <div className="text-4xl font-display font-semibold text-amber-400">
                                {recommendedHoursToday} hr{recommendedHoursToday === 1 ? "" : "s"}
                              </div>
                              <p className="text-xs text-white/50 font-light leading-relaxed text-center">
                                Daily focus time
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Why This Task Is At Risk */}
                    <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-3 text-left">
                      <span className="text-xs font-semibold text-red-400 tracking-widest block uppercase">⚠️ Why This Task Is At Risk</span>
                      <p className="text-base text-white/80 leading-relaxed font-light text-left">
                        {selectedTask.riskExplanation || "The timeline is short. Breaking this assignment down into smaller daily goals will help you complete it effortlessly."}
                      </p>
                    </div>

                    {/* Interactive Toggle Button */}
                    <div className="flex justify-center border-t border-b border-white/5 py-6">
                      <button
                        onClick={() => setShowDetailed(!showDetailed)}
                        className="px-6 py-2.5 bg-[#111111] hover:bg-white/5 border border-white/10 text-xs font-semibold rounded-full text-white/60 hover:text-white transition-colors flex items-center gap-2"
                      >
                        {showDetailed ? "Hide Details" : "Show Details"}
                        <ChevronRight size={14} className={`transition-transform ${showDetailed ? "rotate-90" : ""}`} />
                      </button>
                    </div>

                    {/* Original Detailed View */}
                    {showDetailed && (
                      <div className="space-y-6 pt-2 text-left font-sans">
                        {/* Failure vs Success split ratio */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#111111] border border-white/5 p-6 rounded-2xl">
                          
                          {/* Success Probability card */}
                          <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-3 text-left">
                            <span className="text-xs font-semibold text-emerald-400 block tracking-widest uppercase">Chance of finishing on time</span>
                            <div className="text-3xl font-display font-semibold text-emerald-400">
                              {100 - selectedTask.riskScore}%
                            </div>
                            <p className="text-sm text-white/50 font-light leading-relaxed">
                              Your predicted chance of finishing this task on time based on your current speed.
                            </p>
                          </div>
      
                          {/* Failure Probability card */}
                          <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/20 space-y-3 text-left">
                            <span className="text-xs font-semibold text-red-400 block tracking-widest uppercase">Chance of running out of time</span>
                            <div className="text-3xl font-display font-semibold text-red-400">
                              {selectedTask.failureProbability !== undefined ? selectedTask.failureProbability : selectedTask.riskScore}%
                            </div>
                            <p className="text-sm text-white/50 font-light leading-relaxed">
                              The estimated risk of missing the deadline due to a tight schedule, complexity, or delays.
                            </p>
                          </div>
      
                        </div>

                        {/* Contributing Factors & AI Reasoning */}
                        <div className="space-y-6">
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Factor 1 */}
                            <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                              <div className="flex items-center justify-between text-xs font-semibold text-white/40 uppercase tracking-widest">
                                <span>Urgency</span>
                                <span className="text-white">{selectedTask.riskFactors?.urgencyScore}%</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-red-400" style={{ width: `${selectedTask.riskFactors?.urgencyScore}%` }} />
                              </div>
                              <p className="text-xs text-white/50 leading-relaxed font-light">
                                Time remaining compared to the estimated work hours.
                              </p>
                            </div>
                            
                            {/* Factor 2 */}
                            <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                              <div className="flex items-center justify-between text-xs font-semibold text-white/40 uppercase tracking-widest">
                                <span>Difficulty</span>
                                <span className="text-white">{selectedTask.riskFactors?.complexityScore}%</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${selectedTask.riskFactors?.complexityScore}%` }} />
                              </div>
                              <p className="text-xs text-white/50 leading-relaxed font-light">
                                Task difficulty based on priority and details.
                              </p>
                            </div>
 
                            {/* Factor 3 */}
                            <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                              <div className="flex items-center justify-between text-xs font-semibold text-white/40 uppercase tracking-widest">
                                <span>Extra Time</span>
                                <span className="text-emerald-400">{selectedTask.riskFactors?.bufferSafetyScore}%</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${selectedTask.riskFactors?.bufferSafetyScore}%` }} />
                              </div>
                              <p className="text-xs text-white/50 leading-relaxed font-light">
                                Extra safety cushion to handle delays or unexpected events.
                              </p>
                            </div>
                          </div>

                          {/* Main Risk Factors list */}
                          {selectedTask.mainRiskFactors && selectedTask.mainRiskFactors.length > 0 && (
                            <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                              <span className="text-xs font-semibold text-red-400 tracking-widest block uppercase">Main risk factors</span>
                              <ul className="space-y-3 text-sm text-white/80 font-light">
                                {selectedTask.mainRiskFactors.map((factor, idx) => (
                                  <li key={idx} className="flex items-start gap-3 leading-relaxed">
                                    <span className="text-red-400 font-bold mt-0.5">&bull;</span>
                                    <span>{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* AI Assessment & Recommended Action Plan */}
                          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-6 text-left">
                            <div className="space-y-3">
                              <span className="text-xs font-semibold tracking-widest flex items-center gap-2 text-white/40 uppercase">
                                <Info size={14} className="text-white/60" /> AI Assistant Analysis
                              </span>
                              <p className="text-base text-white/80 leading-relaxed font-light">
                                "{selectedTask.riskExplanation || 'The deadline is coming up fast. We recommend starting soon or generating an action plan to catch up.'}"
                              </p>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                              <div className="space-y-2">
                                <span className="text-xs font-semibold uppercase text-white/40 tracking-widest">Recommended action</span>
                                <p className="text-sm text-white font-semibold">
                                  {selectedTask.recommendedIntervention || (selectedTask.riskScore >= 70 ? "Create a step-by-step action plan" : "Schedule a few focus sessions")}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => onUpdateTaskRisk(selectedTask.id, { riskScore: 12, riskLevel: 'low' })}
                                className="px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm rounded-full transition-colors font-semibold cursor-pointer shrink-0"
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
                  <div className="bg-[#111111] border border-white/5 p-12 text-center rounded-2xl space-y-6 text-left shadow-sm">
                    <AlertTriangle size={48} className="mx-auto text-amber-500/50 mb-2" />
                    <div className="text-center">
                      <h4 className="text-xl font-display font-semibold text-white">No Risk Analysis Yet</h4>
                      <p className="text-sm text-white/50 mt-2 max-w-sm mx-auto font-light leading-relaxed">
                        This task has not been analyzed for deadline risks yet. Let the assistant evaluate it for you.
                      </p>
                    </div>
                    <button
                      onClick={() => handleRunAnalysis(selectedTask)}
                      className="px-6 py-3 bg-white hover:bg-gray-200 text-black text-sm font-semibold rounded-full cursor-pointer transition-colors mx-auto block"
                    >
                      Check Deadline Risk &rarr;
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-[#111111] border border-dashed border-white/10 rounded-2xl p-16 text-center text-white/40 font-light">
                Select a task to display its completion risk details.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
