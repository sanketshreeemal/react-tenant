"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    LayoutDashboard,
    Bell,
    BarChart3,
} from "lucide-react";

const features = [
    {
        icon: LayoutDashboard,
        title: "Portfolio Command Center",
        subtitle: "Every property. Every unit. Every lease. At a glance.",
        description:
            "Drill into each asset's performance — from occupancy and rent rolls to lease expirations and payment history. No more spreadsheets, no more guesswork.",
        screenshotLabel: "Dashboard Screenshot",
        gradient: "from-amber-50 to-orange-50/50",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-700",
        accentBorder: "border-amber-200/60",
    },
    {
        icon: Bell,
        title: "Automated Communication",
        subtitle: "Rent reminders, maintenance alerts, tenant messaging — on autopilot.",
        description:
            "Customizable automated messages keep tenants informed about due rent, upcoming renewals, and maintenance. Fewer missed payments, happier tenants.",
        screenshotLabel: "Communication Screenshot",
        gradient: "from-amber-50 to-amber-100/50",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        accentBorder: "border-amber-200/60",
    },
    {
        icon: BarChart3,
        title: "Smart Reporting",
        subtitle: "Portfolio performance, delivered to your inbox.",
        description:
            "Frequent, customizable reports surface key metrics — vacancies, delinquencies, rent adjustments — so you're always ahead. What gets measured, gets done.",
        screenshotLabel: "Reporting Screenshot",
        gradient: "from-stone-50 to-stone-100/50",
        iconBg: "bg-stone-100",
        iconColor: "text-stone-600",
        accentBorder: "border-stone-200/60",
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.2 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

export default function FeaturesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section id="features" className="lp-section py-24 md:py-32 bg-white">
            <div className="lp-container">
                {/* Section header */}
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 md:mb-20"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-stone-100 text-stone-600 text-sm font-medium mb-4">
                        Core Features
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-stone-800 tracking-tight mb-4"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        Everything You Need.
                    </h2>
                    <p className="text-lg text-stone-500 max-w-2xl mx-auto">
                        Three powerful pillars that transform how you manage your rental portfolio.
                    </p>
                </motion.div>

                {/* Feature blocks */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="space-y-16 md:space-y-24"
                >
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        const isReversed = index % 2 === 1;

                        return (
                            <motion.div
                                key={feature.title}
                                variants={itemVariants}
                                className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${isReversed ? "lg:direction-rtl" : ""
                                    }`}
                            >
                                {/* Text content */}
                                <div className={`${isReversed ? "lg:order-2" : ""}`}>
                                    <div
                                        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.iconBg} mb-5`}
                                    >
                                        <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3 tracking-tight">
                                        {feature.title}
                                    </h3>
                                    <p className="text-lg font-medium text-stone-600 mb-4">
                                        {feature.subtitle}
                                    </p>
                                    <p className="text-base text-stone-500 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>

                                {/* Screenshot placeholder */}
                                <div className={`${isReversed ? "lg:order-1" : ""}`}>
                                    <div
                                        className={`relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-br ${feature.gradient} border ${feature.accentBorder} shadow-lg overflow-hidden group`}
                                    >
                                        {/* Placeholder content */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                                            <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                                                <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                                            </div>
                                            <p className="text-sm font-medium text-stone-400">
                                                {feature.screenshotLabel}
                                            </p>
                                            <p className="text-xs text-stone-300 mt-1">
                                                Product screenshot placeholder
                                            </p>
                                        </div>

                                        {/* Decorative grid pattern */}
                                        <div className="absolute inset-0 opacity-[0.03]"
                                            style={{
                                                backgroundImage:
                                                    "linear-gradient(90deg, #1C1917 1px, transparent 1px), linear-gradient(#1C1917 1px, transparent 1px)",
                                                backgroundSize: "24px 24px",
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
