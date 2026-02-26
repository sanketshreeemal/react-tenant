"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp, Home, ShieldCheck, Activity } from "lucide-react";

interface Metric {
    value: number;
    suffix: string;
    prefix: string;
    label: string;
    description: string;
    icon: React.ElementType;
    accentColor: string;
    accentBg: string;
    barWidth: string;
}

const metrics: Metric[] = [
    {
        value: 15,
        suffix: "%",
        prefix: "+",
        label: "Higher Rents",
        description: "Landlords charge more with data-driven rent adjustments on predictable cadences.",
        icon: TrendingUp,
        accentColor: "text-stone-600",
        accentBg: "bg-stone-100",
        barWidth: "75%",
    },
    {
        value: 20,
        suffix: "%",
        prefix: "+",
        label: "Occupancy Rate",
        description: "Proactive vacancy tracking and lease renewal automation keeps units filled faster.",
        icon: Home,
        accentColor: "text-stone-600",
        accentBg: "bg-stone-100",
        barWidth: "85%",
    },
    {
        value: 40,
        suffix: "%",
        prefix: "",
        label: "Lower Delinquencies",
        description: "Automated rent reminders and follow-ups dramatically reduce late payments.",
        icon: ShieldCheck,
        accentColor: "text-stone-600",
        accentBg: "bg-stone-100",
        barWidth: "60%",
    },
    {
        value: 24,
        suffix: "/7",
        prefix: "",
        label: "Real-time Visibility",
        description: "Live portfolio health — every property, lease, and payment — on any device.",
        icon: Activity,
        accentColor: "text-stone-600",
        accentBg: "bg-stone-100",
        barWidth: "100%",
    },
];

function AnimatedCounter({
    value,
    suffix,
    prefix,
    isInView,
}: {
    value: number;
    suffix: string;
    prefix: string;
    isInView: boolean;
}) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!isInView) return;

        let start = 0;
        const duration = 2000;
        const increment = value / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [isInView, value]);

    return (
        <span className="tabular-nums">
            {prefix}
            {count}
            {suffix}
        </span>
    );
}

export default function MetricsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section className="lp-section py-24 md:py-32 relative overflow-hidden">
            {/* Light warm background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/40 to-white" />

            {/* Subtle decorative orbs */}
            <div className="absolute top-20 right-[15%] w-80 h-80 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-[10%] w-72 h-72 bg-orange-50/50 rounded-full blur-3xl pointer-events-none" />

            <div className="lp-container relative z-10" ref={ref}>
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 md:mb-20"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-stone-100 text-stone-600 text-sm font-medium mb-4">
                        Proven Results
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-stone-800 tracking-tight mb-4"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        What Gets Measured,{" "}
                        <span className="text-stone-600 italic">Gets Done.</span>
                    </h2>
                    <p className="text-lg text-stone-500 max-w-2xl mx-auto">
                        Landlords using Urban Leases consistently outperform market averages.
                    </p>
                </motion.div>

                {/* Metrics grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                    {metrics.map((metric, index) => {
                        const Icon = metric.icon;
                        return (
                            <motion.div
                                key={metric.label}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{
                                    duration: 0.6,
                                    delay: index * 0.12,
                                    ease: [0.25, 0.46, 0.45, 0.94],
                                }}
                                className="group"
                            >
                                <div className="relative h-full p-6 md:p-7 rounded-2xl bg-white border border-stone-200/70 shadow-sm hover:shadow-lg hover:border-stone-300/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                                    {/* Top accent line */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-stone-400 via-stone-500 to-stone-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Icon */}
                                    <div
                                        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${metric.accentBg} mb-5`}
                                    >
                                        <Icon className={`w-5 h-5 ${metric.accentColor}`} />
                                    </div>

                                    {/* Number */}
                                    <div
                                        className="text-4xl md:text-5xl font-bold text-stone-800 mb-1 tracking-tight"
                                        style={{ fontFamily: "'Playfair Display', serif" }}
                                    >
                                        <AnimatedCounter
                                            value={metric.value}
                                            suffix={metric.suffix}
                                            prefix={metric.prefix}
                                            isInView={isInView}
                                        />
                                    </div>

                                    {/* Label */}
                                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-3">
                                        {metric.label}
                                    </h3>

                                    {/* Progress bar */}
                                    <div className="w-full h-1 rounded-full bg-stone-100 mb-4 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={isInView ? { width: metric.barWidth } : {}}
                                            transition={{ duration: 1.2, delay: 0.5 + index * 0.15, ease: "easeOut" }}
                                            className="h-full rounded-full bg-gradient-to-r from-stone-400 to-stone-500"
                                        />
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-stone-500 leading-relaxed">
                                        {metric.description}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
