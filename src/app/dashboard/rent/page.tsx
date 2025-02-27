"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { collection, getDocs, query, orderBy, where, addDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";
import { DollarSign, Search, Filter, Plus, Calendar, Check, X } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";

interface Lease {
  id: string;
  tenantId: string;
  unitNumber: string;
  tenantName: string;
  rentAmount: number;
  isActive: boolean;
}

interface RentPayment {
  id: string;
  leaseId: string;
  unitNumber: string;
  tenantName: string;
  officialRent: number;
  actualRent: number;
  rentalPeriod: string;
  comments: string;
  createdAt: any;
}

export default function RentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    leaseId: "",
    unitNumber: "",
    tenantName: "",
    officialRent: 0,
    actualRent: "",
    rentalPeriod: format(new Date(), "yyyy-MM"),
    comments: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active leases
        const leasesQuery = query(
          collection(db, "leases"),
          where("isActive", "==", true),
          orderBy("unitNumber")
        );
        const leasesSnapshot = await getDocs(leasesQuery);
        
        const leasesData: Lease[] = [];
        leasesSnapshot.forEach((doc) => {
          leasesData.push({ id: doc.id, ...doc.data() } as Lease);
        });
        
        setActiveLeases(leasesData);
        
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "leaseId" && value) {
      const selectedLease = activeLeases.find(lease => lease.id === value);
      if (selectedLease) {
        setFormData({
          ...formData,
          leaseId: value,
          unitNumber: selectedLease.unitNumber,
          tenantName: selectedLease.tenantName,
          officialRent: selectedLease.rentAmount,
          actualRent: selectedLease.rentAmount.toString(),
        });
        return;
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    
    try {
      // Validate form
      if (!formData.leaseId || !formData.actualRent || !formData.rentalPeriod) {
        throw new Error("Please fill in all required fields");
      }
      
      // Add rent payment to Firestore
      const paymentData = {
        leaseId: formData.leaseId,
        unitNumber: formData.unitNumber,
        tenantName: formData.tenantName,
        officialRent: formData.officialRent,
        actualRent: parseFloat(formData.actualRent),
        rentalPeriod: formData.rentalPeriod,
        comments: formData.comments,
        createdAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, "rentPayments"), paymentData);
      
      // Add to local state
      setRentPayments([
        { id: docRef.id, ...paymentData } as RentPayment,
        ...rentPayments,
      ]);
      
      setSuccessMessage("Rent payment recorded successfully!");
      
      // Reset form
      setFormData({
        leaseId: "",
        unitNumber: "",
        tenantName: "",
        officialRent: 0,
        actualRent: "",
        rentalPeriod: format(new Date(), "yyyy-MM"),
        comments: "",
      });
      
      // Hide form after successful submission
      setTimeout(() => {
        setShowAddForm(false);
        setSuccessMessage("");
      }, 2000);
      
    } catch (error) {
      console.error("Error recording rent payment:", error);
      setFormError(error instanceof Error ? error.message : "An error occurred while recording the rent payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayments = rentPayments.filter((payment) => {
    const matchesSearch = 
      payment.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Generate rental period options (4 months before and after current month)
  const rentalPeriodOptions = [];
  const currentDate = new Date();
  
  for (let i = -4; i <= 4; i++) {
    const date = i < 0 ? subMonths(currentDate, Math.abs(i)) : addMonths(currentDate, i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy");
    
    rentalPeriodOptions.push({ value, label });
  }

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
              <DollarSign className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Rent Management</h1>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showAddForm ? (
                <>
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Record Rent Payment
                </>
              )}
            </button>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          {showAddForm && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Record Rent Payment</h2>
                
                {formError && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{formError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {successMessage && (
                  <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">{successMessage}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="leaseId" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="leaseId"
                        name="leaseId"
                        value={formData.leaseId}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select a unit</option>
                        {activeLeases.map((lease) => (
                          <option key={lease.id} value={lease.id}>
                            {lease.unitNumber} - {lease.tenantName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="rentalPeriod" className="block text-sm font-medium text-gray-700 mb-1">
                        Rental Period <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="rentalPeriod"
                        name="rentalPeriod"
                        value={formData.rentalPeriod}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      >
                        {rentalPeriodOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="officialRent" className="block text-sm font-medium text-gray-700 mb-1">
                        Official Rent (₹)
                      </label>
                      <input
                        type="text"
                        id="officialRent"
                        name="officialRent"
                        value={formData.officialRent}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="actualRent" className="block text-sm font-medium text-gray-700 mb-1">
                        Actual Rent Paid (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="actualRent"
                        name="actualRent"
                        value={formData.actualRent}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                        Comments
                      </label>
                      <textarea
                        id="comments"
                        name="comments"
                        value={formData.comments}
                        onChange={handleInputChange}
                        rows={3}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Payment"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
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
            ) : filteredPayments.length > 0 ? (
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
                        Rental Period
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Official Rent
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual Rent
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Recorded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment) => {
                      const rentalPeriodDate = new Date(payment.rentalPeriod + "-01");
                      const formattedRentalPeriod = format(rentalPeriodDate, "MMMM yyyy");
                      const isShort = payment.actualRent < payment.officialRent;
                      
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{payment.unitNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{payment.tenantName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">{formattedRentalPeriod}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{payment.officialRent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${isShort ? "text-red-600" : "text-green-600"}`}>
                              ₹{payment.actualRent.toLocaleString()}
                              {isShort && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Short by ₹{(payment.officialRent - payment.actualRent).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.createdAt.toDate().toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No rent payments found</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Try adjusting your search" : "Get started by recording a rent payment"}
                </p>
                {!searchTerm && !showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Record Rent Payment
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 