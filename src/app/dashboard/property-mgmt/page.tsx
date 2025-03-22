"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { RentalInventory, PropertyGroup } from "@/types";
import { 
  addRentalInventory, 
  getAllRentalInventory, 
  updateRentalInventory, 
  deleteRentalInventory,
  addPropertyGroup,
  getAllPropertyGroups,
  deletePropertyGroup,
} from "@/lib/firebase/firestoreUtils";
import { downloadInventoryTemplate, uploadInventoryExcel } from "@/lib/excelUtils";
import { FileUp, FileDown, Loader2, AlertTriangle, CheckCircle, X, Plus, Pencil, Trash2 } from "lucide-react";
import { AlertMessage } from "@/components/ui/alert-message";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { theme } from "@/theme/theme";

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
  
  // Consolidated alert message state
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Property Group state
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [groupFormError, setGroupFormError] = useState<string | null>(null);

  // Add new state for selected property group
  const [selectedPropertyGroup, setSelectedPropertyGroup] = useState<string>("Default");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      loadInventoryData();
      loadPropertyGroups();
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
      const updatedData = data.map(item => ({
        ...item,
        groupName: item.groupName || "Default"
      }));
      setInventoryItems(updatedData);
    } catch (error: any) {
      console.error("Error loading inventory data:", error);
      setAlertMessage({
        type: 'error',
        message: error.message || "Failed to load inventory data"
      });
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
    setSelectedPropertyGroup(item.groupName || "Default");
    setIsFormOpen(true);
    
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
    setSelectedPropertyGroup("Default");
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
        groupName: selectedPropertyGroup === "Default" ? undefined : selectedPropertyGroup,
      };
      
      if (editingItem && editingItem.id) {
        await updateRentalInventory(editingItem.id, inventoryData);
      } else {
        await addRentalInventory(inventoryData);
      }
      
      await loadInventoryData();
      closeForm();
      setAlertMessage({
        type: 'success',
        message: editingItem ? 'Property updated successfully' : 'Property added successfully'
      });
    } catch (error: any) {
      setFormError(error.message || "An error occurred while saving the inventory item");
    }
  };
  
  const handleDelete = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this inventory item? This action cannot be undone.")) {
      try {
        await deleteRentalInventory(itemId);
        await loadInventoryData(); // Reload data
        setAlertMessage({
          type: 'success',
          message: 'Inventory item deleted successfully'
        });
      } catch (error: any) {
        console.error("Error deleting inventory item:", error);
        setAlertMessage({
          type: 'error',
          message: error.message || "An error occurred while deleting the inventory item"
        });
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

  const loadPropertyGroups = async () => {
    try {
      const groups = await getAllPropertyGroups();
      setPropertyGroups(groups);
    } catch (error: any) {
      console.error("Error loading property groups:", error);
      setAlertMessage({
        type: 'error',
        message: error.message || "Failed to load property groups"
      });
    }
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupFormError(null);
    
    if (!groupName.trim()) {
      setGroupFormError("Property group name is required");
      return;
    }

    const isDuplicate = propertyGroups.some(
      group => group.groupName.toLowerCase() === groupName.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      setGroupFormError("This property group already exists");
      return;
    }
    
    try {
      const groupData = {
        groupName: groupName.trim(),
      };
      
      await addPropertyGroup(groupData);
      await loadPropertyGroups();
      setGroupName("");
      setAlertMessage({
        type: 'success',
        message: 'Property group added successfully'
      });
    } catch (error: any) {
      setGroupFormError(error.message || "An error occurred while saving the property group");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm("Are you sure you want to delete this property group? This action cannot be undone.")) {
      try {
        await deletePropertyGroup(groupId);
        await loadPropertyGroups(); // Reload data
        setAlertMessage({
          type: 'success',
          message: 'Property group deleted successfully'
        });
      } catch (error: any) {
        console.error("Error deleting property group:", error);
        setAlertMessage({
          type: 'error',
          message: error.message || "An error occurred while deleting the property group"
        });
      }
    }
  };

  // Add property group dropdown component
  const renderPropertyGroupDropdown = () => {
    return (
      <div className="col-span-1">
        <label htmlFor="propertyGroup" className="block text-sm font-medium text-textSecondary mb-1">
          Property Group *
        </label>
        <Select 
          value={selectedPropertyGroup} 
          onValueChange={(value) => setSelectedPropertyGroup(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select property group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Default">Default</SelectItem>
            {propertyGroups.map((group) => (
              <SelectItem key={group.id} value={group.groupName}>
                {group.groupName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
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
  
  const renderGroupForm = () => {
    return (
      <Card ref={formRef} className="mb-8">
        <CardHeader>
          <CardTitle>Add Property Group</CardTitle>
        </CardHeader>
        
        <CardContent className="px-2 sm:px-6">
          {groupFormError && (
            <AlertMessage
              variant="error"
              message={groupFormError}
              className="mb-6"
            />
          )}
          
          <form onSubmit={handleGroupSubmit}>
            <Card className="bg-surface border-border">
              <CardContent className="grid grid-cols-1 gap-4 px-3 sm:px-6 py-4">
                <div className="col-span-1">
                  <label htmlFor="groupName" className="block text-sm font-medium text-textSecondary mb-1">
                    Group Name *
                  </label>
                  <Input
                    type="text"
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Building 1"
                    required
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end space-x-3 mt-6 mb-6">
              <Button
                type="button"
                onClick={() => setIsGroupFormOpen(false)}
                variant="outline"
                style={{
                  backgroundColor: theme.colors.button.secondary,
                  color: theme.colors.button.secondaryText,
                  borderColor: theme.colors.button.secondaryBorder,
                }}
                className="hover:bg-secondary/10"
              >
                Exit
              </Button>
              
              <Button type="submit">
                Add Group
              </Button>
            </div>
          </form>

          {/* Property Groups List */}
          <Card className="bg-surface border-border">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base">Property Groups</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 py-4">
              {propertyGroups.length > 0 ? (
                <div className="space-y-2">
                  {propertyGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100"
                    >
                      <span className="font-medium text-gray-900">{group.groupName}</span>
                      <button
                        onClick={() => group.id && handleDeleteGroup(group.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete property group"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-2">No property groups added yet.</p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="md:ml-64 p-4 overflow-x-hidden">
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
              <CardTitle className="text-2xl font-semibold text-gray-900 text-center sm:text-left">
                Property Management
              </CardTitle>
              <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                {/* Excel Template Download Button */}
                <Button
                  onClick={handleDownloadTemplate}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                  aria-label="Download Template"
                >
                  <FileDown className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Download Template</span>
                </Button>
                
                {/* Excel Upload Button */}
                <Button
                  onClick={triggerFileInput}
                  disabled={isUploading}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300"
                  size="sm"
                  aria-label="Upload Template"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  <span className="sr-only">Upload Template</span>
                </Button>

                {/* Add Property Group Button */}
                <Button
                  onClick={() => {
                    setIsGroupFormOpen(!isGroupFormOpen);
                    setIsFormOpen(false);
                  }}
                  variant={isGroupFormOpen ? "outline" : "default"}
                  size="sm"
                  style={isGroupFormOpen ? {
                    backgroundColor: theme.colors.button.secondary,
                    color: theme.colors.button.secondaryText,
                    borderColor: theme.colors.button.secondaryBorder,
                  } : {
                    backgroundColor: theme.colors.button.primary,
                    color: theme.colors.background,
                  }}
                  className={isGroupFormOpen ? "hover:bg-secondary/10" : "hover:bg-primary/90"}
                >
                  {isGroupFormOpen ? (
                    "Cancel"
                  ) : (
                    <>
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span>Type</span>
                    </>
                  )}
                </Button>
                
                {/* Add Property Button */}
                <Button
                  onClick={() => {
                    setIsFormOpen(!isFormOpen);
                    setIsGroupFormOpen(false);
                  }}
                  variant={isFormOpen ? "outline" : "default"}
                  size="sm"
                  style={isFormOpen ? {
                    backgroundColor: theme.colors.button.secondary,
                    color: theme.colors.button.secondaryText,
                    borderColor: theme.colors.button.secondaryBorder,
                  } : {
                    backgroundColor: theme.colors.button.primary,
                    color: theme.colors.background,
                  }}
                  className={isFormOpen ? "hover:bg-secondary/10" : "hover:bg-primary/90"}
                >
                  {isFormOpen ? (
                    "Cancel"
                  ) : (
                    <>
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span>Manual Add</span>
                    </>
                  )}
                </Button>
                
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
          </CardHeader>
        </Card>
        
        <main className="max-w-7xl mx-auto">
          {/* Upload Results Notification */}
          {showUploadResults && uploadResults && (
            <AlertMessage
              variant={uploadResults.success ? 'success' : 'error'}
              message={
                uploadResults.message || 
                (uploadResults.success 
                  ? `Successfully added ${uploadResults.successful} properties. ${uploadResults.failed ? `Failed to add ${uploadResults.failed} properties.` : ''} ${uploadResults.skipped ? `Skipped ${uploadResults.skipped} rows.` : ''}`
                  : uploadResults.error || 'Upload failed'
                )
              }
            />
          )}
          
          {/* Property Group Form */}
          {isGroupFormOpen && renderGroupForm()}
          
          {/* Add/Edit Form - Embedded directly in the page */}
          {isFormOpen && (
            <Card ref={formRef} className="mb-8">
              <CardHeader>
                <CardTitle>
                  {editingItem 
                    ? `Edit ${editingItem.unitNumber} ${editingItem.propertyType} Property`
                    : 'Add Property'
                  }
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
                
                <form onSubmit={handleSubmit}>
                  <Card className="bg-surface border-border">
                    <CardHeader className="px-3 sm:px-6">
                      <CardTitle className="text-base">Property Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 px-3 sm:px-6">
                      <div className="col-span-1">
                        <label htmlFor="unitNumber" className="block text-sm font-medium text-textSecondary mb-1">
                          Unit Number *
                        </label>
                        <Input
                          type="text"
                          id="unitNumber"
                          value={unitNumber}
                          onChange={(e) => setUnitNumber(e.target.value)}
                          placeholder="e.g., 101 or HSR2"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label htmlFor="propertyType" className="block text-sm font-medium text-textSecondary mb-1">
                          Property Type *
                        </label>
                        <Select value={propertyType} onValueChange={(value) => setPropertyType(value as "Commercial" | "Residential")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Residential">Residential</SelectItem>
                            <SelectItem value="Commercial">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Add Property Group Dropdown */}
                      {renderPropertyGroupDropdown()}
                      
                      <div className="col-span-2">
                        <label htmlFor="ownerDetails" className="block text-sm font-medium text-textSecondary mb-1">
                          Owner Details *
                        </label>
                        <Textarea
                          id="ownerDetails"
                          value={ownerDetails}
                          onChange={(e) => setOwnerDetails(e.target.value)}
                          rows={3}
                          placeholder="Enter owner name, contact info, etc."
                          required
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label htmlFor="bankDetails" className="block text-sm font-medium text-textSecondary mb-1">
                          Bank Details (Optional)
                        </label>
                        <Textarea
                          id="bankDetails"
                          value={bankDetails}
                          onChange={(e) => setBankDetails(e.target.value)}
                          rows={3}
                          placeholder="Enter bank account info, IFSC code, etc."
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="button"
                      onClick={closeForm}
                      variant="outline"
                      style={{
                        backgroundColor: theme.colors.button.secondary,
                        color: theme.colors.button.secondaryText,
                        borderColor: theme.colors.button.secondaryBorder,
                      }}
                      className="hover:bg-secondary/10"
                    >
                      Cancel
                    </Button>
                    
                    <Button type="submit">
                      {editingItem ? 'Update Property' : 'Add Property'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Excel Upload Instructions - Collapsible Banner */}
          {!isFormOpen && (
            <Accordion type="single" collapsible className="mb-8">
              <AccordionItem value="bulk-upload">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span>Bulk upload properties using Excel template</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-gray-600">Follow these steps to add multiple properties at once:</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <FileDown className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-600">Click this icon above to download the Excel template</p>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-5 flex-shrink-0" /> {/* Spacer for alignment */}
                        <p className="text-gray-600">Fill in your property details in the downloaded template</p>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-5 flex-shrink-0" /> {/* Spacer for alignment */}
                        <p className="text-gray-600">For <strong>Property Type</strong>, enter either &quot;Residential&quot; or &quot;Commercial&quot;</p>
                      </div>

                      <div className="flex items-start gap-3">
                        <FileUp className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-600">Click this icon above to upload your completed template</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-sm mt-4">
                      <strong>Note:</strong> The template includes examples and instructions to guide you. 
                      You don&apos;t need to delete these rows – our system will automatically detect and skip them during import.
                    </div>
                    
                    <p className="text-gray-600 text-sm">
                      Required fields are marked with an asterisk (*) in the template.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          
          {/* Inventory Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <div className="min-w-full inline-block align-middle">
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditForm(item)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit property"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </button>
                              <button
                                onClick={() => item.id && handleDelete(item.id)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete property"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                          No rental inventory items found. Click &quot;+ Manually Add&quot; to create one or use the Excel upload feature.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 