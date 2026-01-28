"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/contexts/theme-context";

interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    strokeWidth?: number;
    centerLabel?: string;
    centerValue?: string | number;
}

export function DonutChart({
    data,
    size = 160,
    strokeWidth = 24,
    centerLabel,
    centerValue,
}: DonutChartProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let currentAngle = -90; // Start from top

    const segments = data.map((item) => {
        const percentage = item.value / total;
        const angle = percentage * 360;
        const startAngle = currentAngle;
        currentAngle += angle;

        const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
        const strokeDashoffset = circumference * 0.25 + circumference * (1 - (startAngle + 90) / 360);

        return {
            ...item,
            percentage,
            strokeDasharray,
            strokeDashoffset,
            startAngle,
        };
    });

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={isLight ? "#e5e5e5" : "#333"}
                    strokeWidth={strokeWidth}
                />
                {/* Data segments */}
                {segments.map((segment, index) => {
                    let offset = 0;
                    for (let i = 0; i < index; i++) {
                        offset += segments[i].percentage;
                    }
                    return (
                        <motion.circle
                            key={segment.label}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${circumference * segment.percentage} ${circumference}`}
                            strokeDashoffset={-circumference * offset}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: `0 ${circumference}` }}
                            animate={{ strokeDasharray: `${circumference * segment.percentage} ${circumference}` }}
                            transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                        />
                    );
                })}
            </svg>
            {/* Center text */}
            {(centerLabel || centerValue) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {centerValue !== undefined && (
                        <motion.span
                            className={`text-2xl font-semibold ${isLight ? "text-neutral-900" : "text-white"}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                        >
                            {centerValue}
                        </motion.span>
                    )}
                    {centerLabel && (
                        <motion.span
                            className={`text-xs uppercase tracking-wide ${isLight ? "text-neutral-500" : "text-neutral-400"}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                        >
                            {centerLabel}
                        </motion.span>
                    )}
                </div>
            )}
        </div>
    );
}

interface BarChartProps {
    data: { label: string; value: number; color: string }[];
    maxValue?: number;
    height?: number;
    showLabels?: boolean;
}

export function HorizontalBarChart({ data, maxValue, height = 32, showLabels = true }: BarChartProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const max = maxValue || Math.max(...data.map((d) => d.value), 1);

    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={item.label} className="space-y-1">
                    {showLabels && (
                        <div className="flex items-center justify-between text-xs">
                            <span className={isLight ? "text-neutral-600" : "text-neutral-400"}>
                                {item.label}
                            </span>
                            <span className={`font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                {item.value}
                            </span>
                        </div>
                    )}
                    <div
                        className={`w-full rounded-full overflow-hidden ${isLight ? "bg-neutral-100" : "bg-neutral-800"}`}
                        style={{ height: height / 2 }}
                    >
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / max) * 100}%` }}
                            transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

interface SeverityDistributionProps {
    critical: number;
    high: number;
    medium: number;
    low: number;
}

export function SeverityDistribution({ critical, high, medium, low }: SeverityDistributionProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const total = critical + high + medium + low;
    if (total === 0) return null;

    const data = [
        { label: "Critical", value: critical, color: "#ef4444" },
        { label: "High", value: high, color: "#f97316" },
        { label: "Medium", value: medium, color: "#eab308" },
        { label: "Low", value: low, color: isLight ? "#737373" : "#a3a3a3" },
    ].filter((d) => d.value > 0);

    return (
        <div className="flex items-center gap-6">
            <DonutChart
                data={data}
                size={120}
                strokeWidth={20}
                centerValue={total}
                centerLabel="Issues"
            />
            <div className="flex-1 space-y-2">
                {data.map((item, index) => (
                    <motion.div
                        key={item.label}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                    >
                        <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1 flex items-center justify-between">
                            <span className={`text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                {item.label}
                            </span>
                            <span className={`text-sm font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                {item.value}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

interface CategoryBreakdownProps {
    categories: { name: string; count: number; icon?: React.ReactNode }[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const total = categories.reduce((sum, cat) => sum + cat.count, 0);
    if (total === 0) return null;

    const colors = [
        "#3b82f6", // blue
        "#8b5cf6", // purple
        "#10b981", // green
        "#f59e0b", // amber
        "#ec4899", // pink
    ];

    return (
        <div className="space-y-4">
            {/* Stacked bar */}
            <div className={`h-3 rounded-full overflow-hidden flex ${isLight ? "bg-neutral-100" : "bg-neutral-800"}`}>
                {categories.map((cat, index) => {
                    const percentage = (cat.count / total) * 100;
                    return (
                        <motion.div
                            key={cat.name}
                            className="h-full"
                            style={{ backgroundColor: colors[index % colors.length] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                        />
                    );
                })}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((cat, index) => (
                    <motion.div
                        key={cat.name}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                            {cat.name}
                        </span>
                        <span className={`text-xs font-medium ml-auto ${isLight ? "text-neutral-900" : "text-white"}`}>
                            {cat.count}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

interface ScoreGaugeProps {
    score: number;
    maxScore?: number;
    size?: number;
    label?: string;
}

export function ScoreGauge({ score, maxScore = 10, size = 100, label }: ScoreGaugeProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const percentage = Math.min(score / maxScore, 1);
    const radius = (size - 16) / 2;
    const circumference = Math.PI * radius; // Half circle
    const center = size / 2;

    // Color based on score
    let color = "#ef4444"; // red
    if (percentage >= 0.7) color = "#10b981"; // green
    else if (percentage >= 0.5) color = "#eab308"; // yellow
    else if (percentage >= 0.3) color = "#f97316"; // orange

    return (
        <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
            <svg width={size} height={size / 2 + 8} className="overflow-visible">
                {/* Background arc */}
                <path
                    d={`M ${8} ${center} A ${radius} ${radius} 0 0 1 ${size - 8} ${center}`}
                    fill="none"
                    stroke={isLight ? "#e5e5e5" : "#333"}
                    strokeWidth={8}
                    strokeLinecap="round"
                />
                {/* Score arc */}
                <motion.path
                    d={`M ${8} ${center} A ${radius} ${radius} 0 0 1 ${size - 8} ${center}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - percentage) }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 text-center">
                <motion.span
                    className={`text-xl font-semibold ${isLight ? "text-neutral-900" : "text-white"}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {score.toFixed(1)}
                </motion.span>
                <span className={`text-sm ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                    /{maxScore}
                </span>
                {label && (
                    <p className={`text-xs uppercase tracking-wide mt-0.5 ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                        {label}
                    </p>
                )}
            </div>
        </div>
    );
}

interface InsightsSummaryCardProps {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    trend?: { value: number; isPositive: boolean };
    highlight?: boolean;
    highlightColor?: "red" | "green" | "amber" | "blue";
}

export function InsightsSummaryCard({
    icon,
    value,
    label,
    trend,
    highlight,
    highlightColor = "red",
}: InsightsSummaryCardProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const highlightClasses = {
        red: isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20",
        green: isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20",
        amber: isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/20",
        blue: isLight ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/20",
    };

    const highlightTextClasses = {
        red: isLight ? "text-red-700" : "text-red-400",
        green: isLight ? "text-emerald-700" : "text-emerald-400",
        amber: isLight ? "text-amber-700" : "text-amber-400",
        blue: isLight ? "text-blue-700" : "text-blue-400",
    };

    return (
        <motion.div
            className={`border p-4 rounded-xl ${highlight
                ? highlightClasses[highlightColor]
                : isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
                }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 border flex items-center justify-center rounded-lg ${highlight
                    ? highlightClasses[highlightColor]
                    : isLight
                        ? "bg-neutral-100 border-neutral-200"
                        : "bg-[#252525] border-white/10"
                    }`}>
                    {icon}
                </div>
                <div>
                    <p className={`text-2xl font-light ${highlight
                        ? highlightTextClasses[highlightColor]
                        : isLight
                            ? "text-neutral-900"
                            : "text-white"
                        }`}>
                        {value}
                    </p>
                    <p className={`text-xs uppercase tracking-wide font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                        {label}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
