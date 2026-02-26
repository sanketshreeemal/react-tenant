"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="lp-section bg-stone-50 border-t border-stone-200/60">
            <div className="lp-container py-10 md:py-12">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center shadow-sm">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold text-stone-800 tracking-tight">
                                Urban Leases
                            </span>
                        </Link>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-stone-400 max-w-md sm:text-right">
                        The modern property management platform for landlords who want
                        real-time visibility and portfolio intelligence.
                    </p>
                </div>

                {/* Divider + copyright */}
                <div className="mt-8 pt-6 border-t border-stone-200/60">
                    <p className="text-xs text-stone-400">
                        &copy; {new Date().getFullYear()} Urban Leases. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
