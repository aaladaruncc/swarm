"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { generatePersonas, type GeneratedPersona } from "@/lib/batch-api";
import { uploadScreenshots, createScreenshotTest } from "@/lib/screenshot-api";
import { ScreenshotUploader, type ScreenshotFile } from "@/components/screenshot-tests/ScreenshotUploader";
import { Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export default function NewScreenshotTest() {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const { theme } = useTheme();
    const isLight = theme === "light";

    // Screenshots
    const [screenshots, setScreenshots] = useState<ScreenshotFile[]>([]);

    // Test details
    const [testName, setTestName] = useState("");
    const [userDescription, setUserDescription] = useState("");
    const [expectedTask, setExpectedTask] = useState("");

    // Persona
    const [persona, setPersona] = useState<GeneratedPersona | null>(null);
    const [generatingPersona, setGeneratingPersona] = useState(false);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (isPending) {
        return (
            <div className={`h-full flex items-center justify-center ${isLight ? "bg-neutral-50" : "bg-neutral-950"
                } ${isLight ? "text-neutral-900" : "text-white"}`}>
                <Loader2 className={`animate-spin w-8 h-8 ${isLight ? "text-neutral-500" : "text-neutral-400"
                    }`} />
            </div>
        );
    }

    if (!session?.user) {
        router.push("/");
        return null;
    }

    const handleGeneratePersona = async () => {
        if (!userDescription) {
            setError("Please provide a description of your target audience");
            return;
        }

        setGeneratingPersona(true);
        setError("");

        try {
            const result = await generatePersonas("", userDescription, 1);
            if (result.personas && result.personas.length > 0) {
                setPersona(result.personas[0]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate persona");
        } finally {
            setGeneratingPersona(false);
        }
    };

    const handleStartTest = async () => {
        if (screenshots.length === 0) {
            setError("Please upload at least one screenshot");
            return;
        }

        if (!persona) {
            setError("Please generate a persona first");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Convert screenshots to base64
            const screenshotPromises = screenshots.map(async (screenshot, index) => {
                return new Promise<{ base64: string; description?: string; order: number }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result as string;
                        // Remove data URL prefix
                        const base64Data = base64.split(",")[1];
                        resolve({
                            base64: base64Data,
                            description: screenshot.description || undefined,
                            order: index,
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(screenshot.file);
                });
            });

            const screenshotData = await Promise.all(screenshotPromises);

            // Upload screenshots
            const uploadResult = await uploadScreenshots(screenshotData);

            // Create test with uploaded screenshots
            const testResult = await createScreenshotTest(
                testName || undefined,
                userDescription,
                expectedTask || undefined,
                uploadResult.uploadedScreenshots,
                persona
            );

            // Redirect to results page
            router.push(`/dashboard/tests/screenshot/${testResult.screenshotTestRun.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start test");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full overflow-auto">
            {/* Breadcrumb Header */}
            <div className="mb-8 flex-shrink-0">
                <nav className="flex items-center gap-2 text-sm mb-6">
                    <Link
                        href="/dashboard"
                        className={`transition-colors font-light ${isLight
                                ? "text-neutral-600 hover:text-neutral-900"
                                : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        Playground
                    </Link>
                    <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
                    <span className={isLight ? "text-neutral-900 font-medium" : "text-white font-medium"}>
                        Screenshot Flow Test
                    </span>
                </nav>
                <h1 className={`text-3xl font-light tracking-tight mb-2 ${isLight ? "text-neutral-900" : "text-white"
                    }`}>
                    Screenshot Flow Test
                </h1>
                <p className={`font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                    }`}>
                    Upload screenshots of a user flow and let AI analyze them from a persona's perspective
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                {/* Left Column: Screenshots & Test Details */}
                <div className="space-y-6">
                    {/* Upload Screenshots */}
                    <div className={`border rounded-xl p-6 ${isLight
                            ? "bg-white border-neutral-200"
                            : "bg-[#1E1E1E] border-white/10"
                        }`}>
                        <div className="flex items-center gap-2 mb-4">
                            <ImageIcon size={20} className={isLight ? "text-neutral-900" : "text-white"} />
                            <h2 className={`text-lg font-medium ${isLight ? "text-neutral-900" : "text-white"
                                }`}>
                                Upload Screenshots
                            </h2>
                        </div>
                        <ScreenshotUploader
                            screenshots={screenshots}
                            onScreenshotsChange={setScreenshots}
                            maxScreenshots={20}
                        />
                    </div>

                    {/* Test Details */}
                    <div className={`border rounded-xl p-6 ${isLight
                            ? "bg-white border-neutral-200"
                            : "bg-[#1E1E1E] border-white/10"
                        }`}>
                        <h2 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            Test Details
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className={`text-sm font-medium mb-2 block ${isLight ? "text-neutral-900" : "text-white"
                                    }`}>
                                    Test Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    placeholder="e.g., Checkout Flow Review"
                                    className={`w-full border px-4 py-3 focus:ring-1 outline-none transition-all placeholder:font-light text-sm rounded-lg ${isLight
                                            ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:ring-neutral-500/20 placeholder:text-neutral-400"
                                            : "bg-[#252525] border-white/10 text-white focus:border-white/30 focus:ring-white/10 placeholder:text-neutral-600"
                                        }`}
                                />
                            </div>

                            <div>
                                <label className={`text-sm font-medium mb-2 block ${isLight ? "text-neutral-900" : "text-white"
                                    }`}>
                                    Expected Task (optional)
                                </label>
                                <input
                                    type="text"
                                    value={expectedTask}
                                    onChange={(e) => setExpectedTask(e.target.value)}
                                    placeholder="e.g., Complete a purchase"
                                    className={`w-full border px-4 py-3 focus:ring-1 outline-none transition-all placeholder:font-light text-sm rounded-lg ${isLight
                                            ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:ring-neutral-500/20 placeholder:text-neutral-400"
                                            : "bg-[#252525] border-white/10 text-white focus:border-white/30 focus:ring-white/10 placeholder:text-neutral-600"
                                        }`}
                                />
                                <p className={`text-xs font-light mt-2 ${isLight ? "text-neutral-500" : "text-neutral-500"
                                    }`}>
                                    What is the user trying to accomplish in this flow?
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Persona */}
                <div className="space-y-6">
                    <div className={`border rounded-xl p-6 ${isLight
                            ? "bg-white border-neutral-200"
                            : "bg-[#1E1E1E] border-white/10"
                        }`}>
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={20} className={isLight ? "text-neutral-900" : "text-white"} />
                            <h2 className={`text-lg font-medium ${isLight ? "text-neutral-900" : "text-white"
                                }`}>
                                Persona
                            </h2>
                        </div>

                        {!persona ? (
                            <div className="space-y-4">
                                <div>
                                    <label className={`text-sm font-medium mb-2 block ${isLight ? "text-neutral-900" : "text-white"
                                        }`}>
                                        Target Audience Description
                                    </label>
                                    <textarea
                                        value={userDescription}
                                        onChange={(e) => setUserDescription(e.target.value)}
                                        placeholder="Example: Busy professionals aged 25-45 who need quick meal planning..."
                                        className={`w-full border px-4 py-3 focus:ring-1 outline-none transition-all placeholder:font-light resize-none text-sm rounded-lg h-32 ${isLight
                                                ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:ring-neutral-500/20 placeholder:text-neutral-400"
                                                : "bg-[#252525] border-white/10 text-white focus:border-white/30 focus:ring-white/10 placeholder:text-neutral-600"
                                            }`}
                                        required
                                        minLength={10}
                                    />
                                    <p className={`text-xs font-light mt-2 ${isLight ? "text-neutral-500" : "text-neutral-500"
                                        }`}>
                                        Describe your target user: demographics, goals, tech comfort, pain points
                                    </p>
                                </div>

                                <button
                                    onClick={handleGeneratePersona}
                                    disabled={generatingPersona || !userDescription || userDescription.length < 10}
                                    className={`w-full px-6 py-3 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg ${isLight
                                            ? "bg-neutral-900 text-white hover:bg-neutral-800"
                                            : "bg-white text-neutral-900 hover:bg-neutral-200"
                                        }`}
                                >
                                    {generatingPersona ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Generating Persona...</span>
                                        </>
                                    ) : (
                                        <span>Generate Persona</span>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`p-4 border rounded-lg ${isLight
                                        ? "border-neutral-200 bg-neutral-50"
                                        : "border-white/10 bg-[#252525]"
                                    }`}>
                                    <h3 className={`font-medium text-base mb-2 ${isLight ? "text-neutral-900" : "text-white"
                                        }`}>
                                        {persona.name}
                                    </h3>
                                    <div className={`text-xs font-light flex items-center gap-2 mb-3 ${isLight ? "text-neutral-600" : "text-neutral-400"
                                        }`}>
                                        <span>{persona.age} years old</span>
                                        <span className={`w-1 h-1 rounded-full ${isLight ? "bg-neutral-400" : "bg-neutral-600"
                                            }`}></span>
                                        <span>{persona.country}</span>
                                    </div>
                                    <p className={`text-xs font-mono uppercase tracking-wider mb-2 ${isLight ? "text-neutral-500" : "text-neutral-500"
                                        }`}>
                                        {persona.occupation}
                                    </p>
                                    <p className={`text-xs font-light leading-relaxed ${isLight ? "text-neutral-600" : "text-neutral-400"
                                        }`}>
                                        {persona.primaryGoal}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setPersona(null)}
                                    className={`text-sm font-medium transition-colors ${isLight
                                            ? "text-neutral-600 hover:text-neutral-900"
                                            : "text-neutral-400 hover:text-white"
                                        }`}
                                >
                                    ← Generate Different Persona
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className={`mt-6 p-4 border text-sm font-light rounded-lg ${isLight
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex-shrink-0 flex items-center justify-end gap-4">
                <Link
                    href="/dashboard"
                    className={`px-5 py-2.5 text-sm font-medium transition-colors ${isLight
                            ? "text-neutral-600 hover:text-neutral-900"
                            : "text-neutral-400 hover:text-white"
                        }`}
                >
                    Cancel
                </Link>
                <button
                    onClick={handleStartTest}
                    disabled={loading || screenshots.length === 0 || !persona}
                    className={`px-6 py-2.5 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg ${isLight
                            ? "bg-neutral-900 text-white hover:bg-neutral-800"
                            : "bg-white text-neutral-900 hover:bg-neutral-200"
                        }`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <span>Start Analysis</span>
                    )}
                </button>
            </div>
        </div>
    );
}
