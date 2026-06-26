import { Task } from "./types";

export const initialTasks: Task[] = [
  {
    id: "demo-task-1",
    title: "Quarterly Financial Audit Report",
    description: "Compile and audit expense registers, tax deductions, and operating revenue charts for the external stakeholders.",
    deadline: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 4);
      return d.toISOString().split('T')[0];
    })(),
    estimatedHours: 14,
    category: "Finance",
    priority: "high",
    completed: false,
    riskScore: 68,
    riskLevel: "high",
    riskExplanation: "Very tight timeline with only 4 days to compile extensive multi-department audits. High chance of putting off the work due to high task difficulty and lack of extra time.",
    riskFactors: {
      urgencyScore: 82,
      complexityScore: 75,
      bufferSafetyScore: 24
    },
    recoveryPlan: {
      overallStrategy: "Immediate schedule adjustment. Avoid feeling stuck by blocking off 3-hour focused sessions during your best alert times.",
      recalcCount: 0,
      rebuiltAt: new Date().toISOString().split('T')[0],
      sessions: [
        {
          id: "s1",
          title: "Verify Operating Revenue Logs and Cross-match Receipts",
          durationHours: 4,
          dueDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
          })(),
          completed: false
        },
        {
          id: "s2",
          title: "Assemble Tax Deductions and Prepare Draft Sheet",
          durationHours: 5,
          dueDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 2);
            return d.toISOString().split('T')[0];
          })(),
          completed: false
        },
        {
          id: "s3",
          title: "Run Consolidated Adjustments, Check Errors & Final Clean Output",
          durationHours: 5,
          dueDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            return d.toISOString().split('T')[0];
          })(),
          completed: false
        }
      ]
    },
    missedMilestonesCount: 0
  },
  {
    id: "demo-task-2",
    title: "Client Pitch Deck Redesign",
    description: "Full visual overhaul of slides, copy refinement, and brand alignment for the Enterprise Sales demo.",
    deadline: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().split('T')[0];
    })(),
    estimatedHours: 12,
    category: "Work",
    priority: "high",
    completed: false,
    riskScore: 84,
    riskLevel: "critical",
    riskExplanation: "Extreme risk profile. Attempting a full 12-hour overhaul over 2 days leaves negligible safety buffer. High probability of late shipment if any creative blocker arises.",
    riskFactors: {
      urgencyScore: 95,
      complexityScore: 80,
      bufferSafetyScore: 10
    },
    missedMilestonesCount: 1
  },
  {
    id: "demo-task-3",
    title: "Cloud Deployment Documentation",
    description: "Write architectural specifications, secure environment setup instructions, and deployment runbooks.",
    deadline: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 10);
      return d.toISOString().split('T')[0];
    })(),
    estimatedHours: 4,
    category: "Work",
    priority: "low",
    completed: false,
    riskScore: 18,
    riskLevel: "low",
    riskExplanation: "Very high margin of safety. 10 full days to draft 4 hours of standard documentation. Risk of failure is minimal, assuming basic steady progress.",
    riskFactors: {
      urgencyScore: 15,
      complexityScore: 30,
      bufferSafetyScore: 90
    },
    missedMilestonesCount: 0
  }
];
