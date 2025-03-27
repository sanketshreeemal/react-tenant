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

// Define type interfaces that match Firestore document structures
interface RentalInventory {
  id: string;
  unitNumber: string;
  propertyType: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  isAvailable: boolean;
  rentAmount: number;
  securityDeposit: number;
  createdAt: Date;
  updatedAt?: Date;
}

interface Lease {
  id: string;
  unitId: string;
  unitNumber: string;
  tenantId: string;
  tenantName: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  rentAmount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface RentPayment {
  id: string;
  leaseId: string;
  unitId: string;
  unitNumber: string;
  tenantId: string;
  tenantName: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  dueDate?: Date;
  paymentType?: string;
  collectionMethod?: string;
}

// Chart data interfaces
interface OccupancyChartData {
  month: string;
  Occupied: number;
  Vacant: number;
}

interface RentCollectionChartData {
  month: string;
  'Expected Rent': number;
  'Collected Rent': number;
  'Foregone Rent': number;
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rentalInventory, setRentalInventory] = useState<RentalInventory[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
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
  const [monthlyData, setMonthlyData] = useState<MonthlyTableData[]>([]);
  const [occupancyChartData, setOccupancyChartData] = useState<OccupancyChartData[]>([]);
  const [rentCollectionChartData, setRentCollectionChartData] = useState<RentCollectionChartData[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use firestoreUtils to fetch data
        const inventoryData = await getAllRentalInventory();
        const allLeases = await getAllLeases();
        const currentActiveLeases = await getAllActiveLeases();
        const allRentPayments = await getAllPayments();

        setRentalInventory(inventoryData as unknown as RentalInventory[]);
        setLeases(allLeases as unknown as Lease[]);
        setActiveLeases(currentActiveLeases as unknown as Lease[]);
        setRentPayments(allRentPayments as unknown as RentPayment[]);
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

  const generateMonthlyData = useCallback(() => {
    const tableData: MonthlyTableData[] = [];
    const occupancyData: OccupancyChartData[] = [];
    const rentData: RentCollectionChartData[] = [];
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

    // Get the total number of units - use the rental inventory directly
    const totalUnitCount = rentalInventory.length;

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, "MMM yyyy");
      const monthKey = format(month, "yyyy-MM");

      // Filter leases active during this month
      const monthLeases = leases.filter(lease => {
        const leaseStart = new Date(lease.leaseStartDate);
        const leaseEnd = new Date(lease.leaseEndDate);
        return (
          (isBefore(leaseStart, monthEnd) && isAfter(leaseEnd, monthStart)) ||
          isWithinInterval(monthStart, { start: leaseStart, end: leaseEnd }) ||
          isWithinInterval(monthEnd, { start: leaseStart, end: leaseEnd })
        );
      });

      // Get unique unit IDs that had active leases during this month
      const uniqueOccupiedUnitIds = Array.from(new Set(monthLeases.map(lease => lease.unitId)));
      const occupiedCount = uniqueOccupiedUnitIds.length;
      const vacantCount = totalUnitCount - occupiedCount;
      
      // Calculate occupancy rate for this month
      const occupancyRate = totalUnitCount > 0 ? (occupiedCount / totalUnitCount) * 100 : 0;

      // Calculate rent collection for this month
      const monthPayments = rentPayments.filter(payment => 
        isWithinInterval(new Date(payment.paymentDate), {
          start: monthStart,
          end: monthEnd
        }) && 
        (payment.paymentType === "Rent Payment" || !payment.paymentType)
      );
      
      const rentCollected = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);

      // Calculate expected rent for this month
      const expectedRent = monthLeases.reduce((sum, lease) => sum + lease.rentAmount, 0);
      
      // Calculate foregone rent for this month
      let monthForegoneRent = 0;
      rentalInventory.forEach((unit) => {
        const hasLease = monthLeases.some(lease => lease.unitId === unit.id);
        if (!hasLease) {
          const unitLeases = leases
            .filter(lease => lease.unitId === unit.id)
            .sort((a, b) => new Date(b.leaseEndDate).getTime() - new Date(a.leaseEndDate).getTime());
          
          if (unitLeases.length > 0) {
            monthForegoneRent += unitLeases[0].rentAmount;
          } else {
            monthForegoneRent += unit.rentAmount;
          }
        }
      });

      // Collection rate with safeguard for division by zero
      let collectionRate = 0;
      if (expectedRent > 0) {
        collectionRate = (rentCollected / expectedRent) * 100;
      } else if (rentCollected > 0) {
        collectionRate = 100;
      }

      // Create table data entry
      tableData.push({
        month: monthLabel,
        occupiedUnits: occupiedCount,
        vacantUnits: vacantCount,
        occupancyRate: occupancyRate.toFixed(1),
        expectedRent,
        rentCollected,
        collectionRate: collectionRate.toFixed(1),
      });

      // Create simplified occupancy chart data
      occupancyData.push({
        month: monthLabel,
        Occupied: occupancyRate,
        Vacant: 100 - occupancyRate,
      });

      // Create simplified rent collection chart data
      rentData.push({
        month: monthLabel,
        'Expected Rent': expectedRent,
        'Collected Rent': rentCollected,
        'Foregone Rent': monthForegoneRent,
      });
    }

    setMonthlyData(tableData);
    setOccupancyChartData(occupancyData);
    setRentCollectionChartData(rentData);
  }, [rentalInventory, leases, rentPayments, timeRange]);

  const calculateAnalytics = useCallback(() => {
    if (rentalInventory.length === 0) return;

    // Total units from rental inventory
    setTotalUnits(rentalInventory.length);

    // Occupied units (units with active leases)
    const uniqueOccupiedUnitIds = Array.from(new Set(activeLeases.map(lease => lease.unitId)));
    const occupiedCount = uniqueOccupiedUnitIds.length;
    setOccupiedUnits(occupiedCount);

    // Vacant units
    const vacant = totalUnits - occupiedCount;
    setVacantUnits(vacant);

    // Occupancy rate
    const occupancyRateValue = rentalInventory.length > 0 ? (occupiedCount / rentalInventory.length) * 100 : 0;
    setOccupancyRate(occupancyRateValue);

    // Current monthly revenue from active leases
    const monthlyRevenue = activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0);
    setMonthlyRevenue(monthlyRevenue || 0);

    // Calculate foregone rent for vacant units
    let foregoneRentAmount = 0;
    rentalInventory.forEach((unit) => {
      const hasActiveLease = activeLeases.some(lease => lease.unitId === unit.id);
      if (!hasActiveLease) {
        const unitLeases = leases
          .filter(lease => lease.unitId === unit.id)
          .sort((a, b) => new Date(b.leaseEndDate).getTime() - new Date(a.leaseEndDate).getTime());
        
        if (unitLeases.length > 0) {
          foregoneRentAmount += unitLeases[0].rentAmount;
        } else {
          foregoneRentAmount += unit.rentAmount;
        }
      }
    });
    setForegoneRent(foregoneRentAmount || 0);

    // Calculate current month's rent collection rate
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const expectedRent = monthlyRevenue;
    const currentMonthPayments = rentPayments.filter(payment => 
      isWithinInterval(new Date(payment.paymentDate), {
        start: currentMonthStart,
        end: currentMonthEnd
      })
    );
    const collectedRent = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    let collectionRate = 0;
    if (expectedRent > 0) {
      collectionRate = (collectedRent / expectedRent) * 100;
    } else if (collectedRent > 0) {
      collectionRate = 100;
    }
    setRentCollectionRate(collectionRate);

    // Generate data for charts and table
    generateMonthlyData();
  }, [rentalInventory, activeLeases, rentPayments, leases, timeRange, totalUnits, generateMonthlyData]);

  useEffect(() => {
    if (!isLoading) {
      calculateAnalytics();
    }
  }, [isLoading, calculateAnalytics]);

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
                          dataKey="Collected Rent"
                          stroke="#34d399"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Foregone Rent"
                          stroke="#f43f5e"
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