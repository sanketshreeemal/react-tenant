"use client";

import React from 'react';
import Navigation from "../../../components/Navigation";
import { BarChart2 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="md:ml-64 p-4">
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <BarChart2 className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto flex justify-center items-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="text-center">
            <BarChart2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700">Analytics Dashboard is Coming Soon!</h2>
            <p className="text-gray-500 mt-2">We're working hard to bring you insightful data and reports.</p>
          </div>
        </main>
      </div>
    </div>
  );
} 