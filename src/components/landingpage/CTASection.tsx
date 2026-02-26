"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

export default function CTASection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section className="lp-section py-24 md:py-32 bg-white">
            <div className="lp-container" ref={ref}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="relative overflow-hidden rounded-3xl"
                >
                    {/* Background — warm gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-800 to-stone-700" />

                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-stone-600/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
                    <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                            backgroundSize: "24px 24px",
                        }}
                    />

                    {/* Content */}
                    <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight mb-4"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            Ready to Take Control?
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-lg md:text-xl text-stone-300 max-w-2xl mx-auto mb-8"
                        >
                            Join landlords who manage smarter, earn more, and never lose sight of their portfolio.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-full bg-amber-400 text-stone-900 hover:bg-amber-300 transition-all duration-200 shadow-lg shadow-amber-400/20 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Get Started Free
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
