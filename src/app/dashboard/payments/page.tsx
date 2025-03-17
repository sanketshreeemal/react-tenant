"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, getDocs, query, orderBy, where, addDoc, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { DollarSign, Search, Plus, Calendar, Check, X, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { getActiveLeaseForUnit, getRentalInventoryDetails } from "../../../lib/firebase/firestoreUtils";
import logger from "../../../lib/logger";
import { AlertMessage } from "@/components/ui/alert-message";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { theme } from "@/theme/theme";

interface Lease {
  id: string;
  unitId: string;
  unitNumber: string;
  tenantName: string;
  rentAmount: number;
  isActive: boolean;
}

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

interface FormData {
  leaseId: string;
  unitId: string;
  unitNumber: string;
  tenantName: string;
  officialRent: string;
  actualRent: string;
  rentalPeriod: string;
  paymentDate: string;
  ownerDetails: string;
  bankDetails: string;
  comments: string;
  paymentType: string;
  collectionMethod: string;
  attachment?: File | null;
}

export default function RentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<RentPayment | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [rentWarning, setRentWarning] = useState("");
  
  // Add state for payment type filter
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([]);
  const [showPaymentTypeFilter, setShowPaymentTypeFilter] = useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    leaseId: "",
    unitId: "",
    unitNumber: "",
    tenantName: "",
    officialRent: "",
    actualRent: "",
    rentalPeriod: format(new Date(), "yyyy-MM"),
    paymentDate: "",
    ownerDetails: "",
    bankDetails: "",
    comments: "",
    paymentType: "",
    collectionMethod: "",
    attachment: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [sortColumn, setSortColumn] = useState<'unitNumber' | 'tenantName' | 'paymentType' | 'rentalPeriod' | 'officialRent' | 'actualRent' | 'createdAt'>('rentalPeriod');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        logger.info("RentPage: Fetching data...");

        // Fetch active leases
        const leasesQuery = query(
          collection(db, "leases"),
          where("isActive", "==", true),
          orderBy("unitId")
        );
        const leasesSnapshot = await getDocs(leasesQuery);
        
        const leasesData: Lease[] = [];
        leasesSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Get a more user-friendly unit number
          // If unitNumber exists in the data, use it, otherwise try to extract from unitId
          const unitNumber = data.unitNumber || 
                            (data.unitId && typeof data.unitId === 'string' ? 
                              // Try to get the last part of the ID if it contains slashes
                              data.unitId.includes('/') ? 
                                data.unitId.split('/').pop() : 
                                data.unitId
                            : 'Unknown Unit');
          
          leasesData.push({ 
            id: doc.id, 
            unitId: data.unitId,
            unitNumber: unitNumber,
            tenantName: data.tenantName,
            rentAmount: data.rentAmount,
            isActive: data.isActive
          });
        });
        
        setActiveLeases(leasesData);
        logger.info(`RentPage: Found ${leasesData.length} active leases.`);
        
        // Fetch rent payments
        const paymentsQuery = query(
          collection(db, "rent-collection"),
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
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        logger.error(`RentPage: Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "leaseId" && value) {
      try {
        // Find the selected lease
        const selectedLease = activeLeases.find(lease => lease.id === value);
        
        if (selectedLease) {
          logger.info(`RentPage: Selected lease with ID ${value}`);
          
          // Auto-populate lease-related data
          setFormData(prev => ({
            ...prev,
            leaseId: value,
            unitId: selectedLease.unitId,
            unitNumber: selectedLease.unitNumber,
            tenantName: selectedLease.tenantName,
            officialRent: selectedLease.rentAmount.toString(),
            actualRent: selectedLease.rentAmount.toString(),
            ownerDetails: "", // Will be populated from inventory details
            bankDetails: "", // Will be populated from inventory details
          }));
          
          // Reset rent warning
          setRentWarning("");

          // Fetch additional details from rental inventory
          try {
            const inventoryDetails = await getRentalInventoryDetails(selectedLease.unitId);
            
            if (inventoryDetails) {
              logger.info(`RentPage: Retrieved inventory details for unit ${selectedLease.unitId}`);
              
              // Update form with owner and bank details
              setFormData(prevData => ({
                ...prevData,
                ownerDetails: inventoryDetails.ownerDetails || "",
                bankDetails: inventoryDetails.bankDetails || "",
              }));
            } else {
              logger.warn(`RentPage: No inventory details found for unit ${selectedLease.unitId}`);
            }
          } catch (error) {
            console.error("Error fetching inventory details:", error);
            logger.error(`RentPage: Error fetching inventory details: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          return;
        }
      } catch (error) {
        console.error("Error handling lease selection:", error);
        logger.error(`RentPage: Error handling lease selection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Handle payment type change
    if (name === "paymentType") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Reset officialRent to N/A for non-rent payments
        officialRent: value === "Rent Payment" ? prev.officialRent : "N/A"
      }));
      return;
    }
    
    // Check rent amount when actualRent changes
    if (name === "actualRent") {
      const actualRent = parseFloat(value);
      
      // Validate that amount is positive
      if (actualRent <= 0) {
        setFormError("Amount collected must be greater than 0");
        return;
      }

      if (formData.paymentType === "Rent Payment" && formData.officialRent && formData.officialRent !== "N/A") {
        const officialRent = parseFloat(formData.officialRent);
        
        if (actualRent > officialRent * 1.2) {
          setRentWarning("The rent collected is higher than expected. Please verify if this is correct. Consider adding a comment to explain the difference.");
        } else if (actualRent < officialRent * 0.8) {
          setRentWarning("The rent collected is lower than expected. Please verify if this is correct. Consider adding a comment to explain the difference.");
        } else {
          setRentWarning("");
        }
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        attachment: e.target.files![0]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    
    try {
      logger.info("RentPage: Submitting rent payment form...");
      
      // Validate form
      if (!formData.leaseId || !formData.actualRent || !formData.rentalPeriod || !formData.paymentDate || !formData.paymentType || !formData.collectionMethod) {
        const error = "Please fill in all required fields";
        logger.error(`RentPage: Form validation error: ${error}`);
        throw new Error(error);
      }

      // Validate amount is positive
      if (parseFloat(formData.actualRent) <= 0) {
        const error = "Amount collected must be greater than 0";
        logger.error(`RentPage: Form validation error: ${error}`);
        throw new Error(error);
      }
      
      // Check if payment date is in the future
      const selectedDate = new Date(formData.paymentDate);
      const currentDate = new Date();
      
      if (selectedDate > currentDate) {
        const error = "Payment date cannot be in the future";
        logger.error(`RentPage: Form validation error: ${error}`);
        throw new Error(error);
      }
      
      // Add rent payment to Firestore
      const paymentData = {
        leaseId: formData.leaseId,
        unitId: formData.unitId,
        unitNumber: formData.unitNumber,
        tenantName: formData.tenantName,
        officialRent: formData.officialRent && formData.officialRent !== "N/A" ? parseFloat(formData.officialRent) : 0,
        actualRentPaid: parseFloat(formData.actualRent),
        paymentType: formData.paymentType,
        collectionMethod: formData.collectionMethod,
        rentalPeriod: formData.rentalPeriod,
        paymentDate: new Date(formData.paymentDate),
        ownerDetails: formData.ownerDetails,
        bankDetails: formData.bankDetails,
        comments: formData.comments,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, "rent-collection"), paymentData);
      logger.info(`RentPage: Rent payment added successfully with ID: ${docRef.id}`);
      
      // Add to local state
      setRentPayments([
        { 
          id: docRef.id, 
          leaseId: paymentData.leaseId,
          unitNumber: paymentData.unitNumber,
          tenantName: paymentData.tenantName,
          officialRent: paymentData.officialRent,
          actualRent: paymentData.actualRentPaid,
          paymentType: paymentData.paymentType,
          collectionMethod: paymentData.collectionMethod,
          rentalPeriod: paymentData.rentalPeriod,
          comments: paymentData.comments || "",
          createdAt: paymentData.createdAt
        },
        ...rentPayments,
      ]);
      
      setSuccessMessage(`${formData.paymentType} recorded successfully!`);
      
      // Reset form
      setFormData({
        leaseId: "",
        unitId: "",
        unitNumber: "",
        tenantName: "",
        officialRent: "",
        actualRent: "",
        rentalPeriod: format(new Date(), "yyyy-MM"),
        paymentDate: "",
        ownerDetails: "",
        bankDetails: "",
        comments: "",
        paymentType: "",
        collectionMethod: "",
        attachment: null,
      });
      
      // Hide form after successful submission
      setTimeout(() => {
        setShowAddForm(false);
        setSuccessMessage("");
      }, 2000);
      
    } catch (error) {
      console.error("Error recording rent payment:", error);
      setFormError(error instanceof Error ? error.message : "An error occurred while recording the rent payment");
      logger.error(`RentPage: Error recording rent payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDeletePayment = (payment: RentPayment) => {
    setPaymentToDelete(payment);
    setShowDeleteForm(true);
    setDeleteReason("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deleteReason.trim()) {
      setDeleteError("Please provide a reason for deletion");
      return;
    }
    
    // Show confirmation dialog instead of proceeding with deletion
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) {
      return;
    }
    
    setIsDeleting(true);
    setDeleteError("");
    
    try {
      logger.info(`RentPage: Deleting rent payment ${paymentToDelete.id}...`);
      
      // First, get the complete payment data
      const paymentDocRef = doc(db, "rent-collection", paymentToDelete.id);
      const paymentDoc = await getDoc(paymentDocRef);
      
      if (!paymentDoc.exists()) {
        throw new Error("Payment record not found");
      }
      
      const paymentData = paymentDoc.data();
      
      // Add to deleted-rents collection with reason
      const deletedRentData = {
        ...paymentData,
        id: paymentToDelete.id,
        reasonForDeletion: deleteReason.trim(),
        deletedAt: new Date(),
      };
      
      await addDoc(collection(db, "deleted-rents"), deletedRentData);
      logger.info(`RentPage: Added payment to deleted-rents collection`);
      
      // Delete from rent-collection
      await deleteDoc(paymentDocRef);
      logger.info(`RentPage: Deleted payment from rent-collection`);
      
      // Update local state
      setRentPayments(rentPayments.filter(payment => payment.id !== paymentToDelete.id));
      
      setDeleteSuccess("Payment deleted successfully");
      
      // Close form after a delay
      setTimeout(() => {
        setShowDeleteForm(false);
        setPaymentToDelete(null);
        setDeleteReason("");
        setDeleteSuccess("");
        setShowDeleteConfirmation(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error deleting rent payment:", error);
      setDeleteError(error instanceof Error ? error.message : "An error occurred while deleting the payment");
      logger.error(`RentPage: Error deleting rent payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteForm(false);
    setPaymentToDelete(null);
    setDeleteReason("");
    setDeleteError("");
    setShowDeleteConfirmation(false);
  };

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

  const handleSort = (column: 'unitNumber' | 'tenantName' | 'paymentType' | 'rentalPeriod' | 'officialRent' | 'actualRent' | 'createdAt') => {
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

  // Generate rental period options (4 months before and after current month)
  const rentalPeriodOptions = [];
  const currentDate = new Date();
  
  for (let i = -4; i <= 4; i++) {
    const date = i < 0 ? subMonths(currentDate, Math.abs(i)) : addMonths(currentDate, i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy");
    
    rentalPeriodOptions.push({ value, label });
  }

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
                onClick={() => setShowAddForm(!showAddForm)}
                variant="default"
                size="sm"
                className="bg-gray-900 hover:bg-gray-800"
              >
                {showAddForm ? (
                  <>
                    <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span>Record Payment</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <main className="max-w-7xl mx-auto">
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900">Record Payment</CardTitle>
              </CardHeader>
              <CardContent>
                {formError && (
                  <AlertMessage
                    variant="error"
                    message={formError}
                    className="mb-4"
                  />
                )}
                
                {successMessage && (
                  <AlertMessage
                    variant="success"
                    message={successMessage}
                    className="mb-4"
                  />
                )}
                
                {rentWarning && (
                  <AlertMessage
                    variant="warning"
                    message={rentWarning}
                    className="mb-4"
                  />
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="leaseId" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Select Unit <span className="text-red-500">*</span>
                      </label>
                      <Select
                        name="leaseId"
                        value={formData.leaseId}
                        onValueChange={(value) => handleInputChange({ target: { name: "leaseId", value } } as any)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeLeases.map((lease) => (
                            <SelectItem key={lease.id} value={lease.id}>
                              {lease.unitNumber} - {lease.tenantName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor="paymentType" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Payment Type <span className="text-red-500">*</span>
                      </label>
                      <Select
                        name="paymentType"
                        value={formData.paymentType}
                        onValueChange={(value) => handleInputChange({ target: { name: "paymentType", value } } as any)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniquePaymentTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label htmlFor="rentalPeriod" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Payment Period <span className="text-red-500">*</span>
                      </label>
                      <Select
                        name="rentalPeriod"
                        value={formData.rentalPeriod}
                        onValueChange={(value) => handleInputChange({ target: { name: "rentalPeriod", value } } as any)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {rentalPeriodOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label htmlFor="tenantName" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Tenant Name
                      </label>
                      <Input
                        type="text"
                        id="tenantName"
                        name="tenantName"
                        value={formData.tenantName}
                        className="bg-gray-50"
                        disabled
                        placeholder="Auto-populated from lease"
                      />
                    </div>

                    <div>
                      <label htmlFor="paymentDate" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Payment Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        id="paymentDate"
                        name="paymentDate"
                        value={formData.paymentDate}
                        onChange={handleInputChange}
                        max={format(new Date(), "yyyy-MM-dd")}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="officialRent" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Expected Amount (₹)
                      </label>
                      <Input
                        type="text"
                        id="officialRent"
                        name="officialRent"
                        value={formData.paymentType === "Rent Payment" ? formData.officialRent : "N/A"}
                        className="bg-gray-50"
                        disabled
                        placeholder="Auto-populated from lease"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="actualRent" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Amount Collected (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        id="actualRent"
                        name="actualRent"
                        value={formData.actualRent}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="collectionMethod" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Collection Method <span className="text-red-500">*</span>
                      </label>
                      <Select
                        name="collectionMethod"
                        value={formData.collectionMethod}
                        onValueChange={(value) => handleInputChange({ target: { name: "collectionMethod", value } } as any)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select collection method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Other">Other - Specify in Comments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor="ownerDetails" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Unit Owner
                      </label>
                      <Input
                        type="text"
                        id="ownerDetails"
                        name="ownerDetails"
                        value={formData.ownerDetails}
                        className="bg-gray-50"
                        disabled
                        placeholder="Auto-populated from lease"
                      />
                    </div>

                    <div>
                      <label htmlFor="bankDetails" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Bank Details
                      </label>
                      <Input
                        type="text"
                        id="bankDetails"
                        name="bankDetails"
                        value={formData.bankDetails}
                        className="bg-gray-50"
                        disabled
                        placeholder="Auto-populated from lease"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="comments" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Comments {formData.paymentType === "Bill Payment" || formData.paymentType === "Other" ? <span className="text-red-500">*</span> : null}
                      </label>
                      <Textarea
                        id="comments"
                        name="comments"
                        value={formData.comments}
                        onChange={handleInputChange}
                        placeholder={
                          formData.paymentType === "Bill Payment" 
                            ? "What type of bill payment? Electricity, Water, Gas etc" 
                            : formData.paymentType === "Other"
                            ? "What type of payment is this for?"
                            : "Comments"
                        }
                        required={formData.paymentType === "Bill Payment" || formData.paymentType === "Other"}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="attachment" className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Attachment
                      </label>
                      <Input
                        type="file"
                        id="attachment"
                        name="attachment"
                        onChange={handleFileChange}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <CardFooter className="flex justify-end space-x-3 px-0 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={isSubmitting ? "opacity-75 cursor-not-allowed" : ""}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Payment"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </CardContent>
            </Card>
          )}
          
          {showDeleteForm && paymentToDelete && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Delete Rent Payment</h2>
                
                {/* Delete error message */}
                {deleteError && (
                  <AlertMessage
                    variant="error"
                    message={deleteError}
                  />
                )}
                
                {/* Delete success message */}
                {deleteSuccess && (
                  <AlertMessage
                    variant="success"
                    message={deleteSuccess}
                  />
                )}
                
                <form onSubmit={handleDeleteSubmit}>
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-700 mb-2">Payment Details</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Unit</p>
                          <p className="text-sm font-medium">{paymentToDelete.unitNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Tenant</p>
                          <p className="text-sm font-medium">{paymentToDelete.tenantName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Rental Period</p>
                          <p className="text-sm font-medium">
                            {(() => {
                              const [year, month] = paymentToDelete.rentalPeriod.split('-');
                              const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                              return `${months[parseInt(month, 10) - 1]} ${year}`;
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Amount</p>
                          <p className="text-sm font-medium">₹{paymentToDelete.actualRent.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="deleteReason" className="block text-sm font-medium text-gray-700 mb-1">
                      Reason For Deletion <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="deleteReason"
                      name="deleteReason"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      rows={3}
                      className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Please provide a reason for deleting this payment record"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeleting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      {isDeleting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        "Delete Payment"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete this rent payment? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      "Yes, Delete Payment"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
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
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : sortedPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('unitNumber')}
                      >
                        <div className="flex items-center">
                          Unit
                          <span className="ml-2">
                            {sortColumn === 'unitNumber' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-blue-500" />
                              )
                            ) : (
                              <ArrowDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('tenantName')}
                      >
                        <div className="flex items-center">
                          Tenant
                          <span className="ml-2">
                            {sortColumn === 'tenantName' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-blue-500" />
                              )
                            ) : (
                              <ArrowDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('paymentType')}
                      >
                        <div className="flex items-center">
                          Payment Type
                          <span className="ml-2">
                            {sortColumn === 'paymentType' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-blue-500" />
                              )
                            ) : (
                              <ArrowDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('rentalPeriod')}
                      >
                        <div className="flex items-center">
                          Rental Period
                          <span className="ml-2">
                            {sortColumn === 'rentalPeriod' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-blue-500" />
                              )
                            ) : (
                              <ArrowDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('officialRent')}
                      >
                        <div className="flex items-center">
                          Expected
                          <span className="ml-2">
                            {sortColumn === 'officialRent' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-blue-500" />
                              )
                            ) : (
                              <ArrowDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('actualRent')}
                      >
                        <div className="flex items-center">
                          Collected
                          <span className="ml-2">
                            {sortColumn === 'actualRent' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-blue-500" />
                              )
                            ) : (
                              <ArrowDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center">
                          Date Recorded
                          <span className="ml-2">
                            {sortColumn === 'createdAt' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-blue-500" />
                              )
                            ) : (
                              <ArrowDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedPayments.map((payment) => {
                      // Parse the rentalPeriod directly without creating a Date object
                      const [year, month] = payment.rentalPeriod.split('-');
                      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      const formattedRentalPeriod = `${months[parseInt(month, 10) - 1]} ${year}`;
                      const isShort = payment.actualRent < payment.officialRent;
                      
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{payment.unitNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{payment.tenantName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{payment.paymentType || "Rent Payment"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">{formattedRentalPeriod}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{payment.officialRent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${isShort ? "text-red-600" : "text-green-600"}`}>
                              ₹{payment.actualRent.toLocaleString()}
                              {isShort && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Short by ₹{(payment.officialRent - payment.actualRent).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.createdAt instanceof Date 
                              ? payment.createdAt.toLocaleDateString()
                              : payment.createdAt.toDate 
                                ? payment.createdAt.toDate().toLocaleDateString()
                                : new Date(payment.createdAt.seconds * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => initiateDeletePayment(payment)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No rent payments found</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Try adjusting your search" : "Get started by recording a payment"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 