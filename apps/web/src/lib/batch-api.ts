const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface GeneratedPersona {
  name: string;
  age: number;
  country: string;
  occupation: string;
  incomeLevel: "low" | "medium" | "high";
  techSavviness: "beginner" | "intermediate" | "advanced";
  primaryGoal: string;
  painPoints: string[];
  context: string;
  relevanceScore: number;
}

interface BatchTestRun {
  id: string;
  userId: string;
  targetUrl: string;
  userDescription: string;
  generatedPersonas: GeneratedPersona[];
  selectedPersonaIndices: number[];
  status: string;
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
    throw new Error(error.error || "Request failed");
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
  reasoning: string;
  recommendedIndices: number[];
  selectionReasoning: string;
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
  agentCount?: number
): Promise<{
  batchTestRun: BatchTestRun;
  message: string;
}> {
  return fetchWithAuth("/api/batch-tests", {
    method: "POST",
    body: JSON.stringify({
      targetUrl,
      userDescription,
      generatedPersonas,
      selectedPersonaIndices,
      agentCount,
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

export type {
  GeneratedPersona,
  BatchTestRun,
  TestRunWithReport,
  AggregatedReport,
  Swarm,
};
