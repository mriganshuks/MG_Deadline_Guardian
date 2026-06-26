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
      <div className="bg-[#0b1220] border border-white/8 p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-3 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/25 text-[10px] font-mono rounded-full uppercase tracking-wider font-semibold">
            <Compass size={11} /> Action Steps
          </div>
          <h1 className="text-3xl font-sans font-bold text-white tracking-tight">Step-by-Step Action Plans</h1>
          <p className="text-base text-slate-355 leading-relaxed font-normal tracking-normal">
            Break down your big deadlines into small, manageable focus sessions. If you fall behind or miss a session, recalculate your plan to easily catch up without the stress.
          </p>
        </div>
        
        <div className="flex gap-4 shrink-0 font-mono text-center">
          <div className="px-5 py-4 bg-slate-950/40 border border-white/8 rounded-xl min-w-[110px]">
            <span className="text-[10px] text-slate-400 block tracking-wider uppercase font-semibold">Focus sessions</span>
            <span className="text-2xl font-bold text-emerald-400 block mt-1">
              {tasks.filter(t => t.recoveryPlan).reduce((acc, t) => acc + (t.recoveryPlan?.sessions.length || 0), 0)}
            </span>
          </div>
          <div className="px-5 py-4 bg-slate-950/40 border border-white/8 rounded-xl min-w-[110px]">
            <span className="text-[10px] text-slate-400 block tracking-wider uppercase font-semibold">Missed steps</span>
            <span className="text-2xl font-bold text-red-400 block mt-1">
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
        <div className="bg-[#0b1220] border border-dashed border-white/8 p-12 text-center rounded-2xl max-w-lg mx-auto space-y-4">
          <ShieldCheck size={38} className="mx-auto text-emerald-400 mb-2" />
          <h3 className="text-lg font-sans font-bold text-white">All Commitments Fully Secured</h3>
          <p className="text-base text-slate-355 font-normal leading-relaxed">Paced action blocks are completed. Trajectory stays balanced.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Active Tasks Menu sidebar selection */}
          <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-4 lg:col-span-4 space-y-3 h-fit text-left">
            <div className="text-xs font-mono font-bold text-slate-400 tracking-wider px-2 pb-2 border-b border-white/8 uppercase">
              Select Task
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto no-scrollbar">
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
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                      active
                        ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/40"
                        : "bg-slate-950/30 border-white/8 hover:border-emerald-500/10"
                    }`}
                  >
                    <div className="space-y-1 truncate max-w-xs">
                      <div className="font-sans font-bold text-white truncate text-[15px]">{task.title}</div>
                      <div className="font-mono text-[9px] text-slate-500 flex items-center gap-1.5 leading-none">
                        {hasPlan ? (
                          <span className="text-emerald-400 font-bold">● Action plan active</span>
                        ) : (
                          <span className="text-slate-500">● No plan created yet</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className={active ? "text-emerald-400" : "text-slate-600"} />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Main Workspace content */}
          <div className="lg:col-span-8 text-left">
            {selectedTask ? (
              <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-6 md:p-8 space-y-6 relative shadow-xl text-left font-sans">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/8 pb-5 text-left">
                  <div className="space-y-1.5 max-w-xl text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-mono block">Due date and steps</span>
                      {selectedTask.missedMilestonesCount ? (
                        <span className="px-2 py-0.5 rounded-full text-[8px] bg-red-500/10 border border-red-500/15 text-red-400 font-mono tracking-wider leading-none">
                          Reschedules: {selectedTask.missedMilestonesCount}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-2xl font-sans font-bold text-white tracking-tight">{selectedTask.title}</h2>
                    <p className="text-base text-slate-355 font-normal leading-relaxed mt-1.5">{selectedTask.description}</p>
                  </div>

                  {selectedTask.recoveryPlan && (
                    <button
                      onClick={handleRecalculatePlan}
                      disabled={generating}
                      className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-red-500/20 hover:border-red-500/40 text-red-400 text-sm font-mono rounded-full cursor-pointer transition flex items-center gap-2 self-start shrink-0 disabled:opacity-50 font-semibold"
                    >
                      {generating ? (
                        <Loader2 className="animate-spin text-red-400" size={15} />
                      ) : (
                        <RefreshCw size={13} strokeWidth={2.5} />
                      )}
                      Reschedule Remaining Steps
                    </button>
                  )}
                </div>

                {selectedTask.recoveryPlan ? (
                  <div className="space-y-6">
                                     {/* Strategy Directive Box */}
                    <div className="bg-slate-950/40 border border-white/8 p-6 rounded-2xl space-y-3 relative text-left">
                      <div className="text-[10px] text-emerald-400 font-mono tracking-wider block font-semibold flex items-center gap-1.5 uppercase">
                        <Compass size={14} /> Overall Strategy
                      </div>
                      <p className="text-base text-slate-200 font-normal leading-relaxed">
                        {selectedTask.recoveryPlan.overallStrategy}
                      </p>
                      
                      <div className="pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-white/8">
                        <span>Created on: {selectedTask.recoveryPlan.rebuiltAt}</span>
                        <span>Times rescheduled: {selectedTask.recoveryPlan.recalcCount}</span>
                      </div>
                    </div>

                    {/* Slippage Alert Bannner */}
                    {selectedTask.recoveryPlan.sessions.some(s => s.missed) && (
                      <div className="p-6 bg-red-950/30 border border-red-500/20 rounded-xl space-y-4 text-left">
                        <div className="flex items-start gap-3.5">
                          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white">Feeling Behind? Let's Adjust</h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-normal">
                              You missed some scheduled steps, but that's okay! We can easily recalculate your plan to spread the remaining work across your available days.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleRecalculatePlan}
                          disabled={generating}
                          className="px-5 py-2.5 bg-red-950 hover:bg-red-900 text-red-400 border border-red-500/25 text-xs font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 font-semibold uppercase tracking-wider"
                        >
                          {generating ? (
                            <Loader2 className="animate-spin text-red-400" size={14} />
                          ) : (
                            <RefreshCw size={13} strokeWidth={2.5} />
                          )}
                          Reschedule My Remaining Work
                        </button>
                      </div>
                    )}

                    {/* Interactive Sessions view switcher and list/stack */}
                    <div className="space-y-6 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
                        <div className="text-xs font-mono font-bold text-slate-400 tracking-wider block uppercase">
                          Your step-by-step work sessions
                        </div>
                        
                        {/* View Switcher Controls */}
                        <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-white/8">
                          <button
                            type="button"
                            onClick={() => setViewMode('stack')}
                            className={`px-3 py-1.5 h-[36px] flex items-center justify-center text-xs font-mono rounded-md font-bold cursor-pointer transition ${
                              viewMode === 'stack'
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "text-slate-450 hover:text-white"
                            }`}
                          >
                            Swiper Stack
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 h-[36px] flex items-center justify-center text-xs font-mono rounded-md font-bold cursor-pointer transition ${
                              viewMode === 'list'
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "text-slate-450 hover:text-white"
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
                        <div className="space-y-3">
                          {selectedTask.recoveryPlan.sessions.map((session, idx) => {
                            const completed = session.completed;
                            const missed = !!session.missed;
                            const delayed = !completed && !missed && isSessionOverdue(session);
                            
                            let cardBorder = "border-white/[0.03]";
                            let cardBackground = "bg-white/[0.01]";
                            
                            if (completed) {
                              cardBorder = "border-emerald-500/15 bg-emerald-500/[0.02]";
                            } else if (missed) {
                              cardBorder = "border-red-500/20 bg-red-500/[0.03]";
                            } else if (delayed) {
                              cardBorder = "border-amber-500/15 bg-amber-500/[0.02]";
                            }

                            return (
                              <div 
                                key={session.id}
                                className={`p-4 border rounded-xl flex items-center justify-between gap-4 transition-all duration-200 ${cardBorder} ${cardBackground}`}
                              >
                                <div className="flex items-start gap-4 flex-grow">
                                  {/* Toggle Checkbox button */}
                                  <button
                                    type="button"
                                    onClick={() => onToggleSession(selectedTask.id, session.id, completed ? 'pending' : 'completed')}
                                    className="mt-0.5 text-slate-500 hover:text-emerald-400 cursor-pointer transition shrink-0"
                                  >
                                    {completed ? (
                                      <CheckSquare size={17} className="text-emerald-400" />
                                    ) : (
                                      <Square size={17} className="text-white/[0.15] hover:border-slate-500 rounded" />
                                    )}
                                  </button>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-950/60 border border-white/[0.03] text-slate-400 rounded-full">
                                        Session {idx + 1}
                                      </span>
                                      
                                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                        <Clock size={10} /> {session.durationHours} hours
                                      </span>

                                      <span className={`text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                        completed 
                                          ? "text-emerald-400 bg-emerald-950/20" 
                                          : missed
                                            ? "text-red-400 bg-red-950/30"
                                            : delayed 
                                              ? "text-amber-400 bg-amber-950/30 animate-pulse" 
                                              : "text-slate-400 bg-white/[0.02] border border-white/[0.04]"
                                      }`}>
                                        <Calendar size={10} /> Due by: {session.dueDate} {delayed && " (overdue)"} {missed && " (missed)"}
                                      </span>
                                    </div>

                                    <h4 className={`text-base font-sans font-normal ${completed ? "text-slate-500 line-through" : missed ? "text-red-450/70" : "text-white"}`}>
                                      {session.title}
                                    </h4>
                                  </div>
                                </div>

                                <div>
                                  {completed ? (
                                    <span className="px-2.5 py-0.5 border border-emerald-800/20 bg-emerald-950/20 text-emerald-400 font-mono text-[9px] rounded-full font-bold">
                                      Completed
                                    </span>
                                  ) : missed ? (
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 border border-red-800/20 bg-red-950/20 text-red-400 font-mono text-[9px] rounded-full font-bold">
                                        Missed
                                      </span>
                                      <button
                                        onClick={() => onToggleSession(selectedTask.id, session.id, 'pending')}
                                        className="text-xs text-slate-450 hover:text-white underline font-mono text-[9px] cursor-pointer"
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  ) : delayed ? (
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                                      <button
                                        onClick={() => onToggleSession(selectedTask.id, session.id, 'missed')}
                                        className="px-2 py-1 bg-red-950/50 border border-red-900/30 text-red-450 hover:bg-red-950 hover:text-red-400 font-mono text-[9px] rounded-md cursor-pointer transition"
                                      >
                                        Mark as missed
                                      </button>
                                      <button
                                        onClick={handleRecalculatePlan}
                                        className="px-2 py-1 bg-amber-950/50 border border-amber-900/30 text-amber-400 hover:bg-amber-950 hover:text-amber-300 font-mono text-[9px] rounded-md cursor-pointer transition"
                                      >
                                        Adjust
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => onToggleSession(selectedTask.id, session.id, 'missed')}
                                        className="px-2 py-0.5 text-slate-500 hover:text-red-400 font-mono text-[9px] rounded border border-transparent hover:border-red-500/25 transition cursor-pointer"
                                      >
                                        Mark as missed
                                      </button>
                                      <span className="px-2.5 py-0.5 border border-white/[0.04] bg-slate-950 text-slate-500 font-mono text-[9px] rounded-full font-light">
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
                  <div className="p-12 text-center border border-dashed border-white/8 rounded-2xl space-y-6 bg-[#0b1220] text-left">
                    <AlertTriangle size={34} className="mx-auto text-emerald-400 animate-pulse" />
                    <div className="space-y-2 text-center">
                      <h4 className="text-lg font-sans font-bold text-white">No Action Plan Created Yet</h4>
                      <p className="text-base text-slate-355 max-w-md mx-auto leading-relaxed font-normal">
                        To make this task easy to complete, let the AI assistant break down your total {selectedTask.estimatedHours} required hours into short, friendly focus focus sessions.
                      </p>
                    </div>

                    <button
                      onClick={handleGeneratePlan}
                      disabled={generating}
                      className="px-7 py-3.5 bg-emerald-400 hover:bg-[#10b981] text-[#050816] font-sans font-bold text-sm rounded-full cursor-pointer transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="animate-spin text-slate-950" size={15} /> PLANNING SESSIONS...
                        </>
                      ) : (
                        <>
                          <Compass size={15} strokeWidth={2.5} /> Create Step-by-Step Plan
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-12 text-center text-slate-400 font-light">
                Select a task to view or create a step-by-step action plan.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
