const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface TestRun {
  id: string;
  userId: string;
  targetUrl: string;
  personaIndex: number;
  personaName: string | null;
  status: string;
  browserbaseSessionId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

interface Report {
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
}

interface Screenshot {
  id: string;
  testRunId: string;
  stepNumber: number;
  description: string | null;
  url: string | null;
  base64Data: string | null;
  createdAt: string;
}

interface Persona {
  index: number;
  name: string;
  age: number;
  occupation: string;
  techSavviness: string;
  country: string;
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

export async function getTests(): Promise<{ tests: TestRun[] }> {
  return fetchWithAuth("/api/tests");
}

export async function getTest(id: string): Promise<{
  testRun: TestRun;
  report: Report | null;
  screenshots: Screenshot[];
}> {
  return fetchWithAuth(`/api/tests/${id}`);
}

export async function createTest(targetUrl: string, personaIndex: number): Promise<{
  testRun: TestRun;
  message: string;
}> {
  return fetchWithAuth("/api/tests", {
    method: "POST",
    body: JSON.stringify({ targetUrl, personaIndex }),
  });
}

export async function getPersonas(): Promise<{ personas: Persona[] }> {
  return fetchWithAuth("/api/tests/personas");
}

export async function getSessionRecording(testId: string): Promise<{
  recording: any[];
  sessionId: string;
}> {
  return fetchWithAuth(`/api/tests/${testId}/recording`);
}

export type { TestRun, Report, Screenshot, Persona };
