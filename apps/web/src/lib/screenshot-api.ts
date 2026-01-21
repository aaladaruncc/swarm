/**
 * Screenshot Testing API Client
 * 
 * API functions for screenshot-based user flow testing
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadedScreenshot {
    orderIndex: number;
    s3Key: string;
    s3Url: string;
    description?: string;
    context?: string;
}

export interface ScreenshotTestRun {
    id: string;
    userId: string;
    testName: string | null;
    userDescription: string | null;
    expectedTask: string | null;
    personaData: any;
    generatedPersonas?: any[] | null;
    selectedPersonaIndices?: number[] | null;
    agentCount?: number | null;
    status: string; // pending | uploading | analyzing | completed | failed
    overallScore: number | null;
    summary: string | null;
    fullReport: any;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
}

export interface ScreenshotFlowImage {
    id: string;
    screenshotTestRunId: string;
    orderIndex: number;
    s3Key: string;
    s3Url: string;
    signedUrl?: string;
    description: string | null;
    context: string | null;
    observations: string[] | null;
    positiveAspects: string[] | null;
    issues: Array<{
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendation: string;
    }> | null;
    accessibilityNotes: string[] | null;
    thoughts: string | null;
    comparisonWithPrevious: string | null;
    createdAt: string;
}

export interface ScreenshotTestResult {
    testRun: ScreenshotTestRun;
    screenshots: ScreenshotFlowImage[];
    personaResults?: Array<{
        personaIndex: number;
        personaName: string;
        analyses: Array<{
            id: string;
            screenshotTestRunId: string;
            screenshotOrder: number;
            s3Key: string;
            s3Url: string;
            personaIndex: number;
            personaName: string | null;
            observations: string[] | null;
            positiveAspects: string[] | null;
            issues: Array<{
                severity: "low" | "medium" | "high" | "critical";
                description: string;
                recommendation: string;
            }> | null;
            accessibilityNotes: string[] | null;
            thoughts: string | null;
            comparisonWithPrevious: string | null;
            createdAt: string;
        }>;
    }>;
    overallReport: {
        score: number | null;
        summary: string | null;
        fullReport: any;
    } | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

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

/**
 * Upload screenshots to S3
 */
export async function uploadScreenshots(
    screenshots: Array<{
        base64: string;
        description?: string;
        context?: string;
        order?: number;
    }>
): Promise<{
    uploadedScreenshots: UploadedScreenshot[];
    uploadBatchId: string;
    message: string;
}> {
    return fetchWithAuth("/api/screenshot-tests/upload", {
        method: "POST",
        body: JSON.stringify({ screenshots }),
    });
}

/**
 * Create and start a screenshot test
 */
export async function createScreenshotTest(
    testName: string | undefined,
    userDescription: string,
    expectedTask: string | undefined,
    screenshotSequence: UploadedScreenshot[],
    personaData: any,
    generatedPersonas?: any[],
    selectedPersonaIndices?: number[],
    agentCount?: number
): Promise<{
    screenshotTestRun: ScreenshotTestRun;
    message: string;
}> {
    return fetchWithAuth("/api/screenshot-tests", {
        method: "POST",
        body: JSON.stringify({
            testName,
            userDescription,
            expectedTask,
            screenshotSequence,
            personaData,
            generatedPersonas,
            selectedPersonaIndices,
            agentCount,
        }),
    });
}

/**
 * Re-run a screenshot test
 */
export async function rerunScreenshotTest(id: string): Promise<{
    screenshotTestRun: ScreenshotTestRun;
    message: string;
}> {
    return fetchWithAuth(`/api/screenshot-tests/${id}/rerun`, {
        method: "POST",
    });
}

/**
 * Get screenshot test results
 */
export async function getScreenshotTest(id: string): Promise<ScreenshotTestResult> {
    return fetchWithAuth(`/api/screenshot-tests/${id}`);
}

/**
 * List all screenshot tests for the user
 */
export async function getScreenshotTests(): Promise<{
    tests: ScreenshotTestRun[];
}> {
    return fetchWithAuth("/api/screenshot-tests");
}
