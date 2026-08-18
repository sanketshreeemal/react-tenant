"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/hooks/useAuth";

import Navbar from "../components/landingpage/Navbar";
import HeroSection from "../components/landingpage/HeroSection";
import FeaturesSection from "../components/landingpage/FeaturesSection";
import MetricsSection from "../components/landingpage/MetricsSection";
import CTASection from "../components/landingpage/CTASection";
import Footer from "../components/landingpage/Footer";

export default function Home() {
  const { user, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Show nothing while checking auth to avoid flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is authenticated, they'll be redirected — show nothing
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-full shadow-lg text-sm font-medium">
          {error}
        </div>
      )}
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <MetricsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
