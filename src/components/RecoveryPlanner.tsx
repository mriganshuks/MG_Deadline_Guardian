import React, { useState } from "react";
import { motion } from "framer-motion";
import { Task, TaskSession, RecoveryPlan } from "../types";
import { GlassStackCard, GlassCardItem } from "./ui/glass-stack-card";
import { 
  PlusCircle, 
  CheckCircle2, 
  Compass, 
  Calendar, 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  CheckSquare, 
  Square, 
  TrendingUp,
  Loader2,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  AlertOctagon,
  HelpCircle,
  ArrowRight
} from "lucide-react";

interface RecoveryPlannerProps {
  tasks: Task[];
  defaultSelectedTaskId: string | null;
  onUpdateTaskRecovery: (taskId: string, recoveryData: RecoveryPlan) => void;
  onToggleSession: (taskId: string, sessionId: string, status?: 'completed' | 'missed' | 'pending') => void;
  onIncrementMissedMilestone: (taskId: string) => void;
}

export default function RecoveryPlanner({ 
  tasks, 
  defaultSelectedTaskId, 
  onUpdateTaskRecovery, 
  onToggleSession,
  onIncrementMissedMilestone
}: RecoveryPlannerProps) {
  const activeTasks = tasks.filter(t => !t.completed);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    defaultSelectedTaskId || (activeTasks.length > 0 ? activeTasks[0].id : null)
  );
  
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedTask = activeTasks.find(t => t.id === selectedTaskId);
  const [viewMode, setViewMode] = useState<'stack' | 'list'>('stack');

  const getSessionCards = (): GlassCardItem[] => {
    if (!selectedTask || !selectedTask.recoveryPlan) return [];
    return selectedTask.recoveryPlan.sessions.map((session, idx) => {
      const completed = session.completed;
      const missed = !!session.missed;
      const delayed = !completed && !missed && isSessionOverdue(session);

      const tags: { text: string; type: 'featured' | 'default' | 'danger' | 'warning' | 'success' }[] = [];
      if (completed) {
        tags.push({ text: "COMPLETED", type: "success" });
      } else if (missed) {
        tags.push({ text: "MISSED", type: "danger" });
      } else if (delayed) {
        tags.push({ text: "OVERDUE", type: "danger" });
      } else {
        tags.push({ text: "UPCOMING", type: "default" });
      }

      return {
        id: session.id,
        title: `Session ${idx + 1}`,
        subtitle: `Duration: ${session.durationHours} hours`,
        mainText: session.title,
        tags: tags,
        stats: [
          { icon: Calendar, text: `Due: ${session.dueDate}` }
        ],
        avatarGradient: completed 
          ? "linear-gradient(135deg, #10b981, #059669)" 
          : missed 
            ? "linear-gradient(135deg, #ef4444, #991b1b)" 
            : "linear-gradient(135deg, #34d399, #10b981)",
        onAction: !completed ? () => {
          onToggleSession(selectedTask.id, session.id, 'completed');
        } : undefined,
        actionText: !completed ? "Mark Completed" : undefined
      };
    });
  };

  const handleGeneratePlan = async () => {
    if (!selectedTask) return;
    setGenerating(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/recovery-planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: selectedTask.title,
          description: selectedTask.description,
          deadline: selectedTask.deadline,
          estimatedHours: selectedTask.estimatedHours,
          category: selectedTask.category,
          currentProgress: 0,
          missedCount: selectedTask.missedMilestonesCount || 0
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

      onUpdateTaskRecovery(selectedTask.id, newPlan);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("We couldn't connect to the AI model. Created a simple offline backup plan for you.");
      
      const totalHours = selectedTask.estimatedHours;
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
          dueDate: selectedTask.deadline,
          completed: false
        }
      ];

      onUpdateTaskRecovery(selectedTask.id, {
        overallStrategy: "Divide your total work hours into a few simple sessions before the deadline.",
        sessions: sessionList,
        recalcCount: 1,
        rebuiltAt: today.toISOString().split("T")[0]
      });

    } finally {
      setGenerating(false);
    }
  };

  const handleRecalculatePlan = async () => {
    if (!selectedTask || !selectedTask.recoveryPlan) return;
    setGenerating(true);
    setErrorMsg("");

    onIncrementMissedMilestone(selectedTask.id);
    const updatedMissedCount = (selectedTask.missedMilestonesCount || 0) + 1;

    try {
      const res = await fetch("/api/recovery-planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: selectedTask.title,
          description: selectedTask.description,
          deadline: selectedTask.deadline,
          estimatedHours: selectedTask.estimatedHours,
          category: selectedTask.category,
          currentProgress: Math.round(
            (selectedTask.recoveryPlan.sessions.filter(s => s.completed).length / selectedTask.recoveryPlan.sessions.length) * 100
          ),
          missedCount: updatedMissedCount,
          missedSessionsCount: selectedTask.recoveryPlan.sessions.filter(s => s.missed).length
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
        recalcCount: selectedTask.recoveryPlan.recalcCount + 1,
        rebuiltAt: new Date().toISOString().split('T')[0]
      };

      onUpdateTaskRecovery(selectedTask.id, newPlan);

    } catch (err) {
      console.error(err);
      setErrorMsg("Updated your schedule offline.");
      
      const today = new Date();
      const updatedSessions = selectedTask.recoveryPlan.sessions.map((s, idx) => {
        if (s.completed) return s;
        const offset = idx + 1;
        const targetDate = new Date(today.getTime() + offset * 24 * 3600 * 1000);
        return {
          ...s,
          dueDate: targetDate.toISOString().split("T")[0]
        };
      });

      onUpdateTaskRecovery(selectedTask.id, {
        overallStrategy: "Pushed remaining sessions forward to help you catch up.",
        sessions: updatedSessions,
        recalcCount: selectedTask.recoveryPlan.recalcCount + 1,
        rebuiltAt: today.toISOString().split('T')[0]
      });
    } finally {
      setGenerating(false);
    }
  };

  const isSessionOverdue = (session: TaskSession) => {
    if (session.completed) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return session.dueDate < todayStr;
  };

  return (
    <div id="recovery-planner-view" className="space-y-8 pb-16">
      
      {/* Top Banner Overview */}
      <div className="bg-[#111111] border border-white/5 p-8 md:p-10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 text-left shadow-sm">
        <div className="space-y-4 max-w-xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/60 uppercase tracking-widest">
            <Compass size={14} className="text-white/40" /> Action Steps
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">Step-by-Step Action Plans</h1>
          <p className="text-base text-white/50 leading-relaxed font-light">
            Break down your big deadlines into small, manageable focus sessions. If you fall behind or miss a session, recalculate your plan to easily catch up without the stress.
          </p>
        </div>
        
        <div className="flex gap-4 shrink-0 text-center">
          <div className="px-6 py-5 bg-[#161616] border border-white/5 rounded-2xl min-w-[120px] shadow-sm">
            <span className="text-xs text-white/40 block tracking-widest uppercase font-semibold">Focus sessions</span>
            <span className="text-3xl font-display font-semibold text-emerald-400 block mt-2">
              {tasks.filter(t => t.recoveryPlan).reduce((acc, t) => acc + (t.recoveryPlan?.sessions.length || 0), 0)}
            </span>
          </div>
          <div className="px-6 py-5 bg-[#161616] border border-white/5 rounded-2xl min-w-[120px] shadow-sm">
            <span className="text-xs text-white/40 block tracking-widest uppercase font-semibold">Missed steps</span>
            <span className="text-3xl font-display font-semibold text-red-400 block mt-2">
              {tasks.reduce((acc, t) => acc + (t.missedMilestonesCount || 0), 0)}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-500 font-mono flex items-center gap-2">
          <AlertOctagon size={14} />
          {errorMsg}
        </div>
      )}

      {activeTasks.length === 0 ? (
        <div className="bg-[#111111] border border-dashed border-white/10 p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4 shadow-sm">
          <ShieldCheck size={48} className="mx-auto text-emerald-400/50 mb-2" />
          <h3 className="text-xl font-display font-semibold text-white">All Commitments Fully Secured</h3>
          <p className="text-sm text-white/50 font-light leading-relaxed">Paced action blocks are completed. Trajectory stays balanced.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Active Tasks Menu sidebar selection */}
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 lg:col-span-4 space-y-4 h-fit text-left shadow-sm">
            <div className="text-xs font-semibold text-white/40 tracking-widest px-2 pb-3 border-b border-white/5 uppercase">
              Select Task
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar">
              {activeTasks.map((task) => {
                const active = task.id === selectedTaskId;
                const hasPlan = !!task.recoveryPlan;
                
                return (
                  <button
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setErrorMsg("");
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-sm ${
                      active
                        ? "bg-white/5 border-white/10 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="space-y-1.5 truncate max-w-xs">
                      <div className="font-semibold text-white truncate text-[15px]">{task.title}</div>
                      <div className="text-[11px] font-semibold flex items-center gap-2 leading-none uppercase tracking-wider">
                        {hasPlan ? (
                          <span className="text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block" /> Action plan active</span>
                        ) : (
                          <span className="text-white/40 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20 block" /> No plan created yet</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className={active ? "text-white" : "text-white/20"} />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Main Workspace content */}
          <div className="lg:col-span-8 text-left">
            {selectedTask ? (
              <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 md:p-10 space-y-8 relative shadow-sm text-left">

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/5 pb-8 text-left">
                  <div className="space-y-3 max-w-xl text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40 font-semibold uppercase tracking-widest block">Due date and steps</span>
                      {selectedTask.missedMilestonesCount ? (
                        <span className="px-2.5 py-1 rounded text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-semibold uppercase tracking-widest leading-none">
                          Reschedules: {selectedTask.missedMilestonesCount}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-3xl font-display font-semibold text-white tracking-tight">{selectedTask.title}</h2>
                    <p className="text-base text-white/60 font-light leading-relaxed mt-2">{selectedTask.description}</p>
                  </div>

                  {selectedTask.recoveryPlan && (
                    <button
                      onClick={handleRecalculatePlan}
                      disabled={generating}
                      className="px-6 py-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-full cursor-pointer transition-colors flex items-center gap-2 self-start shrink-0 disabled:opacity-50 font-semibold"
                    >
                      {generating ? (
                        <Loader2 className="animate-spin text-red-400" size={16} />
                      ) : (
                        <RefreshCw size={14} strokeWidth={2.5} />
                      )}
                      Reschedule Steps
                    </button>
                  )}
                </div>

                {selectedTask.recoveryPlan ? (
                  <div className="space-y-6">
                                     {/* Strategy Directive Box */}
                    <div className="bg-[#161616] border border-white/5 p-8 rounded-2xl space-y-4 relative text-left shadow-sm">
                      <div className="text-xs text-emerald-400 tracking-widest block font-semibold flex items-center gap-2 uppercase">
                        <Compass size={16} /> Overall Strategy
                      </div>
                      <p className="text-lg text-white/80 font-light leading-relaxed">
                        {selectedTask.recoveryPlan.overallStrategy}
                      </p>
                      
                      <div className="pt-4 flex items-center justify-between text-xs text-white/40 font-semibold uppercase tracking-widest border-t border-white/5">
                        <span>Created on: {selectedTask.recoveryPlan.rebuiltAt}</span>
                        <span>Times rescheduled: {selectedTask.recoveryPlan.recalcCount}</span>
                      </div>
                    </div>

                    {/* Slippage Alert Bannner */}
                    {selectedTask.recoveryPlan.sessions.some(s => s.missed) && (
                      <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-5 text-left shadow-sm">
                        <div className="flex items-start gap-4">
                          <AlertTriangle className="text-red-400 shrink-0 mt-1" size={24} />
                          <div className="space-y-2">
                            <h4 className="text-lg font-semibold text-white">Feeling Behind? Let's Adjust</h4>
                            <p className="text-base text-white/60 leading-relaxed font-light">
                              You missed some scheduled steps, but that's okay! We can easily recalculate your plan to spread the remaining work across your available days.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleRecalculatePlan}
                          disabled={generating}
                          className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm rounded-full transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 font-semibold"
                        >
                          {generating ? (
                            <Loader2 className="animate-spin text-red-400" size={16} />
                          ) : (
                            <RefreshCw size={14} strokeWidth={2.5} />
                          )}
                          Reschedule My Remaining Work
                        </button>
                      </div>
                    )}

                    {/* Interactive Sessions view switcher and list/stack */}
                    <div className="space-y-6 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="text-xs font-semibold text-white/40 tracking-widest block uppercase">
                          Your step-by-step work sessions
                        </div>
                        
                        {/* View Switcher Controls */}
                        <div className="inline-flex rounded-full bg-[#161616] p-1 border border-white/5">
                          <button
                            type="button"
                            onClick={() => setViewMode('stack')}
                            className={`px-4 py-2 h-[36px] flex items-center justify-center text-xs rounded-full font-semibold cursor-pointer transition-colors ${
                              viewMode === 'stack'
                                ? "bg-white/10 text-white shadow-sm"
                                : "text-white/40 hover:text-white/80"
                            }`}
                          >
                            Swiper Stack
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 h-[36px] flex items-center justify-center text-xs rounded-full font-semibold cursor-pointer transition-colors ${
                              viewMode === 'list'
                                ? "bg-white/10 text-white shadow-sm"
                                : "text-white/40 hover:text-white/80"
                            }`}
                          >
                            Scrollable List
                          </button>
                        </div>
                      </div>

                      {viewMode === 'stack' ? (
                        <div className="pt-2">
                          <GlassStackCard
                            items={getSessionCards()}
                            visibleBehind={2}
                            headerTitle="Recovery Session Roadmap"
                            headerSubtitle="Swipe or drag to explore your catch-up sessions"
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedTask.recoveryPlan.sessions.map((session, idx) => {
                            const completed = session.completed;
                            const missed = !!session.missed;
                            const delayed = !completed && !missed && isSessionOverdue(session);
                            
                            let cardBorder = "border-white/5";
                            let cardBackground = "bg-[#161616]";
                            
                            if (completed) {
                              cardBorder = "border-emerald-500/20 bg-emerald-500/5";
                            } else if (missed) {
                              cardBorder = "border-red-500/20 bg-red-500/5";
                            } else if (delayed) {
                              cardBorder = "border-amber-500/20 bg-amber-500/5";
                            }

                            return (
                              <div 
                                key={session.id}
                                className={`p-5 border rounded-2xl flex items-center justify-between gap-4 transition-all duration-200 ${cardBorder} ${cardBackground}`}
                              >
                                <div className="flex items-start gap-4 flex-grow">
                                  {/* Toggle Checkbox button */}
                                  <button
                                    type="button"
                                    onClick={() => onToggleSession(selectedTask.id, session.id, completed ? 'pending' : 'completed')}
                                    className="mt-0.5 text-white/40 hover:text-emerald-400 cursor-pointer transition shrink-0"
                                  >
                                    {completed ? (
                                      <CheckSquare size={20} className="text-emerald-400" />
                                    ) : (
                                      <Square size={20} className="text-white/20 hover:text-white/40 rounded" />
                                    )}
                                  </button>

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-white/5 border border-white/10 text-white/60 rounded uppercase tracking-widest">
                                        Session {idx + 1}
                                      </span>
                                      
                                      <span className="text-[11px] font-semibold text-white/40 flex items-center gap-1.5 uppercase tracking-widest">
                                        <Clock size={12} /> {session.durationHours} hours
                                      </span>

                                      <span className={`text-[10px] font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded uppercase tracking-widest ${
                                        completed 
                                          ? "text-emerald-400 bg-emerald-500/10" 
                                          : missed
                                            ? "text-red-400 bg-red-500/10"
                                            : delayed 
                                              ? "text-amber-400 bg-amber-500/10 animate-pulse" 
                                              : "text-white/40 bg-white/5 border border-white/10"
                                      }`}>
                                        <Calendar size={12} /> Due by: {session.dueDate} {delayed && " (overdue)"} {missed && " (missed)"}
                                      </span>
                                    </div>

                                    <h4 className={`text-base font-semibold ${completed ? "text-white/40 line-through" : missed ? "text-red-400/80" : "text-white"}`}>
                                      {session.title}
                                    </h4>
                                  </div>
                                </div>

                                <div>
                                  {completed ? (
                                    <span className="px-3 py-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] rounded uppercase tracking-widest font-semibold">
                                      Completed
                                    </span>
                                  ) : missed ? (
                                    <div className="flex items-center gap-3">
                                      <span className="px-3 py-1 border border-red-500/20 bg-red-500/10 text-red-400 text-[10px] rounded uppercase tracking-widest font-semibold">
                                        Missed
                                      </span>
                                      <button
                                        onClick={() => onToggleSession(selectedTask.id, session.id, 'pending')}
                                        className="text-xs text-white/40 hover:text-white underline font-semibold cursor-pointer"
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  ) : delayed ? (
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                      <button
                                        onClick={() => onToggleSession(selectedTask.id, session.id, 'missed')}
                                        className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[10px] rounded uppercase tracking-widest font-semibold cursor-pointer transition-colors"
                                      >
                                        Mark as missed
                                      </button>
                                      <button
                                        onClick={handleRecalculatePlan}
                                        className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[10px] rounded uppercase tracking-widest font-semibold cursor-pointer transition-colors"
                                      >
                                        Adjust
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => onToggleSession(selectedTask.id, session.id, 'missed')}
                                        className="px-3 py-1.5 text-white/40 hover:text-red-400 text-[10px] rounded border border-transparent hover:border-red-500/20 uppercase tracking-widest font-semibold transition-colors cursor-pointer"
                                      >
                                        Mark as missed
                                      </button>
                                      <span className="px-3 py-1 border border-white/10 bg-white/5 text-white/40 text-[10px] rounded uppercase tracking-widest font-semibold">
                                        Upcoming
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="p-16 text-center border border-dashed border-white/10 rounded-2xl space-y-8 bg-[#111111] text-left shadow-sm">
                    <AlertTriangle size={48} className="mx-auto text-white/20 mb-2" />
                    <div className="space-y-3 text-center">
                      <h4 className="text-xl font-display font-semibold text-white">No Action Plan Created Yet</h4>
                      <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed font-light">
                        To make this task easy to complete, let the AI assistant break down your total {selectedTask.estimatedHours} required hours into short, friendly focus sessions.
                      </p>
                    </div>

                    <button
                      onClick={handleGeneratePlan}
                      disabled={generating}
                      className="px-8 py-4 bg-white hover:bg-gray-200 text-black font-semibold text-sm rounded-full cursor-pointer transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="animate-spin text-black" size={18} /> PLANNING SESSIONS...
                        </>
                      ) : (
                        <>
                          <Compass size={18} strokeWidth={2.5} /> Create Step-by-Step Plan
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-[#111111] border border-dashed border-white/10 rounded-2xl p-16 text-center text-white/40 font-light">
                Select a task to view or create a step-by-step action plan.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
