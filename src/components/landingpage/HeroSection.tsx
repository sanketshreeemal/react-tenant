"use client";

import React from "react";
import { motion } from "framer-motion";
import HeroIllustration from "./HeroIllustration";

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
};

export default function HeroSection() {
    return (
        <section className="lp-section lp-gradient-mesh relative overflow-hidden min-h-screen flex items-center">
            {/* Soft decorative orbs — warm amber tones */}
            <div className="absolute top-10 right-[15%] w-80 h-80 bg-amber-100/40 rounded-full blur-3xl lp-float-slow pointer-events-none" />
            <div className="absolute bottom-10 left-[10%] w-96 h-96 bg-orange-50/50 rounded-full blur-3xl lp-float pointer-events-none" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-50/30 rounded-full blur-3xl pointer-events-none" />

            <div className="lp-container relative z-10 pt-24 pb-20 md:pt-32 md:pb-28">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left: Copy */}
                    <div className="max-w-2xl">
                        <motion.h1
                            custom={0}
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                            className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] leading-[1.1] tracking-tight mb-6"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            <span className="text-stone-800 font-semibold">
                                Your Entire Portfolio.
                            </span>
                            <br />
                            <span className="text-stone-800 font-semibold italic">
                                One Living Dashboard.
                            </span>
                        </motion.h1>

                        <motion.p
                            custom={1}
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                            className="text-lg md:text-xl text-stone-500 leading-relaxed mb-10 max-w-lg"
                        >
                            A live, real-time view of your every property, lease, and payment — on any device, at any moment.
                        </motion.p>

                        <motion.div
                            custom={2}
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                        >
                            <a
                                href="#features"
                                className="inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold rounded-full bg-stone-800 text-white hover:bg-stone-900 transition-all duration-200 shadow-lg shadow-stone-800/15 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                See How It Works
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
                                    <path d="M12 5v14" />
                                    <path d="m19 12-7 7-7-7" />
                                </svg>
                            </a>
                        </motion.div>
                    </div>

                    {/* Right: Animated SVG illustration */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="relative hidden lg:block"
                    >
                        <div className="relative w-full h-full min-h-[500px]">
                            <HeroIllustration className="absolute inset-0 overflow-hidden" />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom fade to white */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </section>
    );
}
