"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { MessageSquare, Send, Check, AlertTriangle, Users } from "lucide-react";

interface Lease {
  id: string;
  tenantId: string;
  unitNumber: string;
  tenantName: string;
  isActive: boolean;
}

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  unitNumber: string;
}

interface Message {
  id: string;
  recipients: string[];
  content: string;
  sentAt: any;
  status: "sent" | "failed" | "pending";
}

export default function WhatsAppPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageContent, setMessageContent] = useState("");
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });

  // Message templates
  const messageTemplates = [
    {
      name: "Rent Reminder",
      content: "Dear tenant, this is a friendly reminder that your rent payment is due on the 1st of next month. Please ensure timely payment to avoid late fees. Thank you!"
    },
    {
      name: "Maintenance Visit",
      content: "Dear tenant, we will be conducting routine maintenance in your unit next week. We'll contact you to schedule a convenient time. Thank you for your cooperation."
    },
    {
      name: "Lease Renewal",
      content: "Dear tenant, your lease agreement will expire soon. Please contact us if you wish to renew your lease. We value you as our tenant and hope to continue our relationship."
    }
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch active leases
      const leasesQuery = query(
        collection(db, "leases"),
        where("isActive", "==", true),
        orderBy("unitNumber")
      );
      const leasesSnapshot = await getDocs(leasesQuery);
      
      const leasesData: Lease[] = [];
      leasesSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        leasesData.push({ id: doc.id, ...doc.data() } as Lease);
      });
      
      setActiveLeases(leasesData);
      
      // Fetch tenants with active leases
      const tenantIds = leasesData.map(lease => lease.tenantId);
      
      if (tenantIds.length > 0) {
        const tenantsData: Tenant[] = [];
        
        // Firebase doesn't support array contains with more than 10 items
        // So we might need to batch our queries
        const batchSize = 10;
        for (let i = 0; i < tenantIds.length; i += batchSize) {
          const batch = tenantIds.slice(i, i + batchSize);
          const tenantsQuery = query(
            collection(db, "tenants"),
            where("id", "in", batch)
          );
          const tenantsSnapshot = await getDocs(tenantsQuery);
          
          tenantsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            tenantsData.push({ id: doc.id, ...doc.data() } as Tenant);
          });
        }
        
        setTenants(tenantsData);
      }
      
      // Fetch recent messages
      const messagesQuery = query(
        collection(db, "messages"),
        orderBy("sentAt", "desc")
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messagesData: Message[] = [];
      messagesSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message);
      });
      
      setMessages(messagesData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  const handleSelectAllTenants = () => {
    if (selectedTenants.length === tenants.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(tenants.map((tenant: Tenant) => tenant.id));
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    if (selectedTenants.includes(tenantId)) {
      setSelectedTenants(selectedTenants.filter((id: string) => id !== tenantId));
    } else {
      setSelectedTenants([...selectedTenants, tenantId]);
    }
  };

  const handleTemplateSelect = (content: string) => {
    setMessageContent(content);
  };

  const handleSendMessage = async () => {
    if (messageContent.trim() === "") {
      setStatusMessage({ type: "error", message: "Please enter a message" });
      return;
    }

    if (selectedTenants.length === 0) {
      setStatusMessage({ type: "error", message: "Please select at least one tenant" });
      return;
    }

    setIsSending(true);
    setStatusMessage({ type: "", message: "" });

    try {
      // Get phone numbers of selected tenants
      const recipients = tenants
        .filter((tenant: Tenant) => selectedTenants.includes(tenant.id))
        .map((tenant: Tenant) => tenant.phone);

      // In a real app, this would integrate with WhatsApp Business API
      // For now, we'll just simulate sending by adding to our messages collection
      const messageData = {
        recipients,
        content: messageContent,
        sentAt: serverTimestamp(),
        status: "sent" // In a real app, this would initially be "pending"
      };

      const docRef = await addDoc(collection(db, "messages"), messageData);
      
      // Add the new message to our state
      setMessages([
        { 
          id: docRef.id, 
          ...messageData, 
          sentAt: new Date() // Use current date for UI since serverTimestamp isn't available yet
        } as Message,
        ...messages
      ]);

      setMessageContent("");
      setStatusMessage({ type: "success", message: "Message sent successfully!" });
      
      // In a real app, you would update the status based on the API response
    } catch (error) {
      console.error("Error sending message:", error);
      setStatusMessage({ type: "error", message: "Failed to send message. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  if (loading || !user) {
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
              <MessageSquare className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">WhatsApp Messaging</h1>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tenant Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Select Recipients</h2>
                  <button
                    onClick={handleSelectAllTenants}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedTenants.length === tenants.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : tenants.length > 0 ? (
                  <div className="overflow-y-auto max-h-96">
                    <ul className="divide-y divide-gray-200">
                      {tenants.map((tenant: Tenant) => (
                        <li key={tenant.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedTenants.includes(tenant.id)}
                              onChange={() => handleSelectTenant(tenant.id)}
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {tenant.firstName} {tenant.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                Unit: {tenant.unitNumber} | {tenant.phone}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Users className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No active tenants</h3>
                    <p className="text-gray-500">
                      Add tenants with active leases to send messages
                    </p>
                  </div>
                )}
              </div>
              
              {/* Message Templates */}
              <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Message Templates</h2>
                </div>
                <div className="p-4">
                  <ul className="space-y-2">
                    {messageTemplates.map((template, index) => (
                      <li key={index}>
                        <button
                          onClick={() => handleTemplateSelect(template.content)}
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
            </div>
            
            {/* Message Composer and History */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Compose Message</h2>
                </div>
                <div className="p-4">
                  <textarea
                    rows={6}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Type your message here..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                  ></textarea>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-gray-500">
                        {selectedTenants.length} recipient{selectedTenants.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || selectedTenants.length === 0 || messageContent.trim() === ""}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        isSending || selectedTenants.length === 0 || messageContent.trim() === ""
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
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                  
                  {statusMessage.message && (
                    <div className={`mt-4 p-3 rounded-md ${
                      statusMessage.type === "error" 
                        ? "bg-red-50 text-red-800" 
                        : "bg-green-50 text-green-800"
                    }`}>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {statusMessage.type === "error" ? (
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                          ) : (
                            <Check className="h-5 w-5 text-green-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">
                            {statusMessage.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Message History */}
              <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Message History</h2>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : messages.length > 0 ? (
                  <div className="overflow-y-auto max-h-96">
                    <ul className="divide-y divide-gray-200">
                      {messages.map((message: Message) => (
                        <li key={message.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                              <MessageSquare className="h-5 w-5 text-gray-400" />
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
                    <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No messages yet</h3>
                    <p className="text-gray-500">
                      Your sent messages will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 