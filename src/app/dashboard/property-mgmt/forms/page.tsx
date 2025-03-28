"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLandlordId } from "@/lib/hooks/useLandlordId";
import Navigation from "@/components/Navigation";
import { RentalInventory, PropertyGroup } from "@/types";
import { 
  addRentalInventory, 
  updateRentalInventory,
  addPropertyGroup,
  getAllPropertyGroups,
  deletePropertyGroup,
  getAllRentalInventory,
} from "@/lib/firebase/firestoreUtils";
import { AlertMessage } from "@/components/ui/alert-message";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { theme } from "@/theme/theme";
import { Building, Home, ArrowLeft, Trash2 } from "lucide-react";

function PropertyFormsContent() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordLoading } = useLandlordId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formType = searchParams.get("type"); // 'property' or 'group'
  const editId = searchParams.get("edit"); // For editing existing properties
  
  // Form refs
  const formRef = useRef<HTMLDivElement>(null);
  
  // Property form state
  const [unitNumber, setUnitNumber] = useState("");
  const [propertyType, setPropertyType] = useState<"Commercial" | "Residential">("Residential");
  const [ownerDetails, setOwnerDetails] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [selectedPropertyGroup, setSelectedPropertyGroup] = useState<string>("Default");
  const [numberOfBedrooms, setNumberOfBedrooms] = useState<number | null>(null);
  const [squareFeetArea, setSquareFeetArea] = useState<number | null>(null);
  
  // Property Group form state
  const [groupName, setGroupName] = useState("");
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [inventoryItems, setInventoryItems] = useState<RentalInventory[]>([]);
  
  // Error states
  const [formError, setFormError] = useState<string | null>(null);
  const [groupFormError, setGroupFormError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const loadInventoryData = useCallback(async () => {
    try {
      const data = await getAllRentalInventory(landlordId!);
      setInventoryItems(data);
    } catch (error: any) {
      console.error("Error loading inventory data:", error);
      setAlertMessage({
        type: 'error',
        message: error.message || "Failed to load inventory data"
      });
    }
  }, [landlordId, setAlertMessage]);

  const loadPropertyGroups = useCallback(async () => {
    try {
      const groups = await getAllPropertyGroups(landlordId!);
      setPropertyGroups(groups);
    } catch (error: any) {
      console.error("Error loading property groups:", error);
      setAlertMessage({
        type: 'error',
        message: error.message || "Failed to load property groups"
      });
    }
  }, [landlordId, setAlertMessage]);
  
  useEffect(() => {
    if (!authLoading && !landlordLoading && landlordId && user) {
      loadPropertyGroups();
      loadInventoryData();
    }
  }, [user, authLoading, landlordId, landlordLoading, loadPropertyGroups, loadInventoryData]);

  // Add effect to handle pre-populating form data when editing
  useEffect(() => {
    if (editId && inventoryItems.length > 0) {
      const propertyToEdit = inventoryItems.find((item: RentalInventory) => item.id === editId);
      if (propertyToEdit) {
        setUnitNumber(propertyToEdit.unitNumber);
        setPropertyType(propertyToEdit.propertyType);
        setOwnerDetails(propertyToEdit.ownerDetails);
        setBankDetails(propertyToEdit.bankDetails || "");
        setSelectedPropertyGroup(propertyToEdit.groupName || "Default");
        setNumberOfBedrooms(propertyToEdit.numberOfBedrooms || null);
        setSquareFeetArea(propertyToEdit.squareFeetArea || null);
      }
    }
  }, [editId, inventoryItems]);

  const handlePropertySubmit = async (e: React.FormEvent) => {
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

    if (propertyType === "Residential" && !numberOfBedrooms) {
      setFormError("Number of Bedrooms is required for residential properties");
      return;
    }
    
    try {
      const propertyData: Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'> = {
        unitNumber: unitNumber.trim(),
        propertyType,
        ownerDetails: ownerDetails.trim(),
        bankDetails: bankDetails.trim() || undefined,
        groupName: selectedPropertyGroup === "Default" ? undefined : selectedPropertyGroup,
        numberOfBedrooms: propertyType === "Residential" ? numberOfBedrooms : null,
        squareFeetArea: squareFeetArea || null,
      };
      
      if (editId) {
        await updateRentalInventory(landlordId!, editId, propertyData);
      } else {
        await addRentalInventory(landlordId!, propertyData);
      }
      router.push("/dashboard/property-mgmt");
    } catch (error: any) {
      setFormError(error.message || `An error occurred while ${editId ? 'updating' : 'saving'} the property`);
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
      const groupData: Omit<PropertyGroup, 'id' | 'createdAt' | 'updatedAt'> = {
        groupName: groupName.trim(),
      };
      
      await addPropertyGroup(landlordId!, groupData);
      router.push("/dashboard/property-mgmt");
    } catch (error: any) {
      setGroupFormError(error.message || "An error occurred while saving the property group");
    }
  };

  const handleGroupDelete = async (groupId: string, groupName: string) => {
    const propertiesInGroup = inventoryItems.filter(item => item.groupName === groupName);
    const message = `Are you sure you want to delete "${groupName}" property group?\n\n${
      propertiesInGroup.length > 0 
        ? `${propertiesInGroup.length} properties from this group will be moved to the Default group.`
        : 'This group has no properties.'
    }`;

    if (confirm(message)) {
      try {
        // First update all properties in this group to "Default"
        if (propertiesInGroup.length > 0) {
          const updatePromises = propertiesInGroup.map(property => 
            property.id ? updateRentalInventory(
              landlordId!,
              property.id,
              {
                unitNumber: property.unitNumber,
                propertyType: property.propertyType,
                ownerDetails: property.ownerDetails,
                bankDetails: property.bankDetails,
                groupName: "Default",
                numberOfBedrooms: property.numberOfBedrooms,
                squareFeetArea: property.squareFeetArea,
              }
            ) : Promise.resolve()
          );
          await Promise.all(updatePromises);
        }

        // Then delete the group
        await deletePropertyGroup(landlordId!, groupId);
        await loadPropertyGroups();
        await loadInventoryData();

        setAlertMessage({
          type: 'success',
          message: `Property group "${groupName}" was deleted successfully. ${
            propertiesInGroup.length > 0 
              ? `${propertiesInGroup.length} properties were moved to the Default group.`
              : ''
          }`
        });
      } catch (error: any) {
        console.error("Error deleting property group:", error);
        setAlertMessage({
          type: 'error',
          message: error.message || "Failed to delete property group"
        });
      }
    }
  };

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
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={() => router.push("/dashboard/property-mgmt")}
            variant="outline"
            className="mb-6"
            style={{
              backgroundColor: theme.colors.button.secondary,
              color: theme.colors.button.secondaryText,
              borderColor: theme.colors.button.secondaryBorder,
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>

          {formType === "property" ? (
            <Card ref={formRef}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  {editId ? "Edit Property" : "Add New Property"}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6">
                {formError && (
                  <AlertMessage
                    variant="error"
                    message={formError}
                    className="mb-6"
                  />
                )}
                
                <form onSubmit={handlePropertySubmit}>
                  <div className="space-y-4">
                    <div>
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
                    
                    <div>
                      <label htmlFor="propertyType" className="block text-sm font-medium text-textSecondary mb-1">
                        Property Type *
                      </label>
                      <Select 
                        value={propertyType} 
                        onValueChange={(value: "Commercial" | "Residential") => {
                          setPropertyType(value);
                          if (value === "Commercial") {
                            setNumberOfBedrooms(null);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Residential">Residential</SelectItem>
                          <SelectItem value="Commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {propertyType === "Residential" && (
                      <div>
                        <label htmlFor="numberOfBedrooms" className="block text-sm font-medium text-textSecondary mb-1">
                          Number of Bedrooms *
                        </label>
                        <Select 
                          value={numberOfBedrooms?.toString() || ""} 
                          onValueChange={(value) => setNumberOfBedrooms(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select BHK" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} BHK
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <label htmlFor="squareFeetArea" className="block text-sm font-medium text-textSecondary mb-1">
                        Square Feet Area (Optional)
                      </label>
                      <Input
                        type="number"
                        id="squareFeetArea"
                        value={squareFeetArea || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : null;
                          if (value === null || value > 0) {
                            setSquareFeetArea(value);
                          }
                        }}
                        min="1"
                        placeholder="Enter area in square feet"
                      />
                    </div>

                    <div>
                      <label htmlFor="propertyGroup" className="block text-sm font-medium text-textSecondary mb-1">
                        Property Group
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
                    
                    <div>
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
                    
                    <div>
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
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="button"
                      onClick={() => router.push("/dashboard/property-mgmt")}
                      variant="outline"
                      style={{
                        backgroundColor: theme.colors.button.secondary,
                        color: theme.colors.button.secondaryText,
                        borderColor: theme.colors.button.secondaryBorder,
                      }}
                    >
                      Cancel
                    </Button>
                    
                    <Button type="submit">
                      {editId ? "Update Property" : "Add Property"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : formType === "group" ? (
            <Card ref={formRef}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Add Property Group
                </CardTitle>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6">
                {groupFormError && (
                  <AlertMessage
                    variant="error"
                    message={groupFormError}
                    className="mb-6"
                  />
                )}
                
                <form onSubmit={handleGroupSubmit}>
                  <div>
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
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="button"
                      onClick={() => router.push("/dashboard/property-mgmt")}
                      variant="outline"
                      style={{
                        backgroundColor: theme.colors.button.secondary,
                        color: theme.colors.button.secondaryText,
                        borderColor: theme.colors.button.secondaryBorder,
                      }}
                    >
                      Cancel
                    </Button>
                    
                    <Button type="submit">
                      Add Group
                    </Button>
                  </div>
                </form>

                {/* Saved Property Groups Card */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-lg">Saved Property Groups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {propertyGroups.length > 0 ? (
                      <div className="space-y-3">
                        {propertyGroups.map((group) => (
                          <div 
                            key={group.id} 
                            className="flex items-center justify-between p-3 bg-white rounded-lg border"
                            style={{ borderColor: theme.colors.border }}
                          >
                            <div className="flex items-center gap-3">
                              <Building className="h-5 w-5 text-gray-500" />
                              <span className="font-medium">{group.groupName}</span>
                            </div>
                            <Button
                              onClick={() => group.id && handleGroupDelete(group.id, group.groupName)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <Building className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>No property groups created yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600">Invalid form type specified.</p>
                <Button
                  onClick={() => router.push("/dashboard/property-mgmt")}
                  className="mt-4"
                >
                  Return to Properties
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PropertyForms() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <PropertyFormsContent />
    </Suspense>
  );
} 