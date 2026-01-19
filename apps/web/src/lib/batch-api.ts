const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface GeneratedPersona {
  // Demographics
  name: string;
  age: number;
  gender?: string;
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | "partnered";
  country: string;
  occupation: string;
  education?: string;
  incomeLevel: "low" | "medium" | "high";
  income?: string;
  techSavviness: "beginner" | "intermediate" | "advanced";
  // Goals
  primaryGoal: string;
  painPoints: string[];
  // Selection metric
  relevanceScore: number;
  // Optional narrative sections (generated on-demand if needed)
  background?: string;
  financialSituation?: string;
  browsingHabits?: string;
  professionalLife?: string;
  personalStyle?: string;
  context?: string;
}


interface BatchTestRun {
  id: string;
  userId: string;
  targetUrl: string;
  userDescription: string;
  generatedPersonas: GeneratedPersona[];
  selectedPersonaIndices: number[];
  status: string;
  useUXAgent: boolean;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface TestRunWithReport {
  testRun: {
    id: string;
    batchTestRunId: string;
    userId: string;
    targetUrl: string;
    personaIndex: number;
    personaData: GeneratedPersona;
    personaName: string;
    status: string;
    browserbaseSessionId: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
  };
  report: {
    id: string;
    testRunId: string;
    score: number | null;
    summary: string | null;
    fullReport: any;
    positiveAspects: string[] | null;
    usabilityIssues: any[] | null;
    accessibilityNotes: string[] | null;
    recommendations: string[] | null;
    totalDuration: string | null;
    createdAt: string;
  } | null;
}

// UXAgent specific types
interface UXAgentScreenshot {
  id: string;
  uxagentRunId: string;
  stepNumber: number;
  filename: string | null;
  s3Key: string | null;
  s3Url: string | null;
  signedUrl?: string; // Presigned URL for secure access
  createdAt: string;
}

interface UXAgentRun {
  id: string;
  testRunId: string | null;
  userId: string | null;
  runId: string;
  intent: string;
  startUrl: string;
  personaData: any;
  status: string;
  score: number | null;
  terminated: boolean;
  stepsTaken: number | null;
  errorMessage: string | null;
  basicInfo: any;
  actionTrace: any[];
  memoryTrace: any[];
  observationTrace: any[];
  logContent: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  screenshots: UXAgentScreenshot[];
}

interface AggregatedReport {
  id: string;
  batchTestRunId: string;
  overallScore: number | null;
  executiveSummary: string | null;
  commonIssues: Array<{
    issue: string;
    severity: "low" | "medium" | "high" | "critical";
    affectedPersonas: string[];
    recommendation: string;
  }> | null;
  personaSpecificInsights: Array<{
    personaName: string;
    keyFindings: string[];
  }> | null;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    recommendation: string;
    impact: string;
  }> | null;
  strengthsAcrossPersonas: string[] | null;
  fullAnalysis: string | null;
  createdAt: string;
}

// New types for thoughts, insights, and chat
interface UXAgentThought {
  id: string;
  uxagentRunId: string;
  kind: 'observation' | 'action' | 'plan' | 'thought' | 'reflection';
  content: string;
  importance: number | null;
  stepNumber: number | null;
  rawAction: any | null;
  agentTimestamp: number | null;
  createdAt: string;
}

interface UXAgentInsight {
  id: string;
  uxagentRunId: string;
  category: 'usability' | 'accessibility' | 'performance' | 'content' | 'navigation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  supportingThoughtIds: string[] | null;
  aiModel: string | null;
  createdAt: string;
}

interface UXAgentChatMessage {
  id: string;
  uxagentRunId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}


async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    const message =
      error.details ||
      error.error ||
      (typeof error === "string" ? error : "Request failed");
    throw new Error(message);
  }

  return response.json();
}

export interface SessionTranscript {
  agentActions: Array<{
    type: string;
    timestamp: number;
    pageUrl?: string;
    x?: number;
    y?: number;
    button?: string;
    keys?: string;
    [key: string]: any;
  }>;
  agentReasoning: string;
  agentLogs?: Array<{
    timestamp: number;
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
    message: string;
  }>;
  screenshots: Array<{
    id: string;
    stepNumber: number;
    description: string | null;
    base64Data: string | null;
    createdAt: string;
  }>;
  timeline: Array<{
    type: "action" | "screenshot" | "reasoning" | "log" | "raw";
    timestamp: number;
    data: any;
  }>;
  testRun: {
    startedAt: string | null;
    completedAt: string | null;
    targetUrl: string;
  };
}

