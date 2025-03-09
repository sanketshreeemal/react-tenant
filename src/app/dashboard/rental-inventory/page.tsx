"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { RentalInventory } from "@/types";
import { addRentalInventory, getAllRentalInventory, updateRentalInventory, deleteRentalInventory } from "@/lib/firebase/firestoreUtils";
import { downloadInventoryTemplate, uploadInventoryExcel } from "@/lib/excelUtils";
import { FileUp, FileDown, Loader2, AlertTriangle, CheckCircle, X } from "lucide-react";

export default function RentalInventoryManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<RentalInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalInventory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);

  // Excel upload state
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
  
  // Form state
  const [unitNumber, setUnitNumber] = useState("");
  const [propertyType, setPropertyType] = useState<"Commercial" | "Residential">("Residential");
  const [ownerDetails, setOwnerDetails] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      loadInventoryData();
    }
  }, [user, loading, router]);
  
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
  
  const loadInventoryData = async () => {
    try {
      setIsLoading(true);
      const data = await getAllRentalInventory();
      setInventoryItems(data);
    } catch (error: any) {
      console.error("Error loading inventory data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const openAddForm = () => {
    setEditingItem(null);
    resetForm();
    setIsFormOpen(true);
    
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const openEditForm = (item: RentalInventory) => {
    setEditingItem(item);
    setUnitNumber(item.unitNumber);
    setPropertyType(item.propertyType);
    setOwnerDetails(item.ownerDetails);
    setBankDetails(item.bankDetails || "");
    setIsFormOpen(true);
    
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setUnitNumber("");
    setPropertyType("Residential");
    setOwnerDetails("");
    setBankDetails("");
    setFormError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!unitNumber.trim()) {
      setFormError("Unit Number is required");
      return;
    }
    
    if (!ownerDetails.trim()) {
      setFormError("Owner Details are required");
      return;
    }
    
    try {
      const inventoryData = {
        unitNumber: unitNumber.trim(),
        propertyType,
        ownerDetails: ownerDetails.trim(),
        bankDetails: bankDetails.trim() || undefined,
      };
      
      if (editingItem && editingItem.id) {
        await updateRentalInventory(editingItem.id, inventoryData);
      } else {
        await addRentalInventory(inventoryData);
      }
      
      await loadInventoryData(); // Reload data
      closeForm();
    } catch (error: any) {
      setFormError(error.message || "An error occurred while saving the inventory item");
    }
  };
  
  const handleDelete = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this inventory item? This action cannot be undone.")) {
      try {
        await deleteRentalInventory(itemId);
        await loadInventoryData(); // Reload data
      } catch (error: any) {
        console.error("Error deleting inventory item:", error);
        alert(error.message || "An error occurred while deleting the inventory item");
      }
    }
  };

  // Handle template download
  const handleDownloadTemplate = async () => {
    const result = await downloadInventoryTemplate();
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
      
      const result = await uploadInventoryExcel(file);
      setUploadResults(result);
      setShowUploadResults(true);
      
      if (result.success && result.successful && result.successful > 0) {
        await loadInventoryData(); // Reload data if any items were added successfully
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
            <h1 className="text-3xl font-bold text-gray-900">Rental Inventory Management</h1>
            <div className="flex flex-wrap gap-2">
              {/* Excel Template Download Button */}
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors relative group"
                aria-label="Download Template"
              >
                <FileDown className="w-5 h-5" />
                <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Download Template
                </span>
              </button>
              
              {/* Excel Upload Button */}
              <button
                onClick={triggerFileInput}
                disabled={isUploading}
                className="flex items-center bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:bg-amber-300 relative group"
                aria-label="Upload Template"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileUp className="w-5 h-5" />
                )}
                <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Upload Template
                </span>
              </button>
              
              {/* Add Property Button */}
              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                <span className="mr-1">{isFormOpen ? 'Cancel' : '+ Manual Add'}</span>
              </button>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                className="hidden"
              />
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          {/* Upload Results Notification */}
          {showUploadResults && uploadResults && (
            <div className={`mb-6 p-4 rounded-md relative ${
              uploadResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <button 
                onClick={closeUploadResults} 
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-start">
                {uploadResults.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1">
                  <h3 className={`text-lg font-medium ${
                    uploadResults.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {uploadResults.success ? 'Upload Successful' : 'Upload Failed'}
                  </h3>
                  
                  {uploadResults.message ? (
                    <p className="mt-1 text-sm text-gray-700">
                      {uploadResults.message}
                    </p>
                  ) : uploadResults.success && (
                    <p className="mt-1 text-sm text-green-700">
                      Successfully added {uploadResults.successful} properties. 
                      {uploadResults.failed && uploadResults.failed > 0 && 
                        ` Failed to add ${uploadResults.failed} properties.`}
                      {uploadResults.skipped && uploadResults.skipped > 0 &&
                        ` Skipped ${uploadResults.skipped} rows (empty or instructions).`}
                    </p>
                  )}
                  
                  {uploadResults.error && (
                    <p className="mt-1 text-sm text-red-700">{uploadResults.error}</p>
                  )}
                  
                  {uploadResults.errors && uploadResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-700">Errors:</p>
                      <ul className="mt-1 text-sm text-red-700 list-disc pl-5">
                        {uploadResults.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {uploadResults.errors.length > 5 && (
                          <li>...and {uploadResults.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Add/Edit Form - Embedded directly in the page */}
          {isFormOpen && (
            <div ref={formRef} className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                {editingItem ? 'Edit Property' : 'Manually Add New Property'}
              </h2>
              
              {formError && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h3 className="font-medium text-gray-700 mb-4">Property Information</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="col-span-1">
                        <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Number *
                        </label>
                        <input
                          type="text"
                          id="unitNumber"
                          value={unitNumber}
                          onChange={(e) => setUnitNumber(e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="e.g., 101 or HSR2"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
                          Property Type *
                        </label>
                        <select
                          id="propertyType"
                          value={propertyType}
                          onChange={(e) => setPropertyType(e.target.value as "Commercial" | "Residential")}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          required
                        >
                          <option value="Residential">Residential</option>
                          <option value="Commercial">Commercial</option>
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <label htmlFor="ownerDetails" className="block text-sm font-medium text-gray-700 mb-1">
                          Owner Details *
                        </label>
                        <textarea
                          id="ownerDetails"
                          value={ownerDetails}
                          onChange={(e) => setOwnerDetails(e.target.value)}
                          rows={3}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter owner name, contact info, etc."
                          required
                        ></textarea>
                      </div>
                      
                      <div className="col-span-2">
                        <label htmlFor="bankDetails" className="block text-sm font-medium text-gray-700 mb-1">
                          Bank Details (Optional)
                        </label>
                        <textarea
                          id="bankDetails"
                          value={bankDetails}
                          onChange={(e) => setBankDetails(e.target.value)}
                          rows={3}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter bank account info, IFSC code, etc."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-500 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {editingItem ? 'Update Property' : 'Add Property'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
          
          {/* Excel Upload Instructions - Collapsible Banner */}
          {!isFormOpen && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg mb-8 overflow-hidden">
              {/* Collapsible Banner Header */}
              <div 
                className="p-3 flex justify-between items-center cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={toggleInstructions}
              >
                <div className="flex items-center">
                  <FileUp className="w-4 h-4 text-blue-700 mr-2" />
                  <p className="text-sm text-blue-700 font-medium">
                    Bulk upload properties by downloading the template, filling it out, and uploading it
                  </p>
                </div>
                <div className="text-blue-600">
                  {isInstructionsExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              
              {/* Expanded Content */}
              {isInstructionsExpanded && (
                <div className="p-4 border-t border-blue-200">
                  <p className="mb-3 text-xs text-blue-700">
                    You can add multiple properties at once by following these steps:
                  </p>
                  <ol className="list-decimal pl-5 mb-3 space-y-1 text-xs text-blue-700">
                    <li>Click the <FileDown className="w-3.5 h-3.5 inline-block mx-0.5" /> icon to download the Excel template</li>
                    <li>Fill in your property details in the template following the instructions</li>
                    <li>For <strong>Property Type</strong>, you must enter either "Residential" or "Commercial" exactly as shown</li>
                    <li>Save the file and click the <FileUp className="w-3.5 h-3.5 inline-block mx-0.5" /> icon to import your properties</li>
                  </ol>
                  <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 mb-2">
                    <strong>Note:</strong> The template includes examples and instructions to guide you. 
                    You don't need to delete these rows – our system will automatically detect and skip them during import.
                  </div>
                  <p className="text-xs text-blue-600">
                    Required fields are marked with an asterisk (*) in the template.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Inventory Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryItems.length > 0 ? (
                    inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.unitNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.propertyType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.ownerDetails}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.bankDetails || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditForm(item)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => item.id && handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                        No rental inventory items found. Click "+ Manually Add" to create one or use the Excel upload feature.
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