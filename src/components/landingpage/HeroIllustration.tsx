"use client";

import React from "react";

/**
 * Animated isometric city-to-circuit-board SVG illustration.
 * Starts as an earthy-toned city block on a warm ground plane,
 * then morphs into flat tech chips with dark vivid data traces.
 * Transparent background lets the hero section gradient show through.
 */
export default function HeroIllustration({ className }: { className?: string }) {
    return (
        <div className={className}>
            <style jsx>{`
        .flow {
          stroke-dasharray: 12 24;
          animation: dash 4s linear infinite;
        }
        .flow-slow {
          stroke-dasharray: 20 40;
          animation: dash 6s linear infinite;
        }
        .flow-rev {
          stroke-dasharray: 15 30;
          animation: dash-rev 5s linear infinite;
        }
        @keyframes dash {
          from { stroke-dashoffset: 72; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes dash-rev {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 90; }
        }
      `}</style>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1000 600"
                preserveAspectRatio="xMidYMid slice"
                className="w-full h-full block"
            >
                <defs>
                    {/* Glowing Tech Filters */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="glow-subtle" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Isometric Tech Surface Grids — dark navy */}
                    <pattern id="grid-amber" width="12" height="6" patternUnits="userSpaceOnUse">
                        <path d="M 0 3 L 6 0 L 12 3 L 6 6 Z" fill="none" stroke="#991B1B" strokeWidth="0.5" opacity="0.5" />
                    </pattern>
                    <pattern id="grid-cyan" width="12" height="6" patternUnits="userSpaceOnUse">
                        <path d="M 0 3 L 6 0 L 12 3 L 6 6 Z" fill="none" stroke="#1E3A8A" strokeWidth="0.5" opacity="0.5" />
                    </pattern>
                    <pattern id="grid-copper" width="12" height="6" patternUnits="userSpaceOnUse">
                        <path d="M 0 3 L 6 0 L 12 3 L 6 6 Z" fill="none" stroke="#7C2D12" strokeWidth="0.5" opacity="0.5" />
                    </pattern>

                    {/* Tree -> Tech Pin Morph */}
                    <g id="tree">
                        {/* Physical Tree */}
                        <g opacity="1">
                            <animate attributeName="opacity" begin="5.0s" dur="0.5s" fill="freeze" to="0" />
                            <ellipse cx="0" cy="0" rx="8" ry="4" fill="rgba(0,0,0,0.15)" />
                            <path d="M 0 0 L 0 -12" stroke="#5C4033" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="0" cy="-16" r="10" fill="#7CB342" stroke="#334E2A" strokeWidth="1.5" />
                            <circle cx="-3" cy="-19" r="4" fill="#9CCC65" opacity="0.8" />
                        </g>
                        {/* Dark Tech Node */}
                        <g opacity="0">
                            <animate attributeName="opacity" begin="5.8s" dur="0.8s" fill="freeze" to="1" />
                            <polygon points="0,4 6,1 0,-2 -6,1" fill="#1E3A8A" filter="url(#glow-subtle)" />
                            <path d="M -2 0 L 0 -10 L 2 0 Z" fill="#1E3A8A" opacity="0.9" />
                            <circle cx="0" cy="-10" r="2" fill="#3B82F6" filter="url(#glow)" />
                        </g>
                    </g>

                    {/* BUILDING A (Hero Core CPU) W=40, H=140 */}
                    <g id="bldg-hero">
                        {/* Left Face */}
                        <path fill="#E8B498" stroke="#3A2E2A" strokeWidth="1.5" strokeLinejoin="round" d="M -40 -140 L 0 -120 L 0 20 L -40 0 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M -40 -10 L 0 10 L 0 20 L -40 0 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(210,180,150,0.15)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#991B1B" />
                            <animate attributeName="stroke-width" begin="5.7s" dur="0.8s" fill="freeze" to="2" />
                        </path>
                        {/* Right Face */}
                        <path fill="#D69471" stroke="#3A2E2A" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -120 L 40 -140 L 40 0 L 0 20 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 10 L 40 -10 L 40 0 L 0 20 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(200,170,140,0.1)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#991B1B" />
                            <animate attributeName="stroke-width" begin="5.7s" dur="0.8s" fill="freeze" to="2" />
                        </path>
                        {/* Top Face */}
                        <path fill="#FADCC8" stroke="#3A2E2A" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -160 L 40 -140 L 0 -120 L -40 -140 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 -30 L 40 -10 L 0 10 L -40 -10 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(220,190,160,0.12)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#991B1B" />
                            <animate attributeName="stroke-width" begin="5.7s" dur="0.8s" fill="freeze" to="2" />
                        </path>

                        <g opacity="1">
                            <animate attributeName="opacity" begin="5.2s" dur="0.5s" fill="freeze" to="0" />
                            <polygon points="0,-152 32,-136 0,-120 -32,-136" fill="#C9987A" stroke="#3A2E2A" strokeWidth="1" />
                            {/* Left Windows — shifted down to stay within building face */}
                            <g transform="matrix(1, 0.5, 0, 1, 0, 0)" fill="#E0FBFC" stroke="#264653" strokeWidth="1">
                                <rect x="-32" y="-105" width="10" height="14" rx="1" />
                                <rect x="-16" y="-105" width="10" height="14" rx="1" />
                                <rect x="-32" y="-80" width="10" height="14" rx="1" />
                                <rect x="-16" y="-80" width="10" height="14" rx="1" />
                                <rect x="-32" y="-55" width="10" height="14" rx="1" />
                                <rect x="-16" y="-55" width="10" height="14" rx="1" />
                                <rect x="-32" y="-30" width="10" height="14" rx="1" />
                                <rect x="-20" y="-10" width="14" height="10" fill="#2A9D8F" />
                            </g>
                            {/* Right Windows — shifted down to stay within building face */}
                            <g transform="matrix(1, -0.5, 0, 1, 0, 0)" fill="#E0FBFC" stroke="#264653" strokeWidth="1">
                                <rect x="6" y="-105" width="10" height="14" rx="1" />
                                <rect x="22" y="-105" width="10" height="14" rx="1" />
                                <rect x="6" y="-80" width="10" height="14" rx="1" />
                                <rect x="22" y="-80" width="10" height="14" rx="1" />
                                <rect x="6" y="-55" width="10" height="14" rx="1" />
                                <rect x="22" y="-55" width="10" height="14" rx="1" />
                                <rect x="6" y="-30" width="10" height="14" rx="1" />
                                <rect x="22" y="-30" width="10" height="14" rx="1" />
                            </g>
                        </g>

                        {/* Emerging Master CPU Core */}
                        <g opacity="0">
                            <animate attributeName="opacity" begin="6.1s" dur="0.8s" fill="freeze" to="1" />
                            <path d="M 0 -30 L 40 -10 L 0 10 L -40 -10 Z" fill="url(#grid-amber)" />
                            <path d="M 0 -24 L 24 -12 L 0 0 L -24 -12 Z" fill="none" stroke="#991B1B" strokeWidth="1.5" />
                            <path d="M -12 -6 L -6 -9 L 0 -6 L 6 -9 L 12 -6" fill="none" stroke="#991B1B" strokeWidth="1" />
                            <polygon points="0,-16 10,-11 0,-6 -10,-11" fill="#B91C1C" filter="url(#glow)">
                                <animate attributeName="opacity" values="1; 0.6; 1" dur="2s" repeatCount="indefinite" begin="6.9s" />
                            </polygon>
                        </g>
                    </g>

                    {/* BUILDING B (Gold→Crimson Trace Block) W=30, H=90 */}
                    <g id="bldg-b">
                        <path fill="#F9E7B6" stroke="#3D405B" strokeWidth="1.5" strokeLinejoin="round" d="M -30 -90 L 0 -75 L 0 15 L -30 0 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M -30 -5 L 0 10 L 0 15 L -30 0 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(210,180,150,0.15)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#991B1B" />
                        </path>
                        <path fill="#EAC775" stroke="#3D405B" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -75 L 30 -90 L 30 0 L 0 15 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 10 L 30 -5 L 30 0 L 0 15 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(200,170,140,0.1)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#991B1B" />
                        </path>
                        <path fill="#FFF5D1" stroke="#3D405B" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -105 L 30 -90 L 0 -75 L -30 -90 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 -20 L 30 -5 L 0 10 L -30 -5 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(220,190,160,0.12)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#991B1B" />
                        </path>
                        <g opacity="1">
                            <animate attributeName="opacity" begin="5.2s" dur="0.5s" fill="freeze" to="0" />
                            <g transform="matrix(1, 0.5, 0, 1, 0, 0)" fill="#FFF" stroke="#3D405B" strokeWidth="1">
                                <rect x="-22" y="-65" width="14" height="12" />
                                <rect x="-22" y="-47" width="14" height="12" />
                                <rect x="-22" y="-29" width="14" height="12" />
                                <rect x="-18" y="-10" width="10" height="10" fill="#3D405B" />
                            </g>
                            <g transform="matrix(1, -0.5, 0, 1, 0, 0)" fill="#FFF" stroke="#3D405B" strokeWidth="1">
                                <rect x="8" y="-65" width="14" height="12" />
                                <rect x="8" y="-47" width="14" height="12" />
                                <rect x="8" y="-29" width="14" height="12" />
                                <rect x="8" y="-11" width="14" height="12" />
                            </g>
                        </g>
                        <g opacity="0">
                            <animate attributeName="opacity" begin="6.1s" dur="0.8s" fill="freeze" to="1" />
                            <path d="M 0 -20 L 30 -5 L 0 10 L -30 -5 Z" fill="url(#grid-amber)" />
                            <path d="M -15 -12.5 L 0 -5 L 15 -12.5" fill="none" stroke="#991B1B" strokeWidth="1.5" />
                        </g>
                    </g>

                    {/* BUILDING C (Grey→Navy Trace Block) W=35, H=110 */}
                    <g id="bldg-c">
                        <path fill="#B5A59E" stroke="#3A2E2A" strokeWidth="1.5" strokeLinejoin="round" d="M -35 -110 L 0 -92.5 L 0 17.5 L -35 0 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M -35 -5 L 0 12.5 L 0 17.5 L -35 0 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(180,200,210,0.15)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#1E3A8A" />
                        </path>
                        <path fill="#9A8B84" stroke="#3A2E2A" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -92.5 L 35 -110 L 35 0 L 0 17.5 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 12.5 L 35 -5 L 35 0 L 0 17.5 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(170,190,200,0.1)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#1E3A8A" />
                        </path>
                        <path fill="#CFC1BA" stroke="#3A2E2A" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -127.5 L 35 -110 L 0 -92.5 L -35 -110 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 -22.5 L 35 -5 L 0 12.5 L -35 -5 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(190,210,220,0.12)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#1E3A8A" />
                        </path>
                        <g opacity="1">
                            <animate attributeName="opacity" begin="5.2s" dur="0.5s" fill="freeze" to="0" />
                            <g transform="matrix(1, 0.5, 0, 1, 0, 0)" fill="#E0FBFC" stroke="#3A2E2A" strokeWidth="1">
                                <rect x="-30" y="-85" width="10" height="16" />
                                <rect x="-16" y="-85" width="10" height="16" />
                                <rect x="-30" y="-60" width="10" height="16" />
                                <rect x="-16" y="-60" width="10" height="16" />
                                <rect x="-30" y="-35" width="10" height="16" />
                                <rect x="-16" y="-35" width="10" height="16" />
                                <rect x="-24" y="-10" width="16" height="10" fill="#3A2E2A" />
                            </g>
                            <g transform="matrix(1, -0.5, 0, 1, 0, 0)" fill="#E0FBFC" stroke="#3A2E2A" strokeWidth="1">
                                <rect x="6" y="-85" width="10" height="16" />
                                <rect x="20" y="-85" width="10" height="16" />
                                <rect x="6" y="-60" width="10" height="16" />
                                <rect x="20" y="-60" width="10" height="16" />
                                <rect x="6" y="-35" width="10" height="16" />
                                <rect x="20" y="-35" width="10" height="16" />
                            </g>
                        </g>
                        <g opacity="0">
                            <animate attributeName="opacity" begin="6.1s" dur="0.8s" fill="freeze" to="1" />
                            <path d="M 0 -22.5 L 35 -5 L 0 12.5 L -35 -5 Z" fill="url(#grid-cyan)" />
                            <path d="M 0 -18 L 0 -8 L 15 -0.5" fill="none" stroke="#1E3A8A" strokeWidth="1.5" />
                        </g>
                    </g>

                    {/* BUILDING D (Silver→Rust Trace Block) W=25, H=50 */}
                    <g id="bldg-d">
                        <path fill="#C4C6CA" stroke="#4A4E69" strokeWidth="1.5" strokeLinejoin="round" d="M -25 -50 L 0 -37.5 L 0 12.5 L -25 0 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M -25 -2.5 L 0 10 L 0 12.5 L -25 0 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(200,170,150,0.15)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#7C2D12" />
                        </path>
                        <path fill="#A9ABAE" stroke="#4A4E69" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -37.5 L 25 -50 L 25 0 L 0 12.5 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 10 L 25 -2.5 L 25 0 L 0 12.5 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(190,160,140,0.1)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#7C2D12" />
                        </path>
                        <path fill="#E0E2E5" stroke="#4A4E69" strokeWidth="1.5" strokeLinejoin="round" d="M 0 -62.5 L 25 -50 L 0 -37.5 L -25 -50 Z">
                            <animate attributeName="d" begin="5.0s" dur="1.2s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0; 1" to="M 0 -15 L 25 -2.5 L 0 10 L -25 -2.5 Z" />
                            <animate attributeName="fill" begin="5.7s" dur="0.8s" fill="freeze" to="rgba(210,180,160,0.12)" />
                            <animate attributeName="stroke" begin="5.7s" dur="0.8s" fill="freeze" to="#7C2D12" />
                        </path>
                        <g opacity="1">
                            <animate attributeName="opacity" begin="5.2s" dur="0.5s" fill="freeze" to="0" />
                            <g transform="matrix(1, 0.5, 0, 1, 0, 0)" fill="#FFF" stroke="#4A4E69" strokeWidth="1">
                                <rect x="-18" y="-32" width="12" height="12" />
                                <rect x="-18" y="-14" width="12" height="14" fill="#90A4AE" />
                            </g>
                            <g transform="matrix(1, -0.5, 0, 1, 0, 0)" fill="#FFF" stroke="#4A4E69" strokeWidth="1">
                                <rect x="6" y="-32" width="12" height="12" />
                                <rect x="6" y="-14" width="12" height="12" />
                            </g>
                        </g>
                        <g opacity="0">
                            <animate attributeName="opacity" begin="6.1s" dur="0.8s" fill="freeze" to="1" />
                            <path d="M 0 -15 L 25 -2.5 L 0 10 L -25 -2.5 Z" fill="url(#grid-copper)" />
                            <circle cx="0" cy="-2.5" r="2" fill="#7C2D12" />
                        </g>
                    </g>
                </defs>

                {/* Master Camera Group */}
                <g transform="translate(500, 300) scale(1.15)">

                    {/* 3D Ground Platform — warm isometric diamond that fades at transition */}
                    <g opacity="1">
                        <animate attributeName="opacity" begin="5.0s" dur="1.2s" fill="freeze" to="0" />
                        <path d="M 0 200 L 400 0 L 0 -200 L -400 0 Z" fill="#D6C7B5" stroke="#C4B49E" strokeWidth="1.5" strokeLinejoin="round" />
                        {/* Subtle road cross lines for depth */}
                        <polyline points="-300,150 0,0 300,-150" stroke="#C4B49E" strokeWidth="1.5" strokeDasharray="10, 15" fill="none" opacity="0.5" />
                        <polyline points="-300,-150 0,0 300,150" stroke="#C4B49E" strokeWidth="1.5" strokeDasharray="10, 15" fill="none" opacity="0.5" />
                    </g>

                    {/* Dark Circuit Traces — visible after collapse */}
                    <g opacity="0">
                        <animate attributeName="opacity" begin="6.0s" dur="1s" fill="freeze" to="1" />
                        {/* NW-SE arteries — dark navy */}
                        <path d="M -500 -210 L 500 290" fill="none" stroke="#1E3A8A" strokeWidth="2.5" className="flow" filter="url(#glow-subtle)" />
                        <path d="M -500 -200 L 500 300" fill="none" stroke="#1E40AF" strokeWidth="1" opacity="0.6" />
                        <path d="M -500 -190 L 500 310" fill="none" stroke="#1E3A8A" strokeWidth="1.5" className="flow-slow" filter="url(#glow-subtle)" />
                        <path d="M -500 -310 L 500 190" fill="none" stroke="#1E3A8A" strokeWidth="2" className="flow" />
                        <path d="M -500 -300 L 500 200" fill="none" stroke="#1E40AF" strokeWidth="1" opacity="0.6" />
                        {/* NE-SW arteries — dark navy */}
                        <path d="M 500 -210 L -500 290" fill="none" stroke="#1E3A8A" strokeWidth="2" className="flow-rev" filter="url(#glow-subtle)" />
                        <path d="M 500 -200 L -500 300" fill="none" stroke="#1E40AF" strokeWidth="1" opacity="0.6" />
                        <path d="M 500 -190 L -500 310" fill="none" stroke="#1E3A8A" strokeWidth="2.5" className="flow" filter="url(#glow-subtle)" />
                        <path d="M 500 -310 L -500 190" fill="none" stroke="#1E3A8A" strokeWidth="1.5" className="flow-rev" />
                        <path d="M 500 -300 L -500 200" fill="none" stroke="#1E40AF" strokeWidth="1" opacity="0.6" />
                        {/* Subtle ground traces */}
                        <path d="M -240 80 L -180 110 L -120 80 L -60 110" fill="none" stroke="#1E3A8A" strokeWidth="1" opacity="0.5" />
                        <path d="M 240 -80 L 180 -110 L 120 -80 L 60 -110" fill="none" stroke="#991B1B" strokeWidth="1" opacity="0.5" />
                    </g>

                    {/* DENSE CITY GRID */}
                    {/* Row 1 (Back) */}
                    <use href="#bldg-c" x="0" y="-120" />
                    {/* Row 2 */}
                    <use href="#bldg-b" x="-60" y="-90" />
                    <use href="#tree" x="0" y="-95" />
                    <use href="#bldg-b" x="60" y="-90" />
                    {/* Row 3 */}
                    <use href="#bldg-c" x="-120" y="-60" />
                    <use href="#bldg-d" x="0" y="-60" />
                    <use href="#bldg-c" x="120" y="-60" />
                    {/* Row 4 */}
                    <use href="#bldg-b" x="-180" y="-30" />
                    <use href="#bldg-d" x="-60" y="-30" />
                    <use href="#tree" x="-120" y="-35" />
                    <use href="#tree" x="120" y="-35" />
                    <use href="#bldg-c" x="60" y="-30" />
                    <use href="#bldg-d" x="180" y="-30" />
                    {/* Row 5 (Center) */}
                    <use href="#bldg-d" x="-240" y="0" />
                    <use href="#bldg-b" x="-120" y="0" />
                    <use href="#tree" x="-60" y="5" />
                    <use href="#bldg-hero" x="0" y="0" />
                    <use href="#tree" x="60" y="5" />
                    <use href="#bldg-d" x="120" y="0" />
                    <use href="#bldg-b" x="240" y="0" />
                    {/* Row 6 */}
                    <use href="#bldg-c" x="-180" y="30" />
                    <use href="#bldg-b" x="-60" y="30" />
                    <use href="#tree" x="-120" y="25" />
                    <use href="#tree" x="120" y="25" />
                    <use href="#bldg-d" x="60" y="30" />
                    <use href="#bldg-c" x="180" y="30" />
                    {/* Row 7 */}
                    <use href="#bldg-d" x="-120" y="60" />
                    <use href="#bldg-c" x="0" y="60" />
                    <use href="#bldg-b" x="120" y="60" />
                    {/* Row 8 */}
                    <use href="#bldg-b" x="-60" y="90" />
                    <use href="#tree" x="0" y="85" />
                    <use href="#bldg-d" x="60" y="90" />
                    {/* Row 9 (Front) */}
                    <use href="#bldg-c" x="0" y="120" />
                </g>
            </svg>
        </div>
    );
}
