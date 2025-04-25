"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
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
import { tenantColumns, userColumns, leaseTabColumns, AllUser } from "./columns"
import { NestedTabs } from "@/components/ui/nested-tabs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress"
import { theme } from "@/theme/theme";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [messageContent, setMessageContent] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<{ id: string, type: 'tenant' | 'user' }[]>([]);
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
  const [tenantsTableRef, setTenantsTableRef] = useState<any>(null);
  const [usersTableRef, setUsersTableRef] = useState<any>(null);
  const [emailSearch, setEmailSearch] = useState("");
  const [emailStatusFilter, setEmailStatusFilter] = useState<string>("all");
  const [expandedEmailIds, setExpandedEmailIds] = useState<string[]>([]);
  const [expandedRecipients, setExpandedRecipients] = useState<string[]>([]);

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

  // Modify the useEffect for data fetching
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
          setInitialLoading(false); // Set initialLoading to false after first data fetch
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

  // Helper to get selectedRowIds for a given table type and data
  const getSelectedRowIds = (type: 'tenant' | 'user', data: any[]) => {
    return selectedRecipients
      .filter(r => r.type === type)
      .map(r => r.id)
      .filter(id => data.some(row => (row.id || row.uid) === id));
  };

  // Memoize filtered data for late-rent and expired-lease tables
  const lateRentLeases = React.useMemo(
    () => getRentCollectionStatus(activeLeases, rentPayments, currentMonth).unpaidLeases,
    [activeLeases, rentPayments, currentMonth]
  );
  const expiredLeases = React.useMemo(
    () => getLeaseExpirations(activeLeases).leases,
    [activeLeases]
  );

  // Handle row selection change from any table
  const handleRowSelection = (
    selectedRows: any[],
    selectedIds: string[],
    type: 'tenant' | 'user',
    tableData?: any[]
  ) => {
    setSelectedRecipients(prev => {
      if (type === 'tenant' && tableData) {
        // IDs present in this table
        const tableIds = tableData.map(row => row.id || row.uid);
        // Remove only those tenant IDs from prev that are present in this table
        const filtered = prev.filter(r => r.type !== 'tenant' || !tableIds.includes(r.id));
        // Add back the selected ones from this table
        const newRecipients = [
          ...filtered,
          ...selectedIds.map(id => ({ id, type }))
        ];
        return newRecipients;
      } else {
        // For users, keep previous logic
        const filtered = prev.filter(r => r.type !== type);
        const newRecipients = [
          ...filtered,
          ...selectedIds.map(id => ({ id, type }))
        ];
        if (JSON.stringify(newRecipients) !== JSON.stringify(prev)) {
          return newRecipients;
        }
        return prev;
      }
    });
  };

  // Remove recipient from pills and table
  const handleRemoveRecipient = (id: string, type: 'tenant' | 'user') => {
    setSelectedRecipients(prev => prev.filter(r => !(r.id === id && r.type === type)));
    // Deselect in the correct table if visible
    if (type === 'tenant' && tenantsTableRef && tenantsTableRef.deselectRowById) {
      tenantsTableRef.deselectRowById(id);
    } else if (type === 'user' && usersTableRef && usersTableRef.deselectRowById) {
      usersTableRef.deselectRowById(id);
    }
  };

  const handleTemplateSelect = (template: typeof messageTemplates[0]) => {
    let processedContent = template.content;
    let processedSubject = template.subject;
    
    if (selectedRecipients.length > 0 && activeTab === "tenants") {
      const selectedLease = activeLeases.find(lease => lease.id === selectedRecipients[0].id);
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
      const selectedTenantEmails = selectedRecipients.filter(r => r.type === 'tenant').map(r => {
        const lease = activeLeases.find(l => l.id === r.id);
        return lease?.email;
      }).filter((email): email is string => Boolean(email));
      const selectedUserEmails = selectedRecipients.filter(r => r.type === 'user').map(r => {
        const user = authorizedUsers.find(u => u.uid === r.id);
        return user?.email;
      }).filter((email): email is string => Boolean(email));
      const allSelectedEmails: string[] = [...selectedTenantEmails, ...selectedUserEmails];
      
      // Record email in Firebase for history
      const emailData: EmailMessage = {
        id: '', // This will be set by Firebase
        recipients: allSelectedEmails,
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
          to: allSelectedEmails,
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

      // Reset selections in the appropriate table
      if (activeTab === "tenants" && tenantsTableRef) {
        tenantsTableRef.resetRowSelection();
      } else if (activeTab === "users" && usersTableRef) {
        usersTableRef.resetRowSelection();
      }
      
      // Reset selected recipients
      setSelectedRecipients([]);

      setStatusMessage({ type: "success", message: "Email sent successfully!" });
      setMessageContent("");
      setSubject("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      setStatusMessage({ type: "error", message: error.message || "Failed to send email. Please try again." });
      
      // Add failed email to history
      if (landlordId) {
        const selectedTenantEmails = selectedRecipients.filter(r => r.type === 'tenant').map(r => {
          const lease = activeLeases.find(l => l.id === r.id);
          return lease?.email;
        }).filter((email): email is string => Boolean(email));
        const selectedUserEmails = selectedRecipients.filter(r => r.type === 'user').map(r => {
          const user = authorizedUsers.find(u => u.uid === r.id);
          return user?.email;
        }).filter((email): email is string => Boolean(email));
        const allSelectedEmails: string[] = [...selectedTenantEmails, ...selectedUserEmails];
        const failedEmailData: EmailMessage = {
          id: '', // This will be set by Firebase
          recipients: allSelectedEmails,
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

  // RecipientPills component (now inside CommsPageContent)
  const RecipientPills = ({
    recipients,
    activeLeases,
    authorizedUsers,
    onRemove
  }: {
    recipients: { id: string, type: 'tenant' | 'user' }[],
    activeLeases: FirebaseLease[],
    authorizedUsers: AllUser[],
    onRemove: (id: string, type: 'tenant' | 'user') => void
  }) => (
    <div className="flex flex-wrap gap-2 my-2">
      <AnimatePresence>
        {recipients.map(({ id, type }) => {
          const label = type === 'tenant'
            ? activeLeases.find(l => l.id === id)?.unitNumber || "Unknown"
            : authorizedUsers.find(u => u.uid === id)?.name || "Unknown";
          return (
            <motion.div
              key={id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center bg-gray-200 rounded-full px-3 py-1 text-sm font-medium"
            >
              {label}
              <button
                className="ml-2 text-gray-500 hover:text-red-500"
                onClick={() => onRemove(id, type)}
                aria-label="Remove recipient"
                type="button"
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  // Helper: Filter and search emails
  const filteredMessages = messages.filter((msg) => {
    // Status filter
    if (emailStatusFilter !== "all" && msg.status !== emailStatusFilter) return false;
    // Search filter (subject, content, recipient email)
    const search = emailSearch.toLowerCase();
    if (!search) return true;
    return (
      msg.subject.toLowerCase().includes(search) ||
      msg.content.toLowerCase().includes(search) ||
      msg.recipients.some((r) => r.toLowerCase().includes(search))
    );
  });

  // Helper: Format date as YYYY-MM-DD (local)
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Helper: Get recipient pill label (unit number for tenant, name for user)
  const getRecipientLabel = (email: string) => {
    const lease = activeLeases.find(l => l.email === email);
    if (lease) return lease.unitNumber;
    const user = authorizedUsers.find(u => u.email === email);
    if (user) return user.name;
    return email;
  };

  // EmailHistory component
  const EmailHistory = () => (
    <Card className="mb-6">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b">
        <CardTitle className="text-lg font-medium text-gray-900">Email History</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            type="text"
            placeholder="Search emails..."
            value={emailSearch}
            onChange={e => setEmailSearch(e.target.value)}
            className="sm:w-64"
          />
          <div className="w-full sm:w-40">
            <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredMessages.length > 0 ? (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-gray-200">
              {filteredMessages.map((message) => {
                const isExpanded = expandedEmailIds.includes(message.id);
                const isRecipientsExpanded = expandedRecipients.includes(message.id);
                // Pills logic: show first, half of second, then "+N more" if more exist
                const pills = message.recipients.map(getRecipientLabel);
                const pillCount = pills.length;
                let pillsToShow = pills.slice(0, 1);
                let showHalfPill = pillCount > 1;
                let moreCount = pillCount - 2;
                return (
                  <li key={message.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">{formatDate(message.sentAt instanceof Date ? message.sentAt : new Date(message.sentAt?.seconds * 1000))}</span>
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
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="font-medium text-gray-900 text-sm truncate max-w-[180px] sm:max-w-[240px]">{message.subject}</span>
                          <div className="flex items-center gap-1 ml-2">
                            {/* Pills: show first, half of second, then +N more */}
                            <span className="inline-flex items-center bg-gray-200 rounded-full px-2 py-0.5 text-xs font-medium max-w-[80px] truncate">{pillsToShow[0]}</span>
                            {showHalfPill && (
                              <span className="inline-flex items-center bg-gray-200 rounded-full px-2 py-0.5 text-xs font-medium max-w-[40px] truncate opacity-60 relative left-[-12px]">{pills[1]?.slice(0, Math.ceil(pills[1].length / 2))}…</span>
                            )}
                            {pillCount > 2 && !isRecipientsExpanded && (
                              <button className="text-xs text-blue-500 ml-1" onClick={() => setExpandedRecipients(prev => [...prev, message.id])}>+{moreCount} more</button>
                            )}
                            {isRecipientsExpanded && pills.slice(2).map((pill, idx) => (
                              <span key={idx} className="inline-flex items-center bg-gray-200 rounded-full px-2 py-0.5 text-xs font-medium max-w-[80px] truncate ml-1">{pill}</span>
                            ))}
                            {isRecipientsExpanded && pillCount > 2 && (
                              <button className="text-xs text-blue-500 ml-1" onClick={() => setExpandedRecipients(prev => prev.filter(id => id !== message.id))}>See less</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className={`text-sm text-gray-500 ${!isExpanded ? 'line-clamp-2' : ''}`}>{message.content}</p>
                      {message.content.length > 120 && (
                        <button className="text-xs text-blue-500 mt-1" onClick={() => setExpandedEmailIds(prev => prev.includes(message.id) ? prev.filter(id => id !== message.id) : [...prev, message.id])}>
                          {isExpanded ? 'See less' : 'See more'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <h3 className="text-lg font-medium text-gray-900 mb-1">No emails sent yet</h3>
            <p className="text-gray-500">Your sent emails will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
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
                      <TabsList className="grid w-[85%] mx-auto grid-cols-3">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="late-rent">Rent</TabsTrigger>
                        <TabsTrigger value="expired-lease">Leases</TabsTrigger>
                      </TabsList>
                      <TabsContent value="all">
                        <p className="text-sm text-gray-500 mb-4">All occupied properties</p>
                        {(isLoading || initialLoading) ? (
                          <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        ) : (
                          <DataTable
                            columns={tenantColumns}
                            data={activeLeases}
                            defaultSorting={[{ id: "unitNumber", desc: false }]}
                            onRowSelectionChange={(selectedRows, selectedIds) => handleRowSelection(selectedRows, selectedIds, 'tenant', activeLeases)}
                            tableRef={setTenantsTableRef}
                            selectedRowIds={getSelectedRowIds('tenant', activeLeases)}
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="late-rent">
                        <p className="text-sm text-gray-500 mb-4">Units with pending rent for {currentMonthName}</p>
                        {(isLoading || initialLoading) ? (
                          <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        ) : (
                          <DataTable
                            columns={tenantColumns}
                            data={lateRentLeases}
                            defaultSorting={[{ id: "unitNumber", desc: false }]}
                            onRowSelectionChange={(selectedRows, selectedIds) => handleRowSelection(selectedRows, selectedIds, 'tenant', lateRentLeases)}
                            tableRef={setTenantsTableRef}
                            selectedRowIds={getSelectedRowIds('tenant', lateRentLeases)}
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="expired-lease">
                        <p className="text-sm text-gray-500 mb-4">Occupied units with expired leases</p>
                        {(isLoading || initialLoading) ? (
                          <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        ) : (
                          <DataTable
                            columns={leaseTabColumns}
                            data={expiredLeases}
                            defaultSorting={[{ id: "expiryStatus", desc: false }]}
                            onRowSelectionChange={(selectedRows, selectedIds) => handleRowSelection(selectedRows, selectedIds, 'tenant', expiredLeases)}
                            tableRef={setTenantsTableRef}
                            selectedRowIds={getSelectedRowIds('tenant', expiredLeases)}
                          />
                        )}
                      </TabsContent>
                    </NestedTabs>
                  </TabsContent>
                  <TabsContent value="users" className="mt-4">
                    {(isLoading || initialLoading) ? (
                      <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <DataTable
                        columns={userColumns}
                        data={authorizedUsers}
                        defaultSorting={[{ id: "name", desc: false }]}
                        onRowSelectionChange={(selectedRows, selectedIds) => handleRowSelection(selectedRows, selectedIds, 'user')}
                        tableRef={setUsersTableRef}
                        selectedRowIds={getSelectedRowIds('user', authorizedUsers)}
                      />
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
                  <div className="flex justify-between items-center">
                    <CardTitle>Compose Email</CardTitle>
                    <button
                      onClick={() => {
                        setSubject("");
                        setMessageContent("");
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
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
                    <RecipientPills
                      recipients={selectedRecipients}
                      activeLeases={activeLeases}
                      authorizedUsers={authorizedUsers}
                      onRemove={handleRemoveRecipient}
                    />
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
            <EmailHistory />
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