import React, { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Loader2, ArrowLeft, ShieldAlert, Calendar, Clock, Sparkles } from "lucide-react";
import { Task } from "../types";

interface AddTaskProps {
  onAddTask: (task: Task) => void;
  onCancel: () => void;
}

export default function AddTask({ onAddTask, onCancel }: AddTaskProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5); // default 5 days from now
    return d.toISOString().split("T")[0];
  });
  const [estimatedHours, setEstimatedHours] = useState<number>(8);
  const [category, setCategory] = useState("Work");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>("medium");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter a task title");
      return;
    }
    if (!deadline) {
      setErrorMsg("A deadline is required");
      return;
    }
    if (estimatedHours <= 0) {
      setErrorMsg("Estimated work hours must be greater than 0");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/risk-prediction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          deadline,
          estimatedHours,
          category,
          priority,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to secure AI prediction.");
      }

      const predictedRisk = await res.json();
      
      const newTask: Task = {
        id: "task-" + Date.now(),
        title,
        description,
        deadline,
        estimatedHours,
        category,
        priority,
        completed: false,
        
        riskScore: predictedRisk.riskScore,
        riskLevel: predictedRisk.riskLevel,
        riskExplanation: predictedRisk.riskExplanation,
        riskFactors: predictedRisk.riskFactors,
        missedMilestonesCount: 0
      };

      onAddTask(newTask);
    } catch (err: any) {
      console.error(err);
      // Fallback
      const fallbackUrgency = 60;
      const fallbackComplexity = priority === "high" ? 75 : priority === "medium" ? 50 : 25;
      const fallbackBuffer = 40;
      const fallbackScore = Math.round((fallbackUrgency + fallbackComplexity + (100 - fallbackBuffer)) / 3);

      const newTask: Task = {
        id: "task-" + Date.now(),
        title,
        description,
        deadline,
        estimatedHours,
        category,
        priority,
        completed: false,
        riskScore: fallbackScore,
        riskLevel: fallbackScore > 75 ? "critical" : fallbackScore > 50 ? "high" : fallbackScore > 25 ? "moderate" : "low",
        riskExplanation: `We've calculated your deadline risk score at ${fallbackScore}%. We recommend breaking this task down into steady, small sessions to finish on time easily.`,
        riskFactors: {
          urgencyScore: fallbackUrgency,
          complexityScore: fallbackComplexity,
          bufferSafetyScore: fallbackBuffer
        },
        missedMilestonesCount: 0
      };
      
      onAddTask(newTask);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-2xl mx-auto pb-16"
    >
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 md:p-10 relative shadow-sm overflow-hidden">
        
        <div className="flex items-start gap-4 mb-10">
          <button
            onClick={onCancel}
            className="p-2 border border-white/10 rounded-xl bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer mt-1"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-3xl font-display font-semibold text-white tracking-tight">Add New Task</h2>
            <p className="text-base text-white/60 mt-2 leading-relaxed font-light">Check if your deadline is realistic and get a step-by-step focus plan.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-sm text-red-400 font-mono flex items-center gap-2.5">
            <ShieldAlert size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/40 tracking-widest block uppercase">Task Title</label>
            <input
              type="text"
              id="input-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Design presentation slides"
              className="w-full bg-[#161616] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors font-display"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/40 tracking-widest block uppercase">Description</label>
            <textarea
              id="input-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done? List any milestones, notes, or potential bottlenecks."
              rows={3}
              className="w-full bg-[#161616] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors font-display resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 tracking-widest block uppercase">Target Deadline</label>
              <div className="relative">
                <input
                  type="date"
                  id="input-deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[#161616] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-white/20 transition-colors font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 tracking-widest block uppercase">Estimated Time (Hours)</label>
              <input
                type="number"
                id="input-hours"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 0)}
                min={1}
                className="w-full bg-[#161616] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-white/20 transition-colors font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 tracking-widest block uppercase">Task Category</label>
              <select
                id="select-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#161616] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-white/20 transition-colors font-display"
              >
                <option value="Work">Work (Professional)</option>
                <option value="Study">Study (Research / Skill)</option>
                <option value="Finance">Finance (Tax / Audits)</option>
                <option value="Life">Life (General / Admin)</option>
                <option value="Personal">Personal (Health / Backburner)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 tracking-widest block uppercase">Priority Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-3 px-2 rounded-xl text-xs uppercase tracking-widest transition-colors cursor-pointer ${
                      priority === p
                        ? "bg-white text-black font-semibold shadow-sm"
                        : "bg-[#161616] border border-white/5 text-white/40 hover:bg-white/5 hover:text-white font-semibold"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form CTA Buttons */}
          <div className="pt-8 flex items-center justify-end gap-3 border-t border-white/5 mt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 bg-transparent text-white/60 hover:text-white hover:bg-white/5 rounded-full text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-white hover:bg-gray-200 text-black font-semibold rounded-full text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Calculating...
                </>
              ) : (
                <>
                  <Sparkles size={16} strokeWidth={2.5} /> Add Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
