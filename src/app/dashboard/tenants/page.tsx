"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { Lease, RentalInventory } from "@/types";
import { 
  addLease, 
  getAllLeases, 
  updateLease, 
  deleteLease,
  getAllRentalInventory
} from "@/lib/firebase/firestoreUtils";
import { format, formatDistance, formatRelative, formatDuration, intervalToDuration } from 'date-fns';
import { Search, Filter, CalendarIcon, CheckCircle, XCircle, FileUp, FileDown, Loader2, AlertTriangle } from "lucide-react";
import { downloadTenantTemplate, uploadTenantExcel } from "@/lib/excelUtils";

export default function TenantsManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [rentalInventory, setRentalInventory] = useState<RentalInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [editingLeaseId, setEditingLeaseId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<string | null>(null);
  
  // Excel upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: boolean;
    successful?: number;
    failed?: number;
    skipped?: number;
    errors?: string[];
    error?: string;
    message?: string;
  } | null>(null);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);
  
  // Add effect to scroll to error message when it appears
  useEffect(() => {
    if (formError && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [formError]);
  
  // Hide upload results after 10 seconds
  useEffect(() => {
    if (showUploadResults) {
      const timer = setTimeout(() => {
        setShowUploadResults(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [showUploadResults]);
  
  // Custom class for input fields - wider with more padding
  const inputClass = "shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pl-3 py-2 w-[125%]";
  const numberInputClass = "shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pl-3 py-2 w-[125%] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  
  // Form state
  const [unitId, setUnitId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
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
  const [depositMethod, setDepositMethod] = useState<'Cash' | 'Bank transfer' | 'UPI' | 'Check'>('Cash');
  const [additionalComments, setAdditionalComments] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // Load data when component mounts or user changes
  useEffect(() => {
    if (user && !loading) {
      console.log("User authenticated, loading tenant data...");
      loadData();
    }
  }, [user, loading]);
  
  // Auto-refresh functionality removed - data will only load on initial mount or manual refresh
  // useEffect(() => {
  //   if (user && !loading) {
  //     const intervalId = setInterval(() => {
  //       console.log("Refreshing tenant data...");
  //       loadData();
  //     }, 30000); // 30 seconds
      
  //     return () => clearInterval(intervalId);
  //   }
  // }, [user, loading]);
  
  // Debug useEffect to log rental inventory changes
  useEffect(() => {
    console.log("rentalInventory state updated:", rentalInventory);
  }, [rentalInventory]);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log("Starting to load data for tenant page...");
      
      // First, get rental inventory
      console.log("Fetching rental inventory data...");
      let inventoryData: RentalInventory[] = [];
      
      try {
        inventoryData = await getAllRentalInventory();
        console.log("Raw inventory data from getAllRentalInventory:", JSON.stringify(inventoryData, null, 2));
        console.log("Number of inventory items:", inventoryData.length);
        if (inventoryData.length > 0) {
          console.log("Sample inventory item:", JSON.stringify(inventoryData[0], null, 2));
        }
        console.log("Rental inventory data fetched:", inventoryData);
      } catch (inventoryError: any) {
        console.error("Error fetching rental inventory:", inventoryError.message || inventoryError);
      }
      
      // Then, get leases
      console.log("Fetching lease data...");
      let leasesData: Lease[] = [];
      
      try {
        leasesData = await getAllLeases();
        console.log("Raw lease data from getAllLeases:", JSON.stringify(leasesData, null, 2));
        console.log("Number of leases:", leasesData.length);
        if (leasesData.length > 0) {
          console.log("Sample lease:", JSON.stringify(leasesData[0], null, 2));
        }
        console.log("Lease data fetched:", leasesData);
        
        // Validate lease data to ensure it's properly formatted
        if (Array.isArray(leasesData)) {
          console.log(`Found ${leasesData.length} leases`);
          
          // Check if any invalid lease data
          const validLeases = leasesData.filter(lease => {
            const isValid = lease && lease.id && lease.unitId && lease.tenantName;
            if (!isValid) {
              console.warn("Found invalid lease data:", JSON.stringify(lease, null, 2));
            }
            return isValid;
          });
          
          if (validLeases.length !== leasesData.length) {
            console.warn(`Filtered out ${leasesData.length - validLeases.length} invalid leases`);
            console.log("Valid leases:", JSON.stringify(validLeases, null, 2));
          }
          
          leasesData = validLeases;
        } else {
          console.error("Leases data is not an array:", leasesData);
          leasesData = [];
        }
      } catch (leaseError: any) {
        console.error("Error fetching leases:", leaseError.message || leaseError);
      }
      
      console.log("Final data to be set in state - Inventory:", JSON.stringify(inventoryData, null, 2));
      console.log("Final data to be set in state - Leases:", JSON.stringify(leasesData, null, 2));
      
      // Update state
      setRentalInventory(inventoryData || []);
      setLeases(leasesData || []);
    } catch (error: any) {
      console.error("Error loading data:", error.message || error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleForm = (leaseId?: string) => {
    setIsFormOpen(!isFormOpen);
    if (!isFormOpen) {
      resetForm();
      
      // If editing an existing lease, populate the form
      if (leaseId) {
        const leaseToEdit = leases.find(lease => lease.id === leaseId);
        if (leaseToEdit) {
          setEditingLeaseId(leaseId);
          setUnitId(leaseToEdit.unitId);
          
          // Set unitNumber from lease or get it from rental inventory
          if (leaseToEdit.unitNumber) {
            setUnitNumber(leaseToEdit.unitNumber);
          } else {
            // Fallback to getUnitNumber if unitNumber is not in the lease
            setUnitNumber(getUnitNumber(leaseToEdit.unitId));
          }
          
          setTenantName(leaseToEdit.tenantName);
          setCountryCode(leaseToEdit.countryCode);
          setPhoneNumber(leaseToEdit.phoneNumber);
          setEmail(leaseToEdit.email);
          setAdhaarNumber(leaseToEdit.adhaarNumber);
          setPanNumber(leaseToEdit.panNumber || "");
          setEmployerName(leaseToEdit.employerName || "");
          setPermanentAddress(leaseToEdit.permanentAddress || "");
          setLeaseStartDate(format(new Date(leaseToEdit.leaseStartDate), 'yyyy-MM-dd'));
          setLeaseEndDate(format(new Date(leaseToEdit.leaseEndDate), 'yyyy-MM-dd'));
          setRentAmount(leaseToEdit.rentAmount);
          setSecurityDeposit(leaseToEdit.securityDeposit);
          setDepositMethod(leaseToEdit.depositMethod);
          setAdditionalComments(leaseToEdit.additionalComments || "");
          setIsActive(leaseToEdit.isActive);
        }
      } else {
        setEditingLeaseId(null);
      }
      
      // Scroll to form
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };
  
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
    setEditingLeaseId(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Form validation
    if (!unitId) {
      setFormError("Unit Number is required");
      return;
    }
    
    // Check if the unit exists in the rental inventory
    const unitExists = rentalInventory.some(unit => unit.id === unitId);
    if (!unitExists) {
      setFormError("The selected unit does not exist in the rental inventory. Please select a valid unit.");
      return;
    }
    
    if (!tenantName.trim()) {
      setFormError("Tenant Name is required");
      return;
    }
    
    if (!phoneNumber.trim() || !countryCode.trim()) {
      setFormError("Phone number and country code are required");
      return;
    }
    
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setFormError("Valid email address is required");
      return;
    }
    
    if (!adhaarNumber.trim()) {
      setFormError("Adhaar Number is required");
      return;
    }
    
    // Validate Adhaar number format: 12 digits, no spaces
    if (!/^\d{12}$/.test(adhaarNumber.trim())) {
      setFormError("Adhaar Number must be 12 digits with no spaces");
      return;
    }
    
    if (!leaseStartDate) {
      setFormError("Lease start date is required");
      return;
    }
    
    if (!leaseEndDate) {
      setFormError("Lease end date is required");
      return;
    }
    
    if (new Date(leaseStartDate) >= new Date(leaseEndDate)) {
      setFormError("Lease end date must be after start date");
      return;
    }
    
    if (rentAmount < 0) {
      setFormError("Rent amount must be a positive number");
      return;
    }
    
    if (securityDeposit < 0) {
      setFormError("Security deposit must be a positive number");
      return;
    }

    // Check for existing active lease on this unit
    const conflictingLease = leases.find(
      lease => lease.unitId === unitId && lease.isActive && lease.id !== editingLeaseId
    );

    if (conflictingLease && isActive) {
      const displayUnitNumber = getUnitNumber(unitId);
      setFormError(`Cannot create a new active lease for Unit ${displayUnitNumber}. This unit already has an active lease for tenant ${conflictingLease.tenantName}. Please deactivate the current active lease first.`);
      return;
    }
    
    try {
      const leaseData = {
        unitId,
        unitNumber: unitNumber || getUnitNumber(unitId),
        tenantName: tenantName.trim(),
        countryCode: countryCode.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        adhaarNumber: adhaarNumber.trim(),
        panNumber: panNumber.trim() || "",
        employerName: employerName.trim() || "",
        permanentAddress: permanentAddress.trim() || "",
        leaseStartDate: new Date(leaseStartDate),
        leaseEndDate: new Date(leaseEndDate),
        rentAmount,
        securityDeposit,
        depositMethod,
        additionalComments: additionalComments.trim() || "",
        isActive,
      };
      
      if (editingLeaseId) {
        // Update existing lease
        await updateLease(editingLeaseId, leaseData);
      } else {
        // Add new lease
        await addLease(leaseData);
      }
      
      await loadData(); // Reload data
      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      setFormError(error.message || `An error occurred while ${editingLeaseId ? 'updating' : 'saving'} the lease`);
    }
  };

  const handleToggleLeaseStatus = async (leaseId: string, isActive: boolean) => {
    try {
      // If we're activating the lease, we need to make sure there's no other active lease
      if (!isActive) {
        // Get the lease to activate
        const leaseToActivate = leases.find(lease => lease.id === leaseId);
        if (leaseToActivate) {
          const unitId = leaseToActivate.unitId;
          // Use unitNumber from lease or get it from getUnitNumber as fallback
          const displayUnitNumber = leaseToActivate.unitNumber || getUnitNumber(unitId);
          
          // Check for existing active leases for this unit
          const conflictingLease = leases.find(
            lease => lease.unitId === unitId && lease.isActive && lease.id !== leaseId
          );
          
          if (conflictingLease) {
            // Create a more friendly error message with tenant names
            alert(`Cannot activate this lease for ${leaseToActivate.tenantName}.\n\nUnit ${displayUnitNumber} already has an active lease for tenant ${conflictingLease.tenantName}.\n\nPlease deactivate the current active lease first.`);
            return;
          }
        }
      }
      
      // If we get here, we can safely update the lease status
      await updateLease(leaseId, { isActive: !isActive });
      
      // Update the local state to reflect the change
      setLeases(
        leases.map(lease =>
          lease.id === leaseId
            ? { ...lease, isActive: !isActive, updatedAt: new Date() }
            : lease
        )
      );
    } catch (error: any) {
      alert(`Error updating lease status: ${error.message}`);
    }
  };

  const initiateDeleteLease = (leaseId: string) => {
    setLeaseToDelete(leaseId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteLease = async () => {
    if (!leaseToDelete) return;
    
    try {
      await deleteLease(leaseToDelete);
      
      // Update local state and reset UI
      setLeases(leases.filter(lease => lease.id !== leaseToDelete));
      setShowDeleteConfirmation(false);
      setLeaseToDelete(null);
      
      // Close the form if it's open (in case delete was triggered from edit form)
      setIsFormOpen(false);
      resetForm();
      
      // Show success message
      alert("Lease was successfully deleted");
    } catch (error: any) {
      alert(`Error deleting lease: ${error.message}`);
    }
  };

  const cancelDeleteLease = () => {
    setShowDeleteConfirmation(false);
    setLeaseToDelete(null);
  };
  
  const filteredLeases = leases.filter(lease => {
    return (
      lease.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Add debug code to check filtered leases
  useEffect(() => {
    console.log(`Total leases: ${leases.length}, Filtered leases: ${filteredLeases.length}`);
    if (leases.length > 0) {
      console.log("Sample lease data:", leases[0]);
    }
  }, [leases, filteredLeases]);
  
  // Helper function to format lease period for better readability
  const formatLeasePeriod = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Format the dates
    const startDateFormatted = format(start, 'MMM d, yyyy');
    const endDateFormatted = format(end, 'MMM d, yyyy');
    
    return (
      <div className="flex flex-col">
        <span className="font-medium">
          {startDateFormatted} - {endDateFormatted}
        </span>
      </div>
    );
  };
  
  // Get unit number from inventory based on unitId - used only as fallback
  const getUnitNumber = (unitId: string) => {
    if (!unitId) {
      console.warn("Empty unitId passed to getUnitNumber");
      return "Unknown";
    }
    
    console.log(`Looking up unit number for unitId: ${unitId}`);
    console.log("Available inventory:", rentalInventory);
    
    // First, try to find a unit where the id matches the unitId
    const unitById = rentalInventory.find(item => item.id === unitId);
    if (unitById) {
      console.log(`Found unit by ID match: ${unitById.unitNumber}`);
      return unitById.unitNumber;
    }
    
    // If unit not found by ID, check if the unitId itself is actually a unit number
    const unitByNumber = rentalInventory.find(item => item.unitNumber === unitId);
    if (unitByNumber) {
      console.log(`Found unit by unit number match: ${unitByNumber.unitNumber}`);
      return unitByNumber.unitNumber;
    }
    
    // If still not found, return the unitId as fallback
    console.log(`No matching unit found for ${unitId}, using as fallback`);
    return unitId;
  };
  
  // Handle template download
  const handleDownloadTemplate = async () => {
    const result = await downloadTenantTemplate();
    if (!result.success) {
      alert(result.error || "Failed to download template. Please try again.");
    }
  };

  // Handle file selection for upload
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    handleUploadFile(file);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file upload
  const handleUploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadResults(null);
      
      const result = await uploadTenantExcel(file);
      setUploadResults(result);
      setShowUploadResults(true);
      
      if (result.success && result.successful && result.successful > 0) {
        await loadData(); // Reload data if any items were added successfully
      }
    } catch (error: any) {
      setUploadResults({
        success: false,
        error: error.message || "Failed to upload file",
        errors: [error.message || "Unknown error occurred"]
      });
      setShowUploadResults(true);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Close upload results
  const closeUploadResults = () => {
    setShowUploadResults(false);
  };

  // Toggle instructions expand/collapse
  const toggleInstructions = () => {
    setIsInstructionsExpanded(!isInstructionsExpanded);
  };
  
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="md:ml-64 p-4">
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Tenants & Leases</h1>
            <div className="flex flex-wrap gap-2">
              {/* Excel Template Download Button */}
              <div className="relative group">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                  aria-label="Download template"
                >
                  <div className="w-full h-full flex items-center justify-center bg-green-100 rounded-lg">
                    <FileDown className="h-6 w-6 text-green-600" />
                  </div>
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                  Download template
                </div>
              </div>
              
              {/* Excel Upload Button */}
              <div className="relative group">
                <button
                  onClick={triggerFileInput}
                  className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                  aria-label="Upload template"
                  disabled={isUploading}
                >
                  <div className="w-full h-full flex items-center justify-center bg-amber-100 rounded-lg">
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                    ) : (
                      <FileUp className="h-6 w-6 text-amber-600" />
                    )}
                  </div>
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                  Upload template
                </div>
              </div>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                className="hidden"
              />
              
              {/* Add Tenant Button */}
              <button
                onClick={() => toggleForm()}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                <span className="mr-1">{isFormOpen ? 'Cancel' : '+ Add Tenant'}</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Excel Import Instructions & Upload Results */}
        <div className="max-w-7xl mx-auto">
          {/* Bulk Upload Instructions Panel */}
          <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
            <div 
              className="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer"
              onClick={toggleInstructions}
            >
              <div className="flex items-center">
                <FileDown className="text-gray-500 h-5 w-5 mr-2" />
                <h3 className="text-md font-medium text-gray-700">
                  Bulk upload tenants by downloading the template, filling it out, and uploading it
                </h3>
              </div>
              <span className="text-blue-500">
                {isInstructionsExpanded ? '− Hide' : '+ Show'}
              </span>
            </div>
            
            {isInstructionsExpanded && (
              <div className="p-4 border-t border-gray-200">
                <p className="mb-2">You can add multiple tenants at once by following these steps:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Click the <FileDown className="h-4 w-4 text-green-600 inline" /> icon to download the Excel template</li>
                  <li>Fill in your tenant details in the template following the instructions</li>
                  <li>For <strong>Deposit Method</strong>, you must enter one of: &quot;Cash&quot;, &quot;Bank transfer&quot;, &quot;UPI&quot;, or &quot;Check&quot; exactly as shown</li>
                  <li>Save the file and click the <FileUp className="h-4 w-4 text-amber-600 inline" /> icon to import your tenants</li>
                </ol>
                <div className="mt-4 text-sm text-gray-500">
                  <p className="font-medium">Note:</p>
                  <p>The template includes examples and instructions to guide you. You don&apos;t need to delete these rows — our system will automatically detect and skip them during import.</p>
                  <p className="mt-2">Required fields are marked with an asterisk (*) in the template.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Upload Results */}
          {showUploadResults && uploadResults && (
            <div className={`bg-white shadow rounded-lg mb-6 p-4 border-l-4 ${
              uploadResults.success ? 'border-green-500' : 'border-red-500'
            }`}>
              <div className="flex justify-between">
                <div className="flex items-start">
                  {uploadResults.success ? (
                    <CheckCircle className="text-green-500 h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="text-red-500 h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="text-md font-medium">
                      {uploadResults.success ? 'Upload Complete' : 'Upload Failed'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {uploadResults.message || 
                       (uploadResults.success 
                        ? `${uploadResults.successful} tenant(s) added successfully, ${uploadResults.failed} failed, ${uploadResults.skipped} skipped.` 
                        : uploadResults.error)}
                    </p>
                    
                    {/* Display errors if any */}
                    {uploadResults.errors && uploadResults.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-700">Issues:</p>
                        <ul className="text-xs text-red-600 mt-1 list-disc pl-5 max-h-32 overflow-y-auto">
                          {uploadResults.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={closeUploadResults}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        <main className="max-w-7xl mx-auto">
          {/* Add/Edit Lease Form - Embedded directly in the page */}
          {isFormOpen && (
            <div ref={formRef} className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                {editingLeaseId ? 'Edit Tenant & Lease' : 'Add New Tenant & Lease'}
              </h2>
              
              {formError && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-md mb-6">
                  <h3 className="font-medium text-gray-700 mb-4">Unit Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="col-span-1">
                      <label htmlFor="unitId" className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Number *
                      </label>
                      <select
                        id="unitId"
                        value={unitId}
                        onChange={(e) => {
                          const selectedUnitId = e.target.value;
                          setUnitId(selectedUnitId);
                          
                          // Get the unitNumber from the selected unit
                          const selectedUnit = rentalInventory.find(unit => unit.id === selectedUnitId);
                          if (selectedUnit) {
                            setUnitNumber(selectedUnit.unitNumber);
                          } else {
                            setUnitNumber("");
                          }
                        }}
                        className={inputClass}
                        required
                        disabled={editingLeaseId !== null} // Cannot change unit when editing
                      >
                        <option value="">Select a unit</option>
                        {rentalInventory && rentalInventory.length > 0 ? (
                          rentalInventory.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.unitNumber} ({unit.propertyType})
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No rental units available</option>
                        )}
                      </select>
                      {editingLeaseId && (
                        <p className="mt-1 text-xs text-gray-500">Unit cannot be changed when editing a lease</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-md mb-6">
                  <h3 className="font-medium text-gray-700 mb-4">Tenant Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="col-span-1">
                      <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700 mb-1">
                        Tenant Name *
                      </label>
                      <input
                        type="text"
                        id="tenantName"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className={inputClass}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1 flex space-x-2">
                      <div className="w-1/3">
                        <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                          Country Code *
                        </label>
                        <input
                          type="text"
                          id="countryCode"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className={inputClass}
                          placeholder="+91"
                          required
                        />
                      </div>
                      <div className="w-2/3">
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="text"
                          id="phoneNumber"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className={inputClass}
                          placeholder="9876543210"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="adhaarNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Adhaar Number *
                      </label>
                      <input
                        type="text"
                        id="adhaarNumber"
                        value={adhaarNumber}
                        onChange={(e) => setAdhaarNumber(e.target.value)}
                        className={inputClass}
                        placeholder="XXXXXXXXXXXX"
                        pattern="[0-9]{12}"
                        title="Adhaar number must be 12 digits with no spaces"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        id="panNumber"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value)}
                        className={inputClass}
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="employerName" className="block text-sm font-medium text-gray-700 mb-1">
                        Employer Name
                      </label>
                      <input
                        type="text"
                        id="employerName"
                        value={employerName}
                        onChange={(e) => setEmployerName(e.target.value)}
                        className={inputClass}
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label htmlFor="permanentAddress" className="block text-sm font-medium text-gray-700 mb-1">
                        Permanent Address
                      </label>
                      <textarea
                        id="permanentAddress"
                        value={permanentAddress}
                        onChange={(e) => setPermanentAddress(e.target.value)}
                        rows={3}
                        className={inputClass}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-md mb-6">
                  <h3 className="font-medium text-gray-700 mb-4">Lease Details</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="col-span-1">
                      <label htmlFor="leaseStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Lease Start Date *
                      </label>
                      <input
                        type="date"
                        id="leaseStartDate"
                        value={leaseStartDate}
                        onChange={(e) => setLeaseStartDate(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="leaseEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Lease End Date *
                      </label>
                      <input
                        type="date"
                        id="leaseEndDate"
                        value={leaseEndDate}
                        onChange={(e) => setLeaseEndDate(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="rentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                        Monthly Rent Amount (₹) *
                      </label>
                      <input
                        type="number"
                        id="rentAmount"
                        value={rentAmount}
                        onChange={(e) => setRentAmount(Number(e.target.value))}
                        className={numberInputClass}
                        min="0"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700 mb-1">
                        Security Deposit (₹) *
                      </label>
                      <input
                        type="number"
                        id="securityDeposit"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                        className={numberInputClass}
                        min="0"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="depositMethod" className="block text-sm font-medium text-gray-700 mb-1">
                        Deposit Payment Method *
                      </label>
                      <select
                        id="depositMethod"
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value as 'Cash' | 'Bank transfer' | 'UPI' | 'Check')}
                        className={inputClass}
                        required
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank transfer">Bank transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Check">Check</option>
                      </select>
                    </div>
                    
                    <div className="col-span-1">
                      <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">
                        Lease Status
                      </label>
                      <div className="mt-2">
                        <div className="flex flex-col items-center">
                          <label className="inline-flex relative items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={isActive}
                              onChange={(e) => setIsActive(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-[rgb(209,209,214)] rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:bg-[rgb(48,209,88)] transition-colors duration-300"></div>
                          </label>
                          <span className="text-xs text-gray-500 mt-1 transition-all duration-300 text-center w-full">
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <label htmlFor="additionalComments" className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Comments
                      </label>
                      <textarea
                        id="additionalComments"
                        value={additionalComments}
                        onChange={(e) => setAdditionalComments(e.target.value)}
                        rows={3}
                        className={inputClass}
                        placeholder="Any additional notes about this lease"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  
                  {editingLeaseId && (
                    <button
                      type="button"
                      onClick={() => initiateDeleteLease(editingLeaseId)}
                      className="bg-red-500 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete Lease
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    className="bg-blue-500 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingLeaseId ? 'Update Lease' : 'Save Lease'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Delete Confirmation Modal */}
          {showDeleteConfirmation && (
            <div className="fixed z-10 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Lease</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Are you sure you want to delete this lease? This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button 
                      type="button" 
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={confirmDeleteLease}
                    >
                      Delete
                    </button>
                    <button 
                      type="button" 
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={cancelDeleteLease}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Search and Filter */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by tenant, unit, or email..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-shrink-0">
                <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>
          </div>
          
          {/* Leases Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lease Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rent
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeases.length > 0 ? (
                    filteredLeases.map((lease) => (
                      <tr key={lease.id} className={`hover:bg-gray-50 ${!lease.isActive ? 'bg-gray-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lease.unitNumber || getUnitNumber(lease.unitId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {lease.tenantName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>{lease.email}</div>
                            <div className="text-xs">{lease.countryCode} {lease.phoneNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatLeasePeriod(lease.leaseStartDate, lease.leaseEndDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{lease.rentAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {/* Toggle Switch with Status Label */}
                          <div className="flex items-center justify-end space-x-3">
                            <div className="flex flex-col items-center">
                              <label className="inline-flex relative items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={lease.isActive}
                                  onChange={() => handleToggleLeaseStatus(lease.id as string, lease.isActive)}
                                />
                                <div className="w-11 h-6 bg-[rgb(209,209,214)] rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:bg-[rgb(48,209,88)] transition-colors duration-300"></div>
                              </label>
                              <span className="text-xs text-gray-500 mt-1 transition-all duration-300 text-center w-full">
                                {lease.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            {/* Edit Button */}
                            <button
                              onClick={() => toggleForm(lease.id)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                        No lease records found. Click &quot;Add Tenant&quot; to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 