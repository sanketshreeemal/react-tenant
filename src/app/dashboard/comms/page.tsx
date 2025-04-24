"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, addDoc, query, orderBy, getDocs, Timestamp, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { Mail, Send, Check, AlertTriangle, Users } from "lucide-react";
import { getAllActiveLeases, getRentCollectionStatus, getLeaseExpirations, getAllPayments } from "../../../lib/firebase/firestoreUtils";
import { Lease as FirebaseLease, RentPayment } from "../../../types";
import { AlertMessage } from "@/components/ui/alert-message";
import type { AlertMessageVariant } from "@/components/ui/alert-message";
import { useLandlordId } from '../../../lib/hooks/useLandlordId';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "./data-table"
import { tenantColumns, userColumns, AllUser } from "./columns"
import { NestedTabs } from "@/components/ui/nested-tabs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress"
import { theme } from "@/theme/theme";

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

function CommsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordLoading } = useLandlordId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  
  const [activeLeases, setActiveLeases] = useState<FirebaseLease[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<AllUser[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: AlertMessageVariant | ""; message: string }>({ type: "", message: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("tenants");
  const [tenantTabValue, setTenantTabValue] = useState(() => {
    // Set initial tenant tab value based on URL parameter
    if (tabFromUrl === "late-rent" || tabFromUrl === "expired-lease") {
      return tabFromUrl;
    }
    return "all";
  });
  const itemsPerPage = 10;
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [currentMonthName, setCurrentMonthName] = useState<string>("");
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);

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

  // Add useEffect for current month calculation
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Calculate previous month for rent in arrears
    const previousMonthIndex = month === 0 ? 11 : month - 1;
    const previousMonthYear = month === 0 ? year - 1 : year;
    const previousMonthString = `${previousMonthYear}-${String(previousMonthIndex + 1).padStart(2, '0')}`;
    const previousMonthName = new Date(previousMonthYear, previousMonthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });

    setCurrentMonth(previousMonthString);
    setCurrentMonthName(previousMonthName);
  }, []);

  // Add useEffect to handle URL parameters
  useEffect(() => {
    if (tabFromUrl === "late-rent" || tabFromUrl === "expired-lease") {
      setActiveTab("tenants");
      setTenantTabValue(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Separate useEffect for data fetching
  useEffect(() => {
    if (user && landlordId) {
    const initializeData = async () => {
      if (!landlordLoading && landlordId && !isLoading && activeLeases.length === 0 && authorizedUsers.length === 0) {
        try {
          setIsLoading(true);
          setStatusMessage({ type: "", message: "" });

          // Fetch active leases
          const firebaseLeases = await getAllActiveLeases(landlordId);
            const leases: FirebaseLease[] = firebaseLeases
            .filter(lease => {
              if (!lease.id || !lease.unitId || !lease.unitNumber || !lease.tenantName || !lease.email) {
                console.warn('Incomplete lease data:', lease);
                return false;
              }
              return true;
              });

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
            
            // Fetch rent payments
            const paymentsCollection = collection(db, `landlords/${landlordId}/rent-collection`);
            const paymentsQuery = query(paymentsCollection, orderBy('createdAt', 'desc'));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const paymentsData: RentPayment[] = paymentsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                leaseId: data.leaseId,
                unitId: data.unitId,
                tenantName: data.tenantName,
                officialRent: data.officialRent,
                actualRentPaid: data.actualRentPaid,
                paymentType: data.paymentType,
                collectionMethod: data.collectionMethod,
                rentalPeriod: data.rentalPeriod,
                paymentDate: data.paymentDate?.toDate() || new Date(),
                landlordComments: data.landlordComments,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
              };
            });
            setRentPayments(paymentsData);
          
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
    }
  }, [landlordId, landlordLoading, isLoading]);

  const getRecipientId = (item: FirebaseLease | AllUser): string => {
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

  const handleRowSelection = (selectedRows: any[], type: 'tenant' | 'user') => {
    const validIds = selectedRows
      .map(row => type === 'tenant' ? (row as FirebaseLease).id : (row as AllUser).uid)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    setSelectedRecipients(validIds);
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

    if (!landlordId) {
      setStatusMessage({ type: "error", message: "Landlord ID is required" });
      return;
    }

    setIsSending(true);
    setStatusMessage({ type: "", message: "" });

    try {
      // Get email addresses of selected recipients, ensuring no undefined values
      const selectedEmails = activeTab === "tenants"
        ? activeLeases
            .filter(lease => lease.id && selectedRecipients.includes(lease.id) && lease.email)
            .map(lease => lease.email!)
        : authorizedUsers
            .filter(user => selectedRecipients.includes(user.uid))
            .map(user => user.email);
      
      // Record email in Firebase for history
      const emailData: EmailMessage = {
        id: '', // This will be set by Firebase
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
          ...emailData,
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
        const failedEmailData: EmailMessage = {
          id: '', // This will be set by Firebase
          recipients: activeTab === "tenants"
            ? activeLeases
                .filter(lease => lease.id && selectedRecipients.includes(lease.id) && lease.email)
                .map(lease => lease.email!)
            : authorizedUsers
                .filter(user => selectedRecipients.includes(user.uid))
                .map(user => user.email),
          subject: subject,
          content: messageContent,
          sentAt: new Date(),
          status: "failed",
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

  // Function to get filtered tenants based on tab
  const getFilteredTenants = () => {
    if (!activeLeases || !rentPayments) return [];

    switch (tenantTabValue) {
      case "late-rent": {
        const rentStatus = getRentCollectionStatus(activeLeases, rentPayments, currentMonth);
        return rentStatus.unpaidLeases;
      }
      case "expired-lease": {
        const expirations = getLeaseExpirations(activeLeases);
        return expirations.leases;
      }
      default:
        return activeLeases;
    }
  };

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
        <Card className="mb-6">
          <CardHeader className="py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-500 mr-3" />
              <CardTitle className="text-2xl font-semibold text-gray-900">
                Communication
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        
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
                    <NestedTabs
                      mainTab={activeTab}
                      mainTabValue="tenants"
                      nestedValue={tenantTabValue}
                      onNestedValueChange={setTenantTabValue}
                      className="nested-tabs w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="late-rent">Rent</TabsTrigger>
                        <TabsTrigger value="expired-lease">Leases</TabsTrigger>
                      </TabsList>
                      <TabsContent value="all">
                        <p className="text-sm text-gray-500 mb-4">All occupied units</p>
                        {isLoading ? (
                          <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        ) : activeLeases.length > 0 ? (
                          <DataTable
                            columns={tenantColumns}
                            data={getFilteredTenants()}
                            defaultSorting={[{ id: "unitNumber", desc: false }]}
                            onRowSelectionChange={(selectedRows) => handleRowSelection(selectedRows, 'tenant')}
                          />
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
                      <TabsContent value="late-rent">
                        <p className="text-sm text-gray-500 mb-4">Units with pending rent for {currentMonthName}</p>
                        <DataTable
                          columns={tenantColumns}
                          data={getRentCollectionStatus(activeLeases, rentPayments, currentMonth).unpaidLeases}
                          defaultSorting={[{ id: "unitNumber", desc: false }]}
                          onRowSelectionChange={(selectedRows) => handleRowSelection(selectedRows, 'tenant')}
                        />
                      </TabsContent>
                      <TabsContent value="expired-lease">
                        <p className="text-sm text-gray-500 mb-4">Occupied units with expired leases</p>
                        <DataTable
                          columns={tenantColumns}
                          data={getFilteredTenants()}
                          defaultSorting={[{ id: "unitNumber", desc: false }]}
                          onRowSelectionChange={(selectedRows) => handleRowSelection(selectedRows, 'tenant')}
                        />
                      </TabsContent>
                    </NestedTabs>
                  </TabsContent>
                  <TabsContent value="users" className="mt-4">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : authorizedUsers.length > 0 ? (
                      <DataTable
                        columns={userColumns}
                        data={authorizedUsers}
                        defaultSorting={[{ id: "name", desc: false }]}
                        onRowSelectionChange={(selectedRows) => handleRowSelection(selectedRows, 'user')}
                      />
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
              <Card>
                <CardHeader>
                  <CardTitle>Email Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {messageTemplates.map((template, index) => (
                      <Card key={index} className="hover:bg-accent transition-colors cursor-pointer" onClick={() => handleTemplateSelect(template)}>
                        <CardContent className="p-4">
                          <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{template.content.substring(0, 60)}...</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Right Side: Email Composer */}
              <Card>
                <CardHeader>
                  <CardTitle>Compose Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <Input
                        type="text"
                        id="subject"
                        placeholder="Enter email subject..."
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <Textarea
                        id="content"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Type your message here..."
                        rows={3}
                        className="min-h-[150px]"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
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
                            : "bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        }`}
                        style={{
                          backgroundColor: theme.colors.button.primary,
                          color: theme.colors.background,
                        }}
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
                </CardContent>
              </Card>
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

export default function CommunicationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <CommsPageContent />
    </Suspense>
  );
}