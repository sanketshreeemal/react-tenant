"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, getDocs, query, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { FileText, Search, Filter, CheckCircle, XCircle } from "lucide-react";

interface Lease {
  id: string;
  tenantId: string;
  unitNumber: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export default function LeasesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchLeases = async () => {
      try {
        const leasesQuery = query(collection(db, "leases"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(leasesQuery);
        
        const leasesData: Lease[] = [];
        querySnapshot.forEach((doc) => {
          leasesData.push({ id: doc.id, ...doc.data() } as Lease);
        });
        
        setLeases(leasesData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching leases:", error);
        setIsLoading(false);
      }
    };

    if (user) {
      fetchLeases();
    }
  }, [user]);

  const toggleLeaseStatus = async (leaseId: string, currentStatus: boolean) => {
    try {
      const leaseRef = doc(db, "leases", leaseId);
      await updateDoc(leaseRef, {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setLeases(leases.map(lease => 
        lease.id === leaseId 
          ? { ...lease, isActive: !currentStatus, updatedAt: new Date() } 
          : lease
      ));
    } catch (error) {
      console.error("Error updating lease status:", error);
    }
  };

  const filteredLeases = leases.filter((lease) => {
    // Apply search filter
    const matchesSearch = 
      lease.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply active/inactive filter
    const matchesActiveFilter = 
      activeFilter === "all" || 
      (activeFilter === "active" && lease.isActive) || 
      (activeFilter === "inactive" && !lease.isActive);
    
    return matchesSearch && matchesActiveFilter;
  });

  const isLeaseExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
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
              <FileText className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Leases</h1>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search leases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                      activeFilter === "all" 
                        ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveFilter("all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium ${
                      activeFilter === "active" 
                        ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveFilter("active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 rounded-r-md border-t border-b border-r border-gray-300 text-sm font-medium ${
                      activeFilter === "inactive" 
                        ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveFilter("inactive")}
                  >
                    Inactive
                  </button>
                </div>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredLeases.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lease Period
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rent
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLeases.map((lease) => {
                      const expired = isLeaseExpired(lease.leaseEnd);
                      
                      return (
                        <tr key={lease.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{lease.unitNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lease.tenantName}</div>
                            <Link
                              href={`/dashboard/tenants/${lease.tenantId}`}
                              className="text-xs text-blue-600 hover:text-blue-900"
                            >
                              View Tenant
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(lease.leaseStart).toLocaleDateString()} - {new Date(lease.leaseEnd).toLocaleDateString()}
                            </div>
                            {expired && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Expired
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{lease.rentAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {lease.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <XCircle className="h-4 w-4 mr-1" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => toggleLeaseStatus(lease.id, lease.isActive)}
                              className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${
                                lease.isActive
                                  ? "text-red-700 bg-red-100 hover:bg-red-200"
                                  : "text-green-700 bg-green-100 hover:bg-green-200"
                              }`}
                            >
                              {lease.isActive ? "Mark Inactive" : "Mark Active"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No leases found</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Try adjusting your search" : "Add tenants to create leases"}
                </p>
                {!searchTerm && (
                  <Link
                    href="/dashboard/tenants/add"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Tenant
                  </Link>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 