"use client";

import React from "react";
import Navigation from "../../../components/Navigation"; // Assuming Navigation is needed

export default function AnalyticsPagePlaceholder() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="md:ml-64 p-4">
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow min-h-[300px] flex flex-col justify-center items-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Under Construction</h2>
            <p className="text-gray-600 text-center">
              This analytics page is currently being built and will be shipped soon.
              <br />
              We are working hard to bring you insightful data visualizations!
            </p>
            {/* You can add an icon or a simple graphic here if you like */}
          </div>
        </main>
      </div>
    </div>
  );
} 