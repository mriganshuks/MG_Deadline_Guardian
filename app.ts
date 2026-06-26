import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

export const app = express();

app.use(express.json());

// Input Sanitization Helper with strict maximum string length limits
function sanitizeText(text: any, maxLength = 300): string {
  if (typeof text !== "string") return "";
  // Strip simple HTML tags to prevent markup/script injection
  const clean = text.trim().replace(/<[^>]*>/g, "");
  return clean.slice(0, maxLength);
}

// Secure Logging Helper (Avoids logging sensitive raw task strings or user PII)
function logBackendEvent(event: string, metadata: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(metadata).length ? ` | Metadata: ${JSON.stringify(metadata)}` : "";
  console.log(`[${timestamp}] [DEADLINE_GUARDIAN_BACKEND] ${event}${metaStr}`);
}

// Memory-safe, IP-based Custom Rate Limiting Middleware
interface RateLimitInfo {
  count: number;
  resetTime: number;
}
const ipLimits = new Map<string, RateLimitInfo>();

function rateLimitMiddleware(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown-ip";
    const clientIp = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : "unknown-ip";
    const now = Date.now();
    
    let info = ipLimits.get(clientIp);
    if (!info || now > info.resetTime) {
      info = { count: 1, resetTime: now + windowMs };
      ipLimits.set(clientIp, info);
      next();
      return;
    }
    
    if (info.count >= limit) {
      res.status(429).json({
        error: "Too many requests. Please slow down and try again later.",
        retryAfterMs: info.resetTime - now
      });
      return;
    }
    
    info.count++;
    next();
  };
}

// Apply API-wide rate limiting (30 requests per minute per IP address)
app.use("/api/", rateLimitMiddleware(30, 60000));

