/**
 * UXAgent Service Client
 * 
 * HTTP client for calling the UXAgent service to run UX tests
 */

const UXAGENT_API_URL = process.env.UXAGENT_API_URL || "http://localhost:8000";
const UXAGENT_API_KEY = process.env.UXAGENT_API_KEY || "";
const MAIN_API_URL = process.env.MAIN_API_URL || "https://api.useswarm.co";

export interface UXAgentPersona {
    name: string;
    persona: string;
    intent: string;
    age?: number;
    occupation?: string;
    techSavviness?: string;
    [key: string]: any;
}

export interface UXAgentRunRequest {
    total_personas: number;
    demographics: Array<{ category: string; percentage: number }>;
    general_intent: string;
    start_url: string;
    max_steps: number;
    questionnaire: Record<string, any>;
    concurrency?: number;
    headless?: boolean;
    example_persona?: string;
}

export interface UXAgentRunResponse {
    status?: string;  // "accepted" for async
    run_id?: string;
    message?: string;
    success?: boolean;  // Legacy sync response
    agent_count: number;
    personas_generated?: number;
    error?: string;
}

/**
 * Start a UX test run on the UXAgent service
 * 
 * @param request - The run configuration
 * @param callbackUrl - URL for UXAgent to call back with results
 * @param testRunId - Optional test run ID to link results
 * @param userId - User ID for the callback
 */
export async function startUXAgentRun(
    request: UXAgentRunRequest,
    callbackUrl?: string,
    testRunId?: string,
    userId?: string,
): Promise<UXAgentRunResponse> {
    const url = `${UXAGENT_API_URL}/run`;

    console.log(`[UXAgent Client] Starting run at ${url}`);
    console.log(`[UXAgent Client] Callback URL: ${callbackUrl || `${MAIN_API_URL}/api/uxagent/runs`}`);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": UXAGENT_API_KEY,
            "X-Callback-URL": callbackUrl || `${MAIN_API_URL}/api/uxagent/runs`,
            "X-Callback-API-Key": UXAGENT_API_KEY,
            "X-User-ID": userId || "",
            "X-Test-Run-ID": testRunId || "",
        },
        body: JSON.stringify(request),
    });

    // Accept both 200 (sync) and 202 (async) as success
    if (!response.ok && response.status !== 202) {
        const errorText = await response.text();
        console.error(`[UXAgent Client] Error: ${response.status} - ${errorText}`);
        throw new Error(`UXAgent request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as UXAgentRunResponse;
    console.log(`[UXAgent Client] Run started successfully (status: ${response.status})`);

    return result;
}

/**
 * Check the progress of a running test
 */
export async function checkUXAgentProgress(): Promise<{
    phase: string;
    current: number;
    total: number;
    message: string;
}> {
    const url = `${UXAGENT_API_URL}/progress`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "X-API-Key": UXAGENT_API_KEY,
        },
    });

    if (!response.ok) {
        throw new Error(`UXAgent progress check failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Check if the UXAgent service is healthy
 */
export async function checkUXAgentHealth(): Promise<boolean> {
    try {
        const url = `${UXAGENT_API_URL}/health`;
        const response = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Convert generated personas to UXAgent demographics format
 */
export function personasToUXAgentFormat(personas: UXAgentPersona[]): {
    demographics: Array<{ category: string; percentage: number }>;
    example_persona?: string;
} {
    // Extract unique categories from personas
    const categories = new Map<string, number>();

    for (const persona of personas) {
        const category = persona.occupation || "General User";
        categories.set(category, (categories.get(category) || 0) + 1);
    }

    const total = personas.length;
    const demographics = Array.from(categories.entries()).map(([category, count]) => ({
        category,
        percentage: Math.round((count / total) * 100),
    }));

    // Use first persona as example
    const example_persona = personas[0]?.persona;

    return { demographics, example_persona };
}
