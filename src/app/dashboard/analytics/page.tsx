"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import {
  BarChart2,
  TrendingUp,
  Home,
  DollarSign,
  Calendar,
} from "lucide-react";
import {
  format,
  subMonths,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
  isAfter,
  isBefore,
  addMonths,
} from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import {
  getAllRentalInventory,
  getAllLeases,
  getAllActiveLeases,
  getAllPayments,
} from "../../../lib/firebase/firestoreUtils";
import { RentalInventory, Lease, RentPayment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { theme } from '@/theme/theme';

// Define type interfaces that match Firestore document structures
interface OccupancyChartData {
  month: string;
  Occupied: number;
  Vacant: number;
}

interface RentCollectionChartData {
  month: string;
  Expected: number;
  Collected: number;
  Foregone: number;
}

interface MonthlyTableData {
  month: string;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: string;
  expectedRent: number;
  rentCollected: number;
  collectionRate: string;
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const landlordId = user?.landlordId;
  const [rentalInventory, setRentalInventory] = useState<RentalInventory[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"3m" | "6m" | "1y" | "all">("6m");

  // Analytics data
  const [totalUnits, setTotalUnits] = useState(0);
  const [occupiedUnits, setOccupiedUnits] = useState(0);
  const [vacantUnits, setVacantUnits] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [foregoneRent, setForegoneRent] = useState(0);
  const [rentCollectionRate, setRentCollectionRate] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyTableData[]>([]);
  const [occupancyChartData, setOccupancyChartData] = useState<OccupancyChartData[]>([]);
  const [rentCollectionChartData, setRentCollectionChartData] = useState<RentCollectionChartData[]>([]);
  const [monthlyTableData, setMonthlyTableData] = useState<MonthlyTableData[]>([]);

  // Helper function to get start date based on time range
  const getStartDate = (range: "3m" | "6m" | "1y" | "all"): Date => {
    const now = new Date();
    switch (range) {
      case "3m":
        return subMonths(now, 3);
      case "6m":
        return subMonths(now, 6);
      case "1y":
        return subMonths(now, 12);
      case "all":
        return subMonths(now, 24); // Show up to 2 years of data
      default:
        return subMonths(now, 6);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const calculateAnalytics = useCallback((
    inventory: RentalInventory[],
    active: Lease[],
    payments: RentPayment[]
  ) => {
    // Total units
    const total = inventory.length;
    setTotalUnits(total);

    // Occupied units (units with active leases)
    const occupied = active.length;
    setOccupiedUnits(occupied);

    // Vacant units
    const vacant = total - occupied;
    setVacantUnits(vacant);

    // Occupancy rate
    const rate = total > 0 ? (occupied / total) * 100 : 0;
    setOccupancyRate(rate);

    // Monthly revenue (sum of rent amounts from active leases)
    const revenue = active.reduce((sum, lease) => sum + lease.rentAmount, 0);
    setMonthlyRevenue(revenue);

    // Foregone rent (potential rent from vacant units, using average rent)
    const avgRent = active.length > 0
      ? active.reduce((sum, lease) => sum + lease.rentAmount, 0) / active.length
      : 0;
    const foregone = vacant * avgRent;
    setForegoneRent(foregone);

    // Calculate current month's rent collection rate
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const expectedRent = revenue;
    const currentMonthPayments = payments.filter(payment => 
      isWithinInterval(new Date(payment.paymentDate), {
        start: currentMonthStart,
        end: currentMonthEnd
      })
    );
    const collectedRent = currentMonthPayments.reduce((sum, payment) => sum + payment.actualRentPaid, 0);
    const collectionRate = expectedRent > 0 ? (collectedRent / expectedRent) * 100 : 0;
    setRentCollectionRate(collectionRate);

    // Generate data for charts and table
    const monthlyData: MonthlyTableData[] = [];
    const occupancyData: OccupancyChartData[] = [];
    const rentCollectionData: RentCollectionChartData[] = [];

    // Calculate data for each month in the selected time range
    let startDate = getStartDate(timeRange);
    let currentDate = new Date();

    while (startDate <= currentDate) {
      const monthStr = format(startDate, 'MMM yyyy');
      const monthStart = startOfMonth(startDate);
      const monthEnd = endOfMonth(startDate);

      // Filter leases active in this month
      const monthLeases = leases.filter(lease =>
        isWithinInterval(startDate, {
          start: new Date(lease.leaseStartDate),
          end: new Date(lease.leaseEndDate)
        })
      );

      // Calculate occupancy for this month
      const monthOccupied = monthLeases.length;
      const monthVacant = inventory.length - monthOccupied;
      const monthOccupancyRate = inventory.length > 0
        ? (monthOccupied / inventory.length) * 100
        : 0;

      // Calculate rent collection for this month
      let monthExpectedRent = 0;
      let monthCollectedRent = 0;
      let monthForegoneRent = 0;

      // Calculate expected and foregone rent
      inventory.forEach(unit => {
        const unitLeases = monthLeases.filter(lease => lease.unitId === unit.id);
        if (unitLeases.length > 0) {
          monthExpectedRent += unitLeases[0].rentAmount;
        } else {
          monthForegoneRent += avgRent; // Use average rent for vacant units
        }
      });

      // Calculate collected rent
      const monthPayments = rentPayments.filter(payment =>
        isWithinInterval(new Date(payment.paymentDate), {
          start: monthStart,
          end: monthEnd
        })
      );
      monthCollectedRent = monthPayments.reduce((sum, payment) => sum + payment.actualRentPaid, 0);

      // Add data to arrays
      monthlyData.push({
        month: monthStr,
        occupiedUnits: monthOccupied,
        vacantUnits: monthVacant,
        occupancyRate: `${monthOccupancyRate.toFixed(1)}%`,
        expectedRent: monthExpectedRent,
        rentCollected: monthCollectedRent,
        collectionRate: `${((monthCollectedRent / monthExpectedRent) * 100).toFixed(1)}%`
      });

      occupancyData.push({
        month: monthStr,
        Occupied: monthOccupied,
        Vacant: monthVacant
      });

      rentCollectionData.push({
        month: monthStr,
        Expected: monthExpectedRent,
        Collected: monthCollectedRent,
        Foregone: monthForegoneRent
      });

      // Move to next month
      startDate = addMonths(startDate, 1);
    }

    // Update state with calculated data
    setMonthlyTableData(monthlyData);
    setOccupancyChartData(occupancyData);
    setRentCollectionChartData(rentCollectionData);
  }, [timeRange, leases, rentPayments]);

  const fetchData = useCallback(async () => {
    if (landlordId) {
      try {
        // Use firestoreUtils to fetch data
        const inventoryData = await getAllRentalInventory(landlordId);
        const allLeases = await getAllLeases(landlordId);
        const currentActiveLeases = await getAllActiveLeases(landlordId);
        const allRentPayments = await getAllPayments(landlordId);

        setRentalInventory(inventoryData);
        setLeases(allLeases);
        setActiveLeases(currentActiveLeases);
        setRentPayments(allRentPayments);

        // Calculate analytics
        calculateAnalytics(inventoryData, currentActiveLeases, allRentPayments);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message || 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
      }
    }
  }, [landlordId, calculateAnalytics]);

  useEffect(() => {
    if (!isLoading) {
      fetchData();
    }
  }, [isLoading, fetchData]);

  if (authLoading || !user) {
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
                        <p className="text-2xl font-semibold text-gray-900">
                          {Number.isNaN(occupancyRate) ? "No Data" : `${occupancyRate.toFixed(1)}%`}
                        </p>
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
                      <p className="text-2xl font-semibold text-gray-900">
                        {monthlyRevenue <= 0 ? "No Revenue" : `₹${monthlyRevenue.toLocaleString()}`}
                      </p>
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
                      <p className="text-2xl font-semibold text-gray-900">
                        {foregoneRent <= 0 ? "₹0" : `₹${foregoneRent.toLocaleString()}`}
                      </p>
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
                      <p className="text-2xl font-semibold text-gray-900">
                        {Number.isNaN(rentCollectionRate) ? "No Data" : `${rentCollectionRate.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Occupancy Trends</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={occupancyChartData}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 20,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis 
                          tickFormatter={(value) => `${Math.floor(value)}%`}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="Occupied" 
                          stroke="#4ade80" 
                          strokeWidth={2}
                          name="Occupancy Rate" 
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Rent Collection</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={rentCollectionChartData}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 20,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis 
                          tickFormatter={(value) => 
                            value >= 1000 
                              ? `₹${Math.floor(value / 1000)}K` 
                              : `₹${value}`
                          } 
                        />
                        <Tooltip 
                          formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Collected"
                          stroke="#34d399"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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
                      {monthlyTableData.map((data, index) => (
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