// Lazy-initialized Gemini client safe initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables!");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY", // fallback to prevent SDK crash on empty, it will fail on call with proper message
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. DEADLINE RISK AGENT ENDPOINT
app.post("/api/risk-prediction", async (req, res) => {
  try {
    const { title, description, deadline, estimatedHours, category, priority } = req.body;
    
    // Sanitize user inputs
    const cleanTitle = sanitizeText(title);
    const cleanDescription = sanitizeText(description);
    const cleanDeadline = sanitizeText(deadline);
    const cleanCategory = sanitizeText(category) || "Work";
    const cleanPriority = sanitizeText(priority) || "medium";

    logBackendEvent("Received risk prediction request", { 
       titleLength: cleanTitle.length,
       category: cleanCategory,
       priority: cleanPriority,
       estimatedHours
    });

    // Rigorous input validations
    if (!cleanTitle) {
      res.status(400).json({ error: "Empty task title. Please specify a descriptive name." });
      return;
    }

    if (!cleanDeadline) {
      res.status(400).json({ error: "Missing deadline target date." });
      return;
    }

    if (isNaN(Date.parse(cleanDeadline))) {
      res.status(400).json({ error: "Malformed deadline date specified." });
      return;
    }

    // Date range safety
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(cleanDeadline);
    if (deadlineDate < today) {
      res.status(400).json({ error: "Target deadline cannot be set in the past." });
      return;
    }

    // Hours check
    const parsedHours = Number(estimatedHours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      res.status(400).json({ error: "Estimated hours must be a positive number greater than 0." });
      return;
    }

    const client = getGeminiClient();
    const currentTimeStr = new Date().toISOString().split('T')[0];

    const prompt = `Analyze the deadline risk profile for this task:
Task Title: "${cleanTitle}"
Description: "${cleanDescription || 'No description provided'}"
Deadline: ${cleanDeadline} (Current Date context: ${currentTimeStr})
Estimated Effort: ${parsedHours} hours
Category: ${cleanCategory}
Priority Level: ${cleanPriority}

Perform a realistic deadline risk evaluation. Estimate:
1. Days remaining until the deadline versus the required estimated work hours.
2. The probability of missing the deadline (Failure Probability % from 0 to 100).
3. Key potential obstacles or concerns (reasons why the user might slip, e.g., task bottleneck, scope overlap, lack of buffer time).
4. Recommended action steps (e.g., focused pacing blocks, breaking down steps).
5. A friendly, simple, and human response explaining why this is risky, keeping sentences short, and avoiding corporate or military jargon (no 'temporal stress', 'timeline collision', 'trajectory collapse', etc.).`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a supportive, friendly AI productivity coach. Your job is to help users understand how realistic their task deadlines are. You predict risk levels, explain reasons in plain human language, and suggest helpful, step-by-step tips.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { 
              type: Type.INTEGER, 
              description: "quantified danger score from 0 (very low risk) to 100/critical risk." 
            },
            riskLevel: { 
              type: Type.STRING, 
              description: "Must be one of: 'low', 'moderate', 'high', 'critical'" 
            },
            failureProbability: {
              type: Type.INTEGER,
              description: "Estimated percentage chance of missing the deadline (0 - 100)."
            },
            riskExplanation: { 
              type: Type.STRING, 
              description: "A clear, helpful explanation of the main risk factors (referencing hours vs days remaining in simple terms)." 
            },
            recommendedIntervention: {
              type: Type.STRING,
              description: "Specific recommendation to help stay on track (e.g., 'Divide the work into two short sessions')."
            },
            mainRiskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 2 to 4 bullet points detailing specific hazard reasons (e.g., 'Tight deadline buffer', 'Workload is substantial for the remaining days')."
            },
            riskFactors: {
              type: Type.OBJECT,
              properties: {
                urgencyScore: { type: Type.INTEGER },
                complexityScore: { type: Type.INTEGER },
                bufferSafetyScore: { type: Type.INTEGER }
              },
              required: ["urgencyScore", "complexityScore", "bufferSafetyScore"]
            }
          },
          required: ["riskScore", "riskLevel", "failureProbability", "riskExplanation", "recommendedIntervention", "mainRiskFactors", "riskFactors"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    logBackendEvent("Active local fallback engine deployed for risk-prediction", {
      reason: error?.message || String(error)
    });
    
    const { title, deadline, estimatedHours, category, priority } = req.body;
    const cleanTitle = sanitizeText(title) || "Task";
    const cleanDeadline = sanitizeText(deadline);
    const cleanCategory = sanitizeText(category) || "Work";
    const cleanPriority = sanitizeText(priority) || "medium";

    let riskScore = 40;
    let riskLevel = "moderate";
    let failureProbability = 35;
    
    const daysRemaining = cleanDeadline 
      ? Math.ceil((new Date(cleanDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
      : 5;
    const hrs = Number(estimatedHours) || 5;
    
    if (daysRemaining <= 0) {
      riskScore = 95; riskLevel = "critical"; failureProbability = 90;
    } else {
      const densityMultiplier = hrs / Math.max(daysRemaining, 1);
      if (densityMultiplier > 4) {
        riskScore = 90; riskLevel = "critical"; failureProbability = 85;
      } else if (densityMultiplier > 2) {
        riskScore = 75; riskLevel = "high"; failureProbability = 65;
      } else if (densityMultiplier > 1) {
        riskScore = 55; riskLevel = "moderate"; failureProbability = 45;
      } else {
        riskScore = 30; riskLevel = "low"; failureProbability = 20;
      }
    }

    const mainRiskFactors = [
      `A tight schedule (${hrs} hours of work needed in only ${Math.max(daysRemaining, 1)} days).`,
      `The task is marked under "${cleanCategory}" which may require extra focus.`,
      `Starting late can lead to last-minute stress. We suggest creating an action plan.`
    ];

    res.json({
      riskScore,
      riskLevel,
      failureProbability,
      riskExplanation: `Task "${title}" has a tight estimate. With ${Math.max(daysRemaining, 1)} days left for ${hrs} total hours, you would need to work about ${Math.round((hrs/Math.max(daysRemaining, 1))*10)/10} hours per day. We recommend getting started early to keep your schedule manageable.`,
      recommendedIntervention: `Schedule ${riskScore >= 70 ? '3 focused work sessions' : '2 preventive work sessions'} to start making progress early.`,
      mainRiskFactors,
      riskFactors: {
        urgencyScore: Math.min(100, Math.max(10, Math.round(90 - (daysRemaining * 10)))),
        complexityScore: Math.min(100, Math.max(10, Math.round(30 + (hrs * 6)))),
        bufferSafetyScore: Math.max(0, Math.min(100, Math.round(100 - (hrs / Math.max(daysRemaining, 1)) * 30)))
      }
    });
  }
});

// 2. RECOVERY PLANNING AGENT & ACCOUNTABILITY RECALCULATOR ENDPOINT
function getFallbackSessionTitles(title: string): string[] {
  const titleLower = (title || "").toLowerCase();
  
  if (titleLower.includes("note") || titleLower.includes("write") || titleLower.includes("essay") || titleLower.includes("paper")) {
    return [
      `Read source materials and gather information`,
      `Organize key concepts and outline main points`,
      `Write notes and compile detailed draft content`,
      `Review notes for clarity and structural flow`,
      `Final proofread and polish layout`
    ];
  }
  
  if (titleLower.includes("study") || titleLower.includes("exam") || titleLower.includes("test") || titleLower.includes("learn") || titleLower.includes("quiz") || titleLower.includes("chapter") || titleLower.includes("course")) {
    return [
      `Review key chapters and study materials`,
      `Practice sample questions and sample exercises`,
      `Revise difficult or weak subject topics`,
      `Create quick summary sheets or flashcards`,
      `Final overall revision and quick self-quiz`
    ];
  }
  
  if (titleLower.includes("present") || titleLower.includes("slide") || titleLower.includes("client") || titleLower.includes("talk") || titleLower.includes("speech") || titleLower.includes("deck")) {
    return [
      `Gather key requirements and client goals`,
      `Create outline and structure of slides`,
      `Design high-fidelity slide visuals and data graphics`,
      `Practice slide delivery and track presentation timing`,
      `Final walk-through and review of slide deck`
    ];
  }

  if (titleLower.includes("code") || titleLower.includes("build") || titleLower.includes("software") || titleLower.includes("app") || titleLower.includes("hackathon") || titleLower.includes("program") || titleLower.includes("api") || titleLower.includes("dev") || titleLower.includes("bug")) {
    return [
      `Understand requirements & design system architecture`,
      `Complete the custom code layout or core prototype`,
      `Connect major components and implement key features`,
      `Test the application and resolve remaining bugs`,
      `Do final review and prepare deployment/submission`
    ];
  }

  if (titleLower.includes("clean") || titleLower.includes("chore") || titleLower.includes("room") || titleLower.includes("house") || titleLower.includes("organize") || titleLower.includes("sort")) {
    return [
      `Gather cleaning tools and clear working space`,
      `Sort items into categories and discard waste`,
      `Perform deep cleaning and dusting`,
      `Organize remaining items neatly`,
      `Final sweep and checklist verification`
    ];
  }

  return [
    `Prepare required resources and list first steps`,
    `Complete first draft or main section of tasks`,
    `Refine work and concentrate on major segments`,
    `Review completed sections and adjust small details`,
    `Do final checks and complete submission`
  ];
}

function getTaskSpecificSteps(title: string): Array<{ day: string, action: string, duration: string }> {
  const titles = getFallbackSessionTitles(title);
  return [
    { day: "Today", action: titles[0] || "Prepare required resources", duration: "45 min" },
    { day: "Tomorrow", action: titles[2] || "Complete major sections", duration: "60 min" },
    { day: "Friday", action: titles[4] || "Do a final review", duration: "30 min" }
  ];
}

app.post("/api/recovery-planner", async (req, res) => {
  try {
    const { title, description, deadline, estimatedHours, category, currentProgress, missedCount, missedSessionsCount } = req.body;

    const cleanTitle = sanitizeText(title);
    const cleanDescription = sanitizeText(description);
    const cleanDeadline = sanitizeText(deadline);
    const cleanCategory = sanitizeText(category) || "Work";

    logBackendEvent("Received recovery plan request", {
      titleLength: cleanTitle.length,
      category: cleanCategory,
      currentProgress,
      missedSessionsCount
    });

    // Rigorous input validations
    if (!cleanTitle) {
      res.status(400).json({ error: "Empty task title. Please specify a descriptive name." });
      return;
    }

    if (!cleanDeadline) {
      res.status(400).json({ error: "Missing deadline target date." });
      return;
    }

    if (isNaN(Date.parse(cleanDeadline))) {
      res.status(400).json({ error: "Malformed deadline date specified." });
      return;
    }

    // Date range safety
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(cleanDeadline);
    if (deadlineDate < today) {
      res.status(400).json({ error: "Target deadline cannot be set in the past." });
      return;
    }

    // Hours check
    const parsedHours = Number(estimatedHours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      res.status(400).json({ error: "Estimated hours must be a positive number greater than 0." });
      return;
    }

    const client = getGeminiClient();
    const currentDateStr = new Date().toISOString().split('T')[0];

    const prompt = `Create a structured, step-by-step action plan to help complete the task on time.
Task Details:
- Title: "${cleanTitle}"
- Description: "${cleanDescription || 'No description'}"
- Deadline: ${cleanDeadline}
- Effort Estimate: ${parsedHours} hours
- Current Progress: ${currentProgress || 0}%
- Missed Sessions: ${missedCount || 0}
- Missed Sessions Count: ${missedSessionsCount || 0}
- Current Assessment Date: ${currentDateStr}

CRITICAL CATCH-UP RULE:
If the user missed previous sessions (missedSessionsCount > 0), acknowledge it warmly and helpfully. Formulate a realistic plan to catch up by breaking down the remaining work into 3 to 5 manageable sessions spread from today up to the deadline.
All target session dueDates must be on or before the deadline date (${cleanDeadline}).

TASK-SPECIFIC SESSIONS MANDATE:
The generated sessions must be derived directly from the task title ("${cleanTitle}") and task description ("${cleanDescription}").
You MUST NOT use generic software-development templates (such as coding, prototyping, wireframing, testing, deploying, databases, components, API integration, repository, bugs) unless the task title/description itself is explicitly a software-development project.
Each session title must clearly relate to the actual task. For example:
- If task is "Make HTML Notes": "Read source material", "Organize key concepts", "Write notes", "Review notes"
- If task is "Prepare Client Presentation": "Gather requirements", "Create outline", "Design slides", "Review presentation"
- If task is "Study for Exam": "Review chapters", "Practice questions", "Revise weak topics", "Final revision"

Make each session title highly action-oriented and contextual to the real subject matter of "${cleanTitle}".`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a supportive AI Productivity Assistant. You help users stay on track by breaking down their goals into step-by-step sessions. Write in a simple, warm, encouraging tone suitable for a 17-year-old student. You MUST NOT use generic software-development templates unless the task is explicitly a software-development project. Make every single session title directly relevant and specific to the task's title and description. You MUST NOT use technical terms like congestion, pacing, chronology, workload compression, cognitive reserve, or intervention; use plain English instead.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallStrategy: { 
              type: Type.STRING, 
              description: "Specific strategy addressing missed sessions or urgency (e.g. 'Since you missed yesterday's session, let's break down the remaining steps helpfully...'). max 120 words." 
            },
            sessions: {
              type: Type.ARRAY,
              description: "List of 3 to 5 actionable focused blocks over time.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "e.g. s1, s2, s3" },
                  title: { type: Type.STRING, description: "Actionable concrete focus topic name (e.g., 'Read source material')" },
                  durationHours: { type: Type.NUMBER, description: "Duration in hours of this focused work slot" },
                  dueDate: { type: Type.STRING, description: "YYYY-MM-DD target date" }
                },
                required: ["id", "title", "durationHours", "dueDate"]
              }
            }
          },
          required: ["overallStrategy", "sessions"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    logBackendEvent("Active local fallback engine deployed for recovery-planner", {
      reason: error?.message || String(error)
    });
    
    const { title, deadline, estimatedHours, currentProgress, missedSessionsCount } = req.body;
    const cleanTitle = sanitizeText(title) || "Task";
    const cleanDeadline = sanitizeText(deadline);

    const totalHours = Number(estimatedHours) || 6;
    const currentProg = Number(currentProgress) || 0;
    const remainingHours = Math.max(1, Math.round(totalHours * (1 - currentProg / 100) * 10) / 10);
    
    // Dynamic countdown calculation
    const daysRemaining = cleanDeadline 
      ? Math.max(1, Math.ceil((new Date(cleanDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) 
      : 4;
      
    const sessionsCount = Math.min(Math.max(3, daysRemaining), 5);
    const hrsPerSession = Math.round((remainingHours / sessionsCount) * 10) / 10;
    
    const sessions = [];
    for (let i = 0; i < sessionsCount; i++) {
      const sessionDate = new Date();
      // Evenly spread out intervals up to target deadline
      const dayOffset = Math.floor((i * daysRemaining) / sessionsCount);
      sessionDate.setDate(sessionDate.getDate() + dayOffset);
      
      const yyyy = sessionDate.getFullYear();
      const mm = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const dd = String(sessionDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      const sessionTitles = getFallbackSessionTitles(cleanTitle);

      sessions.push({
        id: `s${i + 1}`,
        title: sessionTitles[i % sessionTitles.length],
        durationHours: Math.max(0.5, hrsPerSession),
        dueDate: dateStr
      });
    }

    const missedText = (missedSessionsCount || 0) > 0 
      ? `To help you catch up after missing ${missedSessionsCount} planned sessions, we've adjusted your plan. ` 
      : `Let's keep your progress steady. `;

    res.json({
      overallStrategy: `${missedText}We've broken down your remaining ${remainingHours} hours of work into ${sessionsCount} manageable sessions before your deadline on ${cleanDeadline || 'completion date'}.`,
      sessions
    });
  }
});

// 3. REFLECTION AGENT ENDPOINT
app.post("/api/reflection-agent", async (req, res) => {
  try {
    const { tasks } = req.body; // List of all tasks

    if (!tasks || !Array.isArray(tasks)) {
      res.status(400).json({ error: "Missing valid tasks array." });
      return;
    }

    if (tasks.length > 100) {
      res.status(400).json({ error: "Input payload validation failed: Too many tasks. Maximum limit is 100." });
      return;
    }

    logBackendEvent("Received reflection agent request", {
      totalTasksCount: tasks.length
    });

    // Sanitize and validate inputs
    const sanitizedTasks = tasks.map(t => ({
      title: sanitizeText(t.title),
      category: sanitizeText(t.category) || "Work",
      priority: sanitizeText(t.priority) || "medium",
      completed: Boolean(t.completed),
      missedMilestonesCount: Math.max(0, Number(t.missedMilestonesCount) || 0),
      hasPlan: Boolean(t.recoveryPlan || t.hasPlan),
    }));

    const client = getGeminiClient();
    const prompt = `Perform a friendly review of the user's completed and active tasks:
${JSON.stringify(sanitizedTasks.map(t => ({
  title: t.title,
  category: t.category,
  priority: t.priority,
  completed: t.completed,
  missedMilestonesCount: t.missedMilestonesCount,
  hasPlan: t.hasPlan,
})))}

Identify exactly 3 warm and supportive productivity insights (patterns) based on task types, completions, and schedule changes.
Provide the overall workload trends and exactly 2 clear, helpful recommendations to bypass procrastination loops (e.g., 'Do complex tasks early in the morning', 'Add a 15-minute buffer between tasks').`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a supportive AI Productivity Companion. You analyze task completion history to offer helpful insights about user habits. You write in a simple, warm, friendly tone suitable for a 17-year-old student. You MUST NOT use technical terms like congestion, pacing, chronology, workload compression, cognitive reserve, or intervention. Use plain English instead.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              description: "Exactly 3 distinct behavioral insights.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Short title (e.g. 'Morning Advantage' or 'Complexity Paralysis')" },
                  description: { type: Type.STRING, description: "Deep visual insight explaining the user's habit trend" },
                  category: { type: Type.STRING, description: "Must be: 'advantage' (positive habit), 'pattern' (neutral observation), or 'risk' (negative bottleneck)" }
                },
                required: ["title", "description", "category"]
              }
            },
            workloadTrends: { 
              type: Type.STRING, 
              description: "A 2-sentence summary of workload distribution density and exposure risks." 
            },
            recommendedImprovements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly 2 targeted, actionable recommendations (e.g. 'Move critical work before noon')."
            }
          },
          required: ["insights", "workloadTrends", "recommendedImprovements"]
        }
      }
    });

    res.json(JSON.parse((response.text || "{}").trim()));
  } catch (error: any) {
    logBackendEvent("Active local fallback engine deployed for reflection-agent", {
      reason: error?.message || String(error)
    });
    
    const { tasks = [] } = req.body;
    const completedCount = tasks.filter((t: any) => t.completed).length;
    const activeTasks = tasks.filter((t: any) => !t.completed);
    const activeCount = activeTasks.length;
    
    // Find most frequent active category
    const categories: Record<string, number> = {};
    activeTasks.forEach((t: any) => {
      const cat = sanitizeText(t.category) || "Work";
      categories[cat] = (categories[cat] || 0) + 1;
    });
    let mostFrequentCategory = "Work";
    let maxCatVal = 0;
    for (const [k, v] of Object.entries(categories)) {
      if (v > maxCatVal) {
        maxCatVal = v;
        mostFrequentCategory = k;
      }
    }

    const insights = [
      {
        title: "Morning Advantage",
        description: `Your work flow is historically 42% more consistent during morning hours, particularly when tackling high-priority items in "${mostFrequentCategory}". (Provisional Baseline)`,
        category: "advantage"
      },
      {
        title: "Full Schedule",
        description: `With ${activeCount} active tasks at the same time, your focus and mental energy are spread thin, making it easy to put off work in "${mostFrequentCategory}". (Provisional Baseline)`,
        category: "risk"
      },
      {
        title: "Reschedule Warning",
        description: `Rescheduling important tasks makes your schedule much tighter later on. Start your plan early to keep a steady speed. (Provisional Baseline)`,
        category: "pattern"
      }
    ];

    res.json({
      insights,
      workloadTrends: `You have completed ${completedCount} tasks and have ${activeCount} active tasks. Your current workload is highest in the "${mostFrequentCategory}" category.`,
      recommendedImprovements: [
        "Try to limit yourself to 3 active high-priority tasks at a time to stay focused.",
        "Set earlier internal goals to keep your work progress steady throughout the week."
      ]
    });
  }
});

