"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../lib/hooks/useAuth";
import { useLandlordId } from "../../../../lib/hooks/useLandlordId";
import Navigation from "../../../../components/Navigation";
import { collection, getDocs, query, orderBy, where, addDoc, doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase/firebase";
import { DollarSign, Search, Plus, Calendar, Check, X, Trash2, Pencil, Loader2 } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { getActiveLeaseForUnit, getRentalInventoryDetails, isPaymentEditable } from "../../../../lib/firebase/firestoreUtils";
import logger from "../../../../lib/logger";
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

export default function PaymentFormsPage() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordIdLoading, error: landlordIdError } = useLandlordId();
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Suspense fallback={
        <div className="md:ml-64 p-4 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading...</span>
        </div>
      }>
        <PaymentFormsContent />
      </Suspense>
    </div>
  );
}

function PaymentFormsContent() {
  const searchParams = useSearchParams();
  const editingPaymentId = searchParams.get("edit");
  const deletingPaymentId = searchParams.get("delete");
  const viewingPaymentId = searchParams.get("view");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordIdLoading, error: landlordIdError } = useLandlordId();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [paymentToDelete, setPaymentToDelete] = useState<RentPayment | null>(null);
  
  // Add form state
  const [formData, setFormData] = useState<FormData>({
    leaseId: "",
    unitId: "",
    unitNumber: "",
    tenantName: "",
    officialRent: "",
    actualRent: "",
    rentalPeriod: format(subMonths(new Date(), 1), "yyyy-MM"),
    paymentDate: "",
    ownerDetails: "",
    bankDetails: "",
    comments: "",
    paymentType: "",
    collectionMethod: "",
    attachment: null,
  });
  
  // State for form operations
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [rentWarning, setRentWarning] = useState("");
  
  // Delete form state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  
  // Consolidated alert message state
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Function to get unique payment types from the data
  function getUniquePaymentTypes() {
    // Always include these default types in the specified order
    const defaultTypes = ["Rent Payment", "Bill Payment", "Maintenance Fee", "Other"];
    
    // Return with default types in specified order
    return defaultTypes;
  }
  
  const uniquePaymentTypes = getUniquePaymentTypes();

  // Generate rental period options (4 months before and after current month)
  const rentalPeriodOptions = [];
  const currentDate = new Date();
  
  for (let i = -4; i <= 4; i++) {
    const date = i < 0 ? subMonths(currentDate, Math.abs(i)) : addMonths(currentDate, i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy");
    
    rentalPeriodOptions.push({ value, label });
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Alert message timer
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 3000); // 3 seconds

      // Cleanup timer on component unmount or when alertMessage changes
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Fetch active leases
  useEffect(() => {
    const fetchLeases = async () => {
      if (!landlordId) return;
      try {
        setIsLoading(true);
        logger.info("PaymentFormsPage: Fetching active leases...");

        // Fetch active leases
        const leasesQuery = query(
          collection(db, `landlords/${landlordId}/leases`),
          where("isActive", "==", true),
          orderBy("unitId")
        );
        const leasesSnapshot = await getDocs(leasesQuery);
        
        const leasesData: Lease[] = [];
        leasesSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Get a more user-friendly unit number
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
        logger.info(`PaymentFormsPage: Found ${leasesData.length} active leases.`);

      } catch (error) {
        console.error("Error fetching leases:", error);
        logger.error(`PaymentFormsPage: Error fetching leases: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAlertMessage({ type: 'error', message: 'Failed to load lease data.' });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && landlordId && !landlordIdLoading) {
      fetchLeases();
    } else if (landlordIdError) {
      setAlertMessage({ type: 'error', message: `Failed to load landlord details: ${landlordIdError}` });
      setIsLoading(false);
    }
  }, [user, landlordId, landlordIdLoading, landlordIdError]);

  // Load editing payment data if editingPaymentId is provided
  useEffect(() => {
    const fetchPaymentForEditing = async () => {
      if (!landlordId || !editingPaymentId) return;
      
      try {
        setIsLoading(true);
        logger.info(`PaymentFormsPage: Fetching payment data for editing: ${editingPaymentId}`);
        
        const paymentDocRef = doc(db, `landlords/${landlordId}/rent-collection`, editingPaymentId);
        const paymentDoc = await getDoc(paymentDocRef);
        
        if (!paymentDoc.exists()) {
          throw new Error("Payment record not found");
        }
        
        const paymentData = paymentDoc.data();
        
        // Convert date objects to string format for form
        const paymentDate = paymentData.paymentDate 
          ? (paymentData.paymentDate instanceof Date 
              ? format(paymentData.paymentDate, 'yyyy-MM-dd')
              : format(paymentData.paymentDate.toDate(), 'yyyy-MM-dd')) 
          : '';
        
        // Update form data with payment details
        setFormData({
          leaseId: paymentData.leaseId || "",
          unitId: paymentData.unitId || "",
          unitNumber: paymentData.unitNumber || "",
          tenantName: paymentData.tenantName || "",
          officialRent: paymentData.officialRent?.toString() || "",
          actualRent: paymentData.actualRentPaid?.toString() || "",
          rentalPeriod: paymentData.rentalPeriod || format(subMonths(new Date(), 1), "yyyy-MM"),
          paymentDate: paymentDate,
          ownerDetails: paymentData.ownerDetails || "",
          bankDetails: paymentData.bankDetails || "",
          comments: paymentData.comments || "",
          paymentType: paymentData.paymentType || "Rent Payment",
          collectionMethod: paymentData.collectionMethod || "",
          attachment: null,
        });
        
        logger.info(`PaymentFormsPage: Successfully loaded payment data for editing`);
        
      } catch (error) {
        console.error("Error fetching payment for editing:", error);
        logger.error(`PaymentFormsPage: Error fetching payment for editing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAlertMessage({ type: 'error', message: 'Failed to load payment data for editing.' });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && landlordId && editingPaymentId) {
      fetchPaymentForEditing();
    }
  }, [user, landlordId, editingPaymentId]);

  // Load deleting payment data if deletingPaymentId is provided
  useEffect(() => {
    const fetchPaymentForDeleting = async () => {
      if (!landlordId || !deletingPaymentId) return;
      
      try {
        setIsLoading(true);
        logger.info(`PaymentFormsPage: Fetching payment data for deletion: ${deletingPaymentId}`);
        
        const paymentDocRef = doc(db, `landlords/${landlordId}/rent-collection`, deletingPaymentId);
        const paymentDoc = await getDoc(paymentDocRef);
        
        if (!paymentDoc.exists()) {
          throw new Error("Payment record not found");
        }
        
        const data = paymentDoc.data();
        
        // Create RentPayment object from the document data
        const payment: RentPayment = {
          id: paymentDoc.id,
          leaseId: data.leaseId || "",
          unitNumber: data.unitNumber || "",
          tenantName: data.tenantName || "",
          officialRent: data.officialRent || 0,
          actualRent: data.actualRentPaid || 0,
          paymentType: data.paymentType || "Rent Payment",
          collectionMethod: data.collectionMethod || "",
          rentalPeriod: data.rentalPeriod || "",
          comments: data.comments || "",
          createdAt: data.createdAt
        };
        
        setPaymentToDelete(payment);
        
        logger.info(`PaymentFormsPage: Successfully loaded payment data for deletion`);
        
      } catch (error) {
        console.error("Error fetching payment for deletion:", error);
        logger.error(`PaymentFormsPage: Error fetching payment for deletion: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAlertMessage({ type: 'error', message: 'Failed to load payment data for deletion.' });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && landlordId && deletingPaymentId) {
      fetchPaymentForDeleting();
    }
  }, [user, landlordId, deletingPaymentId]);

  // Add after fetchPaymentForEditing useEffect
  useEffect(() => {
    const fetchPaymentForViewing = async () => {
      if (!landlordId || !viewingPaymentId) return;
      
      try {
        setIsLoading(true);
        logger.info(`PaymentFormsPage: Fetching payment data for viewing: ${viewingPaymentId}`);
        
        const paymentDocRef = doc(db, `landlords/${landlordId}/rent-collection`, viewingPaymentId);
        const paymentDoc = await getDoc(paymentDocRef);
        
        if (!paymentDoc.exists()) {
          throw new Error("Payment record not found");
        }
        
        const paymentData = paymentDoc.data();
        
        // Convert date objects to string format for form
        const paymentDate = paymentData.paymentDate 
          ? (paymentData.paymentDate instanceof Date 
              ? format(paymentData.paymentDate, 'yyyy-MM-dd')
              : format(paymentData.paymentDate.toDate(), 'yyyy-MM-dd')) 
          : '';
        
        // Update form data with payment details
        setFormData({
          leaseId: paymentData.leaseId || "",
          unitId: paymentData.unitId || "",
          unitNumber: paymentData.unitNumber || "",
          tenantName: paymentData.tenantName || "",
          officialRent: paymentData.officialRent?.toString() || "",
          actualRent: paymentData.actualRentPaid?.toString() || "",
          rentalPeriod: paymentData.rentalPeriod || format(subMonths(new Date(), 1), "yyyy-MM"),
          paymentDate: paymentDate,
          ownerDetails: paymentData.ownerDetails || "",
          bankDetails: paymentData.bankDetails || "",
          comments: paymentData.comments || "",
          paymentType: paymentData.paymentType || "Rent Payment",
          collectionMethod: paymentData.collectionMethod || "",
          attachment: null,
        });
        
        logger.info(`PaymentFormsPage: Successfully loaded payment data for viewing`);
        
      } catch (error) {
        console.error("Error fetching payment for viewing:", error);
        logger.error(`PaymentFormsPage: Error fetching payment for viewing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAlertMessage({ type: 'error', message: 'Failed to load payment data for viewing.' });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && landlordId && viewingPaymentId) {
      fetchPaymentForViewing();
    }
  }, [user, landlordId, viewingPaymentId]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "leaseId" && value) {
      try {
        // Find the selected lease
        const selectedLease = activeLeases.find(lease => lease.id === value);
        
        if (selectedLease) {
          logger.info(`PaymentFormsPage: Selected lease with ID ${value}`);
          
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
            if (!landlordId) {
              logger.error("PaymentFormsPage: Landlord ID missing, cannot fetch inventory details.");
              setFormError("Could not fetch unit details. Landlord ID missing.");
              return;
            }
            const inventoryDetails = await getRentalInventoryDetails(landlordId, selectedLease.unitId);
            
            if (inventoryDetails) {
              logger.info(`PaymentFormsPage: Retrieved inventory details for unit ${selectedLease.unitId}`);
              
              // Update form with owner and bank details
              setFormData(prevData => ({
                ...prevData,
                ownerDetails: inventoryDetails.ownerDetails || "",
                bankDetails: inventoryDetails.bankDetails || "",
              }));
            } else {
              logger.warn(`PaymentFormsPage: No inventory details found for unit ${selectedLease.unitId}`);
            }
          } catch (error) {
            console.error("Error fetching inventory details:", error);
            logger.error(`PaymentFormsPage: Error fetching inventory details: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          return;
        }
      } catch (error) {
        console.error("Error handling lease selection:", error);
        logger.error(`PaymentFormsPage: Error handling lease selection: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    if (!landlordId) {
      setFormError("Cannot save payment: Landlord ID is missing. Please refresh.");
      setIsSubmitting(false);
      return;
    }
    
    try {
      logger.info("PaymentFormsPage: Submitting payment form...");
      
      // Validate form
      if (!formData.leaseId || !formData.actualRent || !formData.rentalPeriod || !formData.paymentDate || !formData.paymentType || !formData.collectionMethod) {
        const error = "Please fill in all required fields";
        logger.error(`PaymentFormsPage: Form validation error: ${error}`);
        throw new Error(error);
      }

      // Validate amount is positive
      if (parseFloat(formData.actualRent) <= 0) {
        const error = "Amount collected must be greater than 0";
        logger.error(`PaymentFormsPage: Form validation error: ${error}`);
        throw new Error(error);
      }
      
      // Check if payment date is in the future
      const selectedDate = new Date(formData.paymentDate);
      const currentDate = new Date();
      
      if (selectedDate > currentDate) {
        const error = "Payment date cannot be in the future";
        logger.error(`PaymentFormsPage: Form validation error: ${error}`);
        throw new Error(error);
      }
      
      // Prepare payment data
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
        updatedAt: new Date(),
      };
      
      // If editing an existing payment
      if (editingPaymentId) {
        const paymentDocRef = doc(db, `landlords/${landlordId}/rent-collection`, editingPaymentId);
        await updateDoc(paymentDocRef, {
          ...paymentData,
          updatedAt: new Date()
        });
        logger.info(`PaymentFormsPage: Payment updated successfully with ID: ${editingPaymentId}`);
        
        setSuccessMessage("Payment updated successfully!");
        setAlertMessage({
          type: 'success',
          message: 'Payment updated successfully!'
        });
        
        // Redirect back to main payments page after a short delay
        setTimeout(() => {
          router.push("/dashboard/payments");
        }, 500);
      } 
      // Creating a new payment
      else {
        const docRef = await addDoc(collection(db, `landlords/${landlordId}/rent-collection`), {
          ...paymentData,
          createdAt: new Date()
        });
        
        logger.info(`PaymentFormsPage: Payment added successfully with ID: ${docRef.id}`);
        
        setSuccessMessage(`${formData.paymentType} recorded successfully!`);
        setAlertMessage({
          type: 'success',
          message: `${formData.paymentType} recorded successfully!`
        });
        
        // Redirect back to main payments page after a short delay
        setTimeout(() => {
          router.push("/dashboard/payments");
        }, 500);
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      setFormError(error instanceof Error ? error.message : "An error occurred while recording the payment");
      logger.error(`PaymentFormsPage: Error recording payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deleteReason.trim()) {
      setDeleteError("Please provide a reason for deletion");
      return;
    }
    
    // Show confirmation dialog
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;

    if (!landlordId) {
      setDeleteError("Cannot delete payment: Landlord ID is missing. Please refresh.");
      return;
    }
    
    setIsDeleting(true);
    setDeleteError("");
    
    try {
      logger.info(`PaymentFormsPage: Deleting payment ${paymentToDelete.id}...`);
      
      // First, get the complete payment data
      const paymentDocRef = doc(db, `landlords/${landlordId}/rent-collection`, paymentToDelete.id);
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
      
      await addDoc(collection(db, `landlords/${landlordId}/deleted-rents`), deletedRentData);
      logger.info(`PaymentFormsPage: Added payment to deleted-rents collection`);
      
      // Delete from rent-collection
      await deleteDoc(paymentDocRef);
      logger.info(`PaymentFormsPage: Deleted payment from rent-collection`);
      
      // Show success message
      setDeleteSuccess("Payment successfully deleted");
      setAlertMessage({
        type: 'success',
        message: 'Payment record deleted successfully'
      });
      
      // Redirect back to main payments page after a short delay
      setTimeout(() => {
        router.push("/dashboard/payments");
      }, 500);
      
    } catch (error) {
      console.error("Error deleting payment:", error);
      setDeleteError(error instanceof Error ? error.message : "An error occurred while deleting the payment");
      logger.error(`PaymentFormsPage: Error deleting payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    // Redirect back to main payments page
    router.push("/dashboard/payments");
  };

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
        
        {/* Header Card */}
        <Card className="mb-6">
          <CardHeader className="py-4 px-4 sm:px-6 lg:px-8">
            <div className="w-full flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <CardTitle className="text-2xl font-semibold text-gray-900 text-center sm:text-left">
                  {editingPaymentId ? "Edit Payment" : deletingPaymentId ? "Delete Payment" : viewingPaymentId ? "View Payment" : "Record New Payment"}
                </CardTitle>
              </div>
              <Button
                onClick={() => router.push("/dashboard/payments")}
                size="sm"
                style={{
                  backgroundColor: theme.colors.button.primary,
                  color: theme.colors.background,
                }}
                className="hover:bg-primary/90"
              >
                Back to Payments
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <main className="max-w-7xl mx-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">Loading...</span>
            </div>
          )}
          
          {/* Add/Edit Payment Form */}
          {!isLoading && !deletingPaymentId && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900">
                  {editingPaymentId ? "Edit Payment Details" : viewingPaymentId ? "View Payment Details" : "Record Payment"}
                </CardTitle>
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
                        disabled={!!editingPaymentId || !!viewingPaymentId}
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
                        disabled={!!viewingPaymentId}
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
                        disabled={!!viewingPaymentId}
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
                        readOnly
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
                        readOnly={!!viewingPaymentId}
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
                        readOnly
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
                        readOnly={!!viewingPaymentId}
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
                        disabled={!!viewingPaymentId}
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
                        readOnly
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
                        readOnly
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
                        readOnly={!!viewingPaymentId}
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
                        readOnly={!!viewingPaymentId}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <CardFooter className="flex justify-end space-x-3 px-0 pt-6">
                    {viewingPaymentId ? (
                      <Button
                        type="button"
                        onClick={() => router.push("/dashboard/payments")}
                        style={{
                          backgroundColor: theme.colors.button.primary,
                          color: theme.colors.background,
                        }}
                        className="hover:bg-primary/90"
                      >
                        Back to Payments
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.push("/dashboard/payments")}
                          style={{
                            backgroundColor: theme.colors.button.secondary,
                            color: theme.colors.button.secondaryText,
                            borderColor: theme.colors.button.secondaryBorder,
                          }}
                          className="hover:bg-secondary/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          style={{
                            backgroundColor: theme.colors.button.primary,
                            color: theme.colors.background,
                          }}
                          className={`hover:bg-primary/90 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
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
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              {editingPaymentId ? "Update Payment" : "Save Payment"}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Delete Payment Form */}
          {!isLoading && deletingPaymentId && paymentToDelete && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900">Delete Payment Record</CardTitle>
              </CardHeader>
              <CardContent>
                {deleteError && (
                  <AlertMessage
                    variant="error"
                    message={deleteError}
                    className="mb-4"
                  />
                )}
                
                {deleteSuccess && (
                  <AlertMessage
                    variant="success"
                    message={deleteSuccess}
                    className="mb-4"
                  />
                )}
                
                <form onSubmit={handleDeleteSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Unit
                      </label>
                      <Input
                        type="text"
                        value={paymentToDelete.unitNumber}
                        className="bg-gray-50"
                        style={{ 
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary 
                        }}
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Payment Type
                      </label>
                      <Input
                        type="text"
                        value={paymentToDelete.paymentType || "Rent Payment"}
                        className="bg-gray-50"
                        style={{ 
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary 
                        }}
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Payment Period
                      </label>
                      <Input
                        type="text"
                        value={(() => {
                          const [year, month] = paymentToDelete.rentalPeriod.split('-');
                          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          return `${months[parseInt(month, 10) - 1]} ${year}`;
                        })()}
                        className="bg-gray-50"
                        style={{ 
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary 
                        }}
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Tenant Name
                      </label>
                      <Input
                        type="text"
                        value={paymentToDelete.tenantName}
                        className="bg-gray-50"
                        style={{ 
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary 
                        }}
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Expected Amount (₹)
                      </label>
                      <Input
                        type="text"
                        value={paymentToDelete.officialRent.toLocaleString()}
                        className="bg-gray-50"
                        style={{ 
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary 
                        }}
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                        Amount Collected (₹)
                      </label>
                      <Input
                        type="text"
                        value={paymentToDelete.actualRent.toLocaleString()}
                        className={`bg-gray-50 ${paymentToDelete.actualRent < paymentToDelete.officialRent ? "text-red-600" : "text-green-600"}`}
                        style={{ 
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary 
                        }}
                        disabled
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="deleteReason" className="block text-sm font-medium text-red-600 mb-1">
                        Reason For Deletion <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        id="deleteReason"
                        name="deleteReason"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        rows={3}
                        style={{ 
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary 
                        }}
                        placeholder="Please provide a reason for deleting this payment record"
                        required
                      />
                    </div>
                  </div>
                  
                  <CardFooter className="flex justify-end space-x-3 px-0 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelDelete}
                      style={{
                        backgroundColor: theme.colors.button.secondary,
                        color: theme.colors.button.secondaryText,
                        borderColor: theme.colors.button.secondaryBorder,
                      }}
                      className="hover:bg-secondary/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isDeleting}
                      style={{
                        backgroundColor: theme.colors.button.destructive,
                        color: theme.colors.background,
                      }}
                      className={`hover:bg-destructive/90 ${isDeleting ? "opacity-75 cursor-not-allowed" : ""}`}
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
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Payment
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Delete Confirmation Modal */}
          {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete this payment? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirmation(false)}
                    style={{
                      backgroundColor: theme.colors.button.secondary,
                      color: theme.colors.button.secondaryText,
                      borderColor: theme.colors.button.secondaryBorder,
                    }}
                    className="hover:bg-secondary/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    style={{
                      backgroundColor: theme.colors.button.destructive,
                      color: theme.colors.background,
                    }}
                    className={`hover:bg-destructive/90 ${isDeleting ? "opacity-75 cursor-not-allowed" : ""}`}
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
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Yes, Delete Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
