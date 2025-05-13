"use client";

import React, { useState, useEffect, useRef, ChangeEvent, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useLandlordId } from "@/lib/hooks/useLandlordId";
import Navigation from "../../../components/Navigation";
import { Lease, RentalInventory, PropertyGroup } from "@/types";
import { 
  getAllLeases, 
  updateLease, 
  deleteLease,
  getAllRentalInventory,
  getAllPropertyGroups,
  groupLeasesByProperty
} from "@/lib/firebase/firestoreUtils";
import { format, formatDistance, formatRelative, formatDuration, intervalToDuration } from 'date-fns';
import { Search, Filter, CalendarIcon, XCircle, Loader2, X, Plus, Pencil, Building, Trash2, Users, ArrowUp, ArrowDown } from "lucide-react";
import { AlertMessage } from "@/components/ui/alert-message";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { theme } from "@/theme/theme";
import { PanelContainer } from "@/components/ui/panel";
import { TenantOccupancyPanel } from "@/components/ui/tab-panel";

// Add type definitions for sorting
type SortColumn = 'unitNumber' | 'tenantName' | 'email' | 'leasePeriod' | 'rentAmount';
type SortDirection = 'asc' | 'desc';

export default function TenantsManagement() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordLoading, error: landlordIdError } = useLandlordId();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [rentalInventory, setRentalInventory] = useState<RentalInventory[]>([]);
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<string | null>(null);
  
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('unitNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  useEffect(() => {
    if (alertMessage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [alertMessage]);
  
  useEffect(() => {
    console.log("rentalInventory state updated:", rentalInventory);
  }, [rentalInventory]);
  
  const loadData = useCallback(async () => {
    if (!landlordId) return;
    try {
      setIsLoading(true);
      console.log("Starting to load data for tenant page...");
      
      const [inventoryData, leasesData, groupsData] = await Promise.all([
        getAllRentalInventory(landlordId),
        getAllLeases(landlordId),
        getAllPropertyGroups(landlordId)
      ]);
      
      console.log("Inventory fetched:", inventoryData);
      setRentalInventory(inventoryData || []);
      
      console.log("Leases fetched:", leasesData);
      setLeases(leasesData || []);

      console.log("Property Groups fetched:", groupsData);
      setPropertyGroups(groupsData || []);
      
    } catch (error: any) {
      console.error("Error loading data:", error.message || error);
      setAlertMessage({ type: 'error', message: 'Failed to load tenant, inventory, or property group data.' });
    } finally {
      setIsLoading(false);
    }
  }, [landlordId]);
  
  useEffect(() => {
    if (user && !authLoading && !landlordLoading && landlordId) {
      console.log("User authenticated, loading tenant data...");
      loadData();
    } else if (landlordIdError) {
      setAlertMessage({ type: 'error', message: `Failed to load landlord details: ${landlordIdError}` });
      setIsLoading(false);
    } else if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, landlordLoading, landlordId, landlordIdError, loadData, router]);

  const handleToggleLeaseStatus = async (leaseId: string, isActive: boolean) => {
    if (!landlordId) {
      setAlertMessage({ type: 'error', message: 'Cannot update status: Landlord ID missing.' });
      return;
    }
    try {
      if (!isActive) {
        const leaseToActivate = leases.find(lease => lease.id === leaseId);
        if (leaseToActivate) {
          const unitId = leaseToActivate.unitId;
          const displayUnitNumber = leaseToActivate.unitNumber || getUnitNumber(unitId);
          
          const conflictingLease = leases.find(
            lease => lease.unitId === unitId && lease.isActive && lease.id !== leaseId
          );
          
          if (conflictingLease) {
            setAlertMessage({
              type: 'error',
              message: `Cannot activate this lease for ${leaseToActivate.tenantName}. Unit ${displayUnitNumber} already has an active lease for tenant ${conflictingLease.tenantName}. Please deactivate the current active lease first.`
            });
            return;
          }
        }
      }
      
      await updateLease(landlordId, leaseId, { isActive: !isActive } as Partial<Lease>);
      
      setLeases(
        leases.map(lease =>
          lease.id === leaseId
            ? { ...lease, isActive: !isActive, updatedAt: new Date() }
            : lease
        )
      );
      
      setAlertMessage({
        type: 'success',
        message: `Lease status successfully ${!isActive ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      setAlertMessage({
        type: 'error',
        message: `Error updating lease status: ${error.message}`
      });
    }
  };

  const initiateDeleteLease = (leaseId: string) => {
    setLeaseToDelete(leaseId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteLease = async () => {
    if (!leaseToDelete) return;

    if (!landlordId) {
       setAlertMessage({ type: 'error', message: 'Cannot delete lease: Landlord ID missing.' });
       setShowDeleteConfirmation(false);
       setLeaseToDelete(null);
       return;
    }
    
    try {
      await deleteLease(landlordId, leaseToDelete);
      
      setLeases(leases.filter(lease => lease.id !== leaseToDelete));
      setShowDeleteConfirmation(false);
      setLeaseToDelete(null);
      
      setAlertMessage({
        type: 'success',
        message: 'Lease was successfully deleted'
      });
    } catch (error: any) {
      setAlertMessage({
        type: 'error',
        message: `Error deleting lease: ${error.message}`
      });
    }
  };

  const cancelDeleteLease = () => {
    setShowDeleteConfirmation(false);
    setLeaseToDelete(null);
  };
  
  const filteredLeases = leases.filter(lease => {
    const unitNumber = lease.unitNumber || '';
    
    return (
      lease.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  useEffect(() => {
    console.log(`Total leases: ${leases.length}, Filtered leases: ${filteredLeases.length}`);
    if (leases.length > 0) {
      console.log("Sample lease data:", leases[0]);
    }
  }, [leases, filteredLeases]);
  
  const formatLeasePeriod = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
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
  
  const getUnitNumber = useCallback((unitId: string) => {
    if (!unitId) {
      console.warn("Empty unitId passed to getUnitNumber");
      return "Unknown";
    }
    
    if (!rentalInventory || rentalInventory.length === 0) {
      return unitId; // Return unitId as fallback if inventory not loaded
    }
    
    const unitById = rentalInventory.find(item => item.id === unitId);
    if (unitById) {
      return unitById.unitNumber;
    }
    
    const unitByNumber = rentalInventory.find(item => item.unitNumber === unitId);
    if (unitByNumber) {
      return unitByNumber.unitNumber;
    }
    
    return unitId; // Fallback to unitId if no match found
  }, [rentalInventory]);
  
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);

  const togglePanelExpansion = (panelId: string) => {
    setExpandedPanelId(expandedPanelId === panelId ? null : panelId);
  };
  
  const groupedLeaseData = useMemo(() => {
    if (!leases || !rentalInventory || !propertyGroups) {
      return [];
    }
    
    return groupLeasesByProperty(leases, rentalInventory, propertyGroups);
  }, [leases, rentalInventory, propertyGroups]);

  // Add sorting logic
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedLeases = useMemo(() => {
    return [...filteredLeases].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortColumn) {
        case 'unitNumber':
          const unitA = a.unitNumber || getUnitNumber(a.unitId);
          const unitB = b.unitNumber || getUnitNumber(b.unitId);
          return direction * unitA.localeCompare(unitB);
        
        case 'tenantName':
          return direction * a.tenantName.localeCompare(b.tenantName);
        
        case 'email':
          return direction * a.email.localeCompare(b.email);
        
        case 'leasePeriod':
          return direction * (new Date(a.leaseStartDate).getTime() - new Date(b.leaseStartDate).getTime());
        
        case 'rentAmount':
          return direction * (a.rentAmount - b.rentAmount);
        
        default:
          return 0;
      }
    });
  }, [filteredLeases, sortColumn, sortDirection, getUnitNumber]);
  
  if (authLoading || landlordLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!user || !landlordId) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navigation />
      
      <main className="md:ml-64 p-4">
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
                Tenants & Leases
              </CardTitle>
              <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                <Button
                  onClick={() => router.push("/dashboard/tenants/forms")}
                  variant="default"
                  size="sm"
                  style={{
                    backgroundColor: theme.colors.button.primary,
                    color: theme.colors.background,
                  }}
                  className={"hover:bg-primary/90"}
                >
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span>Add Lease</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <main className="max-w-7xl mx-auto">
          <PanelContainer className="mb-6 gap-4">
            {groupedLeaseData.length > 0 ? (
              groupedLeaseData.map((group) => (
                <TenantOccupancyPanel
                  key={group.groupName}
                  propertyGroup={{
                    groupName: group.groupName,
                    units: group.units.map(u => ({
                       id: u.id,
                       unitNumber: u.unitNumber,
                       rent: u.rent,
                       daysVacant: u.daysVacant,
                       isActive: u.isActive,
                    })),
                    totalUnits: group.totalUnits,
                  }}
                  isExpanded={expandedPanelId === `group-${group.groupName}`}
                  onClick={() => togglePanelExpansion(`group-${group.groupName}`)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-6 text-gray-500">
                <Building className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                No property groups or tenant data found to display panels.
              </div>
            )}
          </PanelContainer>

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
                    <Button
                      type="button"
                      onClick={cancelDeleteLease}
                      variant="outline"
                      style={{
                        backgroundColor: theme.colors.button.secondary,
                        color: theme.colors.button.secondaryText,
                        borderColor: theme.colors.button.secondaryBorder,
                      }}
                       className="hover:bg-secondary/10 mt-3 w-full sm:mt-0 sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-w-7xl mx-auto">
            <Accordion 
              type="single" 
              collapsible 
              className="mb-8"
              defaultValue="tenants-table"
            >
              <AccordionItem value="tenants-table" className="bg-white rounded-lg shadow">
                <AccordionTrigger className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Tenants & Leases Table</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 border-b">
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search by tenant, unit, or email..."
                        className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                            className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                            onClick={() => handleSort('email')}
                          >
                            Contact
                            {sortColumn === 'email' && (
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
                            onClick={() => handleSort('leasePeriod')}
                          >
                            Lease
                            {sortColumn === 'leasePeriod' && (
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
                            onClick={() => handleSort('rentAmount')}
                          >
                            Rent
                            {sortColumn === 'rentAmount' && (
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
                        {sortedLeases.length > 0 ? (
                          sortedLeases.map((lease) => (
                            <tr 
                              key={lease.id} 
                              className={`hover:bg-gray-50 cursor-pointer ${!lease.isActive ? 'bg-gray-50 opacity-70' : ''}`}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (!target.closest('button')) {
                                  router.push(`/dashboard/tenants/forms?view=${lease.id}`);
                                }
                              }}
                            >
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                                {lease.unitNumber || getUnitNumber(lease.unitId)}
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                {lease.tenantName}
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                <div className="flex flex-col items-center">
                                  <div>{lease.email}</div>
                                  <div className="text-xs">{lease.countryCode} {lease.phoneNumber}</div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                {formatLeasePeriod(lease.leaseStartDate, lease.leaseEndDate)}
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                ₹{lease.rentAmount.toLocaleString()}
                              </td>
                              <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/dashboard/tenants/forms?edit=${lease.id}`);
                                    }}
                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Edit lease"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      initiateDeleteLease(lease.id as string);
                                    }}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete lease"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </button>

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
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-2 sm:px-6 py-10 text-center text-sm text-gray-500">
                              {searchTerm ? "No leases found matching your search." : "No lease records found. Click 'Manual Add' to create one."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </main>
      </main>
    </div>
  );
} 