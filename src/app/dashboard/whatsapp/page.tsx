"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, addDoc, query, orderBy, getDocs, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { MessageSquare, Send, Check, AlertTriangle, Users } from "lucide-react";
import { getAllActiveLeases } from "../../../lib/firebase/firestoreUtils";
import { Lease as FirebaseLease } from "../../../types";
import { AlertMessage } from "@/components/ui/alert-message";

// Define a local Lease interface that matches our component needs
interface Lease {
  id: string;
  unitId: string;
  unitNumber: string;
  tenantName: string;
  countryCode: string;
  phoneNumber: string;
  email: string;
  rentAmount: number;
  isActive: boolean;
  leaseStartDate: Date;
  leaseEndDate: Date;
}

interface Message {
  id: string;
  recipients: string[];
  content: string;
  sentAt: any;
  status: "sent" | "failed" | "pending";
  messageId?: string;
}

interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  totalSent?: number;
  totalFailed?: number;
}

export default function WhatsAppPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageContent, setMessageContent] = useState("");
  const [selectedLeases, setSelectedLeases] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });

  // Message templates
  const messageTemplates = [
    {
      name: "Rent Reminder",
      content: "Dear tenant, this is a friendly reminder that your rent payment of ₹{rentAmount} is due on the 1st of next month. Please ensure timely payment to avoid late fees. Thank you!"
    },
    {
      name: "Maintenance Visit",
      content: "Dear tenant, we will be conducting routine maintenance in your unit (Unit {unitNumber}) next week. We'll contact you to schedule a convenient time. Thank you for your cooperation."
    },
    {
      name: "Lease Renewal",
      content: "Dear tenant, your lease agreement for Unit {unitNumber} will expire on {leaseEndDate}. Please contact us if you wish to renew your lease. We value you as our tenant and hope to continue our relationship."
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
      
      // Fetch active leases using the firestoreUtils function
      const firebaseLeases = await getAllActiveLeases();
      
      // Convert Firebase leases to our local Lease type
      const leases: Lease[] = firebaseLeases.map(lease => ({
        id: lease.id || '',
        unitId: lease.unitId,
        unitNumber: lease.unitNumber,
        tenantName: lease.tenantName,
        countryCode: lease.countryCode,
        phoneNumber: lease.phoneNumber,
        email: lease.email,
        rentAmount: lease.rentAmount,
        isActive: lease.isActive,
        leaseStartDate: lease.leaseStartDate,
        leaseEndDate: lease.leaseEndDate
      }));
      
      setActiveLeases(leases);
      
      // Fetch recent messages
      const messagesCollection = collection(db, "messages");
      const messagesQuery = query(
        messagesCollection,
        orderBy("sentAt", "desc")
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messagesData: Message[] = [];
      messagesSnapshot.forEach((doc) => {
        const data = doc.data();
        messagesData.push({ 
          id: doc.id, 
          ...data,
          sentAt: data.sentAt instanceof Timestamp 
            ? data.sentAt.toDate() 
            : new Date(data.sentAt)
        } as Message);
      });
      
      setMessages(messagesData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  const handleSelectAllLeases = () => {
    if (selectedLeases.length === activeLeases.length) {
      setSelectedLeases([]);
    } else {
      setSelectedLeases(activeLeases.map(lease => lease.id));
    }
  };

  const handleSelectLease = (leaseId: string) => {
    if (selectedLeases.includes(leaseId)) {
      setSelectedLeases(selectedLeases.filter(id => id !== leaseId));
    } else {
      setSelectedLeases([...selectedLeases, leaseId]);
    }
  };

  const handleTemplateSelect = (content: string) => {
    let processedContent = content;
    
    // If any tenant is selected, use the first selected tenant to populate the template
    if (selectedLeases.length > 0) {
      const selectedLease = activeLeases.find(lease => lease.id === selectedLeases[0]);
      if (selectedLease) {
        processedContent = processedContent
          .replace("{unitNumber}", selectedLease.unitNumber)
          .replace("{rentAmount}", selectedLease.rentAmount.toLocaleString())
          .replace("{leaseEndDate}", selectedLease.leaseEndDate.toLocaleDateString());
      }
    }
    
    setMessageContent(processedContent);
  };

  const handleSendMessage = async () => {
    if (messageContent.trim() === "") {
      setStatusMessage({ type: "error", message: "Please enter a message" });
      return;
    }

    if (selectedLeases.length === 0) {
      setStatusMessage({ type: "error", message: "Please select at least one tenant" });
      return;
    }

    setIsSending(true);
    setStatusMessage({ type: "", message: "" });

    try {
      // Get phone numbers of selected tenants
      const selectedPhoneNumbers = activeLeases
        .filter(lease => selectedLeases.includes(lease.id))
        .map(lease => `${lease.countryCode}${lease.phoneNumber}`);
      
      // Record message in Firebase for history
      const messageData: Partial<Message> = {
        recipients: selectedPhoneNumbers,
        content: messageContent,
        sentAt: new Date(),
        status: "pending" // Will be updated with actual status
      };
      
      // Call the WhatsApp API route to send messages
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: selectedPhoneNumbers,
          message: messageContent
        })
      });
      
      const result: MessageResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      
      // Update message status based on API response
      messageData.status = result.success ? "sent" : "failed";
      
      // Add messageId if available (for status checking)
      if (result.messageId) {
        messageData.messageId = result.messageId;
      }
      
      // Add to Firebase for message history
      const docRef = await addDoc(collection(db, "messages"), messageData);
      
      // Add the new message to our state
      setMessages([
        { 
          id: docRef.id, 
          ...messageData
        } as Message,
        ...messages
      ]);

      // Show success message with stats if it's a bulk send
      if (result.totalSent !== undefined && result.totalFailed !== undefined) {
        setStatusMessage({ 
          type: "success", 
          message: `Message sent! ${result.totalSent} delivered, ${result.totalFailed} failed.`
        });
      } else {
        setStatusMessage({ type: "success", message: "Message sent successfully!" });
      }
      
      setMessageContent("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      setStatusMessage({ type: "error", message: error.message || "Failed to send message. Please try again." });
      
      // Add failed message to history
      const failedMessageData = {
        recipients: activeLeases
          .filter(lease => selectedLeases.includes(lease.id))
          .map(lease => `${lease.countryCode}${lease.phoneNumber}`),
        content: messageContent,
        sentAt: new Date(),
        status: "failed"
      };
      
      const docRef = await addDoc(collection(db, "messages"), failedMessageData);
      
      // Add the failed message to our state
      setMessages([
        { 
          id: docRef.id, 
          ...failedMessageData
        } as Message,
        ...messages
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckMessageStatus = async (messageId: string, whatsappMessageId?: string) => {
    if (!whatsappMessageId) return;
    
    try {
      // Call the status API endpoint
      const response = await fetch(`/api/whatsapp/status?messageId=${whatsappMessageId}`);
      const result = await response.json();
      
      if (result.success && result.status) {
        // Update the message status in Firebase
        const messageRef = doc(db, "messages", messageId);
        await updateDoc(messageRef, {
          status: result.status === 'failed' ? 'failed' : 'sent', // Simplify statuses for UI
          lastChecked: new Date()
        });
        
        // Update the message in the local state
        setMessages(messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: result.status === 'failed' ? 'failed' : 'sent' } 
            : msg
        ));
        
        // Show status message
        setStatusMessage({ 
          type: "success", 
          message: `Message status updated: ${result.status}` 
        });
        
        // Clear status message after 3 seconds
        setTimeout(() => {
          setStatusMessage({ type: "", message: "" });
        }, 3000);
      }
    } catch (error: any) {
      console.error("Error checking message status:", error);
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
          <div className="grid grid-cols-1 gap-6">
            {/* Top Half: Recipient Selection */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Select Recipients</h2>
                <button
                  onClick={handleSelectAllLeases}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedLeases.length === activeLeases.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : activeLeases.length > 0 ? (
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
                          Phone Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Rent
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeLeases.map((lease) => (
                        <tr key={lease.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedLeases.includes(lease.id)}
                              onChange={() => handleSelectLease(lease.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{lease.unitNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{lease.tenantName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{lease.countryCode} {lease.phoneNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">₹{lease.rentAmount.toLocaleString()}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <Users className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No active leases</h3>
                  <p className="text-gray-500">
                    Add tenants with active leases to send messages
                  </p>
                </div>
              )}
            </div>
            
            {/* Bottom Half: Message Composer and Templates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side: Message Templates */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
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
              
              {/* Right Side: Message Composer */}
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
                        {selectedLeases.length} recipient{selectedLeases.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || selectedLeases.length === 0 || messageContent.trim() === ""}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        isSending || selectedLeases.length === 0 || messageContent.trim() === ""
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
                    <AlertMessage
                      variant={statusMessage.type === "error" ? "error" : "success"}
                      message={statusMessage.message}
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Message History */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
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
                    {messages.map((message) => (
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
                            <div className="mt-2 flex justify-between items-center">
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
                              
                              {message.messageId && message.status === "sent" && (
                                <button
                                  onClick={() => handleCheckMessageStatus(message.id, message.messageId)}
                                  className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                                >
                                  Check Status
                                </button>
                              )}
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
        </main>
      </div>
    </div>
  );
} 