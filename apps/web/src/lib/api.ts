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
  try {
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
      const errorMessage = error.error || `Request failed with status ${response.status}`;
      const authError = new Error(errorMessage);
      (authError as any).status = response.status;
      throw authError;
    }

    return response.json();
  } catch (error: any) {
    // Handle network errors (CORS, connection refused, etc.)
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      const networkError = new Error("Unable to connect to API server. Please ensure the API is running.");
      (networkError as any).isNetworkError = true;
      throw networkError;
    }
    throw error;
  }
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

export async function deleteTests(ids: string[]): Promise<{ message: string }> {
  return fetchWithAuth("/api/tests", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export async function getPersonas(): Promise<{ personas: Persona[] }> {
  return fetchWithAuth("/api/tests/personas");
}

export async function getSessionRecording(testId: string): Promise<{
  liveViewUrl: string;
  sessionId: string;
}> {
  return fetchWithAuth(`/api/tests/${testId}/recording`);
}

export type { TestRun, Report, Screenshot, Persona };
