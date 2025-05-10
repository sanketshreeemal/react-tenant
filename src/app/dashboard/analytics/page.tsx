"use client";

import React, { useState, useMemo, useContext } from 'react';
import Navigation from "@/components/Navigation"; // Assuming correct path
import { BarChart3, IndianRupee } from "lucide-react"; // Added IndianRupee icon
import MonthYearPicker from '@/components/ui/MonthYearPicker';
import usePropertyAnalyticsData from '@/lib/hooks/usePropertyAnalyticsData';
import PropertyGroupCard from '@/components/analytics/PropertyGroupCard';
import { AuthContext } from '@/lib/contexts/AuthContext'; // Corrected import path
import { useLandlordId } from '@/lib/hooks/useLandlordId';
import logger from '@/lib/logger';
import DelinquencyModal from '@/components/analytics/DelinquencyModal';
import MultiMonthDelinquencyModal from '@/components/analytics/MultiMonthDelinquencyModal';
import { DelinquentUnitInfo, MultiMonthDelinquentUnitInfo } from '@/types'; // Added MultiMonthDelinquentUnitInfo
import { formatMonthYear, formatIndianCurrency } from '@/lib/utils/dateUtils';

export default function PropertyAnalyticsPage() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { landlordId, loading: landlordLoading, error: landlordError } = useLandlordId();

  const getDefaultTargetMonthYear = () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1); // Last fully completed month
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  };

  const [targetMonthYear, setTargetMonthYear] = useState<string>(getDefaultTargetMonthYear());

  const {
    propertyGroups,
    allInventory,
    allLeases,
    allPayments,
    loading: dataLoading,
    error: dataError
  } = usePropertyAnalyticsData(landlordLoading ? null : landlordId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ units: DelinquentUnitInfo[], groupName: string, rentalPeriod: string } | null>(null);

  // State for Multi-Month Delinquency Modal (Phase 3)
  const [isMultiMonthModalOpen, setIsMultiMonthModalOpen] = useState(false);
  const [multiMonthModalData, setMultiMonthModalData] = useState<{ units: MultiMonthDelinquentUnitInfo[], groupName: string } | null>(null);

  const handleMonthYearChange = (newMonthYear: string) => {
    logger.info(`PropertyAnalyticsPage: Target month/year changed to ${newMonthYear}`);
    setTargetMonthYear(newMonthYear);
    // Data fetching hook `usePropertyAnalyticsData` currently refetches based on landlordId.
    // For Phase 1, changing month doesn't alter the fetched dataset (groups, allInventory).
    // In Phase 2, this will trigger recalculations or refetches of more specific data.
  };

  const handleViewDelinquentUnits = (delinquentUnits: DelinquentUnitInfo[], groupName: string, rentalPeriod: string) => {
    setModalData({ units: delinquentUnits, groupName, rentalPeriod });
    setIsModalOpen(true);
    logger.info(`Opening delinquency modal for ${groupName}, period ${rentalPeriod} with ${delinquentUnits.length} units.`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalData(null);
  };

  // Handler for opening Multi-Month Delinquency Modal (Phase 3)
  const handleViewMultiMonthDelinquentUnits = (delinquentUnits: MultiMonthDelinquentUnitInfo[], groupName: string) => {
    setMultiMonthModalData({ units: delinquentUnits, groupName });
    setIsMultiMonthModalOpen(true);
    logger.info(`Opening multi-month delinquency modal for ${groupName} with ${delinquentUnits.length} units.`);
  };

  const handleCloseMultiMonthModal = () => {
    setIsMultiMonthModalOpen(false);
    setMultiMonthModalData(null);
  };

  const pageTitle = "Analytics";

  // Memoize sorted property groups to prevent re-sorting on every render unless data changes.
  const sortedPropertyGroups = useMemo(() => {
    if (!propertyGroups) return [];
    return [...propertyGroups].sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [propertyGroups]);

  // Show loading state if either auth or landlord ID is loading
  if (authContext?.loading || landlordLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="md:ml-64 p-4 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 100px)' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if there's a landlord error
  if (landlordError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="md:ml-64 p-4 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 100px)' }}>
          <p className="text-red-600">Error: {landlordError}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="md:ml-64 p-4 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 100px)' }}>
          <p>User not authenticated. Please sign in.</p>
        </div>
      </div>
    );
  }

  // Only show landlordId missing error if we're not loading and we're sure the user is authenticated
  if (!landlordLoading && !landlordId && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="md:ml-64 p-4 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 100px)' }}>
          <p className="text-red-600">Error: Landlord ID not found. Please contact support.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="md:ml-64 p-2 sm:p-4">
        <header className="bg-white shadow rounded-lg mb-4 sm:mb-6">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center w-full sm:w-auto">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3 flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{pageTitle}</h1>
            </div>
            <div className="w-full sm:w-auto">
              <MonthYearPicker 
                initialTargetMonthYear={targetMonthYear}
                onMonthYearChange={handleMonthYearChange}
                formatMonthYear={formatMonthYear}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto">
          {dataLoading && (
            <div className="flex justify-center items-center py-8 sm:py-10">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <p className="text-gray-600">Loading analytics data...</p>
              </div>
            </div>
          )}
          {dataError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative m-2 sm:m-0" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline ml-1">{dataError.message || "Could not load analytics data."}</span>
            </div>
          )}
          {!dataLoading && !dataError && propertyGroups && propertyGroups.length === 0 && (
            <div className="text-center py-8 sm:py-10 px-4">
              <BarChart3 className="h-12 sm:h-16 w-12 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">No Property Groups Found</h2>
              <p className="text-gray-500 mt-2 text-sm sm:text-base">Add property groups to see analytics data.</p>
            </div>
          )}
          {!dataLoading && !dataError && propertyGroups && propertyGroups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-2 sm:p-0">
              {sortedPropertyGroups.map((group) => (
                <PropertyGroupCard 
                  key={group.id} 
                  propertyGroup={group} 
                  allInventory={allInventory} 
                  allLeases={allLeases}
                  allPayments={allPayments}
                  targetMonthYear={targetMonthYear}
                  onViewDelinquentUnits={handleViewDelinquentUnits}
                  onViewMultiMonthDelinquentUnits={handleViewMultiMonthDelinquentUnits}
                  formatMonthYear={formatMonthYear}
                  formatCurrency={formatIndianCurrency}
                />
              ))}
            </div>
          )}
        </main>
        {modalData && (
          <DelinquencyModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            delinquentUnits={modalData.units}
            groupName={modalData.groupName}
            rentalPeriod={formatMonthYear(modalData.rentalPeriod)}
            formatCurrency={formatIndianCurrency}
          />
        )}
        {multiMonthModalData && (
          <MultiMonthDelinquencyModal
            isOpen={isMultiMonthModalOpen}
            onClose={handleCloseMultiMonthModal}
            delinquentUnits={multiMonthModalData.units}
            groupName={multiMonthModalData.groupName}
            formatMonthYear={formatMonthYear}
            formatCurrency={formatIndianCurrency}
          />
        )}
      </div>
    </div>
  );
} 