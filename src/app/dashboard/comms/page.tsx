"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, addDoc, query, orderBy, getDocs, Timestamp, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { Mail, Send, Check, AlertTriangle, Users } from "lucide-react";
import { getAllActiveLeases } from "../../../lib/firebase/firestoreUtils";
import { Lease as FirebaseLease } from "../../../types";
import { AlertMessage } from "@/components/ui/alert-message";
import { useLandlordId } from '../../../lib/hooks/useLandlordId';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Define a local Lease interface that matches our component needs
interface Lease {
  id: string;
  unitId: string;
  unitNumber: string;
  tenantName: string;
  email: string;
  rentAmount: number;
  isActive: boolean;
  leaseStartDate: Date;
  leaseEndDate: Date;
}

interface AllUser {
  uid: string;
  name?: string;
  email: string;
  landlordId: string;
  role: 'admin' | 'user' | 'tenant';
  updatedAt: Date;
}

interface EmailMessage {
  id: string;
  recipients: string[];
  subject: string;
  content: string;
  sentAt: any;
  status: "sent" | "failed" | "pending";
  landlordId?: string;
}

interface EmailResponse {
  success: boolean;
  error?: string;
}

export default function CommunicationPage() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordLoading } = useLandlordId();
  const router = useRouter();
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<AllUser[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("tenants");
  const itemsPerPage = 10;

  // Email templates
  const messageTemplates = [
    {
      name: "Rent Reminder",
      subject: "Rent Payment Reminder",
      content: "Dear tenant, this is a friendly reminder that your rent payment of ₹{rentAmount} is due on the 1st of next month. Please ensure timely payment to avoid late fees. Thank you!"
    },
    {
      name: "Maintenance Visit",
      subject: "Scheduled Maintenance Visit",
      content: "Dear tenant, we will be conducting routine maintenance in your unit (Unit {unitNumber}) next week. We'll contact you to schedule a convenient time. Thank you for your cooperation."
    },
    {
      name: "Lease Renewal",
      subject: "Lease Renewal Notice",
      content: "Dear tenant, your lease agreement for Unit {unitNumber} will expire on {leaseEndDate}. Please contact us if you wish to renew your lease. We value you as our tenant and hope to continue our relationship."
    }
  ];

  // First useEffect to handle authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Separate useEffect for data fetching
  useEffect(() => {
    const initializeData = async () => {
      if (!landlordLoading && landlordId && !isLoading && activeLeases.length === 0 && authorizedUsers.length === 0) {
        try {
          setIsLoading(true);
          setStatusMessage({ type: "", message: "" });

          // Fetch active leases
          const firebaseLeases = await getAllActiveLeases(landlordId);
          const leases: Lease[] = firebaseLeases
            .filter(lease => {
              if (!lease.id || !lease.unitId || !lease.unitNumber || !lease.tenantName || !lease.email) {
                console.warn('Incomplete lease data:', lease);
                return false;
              }
              return true;
            })
            .map(lease => ({
              id: lease.id || '',
              unitId: lease.unitId,
              unitNumber: lease.unitNumber,
              tenantName: lease.tenantName,
              email: lease.email,
              rentAmount: lease.rentAmount || 0,
              isActive: lease.isActive,
              leaseStartDate: lease.leaseStartDate || new Date(),
              leaseEndDate: lease.leaseEndDate || new Date()
            }));

          setActiveLeases(leases);

          // Fetch authorized users
          const allUsersCollectionRef = collection(db, 'allUsers');
          const usersQuery = query(allUsersCollectionRef, where('landlordId', '==', landlordId));
          const usersSnapshot = await getDocs(usersQuery);
          const usersList = usersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          })) as AllUser[];
          setAuthorizedUsers(usersList);
          
          // Fetch messages
          const messagesCollection = collection(db, `landlords/${landlordId}/emails`);
          const messagesQuery = query(
            messagesCollection,
            orderBy("sentAt", "desc")
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          
          const messagesData: EmailMessage[] = [];
          messagesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.recipients || !data.subject || !data.content) {
              console.warn('Incomplete message data:', data);
              return;
            }
            
            messagesData.push({ 
              id: doc.id,
              recipients: data.recipients,
              subject: data.subject,
              content: data.content,
              sentAt: data.sentAt instanceof Timestamp 
                ? data.sentAt.toDate() 
                : new Date(data.sentAt || Date.now()),
              status: data.status || 'pending'
            });
          });
          
          setMessages(messagesData);
        } catch (error) {
          console.error("Error fetching data:", error);
          setStatusMessage({ 
            type: "error", 
            message: "Failed to load data. Please refresh the page to try again." 
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeData();
  }, [landlordId, landlordLoading, isLoading]);

  const getRecipientId = (item: Lease | AllUser): string => {
    if ('uid' in item) {
      return item.uid || '';
    }
    if ('id' in item) {
      return item.id || '';
    }
    return '';
  };

  const getCurrentPageData = () => {
    const data = activeTab === "tenants" ? activeLeases : authorizedUsers;
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return data.slice(startIdx, endIdx);
  };

  const getCurrentPageTenants = () => {
    if (activeTab !== "tenants") return [];
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return activeLeases.slice(startIdx, endIdx);
  };

  const getCurrentPageUsers = () => {
    if (activeTab !== "users") return [];
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return authorizedUsers.slice(startIdx, endIdx);
  };

  const handleSelectAll = () => {
    const currentData = getCurrentPageData();
    const currentIds = currentData.map(item => 
      activeTab === "tenants" ? (item as Lease).id : (item as AllUser).uid
    );
    
    if (selectedRecipients.length === currentIds.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(currentIds);
    }
  };

  const handleSelectRecipient = (recipientId: string) => {
    if (selectedRecipients.includes(recipientId)) {
      setSelectedRecipients(selectedRecipients.filter(id => id !== recipientId));
    } else {
      setSelectedRecipients([...selectedRecipients, recipientId]);
    }
  };

  const handleTemplateSelect = (template: typeof messageTemplates[0]) => {
    let processedContent = template.content;
    let processedSubject = template.subject;
    
    if (selectedRecipients.length > 0 && activeTab === "tenants") {
      const selectedLease = activeLeases.find(lease => lease.id === selectedRecipients[0]);
      if (selectedLease) {
        processedContent = processedContent
          .replace("{unitNumber}", selectedLease.unitNumber)
          .replace("{rentAmount}", selectedLease.rentAmount.toLocaleString())
          .replace("{leaseEndDate}", selectedLease.leaseEndDate.toLocaleDateString());
      }
    }
    
    setMessageContent(processedContent);
    setSubject(processedSubject);
  };

  const handleSendEmail = async () => {
    if (messageContent.trim() === "" || subject.trim() === "") {
      setStatusMessage({ type: "error", message: "Please enter both subject and message content" });
      return;
    }

    if (selectedRecipients.length === 0) {
      setStatusMessage({ type: "error", message: "Please select at least one recipient" });
      return;
    }

    setIsSending(true);
    setStatusMessage({ type: "", message: "" });

    try {
      // Get email addresses of selected recipients
      const selectedEmails = activeTab === "tenants"
        ? activeLeases
            .filter(lease => selectedRecipients.includes(lease.id))
            .map(lease => lease.email)
        : authorizedUsers
            .filter(user => selectedRecipients.includes(user.uid))
            .map(user => user.email);
      
      // Record email in Firebase for history
      const emailData: Partial<EmailMessage> = {
        recipients: selectedEmails,
        subject: subject,
        content: messageContent,
        sentAt: new Date(),
        status: "pending",
        landlordId: landlordId
      };
      
      // Call the email API route to send emails
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedEmails,
          subject: subject,
          html: messageContent
        })
      });
      
      const result: EmailResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }
      
      // Update email status based on API response
      emailData.status = result.success ? "sent" : "failed";
      
      // Add to Firebase for email history
      const docRef = await addDoc(collection(db, `landlords/${landlordId}/emails`), emailData);
      
      // Add the new email to our state
      setMessages([
        { 
          ...emailData as EmailMessage,
          id: docRef.id
        },
        ...messages
      ]);

      setStatusMessage({ type: "success", message: "Email sent successfully!" });
      setMessageContent("");
      setSubject("");
      setSelectedRecipients([]);
    } catch (error: any) {
      console.error("Error sending email:", error);
      setStatusMessage({ type: "error", message: error.message || "Failed to send email. Please try again." });
      
      // Add failed email to history
      if (landlordId) {
        const failedEmailData = {
          recipients: activeTab === "tenants"
            ? activeLeases
                .filter(lease => selectedRecipients.includes(lease.id))
                .map(lease => lease.email)
            : authorizedUsers
                .filter(user => selectedRecipients.includes(user.uid))
                .map(user => user.email),
          subject: subject,
          content: messageContent,
          sentAt: new Date(),
          status: "failed" as const,
          landlordId: landlordId
        };
        
        const docRef = await addDoc(collection(db, `landlords/${landlordId}/emails`), failedEmailData);
        
        // Add the failed email to our state
        setMessages([
          { 
            ...failedEmailData,
            id: docRef.id
          },
          ...messages
        ]);
      }
    } finally {
      setIsSending(false);
    }
  };

  const totalPages = Math.ceil(
    (activeTab === "tenants" ? activeLeases.length : authorizedUsers.length) / itemsPerPage
  );

  if (authLoading || landlordLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="md:ml-64 p-4">
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Email Communications</h1>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 gap-6">
            {/* Top Half: Recipient Selection */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tenants">Tenants</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tenants" className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Select Tenants</h2>
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {selectedRecipients.length === getCurrentPageData().length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    {isLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : activeLeases.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Select
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Unit Number
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Tenant Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Expected Rent
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {getCurrentPageTenants().map((lease) => (
                                <tr key={lease.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      checked={selectedRecipients.includes(lease.id)}
                                      onChange={() => handleSelectRecipient(lease.id)}
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{lease.unitNumber}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{lease.tenantName}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{lease.email}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">₹{lease.rentAmount.toLocaleString()}</div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between items-center px-6 py-3 bg-gray-50">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-1 rounded-md ${
                              currentPage === 1
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1 rounded-md ${
                              currentPage === totalPages
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64">
                        <Users className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No active leases</h3>
                        <p className="text-gray-500">
                          Add tenants with active leases to send emails
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="users" className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Select Users</h2>
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {selectedRecipients.length === getCurrentPageData().length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    {isLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : authorizedUsers.length > 0 ? (
                      <>
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
                                  Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Role
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {getCurrentPageUsers().map((user) => (
                                <tr key={user.uid} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      checked={selectedRecipients.includes(user.uid)}
                                      onChange={() => handleSelectRecipient(user.uid)}
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 capitalize">{user.role}</div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between items-center px-6 py-3 bg-gray-50">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-1 rounded-md ${
                              currentPage === 1
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1 rounded-md ${
                              currentPage === totalPages
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64">
                        <Users className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
                        <p className="text-gray-500">
                          Add users from the Manage Users section
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            {/* Bottom Half: Message Composer and Templates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side: Message Templates */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Email Templates</h2>
                </div>
                <div className="p-4">
                  <ul className="space-y-2">
                    {messageTemplates.map((template, index) => (
                      <li key={index}>
                        <button
                          onClick={() => handleTemplateSelect(template)}
                          className="w-full text-left p-3 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-sm text-gray-500 truncate">{template.content.substring(0, 60)}...</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Right Side: Email Composer */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Compose Email</h2>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                      Message
                    </label>
                    <textarea
                      id="content"
                      rows={6}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Type your message here..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                    ></textarea>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-gray-500">
                        {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <button
                      onClick={handleSendEmail}
                      disabled={isSending || selectedRecipients.length === 0 || messageContent.trim() === "" || subject.trim() === ""}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        isSending || selectedRecipients.length === 0 || messageContent.trim() === "" || subject.trim() === ""
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      }`}
                    >
                      {isSending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
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
                  
                  {statusMessage.message && (
                    <AlertMessage
                      variant={statusMessage.type === "error" ? "error" : "success"}
                      message={statusMessage.message}
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Email History */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">Email History</h2>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length > 0 ? (
                <div className="overflow-y-auto max-h-96">
                  <ul className="divide-y divide-gray-200">
                    {messages.map((message) => (
                      <li key={message.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-0.5">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                Sent to {message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''}
                              </p>
                              <p className="text-sm text-gray-500">
                                {message.sentAt instanceof Date 
                                  ? message.sentAt.toLocaleString() 
                                  : new Date(message.sentAt?.seconds * 1000).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {message.subject}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {message.content}
                            </p>
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                message.status === "sent" 
                                  ? "bg-green-100 text-green-800" 
                                  : message.status === "pending" 
                                    ? "bg-yellow-100 text-yellow-800" 
                                    : "bg-red-100 text-red-800"
                              }`}>
                                {message.status === "sent" && <Check className="h-3 w-3 mr-1" />}
                                {message.status === "pending" && <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-yellow-800 mr-1"></div>}
                                {message.status === "failed" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <Mail className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No emails sent yet</h3>
                  <p className="text-gray-500">
                    Your sent emails will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}