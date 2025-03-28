"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { getDocumentsWithTimeout } from "../../../lib/firebase/firestoreUtils";
import { FileImage, ExternalLink, Search, Users } from "lucide-react";
import logger from "../../../lib/logger";
import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { AlertMessage } from "@/components/ui/alert-message";

// Define types for tenant documents
interface TenantDocument {
  id: string;
  firstName: string;
  lastName: string;
  unitNumber: string;
  leaseAgreementUrl?: string;
  adhaarCardUrl?: string;
  createdAt: any; // Firestore timestamp
}

export default function DocumentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tenantDocuments, setTenantDocuments] = useState<TenantDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTenantDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        logger.info("Fetching tenant documents");
        
        const tenantsData = await getDocumentsWithTimeout(user?.landlordId, "tenants");
        const tenants = tenantsData.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data()
        })) as TenantDocument[];
        
        // Sort by most recent first
        tenants.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        setTenantDocuments(tenants);
        logger.info(`Successfully fetched ${tenants.length} tenant documents`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        logger.error(`Failed to fetch tenant documents: ${errorMessage}`);
        setError("Failed to load documents. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchTenantDocuments();
    }
  }, [user]);

  // Filter tenants based on search query
  const filteredTenants = tenantDocuments.filter(tenant => {
    const fullName = `${tenant.firstName} ${tenant.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      tenant.unitNumber.toLowerCase().includes(query)
    );
  });

  const handleOpenDocument = (url: string | undefined) => {
    if (!url) {
      logger.warn("Attempted to open undefined document URL");
      return;
    }
    
    logger.info("Opening document URL");
    
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="md:ml-64 p-4">
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <FileImage className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            </div>
            
            {/* Search bar */}
            <div className="relative w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {error && (
          <AlertMessage
            variant="error"
            message={error}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {filteredTenants.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No documents found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery ? "Try adjusting your search query." : "No tenant documents are available."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredTenants.map((tenant) => (
                  <li key={tenant.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {tenant.firstName.charAt(0)}{tenant.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {tenant.firstName} {tenant.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Unit: {tenant.unitNumber}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {tenant.leaseAgreementUrl && (
                            <button
                              onClick={() => handleOpenDocument(tenant.leaseAgreementUrl)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <FileImage className="h-4 w-4 mr-1" />
                              Lease Agreement
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </button>
                          )}
                          
                          {tenant.adhaarCardUrl && (
                            <button
                              onClick={() => handleOpenDocument(tenant.adhaarCardUrl)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <FileImage className="h-4 w-4 mr-1" />
                              Adhaar Card
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </button>
                          )}
                          
                          {!tenant.leaseAgreementUrl && !tenant.adhaarCardUrl && (
                            <span className="inline-flex items-center px-3 py-1 text-sm text-gray-500">
                              No documents available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 