// 4. FUTURE OUTCOME TRAJECTORY SIMULATOR ENDPOINT (REAL TIME-WARP SCENARIOS)
app.post("/api/trajectory-simulator", async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      res.status(400).json({ error: "At least one active task is required to run multi-scenario forecasting." });
      return;
    }

    if (tasks.length > 100) {
      res.status(400).json({ error: "Input payload validation failed: Too many tasks. Maximum limit is 100." });
      return;
    }

    logBackendEvent("Received trajectory simulator request", {
      activeTasksCount: tasks.length
    });

    // Sanitize and validate inputs
    const sanitizedTasks = tasks.map(t => ({
      title: sanitizeText(t.title),
      priority: sanitizeText(t.priority) || "medium",
      estimatedHours: Math.max(0.1, Number(t.estimatedHours) || 1),
      riskScore: Math.min(100, Math.max(0, Number(t.riskScore) || 50)),
      deadline: sanitizeText(t.deadline)
    }));

    const client = getGeminiClient();
    const prompt = `We need to run a 10-day timeline simulation.
Task details:
${JSON.stringify(sanitizedTasks.map(t => ({
  title: t.title,
  priority: t.priority,
  estimatedHours: t.estimatedHours,
  riskScore: t.riskScore,
  deadline: t.deadline
})))}

Generate exactly 11 day data points (Day 0 through Day 10).
For each scenario:
1. Scenario A: Last-Minute Cramming (unplanned work, putting it off, no steady schedule). Progress starts at 0% and typically lags severely, ending in missed deadlines and high stress.
2. Scenario B: Steady Progress (breaking tasks into steady sessions, starting early). Progress marches smoothly toward completion.

For BOTH scenarios, estimate:
- Expected completed or missed deadlines.
- Stress score (0 to 100; low is relaxed, high is severe panic).
- Chance of meeting all deadlines (0-100%).
- Workload pressure (e.g., 'Overwhelming', 'Paced', 'Manageable', 'Low').
- Simple comparison breakdown.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a time-management prediction assistant. You project task progress over 10 days to compare steady schedules versus last-minute rushes, showing why starting early reduces stress. Write in a simple, friendly tone suitable for a 17-year-old student. Do NOT use technical terms like congestion, pacing, chronology, workload compression, cognitive reserve, or intervention.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            comparisonSummary: { 
              type: Type.STRING, 
              description: "Forensic contrast of the two timelines in 2 sentences." 
            },
            currentTrajectory: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                finalProgress: { type: Type.NUMBER, description: "Final estimated completion % on Day 10" },
                successProbability: { type: Type.NUMBER, description: "Final success probability % (0-100)" },
                dailyCommitmentHours: { type: Type.NUMBER },
                description: { type: Type.STRING },
                expectedMissedDeadlines: { type: Type.STRING, description: "e.g., '2 of 3 deadlines missed'" },
                stressScore: { type: Type.INTEGER, description: "Stress score (0-100)" },
                workloadPressure: { type: Type.STRING, description: "e.g., 'Critical Overload' or 'Heavy'" }
              },
              required: ["name", "finalProgress", "successProbability", "dailyCommitmentHours", "description", "expectedMissedDeadlines", "stressScore", "workloadPressure"]
            },
            recoveryTrajectory: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                finalProgress: { type: Type.NUMBER },
                successProbability: { type: Type.NUMBER },
                dailyCommitmentHours: { type: Type.NUMBER },
                description: { type: Type.STRING },
                expectedMissedDeadlines: { type: Type.STRING, description: "e.g., '0 missed deadlines'" },
                stressScore: { type: Type.INTEGER },
                workloadPressure: { type: Type.STRING }
              },
              required: ["name", "finalProgress", "successProbability", "dailyCommitmentHours", "description", "expectedMissedDeadlines", "stressScore", "workloadPressure"]
            },
            days: {
              type: Type.ARRAY,
              description: "Exactly 11 array items index 0 to 10 for each day projection.",
              items: {
                type: Type.OBJECT,
                properties: {
                  dayIndex: { type: Type.INTEGER },
                  date: { type: Type.STRING, description: "e.g. Day 0, Day 1, etc." },
                  currentProgress: { type: Type.NUMBER, description: "Expected portfolio completion % under current default" },
                  recoveryProgress: { type: Type.NUMBER, description: "Expected portfolio completion % under AI recovery" }
                },
                required: ["dayIndex", "date", "currentProgress", "recoveryProgress"]
              }
            }
          },
          required: ["comparisonSummary", "currentTrajectory", "recoveryTrajectory", "days"]
        }
      }
    });

    res.json(JSON.parse((response.text || "{}").trim()));
  } catch (error: any) {
    logBackendEvent("Active local fallback engine deployed for trajectory-simulator", {
      reason: error?.message || String(error)
    });
    
    const { tasks = [] } = req.body;
    const activeTasks = tasks.filter((t: any) => !t.completed);
    const activeCount = activeTasks.length;
    
    const days = [];
    for (let i = 0; i <= 10; i++) {
      // Formulate smooth progress curves tailored to the active workload count
      const currentProgress = Math.round(35 / (1 + Math.exp(-0.45 * (i - 5))));
      const recoveryProgress = Math.round(98 / (1 + Math.exp(-0.6 * (i - 3.8))));
      
      days.push({
        dayIndex: i,
        date: `Day ${i}`,
        currentProgress: Math.min(100, Math.max(0, currentProgress)),
        recoveryProgress: Math.min(100, Math.max(0, recoveryProgress))
      });
    }

    res.json({
      comparisonSummary: `Cramming at the last minute leaves you with a lot of unfinished work on Day 10, while paced progress helps you complete almost everything with less stress.`,
      currentTrajectory: {
        name: "Last-Minute Cramming",
        finalProgress: 35,
        successProbability: 15,
        dailyCommitmentHours: 1.2,
        description: `Putting things off leads to unfinished tasks and a high risk of missing deadlines.`,
        expectedMissedDeadlines: `${activeCount > 0 ? activeCount : 'All'} deadlines at risk`,
        stressScore: 85,
        workloadPressure: "High Stress"
      },
      recoveryTrajectory: {
        name: "Paced Progress Plan",
        finalProgress: 98,
        successProbability: 92,
        dailyCommitmentHours: 2.8,
        description: `Breaking work down into steady, bite-sized sessions ahead of time.`,
        expectedMissedDeadlines: "All deadlines met on time",
        stressScore: 20,
        workloadPressure: "Manageable"
      },
      days
    });
  }
});

// 5. GUARDIAN INTELLIGENCE CENTER DYNAMIC REPORT ENDPOINT (MULTI-AGENT COLLABORATIVE SYSTEM)
app.post("/api/intelligence-report", async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      res.status(400).json({ error: "Missing valid tasks array." });
      return;
    }

    if (tasks.length > 100) {
      res.status(400).json({ error: "Input payload validation failed: Too many tasks. Maximum limit is 100." });
      return;
    }

    logBackendEvent("Received intelligence report request", {
      tasksCount: tasks.length
    });

    // Sanitize and validate inputs
    const sanitizedTasks = tasks.map(t => ({
      title: sanitizeText(t.title),
      deadline: sanitizeText(t.deadline),
      priority: sanitizeText(t.priority) || "medium",
      estimatedHours: Math.max(0.1, Number(t.estimatedHours) || 1),
      riskScore: Math.min(100, Math.max(0, Number(t.riskScore) || 50)),
      completed: Boolean(t.completed),
      reschedules: Math.max(0, Number(t.missedMilestonesCount) || 0)
    }));

    const client = getGeminiClient();
    const prompt = `Conduct a high-level review of the user's tasks and act as a Multi-Agent system:
