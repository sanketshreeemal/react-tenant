"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { testFirebaseConnections } from "../../../lib/firebase/testConnection";

export default function TestFirebasePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [testResults, setTestResults] = useState<{
    firestore: boolean | null;
    storage: boolean | null;
    apiTest: boolean | null;
    error?: string;
  }>({
    firestore: null,
    storage: null,
    apiTest: null
  });
  const [isTesting, setIsTesting] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const runClientTests = async () => {
    setIsTesting(true);
    setTestResults({
      firestore: null,
      storage: null,
      apiTest: null
    });
    
    try {
      // Run client-side tests
      const results = await testFirebaseConnections();
      setTestResults(prev => ({
        ...prev,
        firestore: results.firestore,
        storage: results.storage
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        firestore: false,
        storage: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }));
    } finally {
      setIsTesting(false);
    }
  };

  const runApiTest = async () => {
    setIsTesting(true);
    setApiResponse(null);
    setTestResults(prev => ({
      ...prev,
      apiTest: null
    }));
    
    try {
      const response = await fetch('/api/test-firebase');
      const data = await response.json();
      setApiResponse(data);
      setTestResults(prev => ({
        ...prev,
        apiTest: data.allPassed
      }));
    } catch (error) {
      setApiResponse({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
      setTestResults(prev => ({
        ...prev,
        apiTest: false
      }));
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="md:ml-64 p-4">
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Firebase Connection Test</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Test Firebase Connectivity</h2>
              <p className="text-gray-600 mb-4">
                This page allows you to test the connection to Firebase services. Click the buttons below to run the tests.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <button
                  onClick={runClientTests}
                  disabled={isTesting}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    isTesting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isTesting ? "Testing..." : "Run Client-Side Tests"}
                </button>
                
                <button
                  onClick={runApiTest}
                  disabled={isTesting}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    isTesting ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isTesting ? "Testing..." : "Run API Tests"}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Client-Side Test Results</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-32">Firestore:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      testResults.firestore === null
                        ? "bg-gray-100 text-gray-800"
                        : testResults.firestore
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {testResults.firestore === null
                        ? "Not Tested"
                        : testResults.firestore
                        ? "Connected"
                        : "Failed"}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-32">Storage:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      testResults.storage === null
                        ? "bg-gray-100 text-gray-800"
                        : testResults.storage
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {testResults.storage === null
                        ? "Not Tested"
                        : testResults.storage
                        ? "Connected"
                        : "Failed"}
                    </span>
                  </div>
                </div>
                
                {testResults.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{testResults.error}</p>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-3">API Test Results</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-32">API Test:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      testResults.apiTest === null
                        ? "bg-gray-100 text-gray-800"
                        : testResults.apiTest
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {testResults.apiTest === null
                        ? "Not Tested"
                        : testResults.apiTest
                        ? "Success"
                        : "Failed"}
                    </span>
                  </div>
                </div>
                
                {apiResponse && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">API Response:</h4>
                    <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto max-h-60">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <Link
                href="/dashboard/tenants/add"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Go to Add Tenant Page
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 