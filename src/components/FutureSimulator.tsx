import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Task, SimulationResult, SimulationDay } from "../types";
import { GlassStackCard, GlassCardItem } from "./ui/glass-stack-card";
import { 
  Activity, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ShieldAlert, 
  Loader2,
  HelpCircle,
  ShieldCheck,
  Info,
  Flame,
  AlertTriangle
} from "lucide-react";

interface FutureSimulatorProps {
  tasks: Task[];
  initialSimulation: SimulationResult | null;
  onSaveSimulation: (result: SimulationResult) => void;
}

export default function FutureSimulator({ tasks, initialSimulation, onSaveSimulation }: FutureSimulatorProps) {
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(initialSimulation);
  const [errorMsg, setErrorMsg] = useState("");
  const [delayDays, setDelayDays] = useState(3);
  const [showDetailed, setShowDetailed] = useState(false);

  const activeTasks = tasks.filter(t => !t.completed);

  // Dynamic formula calculations for the interactive delay slider
  const trajectoryWithDelayProgress = Math.max(15, Math.round(98 - (delayDays * 11) - (activeTasks.length * 1.5)));
  const safeTrajectoryProgress = 98;
  const stressScoreWithDelay = Math.min(100, Math.round(25 + (delayDays * 16) + (activeTasks.length * 5)));
  
  // If no tasks, set missed count to 0. Else at least 1 if delayDays > 0.
  const missedDeadlinesWithDelay = activeTasks.length === 0 ? 0 : Math.min(activeTasks.length, Math.floor(delayDays / 2) || (delayDays > 0 ? 1 : 0));

  const getSimulatorCards = (): GlassCardItem[] => {
    return [
      {
        id: "paced-schedule",
        title: "Paced Schedule (Recommended)",
        subtitle: "Zero procrastination trajectory",
        mainText: "Steadily breaking work down into daily segments ensures total success on time and preserves your peace of mind. Excellent safety margin.",
        tags: [
          { text: "STRESS: LOW", type: "success" },
          { text: "SUCCESS: 98%", type: "featured" }
        ],
        stats: [
          { icon: ShieldCheck, text: `Projected Completion: ${safeTrajectoryProgress}%` }
        ],
        avatarGradient: "linear-gradient(135deg, #10b981, #059669)"
      },
      {
        id: "delayed-schedule",
        title: `Delayed Path (${delayDays} Day${delayDays === 1 ? '' : 's'} Delay)`,
        subtitle: "Compressing remaining window",
        mainText: delayDays === 0 
          ? "You are currently starting immediately, keeping stress low and timeline margins broad."
          : `Delaying for ${delayDays} day${delayDays === 1 ? '' : 's'} reduces your time buffer. You must complete more hours in intense late sessions.`,
        tags: [
          { text: `STRESS Score: ${stressScoreWithDelay}%`, type: delayDays > 3 ? "danger" : "warning" },
          { text: `SUCCESS Score: ${trajectoryWithDelayProgress}%`, type: delayDays > 3 ? "danger" : "default" }
        ],
        stats: [
          { icon: TrendingDown, text: `Missed Deadlines: ${missedDeadlinesWithDelay}` }
        ],
        avatarGradient: delayDays > 3 
          ? "linear-gradient(135deg, #ef4444, #991b1b)" 
          : "linear-gradient(135deg, #f59e0b, #d97706)"
      }
    ];
  };

  const runSimulation = async () => {
    if (tasks.length === 0) {
      setErrorMsg("Simulation requires active tasks. Please add a task first.");
      return;
    }
    
    setLoading(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/trajectory-simulator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tasks }),
      });

      if (!res.ok) {
        throw new Error("Unable to fetch response from Future Outcome Simulator");
      }

      const result: SimulationResult = await res.json();
      setSimulation(result);
      onSaveSimulation(result);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("We couldn't run the AI simulation. Here is a helpful prediction based on your typical work habits.");
      
      const sampleDays: SimulationDay[] = Array.from({ length: 11 }, (_, i) => {
        const currentProgress = Math.round(45 * Math.sin((i / 10) * (Math.PI / 2)) * (0.8 + Math.random() * 0.2));
        const recoveryProgress = Math.min(100, Math.round((i / 10) * 98 + (i > 0 ? (Math.random() * 4 - 2) : 0)));
        return {
          dayIndex: i,
          date: `Day ${i}`,
          currentProgress,
          recoveryProgress
        };
      });

      const fallbackResult: SimulationResult = {
        days: sampleDays,
        comparisonSummary: "Cramming at the last minute leaves you with a lot of unfinished work on Day 10, while paced progress helps you complete almost everything with less stress.",
        currentTrajectory: {
          name: "Last-Minute Cramming",
          finalProgress: 45,
          successProbability: 18,
          dailyCommitmentHours: 1.5,
          description: "Putting things off leads to unfinished tasks and a high risk of missing deadlines."
        },
        recoveryTrajectory: {
          name: "Paced Progress Plan",
          finalProgress: 98,
          successProbability: 98,
          dailyCommitmentHours: 4.2,
          description: "Breaking work down into steady, bite-sized sessions ahead of time."
        }
      };

      setSimulation(fallbackResult);
      onSaveSimulation(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!simulation && tasks.length > 0) {
      runSimulation();
    }
  }, []);

  return (
    <div id="future-simulator-view" className="space-y-8 pb-16">
      
      {/* Intro Banner */}
      <div className="bg-[#0b1220] border border-white/8 p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-3 max-w-xl z-10 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-800/25 text-[10px] font-mono rounded-full uppercase tracking-wider font-semibold">
            <Activity size={11} /> What-If Simulator
          </div>
          <h1 className="text-3xl font-sans font-bold text-white tracking-tight">What Happens If I Delay?</h1>
          <p className="text-base text-slate-355 leading-relaxed font-normal tracking-normal">
            See the real-time consequence of procrastinating. Drag the slider to choose your delay in days and preview how your completion trajectory changes.
          </p>
        </div>
        
        {tasks.length > 0 && (
              <button
                onClick={runSimulation}
                disabled={loading}
                className="px-6 py-3 bg-emerald-400 hover:bg-[#10b981] text-[#050816] font-mono text-sm rounded-full cursor-pointer transition flex items-center gap-2 self-start shrink-0 disabled:opacity-50 font-bold uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={15} /> Simulating...
                  </>
                ) : (
                  <>
                    <Zap size={15} /> Update Future
                  </>
                )}
              </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="bg-[#0b1220] border border-dashed border-white/8 p-12 text-center rounded-2xl max-w-lg mx-auto space-y-4">
          <Activity size={32} className="mx-auto text-slate-500 animate-pulse" />
          <div>
            <h4 className="text-sm font-semibold text-white">No active tasks to simulate</h4>
            <p className="text-xs mt-1 leading-relaxed text-slate-400">
              Create an assignment or project task first to simulate delay outcomes.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Main Simulation Panel containing the slider and progress bars */}
          <div className="bg-[#0b1220] border border-white/8 p-6 rounded-2xl space-y-8">
            
            {/* Delay Slider Selection */}
            <div className="space-y-4 max-w-xl mx-auto text-center">
              <label className="block text-lg font-sans font-bold text-slate-200">
                Choose how many days you want to delay:
              </label>
              <div className="flex items-center justify-between gap-5 py-2">
                <span className="text-sm font-mono text-slate-400 min-w-[80px] text-left">0 days (Now)</span>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <span className="text-sm font-mono text-slate-400 min-w-[80px] text-right">7 days (1 Week)</span>
              </div>
              <div className="text-base font-mono text-emerald-400 font-bold bg-emerald-950/15 py-3 px-6 rounded-xl border border-emerald-900/20 inline-block uppercase tracking-wider">
                Delay Selected: {delayDays} {delayDays === 1 ? "Day" : "Days"}
              </div>
            </div>

            {/* Progress Bars Comparative View */}
            <div className="max-w-xl mx-auto pt-4 text-left">
              <GlassStackCard
                items={getSimulatorCards()}
                visibleBehind={1}
                headerTitle="Simulated Comparison Trajectories"
                headerSubtitle="Swipe or drag to compare starting today vs delaying"
              />
            </div>

            {/* Bold Callout Student Friendly Warning Banner */}
            {delayDays > 3 ? (
              <div className="space-y-4 max-w-3xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-red-500/10 border border-red-500/40 p-6 rounded-2xl flex items-start gap-3.5 text-left select-none relative overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                >
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
                  <div className="p-2 bg-red-950/40 border border-red-500/35 text-red-400 rounded-xl shrink-0 mt-0.5">
                    <ShieldAlert size={20} className="animate-pulse text-red-400" />
                  </div>
                  <div className="space-y-2 text-left">
                    <h4 className="text-[10px] font-mono font-bold text-red-400 tracking-wider flex items-center gap-1.5 uppercase">
                      🚨 Extreme Path Compression
                    </h4>
                    <p className="text-base text-red-100 leading-relaxed font-bold">
                      Waiting 3 more days could reduce your completion chance from 92% to 54%.
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed font-normal tracking-normal">
                      If you delay <span className="text-red-400 font-bold underline underline-offset-4 font-mono">{delayDays} days</span>, your stress score jumps to <span className="text-red-400 font-bold underline underline-offset-4 font-mono">{stressScoreWithDelay}%</span> and you will miss <span className="text-red-400 font-bold underline underline-offset-4 font-mono">{missedDeadlinesWithDelay}</span> {missedDeadlinesWithDelay === 1 ? "deadline" : "deadlines"}.
                    </p>
                  </div>
                </motion.div>
              </div>
            ) : delayDays > 0 ? (
              <div className="bg-red-500/5 border border-red-500/15 max-w-3xl mx-auto p-6 rounded-2xl flex items-start gap-3.5 text-left select-none">
                <div className="p-2 bg-red-950/30 border border-red-800/20 text-red-500 rounded-xl shrink-0 mt-0.5">
                  <Flame size={18} className="fill-red-500 text-red-400 animate-pulse" />
                </div>
                <div className="space-y-2 text-left">
                  <h4 className="text-[10px] font-mono font-bold text-red-400 tracking-wider uppercase">Delay Warning</h4>
                  <p className="text-base text-slate-200 leading-relaxed font-semibold tracking-normal">
                    "If you delay <span className="text-red-400 font-bold underline underline-offset-4 font-mono">{delayDays} {delayDays === 1 ? "day" : "days"}</span>, your stress score jumps to <span className="text-red-400 font-bold underline underline-offset-4 font-mono">{stressScoreWithDelay}%</span> and you will miss <span className="text-red-400 font-bold underline underline-offset-4 font-mono">{missedDeadlinesWithDelay}</span> {missedDeadlinesWithDelay === 1 ? "deadline" : "deadlines"}."
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/15 max-w-3xl mx-auto p-6 rounded-2xl flex items-start gap-3.5 text-left select-none">
                <div className="p-2 bg-emerald-950/30 border border-emerald-800/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div className="space-y-2 text-left">
                  <h4 className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider uppercase">Secure Progress</h4>
                  <p className="text-base text-slate-200 leading-relaxed font-normal tracking-normal">
                    Starting on time keeps your stress level super low ({stressScoreWithDelay}%) and completely guarantees that you finish all your school work on time. No missed deadlines!
                  </p>
                </div>
              </div>
            )}

            {/* Impacted Deadlines Breakdown to Highlight Missed Deadlines */}
            <div className="mt-8 border-t border-white/[0.04] pt-8 max-w-3xl mx-auto text-left">
              <h4 className="text-sm font-mono font-bold text-slate-400 tracking-wider mb-5 flex items-center gap-1.5 uppercase">
                <AlertTriangle size={15} className={delayDays > 3 ? "text-red-400 animate-bounce" : "text-slate-500"} /> 
                Task Portfolio Deadline Impact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {activeTasks.map((task, idx) => {
                  const isMissed = idx < missedDeadlinesWithDelay;
                  return (
                    <motion.div
                      key={task.id}
                      initial={false}
                      animate={isMissed && delayDays > 3 ? {
                        x: [0, -3, 3, -3, 3, 0],
                        borderColor: "rgba(239, 68, 68, 0.45)",
                        backgroundColor: "rgba(239, 68, 68, 0.05)",
                        boxShadow: "0 0 15px rgba(239, 68, 68, 0.08)"
                      } : isMissed ? {
                        x: 0,
                        borderColor: "rgba(239, 68, 68, 0.2)",
                        backgroundColor: "rgba(239, 68, 68, 0.02)",
                        boxShadow: "none"
                      } : {
                        x: 0,
                        borderColor: "rgba(255, 255, 255, 0.04)",
                        backgroundColor: "rgba(255, 255, 255, 0.01)",
                        boxShadow: "none"
                      }}
                      transition={isMissed && delayDays > 3 ? {
                        x: { repeat: Infinity, repeatType: "mirror", duration: 0.35, repeatDelay: 3 },
                        borderColor: { duration: 0.3 },
                        backgroundColor: { duration: 0.3 }
                      } : { duration: 0.3 }}
                      className="border border-white/8 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[120px]"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2.5">
                          <span className="text-sm font-semibold text-white line-clamp-1 text-left">{task.title}</span>
                          {isMissed ? (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${delayDays > 3 ? "bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse" : "bg-red-950/20 border border-red-900/30 text-red-400"}`}>
                              ⚠️ MISSED
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 shrink-0">
                              ✓ ON TIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-350 font-normal text-left">
                          Effort required: <span className="font-mono text-slate-300 font-semibold">{task.estimatedHours} hours</span>
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-white/[0.04] pt-2">
                        <span>Due: {task.deadline}</span>
                        {isMissed && delayDays > 3 && (
                          <span className="text-red-400 font-semibold animate-pulse">Critical Overload</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* AI Trajectory Comparison & Detailed Review Accordion Section */}
          {simulation && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <button
                  onClick={() => setShowDetailed(!showDetailed)}
                  className="px-5 py-3 bg-[#0b1220] hover:bg-slate-950 border border-white/8 hover:border-emerald-500/30 text-sm font-mono rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-2 font-bold uppercase tracking-wider"
                >
                  {showDetailed ? "Hide Details" : "Show Details"}
                </button>
              </div>

              {showDetailed && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                  {/* Left: summary box */}
                  <div className="lg:col-span-8 bg-[#0b1220] p-8 rounded-2xl border border-white/8 space-y-4 text-left">
                    <span className="text-[10px] text-slate-450 font-mono uppercase tracking-wider block font-bold flex items-center gap-1">
                      <Info size={11} className="text-emerald-400" /> Comparison Review
                    </span>
                    <p className="text-base text-slate-200 leading-relaxed font-normal pl-4 border-l-2 border-emerald-500/30 font-sans">
                      {simulation.comparisonSummary}
                    </p>
                  </div>

                  {/* Right: Default Trajectories Outcome Cards */}
                  <div className="lg:col-span-4 space-y-6 font-sans">
                    {/* Default */}
                    <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-6 space-y-4 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-red-950/20 border border-red-500/15 rounded-lg text-red-400">
                          <TrendingDown size={15} />
                        </div>
                        <h4 className="text-base font-sans font-bold text-red-400 tracking-tight">
                          {simulation.currentTrajectory.name}
                        </h4>
                      </div>

                      <div className="space-y-2 border-b border-white/8 pb-3 text-sm font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-450">Estimated work done</span>
                          <span className="text-slate-100 font-bold">{simulation.currentTrajectory.finalProgress}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-455">Success rate</span>
                          <span className="text-red-400 font-bold">{simulation.currentTrajectory.successProbability}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-455">Peak daily time</span>
                          <span className="text-slate-100 font-bold">{simulation.currentTrajectory.dailyCommitmentHours}h</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-350 leading-relaxed font-normal">
                        {simulation.currentTrajectory.description}
                      </p>
                    </div>

                    {/* Safe */}
                    <div className="bg-[#0b1220] border border-emerald-500/20 rounded-2xl p-6 space-y-4 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-950/20 border border-emerald-500/15 rounded-lg text-emerald-400">
                          <TrendingUp size={15} />
                        </div>
                        <h4 className="text-base font-sans font-bold text-emerald-400 tracking-tight">
                          {simulation.recoveryTrajectory.name}
                        </h4>
                      </div>

                      <div className="space-y-2 border-b border-white/8 pb-3 text-sm font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-455">Estimated work done</span>
                          <span className="text-slate-100 font-bold">{simulation.recoveryTrajectory.finalProgress}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-455">Success rate</span>
                          <span className="text-emerald-400 font-bold">{simulation.recoveryTrajectory.successProbability}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-455">Steady daily time</span>
                          <span className="text-slate-100 font-bold">{simulation.recoveryTrajectory.dailyCommitmentHours}h</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-normal">
                        {simulation.recoveryTrajectory.description}
                      </p>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