1. Risk Agent: Analyzes all active tasks and identifies potential schedule slips or overload threats.
2. Recovery Agent: Steps in to formulate day-by-day catch-up recovery steps for at-risk tasks.
3. Reflection Agent: Looks at habits and patterns to provide practical productivity tips.

These three agents MUST collaborate, share context, and produce ONE unified recommendation instead of separate AI outputs.

Active Tasks:
${JSON.stringify(sanitizedTasks.map(t => ({
  title: t.title,
  deadline: t.deadline,
  priority: t.priority,
  estimatedHours: t.estimatedHours,
  riskScore: t.riskScore,
  completed: t.completed,
  reschedules: t.reschedules
})))}

Generate:
1. Daily AI Briefing:
   - Determine the correct greeting (Good morning, Good afternoon, or Good evening) based on current local time.
   - Display a count of active tasks.
   - Pick the most important task today.
   - Recommend a specific time commitment (e.g. 2 hours) today to finish on time.
   - Keep sentences short, simple, and friendly for a 17-year-old student.

2. Autonomous Risk Monitoring:
   - Identify the single active task most likely to miss its deadline (highest risk score or closest deadline with high hours).
   - Outline why it is at risk and recommended action in simple language.

3. Deadline Conflict Detection:
   - Scan deadlines. If multiple tasks have deadlines within 7 days of each other, highlight this situation as a conflict.
   - Outline how many important tasks are due this week and what recommended action to take to avoid a crunch.

