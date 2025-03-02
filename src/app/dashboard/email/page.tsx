"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { getDocumentsWithTimeout } from "../../../lib/firebase/firestoreUtils";
import { Mail, Send, Users, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import logger from "../../../lib/logger";

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  unitNumber: string;
}

export default function EmailNotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<boolean | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<{
    success: boolean | null;
    message: string | null;
  }>({
    success: null,
    message: null,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        logger.info("Fetching tenants for email notifications", {
          component: "EmailNotificationsPage",
          action: "fetchTenants"
        });
        
        const tenantsData = await getDocumentsWithTimeout("tenants");
        const tenantsList = tenantsData.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Tenant[];
        
        setTenants(tenantsList);
        logger.info(`Successfully fetched ${tenantsList.length} tenants`, {
          component: "EmailNotificationsPage",
          action: "fetchTenants"
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        logger.error("Failed to fetch tenants", {
          component: "EmailNotificationsPage",
          action: "fetchTenants",
          error: errorMessage
        });
        setError("Failed to load tenants. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchTenants();
    }
  }, [user]);

  const handleSelectAllTenants = () => {
    if (selectedTenants.length === tenants.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(tenants.map(tenant => tenant.id));
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    if (selectedTenants.includes(tenantId)) {
      setSelectedTenants(selectedTenants.filter(id => id !== tenantId));
    } else {
      setSelectedTenants([...selectedTenants, tenantId]);
    }
  };

  const handleSendEmail = async () => {
    if (selectedTenants.length === 0) {
      setSendError("Please select at least one tenant.");
      return;
    }

    if (!emailSubject.trim()) {
      setSendError("Please enter an email subject.");
      return;
    }

    if (!emailBody.trim()) {
      setSendError("Please enter an email body.");
      return;
    }

    try {
      setIsSending(true);
      setSendSuccess(null);
      setSendError(null);
      
      // Get selected tenant emails
      const selectedTenantEmails = tenants
        .filter(tenant => selectedTenants.includes(tenant.id))
        .map(tenant => tenant.email);
      
      logger.info(`Sending email to ${selectedTenantEmails.length} tenants`, {
        component: "EmailNotificationsPage",
        action: "handleSendEmail",
        additionalInfo: {
          subject: emailSubject,
          recipientCount: selectedTenantEmails.length
        }
      });
      
      // In a real implementation, you would call your API endpoint here
      // For now, we'll simulate a successful API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate API call
      // const response = await fetch('/api/email/send', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     recipients: selectedTenantEmails,
      //     subject: emailSubject,
      //     body: emailBody,
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to send email');
      // }
      
      // const data = await response.json();
      
      setSendSuccess(true);
      logger.info("Email sent successfully", {
        component: "EmailNotificationsPage",
        action: "handleSendEmail"
      });
      
      // Reset form after successful send
      setEmailSubject("");
      setEmailBody("");
      setSelectedTenants([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to send email", {
        component: "EmailNotificationsPage",
        action: "handleSendEmail",
        error: errorMessage
      });
      setSendSuccess(false);
      setSendError("Failed to send email. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    try {
      setIsGeneratingReport(true);
      setReportStatus({
        success: null,
        message: null
      });
      
      logger.info("Generating monthly report", {
        component: "EmailNotificationsPage",
        action: "handleGenerateMonthlyReport"
      });
      
      // In a real implementation, you would call your API endpoint here
      // For now, we'll simulate a successful API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate API call
      // const response = await fetch('/api/email/monthly-report', {
      //   method: 'GET',
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to generate monthly report');
      // }
      
      // const data = await response.json();
      
      setReportStatus({
        success: true,
        message: "Monthly report generated and sent successfully."
      });
      
      logger.info("Monthly report generated and sent successfully", {
        component: "EmailNotificationsPage",
        action: "handleGenerateMonthlyReport"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to generate monthly report", {
        component: "EmailNotificationsPage",
        action: "handleGenerateMonthlyReport",
        error: errorMessage
      });
      
      setReportStatus({
        success: false,
        message: "Failed to generate monthly report. Please try again later."
      });
    } finally {
      setIsGeneratingReport(false);
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
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Email Notifications</h1>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Email Composer */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Compose Email</h2>
            
            {sendSuccess === true && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">Email sent successfully!</p>
                  </div>
                </div>
              </div>
            )}
            
            {sendError && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{sendError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="emailSubject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="emailSubject"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="emailBody" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="emailBody"
                rows={6}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Enter your message here..."
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendEmail}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Monthly Report Generator */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Report</h2>
            
            <p className="text-sm text-gray-600 mb-4">
              Generate and send a monthly summary report to the landlord. This report includes:
            </p>
            
            <ul className="list-disc pl-5 mb-6 text-sm text-gray-600 space-y-1">
              <li>Current vs. expired leases</li>
              <li>Alerts for tenants on expired leases</li>
              <li>Expected rent income for the month</li>
              <li>Occupancy statistics</li>
            </ul>
            
            {reportStatus.success === true && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{reportStatus.message}</p>
                  </div>
                </div>
              </div>
            )}
            
            {reportStatus.success === false && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{reportStatus.message}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerateMonthlyReport}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Generate Monthly Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Tenant Selection */}
        <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Select Recipients</h3>
            <button
              type="button"
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={handleSelectAllTenants}
            >
              {selectedTenants.length === tenants.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mb-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No tenants found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add tenants to send them email notifications.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedTenants.includes(tenant.id)}
                          onChange={() => handleSelectTenant(tenant.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.firstName} {tenant.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{tenant.unitNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{tenant.email}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 