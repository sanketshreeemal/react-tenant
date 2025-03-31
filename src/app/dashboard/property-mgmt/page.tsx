"use client";

import React, { useState, useEffect, useRef, ChangeEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useLandlordId } from "../../../lib/hooks/useLandlordId";
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
import { FileUp, FileDown, Loader2, AlertTriangle, CheckCircle, X, Plus, Pencil, Trash2, Home, Building, ChevronRight, Users } from "lucide-react";
import { AlertMessage } from "@/components/ui/alert-message";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { theme } from "@/theme/theme";
import { PanelContainer } from "@/components/ui/panel";

export default function RentalInventoryManagement() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordIdLoading, error: landlordIdError } = useLandlordId();
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<RentalInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);
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
  
  // Consolidated alert message state
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Property Group state
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  
  const loadInventoryData = useCallback(async () => {
    if (!landlordId) return;

    try {
      setIsLoading(true);
      const data = await getAllRentalInventory(landlordId);
      console.log("Raw inventory data from getAllRentalInventory:", data);
      console.log("Number of inventory items:", data.length);
      if (data.length > 0) {
        console.log("Sample inventory item:", data[0]);
      }
      setInventoryItems(data);
      console.log("Rental inventory data fetched:", data);
    } catch (error: any) {
      console.error("Error loading inventory data:", error);
      setAlertMessage({
        type: 'error',
        message: error.message || "Failed to load inventory data"
      });
    } finally {
      setIsLoading(false);
    }
  }, [landlordId]);

  const loadPropertyGroups = useCallback(async () => {
    if (!landlordId) return;

    try {
      const groups = await getAllPropertyGroups(landlordId);
      setPropertyGroups(groups);
    } catch (error: any) {
      console.error("Error loading property groups:", error);
      setAlertMessage({
        type: 'error',
        message: error.message || "Failed to load property groups"
      });
    }
  }, [landlordId]);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (user && landlordId && !landlordIdLoading) {
      loadInventoryData();
      loadPropertyGroups();
    } else if (landlordIdError) {
       setAlertMessage({ type: 'error', message: `Failed to get landlord ID: ${landlordIdError}` });
       setIsLoading(false);
    } else {
       setIsLoading(true);
    }
  }, [user, authLoading, landlordId, landlordIdLoading, landlordIdError, router, loadInventoryData, loadPropertyGroups]);

  // Hide upload results after 10 seconds
  useEffect(() => {
    if (showUploadResults) {
      const timer = setTimeout(() => {
        setShowUploadResults(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [showUploadResults]);

  const handleDelete = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this inventory item? This action cannot be undone.")) {
      try {
        if (!landlordId) {
          throw new Error("Landlord ID not found");
        }
        await deleteRentalInventory(landlordId, itemId);
        await loadInventoryData();
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

  // Handle file upload
  const handleUploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadResults(null);
      
      if (!landlordId) {
          throw new Error("Landlord ID not found for upload");
      }

      const result = await uploadInventoryExcel(file);
      setUploadResults(result);
      setShowUploadResults(true);
      
      if (result.success && result.successful && result.successful > 0) {
        await loadInventoryData();
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

  // Toggle panel expansion
  const togglePanelExpansion = (panelId: string) => {
    setExpandedPanelId(expandedPanelId === panelId ? null : panelId);
  };
  
  // Get color based on property type
  const getPropertyTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "residential":
        return {
          color: theme.colors.propertyType.residential.text,
          bgColor: theme.colors.propertyType.residential.bg,
          icon: <Home className="h-4 w-4" />
        };
      case "commercial":
        return {
          color: theme.colors.propertyType.commercial.text,
          bgColor: theme.colors.propertyType.commercial.bg,
          icon: <Building className="h-4 w-4" />
        };
      default:
        return {
          color: theme.colors.textSecondary,
          bgColor: "rgba(107, 114, 128, 0.08)",
          icon: <Home className="h-4 w-4" />
        };
    }
  };

  // Get BHK pill color based on number of bedrooms
  const getBHKColor = (bedrooms: number) => {
    switch (bedrooms) {
      case 1:
        return {
          text: theme.colors.bhk.one.text,
          bg: theme.colors.bhk.one.bg
        };
      case 2:
        return {
          text: theme.colors.bhk.two.text,
          bg: theme.colors.bhk.two.bg
        };
      case 3:
        return {
          text: theme.colors.bhk.three.text,
          bg: theme.colors.bhk.three.bg
        };
      case 4:
        return {
          text: theme.colors.bhk.four.text,
          bg: theme.colors.bhk.four.bg
        };
      case 5:
        return {
          text: theme.colors.bhk.five.text,
          bg: theme.colors.bhk.five.bg
        };
      default:
        return {
          text: theme.colors.textSecondary,
          bg: "rgba(107, 114, 128, 0.08)"
        };
    }
  };

  // PropertyGroupPanel component
  const PropertyGroupPanel = ({ 
    groupName, 
    properties
  }: { 
    groupName: string; 
    properties: RentalInventory[];
  }) => {
    const panelId = `group-${groupName.replace(/\s+/g, '-').toLowerCase()}`;
    const isExpanded = expandedPanelId === panelId;
    const propertyCount = properties.length;
    
    return (
      <div
        className={`
          flex-shrink-0 snap-start rounded-xl overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-[320px] md:w-[380px]' : 'w-[240px]'}
          h-[280px] shadow-sm hover:shadow-md relative
        `}
        style={{
          backgroundColor: theme.colors.background,
          border: `1px solid ${theme.colors.border}`,
        }}
        onClick={() => togglePanelExpansion(panelId)}
      >
        {/* Header */}
        <div 
          className="p-4 border-b flex justify-between items-center"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center mr-3"
              style={{ 
                backgroundColor: groupName === "Default" 
                  ? theme.colors.propertyType.residential.bg
                  : theme.colors.propertyType.commercial.bg,
                color: groupName === "Default"
                  ? theme.colors.propertyType.residential.text
                  : theme.colors.propertyType.commercial.text
              }}
            >
              {groupName === "Default" ? (
                <Home className="h-5 w-5" />
              ) : (
                <Building className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base" style={{ color: theme.colors.textPrimary }}>
                {groupName}
              </h3>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
              </p>
            </div>
          </div>
          <ChevronRight 
            className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} 
            style={{ color: theme.colors.textSecondary }}
          />
        </div>
        
        {/* Properties List */}
        <div className="p-3 overflow-y-auto" style={{ height: "calc(100% - 73px)" }}>
          {properties.length > 0 ? (
            <div className="space-y-1.5">
              {properties.map((property) => {
                const typeInfo = getPropertyTypeColor(property.propertyType);
                
                return (
                  <div 
                    key={property.id} 
                    className="p-2.5 rounded-lg bg-white border transition-all hover:shadow-sm"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: typeInfo.bgColor,
                          color: typeInfo.color
                        }}
                      >
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="font-medium text-sm truncate"
                          style={{ color: theme.colors.textPrimary }}
                        >
                          Unit {property.unitNumber}
                        </h4>
                      </div>
                      <div 
                        className="text-xs py-1 px-2 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: typeInfo.bgColor,
                          color: typeInfo.color
                        }}
                      >
                        {property.propertyType.slice(0, 3)}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1.5 flex items-start justify-between text-xs text-gray-500">
                        <div className="flex items-start gap-1 flex-1 min-w-0">
                          <Users className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <p className="leading-tight line-clamp-1">{property.ownerDetails}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {property.propertyType === "Residential" && property.numberOfBedrooms && (
                            <span 
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ 
                                backgroundColor: getBHKColor(property.numberOfBedrooms).bg,
                                color: getBHKColor(property.numberOfBedrooms).text
                              }}
                            >
                              {property.numberOfBedrooms} BHK
                            </span>
                          )}
                          {property.propertyType === "Commercial" && property.squareFeetArea && (
                            <span 
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ 
                                backgroundColor: theme.colors.area.bg,
                                color: theme.colors.area.text
                              }}
                            >
                              {property.squareFeetArea} sq.ft
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Building className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No properties in this group</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (authLoading || landlordIdLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!user || !landlordId) {
    return null;
  }

  // Group inventory items by property group name
  const groupedInventory = inventoryItems.reduce((acc, item) => {
    const groupName = item.groupName || "Default";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, RentalInventory[]>);

  // Ensure property groups from state are included, even if empty
  propertyGroups.forEach(group => {
    if (!groupedInventory[group.groupName]) {
      groupedInventory[group.groupName] = [];
    }
  });

  // Add "Default" explicitly if not present and there are ungrouped items
  if (inventoryItems.some(item => !item.groupName) && !groupedInventory["Default"]) {
    groupedInventory["Default"] = inventoryItems.filter(item => !item.groupName);
  }

  // Sort group names by number of properties (descending) and keep Default last
  const sortedGroupNames = Object.keys(groupedInventory).sort((a, b) => {
    if (a === "Default") return 1;
    if (b === "Default") return -1;
    return groupedInventory[b].length - groupedInventory[a].length;
  });

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

        <style jsx global>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          /* Hide scrollbar for IE, Edge and Firefox */
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          /* For line clamp */
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>

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
                  onClick={() => router.push("/dashboard/property-mgmt/forms?type=group")}
                  variant="default"
                  size="sm"
                  className="bg-[#1F2937] hover:bg-[#111827] text-white transition-colors"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span>Type</span>
                </Button>
                
                {/* Add Property Button */}
                <Button
                  onClick={() => router.push("/dashboard/property-mgmt/forms?type=property")}
                  variant="default"
                  size="sm"
                  className="bg-[#1F2937] hover:bg-[#111827] text-white transition-colors"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span>Manual Add</span>
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

          {/* Bulk Upload Instructions */}
          <CardContent className="px-4 sm:px-6 lg:px-8 pb-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="bulk-upload">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span>Bulk upload using Excel template</span>
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
          </CardContent>
        </Card>

        {/* Property Group Carousel using PanelContainer */}
        {sortedGroupNames.length > 1 && (
          <PanelContainer className="mb-6 gap-4">
            {sortedGroupNames.map((groupName) => (
              <PropertyGroupPanel
                key={groupName}
                groupName={groupName}
                properties={groupedInventory[groupName]}
              />
            ))}
          </PanelContainer>
        )}

        {/* If only one group, show it without the carousel */}
        {sortedGroupNames.length === 1 && (
          <div className="mb-6">
            <PropertyGroupPanel
              groupName={sortedGroupNames[0]}
              properties={groupedInventory[sortedGroupNames[0]]}
            />
          </div>
        )}

        {/* Property Details Section */}
        <Accordion 
          type="single" 
          collapsible 
          className={`mb-8 ${!propertyGroups.length ? 'mt-6' : ''}`}
          defaultValue={!propertyGroups.length ? "property-details" : undefined}
        >
          <AccordionItem value="property-details">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span>Property Details</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {/* Inventory Table */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-full inline-block align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bank
                          </th>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            BHK
                          </th>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Area (sq.ft)
                          </th>
                          <th scope="col" className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {inventoryItems.length > 0 ? (
                          inventoryItems.map((item) => {
                            const typeInfo = getPropertyTypeColor(item.propertyType);
                            const bhkColor = item.numberOfBedrooms ? getBHKColor(item.numberOfBedrooms) : null;
                            
                            return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                                  {item.unitNumber}
                                </td>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                      style={{ 
                                        backgroundColor: typeInfo.bgColor,
                                        color: typeInfo.color
                                      }}
                                    >
                                      {typeInfo.icon}
                                    </div>
                                    <span 
                                      className="text-xs px-2 py-1 rounded-full"
                                      style={{ 
                                        backgroundColor: typeInfo.bgColor,
                                        color: typeInfo.color
                                      }}
                                    >
                                      {item.propertyType}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                  {item.ownerDetails}
                                </td>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                  {item.bankDetails || "-"}
                                </td>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                                  {item.propertyType === "Residential" && item.numberOfBedrooms ? (
                                    <span 
                                      className="text-xs px-2 py-1 rounded-full"
                                      style={{ 
                                        backgroundColor: bhkColor?.bg,
                                        color: bhkColor?.text
                                      }}
                                    >
                                      {item.numberOfBedrooms} BHK
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                                  {item.squareFeetArea && item.squareFeetArea > 0 ? (
                                    <span
                                      className="text-xs px-2 py-1 rounded-full"
                                      style={{
                                        backgroundColor: theme.colors.area.bg,
                                        color: theme.colors.area.text
                                      }}
                                    >
                                      {item.squareFeetArea} sq.ft
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500">-</span>
                                  )}
                                </td>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => router.push(`/dashboard/property-mgmt/forms?type=property&edit=${item.id}`)}
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
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-2 sm:px-6 py-10 text-center text-sm text-gray-500">
                              No rental inventory items found. Click &quot;+ Manual Add&quot; to create one or use the Excel upload feature.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
} 