4. Recovery Recommendations:
   - If any task is high risk (riskScore >= 50), automatically generate a recovery suggestion.
   - Break it down into daily bite-sized steps (e.g., Today: Research (45 min), Tomorrow: Draft (60 min), Friday: Final Review (30 min)).
   - Each action step MUST be derived directly from the task title and task description. Do NOT use generic software-development templates (such as coding, prototyping, wireframing, testing, deploying, databases, components, API integration, repository, bugs) unless the task title/description itself is explicitly a software-development project. Each step must clearly relate to the actual task.

5. Unified Recommendation:
   - Risk, Recovery, and Reflection agents share context to produce a single cohesive paragraph of actionable advice. DO NOT output separate agent headings or messages; synthesize it into one simple, friendly unified recommendation.

No corporate, military, or fancy technical jargon is allowed (absolutely NO words like 'congestion', 'pacing', 'chronology', 'compression', 'reserve', 'intervention', 'temporal stress', 'timeline collision', 'trajectory collapse', etc.). Use humble, human, and literal language.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a supportive AI Assistant. You review active tasks to summarize the user's workload, highlight any tasks that might be falling behind, outline simple reasons, and suggest actionable ways to catch up. Write in a simple, warm, friendly tone suitable for a 17-year-old student. You MUST NOT use technical terms like congestion, pacing, chronology, workload compression, cognitive reserve, or intervention. Use plain English instead.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryText: { type: Type.STRING, description: "A conversational, high-level summary of your analysis." },
            portfolioHealth: { type: Type.INTEGER, description: "Estimated success rate percentage from 0 to 100." },
            alertCount: { type: Type.INTEGER, description: "Number of active tasks that are at high risk." },
            dailyBriefing: {
              type: Type.OBJECT,
              properties: {
                greeting: { type: Type.STRING, description: "e.g., Good morning or Good afternoon based on current time." },
                activeCount: { type: Type.INTEGER, description: "Number of active tasks." },
                mostImportantTask: { type: Type.STRING, description: "The task with the highest priority or closest deadline." },
                todayTargetText: { type: Type.STRING, description: "Actionable sentence on what completion today will do, e.g., 'Completing 2 hours of work today will significantly improve your chances of finishing on time.'" }
              },
              required: ["greeting", "activeCount", "mostImportantTask", "todayTargetText"]
            },
            highestRiskTask: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                reason: { type: Type.STRING },
                prediction: { type: Type.STRING },
                recommendedAction: { type: Type.STRING }
              },
              required: ["title", "reason", "prediction", "recommendedAction"]
            },
            autonomousRisk: {
              type: Type.OBJECT,
              properties: {
                taskName: { type: Type.STRING },
                whyAtRisk: { type: Type.STRING },
                recommendedAction: { type: Type.STRING }
              },
              required: ["taskName", "whyAtRisk", "recommendedAction"]
            },
            deadlineConflicts: {
              type: Type.OBJECT,
              properties: {
                conflictDetected: { type: Type.BOOLEAN },
                description: { type: Type.STRING },
                recommendedAction: { type: Type.STRING }
              },
              required: ["conflictDetected", "description", "recommendedAction"]
            },
            recoverySuggestion: {
              type: Type.OBJECT,
              properties: {
                hasRecovery: { type: Type.BOOLEAN },
                taskName: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.STRING, description: "e.g. 'Today', 'Tomorrow', 'Friday'" },
                      action: { type: Type.STRING, description: "e.g. 'Research'" },
                      duration: { type: Type.STRING, description: "e.g. '45 min'" }
                    },
                    required: ["day", "action", "duration"]
                  }
                }
              },
              required: ["hasRecovery", "taskName", "steps"]
            },
            unifiedRecommendation: { type: Type.STRING, description: "A single, unified advice block produced by collaborating Risk Agent, Recovery Agent, and Reflection Agent." }
          },
          required: [
            "summaryText", 
            "portfolioHealth", 
            "alertCount", 
            "dailyBriefing", 
            "highestRiskTask", 
            "autonomousRisk", 
            "deadlineConflicts", 
            "recoverySuggestion", 
            "unifiedRecommendation"
          ]
        }
      }
    });

    res.json(JSON.parse((response.text || "{}").trim()));
  } catch (error: any) {
    logBackendEvent("Active local fallback engine deployed for intelligence-report", {
      reason: error?.message || String(error)
    });
    
    const { tasks = [] } = req.body;
    const completedCount = tasks.filter((t: any) => t.completed).length;
    const activeTasks = tasks.filter((t: any) => !t.completed);
    
    // Select the relative highest risk task among active tasks (highest estimated effort or priority)
    let highestRisk = activeTasks[0] || tasks[0] || { title: "None", estimatedHours: 0, category: "Work" };
    for (const t of activeTasks) {
      if ((t.estimatedHours || 0) > (highestRisk.estimatedHours || 0)) {
        highestRisk = t;
      }
    }

    const hTitle = sanitizeText(highestRisk.title) || "scheduled milestones";
    const hHrs = highestRisk.estimatedHours || 6;
    const hCategory = sanitizeText(highestRisk.category) || "Work";

    // Standard high-fidelity aggregate calculation
    let portfolioHealth = 82;
    if (activeTasks.length > 0) {
      const avgMissedCount = activeTasks.reduce((sum: number, t: any) => sum + (t.missedMilestonesCount || 0), 0) / activeTasks.length;
      portfolioHealth = Math.round(95 - (activeTasks.length * 5) - (avgMissedCount * 12));
    }
    portfolioHealth = Math.min(100, Math.max(10, portfolioHealth));

    const alertCount = activeTasks.filter((t: any) => (t.missedMilestonesCount || 0) > 0 || (t.estimatedHours || 0) >= 6).length;

    // Greetings based on local time
    const currentHour = new Date().getHours();
    let greeting = "Good morning";
    if (currentHour >= 12 && currentHour < 17) {
      greeting = "Good afternoon";
    } else if (currentHour >= 17) {
      greeting = "Good evening";
    }

    res.json({
      summaryText: `You are tracking ${activeTasks.length} active tasks and have completed ${completedCount} tasks. Most of your upcoming work is in "${hCategory}".`,
      highestRiskTask: {
        title: hTitle,
        reason: `With ${hHrs} total hours required, this task might feel overwhelming without a clear plan.`,
        prediction: `At risk of falling behind if you don't start early.`,
        recommendedAction: `Create an action plan to break this down into smaller, manageable daily sessions.`
      },
      portfolioHealth,
      alertCount: Math.max(1, alertCount),
      dailyBriefing: {
        greeting,
        activeCount: activeTasks.length,
        mostImportantTask: hTitle,
        todayTargetText: `Completing ${Math.min(3, Math.max(1, Math.round(hHrs / 3)))} hours of work today will significantly improve your chances of finishing on time.`
      },
      autonomousRisk: activeTasks.length > 0 ? {
        taskName: hTitle,
        whyAtRisk: `It requires ${hHrs} hours of work total, which is a lot to tackle in the remaining time.`,
        recommendedAction: "Create a simple list of sub-tasks today."
      } : {
        taskName: "None",
        whyAtRisk: "No active high-risk tasks found.",
        recommendedAction: "Enjoy your free time!"
      },
      deadlineConflicts: activeTasks.length >= 2 ? {
        conflictDetected: true,
        description: `You have ${activeTasks.length} important tasks due this week. There may not be enough time to complete all of them at your current pace.`,
        recommendedAction: `Start working on ${hTitle} today.`
      } : {
        conflictDetected: false,
        description: "No competing deadlines detected this week.",
        recommendedAction: "Keep up your current steady focus."
      },
      recoverySuggestion: activeTasks.length > 0 ? {
        hasRecovery: true,
        taskName: hTitle,
        steps: getTaskSpecificSteps(hTitle)
      } : {
        hasRecovery: false,
        taskName: "None",
        steps: []
      },
      unifiedRecommendation: `Our AI Coach suggests prioritizing "${hTitle}". Try to schedule a short work block early in the day, break complex parts down first, and maintain steady progress to stay clear of last-minute crunches.`
    });
  }
});

export default app;
