"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, getDocs, query, orderBy, where, addDoc, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { DollarSign, Search, Plus, Calendar, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { getActiveLeaseForUnit, getRentalInventoryDetails } from "../../../lib/firebase/firestoreUtils";
import logger from "../../../lib/logger";
import { AlertMessage } from "@/components/ui/alert-message";

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
  rentalPeriod: string;
  comments: string;
  createdAt: any;
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
  
  // Form state
  const [formData, setFormData] = useState({
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
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [sortColumn, setSortColumn] = useState<'rentalPeriod' | 'createdAt'>('rentalPeriod');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Consolidated alert message state
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

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
          setFormData({
            ...formData,
            leaseId: value,
            unitId: selectedLease.unitId,
            unitNumber: selectedLease.unitNumber,
            tenantName: selectedLease.tenantName,
            officialRent: selectedLease.rentAmount.toString(),
            actualRent: selectedLease.rentAmount.toString(),
            ownerDetails: "", // Will be populated from inventory details
            bankDetails: "", // Will be populated from inventory details
          });
          
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
    
    // Check rent amount when actualRent changes
    if (name === "actualRent" && value && formData.officialRent) {
      const actualRent = parseFloat(value);
      const officialRent = parseFloat(formData.officialRent);
      
      if (actualRent > officialRent * 1.2) {
        setRentWarning("The rent collected is 20% higher than expected. Please verify if this is correct. Consider adding a comment to explain the difference.");
      } else if (actualRent < officialRent * 0.8) {
        setRentWarning("The rent collected is 20% lower than expected. Please verify if this is correct. Consider adding a comment to explain the difference.");
      } else {
        setRentWarning("");
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    
    try {
      logger.info("RentPage: Submitting rent payment form...");
      
      // Validate form
      if (!formData.leaseId || !formData.actualRent || !formData.rentalPeriod || !formData.paymentDate) {
        const error = "Please fill in all required fields";
        logger.error(`RentPage: Form validation error: ${error}`);
        throw new Error(error);
      }
      
      // Check if payment date is in the future
      const selectedDate = new Date(formData.paymentDate);
      const currentDate = new Date();
      
      if (selectedDate > currentDate) {
        const error = "Rent paid date cannot be in the future";
        logger.error(`RentPage: Form validation error: ${error}`);
        throw new Error(error);
      }
      
      // Add rent payment to Firestore
      const paymentData = {
        leaseId: formData.leaseId,
        unitId: formData.unitId,
        unitNumber: formData.unitNumber,
        tenantName: formData.tenantName,
        officialRent: formData.officialRent ? parseFloat(formData.officialRent) : 0,
        actualRentPaid: parseFloat(formData.actualRent),
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
          rentalPeriod: paymentData.rentalPeriod,
          comments: paymentData.comments || "",
          createdAt: paymentData.createdAt
        },
        ...rentPayments,
      ]);
      
      setSuccessMessage("Rent payment recorded successfully!");
      
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
    const matchesSearch = 
      payment.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleSort = (column: 'rentalPeriod' | 'createdAt') => {
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
    if (sortColumn === 'rentalPeriod') {
      const [yearA, monthA] = a.rentalPeriod.split('-').map(Number);
      const [yearB, monthB] = b.rentalPeriod.split('-').map(Number);
      
      const dateA = new Date(yearA, monthA - 1);
      const dateB = new Date(yearB, monthB - 1);
      
      return sortDirection === 'asc' 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    } else {
      const dateA = a.createdAt instanceof Date 
        ? a.createdAt.getTime()
        : a.createdAt.toDate 
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt.seconds * 1000).getTime();
      
      const dateB = b.createdAt instanceof Date 
        ? b.createdAt.getTime()
        : b.createdAt.toDate 
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt.seconds * 1000).getTime();
      
      return sortDirection === 'asc'
        ? dateA - dateB
        : dateB - dateA;
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
        
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Rent Management</h1>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showAddForm ? (
                <>
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Record Rent Payment
                </>
              )}
            </button>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          {showAddForm && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Record Rent Payment</h2>
                
                {/* Form error message */}
                {formError && (
                  <AlertMessage
                    variant="error"
                    message={formError}
                  />
                )}
                
                {/* Success message */}
                {successMessage && (
                  <AlertMessage
                    variant="success"
                    message={successMessage}
                  />
                )}
                
                {/* Rent warning message */}
                {rentWarning && (
                  <AlertMessage
                    variant="warning"
                    message={rentWarning}
                  />
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="leaseId" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="leaseId"
                        name="leaseId"
                        value={formData.leaseId}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select a unit</option>
                        {activeLeases.map((lease) => (
                          <option key={lease.id} value={lease.id}>
                            {lease.unitNumber} - {lease.tenantName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="rentalPeriod" className="block text-sm font-medium text-gray-700 mb-1">
                        Rental Period <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="rentalPeriod"
                        name="rentalPeriod"
                        value={formData.rentalPeriod}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      >
                        {rentalPeriodOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700 mb-1">
                        Tenant Name
                      </label>
                      <input
                        type="text"
                        id="tenantName"
                        name="tenantName"
                        value={formData.tenantName}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                        placeholder="Auto-populated from lease"
                        disabled
                      />
                    </div>

                    <div>
                      <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Rent Paid Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="paymentDate"
                        name="paymentDate"
                        value={formData.paymentDate}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Select date"
                        max={format(new Date(), "yyyy-MM-dd")}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="officialRent" className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Rent (₹)
                      </label>
                      <input
                        type="text"
                        id="officialRent"
                        name="officialRent"
                        value={formData.officialRent}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                        placeholder="Auto-populated from lease"
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="actualRent" className="block text-sm font-medium text-gray-700 mb-1">
                        Rent Collected (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="actualRent"
                        name="actualRent"
                        value={formData.actualRent}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="ownerDetails" className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Owner
                      </label>
                      <input
                        type="text"
                        id="ownerDetails"
                        name="ownerDetails"
                        value={formData.ownerDetails}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                        placeholder="Auto-populated from lease"
                        disabled
                      />
                    </div>

                    <div>
                      <label htmlFor="bankDetails" className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Details
                      </label>
                      <input
                        type="text"
                        id="bankDetails"
                        name="bankDetails"
                        value={formData.bankDetails}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                        placeholder="Auto-populated from lease"
                        disabled
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                        Comments
                      </label>
                      <textarea
                        id="comments"
                        name="comments"
                        value={formData.comments}
                        onChange={handleInputChange}
                        rows={3}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                      }`}
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
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tenant
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expected Rent
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rent Collected
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
                  {searchTerm ? "Try adjusting your search" : "Get started by recording a rent payment"}
                </p>
                {!searchTerm && !showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Record Rent Payment
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 