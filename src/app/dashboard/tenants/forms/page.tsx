"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../lib/hooks/useAuth";
import { useLandlordId } from "@/lib/hooks/useLandlordId";
import Navigation from "../../../../components/Navigation"; // Adjusted import path
import { Lease, RentalInventory } from "@/types";
import { 
  addLease, 
  updateLease, 
  getLeaseById, // Need a function to get a single lease
  getAllRentalInventory 
} from "@/lib/firebase/firestoreUtils"; // Adjusted import path
import { format } from 'date-fns';
import { Loader2 } from "lucide-react";
import { AlertMessage } from "@/components/ui/alert-message";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { theme } from "@/theme/theme"; // Adjusted import path
import { normalizeDate, formatDisplayDate } from '@/lib/utils/dateUtils';

// Create a FormContent component to wrap the form logic
function FormContent() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordLoading, error: landlordIdError } = useLandlordId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingLeaseId = searchParams.get("edit");
  const viewingLeaseId = searchParams.get("view");

  const [rentalInventory, setRentalInventory] = useState<RentalInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial data fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // State for form submission
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);

  // Form state
  const [unitId, setUnitId] = useState("");
  const [unitNumber, setUnitNumber] = useState(""); // Store unit number separately
  const [tenantName, setTenantName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [adhaarNumber, setAdhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState(0);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [depositMethod, setDepositMethod] = useState<'Cash' | 'Bank transfer' | 'UPI' | 'Check'>('UPI'); // Default to UPI
  const [additionalComments, setAdditionalComments] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Fetch rental inventory and potentially the lease being edited
  const loadInitialData = useCallback(async () => {
    if (!landlordId) return;
    setIsLoading(true);
    setFormError(null);
    setAlertMessage(null);

    try {
      // Fetch rental inventory for the dropdown
      const inventoryData = await getAllRentalInventory(landlordId);
      setRentalInventory(inventoryData || []);
      console.log("Rental inventory fetched for form:", inventoryData);

      // If editing or viewing, fetch the specific lease
      if (editingLeaseId || viewingLeaseId) {
        const leaseId = editingLeaseId || viewingLeaseId;
        if (!leaseId) return; // Early return if somehow both are null
        console.log(`Fetching lease data for ${editingLeaseId ? 'editing' : 'viewing'}: ${leaseId}`);
        // NOTE: getLeaseById needs to be implemented in firestoreUtils
        const leaseToEdit = await getLeaseById(landlordId, leaseId); 
        
        if (leaseToEdit) {
          console.log(`Lease data found for ${editingLeaseId ? 'editing' : 'viewing'}:`, leaseToEdit);
          setUnitId(leaseToEdit.unitId);
          setUnitNumber(leaseToEdit.unitNumber || ''); // Ensure unitNumber is set
          setTenantName(leaseToEdit.tenantName);
          setCountryCode(leaseToEdit.countryCode);
          setPhoneNumber(leaseToEdit.phoneNumber);
          setEmail(leaseToEdit.email);
          setAdhaarNumber(leaseToEdit.adhaarNumber);
          setPanNumber(leaseToEdit.panNumber || "");
          setEmployerName(leaseToEdit.employerName || "");
          setPermanentAddress(leaseToEdit.permanentAddress || "");
          setLeaseStartDate(format(normalizeDate(leaseToEdit.leaseStartDate), 'yyyy-MM-dd'));
          setLeaseEndDate(format(normalizeDate(leaseToEdit.leaseEndDate), 'yyyy-MM-dd'));
          setRentAmount(leaseToEdit.rentAmount);
          setSecurityDeposit(leaseToEdit.securityDeposit);
          setDepositMethod(leaseToEdit.depositMethod);
          setAdditionalComments(leaseToEdit.additionalComments || "");
          setIsActive(leaseToEdit.isActive);
        } else {
          console.error(`Lease with ID ${leaseId} not found.`);
          setFormError(`Lease with ID ${leaseId} not found. Cannot ${editingLeaseId ? 'edit' : 'view'}.`);
          // Optionally redirect or show a persistent error
        }
      } else {
        // Reset form if not editing
        resetForm();
      }
    } catch (error: any) {
      console.error("Error loading initial form data:", error);
      setAlertMessage({ type: 'error', message: `Failed to load necessary data: ${error.message}` });
      setFormError(`Failed to load data: ${error.message}`); // Show error in form area too
    } finally {
      setIsLoading(false);
    }
  }, [landlordId, editingLeaseId, viewingLeaseId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (user && landlordId && !landlordLoading) {
      loadInitialData();
    } else if (landlordIdError) {
      setAlertMessage({ type: 'error', message: `Failed to get landlord ID: ${landlordIdError}` });
      setIsLoading(false);
    }
  }, [user, authLoading, landlordId, landlordLoading, landlordIdError, router, loadInitialData]);

  // Scroll to form error when it appears
  useEffect(() => {
    if (formError && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [formError]);

  // Helper function to get unit number from inventory based on unitId
  const getUnitNumber = useCallback((id: string) => {
     if (!id) return "";
     const unit = rentalInventory.find(item => item.id === id);
     return unit ? unit.unitNumber : "";
  }, [rentalInventory]);

  const resetForm = () => {
    setUnitId("");
    setUnitNumber("");
    setTenantName("");
    setCountryCode("+91");
    setPhoneNumber("");
    setEmail("");
    setAdhaarNumber("");
    setPanNumber("");
    setEmployerName("");
    setPermanentAddress("");
    setLeaseStartDate("");
    setLeaseEndDate("");
    setRentAmount(0);
    setSecurityDeposit(0);
    setDepositMethod("UPI");
    setAdditionalComments("");
    setIsActive(true);
    setFormError(null);
    // Keep editingLeaseId as is, don't reset it here
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true); // Indicate submission start

    // Form validation (same as before)
    if (!landlordId) {
      setFormError("Landlord ID is missing. Please log in again.");
      setIsSubmitting(false);
      return;
    }
    if (!unitId) {
      setFormError("Unit Number is required");
      setIsSubmitting(false);
      return;
    }
    if (!tenantName.trim()) {
      setFormError("Tenant Name is required");
      setIsSubmitting(false);
      return;
    }
    if (!phoneNumber.trim() || !countryCode.trim()) {
      setFormError("Phone number and country code are required");
      setIsSubmitting(false);
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setFormError("Valid email address is required");
      setIsSubmitting(false);
      return;
    }
    if (!adhaarNumber.trim() || !/^\d{12}$/.test(adhaarNumber.trim())) {
      setFormError("Adhaar Number must be 12 digits with no spaces");
      setIsSubmitting(false);
      return;
    }
     if (!leaseStartDate) {
      setFormError("Lease start date is required");
      setIsSubmitting(false);
      return;
    }
    if (!leaseEndDate) {
      setFormError("Lease end date is required");
      setIsSubmitting(false);
      return;
    }
    if (new Date(normalizeDate(leaseStartDate)) >= new Date(normalizeDate(leaseEndDate))) {
      setFormError("Lease end date must be after start date");
      setIsSubmitting(false);
      return;
    }
    if (rentAmount < 0) {
      setFormError("Rent amount must be a positive number");
      setIsSubmitting(false);
      return;
    }
    if (securityDeposit < 0) {
      setFormError("Security deposit must be a positive number");
      setIsSubmitting(false);
      return;
    }

    // NOTE: Check for conflicting active lease logic needs to be handled server-side or re-fetched before submission if critical.
    // For simplicity in the form, we rely on the updateLease/addLease logic in firestoreUtils to potentially handle this,
    // although it's better to check beforehand.

    const finalUnitNumber = unitNumber || getUnitNumber(unitId); // Ensure unit number is derived

    try {
      const leaseData: Omit<Lease, 'id' | 'createdAt' | 'updatedAt'> = {
        landlordId,
        unitId,
        unitNumber: finalUnitNumber, // Use derived unit number
        tenantName: tenantName.trim(),
        countryCode: countryCode.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        adhaarNumber: adhaarNumber.trim(),
        panNumber: panNumber.trim() || "",
        employerName: employerName.trim() || "",
        permanentAddress: permanentAddress.trim() || "",
        leaseStartDate: normalizeDate(leaseStartDate),
        leaseEndDate: normalizeDate(leaseEndDate),
        rentAmount,
        securityDeposit,
        depositMethod,
        additionalComments: additionalComments.trim() || "",
        isActive,
      };

      if (editingLeaseId) {
        console.log("Attempting to update lease:", editingLeaseId, leaseData);
        await updateLease(landlordId, editingLeaseId, leaseData);
        console.log("Lease updated successfully");
        // Optionally set a success message before redirecting
        // setAlertMessage({ type: 'success', message: 'Lease updated successfully!' });
      } else {
        console.log("Attempting to add new lease:", leaseData);
        await addLease(landlordId, leaseData);
        console.log("Lease added successfully");
         // Optionally set a success message before redirecting
        // setAlertMessage({ type: 'success', message: 'Lease added successfully!' });
      }

      // Navigate back to the tenants list page on success
      router.push("/dashboard/tenants");

    } catch (error: any) {
      console.error("Error submitting lease form:", error);
      setFormError(error.message || `An error occurred while ${editingLeaseId ? 'updating' : 'saving'} the lease`);
    } finally {
      setIsSubmitting(false); // Indicate submission end
    }
  };

   if (authLoading || landlordLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex flex-1 items-center justify-center md:ml-64 p-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="ml-4 text-lg">Loading form data...</p>
        </div>
      </div>
    );
  }

  if (!user || !landlordId) {
     // Redirect or show message if auth fails after loading
     return (
        <div className="flex flex-col min-h-screen">
            <Navigation />
            <div className="flex flex-1 items-center justify-center md:ml-64 p-4">
                <p className="text-lg text-red-600">Authentication error or Landlord ID missing. Please log in.</p>
            </div>
        </div>
     );
  }

  const displayUnitNumberForTitle = unitNumber || getUnitNumber(unitId) || 'No Unit Selected';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="md:ml-64 p-4">
        {/* Global Alert Message Area */}
        {alertMessage && (
          <div className="max-w-4xl mx-auto mb-6">
            <AlertMessage
              variant={alertMessage.type}
              message={alertMessage.message}
            />
          </div>
        )}

        <main className="max-w-4xl mx-auto">
          <Card ref={formRef} className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingLeaseId ? `Edit Lease for Unit ${displayUnitNumberForTitle}` : 
                 viewingLeaseId ? `View Lease for Unit ${displayUnitNumberForTitle}` : 
                 unitId ? `Add New Lease for Unit ${displayUnitNumberForTitle}` : 'Add New Lease'}
              </CardTitle>
            </CardHeader>

            <CardContent className="px-2 sm:px-6">
              {formError && (
                <AlertMessage
                  variant="error"
                  message={formError}
                  className="mb-6"
                />
              )}

              {/* Form and Buttons */}
              {viewingLeaseId ? (
                <>
                  <form className="space-y-6">
                {/* Unit Information Card */}
                <Card className="bg-surface border-border">
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="text-base">Unit Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 px-3 sm:px-6">
                    <div className="col-span-1">
                      <label htmlFor="unitId" className="block text-sm font-medium text-textSecondary mb-1">
                        Unit Number *
                      </label>
                      <select
                        id="unitId"
                        value={unitId}
                        onChange={(e) => {
                          const selectedUnitId = e.target.value;
                          setUnitId(selectedUnitId);
                          // Update unitNumber state when selection changes
                          const selectedUnit = rentalInventory.find(unit => unit.id === selectedUnitId);
                          setUnitNumber(selectedUnit ? selectedUnit.unitNumber : '');
                        }}
                        // Disable if editing or viewing
                        disabled={editingLeaseId !== null || viewingLeaseId !== null}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pl-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                        required
                      >
                        <option value="">Select a unit</option>
                        {rentalInventory && rentalInventory.length > 0 ? (
                          rentalInventory
                            // Sort units alpha-numerically by unitNumber for better UX
                            .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }))
                            .map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.unitNumber} ({unit.propertyType})
                              </option>
                            ))
                        ) : (
                          <option value="" disabled>No rental units available</option>
                        )}
                      </select>
                      {editingLeaseId && (
                        <p className="mt-1 text-xs text-textSecondary">Unit cannot be changed when editing a lease.</p>
                      )}
                      {!editingLeaseId && rentalInventory.length === 0 && (
                         <p className="mt-1 text-xs text-amber-700">No rental units found. Please add properties in the Property Management section first.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tenant Information Card */}
                <Card className="bg-surface border-border">
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="text-base">Tenant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 sm:px-6">
                    {/* Fields: tenantName, email, phone (code + number), adhaar, pan, employer, address */}
                    <div className="col-span-1">
                      <label htmlFor="tenantName" className="block text-sm font-medium text-textSecondary mb-1">
                        Tenant Name *
                      </label>
                      <Input
                        type="text"
                        id="tenantName"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        readOnly={!!viewingLeaseId}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="email" className="block text-sm font-medium text-textSecondary mb-1">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        readOnly={!!viewingLeaseId}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                       <label className="block text-sm font-medium text-textSecondary mb-1">Phone Number *</label>
                       <div className="flex w-full gap-2">
                         <div className="w-[25%] sm:min-w-[4.5rem] sm:w-[20%]">
                           <Input
                             type="text"
                             id="countryCode"
                             value={countryCode}
                             onChange={(e) => setCountryCode(e.target.value)}
                             readOnly={!!viewingLeaseId}
                             placeholder="+91"
                             className="!px-2 text-center"
                             required
                             aria-label="Country Code"
                           />
                         </div>
                         <div className="w-[75%] sm:flex-1">
                           <Input
                             type="tel" // Use tel type for phone numbers
                             id="phoneNumber"
                             value={phoneNumber}
                             onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} // Allow only digits
                             readOnly={!!viewingLeaseId}
                             placeholder="9876543210"
                             required
                             aria-label="Phone Number"
                           />
                         </div>
                       </div>
                     </div>

                    <div className="col-span-1">
                      <label htmlFor="adhaarNumber" className="block text-sm font-medium text-textSecondary mb-1">
                        Adhaar Number *
                      </label>
                      <Input
                        type="text"
                        id="adhaarNumber"
                        value={adhaarNumber}
                        onChange={(e) => setAdhaarNumber(e.target.value.replace(/\D/g, ''))} // Allow only digits
                        readOnly={!!viewingLeaseId}
                        placeholder="XXXXXXXXXXXX (12 digits)"
                        pattern="\d{12}" // HTML5 pattern validation
                        maxLength={12}
                        title="Adhaar number must be exactly 12 digits"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="panNumber" className="block text-sm font-medium text-textSecondary mb-1">
                        PAN Number
                      </label>
                      <Input
                        type="text"
                        id="panNumber"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())} // Convert to uppercase
                        readOnly={!!viewingLeaseId}
                        placeholder="Optional"
                        maxLength={10} // PAN is 10 chars
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="employerName" className="block text-sm font-medium text-textSecondary mb-1">
                        Employer Name
                      </label>
                      <Input
                        type="text"
                        id="employerName"
                        value={employerName}
                        onChange={(e) => setEmployerName(e.target.value)}
                        readOnly={!!viewingLeaseId}
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="permanentAddress" className="block text-sm font-medium text-textSecondary mb-1">
                        Permanent Address
                      </label>
                      <Textarea
                        id="permanentAddress"
                        value={permanentAddress}
                        onChange={(e) => setPermanentAddress(e.target.value)}
                        readOnly={!!viewingLeaseId}
                        rows={3}
                        placeholder="Optional"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Lease Details Card */}
                <Card className="bg-surface border-border">
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="text-base">Lease Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 sm:px-6">
                    {/* Fields: start/end date, rent, deposit, method, status, comments */}
                    <div className="col-span-1">
                      <label htmlFor="leaseStartDate" className="block text-sm font-medium text-textSecondary mb-1">
                        Lease Start Date *
                      </label>
                      <Input
                        type="date"
                        id="leaseStartDate"
                        value={leaseStartDate}
                        onChange={(e) => setLeaseStartDate(e.target.value)}
                        readOnly={!!viewingLeaseId}
                        required
                        className="bg-white" // Ensure date picker background is white
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="leaseEndDate" className="block text-sm font-medium text-textSecondary mb-1">
                        Lease End Date *
                      </label>
                      <Input
                        type="date"
                        id="leaseEndDate"
                        value={leaseEndDate}
                        onChange={(e) => setLeaseEndDate(e.target.value)}
                        readOnly={!!viewingLeaseId}
                        required
                        className="bg-white" // Ensure date picker background is white
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="rentAmount" className="block text-sm font-medium text-textSecondary mb-1">
                        Monthly Rent Amount (₹) *
                      </label>
                      <Input
                        type="text" // Use text to allow formatting, parse as number
                        id="rentAmount"
                        value={rentAmount === 0 ? '' : rentAmount.toLocaleString('en-IN')} // Format for display
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : Number(value.replace(/[^0-9]/g, '')); // Parse number
                          setRentAmount(isNaN(numValue) ? 0 : numValue);
                        }}
                        readOnly={!!viewingLeaseId}
                        placeholder="Enter rent amount"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="securityDeposit" className="block text-sm font-medium text-textSecondary mb-1">
                        Security Deposit (₹) *
                      </label>
                      <Input
                        type="text" // Use text to allow formatting, parse as number
                        id="securityDeposit"
                        value={securityDeposit === 0 ? '' : securityDeposit.toLocaleString('en-IN')} // Format for display
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : Number(value.replace(/[^0-9]/g, '')); // Parse number
                          setSecurityDeposit(isNaN(numValue) ? 0 : numValue);
                        }}
                        readOnly={!!viewingLeaseId}
                        placeholder="Enter security deposit"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="depositMethod" className="block text-sm font-medium text-textSecondary mb-1">
                        Deposit Payment Method *
                      </label>
                      <select
                        id="depositMethod"
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value as 'Cash' | 'Bank transfer' | 'UPI' | 'Check')}
                        disabled={!!viewingLeaseId}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pl-3 py-2 bg-white"
                        required
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Check">Check</option>
                      </select>
                    </div>

                    <div className="col-span-1">
                       <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">
                         Lease Status
                       </label>
                       <div className="mt-2">
                         <div className="flex flex-col items-start">
                           <label className="inline-flex relative items-center cursor-pointer">
                             <input
                               type="checkbox"
                               className="sr-only peer"
                               checked={isActive}
                               onChange={(e) => setIsActive(e.target.checked)}
                               disabled={!!viewingLeaseId}
                             />
                             <div className="w-11 h-6 bg-[rgb(209,209,214)] rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:bg-[rgb(48,209,88)] transition-colors duration-300"></div>
                           </label>
                           <span className="text-xs text-gray-500 mt-1">
                             {isActive ? 'Active' : 'Inactive'}
                           </span>
                         </div>
                       </div>
                     </div>
                    
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="additionalComments" className="block text-sm font-medium text-textSecondary mb-1">
                        Additional Comments
                      </label>
                      <Textarea
                        id="additionalComments"
                        value={additionalComments}
                        onChange={(e) => setAdditionalComments(e.target.value)}
                        readOnly={!!viewingLeaseId}
                        rows={3}
                        placeholder="Any additional notes about this lease"
                      />
                    </div>
                  </CardContent>
                </Card>
                  </form>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => router.push('/dashboard/tenants')}
                      style={{
                        backgroundColor: theme.colors.button.primary,
                        color: theme.colors.background,
                      }}
                      className="hover:bg-primary/90"
                    >
                      Back to Tenants
                    </Button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Unit Information Card */}
                  <Card className="bg-surface border-border">
                    <CardHeader className="px-3 sm:px-6">
                      <CardTitle className="text-base">Unit Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 px-3 sm:px-6">
                      <div className="col-span-1">
                        <label htmlFor="unitId" className="block text-sm font-medium text-textSecondary mb-1">
                          Unit Number *
                        </label>
                        <select
                          id="unitId"
                          value={unitId}
                          onChange={(e) => {
                            const selectedUnitId = e.target.value;
                            setUnitId(selectedUnitId);
                            // Update unitNumber state when selection changes
                            const selectedUnit = rentalInventory.find(unit => unit.id === selectedUnitId);
                            setUnitNumber(selectedUnit ? selectedUnit.unitNumber : '');
                          }}
                          // Disable if editing or viewing
                          disabled={editingLeaseId !== null || viewingLeaseId !== null}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pl-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                          required
                        >
                          <option value="">Select a unit</option>
                          {rentalInventory && rentalInventory.length > 0 ? (
                            rentalInventory
                              // Sort units alpha-numerically by unitNumber for better UX
                              .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }))
                              .map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.unitNumber} ({unit.propertyType})
                                </option>
                              ))
                          ) : (
                            <option value="" disabled>No rental units available</option>
                          )}
                        </select>
                        {editingLeaseId && (
                          <p className="mt-1 text-xs text-textSecondary">Unit cannot be changed when editing a lease.</p>
                        )}
                        {!editingLeaseId && rentalInventory.length === 0 && (
                           <p className="mt-1 text-xs text-amber-700">No rental units found. Please add properties in the Property Management section first.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tenant Information Card */}
                  <Card className="bg-surface border-border">
                    <CardHeader className="px-3 sm:px-6">
                      <CardTitle className="text-base">Tenant Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 sm:px-6">
                      {/* Fields: tenantName, email, phone (code + number), adhaar, pan, employer, address */}
                      <div className="col-span-1">
                        <label htmlFor="tenantName" className="block text-sm font-medium text-textSecondary mb-1">
                          Tenant Name *
                        </label>
                        <Input
                          type="text"
                          id="tenantName"
                          value={tenantName}
                          onChange={(e) => setTenantName(e.target.value)}
                          readOnly={!!viewingLeaseId}
                          placeholder="Full name"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="email" className="block text-sm font-medium text-textSecondary mb-1">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          readOnly={!!viewingLeaseId}
                          placeholder="email@example.com"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                         <label className="block text-sm font-medium text-textSecondary mb-1">Phone Number *</label>
                         <div className="flex w-full gap-2">
                           <div className="w-[25%] sm:min-w-[4.5rem] sm:w-[20%]">
                             <Input
                               type="text"
                               id="countryCode"
                               value={countryCode}
                               onChange={(e) => setCountryCode(e.target.value)}
                               readOnly={!!viewingLeaseId}
                               placeholder="+91"
                               className="!px-2 text-center"
                               required
                               aria-label="Country Code"
                             />
                           </div>
                           <div className="w-[75%] sm:flex-1">
                             <Input
                               type="tel" // Use tel type for phone numbers
                               id="phoneNumber"
                               value={phoneNumber}
                               onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} // Allow only digits
                               readOnly={!!viewingLeaseId}
                               placeholder="9876543210"
                               required
                               aria-label="Phone Number"
                             />
                           </div>
                         </div>
                       </div>

                      <div className="col-span-1">
                        <label htmlFor="adhaarNumber" className="block text-sm font-medium text-textSecondary mb-1">
                          Adhaar Number *
                        </label>
                        <Input
                          type="text"
                          id="adhaarNumber"
                          value={adhaarNumber}
                          onChange={(e) => setAdhaarNumber(e.target.value.replace(/\D/g, ''))} // Allow only digits
                          readOnly={!!viewingLeaseId}
                          placeholder="XXXXXXXXXXXX (12 digits)"
                          pattern="\d{12}" // HTML5 pattern validation
                          maxLength={12}
                          title="Adhaar number must be exactly 12 digits"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="panNumber" className="block text-sm font-medium text-textSecondary mb-1">
                          PAN Number
                        </label>
                        <Input
                          type="text"
                          id="panNumber"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase())} // Convert to uppercase
                          readOnly={!!viewingLeaseId}
                          placeholder="Optional"
                          maxLength={10} // PAN is 10 chars
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="employerName" className="block text-sm font-medium text-textSecondary mb-1">
                          Employer Name
                        </label>
                        <Input
                          type="text"
                          id="employerName"
                          value={employerName}
                          onChange={(e) => setEmployerName(e.target.value)}
                          readOnly={!!viewingLeaseId}
                          placeholder="Optional"
                        />
                      </div>
                      
                      <div className="col-span-1 md:col-span-2">
                        <label htmlFor="permanentAddress" className="block text-sm font-medium text-textSecondary mb-1">
                          Permanent Address
                        </label>
                        <Textarea
                          id="permanentAddress"
                          value={permanentAddress}
                          onChange={(e) => setPermanentAddress(e.target.value)}
                          readOnly={!!viewingLeaseId}
                          rows={3}
                          placeholder="Optional"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lease Details Card */}
                  <Card className="bg-surface border-border">
                    <CardHeader className="px-3 sm:px-6">
                      <CardTitle className="text-base">Lease Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 sm:px-6">
                      {/* Fields: start/end date, rent, deposit, method, status, comments */}
                      <div className="col-span-1">
                        <label htmlFor="leaseStartDate" className="block text-sm font-medium text-textSecondary mb-1">
                          Lease Start Date *
                        </label>
                        <Input
                          type="date"
                          id="leaseStartDate"
                          value={leaseStartDate}
                          onChange={(e) => setLeaseStartDate(e.target.value)}
                          readOnly={!!viewingLeaseId}
                          required
                          className="bg-white" // Ensure date picker background is white
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="leaseEndDate" className="block text-sm font-medium text-textSecondary mb-1">
                          Lease End Date *
                        </label>
                        <Input
                          type="date"
                          id="leaseEndDate"
                          value={leaseEndDate}
                          onChange={(e) => setLeaseEndDate(e.target.value)}
                          readOnly={!!viewingLeaseId}
                          required
                          className="bg-white" // Ensure date picker background is white
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="rentAmount" className="block text-sm font-medium text-textSecondary mb-1">
                          Monthly Rent Amount (₹) *
                        </label>
                        <Input
                          type="text" // Use text to allow formatting, parse as number
                          id="rentAmount"
                          value={rentAmount === 0 ? '' : rentAmount.toLocaleString('en-IN')} // Format for display
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : Number(value.replace(/[^0-9]/g, '')); // Parse number
                            setRentAmount(isNaN(numValue) ? 0 : numValue);
                          }}
                          readOnly={!!viewingLeaseId}
                          placeholder="Enter rent amount"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="securityDeposit" className="block text-sm font-medium text-textSecondary mb-1">
                          Security Deposit (₹) *
                        </label>
                        <Input
                          type="text" // Use text to allow formatting, parse as number
                          id="securityDeposit"
                          value={securityDeposit === 0 ? '' : securityDeposit.toLocaleString('en-IN')} // Format for display
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : Number(value.replace(/[^0-9]/g, '')); // Parse number
                            setSecurityDeposit(isNaN(numValue) ? 0 : numValue);
                          }}
                          readOnly={!!viewingLeaseId}
                          placeholder="Enter security deposit"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="depositMethod" className="block text-sm font-medium text-textSecondary mb-1">
                          Deposit Payment Method *
                        </label>
                        <select
                          id="depositMethod"
                          value={depositMethod}
                          onChange={(e) => setDepositMethod(e.target.value as 'Cash' | 'Bank transfer' | 'UPI' | 'Check')}
                          disabled={!!viewingLeaseId}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pl-3 py-2 bg-white"
                          required
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank transfer">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="Check">Check</option>
                        </select>
                      </div>

                      <div className="col-span-1">
                         <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">
                           Lease Status
                         </label>
                         <div className="mt-2">
                           <div className="flex flex-col items-start">
                             <label className="inline-flex relative items-center cursor-pointer">
                               <input
                                 type="checkbox"
                                 className="sr-only peer"
                                 checked={isActive}
                                 onChange={(e) => setIsActive(e.target.checked)}
                                 disabled={!!viewingLeaseId}
                               />
                               <div className="w-11 h-6 bg-[rgb(209,209,214)] rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:bg-[rgb(48,209,88)] transition-colors duration-300"></div>
                             </label>
                             <span className="text-xs text-gray-500 mt-1">
                               {isActive ? 'Active' : 'Inactive'}
                             </span>
                           </div>
                         </div>
                       </div>
                      
                      <div className="col-span-1 md:col-span-2">
                        <label htmlFor="additionalComments" className="block text-sm font-medium text-textSecondary mb-1">
                          Additional Comments
                        </label>
                        <Textarea
                          id="additionalComments"
                          value={additionalComments}
                          onChange={(e) => setAdditionalComments(e.target.value)}
                          readOnly={!!viewingLeaseId}
                          rows={3}
                          placeholder="Any additional notes about this lease"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        onClick={() => router.push('/dashboard/tenants')}
                        variant="outline"
                        style={{
                          backgroundColor: theme.colors.button.secondary,
                          color: theme.colors.button.secondaryText,
                          borderColor: theme.colors.button.secondaryBorder,
                        }}
                        className="hover:bg-secondary/10"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {editingLeaseId ? 'Updating...' : 'Saving...'}
                          </>
                        ) : (
                          editingLeaseId ? 'Update Lease' : 'Save Lease'
                        )}
                      </Button>
                </div>
              </form>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function TenantLeaseForm() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex flex-1 items-center justify-center md:ml-64 p-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="ml-4 text-lg">Loading form...</p>
        </div>
      </div>
    }>
      <FormContent />
    </Suspense>
  );
}
