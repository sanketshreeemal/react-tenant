"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/hooks/useAuth";
import Navigation from "../../components/Navigation";
import Link from "next/link";
import { 
  getAllRentalInventory, 
  getAllActiveLeases, 
  getAllRentPayments,
  getAllLeases
} from "../../lib/firebase/firestoreUtils";
import { RentalInventory, Lease, RentPayment } from "../../types";
import { formatCurrency, formatDate } from "../../lib/utils/formatters";
import { AlertMessage } from "@/components/ui/alert-message";
import { theme } from "@/theme/theme";
import { StatCard } from "@/components/ui/statcard";
import { Building, DollarSign, FileText, Key } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress"

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<RentalInventory[]>([]);
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [allLeases, setAllLeases] = useState<Lease[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [currentMonthName, setCurrentMonthName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Set current month and month name on component mount
    const now = new Date();
    setCurrentMonth(now.toISOString().slice(0, 7)); // Format: "YYYY-MM"
    setCurrentMonthName(now.toLocaleString('default', { month: 'long', year: 'numeric' }));
  }, []);

  useEffect(() => {
    if (user) {
      const fetchDashboardData = async () => {
        setDataLoading(true);
        try {
          const [propertiesData, activeLeaseData, allLeasesData, paymentsData] = await Promise.all([
            getAllRentalInventory(),
            getAllActiveLeases(),
            getAllLeases(),
            getAllRentPayments()
          ]);
          
          setProperties(propertiesData);
          setActiveLeases(activeLeaseData);
          setAllLeases(allLeasesData);
          setRentPayments(paymentsData);
        } catch (err) {
          console.error("Error fetching dashboard data:", err);
          setError("Failed to load dashboard data. Please try again later.");
        } finally {
          setDataLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [user]);

  // Calculate dashboard metrics
  const calculateDashboardMetrics = () => {
    // Total properties
    const totalProperties = properties.length;

    // Occupancy rate
    const occupiedUnits = activeLeases.length;
    const occupancyRate = totalProperties > 0 
      ? Math.round((occupiedUnits / totalProperties) * 100) 
      : 0;

    // Current month rent collection
    const currentMonthPayments = rentPayments.filter(
      payment => payment.rentalPeriod === currentMonth
    );
    const totalRentCollected = currentMonthPayments.reduce(
      (sum, payment) => sum + payment.actualRentPaid, 0
    );
    
    // Expected rent (from active leases)
    const totalExpectedRent = activeLeases.reduce(
      (sum, lease) => sum + lease.rentAmount, 0
    );
    
    // Collection rate
    const collectionRate = totalExpectedRent > 0 
      ? Math.round((totalRentCollected / totalExpectedRent) * 100) 
      : 0;
    
    // Upcoming lease expirations (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const upcomingExpirations = activeLeases.filter(lease => {
      const endDate = new Date(lease.leaseEndDate);
      return endDate >= today && endDate <= thirtyDaysFromNow;
    }).length;

    return {
      totalProperties,
      occupancyRate,
      totalRentCollected,
      totalExpectedRent,
      collectionRate,
      upcomingExpirations,
      occupiedUnits
    };
  };

  // Get lease expirations for active leases
  const getUpcomingLeaseExpirations = () => {
    const today = new Date();
    
    return activeLeases
      .map(lease => {
        const endDate = new Date(lease.leaseEndDate);
        const daysLeft = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...lease, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5); // Show top 5 expiring leases
  };

  // Get rent collection status
  const getRentCollectionStatus = () => {
    // Get units with paid rent this month
    const paidUnitIds = rentPayments
      .filter(payment => payment.rentalPeriod === currentMonth)
      .map(payment => payment.unitId);
    
    // Units with active leases that haven't paid
    const unpaidLeases = activeLeases.filter(
      lease => !paidUnitIds.includes(lease.unitId)
    );
    
    return {
      paid: paidUnitIds.length,
      unpaid: unpaidLeases.length,
      unpaidLeases: unpaidLeases.slice(0, 5) // Show top 5 unpaid leases
    };
  };

  // Add new function to calculate property type split
  const calculatePropertyTypeSplit = (properties: RentalInventory[]) => {
    const commercial = properties.filter(p => p.propertyType === 'Commercial').length;
    const residential = properties.filter(p => p.propertyType === 'Residential').length;
    return { commercial, residential };
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
  const upcomingExpirations = getUpcomingLeaseExpirations();
  const rentStatus = getRentCollectionStatus();
  const propertyTypeSplit = calculatePropertyTypeSplit(properties);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="md:pl-64 w-full transition-all duration-300">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
            </div>
            
            {/* Summary Cards - Mobile First Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-6">
              {/* Properties Card */}
              <StatCard 
                title="Properties" 
                value={metrics.totalProperties.toString()}
                icon={Building}
                subtitle={[
                  `${propertyTypeSplit.residential} Residential`,
                  `${propertyTypeSplit.commercial} Commercial`
                ]}
                actionButton={{
                  label: "Manage",
                  href: "/dashboard/rental-inventory",
                  variant: "outline"
                }}
              />
              
              <StatCard 
                title="Rent Collected" 
                value={formatCurrency(metrics.totalRentCollected)}
                icon={DollarSign}
                subtitle={`${metrics.collectionRate}% of Expected`}
                highlightValue={metrics.collectionRate > 100}
                actionButton={{
                  label: "Manage",
                  href: "/dashboard/rent",
                  variant: "outline"
                }}
              />
              
              <StatCard 
                title="Occupancy" 
                value={`${Math.round(metrics.occupancyRate)}%`}
                icon={Key}
                subtitle={`${metrics.occupiedUnits}/${properties.length} units occupied`}
                highlightValue={properties.length - activeLeases.length > 0}
                actionButton={{
                  label: "Manage",
                  href: "/dashboard/properties/new",
                  variant: "outline"
                }}
              />
            </div>
            
            {/* Desktop Layout - Side by Side Cards */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4">
              {/* Rent Collection Status */}
              <Card>
                <CardHeader>
                  <CardTitle>{currentMonthName} Rent Collection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-500">Collected</span>
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
                          <h3 className="font-medium text-gray-900 mb-3">Pending Payments</h3>
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

              {/* Lease Expirations */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Lease Expirations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {upcomingExpirations.length > 0 ? (
                        upcomingExpirations.map((lease) => {
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
                        })
                      ) : (
                        <p className="text-gray-500 py-4">No upcoming lease expirations found.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Layout - Tabbed Interface */}
            <div className="lg:hidden mt-4">
              <Tabs defaultValue="rent" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rent">Rent Collection</TabsTrigger>
                  <TabsTrigger value="leases">Lease Expirations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="rent">
                  <Card>
                    <CardContent className="p-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-500">Collected</span>
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
                              <h3 className="font-medium text-gray-900 mb-3">Pending Payments</h3>
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
                
                <TabsContent value="leases">
                  <Card>
                    <CardContent className="p-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {upcomingExpirations.length > 0 ? (
                            upcomingExpirations.map((lease) => {
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
                            })
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

function DashboardCard({ 
  title, 
  children, 
  icon 
}: { 
  title: string; 
  children: React.ReactNode; 
  icon?: string 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center">
        {icon && <span className="mr-2 text-lg md:text-xl">{icon}</span>}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-4 md:px-6 py-3 md:py-4">
        {children}
      </div>
    </div>
  );
} 