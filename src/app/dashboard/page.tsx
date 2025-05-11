"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/hooks/useAuth";
import { useLandlordId } from "../../lib/hooks/useLandlordId";
import Navigation from "../../components/Navigation";
import Link from "next/link";
import { 
  getAllRentalInventory, 
  getAllActiveLeases, 
  getAllLeases,
  getAllPayments,
  getRentCollectionStatus,
  getLeaseExpirations,
  getDelinquentUnitsForDashboard,
  getAllPropertyGroups
} from "../../lib/firebase/firestoreUtils";
import { 
  RentalInventory, 
  Lease, 
  RentPayment, 
  PropertyGroup,
  DelinquencyDashboardData,
  DelinquentUnitDisplayInfo
} from "../../types";
import { formatCurrency, formatDate } from "../../lib/utils/formatters";
import { AlertMessage } from "@/components/ui/alert-message";
import { theme } from "@/theme/theme";
import { StatCard } from "@/components/ui/statcard";
import { Building, DollarSign, FileText, Key, ArrowUp, ArrowDown, Search, AlertCircle, Send, LayoutDashboard } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input";
import { Timestamp } from 'firebase/firestore';
import logger from '@/lib/logger';
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { landlordId } = useLandlordId();
  const [properties, setProperties] = useState<RentalInventory[]>([]);
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [allLeases, setAllLeases] = useState<Lease[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [selectedPropertyGroupId, setSelectedPropertyGroupId] = useState<string>("all");
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [currentMonthName, setCurrentMonthName] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string>('rentalPeriod');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState<string>("");

  // State for Delinquent Units
  const [allDelinquentUnitsData, setAllDelinquentUnitsData] = useState<DelinquencyDashboardData | null>(null);
  const [delinquentDataLoading, setDelinquentDataLoading] = useState(true);
  const [delinquentError, setDelinquentError] = useState<string | null>(null);

  useEffect(() => {
    if (user && landlordId) {
      logger.info(`Dashboard Context: User UID = ${user.uid}, Landlord ID = ${landlordId}`);
    } else if (user && !landlordId && !loading) {
       logger.warn(`Dashboard Context: User UID = ${user.uid}, Landlord ID MISSING`);
    } else if (!user && !loading) {
       logger.info(`Dashboard Context: No user logged in.`);
    }
  }, [user, landlordId, loading]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const previousMonthIndex = month === 0 ? 11 : month - 1;
    const previousMonthYear = month === 0 ? year - 1 : year;

    const previousMonthString = `${previousMonthYear}-${String(previousMonthIndex + 1).padStart(2, '0')}`;
    const previousMonthName = new Date(previousMonthYear, previousMonthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });

    logger.info(`Dashboard Date Calc: Device Time = ${now.toString()}, Calculated Prev Month String = ${previousMonthString}, Calculated Prev Month Name = ${previousMonthName}`);

    setCurrentMonth(previousMonthString);
    setCurrentMonthName(previousMonthName);
  }, []);

  useEffect(() => {
    if (user && landlordId) {
      const fetchDashboardData = async () => {
        setDataLoading(true);
        setError(null);
        try {
          logger.info(`Dashboard Fetch: Starting fetch with Landlord ID = ${landlordId}`);

          const [propertiesData, activeLeaseData, allLeasesData, paymentsData, fetchedPropertyGroups] = await Promise.all([
            getAllRentalInventory(landlordId),
            getAllActiveLeases(landlordId),
            getAllLeases(landlordId),
            getAllPayments(landlordId),
            getAllPropertyGroups(landlordId)
          ]);

          logger.info(`Dashboard Fetch: Raw payments received count = ${paymentsData.length}`);
          if (paymentsData.length > 0) {
             logger.debug(`Dashboard Fetch: Sample raw payment rentalPeriod = ${paymentsData[0].rentalPeriod}`);
          }

          setProperties(propertiesData);
          setActiveLeases(activeLeaseData);
          setAllLeases(allLeasesData);
          setRentPayments(paymentsData);
          setPropertyGroups(fetchedPropertyGroups);
        } catch (err: any) {
          logger.error(`Dashboard Fetch Error: ${err.message}`, err);
          if (err instanceof Error && err.message.includes("permission")) {
             setError("Permission denied fetching data. Please check Firestore rules or contact support.");
          } else {
             setError("Failed to load dashboard data. Please try again later.");
          }
        } finally {
          setDataLoading(false);
        }
      };

      fetchDashboardData();
    } else if (!loading && user && !landlordId) {
       setDataLoading(true);
       setError(null);
       setProperties([]);
       setActiveLeases([]);
       setAllLeases([]);
       setRentPayments([]);
       setPropertyGroups([]);
    } else if (!loading && !user) {
       setDataLoading(false);
       setError(null);
       setProperties([]);
       setActiveLeases([]);
       setAllLeases([]);
       setRentPayments([]);
       setPropertyGroups([]);
    }
  }, [user, landlordId, loading]);

  const fetchAndSetAllDelinquentUnits = useCallback(async (currentLandlordId: string) => {
    setDelinquentDataLoading(true);
    setDelinquentError(null);
    try {
      logger.info(`Dashboard Delinquent Fetch (All): Initiated for Landlord ID = ${currentLandlordId}`);
      // Always fetch for all properties initially by passing undefined for propertyGroupId
      const data = await getDelinquentUnitsForDashboard(currentLandlordId, new Date(), undefined);
      setAllDelinquentUnitsData(data);
    } catch (err: any) {
      logger.error(`Dashboard Delinquent Fetch (All) Error: ${err.message}`, err);
      setDelinquentError("Failed to load delinquent units data.");
      setAllDelinquentUnitsData(null);
    } finally {
      setDelinquentDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && landlordId) {
      fetchAndSetAllDelinquentUnits(landlordId);
    } else if ((!loading && user && !landlordId) || (!loading && !user)) {
      setDelinquentDataLoading(false);
      setDelinquentError(null);
      setAllDelinquentUnitsData(null);
    }
  }, [user, landlordId, loading, fetchAndSetAllDelinquentUnits]);

  // Memoized filtered data sources based on selectedPropertyGroupId
  const filteredProperties = useMemo(() => {
    if (selectedPropertyGroupId === "all" || !propertyGroups.length) {
      return properties;
    }
    const selectedGroup = propertyGroups.find(pg => pg.id === selectedPropertyGroupId);
    if (!selectedGroup) {
      return []; // No properties if selected group is not found
    }
    return properties.filter(p => p.groupName === selectedGroup.groupName);
  }, [properties, propertyGroups, selectedPropertyGroupId]);

  const filteredActiveLeases = useMemo(() => {
    if (selectedPropertyGroupId === "all") {
      return activeLeases;
    }
    const unitIdsInFilteredProperties = filteredProperties.map(p => p.id!);
    return activeLeases.filter(l => unitIdsInFilteredProperties.includes(l.unitId));
  }, [activeLeases, filteredProperties, selectedPropertyGroupId]);

  const filteredRentPayments = useMemo(() => {
    if (selectedPropertyGroupId === "all") {
      return rentPayments;
    }
    const unitIdsInFilteredProperties = filteredProperties.map(p => p.id!);
    return rentPayments.filter(p => unitIdsInFilteredProperties.includes(p.unitId));
  }, [rentPayments, filteredProperties, selectedPropertyGroupId]);

  const displayedDelinquentUnitsData = useMemo(() => {
    if (!allDelinquentUnitsData) {
      return null;
    }
    if (selectedPropertyGroupId === "all" || !propertyGroups.length) {
      return allDelinquentUnitsData;
    }

    const selectedGroup = propertyGroups.find(pg => pg.id === selectedPropertyGroupId);
    if (!selectedGroup) {
      // If the selected group is not found (e.g., inconsistent data or "all" was just deselected but not yet processed)
      // return an empty structure for safety, or allDelinquentUnitsData if that's preferred default.
      // Returning empty structure aligns with how other filters might behave if a selection is invalid.
      return {
        totalDelinquentUnitsCount: 0,
        grandTotalRentBehind: 0,
        units: [],
      };
    }
    
    const filteredUnits = allDelinquentUnitsData.units.filter(unit => 
      unit.propertyName === selectedGroup.groupName
    );

    const grandTotalRentBehindFiltered = filteredUnits.reduce(
      (sum, unit) => sum + unit.totalRentBehindForUnit,
      0
    );

    return {
      totalDelinquentUnitsCount: filteredUnits.length,
      grandTotalRentBehind: grandTotalRentBehindFiltered,
      units: filteredUnits,
    };
  }, [allDelinquentUnitsData, selectedPropertyGroupId, propertyGroups]);

  const calculateDashboardMetrics = () => {
    // Use filtered data for calculations
    const totalProperties = filteredProperties.length;
    const occupiedUnits = filteredActiveLeases.length;
    const occupancyRate = totalProperties > 0 
      ? Math.round((occupiedUnits / totalProperties) * 100) 
      : 0;

    logger.info(`Dashboard Calc: Calculating metrics. Filtered Payments count = ${filteredRentPayments.length}, Filtering month = ${currentMonth}`);

    const currentMonthPayments = filteredRentPayments.filter(
      payment => {
         const isMatch = payment.rentalPeriod === currentMonth &&
                       (payment.paymentType === "Rent Payment" || !payment.paymentType);
         return isMatch;
      }
    );

    logger.info(`Dashboard Calc: Filtered payments count for ${currentMonth} (after property filter) = ${currentMonthPayments.length}`);

    const totalRentCollected = currentMonthPayments.reduce(
      (sum, payment) => sum + payment.actualRentPaid, 0
    );

    logger.info(`Dashboard Calc: Final totalRentCollected (after property filter) = ${totalRentCollected}`);

    const totalExpectedRent = filteredActiveLeases.reduce(
      (sum, lease) => sum + lease.rentAmount, 0
    );

    const collectionRate = totalExpectedRent > 0 
      ? Math.round((totalRentCollected / totalExpectedRent) * 100) 
      : 0;
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const upcomingExpirationsCount = filteredActiveLeases.filter(lease => {
      const endDate = new Date(lease.leaseEndDate);
      return endDate >= today && endDate <= thirtyDaysFromNow;
    }).length;

    // Calculate property type split using filteredProperties
    const commercial = filteredProperties.filter(p => p.propertyType === 'Commercial').length;
    const residential = filteredProperties.filter(p => p.propertyType === 'Residential').length;
    const propertyTypeSplitData = { commercial, residential };

    return {
      totalProperties,
      occupancyRate,
      totalRentCollected,
      totalExpectedRent,
      collectionRate,
      upcomingExpirations: upcomingExpirationsCount,
      occupiedUnits,
      propertyTypeSplit: propertyTypeSplitData,
    };
  };

  const rentStatus = getRentCollectionStatus(filteredActiveLeases, filteredRentPayments, currentMonth);

  const upcomingExpirations = getLeaseExpirations(filteredActiveLeases);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getTimestamp = (date: Date | Timestamp) => {
    if (date instanceof Date) return date.getTime();
    return new Date(date.seconds * 1000).getTime();
  };

  const sortedPayments = [...rentPayments].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortColumn) {
      case 'unitNumber':
        return direction * (a.unitId || '').localeCompare(b.unitId || '');
      case 'tenantName':
        return direction * (a.tenantName || '').localeCompare(b.tenantName || '');
      case 'paymentType':
        return direction * ((a.paymentType || 'Rent Payment').localeCompare(b.paymentType || 'Rent Payment'));
      case 'rentalPeriod':
        const [yearA, monthA] = a.rentalPeriod.split('-').map(Number);
        const [yearB, monthB] = b.rentalPeriod.split('-').map(Number);
        const dateA = new Date(yearA, monthA - 1);
        const dateB = new Date(yearB, monthB - 1);
        return direction * (dateA.getTime() - dateB.getTime());
      case 'officialRent':
        return direction * ((a.officialRent || 0) - (b.officialRent || 0));
      case 'actualRent':
        return direction * (a.actualRentPaid - b.actualRentPaid);
      case 'createdAt':
        return direction * (getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
      default:
        return 0;
    }
  });

  const renderSortArrow = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-500" /> : <ArrowDown className="h-4 w-4 text-blue-500" />;
  };

  const filteredPayments = rentPayments.filter((payment) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const paymentDate = getTimestamp(payment.createdAt);
    const formattedDate = new Date(paymentDate).toLocaleDateString().toLowerCase();
    
    return (
      (payment.unitId || '').toLowerCase().includes(searchLower) ||
      (payment.tenantName || '').toLowerCase().includes(searchLower) ||
      (payment.paymentType || 'Rent Payment').toLowerCase().includes(searchLower) ||
      payment.rentalPeriod.includes(searchLower) ||
      (payment.officialRent || 0).toString().includes(searchTerm) ||
      payment.actualRentPaid.toString().includes(searchTerm) ||
      formattedDate.includes(searchLower)
    );
  });

  const formatRentalPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 ml-64">
          <AlertMessage
            variant="error"
            message={error}
          />
        </div>
      </div>
    );
  }

  const metrics = calculateDashboardMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="md:pl-64 w-full transition-all duration-300">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Card className="mb-4 md:mb-6">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <LayoutDashboard className="h-6 w-6 mr-2 text-blue-600" />
                  <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
                </div>
                <div className="w-full md:w-auto md:max-w-xs">
                  <Select value={selectedPropertyGroupId} onValueChange={setSelectedPropertyGroupId}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Select Property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {propertyGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id!}>
                          {group.groupName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard 
                title={`Rent Collected (${currentMonthName})`}
                value={formatCurrency(metrics.totalRentCollected)}
                icon={DollarSign}
                subtitle={`${metrics.collectionRate}% of Expected`}
                href="/dashboard/payments"
              />
              
              <StatCard 
                title="Occupancy Rate" 
                value={`${Math.round(metrics.occupancyRate)}%`}
                icon={Key}
                subtitle={`${metrics.occupiedUnits}/${metrics.totalProperties} units occupied`}
                href="/dashboard/tenants"
              />

              <StatCard 
                title="Properties" 
                value={metrics.totalProperties.toString()}
                icon={Building}
                subtitle={`${metrics.propertyTypeSplit.residential} Residential • ${metrics.propertyTypeSplit.commercial} Commercial`}
                href="/dashboard/property-mgmt"
              />
            </div>
            
            <div className="hidden lg:grid lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{currentMonthName} Rent Collection</CardTitle>
                    <Button
                      onClick={() => router.push("/dashboard/comms?tab=late-rent")}
                      style={{
                        backgroundColor: theme.colors.button.secondary,
                        color: theme.colors.button.secondaryText,
                        borderColor: theme.colors.button.secondaryBorder,
                      }}
                      className="hover:bg-secondary/10"
                      size="sm"
                      variant="outline"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900">Collected ({currentMonthName})</span>
                        <span className="text-sm font-medium text-gray-900">
                          {rentStatus.paid} of {rentStatus.paid + rentStatus.unpaid} units
                        </span>
                      </div>
                      <Progress 
                        value={rentStatus.paid + rentStatus.unpaid > 0 
                          ? (rentStatus.paid / (rentStatus.paid + rentStatus.unpaid)) * 100 
                          : 0
                        } 
                      />
                      
                      {rentStatus.unpaidLeases.length > 0 ? (
                        <div className="mt-6">
                          <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <span>Pending Payments ({formatCurrency(rentStatus.totalPendingAmount)})</span>
                          </h3>
                          <div className="space-y-3">
                            {rentStatus.unpaidLeases.map((lease) => (
                              <Card key={lease.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-gray-900">{lease.tenantName}</p>
                                      <p className="text-sm text-gray-500">Unit {lease.unitNumber}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-gray-900">{formatCurrency(lease.rentAmount)}</p>
                                      <p className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">
                                        Overdue
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg mt-4">
                          <p className="font-medium flex items-center">
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            All rents collected for {currentMonthName}!
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Delinquent Units Card - Desktop */}
              <Card>
                <CardHeader>
                  <CardTitle>Delinquent Units</CardTitle>
                  {/* No button specified for this card in PRD */}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {delinquentDataLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      ) : delinquentError ? (
                        <AlertMessage variant="error" message={delinquentError} />
                      ) : displayedDelinquentUnitsData && (displayedDelinquentUnitsData.totalDelinquentUnitsCount > 0 || displayedDelinquentUnitsData.units.length > 0) ? (
                        <>
                          <div className="mb-4">
                            <p className="text-sm" style={{ color: theme.colors.textPrimary }}>
                              Total Behind: <span className="text-lg font-semibold text-red-600">{formatCurrency(displayedDelinquentUnitsData.grandTotalRentBehind)}</span>
                            </p>
                          </div>
                          
                          {displayedDelinquentUnitsData.units.length > 0 ? (
                            <div className="mt-4">
                              <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <span>Details: {displayedDelinquentUnitsData.totalDelinquentUnitsCount} Delinquent Units</span>
                              </h3>
                              <div className="space-y-3">
                                {displayedDelinquentUnitsData.units.map((unit) => (
                                  <Card key={unit.unitId}>
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">{unit.tenantName} ({unit.unitNumber})</p>
                                          <p className="text-sm text-gray-500 mt-1">Rent: {formatCurrency(unit.activeLeaseRentAmount)}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-red-600">{formatCurrency(unit.totalRentBehindForUnit)}</p>
                                        </div>
                                      </div>

                                      {unit.delinquentDetails.map((period) => (
                                        <div key={period.rentalPeriod} className="text-xs border-t border-gray-200 py-2">
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-700">{formatRentalPeriod(period.rentalPeriod)}</span>
                                            {period.status === 'unpaid' && (
                                              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                                backgroundColor: "rgba(220, 38, 38, 0.08)",
                                                color: theme.colors.error
                                              }}>
                                                Unpaid: {formatCurrency(period.amountDue)}
                                              </span>
                                            )}
                                            {period.status === 'shortpaid' && (
                                              <span className="text-sm px-2 py-0.5 rounded-full" style={{
                                                backgroundColor: "rgba(245, 158, 11, 0.08)",
                                                color: "#B45309"
                                              }}>
                                                Short: {formatCurrency(period.amountShort || 0)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ) : (
                            null 
                          )}
                        </>
                      ) : (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg mt-4">
                          <p className="font-medium flex items-center">
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            No delinquent units found.
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Lease Expirations</CardTitle>
                    <Button
                      onClick={() => router.push("/dashboard/comms?tab=expired-lease")}
                      style={{
                        backgroundColor: theme.colors.button.secondary,
                        color: theme.colors.button.secondaryText,
                        borderColor: theme.colors.button.secondaryBorder,
                      }}
                      className="hover:bg-secondary/10"
                      size="sm"
                      variant="outline"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {upcomingExpirations.count > 0 ? (
                        <div className="mt-2">
                          <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <span>{upcomingExpirations.count} leases worth {formatCurrency(upcomingExpirations.totalLeaseValue)}</span>
                          </h3>
                          <div className="space-y-3">
                            {upcomingExpirations.leases.map((lease) => {
                              let statusColor = "text-green-600";
                              if (lease.daysLeft < 0) {
                                statusColor = "text-red-600";
                              } else if (lease.daysLeft <= 60) {
                                statusColor = "text-amber-600";
                              }
                              
                              return (
                                <Card key={lease.id}>
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-gray-900">{lease.tenantName}</p>
                                        <p className="text-sm text-gray-500">Unit {lease.unitNumber}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {formatCurrency(lease.rentAmount)} monthly
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className={`font-medium ${statusColor}`}>
                                          {lease.daysLeft < 0 
                                            ? `Expired ${Math.abs(lease.daysLeft)} days ago` 
                                            : `${lease.daysLeft} days left`}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                          {lease.daysLeft < 0 ? "Ended" : "Expires"} {formatDate(new Date(lease.leaseEndDate))}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 py-4">No upcoming lease expirations found.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>  
            </div>

            <div className="lg:hidden mt-4">
              <Tabs defaultValue="rent" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="rent">Rent</TabsTrigger>
                  <TabsTrigger value="delinquent">Delinqueny</TabsTrigger>
                  <TabsTrigger value="leases">Expirations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="rent">
                  <Card>
                    <CardContent className="p-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900">Collected ({currentMonthName})</span>
                            <span className="text-sm font-medium text-gray-900">
                              {rentStatus.paid} of {rentStatus.paid + rentStatus.unpaid} units
                            </span>
                          </div>
                          <Progress 
                            value={rentStatus.paid + rentStatus.unpaid > 0 
                              ? (rentStatus.paid / (rentStatus.paid + rentStatus.unpaid)) * 100 
                              : 0
                            } 
                          />
                          
                          {rentStatus.unpaidLeases.length > 0 ? (
                            <div className="mt-6">
                              <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <span>Pending Payments ({formatCurrency(rentStatus.totalPendingAmount)})</span>
                              </h3>
                              <div className="space-y-3">
                                {rentStatus.unpaidLeases.map((lease) => (
                                  <Card key={lease.id}>
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-gray-900">{lease.tenantName}</p>
                                          <p className="text-sm text-gray-500">Unit {lease.unitNumber}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium text-gray-900">{formatCurrency(lease.rentAmount)}</p>
                                          <p className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">
                                            Overdue
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 text-green-700 p-4 rounded-lg mt-4">
                              <p className="font-medium flex items-center">
                                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                All rents collected for {currentMonthName}!
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="delinquent">
                  <Card>
                    <CardContent className="p-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {delinquentDataLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                          ) : delinquentError ? (
                            <AlertMessage variant="error" message={delinquentError} />
                          ) : displayedDelinquentUnitsData && (displayedDelinquentUnitsData.totalDelinquentUnitsCount > 0 || displayedDelinquentUnitsData.units.length > 0) ? (
                            <>
                              <div className="mb-4">
                                <p className="text-sm" style={{ color: theme.colors.textPrimary }}>
                                  Total Behind: <span className="text-lg font-semibold text-red-600">{formatCurrency(displayedDelinquentUnitsData.grandTotalRentBehind)}</span>
                                </p>
                              </div>
                              
                              {displayedDelinquentUnitsData.units.length > 0 ? (
                                <div className="mt-4">
                                  <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    <span>Details: {displayedDelinquentUnitsData.totalDelinquentUnitsCount} Delinquent Units</span>
                                  </h3>
                                  <div className="space-y-3">
                                    {displayedDelinquentUnitsData.units.map((unit) => (
                                      <Card key={unit.unitId}>
                                        <CardContent className="p-4">
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <p className="text-sm font-medium text-gray-900">{unit.tenantName} ({unit.unitNumber})</p>
                                              <p className="text-sm text-gray-500 mt-1">Rent: {formatCurrency(unit.activeLeaseRentAmount)}</p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-sm font-semibold text-red-600">{formatCurrency(unit.totalRentBehindForUnit)}</p>
                                            </div>
                                          </div>

                                          {unit.delinquentDetails.map((period) => (
                                            <div key={period.rentalPeriod} className="text-sm border-t border-gray-200 py-2">
                                              <div className="flex justify-between items-center">
                                                <span className="font-medium text-gray-700">{formatRentalPeriod(period.rentalPeriod)}</span>
                                                {period.status === 'unpaid' && (
                                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                                    backgroundColor: "rgba(220, 38, 38, 0.08)",
                                                    color: theme.colors.error
                                                  }}>
                                                    Unpaid: {formatCurrency(period.amountDue)}
                                                  </span>
                                                )}
                                                {period.status === 'shortpaid' && (
                                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                                    backgroundColor: "rgba(245, 158, 11, 0.08)",
                                                    color: "#B45309"
                                                  }}>
                                                    Short: {formatCurrency(period.amountShort || 0)}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                null 
                              )}
                            </>
                          ) : (
                             <div className="bg-green-50 text-green-700 p-4 rounded-lg mt-4">
                               <p className="font-medium flex items-center">
                                 <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                 </svg>
                                 No delinquent units found.
                               </p>
                             </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leases">
                  <Card>
                    <CardContent className="p-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {upcomingExpirations.count > 0 ? (
                            <div className="mt-2">
                              <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <span>{upcomingExpirations.count} leases worth {formatCurrency(upcomingExpirations.totalLeaseValue)}</span>
                              </h3>
                              <div className="space-y-3">
                                {upcomingExpirations.leases.map((lease) => {
                                  let statusColor = "text-green-600";
                                  if (lease.daysLeft < 0) {
                                    statusColor = "text-red-600";
                                  } else if (lease.daysLeft <= 60) {
                                    statusColor = "text-amber-600";
                                  }
                                  
                                  return (
                                    <Card key={lease.id}>
                                      <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-medium text-gray-900">{lease.tenantName}</p>
                                            <p className="text-sm text-gray-500">Unit {lease.unitNumber}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              {formatCurrency(lease.rentAmount)} monthly
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className={`font-medium ${statusColor}`}>
                                              {lease.daysLeft < 0 
                                                ? `Expired ${Math.abs(lease.daysLeft)} days ago` 
                                                : `${lease.daysLeft} days left`}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                              {lease.daysLeft < 0 ? "Ended" : "Expires"} {formatDate(new Date(lease.leaseEndDate))}
                                            </p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 py-4">No upcoming lease expirations found.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 