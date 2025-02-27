"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../lib/hooks/useAuth";
import Navigation from "../../../../components/Navigation";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../lib/firebase/firebase";
import { Users, ArrowLeft, Upload } from "lucide-react";

export default function AddTenantPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    unitNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    adhaarNumber: "",
    panNumber: "",
    currentEmployer: "",
    permanentAddress: "",
    leaseStart: "",
    leaseEnd: "",
    rentAmount: "",
    securityDeposit: "",
    paymentMethod: "cash",
  });
  
  // File uploads
  const [leaseAgreement, setLeaseAgreement] = useState<File | null>(null);
  const [adhaarCard, setAdhaarCard] = useState<File | null>(null);
  
  // File upload preview
  const [leaseAgreementPreview, setLeaseAgreementPreview] = useState("");
  const [adhaarCardPreview, setAdhaarCardPreview] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'lease' | 'adhaar') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (fileType === 'lease') {
        setLeaseAgreement(file);
        setLeaseAgreementPreview(URL.createObjectURL(file));
      } else {
        setAdhaarCard(file);
        setAdhaarCardPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    
    try {
      // Validate form
      if (!formData.unitNumber || !formData.firstName || !formData.lastName || !formData.email || 
          !formData.phone || !formData.leaseStart || !formData.leaseEnd || !formData.rentAmount) {
        throw new Error("Please fill in all required fields");
      }
      
      if (!leaseAgreement) {
        throw new Error("Please upload the lease agreement");
      }
      
      // Upload files
      const leaseAgreementURL = leaseAgreement 
        ? await uploadFile(leaseAgreement, `tenants/${formData.unitNumber}/${formData.lastName}_lease_agreement`)
        : "";
        
      const adhaarCardURL = adhaarCard 
        ? await uploadFile(adhaarCard, `tenants/${formData.unitNumber}/${formData.lastName}_adhaar_card`)
        : "";
      
      // Add tenant to Firestore
      const tenantData = {
        ...formData,
        rentAmount: parseFloat(formData.rentAmount),
        securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
        leaseAgreementURL,
        adhaarCardURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, "tenants"), tenantData);
      
      // Add to leases collection
      await addDoc(collection(db, "leases"), {
        tenantId: docRef.id,
        unitNumber: formData.unitNumber,
        tenantName: `${formData.firstName} ${formData.lastName}`,
        leaseStart: formData.leaseStart,
        leaseEnd: formData.leaseEnd,
        rentAmount: parseFloat(formData.rentAmount),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      setSuccessMessage("Tenant added successfully!");
      
      // Reset form
      setFormData({
        unitNumber: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        adhaarNumber: "",
        panNumber: "",
        currentEmployer: "",
        permanentAddress: "",
        leaseStart: "",
        leaseEnd: "",
        rentAmount: "",
        securityDeposit: "",
        paymentMethod: "cash",
      });
      
      setLeaseAgreement(null);
      setAdhaarCard(null);
      setLeaseAgreementPreview("");
      setAdhaarCardPreview("");
      
      // Redirect to tenants page after a short delay
      setTimeout(() => {
        router.push("/dashboard/tenants");
      }, 2000);
      
    } catch (error) {
      console.error("Error adding tenant:", error);
      setFormError(error instanceof Error ? error.message : "An error occurred while adding the tenant");
    } finally {
      setIsSubmitting(false);
    }
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
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Add Tenant</h1>
            </div>
            <Link
              href="/dashboard/tenants"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Tenants
            </Link>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h2>
                  
                  <div className="mb-4">
                    <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="unitNumber"
                      name="unitNumber"
                      value={formData.unitNumber}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="adhaarNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Adhaar Number
                    </label>
                    <input
                      type="text"
                      id="adhaarNumber"
                      name="adhaarNumber"
                      value={formData.adhaarNumber}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      id="panNumber"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="currentEmployer" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Employer
                    </label>
                    <input
                      type="text"
                      id="currentEmployer"
                      name="currentEmployer"
                      value={formData.currentEmployer}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="permanentAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Permanent Address
                    </label>
                    <textarea
                      id="permanentAddress"
                      name="permanentAddress"
                      value={formData.permanentAddress}
                      onChange={handleInputChange}
                      rows={3}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Lease Information</h2>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="leaseStart" className="block text-sm font-medium text-gray-700 mb-1">
                        Lease Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="leaseStart"
                        name="leaseStart"
                        value={formData.leaseStart}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="leaseEnd" className="block text-sm font-medium text-gray-700 mb-1">
                        Lease End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="leaseEnd"
                        name="leaseEnd"
                        value={formData.leaseEnd}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="rentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                        Rent Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="rentAmount"
                        name="rentAmount"
                        value={formData.rentAmount}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700 mb-1">
                        Security Deposit (₹)
                      </label>
                      <input
                        type="number"
                        id="securityDeposit"
                        name="securityDeposit"
                        value={formData.securityDeposit}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                      Security Deposit Payment Method
                    </label>
                    <select
                      id="paymentMethod"
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lease Agreement <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        {leaseAgreementPreview ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={leaseAgreementPreview}
                              alt="Lease Agreement Preview"
                              className="h-32 object-cover mb-2"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setLeaseAgreement(null);
                                setLeaseAgreementPreview("");
                              }}
                              className="text-sm text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="lease-agreement"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="lease-agreement"
                                  name="lease-agreement"
                                  type="file"
                                  className="sr-only"
                                  onChange={(e) => handleFileChange(e, 'lease')}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF, PNG, JPG, GIF up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adhaar Card Copy
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        {adhaarCardPreview ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={adhaarCardPreview}
                              alt="Adhaar Card Preview"
                              className="h-32 object-cover mb-2"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAdhaarCard(null);
                                setAdhaarCardPreview("");
                              }}
                              className="text-sm text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="adhaar-card"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="adhaar-card"
                                  name="adhaar-card"
                                  type="file"
                                  className="sr-only"
                                  onChange={(e) => handleFileChange(e, 'adhaar')}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF, PNG, JPG, GIF up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Link
                  href="/dashboard/tenants"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
                >
                  Cancel
                </Link>
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
                    "Save Tenant"
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
} 