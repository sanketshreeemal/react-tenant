"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { BarChart2, TrendingUp, Home, DollarSign, Calendar } from "lucide-react";
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";

interface Lease {
  id: string;
  unitNumber: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  isActive: boolean;
  createdAt: any;
}

interface RentPayment {
  id: string;
  unitNumber: string;
  tenantName: string;
  officialRent: number;
  actualRent: number;
  rentalPeriod: string;
  createdAt: any;
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"3m" | "6m" | "1y" | "all">("6m");
  
  // Analytics data
  const [totalUnits, setTotalUnits] = useState(0);
  const [occupiedUnits, setOccupiedUnits] = useState(0);
  const [vacantUnits, setVacantUnits] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [foregoneRent, setForegoneRent] = useState(0);
  const [rentCollectionRate, setRentCollectionRate] = useState(0);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all leases
        const leasesQuery = query(
          collection(db, "leases"),
          orderBy("createdAt", "desc")
        );
        const leasesSnapshot = await getDocs(leasesQuery);
        
        const leasesData: Lease[] = [];
        leasesSnapshot.forEach((doc) => {
          leasesData.push({ id: doc.id, ...doc.data() } as Lease);
        });
        
        setLeases(leasesData);
        
        // Fetch rent payments
        const paymentsQuery = query(
          collection(db, "rentPayments"),
          orderBy("createdAt", "desc")
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        const paymentsData: RentPayment[] = [];
        paymentsSnapshot.forEach((doc) => {
          paymentsData.push({ id: doc.id, ...doc.data() } as RentPayment);
        });
        
        setRentPayments(paymentsData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (leases.length > 0 && !isLoading) {
      calculateAnalytics();
    }
  }, [leases, rentPayments, isLoading, timeRange]);

  const calculateAnalytics = () => {
    // Get unique units
    const uniqueUnits = [...new Set(leases.map(lease => lease.unitNumber))];
    setTotalUnits(uniqueUnits.length);
    
    // Get active leases
    const activeLeases = leases.filter(lease => lease.isActive);
    const activeUnitNumbers = [...new Set(activeLeases.map(lease => lease.unitNumber))];
    setOccupiedUnits(activeUnitNumbers.length);
    
    // Calculate vacant units
    const vacant = totalUnits - occupiedUnits;
    setVacantUnits(vacant);
    
    // Calculate occupancy rate
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    setOccupancyRate(occupancyRate);
    
    // Calculate monthly revenue (sum of all active lease rent amounts)
    const monthlyRevenue = activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0);
    setMonthlyRevenue(monthlyRevenue);
    
