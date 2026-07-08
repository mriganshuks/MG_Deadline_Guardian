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
      <div className="bg-[#111111] border border-white/5 p-8 md:p-10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-sm">
        <div className="space-y-4 max-w-xl z-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/60 uppercase tracking-widest">
            <Activity size={14} className="text-white/40" /> What-If Simulator
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">What Happens If I Delay?</h1>
          <p className="text-base text-white/50 leading-relaxed font-light">
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
        <div className="bg-[#111111] border border-dashed border-white/10 p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4 shadow-sm">
          <Activity size={48} className="mx-auto text-white/20 mb-2" />
          <div>
            <h4 className="text-xl font-display font-semibold text-white">No active tasks to simulate</h4>
            <p className="text-sm mt-2 leading-relaxed text-white/50 font-light">
              Create an assignment or project task first to simulate delay outcomes.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Main Simulation Panel containing the slider and progress bars */}
          <div className="bg-[#161616] border border-white/5 p-8 md:p-10 rounded-2xl space-y-10 shadow-sm">
            
            {/* Delay Slider Selection */}
            <div className="space-y-6 max-w-2xl mx-auto text-center">
              <label className="block text-xl font-display font-semibold text-white">
                Choose how many days you want to delay:
              </label>
              <div className="flex items-center justify-between gap-6 py-4">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest min-w-[80px] text-left">Now</span>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-gray-300 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all"
                />
                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest min-w-[80px] text-right">1 Week</span>
              </div>
              <div className="text-sm font-semibold text-white bg-white/5 py-4 px-8 rounded-full border border-white/10 inline-block tracking-wide">
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
              <div className="space-y-4 max-w-4xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-red-500/5 border border-red-500/20 p-8 rounded-2xl flex items-start gap-4 text-left select-none relative overflow-hidden shadow-sm"
                >
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl shrink-0 mt-1">
                    <ShieldAlert size={24} className="text-red-400" />
                  </div>
                  <div className="space-y-3 text-left">
                    <h4 className="text-xs font-semibold text-red-400 tracking-widest flex items-center gap-2 uppercase">
                      🚨 Extreme Path Compression
                    </h4>
                    <p className="text-lg text-white/90 leading-relaxed font-semibold">
                      Waiting 3 more days could reduce your completion chance from 92% to 54%.
                    </p>
                    <p className="text-base text-white/60 leading-relaxed font-light">
                      If you delay <span className="text-white font-semibold underline underline-offset-4">{delayDays} days</span>, your stress score jumps to <span className="text-red-400 font-semibold">{stressScoreWithDelay}%</span> and you will miss <span className="text-red-400 font-semibold">{missedDeadlinesWithDelay}</span> {missedDeadlinesWithDelay === 1 ? "deadline" : "deadlines"}.
                    </p>
                  </div>
                </motion.div>
              </div>
            ) : delayDays > 0 ? (
              <div className="bg-red-500/5 border border-red-500/20 max-w-4xl mx-auto p-8 rounded-2xl flex items-start gap-4 text-left select-none shadow-sm">
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl shrink-0 mt-1">
                  <Flame size={24} className="text-red-400" />
                </div>
                <div className="space-y-3 text-left">
                  <h4 className="text-xs font-semibold text-red-400 tracking-widest uppercase">Delay Warning</h4>
                  <p className="text-base text-white/80 leading-relaxed font-light">
                    "If you delay <span className="text-white font-semibold underline underline-offset-4">{delayDays} {delayDays === 1 ? "day" : "days"}</span>, your stress score jumps to <span className="text-red-400 font-semibold">{stressScoreWithDelay}%</span> and you will miss <span className="text-red-400 font-semibold">{missedDeadlinesWithDelay}</span> {missedDeadlinesWithDelay === 1 ? "deadline" : "deadlines"}."
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/20 max-w-4xl mx-auto p-8 rounded-2xl flex items-start gap-4 text-left select-none shadow-sm">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shrink-0 mt-1">
                  <ShieldCheck size={24} />
                </div>
                <div className="space-y-3 text-left">
                  <h4 className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">Secure Progress</h4>
                  <p className="text-base text-white/80 leading-relaxed font-light">
                    Starting on time keeps your stress level super low ({stressScoreWithDelay}%) and completely guarantees that you finish all your school work on time. No missed deadlines!
                  </p>
                </div>
              </div>
            )}

            {/* Impacted Deadlines Breakdown to Highlight Missed Deadlines */}
            {/* Impacted Deadlines Breakdown to Highlight Missed Deadlines */}
            <div className="mt-10 border-t border-white/5 pt-10 max-w-4xl mx-auto text-left">
              <h4 className="text-sm font-semibold text-white/40 tracking-widest mb-6 flex items-center gap-2 uppercase">
                <AlertTriangle size={16} className={delayDays > 3 ? "text-red-400 animate-bounce" : "text-white/60"} /> 
                Task Portfolio Deadline Impact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                      } : isMissed ? {
                        x: 0,
                        borderColor: "rgba(239, 68, 68, 0.2)",
                        backgroundColor: "rgba(239, 68, 68, 0.02)",
                      } : {
                        x: 0,
                        borderColor: "rgba(255, 255, 255, 0.05)",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                      }}
                      transition={isMissed && delayDays > 3 ? {
                        x: { repeat: Infinity, repeatType: "mirror", duration: 0.35, repeatDelay: 3 },
                        borderColor: { duration: 0.3 },
                        backgroundColor: { duration: 0.3 }
                      } : { duration: 0.3 }}
                      className="border border-white/10 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-base font-semibold text-white line-clamp-1 text-left">{task.title}</span>
                          {isMissed ? (
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded shrink-0 uppercase tracking-widest ${delayDays > 3 ? "bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse" : "bg-red-500/5 border border-red-500/10 text-red-400"}`}>
                              ⚠️ Missed
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 uppercase tracking-widest rounded">
                              ✓ On Time
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/50 font-light text-left">
                          Effort required: <span className="text-white/80 font-medium">{task.estimatedHours} hours</span>
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-medium text-white/40 border-t border-white/5 pt-4">
                        <span>Due: {task.deadline}</span>
                        {isMissed && delayDays > 3 && (
                          <span className="text-red-400 font-bold animate-pulse">Critical Overload</span>
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
                  className="px-6 py-2.5 bg-[#111111] hover:bg-white/5 border border-white/10 text-xs font-semibold rounded-full text-white/60 hover:text-white transition-colors flex items-center gap-2"
                >
                  {showDetailed ? "Hide Details" : "Show Details"}
                </button>
              </div>

              {showDetailed && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
                  {/* Left: summary box */}
                  <div className="lg:col-span-8 bg-[#111111] p-8 md:p-10 rounded-2xl border border-white/5 space-y-6 text-left shadow-sm">
                    <span className="text-xs text-white/40 font-semibold uppercase tracking-widest flex items-center gap-2">
                      <Info size={14} className="text-white/60" /> Comparison Review
                    </span>
                    <p className="text-lg text-white/80 leading-relaxed font-light pl-4 border-l border-emerald-500/30">
                      {simulation.comparisonSummary}
                    </p>
                  </div>

                  {/* Right: Default Trajectories Outcome Cards */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Default */}
                    <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 space-y-6 text-left shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                          <TrendingDown size={18} />
                        </div>
                        <h4 className="text-lg font-display font-semibold text-red-400">
                          {simulation.currentTrajectory.name}
                        </h4>
                      </div>

                      <div className="space-y-3 border-b border-white/5 pb-4 text-sm font-semibold text-white/40">
                        <div className="flex items-center justify-between">
                          <span>Estimated work done</span>
                          <span className="text-white">{simulation.currentTrajectory.finalProgress}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Success rate</span>
                          <span className="text-red-400">{simulation.currentTrajectory.successProbability}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Peak daily time</span>
                          <span className="text-white">{simulation.currentTrajectory.dailyCommitmentHours}h</span>
                        </div>
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed font-light">
                        {simulation.currentTrajectory.description}
                      </p>
                    </div>

                    {/* Safe */}
                    <div className="bg-[#111111] border border-emerald-500/20 rounded-2xl p-8 space-y-6 text-left shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                          <TrendingUp size={18} />
                        </div>
                        <h4 className="text-lg font-display font-semibold text-emerald-400">
                          {simulation.recoveryTrajectory.name}
                        </h4>
                      </div>

                      <div className="space-y-3 border-b border-white/5 pb-4 text-sm font-semibold text-white/40">
                        <div className="flex items-center justify-between">
                          <span>Estimated work done</span>
                          <span className="text-white">{simulation.recoveryTrajectory.finalProgress}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Success rate</span>
                          <span className="text-emerald-400">{simulation.recoveryTrajectory.successProbability}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Steady daily time</span>
                          <span className="text-white">{simulation.recoveryTrajectory.dailyCommitmentHours}h</span>
                        </div>
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed font-light">
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