export async function getSessionTranscript(testRunId: string): Promise<SessionTranscript> {
  return fetchWithAuth(`/api/tests/${testRunId}/transcript`);
}

export async function generatePersonas(
  targetUrl: string,
  userDescription: string,
  agentCount: number = 3
): Promise<{
  personas: GeneratedPersona[];
  recommendedIndices: number[];
  selectionReasoning: string;
  generationWarning?: string;
  fallbackUsed?: boolean;
}> {
  return fetchWithAuth("/api/batch-tests/generate-personas", {
    method: "POST",
    body: JSON.stringify({ targetUrl, userDescription, agentCount }),
  });
}

export async function createBatchTest(
  targetUrl: string,
  userDescription: string,
  generatedPersonas: GeneratedPersona[],
  selectedPersonaIndices: number[],
  agentCount?: number,
  useUXAgent: boolean = false,
  maxSteps: number = 20
): Promise<{
  batchTestRun: BatchTestRun;
  message: string;
  useUXAgent?: boolean;
}> {
  return fetchWithAuth("/api/batch-tests", {
    method: "POST",
    body: JSON.stringify({
      targetUrl,
      userDescription,
      generatedPersonas,
      selectedPersonaIndices,
      agentCount,
      useUXAgent,
      maxSteps,
    }),
  });
}

export async function getBatchTests(): Promise<{ batchTests: BatchTestRun[] }> {
  return fetchWithAuth("/api/batch-tests");
}

export async function getBatchTest(id: string): Promise<{
  batchTestRun: BatchTestRun;
  testRuns: TestRunWithReport[];
  aggregatedReport: AggregatedReport | null;
  uxagentRuns: UXAgentRun[];
}> {
  return fetchWithAuth(`/api/batch-tests/${id}`);
}


interface Swarm {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  personas: GeneratedPersona[];
  agentCount: number;
  createdAt: string;
}

export async function getSwarms(): Promise<{ swarms: Swarm[] }> {
  return fetchWithAuth("/api/swarms");
}

export async function createSwarm(
  name: string,
  description: string,
  personas: GeneratedPersona[],
  agentCount: number
): Promise<{ swarm: Swarm }> {
  return fetchWithAuth("/api/swarms", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      personas,
      agentCount,
    }),
  });
}

export async function updateSwarm(
  id: string,
  data: Partial<Pick<Swarm, "name" | "description" | "personas" | "agentCount">>
): Promise<{ swarm: Swarm }> {
  return fetchWithAuth(`/api/swarms/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSwarm(id: string): Promise<{ message: string; id: string }> {
  return fetchWithAuth(`/api/swarms/${id}`, {
    method: "DELETE",
  });
}

export async function terminateBatchTest(id: string): Promise<{ message: string; batchTestRun: BatchTestRun }> {
  return fetchWithAuth(`/api/batch-tests/${id}/terminate`, {
    method: "POST",
  });
}

// UXAgent Thoughts API
export async function getUXAgentThoughts(runId: string): Promise<{ thoughts: UXAgentThought[] }> {
  return fetchWithAuth(`/api/uxagent/runs/${runId}/thoughts`);
}

// UXAgent Insights API
export async function getUXAgentInsights(runId: string): Promise<{ insights: UXAgentInsight[] }> {
  return fetchWithAuth(`/api/uxagent/runs/${runId}/insights`);
}

export async function generateUXAgentInsights(runId: string): Promise<{ insights: UXAgentInsight[]; generated?: boolean; cached?: boolean }> {
  return fetchWithAuth(`/api/uxagent/runs/${runId}/insights`, {
    method: "POST",
  });
}

// UXAgent Chat API
export async function getUXAgentChatHistory(runId: string): Promise<{ messages: UXAgentChatMessage[] }> {
  return fetchWithAuth(`/api/uxagent/runs/${runId}/chat`);
}

export async function sendUXAgentChatMessage(runId: string, message: string): Promise<{
  response: string;
  persona: {
    name: string;
    age: string | number;
    occupation: string;
  };
}> {
  return fetchWithAuth(`/api/uxagent/runs/${runId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export type {
  GeneratedPersona,
  BatchTestRun,
  TestRunWithReport,
  AggregatedReport,
  Swarm,
  UXAgentRun,
  UXAgentScreenshot,
  UXAgentThought,
  UXAgentInsight,
  UXAgentChatMessage,
};
