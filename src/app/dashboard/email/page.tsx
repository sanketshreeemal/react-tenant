"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { getDocumentsWithTimeout } from "../../../lib/firebase/firestoreUtils";
import { Mail, Send, Users, AlertTriangle, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import logger from "../../../lib/logger";
import { Button } from "../../../components/ui/button";
import { theme } from "../../../theme/theme";
import { AlertMessage } from "../../../components/ui/alert-message";
import { sendTransactionalEmail, generateMonthlyReport, addAdminRecipient, removeAdminRecipient, getAdminRecipients } from '../../../lib/services/emailService';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  unitNumber: string;
}

interface AdminRecipient {
  id?: string;
  name: string;
  email: string;
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
  const [adminRecipients, setAdminRecipients] = useState<AdminRecipient[]>([]);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchAdminRecipients = async () => {
      try {
        const recipients = await getAdminRecipients();
        setAdminRecipients(recipients);
      } catch (error) {
        logger.error('Failed to fetch admin recipients', {
          component: 'EmailNotificationsPage',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    if (user) {
      fetchAdminRecipients();
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
      
      // Send email to each selected tenant
      await Promise.all(selectedTenantEmails.map(email => 
        sendTransactionalEmail({
          type: 'custom_email',
          data: {
            subject: emailSubject,
            message: emailBody
          },
          recipientEmail: email
        })
      ));
      
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

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecipientError(null);

    if (!newRecipientName.trim() || !newRecipientEmail.trim()) {
      setRecipientError('Please fill in both name and email');
      return;
    }

    try {
      const newRecipient = await addAdminRecipient({
        name: newRecipientName,
        email: newRecipientEmail
      });

      setAdminRecipients([...adminRecipients, newRecipient]);
      setNewRecipientName('');
      setNewRecipientEmail('');
    } catch (error) {
      setRecipientError('Failed to add recipient. Please try again.');
    }
  };

  const handleRemoveRecipient = async (recipientId: string) => {
    try {
      await removeAdminRecipient(recipientId);
      setAdminRecipients(adminRecipients.filter(r => r.id !== recipientId));
    } catch (error) {
      logger.error('Failed to remove admin recipient', {
        component: 'EmailNotificationsPage',
        recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleGenerateMonthlyReport = async () => {
    try {
      setIsGeneratingReport(true);
      setReportStatus({
        success: null,
        message: null
      });
      
      if (adminRecipients.length === 0) {
        throw new Error('Please add at least one admin recipient to receive reports');
      }
      
      logger.info("Generating monthly report", {
        component: "EmailNotificationsPage",
        action: "handleGenerateMonthlyReport"
      });
      
      await generateMonthlyReport();
      
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
        message: errorMessage
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
              <AlertMessage
                variant="success"
                message="Email sent successfully!"
              />
            )}
            
            {sendError && (
              <AlertMessage
                variant="error"
                message={sendError}
              />
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
              <Button
                variant="default"
                size="default"
                onClick={handleSendEmail}
                disabled={isSending}
                className="bg-theme-primary hover:bg-theme-primary/90"
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
              </Button>
            </div>
          </div>
          
          {/* Admin Recipients Management */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Recipients</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add email addresses of administrators who should receive monthly reports and important notifications.
            </p>

            {recipientError && (
              <AlertMessage
                variant="error"
                message={recipientError}
              />
            )}

            <form onSubmit={handleAddRecipient} className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="recipientName"
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="recipientEmail"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  className="w-full bg-theme-primary hover:bg-theme-primary/90"
                >
                  Add Recipient
                </Button>
              </div>
            </form>

            <div className="divide-y divide-gray-200">
              {adminRecipients.map((recipient) => (
                <div key={recipient.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{recipient.name}</p>
                    <p className="text-sm text-gray-500">{recipient.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => recipient.id && handleRemoveRecipient(recipient.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {adminRecipients.length === 0 && (
                <p className="py-4 text-sm text-gray-500 text-center">
                  No recipients added yet
                </p>
              )}
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
            
            {reportStatus.success === true && reportStatus.message && (
              <AlertMessage
                variant="success"
                message={reportStatus.message}
              />
            )}
            
            {reportStatus.success === false && reportStatus.message && (
              <AlertMessage
                variant="error"
                message={reportStatus.message}
              />
            )}
            
            <div className="flex justify-end">
              <Button
                variant="default"
                size="default"
                onClick={handleGenerateMonthlyReport}
                disabled={isGeneratingReport}
                className="bg-theme-primary hover:bg-theme-primary/90"
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
              </Button>
            </div>
          </div>
        </div>
        
        {/* Tenant Selection */}
        <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Select Recipients</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllTenants}
              className="border-theme-secondary text-theme-text-primary hover:bg-theme-surface"
            >
              {selectedTenants.length === tenants.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          
          {error && (
            <AlertMessage
              variant="error"
              message={error}
            />
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