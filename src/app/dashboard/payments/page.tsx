"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useLandlordId } from "../../../lib/hooks/useLandlordId";
import Navigation from "../../../components/Navigation";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { Search, Plus, Calendar, ArrowUp, ArrowDown, Filter, Trash2, Pencil, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { isPaymentEditable } from "../../../lib/firebase/firestoreUtils";
import logger from "../../../lib/logger";
import { AlertMessage } from "@/components/ui/alert-message";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { theme } from "@/theme/theme";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface RentPayment {
  id: string;
  leaseId: string;
  unitNumber: string;
  tenantName: string;
  officialRent: number;
  actualRent: number;
  paymentType?: string;
  collectionMethod?: string;
  rentalPeriod: string;
  comments: string;
  createdAt: any;
}

type SortColumn = 'unitNumber' | 'tenantName' | 'paymentType' | 'rentalPeriod' | 'officialRent' | 'actualRent' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function RentPage() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordIdLoading, error: landlordIdError } = useLandlordId();
  const router = useRouter();
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Add state for payment type filter
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([]);
  const [showPaymentTypeFilter, setShowPaymentTypeFilter] = useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  const [sortColumn, setSortColumn] = useState<SortColumn>('rentalPeriod');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Consolidated alert message state
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Click outside handler for filter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowPaymentTypeFilter(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterRef]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!landlordId) return;
      try {
        setIsLoading(true);
        logger.info("RentPage: Fetching data...");
        
        // Fetch rent payments
        const paymentsQuery = query(
          collection(db, `landlords/${landlordId}/rent-collection`),
          orderBy("createdAt", "desc")
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        const paymentsData: RentPayment[] = [];
        paymentsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Get a more user-friendly unit number
          const unitNumber = data.unitNumber || 
                            (data.unitId && typeof data.unitId === 'string' ? 
                              // Try to get the last part of the ID if it contains slashes
                              data.unitId.includes('/') ? 
                                data.unitId.split('/').pop() : 
                                data.unitId
                            : 'Unknown Unit');
          
          paymentsData.push({ 
            id: doc.id, 
            leaseId: data.leaseId,
            unitNumber: unitNumber,
            tenantName: data.tenantName || "",
            officialRent: data.officialRent || 0,
            actualRent: data.actualRentPaid || 0,
            paymentType: data.paymentType || "Rent Payment",
            collectionMethod: data.collectionMethod || "",
            rentalPeriod: data.rentalPeriod,
            comments: data.comments || "",
            createdAt: data.createdAt
          });
        });
        
        setRentPayments(paymentsData);
        logger.info(`RentPage: Found ${paymentsData.length} rent payments.`);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        logger.error(`RentPage: Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAlertMessage({ type: 'error', message: 'Failed to load payment data.' });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && landlordId && !landlordIdLoading) {
      fetchData();
    } else if (landlordIdError) {
      setAlertMessage({ type: 'error', message: `Failed to load landlord details: ${landlordIdError}` });
      setIsLoading(false);
    }
  }, [user, landlordId, landlordIdLoading, landlordIdError]);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 3000); // 3 seconds

      // Cleanup timer on component unmount or when alertMessage changes
      return () => clearTimeout(timer);
    }
  }, [alertMessage]); // Only re-run when alertMessage changes

  const filteredPayments = rentPayments.filter((payment) => {
    // If no search term, just filter by payment type
    if (!searchTerm.trim()) {
      return (
        selectedPaymentTypes.length === 0 || 
        selectedPaymentTypes.includes(payment.paymentType || "Rent Payment")
      );
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in multiple fields
    const matchesUnitOrTenant = 
      payment.tenantName.toLowerCase().includes(searchLower) ||
      payment.unitNumber.toLowerCase().includes(searchLower);
    
    // Search in payment type
    const matchesPaymentType = 
      (payment.paymentType || "Rent Payment").toLowerCase().includes(searchLower);
    
    // Search in rental period (both in format "2023-08" and month names like "August")
    const matchesRentalPeriod = payment.rentalPeriod.toLowerCase().includes(searchLower);
    
    // Check if search term matches a month name in the rental period
    const [year, month] = payment.rentalPeriod.split('-');
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthName = months[parseInt(month, 10) - 1];
    const matchesMonthName = monthName.includes(searchLower);
    
    // Search in comments
    const matchesComments = payment.comments.toLowerCase().includes(searchLower);
    
    // Check if we should include this payment based on combined search results
    const matchesSearch = matchesUnitOrTenant || matchesPaymentType || matchesRentalPeriod || matchesMonthName || matchesComments;
    
    // Also apply payment type filter
    const matchesPaymentTypeFilter = 
      selectedPaymentTypes.length === 0 || 
      selectedPaymentTypes.includes(payment.paymentType || "Rent Payment");
    
    return matchesSearch && matchesPaymentTypeFilter;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a different column, set it with desc direction
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortColumn) {
      case 'unitNumber':
        return direction * (a.unitNumber.localeCompare(b.unitNumber));
      
      case 'tenantName':
        return direction * (a.tenantName.localeCompare(b.tenantName));
      
      case 'paymentType':
        const typeA = a.paymentType || "Rent Payment";
        const typeB = b.paymentType || "Rent Payment";
        return direction * (typeA.localeCompare(typeB));
      
      case 'rentalPeriod':
        const [yearA, monthA] = a.rentalPeriod.split('-').map(Number);
        const [yearB, monthB] = b.rentalPeriod.split('-').map(Number);
        
        const dateA = new Date(yearA, monthA - 1);
        const dateB = new Date(yearB, monthB - 1);
        
        return direction * (dateB.getTime() - dateA.getTime());
      
      case 'officialRent':
        return direction * (a.officialRent - b.officialRent);
      
      case 'actualRent':
        return direction * (a.actualRent - b.actualRent);
      
      case 'createdAt':
        const createdAtA = a.createdAt instanceof Date 
          ? a.createdAt.getTime()
          : a.createdAt.toDate 
            ? a.createdAt.toDate().getTime()
            : new Date(a.createdAt.seconds * 1000).getTime();
        
        const createdAtB = b.createdAt instanceof Date 
          ? b.createdAt.getTime()
          : b.createdAt.toDate 
            ? b.createdAt.toDate().getTime()
            : new Date(b.createdAt.seconds * 1000).getTime();
        
        return direction * (createdAtB - createdAtA);
      
      default:
        // Default sort by rental period (most recent first)
        const [defaultYearA, defaultMonthA] = a.rentalPeriod.split('-').map(Number);
        const [defaultYearB, defaultMonthB] = b.rentalPeriod.split('-').map(Number);
        
        const defaultDateA = new Date(defaultYearA, defaultMonthA - 1);
        const defaultDateB = new Date(defaultYearB, defaultMonthB - 1);
        
        return defaultDateB.getTime() - defaultDateA.getTime();
    }
  });

  // Function to get unique payment types from the data
  function getUniquePaymentTypes(paymentsList: RentPayment[]) {
    const types = new Set<string>();
    
    // Always include these default types in the specified order
    const defaultTypes = ["Rent Payment", "Bill Payment", "Maintenance Fee", "Other"];
    defaultTypes.forEach(type => types.add(type));
    
    // Add any other types from the data
    paymentsList.forEach(payment => {
      if (payment.paymentType && !defaultTypes.includes(payment.paymentType)) {
        types.add(payment.paymentType);
      }
    });
    
    // Return with default types in specified order, followed by any additional types sorted alphabetically
    return [
      ...defaultTypes,
      ...Array.from(types).filter(type => !defaultTypes.includes(type)).sort()
    ];
  }
  
  const uniquePaymentTypes = getUniquePaymentTypes(rentPayments);

  // Updated loading check
  if (authLoading || landlordIdLoading || isLoading) { 
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Ensure user and landlordId are present after loading
  if (!user || !landlordId) {
    // Redirect is handled by the first useEffect, or an error message might be shown
    // If there's a landlordIdError, the alert message will be shown. 
    // Otherwise, if we reach here without user/landlordId, it implies a redirect is happening or an edge case.
    return null; 
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="md:ml-64 p-4">
        {/* Alert Messages */}
        {alertMessage && (
          <div className="max-w-7xl mx-auto mb-6">
            <AlertMessage
              variant={alertMessage.type}
              message={alertMessage.message}
            />
          </div>
        )}
        
        <Card className="mb-6">
          <CardHeader className="py-4 px-4 sm:px-6 lg:px-8">
            <div className="w-full flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <CardTitle className="text-2xl font-semibold text-gray-900 text-center sm:text-left">
                  Payment Management
                </CardTitle>
              </div>
              <Button
                onClick={() => router.push("/dashboard/payments/forms")}
                variant="default"
                size="sm"
                style={{
                  backgroundColor: theme.colors.button.primary,
                  color: theme.colors.background,
                }}
                className="hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span>Record Payment</span>
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <main className="max-w-7xl mx-auto">
          {/* Payment Details Section */}
          <Accordion 
            type="single" 
            collapsible 
            className="mb-8"
            defaultValue="payment-details"
          >
            <AccordionItem value="payment-details">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Payment Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {/* Payment Details Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div className="relative w-full md:flex-1 md:max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <X className="h-4 w-4 text-gray-400 hover:text-gray-500" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    
                    {/* Payment Type Filter */}
                    <div className="relative w-full md:w-auto md:ml-4" ref={filterRef}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPaymentTypeFilter(!showPaymentTypeFilter)}
                        className="w-full md:w-auto flex items-center justify-center"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        <span>Filter by Payment Type</span>
                        {selectedPaymentTypes.length > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {selectedPaymentTypes.length}
                          </span>
                        )}
                      </Button>
                      
                      {showPaymentTypeFilter && (
                        <div className="absolute left-0 mt-2 w-full md:w-64 bg-white rounded-md shadow-lg z-10 p-3 border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium text-gray-700">Payment Types</h3>
                            <button
                              onClick={() => setSelectedPaymentTypes([])}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {uniquePaymentTypes.map((type) => (
                              <label key={type} className="flex items-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  checked={selectedPaymentTypes.includes(type)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPaymentTypes([...selectedPaymentTypes, type]);
                                    } else {
                                      setSelectedPaymentTypes(selectedPaymentTypes.filter(t => t !== type));
                                    }
                                  }}
                                />
                                <span className="ml-2 text-sm text-gray-700">{type}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th 
                            scope="col" 
                            className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('unitNumber')}
                          >
                            Unit
                            {sortColumn === 'unitNumber' && (
                              <span className="inline-block ml-1">
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-blue-500 inline" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-blue-500 inline" />
                                )}
                              </span>
                            )}
                          </th>
                          <th 
                            scope="col" 
                            className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('tenantName')}
                          >
                            Tenant
                            {sortColumn === 'tenantName' && (
                              <span className="inline-block ml-1">
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-blue-500 inline" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-blue-500 inline" />
                                )}
                              </span>
                            )}
                          </th>
                          <th 
                            scope="col" 
                            className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('paymentType')}
                          >
                            Payment Type
                            {sortColumn === 'paymentType' && (
                              <span className="inline-block ml-1">
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-blue-500 inline" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-blue-500 inline" />
                                )}
                              </span>
                            )}
                          </th>
                          <th 
                            scope="col" 
                            className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('rentalPeriod')}
                          >
                            Month
                            {sortColumn === 'rentalPeriod' && (
                              <span className="inline-block ml-1">
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-blue-500 inline" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-blue-500 inline" />
                                )}
                              </span>
                            )}
                          </th>
                          <th 
                            scope="col" 
                            className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('actualRent')}
                          >
                            Collected
                            {sortColumn === 'actualRent' && (
                              <span className="inline-block ml-1">
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-blue-500 inline" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-blue-500 inline" />
                                )}
                              </span>
                            )}
                          </th>
                          <th 
                            scope="col" 
                            className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Payment ID
                          </th>
                          <th 
                            scope="col" 
                            className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort('createdAt')}
                          >
                            Date Recorded
                            {sortColumn === 'createdAt' && (
                              <span className="inline-block ml-1">
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-blue-500 inline" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-blue-500 inline" />
                                )}
                              </span>
                            )}
                          </th>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedPayments.map((payment) => {
                          const [year, month] = payment.rentalPeriod.split('-');
                          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          const formattedRentalPeriod = `${months[parseInt(month, 10) - 1]} ${year}`;
                          const isShort = payment.actualRent < payment.officialRent;
                          
                          return (
                            <tr 
                              key={payment.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={(e) => {
                                // Prevent row click if clicking on action buttons
                                const target = e.target as HTMLElement;
                                if (!target.closest('button')) {
                                  router.push(`/dashboard/payments/forms?view=${payment.id}`);
                                }
                              }}
                            >
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                                {payment.unitNumber}
                              </td>
                              <td className="px-2 sm:px-6 py-4 text-left text-sm text-gray-900">
                                <div className="max-w-[120px] sm:max-w-[150px] whitespace-pre-wrap break-words">
                                  {payment.tenantName}
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                {payment.paymentType || "Rent Payment"}
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                <div className="flex items-center justify-center">
                                  <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                                  <span>{formattedRentalPeriod}</span>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                                <div className={`text-sm font-medium flex flex-col items-center gap-1 ${isShort ? "text-red-600" : "text-green-600"}`}>
                                  ₹{payment.actualRent.toLocaleString()}
                                  {isShort && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Short by ₹{(payment.officialRent - payment.actualRent).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-[150px] sm:max-w-[200px] mx-auto whitespace-pre-wrap break-words">
                                  {payment.comments || "-"}
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                {payment.createdAt instanceof Date 
                                  ? payment.createdAt.toLocaleDateString()
                                  : payment.createdAt.toDate 
                                    ? payment.createdAt.toDate().toLocaleDateString()
                                    : new Date(payment.createdAt.seconds * 1000).toLocaleDateString()}
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <div className="flex items-center justify-center gap-2">
                                  {isPaymentEditable(payment.rentalPeriod) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/dashboard/payments/forms?edit=${payment.id}`);
                                      }}
                                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                      title="Edit payment"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      <span className="sr-only">Edit</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/dashboard/payments/forms?delete=${payment.id}`);
                                    }}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete payment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </main>
      </div>
    </div>
  );
} 