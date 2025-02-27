"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/hooks/useAuth";
import SignInWithGoogle from "../components/SignInWithGoogle";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">
          Tenant Management System
        </h1>
        <p className="text-xl mb-8 text-center text-gray-600 max-w-2xl">
          A comprehensive system for managing tenants, leases, and rent payments
        </p>
        
        <div className="mb-8">
          <SignInWithGoogle />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full max-w-4xl">
          <FeatureCard 
            title="Tenant Management" 
            description="Easily manage tenant information, contact details, and documents."
            icon="👥"
          />
          <FeatureCard 
            title="Lease Tracking" 
            description="Keep track of lease agreements, start and end dates, and renewals."
            icon="📝"
          />
          <FeatureCard 
            title="Rent Collection" 
            description="Monitor rent payments, due dates, and payment history."
            icon="💰"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
