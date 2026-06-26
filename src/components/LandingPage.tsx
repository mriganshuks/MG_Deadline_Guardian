import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Flame, 
  ShieldCheck, 
  Menu, 
  X
} from "lucide-react";
import { Task } from "../types";
import Hls from "hls.js";
import { User } from "@supabase/supabase-js";

interface LandingPageProps {
  tasks: Task[];
  onStart: () => void;
  onStartDemo: () => void;
  onSignIn: () => Promise<void>;
  user: User | null;
}

export default function LandingPage({ tasks, onStart, onStartDemo, onSignIn, user }: LandingPageProps) {
  const [simulating, setSimulating] = useState(false);
  const [simCompleted, setSimCompleted] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const runSimulation = () => {
    setSimulating(true);
    setSimCompleted(false);
    setSimulationStep(0);
    
    // Simulate multi-stage quantum timeline calculation
    const timer1 = setTimeout(() => setSimulationStep(1), 600);
    const timer2 = setTimeout(() => setSimulationStep(2), 1200);
    const timer3 = setTimeout(() => setSimulationStep(3), 1800);
    const timer4 = setTimeout(() => {
      setSimulating(false);
      setSimCompleted(true);
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-white">
      
      {/* Global Navigation Header */}
      <header className="sticky top-0 w-full border-b border-white/8 bg-[#050816]/75 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="text-emerald-400 w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-sans font-bold text-sm tracking-wide text-white block">
                Deadline Guardian <span className="text-emerald-400">AI</span>
              </span>
              <span className="text-[9px] text-slate-500 font-mono block tracking-wider mt-0.5">
                AI DEADLINE COMPANION
              </span>
            </div>
          </div>

          {/* Desktop Menu links (16px, hover: #10b981) */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-sans font-medium text-slate-300">
            <button 
              onClick={() => {
                const el = document.getElementById("future-simulator-centerpiece");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-[#34d399] transition tracking-wide text-[13px] font-semibold cursor-pointer bg-transparent border-none"
            >
              Future Simulator
            </button>
            <button 
              onClick={onStartDemo}
              className="hover:text-[#34d399] transition tracking-wide text-[13px] font-semibold cursor-pointer bg-transparent border-none"
            >
              Explore Demo
            </button>
            <button 
              onClick={onStart}
              className="hover:text-[#34d399] transition tracking-wide text-[13px] font-semibold cursor-pointer bg-transparent border-none"
            >
              My Dashboard
            </button>
          </div>

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Full-Screen Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#050816] z-35 flex flex-col pt-24 px-6 gap-6 md:hidden text-left"
          >
            <div className="flex flex-col gap-5 text-lg font-sans font-bold">
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  const el = document.getElementById("future-simulator-centerpiece");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-slate-200 hover:text-emerald-400 text-left transition py-2 bg-transparent border-none"
              >
                FUTURE SIMULATOR
              </button>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartDemo();
                }}
                className="text-slate-200 hover:text-emerald-400 text-left transition py-2 bg-transparent border-none"
              >
                EXPLORE DEMO
              </button>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStart();
                }}
                className="text-slate-200 hover:text-emerald-400 text-left transition py-2 bg-transparent border-none"
              >
                MY DASHBOARD
              </button>
            </div>

            <div className="h-[1px] bg-white/8 w-full my-4" />

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStart();
                }}
                className="w-full h-[48px] bg-emerald-400 hover:bg-[#10b981] text-[#050816] font-sans font-bold rounded-full uppercase flex items-center justify-center gap-2 transition"
              >
                Start Planning <ArrowRight size={16} />
              </button>
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  if (user) {
                    onStart();
                  } else {
                    await onSignIn();
                  }
                }}
                className="w-full h-[48px] border border-white/20 hover:bg-white/5 text-white font-sans font-bold rounded-full uppercase flex items-center justify-center gap-2 transition"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.02c2.35-2.16 3.7-5.35 3.7-9.14z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.02-3.12c-1.12.75-2.55 1.19-4.02 1.19-3.09 0-5.71-2.09-6.64-4.89H1.14v3.22C3.12 21.39 7.3 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.36 14.28a7.22 7.22 0 0 1 0-4.56V6.5H1.14a11.98 11.98 0 0 0 0 11l4.22-3.22z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.3 0 3.12 2.61 1.14 6.5l4.22 3.22c.93-2.8 3.55-4.89 6.64-4.89z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Body Content */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 md:pt-36 md:pb-32 text-center relative z-20 flex-grow flex flex-col items-center justify-center">
        
        {/* Eyebrow */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-sans text-[11px] font-bold text-emerald-400 tracking-wider uppercase mb-4"
        >
          AI-Powered Productivity Companion
        </motion.div>

        {/* Main Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-sans font-bold uppercase tracking-tight text-white leading-[1.1] max-w-4xl"
        >
          NEVER MISS A DEADLINE<span className="text-emerald-400">.</span>
        </motion.h1>

        {/* Description: minimum body text 16px constraint satisfied */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 text-slate-300 text-[16px] md:text-[18px] max-w-[512px] font-sans font-normal leading-relaxed tracking-normal"
        >
          Predict deadline risks, receive personalized recovery plans, simulate future outcomes, and stay ahead before deadlines become stressful.
        </motion.p>
        
        {/* Core Actions (buttons at least 44px tall) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5 z-10 w-full sm:w-auto"
        >
          <button
            id="btn-access-suite"
            onClick={onStart}
            className="h-[48px] px-8 bg-emerald-400 hover:bg-[#10b981] text-[#050816] font-sans font-bold rounded-full text-xs tracking-wider uppercase transition duration-300 inline-flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(52,211,153,0.25)] hover:shadow-[0_4px_25px_rgba(52,211,153,0.35)] cursor-pointer w-full sm:w-64"
          >
            Continue as Guest
            <ArrowRight size={15} />
          </button>

          <button
            id="btn-continue-google"
            onClick={async () => {
              if (user) {
                onStart();
              } else {
                await onSignIn();
              }
            }}
            className="h-[48px] px-8 bg-transparent hover:bg-white/5 text-white font-sans font-bold border border-white/20 hover:border-white/45 rounded-full text-xs tracking-wider uppercase transition duration-300 inline-flex items-center justify-center gap-2.5 cursor-pointer w-full sm:w-64 animate-shimmer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.02c2.35-2.16 3.7-5.35 3.7-9.14z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.02-3.12c-1.12.75-2.55 1.19-4.02 1.19-3.09 0-5.71-2.09-6.64-4.89H1.14v3.22C3.12 21.39 7.3 24 12 24z"/>
              <path fill="#FBBC05" d="M5.36 14.28a7.22 7.22 0 0 1 0-4.56V6.5H1.14a11.98 11.98 0 0 0 0 11l4.22-3.22z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.3 0 3.12 2.61 1.14 6.5l4.22 3.22c.93-2.8 3.55-4.89 6.64-4.89z"/>
            </svg>
            Continue with Google
          </button>
        </motion.div>

        {/* Live Simulator Sub-Trigger */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 z-10"
        >
          {!simulating && !simCompleted && (
            <button
              onClick={() => {
                runSimulation();
                setTimeout(() => {
                  const el = document.getElementById("future-simulator-centerpiece");
                  el?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="inline-flex items-center gap-2 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition cursor-pointer font-bold uppercase tracking-wider px-4 py-2 rounded-lg bg-white/[0.02] border border-white/8"
            >
              <Activity size={12} className="animate-pulse" /> Try Future Simulator Timeline Demo
            </button>
          )}

          {simulating && (
            <div className="flex flex-col items-center gap-3 mt-4">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                {simulationStep === 0 && "LOADING WORK DEADLINES..."}
                {simulationStep === 1 && "CALCULATING TYPICAL WORK HABITS..."}
                {simulationStep === 2 && "ANALYZING WEEKLY WORK HOURS..."}
                {simulationStep === 3 && "COMPARING PACED PLANS..."}
              </div>
              <div className="w-48 h-[1px] bg-white/8 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.4, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Visual Centerpiece: Interactive Dual Trajectory Timeline & Bento Showcase */}
      <div id="future-simulator-centerpiece" className="max-w-6xl w-full mx-auto px-6 pb-24 z-10 scroll-mt-24">
        <AnimatePresence mode="wait">
          {simCompleted ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: "circOut" }}
              className="space-y-10"
            >
              {/* Dual Timeline Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-6">
                
                {/* Future A: Last-Minute Cramming */}
                <div className="relative group bg-[#0b1220] border border-red-500/15 rounded-2xl p-6 md:p-8 flex flex-col justify-between overflow-hidden shadow-inner backdrop-blur-md">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                  
                  <div className="space-y-6 text-left">
                    <div className="flex items-center justify-between border-b border-white/8 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-400">
                          <TrendingDown size={15} />
                        </div>
                        <div>
                          <h4 className="font-sans font-bold text-lg text-red-400">Future A: Last-Minute Cramming</h4>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Putting things off</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono block uppercase">CHANCE OF MEETING DEADLINES</span>
                        <span className="font-mono text-lg font-bold text-red-400">14%</span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* SVG Line progress graph for Future A */}
                      <div className="bg-black/40 rounded-xl border border-white/8 p-4 relative h-36 flex items-end">
                        <svg className="absolute inset-0 w-full h-full p-2 overflow-visible">
                          <defs>
                            <linearGradient id="gradFutureA" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f87171" stopOpacity="0.08" />
                              <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="70%" x2="100%" y2="70%" className="stroke-white/[0.02]" strokeWidth="1" strokeDasharray="4 4" />
                          <motion.path 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            d="M 10,120 Q 80,105 130,105 T 260,88 T 390,85 T 510,80" 
                            fill="none" 
                            stroke="#ef4444" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                          />
                          <motion.path 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            d="M 10,120 Q 80,105 130,105 T 260,88 T 390,85 T 510,80 L 510,140 L 10,140 Z" 
                            fill="url(#gradFutureA)" 
                          />
                          <circle cx="260" cy="88" r="4" className="fill-red-500" />
                          <circle cx="390" cy="85" r="4" className="fill-red-500 animate-pulse" />
                          <circle cx="510" cy="80" r="5" className="fill-slate-950 stroke-red-500" strokeWidth="2" />
                        </svg>
                        <div className="w-full h-full flex flex-col justify-between pt-1 font-mono text-[9px] text-slate-500 relative z-10 pointer-events-none">
                          <div className="flex justify-between">
                            <span>100% TASK PROGRESS</span>
                            <span>CRAMMING ZONE</span>
                          </div>
                          <div className="flex justify-between items-end border-t border-white/[0.02] pt-1">
                            <span>Day 0</span>
                            <span className="text-red-400">STRESS ZONE (Day 4+)</span>
                            <span>Day 10</span>
                          </div>
                        </div>
                      </div>

                      {/* Consequences list */}
                      <ul className="space-y-4 text-slate-300 text-[15px] leading-relaxed">
                        <li className="flex items-start gap-3">
                          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-1" />
                          <span><strong>Missed deadlines:</strong> 3 tasks missed or delayed because of the high workload.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Flame size={16} className="text-red-400 shrink-0 mt-1" />
                          <span><strong>High workload:</strong> Work piles up, requiring you to work up to 11 hours per day near the deadline.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-1 text-red-400/80" />
                          <span><strong>Last-minute panic:</strong> A massive rush at the end causes a lot of anxiety and reduces work quality.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <span className="mt-8 font-mono text-[10px] text-red-500/80 leading-none block text-left">
                    // HIGH LAST-MINUTE STRESS PREDICTED
                  </span>
                </div>

                {/* Future B: Paced Progress */}
                <div className="relative group bg-[#0b1220] border border-emerald-500/20 rounded-2xl p-6 md:p-8 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                  
                  <div className="space-y-6 text-left">
                    <div className="flex items-center justify-between border-b border-white/8 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-855/40 flex items-center justify-center text-emerald-400">
                          <TrendingUp size={15} />
                        </div>
                        <div>
                          <h4 className="font-sans font-bold text-lg text-emerald-300">Future B: Paced Progress</h4>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Steady step-by-step sessions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono block uppercase">CHANCE OF MEETING DEADLINES</span>
                        <span className="font-mono text-lg font-bold text-emerald-400 flex items-center gap-1">
                          98% <CheckCircle2 size={14} className="text-emerald-400" />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* SVG Line progress graph for Future B */}
                      <div className="bg-emerald-950/10 rounded-xl border border-emerald-500/15 p-4 relative h-36 flex items-end overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full p-2 overflow-visible">
                          <defs>
                            <linearGradient id="gradFutureB" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="30%" x2="100%" y2="30%" className="stroke-emerald-500/10" strokeWidth="1" strokeDasharray="4 4" />
                          <motion.path 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.8, ease: "easeInOut" }}
                            d="M 10,120 L 70,110 L 130,95 L 200,80 L 280,60 L 370,45 L 430,32 L 510,12" 
                            fill="none" 
                            stroke="#34d399" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                          />
                          <motion.path 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            d="M 10,120 L 70,110 L 130,95 L 200,80 L 280,60 L 370,45 L 430,32 L 510,12 L 510,140 L 10,140 Z" 
                            fill="url(#gradFutureB)" 
                          />
                          <circle cx="200" cy="80" r="4.5" className="fill-emerald-400 animate-ping" />
                          <circle cx="200" cy="80" r="3.5" className="fill-emerald-400" />
                          <circle cx="370" cy="45" r="3.5" className="fill-emerald-400" />
                          <circle cx="510" cy="12" r="5.5" className="fill-slate-900 stroke-emerald-400" strokeWidth="2" />
                        </svg>
                        <div className="w-full h-full flex flex-col justify-between pt-1 font-mono text-[9px] text-emerald-400/80 relative z-10 pointer-events-none">
                          <div className="flex justify-between">
                            <span>STEADY PROGRESS PLANS GENERATED</span>
                            <span>100% COMPLETE</span>
                          </div>
                          <div className="flex justify-between items-end border-t border-emerald-500/10 pt-1">
                            <span>Day 0</span>
                            <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-900/30 px-1.5 rounded uppercase font-mono tracking-wider text-[8px] animate-pulse">SAFE EXTRA TIME</span>
                            <span>Day 10</span>
                          </div>
                        </div>
                      </div>

                      {/* Benefits list */}
                      <ul className="space-y-4 text-slate-300 text-[15px] leading-relaxed">
                        <li className="flex items-start gap-3">
                          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-1" />
                          <span><strong>Completed Deadlines:</strong> Keep a 100% completion rate by breaking tasks down ahead of time.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-1" />
                          <span><strong>Workload Balance:</strong> Work a manageable 2.2 hours a day instead of doing midnight marathons.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-1" />
                          <span><strong>Stress Relief:</strong> Simple notifications and gentle reminders keep you on track without pressure.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <span className="mt-8 font-mono text-[10px] text-emerald-400 leading-none flex items-center gap-1.5 uppercase text-left">
                    <Activity size={10} className="animate-pulse" /> SCHEDULE SECURED BY STEADY PROGRESS
                  </span>
                </div>

              </div>

              {/* Compare Matrix Scoreboard Panel */}
              <div className="bg-[#0b1220] border border-white/8 rounded-2xl p-8 relative backdrop-blur-md text-left">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-3 md:max-w-lg">
                    <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block font-semibold">COMPARE TIMELINES</span>
                    <h5 className="font-sans font-bold text-white text-xl md:text-2xl">"See your future before you miss a deadline"</h5>
                    <p className="text-[15px] text-slate-300 leading-relaxed font-normal tracking-normal">
                      Cramming at the last minute leaves you with a lot of unfinished work on Day 10, while paced progress helps you complete almost everything with less stress.
                    </p>
                  </div>
 
                  <div className="flex items-center gap-12 text-center shrink-0">
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold tracking-wider">LAST-MINUTE PEAK TIME</span>
                      <span className="text-2xl font-mono font-bold text-red-400">11.0h <span className="text-xs text-slate-500 font-light">/ day</span></span>
                    </div>
                    <div className="text-slate-700 font-light font-sans select-none text-2xl">/</div>
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold tracking-wider">STEADY DAILY TIME</span>
                      <span className="text-2xl font-mono font-bold text-emerald-400">2.2h <span className="text-xs text-slate-500 font-light">/ day</span></span>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Enter Suite Primary CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <button
                  id="btn-access-suite-final"
                  onClick={onStart}
                  className="h-[48px] px-10 bg-emerald-400 hover:bg-[#10b981] text-[#050816] font-sans font-bold rounded-full text-xs tracking-wider uppercase transition duration-300 inline-flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(52,211,153,0.35)] cursor-pointer w-full sm:w-auto"
                >
                  GO TO MY DASHBOARD
                  <ArrowRight size={15} />
                </button>
 
                <button
                  id="btn-access-demo-final"
                  onClick={onStartDemo}
                  className="h-[48px] px-10 bg-transparent hover:bg-white/5 text-white font-sans font-bold border border-white/20 hover:border-white/40 rounded-full text-xs tracking-wider uppercase transition duration-300 inline-flex items-center justify-center gap-3 cursor-pointer w-full sm:w-auto"
                >
                  EXPLORE DEMO MODE
                  <Sparkles size={14} className="text-emerald-400 animate-pulse" />
                </button>
              </div>

            </motion.div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-mono text-[11px] uppercase tracking-wider bg-[#0b1220]/55 rounded-2xl border border-white/8">
              {simulating ? "SIMULATING FUTURE PROGRESS..." : "Click \"Try Future Simulator\" to compare parallel timelines"}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Aesthetic minimalistic footer */}
      <footer className="w-full text-center py-8 border-t border-white/8 mt-auto z-10 bg-[#0b1220]/40">
        <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider leading-none">
          Deadline Guardian AI &bull; Helping you hit dates stress-free.
        </p>
      </footer>
    </div>
  );
}