    // Calculate foregone rent (estimated rent for vacant units)
    const averageRent = activeLeases.length > 0 
      ? activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0) / activeLeases.length 
      : 0;
    const foregoneRent = vacant * averageRent;
    setForegoneRent(foregoneRent);
    
    // Calculate rent collection rate
    const currentMonth = format(new Date(), "yyyy-MM");
    const currentMonthPayments = rentPayments.filter(payment => payment.rentalPeriod === currentMonth);
    const totalExpectedRent = monthlyRevenue;
    const totalCollectedRent = currentMonthPayments.reduce((sum, payment) => sum + payment.actualRent, 0);
    const collectionRate = totalExpectedRent > 0 ? (totalCollectedRent / totalExpectedRent) * 100 : 0;
    setRentCollectionRate(collectionRate);
    
    // Generate monthly data for charts
    generateMonthlyData();
  };

  const generateMonthlyData = () => {
    const data = [];
    const now = new Date();
    let monthsToShow = 6;
    
    switch (timeRange) {
      case "3m":
        monthsToShow = 3;
        break;
      case "6m":
        monthsToShow = 6;
        break;
      case "1y":
        monthsToShow = 12;
        break;
      case "all":
        monthsToShow = 24; // Show up to 2 years of data
        break;
    }
    
    for (let i = 0; i < monthsToShow; i++) {
      const month = subMonths(now, i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, "MMM yyyy");
      const monthKey = format(month, "yyyy-MM");
      
      // Calculate occupancy for this month
      const activeLeases = leases.filter(lease => {
        const leaseStart = new Date(lease.leaseStart);
        const leaseEnd = new Date(lease.leaseEnd);
        return isWithinInterval(monthStart, { start: leaseStart, end: leaseEnd }) ||
               isWithinInterval(monthEnd, { start: leaseStart, end: leaseEnd });
      });
      
      const uniqueOccupiedUnits = [...new Set(activeLeases.map(lease => lease.unitNumber))];
      const occupiedCount = uniqueOccupiedUnits.length;
      const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;
      
      // Calculate rent collected for this month
      const monthPayments = rentPayments.filter(payment => payment.rentalPeriod === monthKey);
      const rentCollected = monthPayments.reduce((sum, payment) => sum + payment.actualRent, 0);
      
      // Calculate expected rent for this month
      const expectedRent = activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0);
      
      data.unshift({
        month: monthLabel,
        occupiedUnits: occupiedCount,
        vacantUnits: totalUnits - occupiedCount,
        occupancyRate: occupancyRate.toFixed(1),
        rentCollected,
        expectedRent,
        collectionRate: expectedRent > 0 ? ((rentCollected / expectedRent) * 100).toFixed(1) : "0",
      });
    }
    
    setMonthlyData(data);
  };

  if (loading || !user) {
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
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <BarChart2 className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
            </div>
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                className={`inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                  timeRange === "3m" 
                    ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setTimeRange("3m")}
              >
                3 Months
              </button>
              <button
                type="button"
                className={`inline-flex items-center px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium ${
                  timeRange === "6m" 
                    ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setTimeRange("6m")}
              >
                6 Months
              </button>
              <button
                type="button"
                className={`inline-flex items-center px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium ${
                  timeRange === "1y" 
                    ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setTimeRange("1y")}
              >
                1 Year
              </button>
              <button
                type="button"
                className={`inline-flex items-center px-4 py-2 rounded-r-md border-t border-b border-r border-gray-300 text-sm font-medium ${
                  timeRange === "all" 
                    ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setTimeRange("all")}
              >
                All Time
              </button>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                      <Home className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                      <div className="flex items-center">
                        <p className="text-2xl font-semibold text-gray-900">{occupancyRate.toFixed(1)}%</p>
                        <span className="ml-2 text-sm text-gray-500">
                          ({occupiedUnits}/{totalUnits} units)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                      <p className="text-2xl font-semibold text-gray-900">₹{monthlyRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Foregone Rent</p>
                      <p className="text-2xl font-semibold text-gray-900">₹{foregoneRent.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Collection Rate</p>
                      <p className="text-2xl font-semibold text-gray-900">{rentCollectionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Occupancy Trends</h2>
                  <div className="h-80">
                    {/* Placeholder for chart - in a real app, you would use a charting library like Chart.js or Recharts */}
                    <div className="border-4 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2">Occupancy Rate Chart</p>
                        <p className="text-sm text-gray-400">
                          This would be a line chart showing occupancy rate over time
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Rent Collection</h2>
                  <div className="h-80">
                    {/* Placeholder for chart */}
                    <div className="border-4 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2">Rent Collection Chart</p>
                        <p className="text-sm text-gray-400">
                          This would be a bar chart comparing expected vs. collected rent
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Monthly Data Table */}
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Monthly Performance</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Month
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Occupied Units
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vacant Units
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Occupancy Rate
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Rent
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Collected Rent
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Collection Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyData.map((data, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{data.month}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.occupiedUnits}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.vacantUnits}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${data.occupancyRate}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm text-gray-900">{data.occupancyRate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{data.expectedRent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{data.rentCollected.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    parseFloat(data.collectionRate) >= 90 
                                      ? "bg-green-600" 
                                      : parseFloat(data.collectionRate) >= 75 
                                        ? "bg-yellow-500" 
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${data.collectionRate}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm text-gray-900">{data.collectionRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
} 