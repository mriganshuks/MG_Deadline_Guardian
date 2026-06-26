import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, RecoveryPlan, SimulationResult } from "../types";
import RiskPrediction from "./RiskPrediction";
import FutureSimulator from "./FutureSimulator";
import RecoveryPlanner from "./RecoveryPlanner";
import { AlertTriangle, Activity, ListChecks, Sparkles } from "lucide-react";

interface InsightsProps {
  tasks: Task[];
  onUpdateTaskRisk: (taskId: string, riskData: Partial<Task>) => void;
  initialSimulation: SimulationResult | null;
  onSaveSimulation: (result: SimulationResult) => void;
  defaultSelectedTaskId: string | null;
  onUpdateTaskRecovery: (taskId: string, recoveryData: RecoveryPlan) => void;
  onToggleSession: (taskId: string, sessionId: string, status?: "completed" | "missed" | "pending") => void;
  onIncrementMissedMilestone: (taskId: string) => void;
}

export default function Insights({
  tasks,
  onUpdateTaskRisk,
  initialSimulation,
  onSaveSimulation,
  defaultSelectedTaskId,
  onUpdateTaskRecovery,
  onToggleSession,
  onIncrementMissedMilestone,
}: InsightsProps) {
  // Determine starting tab: if a specific task was selected for recovery, show Recovery tab first
  const [activeSubTab, setActiveSubTab] = useState<"risk" | "simulator" | "recovery">(
    defaultSelectedTaskId ? "recovery" : "risk"
  );

  const subTabs = [
    {
      id: "risk" as const,
      label: "Risk Prediction",
      description: "Am I on track?",
      icon: AlertTriangle,
      color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    },
    {
      id: "simulator" as const,
      label: "Delay Simulation",
      description: "Impact of delay",
      icon: Activity,
      color: "text-rose-400 border-rose-500/20 bg-rose-500/5",
    },
    {
      id: "recovery" as const,
      label: "Catch-up Plan",
      description: "Paced catch-up",
      icon: ListChecks,
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation selector bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`relative overflow-hidden rounded-xl p-3 text-left border transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                isActive
                  ? `${tab.color} border-current ring-1 ring-white/10`
                  : "bg-white/[0.01] border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive ? "bg-white/10" : "bg-white/[0.02] group-hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "" : "text-slate-450"} />
                </div>
                <div>
                  <span className={`text-xs font-semibold block transition-colors ${isActive ? "text-white" : "text-slate-350"}`}>
                    {tab.label}
                  </span>
                  <span className="text-[10px] text-slate-500 font-light block">{tab.description}</span>
                </div>
              </div>
              <div
                className={`w-1.5 h-1.5 rounded-full transition-transform ${
                  isActive ? "bg-current scale-100" : "bg-transparent scale-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Main Sub-view content area */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="focus:outline-none"
          >
            {activeSubTab === "risk" && (
              <RiskPrediction tasks={tasks} onUpdateTaskRisk={onUpdateTaskRisk} />
            )}
            {activeSubTab === "simulator" && (
              <FutureSimulator
                tasks={tasks}
                initialSimulation={initialSimulation}
                onSaveSimulation={onSaveSimulation}
              />
            )}
            {activeSubTab === "recovery" && (
              <RecoveryPlanner
                tasks={tasks}
                defaultSelectedTaskId={defaultSelectedTaskId}
                onUpdateTaskRecovery={onUpdateTaskRecovery}
                onToggleSession={onToggleSession}
                onIncrementMissedMilestone={onIncrementMissedMilestone}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
