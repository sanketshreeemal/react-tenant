import { useState, useEffect } from 'react';
import {
  getAllPropertyGroups,
  getAllRentalInventory,
  getAllLeases,
  getAllPayments,
} from '@/lib/firebase/firestoreUtils';
import { PropertyGroup, RentalInventory, Lease, RentPayment } from '@/types';
import logger from '@/lib/logger';

interface UsePropertyAnalyticsDataReturn {
  propertyGroups: PropertyGroup[];
  allInventory: RentalInventory[];
  allLeases: Lease[];
  allPayments: RentPayment[];
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook to fetch foundational data for property analytics.
 * Fetches property groups, rental inventory, all leases, and all payments.
 *
 * @param landlordId The ID of the landlord.
 * @param targetMonthYear The selected target month and year (YYYY-MM). Passed to exemplify, may be used for more specific fetching in later phases.
 * @returns An object containing propertyGroups, allInventory, allLeases, allPayments, loading state, and error state.
 */
const usePropertyAnalyticsData = (
  landlordId: string | undefined | null,
  // targetMonthYear: string // Commenting out for Phase 1 as it's not directly used for fetching this initial data set
): UsePropertyAnalyticsDataReturn => {
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [allInventory, setAllInventory] = useState<RentalInventory[]>([]);
  const [allLeases, setAllLeases] = useState<Lease[]>([]);
  const [allPayments, setAllPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!landlordId) {
      setLoading(false);
      // Optionally set an error or handle appropriately if landlordId is missing
      logger.warn('usePropertyAnalyticsData: LandlordId is missing.');
      setError(new Error('Landlord ID is required to fetch analytics data.'));
      setPropertyGroups([]);
      setAllInventory([]);
      setAllLeases([]);
      setAllPayments([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        logger.info(`usePropertyAnalyticsData: Fetching data for landlord ${landlordId}`);
        const [groups, inventory, leases, payments] = await Promise.all([
          getAllPropertyGroups(landlordId),
          getAllRentalInventory(landlordId),
          getAllLeases(landlordId),
          getAllPayments(landlordId),
        ]);
        setPropertyGroups(groups);
        setAllInventory(inventory);
        setAllLeases(leases);
        setAllPayments(payments);
        logger.info(
          `usePropertyAnalyticsData: Fetched ${groups.length} groups, ${inventory.length} inventory items, ${leases.length} leases, and ${payments.length} payments.`
        );
      } catch (err: any) {
        logger.error('usePropertyAnalyticsData: Error fetching analytics data:', err);
        setError(err);
        setPropertyGroups([]);
        setAllInventory([]);
        setAllLeases([]);
        setAllPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [landlordId]); // Dependency array includes landlordId

  return { propertyGroups, allInventory, allLeases, allPayments, loading, error };
};

export default usePropertyAnalyticsData; 