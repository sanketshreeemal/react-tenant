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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pl-64 pt-6"> {/* Added pl-64 to push content right of the sidebar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Properties" 
              value={metrics.totalProperties.toString()} 
              icon="🏢"
              subtitle={`${metrics.occupancyRate}% Occupied`}
              details={[
                `${metrics.occupiedUnits} Occupied`,
                `${metrics.totalProperties - metrics.occupiedUnits} Vacant`
              ]}
            />
            <StatCard 
              title="Rent Collected" 
              value={formatCurrency(metrics.totalRentCollected)} 
              icon="💰"
              subtitle={`${metrics.collectionRate}% of Expected`}
              details={[
                `Expected: ${formatCurrency(metrics.totalExpectedRent)}`,
                `${rentStatus.paid} of ${rentStatus.paid + rentStatus.unpaid} Units Paid`
              ]}
              highlightValue={metrics.collectionRate > 100}
            />
            <StatCard 
              title="Active Leases" 
              value={activeLeases.length.toString()} 
              icon="📝"
              subtitle={`${metrics.upcomingExpirations} Expiring Soon`}
              details={[
                `${upcomingExpirations.filter(l => l.daysLeft < 0).length} Expired`,
                `${upcomingExpirations.filter(l => l.daysLeft >= 0 && l.daysLeft <= 30).length} Expiring in 30 Days`
              ]}
            />
            <StatCard 
              title="Vacancy" 
              value={`${properties.length - activeLeases.length}`} 
              icon="🔑"
              subtitle="Available Units"
              details={[
                `${Math.round(100 - metrics.occupancyRate)}% Vacancy Rate`,
                `${properties.length > 0 ? formatCurrency((metrics.totalProperties - metrics.occupiedUnits) * (metrics.totalExpectedRent / metrics.occupiedUnits || 0)) : '₹0'} Potential Income`
              ]}
              highlightValue={properties.length - activeLeases.length > 0}
            />
          </div>
          
          {/* Main Dashboard Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Lease Expirations */}
            <DashboardCard title="Upcoming Lease Expirations" icon="⏳">
              {upcomingExpirations.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {upcomingExpirations.map((lease) => {
                    // Color coding: red for expired, orange for expiring soon (30-60 days), green for safe
                    let statusColor = "text-green-600";
                    if (lease.daysLeft < 0) {
                      statusColor = "text-red-600";
                    } else if (lease.daysLeft <= 60) {
                      statusColor = "text-amber-600";
                    }
                    
                    return (
                      <div key={lease.id} className="py-4 flex justify-between items-center">
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
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 py-4">No upcoming lease expirations found.</p>
              )}
              <div className="mt-4">
                <Link 
                  href="/dashboard/tenants" 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  View all leases
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </DashboardCard>
            
            {/* Rent Collection Status */}
            <DashboardCard title={`${currentMonthName} Rent Collection Status`} icon="💸">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Collected</span>
                  <span className="text-sm font-medium text-gray-900">{rentStatus.paid} of {rentStatus.paid + rentStatus.unpaid} units</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full" 
                    style={{ 
                      width: `${rentStatus.paid + rentStatus.unpaid > 0 
                        ? (rentStatus.paid / (rentStatus.paid + rentStatus.unpaid)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>{rentStatus.paid + rentStatus.unpaid > 0 
                    ? Math.round((rentStatus.paid / (rentStatus.paid + rentStatus.unpaid)) * 100) 
                    : 0}%</span>
                  <span>100%</span>
                </div>
              </div>
              
              {rentStatus.unpaidLeases.length > 0 ? (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Pending Payments</h3>
                  <div className="space-y-4">
                    {rentStatus.unpaidLeases.map((lease) => (
                      <div key={lease.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{lease.tenantName}</p>
                            <p className="text-sm text-gray-500">Unit {lease.unitNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(lease.rentAmount)}</p>
                            <p className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block mt-1">Overdue</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-100">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="font-medium">All rents collected for {currentMonthName}!</p>
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <Link 
                  href="/dashboard/rent" 
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center transition-colors"
                >
                  Manage rent payments
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  subtitle,
  details = [],
  highlightValue = false
}: { 
  title: string; 
  value: string; 
  icon: string; 
  subtitle?: string;
  details?: string[];
  highlightValue?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:border-gray-200 hover:shadow transition-all">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-500 font-medium">{title}</h2>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mb-2">
        <p className={`text-3xl font-bold ${highlightValue ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {details.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {details.map((detail, index) => (
            <p key={index} className="text-xs text-gray-500 mb-1">{detail}</p>
          ))}
        </div>
      )}
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
      <div className="px-6 py-4 border-b border-gray-100 flex items-center">
        {icon && <span className="mr-2 text-xl">{icon}</span>}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  );
} 