import React, { useMemo, useState } from 'react';
import { PropertyGroup, RentalInventory, Lease, RentPayment, DelinquentUnitInfo, MultiMonthDelinquentUnitInfo } from '@/types';
import {
  getRentalPeriodForTargetMonth,
  isLeaseActiveAtMonthEnd,
  isLeaseActiveDuringRentalPeriod,
  filterPaymentsForRentalPeriodAndLeases,
  calculateYtdRentCollected,
  identifyAllPastDelinquencies
} from '@/lib/utils/analyticsUtils';
import logger from '@/lib/logger';

// Assuming Card, CardHeader, CardTitle, CardContent, Button are available from a UI library like ShadCN or similar local components
// For now, we will use the existing Card component from src/components/ui/card.tsx if its structure matches.
// Let's use a more generic name from the list: card.tsx, button.tsx, statcard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Assuming card.tsx exports these
import { Button } from "@/components/ui/button"; // Assuming button.tsx exports this
// Potentially use StatCard or build a similar structure
// import { StatCard } from "@/components/ui/statcard";

interface PropertyGroupCardProps {
  propertyGroup: PropertyGroup;
  allInventory: RentalInventory[];
  allLeases: Lease[];
  allPayments: RentPayment[];
  targetMonthYear: string; // YYYY-MM
  onViewDelinquentUnits: (delinquentUnits: DelinquentUnitInfo[], groupName: string, rentalPeriod: string) => void;
  onViewMultiMonthDelinquentUnits: (delinquentUnits: MultiMonthDelinquentUnitInfo[], groupName: string) => void;
  formatMonthYear: (dateStr: string) => string;
  formatCurrency: (amount: number) => string;
}

/**
 * Displays a card with detailed monthly and YTD analytics for a single property group.
 * Phase 2: Shows Occupancy, Rent Collected, Delinquency Rate, and allows viewing delinquent units.
 * Phase 3: Adds YTD Rent Collected and multi-month delinquency tracking.
 */
const PropertyGroupCard: React.FC<PropertyGroupCardProps> = ({
  propertyGroup,
  allInventory,
  allLeases,
  allPayments,
  targetMonthYear,
  onViewDelinquentUnits,
  onViewMultiMonthDelinquentUnits,
  formatMonthYear,
  formatCurrency,
}) => {

  const rentalPeriodInFocus = useMemo(() => getRentalPeriodForTargetMonth(targetMonthYear), [targetMonthYear]);

  const unitsInGroup = useMemo(() => {
    return allInventory.filter((inv) => inv.groupName === propertyGroup.groupName);
  }, [allInventory, propertyGroup.groupName]);
  const totalUnitsInGroup = unitsInGroup.length;
  const unitIdsInGroup = useMemo(() => unitsInGroup.map(u => u.id).filter(id => id !== undefined) as string[], [unitsInGroup]);

  // Monthly Occupancy Calculation
  const monthlyOccupancyRate = useMemo(() => {
    if (totalUnitsInGroup === 0) return null;
    const activeLeasesAtMonthEnd = allLeases.filter(
      (lease) => unitIdsInGroup.includes(lease.unitId) && isLeaseActiveAtMonthEnd(lease, targetMonthYear)
    );
    return (activeLeasesAtMonthEnd.length / totalUnitsInGroup) * 100;
  }, [allLeases, unitIdsInGroup, targetMonthYear, totalUnitsInGroup]);

  // Leases active during the rental period for this group
  const activeLeasesForRentalPeriod = useMemo(() => {
    return allLeases.filter(
      (lease) => 
        lease.id && // Ensure lease has an ID
        unitIdsInGroup.includes(lease.unitId) && 
        isLeaseActiveDuringRentalPeriod(lease, rentalPeriodInFocus)
    ) as (Lease & { id: string })[]; // Type assertion after filtering
  }, [allLeases, unitIdsInGroup, rentalPeriodInFocus]);
  const activeLeaseIdsForRentalPeriod = useMemo(() => activeLeasesForRentalPeriod.map(l => l.id), [activeLeasesForRentalPeriod]);

  // Monthly Rent Collected Calculation
  const monthlyRentCollected = useMemo(() => {
    // Payments recorded in targetMonthYear, for leases in this group, for the rentalPeriodInFocus
    const paymentsForPeriodInTargetMonth = allPayments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        const [targetYear, targetMth] = targetMonthYear.split('-').map(Number);
        return activeLeaseIdsForRentalPeriod.includes(p.leaseId) &&
               p.rentalPeriod === rentalPeriodInFocus && 
               paymentDate.getFullYear() === targetYear &&
               paymentDate.getMonth() + 1 === targetMth &&
               (p.paymentType === "Rent Payment" || !p.paymentType);
    });
    return paymentsForPeriodInTargetMonth.reduce((sum, payment) => sum + payment.actualRentPaid, 0);
  }, [allPayments, activeLeaseIdsForRentalPeriod, rentalPeriodInFocus, targetMonthYear]);

  // YTD Rent Collected Calculation (Phase 3)
  const ytdRentCollected = useMemo(() => {
    // Fiscal YTD: April to March. Utility function now handles this.
    return calculateYtdRentCollected(allPayments, unitIdsInGroup, targetMonthYear);
  }, [allPayments, unitIdsInGroup, targetMonthYear]);

  // Multi-Month Delinquency Calculation (Phase 3)
  const multiMonthDelinquentUnits = useMemo(() => {
    // Ensure allLeases passed to identifyAllPastDelinquencies are properly typed with id
    const leasesWithIds = activeLeasesForRentalPeriod.filter(lease => lease.id != null) as (Lease & { id: string })[];
    // For multi-month, we might want to consider all leases in the group, not just active in current rental period
    // as delinquency could span periods where lease becomes inactive shortly after.
    // However, the utility is built to check active status per period.
    // Let's use all leases associated with the unit group that have IDs.
    const allLeasesInGroupWithIds = allLeases
        .filter(lease => unitIdsInGroup.includes(lease.unitId) && lease.id != null) as (Lease & { id: string })[];

    return identifyAllPastDelinquencies(allLeasesInGroupWithIds, unitsInGroup, allPayments, targetMonthYear);
  }, [allLeases, unitsInGroup, allPayments, targetMonthYear, unitIdsInGroup, activeLeasesForRentalPeriod]);

  // Monthly Delinquency Calculation
  const delinquencyData = useMemo(() => {
    const expectedRentForPeriod = activeLeasesForRentalPeriod.reduce((sum, lease) => sum + lease.rentAmount, 0);
    
    // Collected rent is already calculated in monthlyRentCollected for the specific rentalPeriodInFocus and targetMonthYear payment date.
    const collectedRentForPeriod = monthlyRentCollected;

    let delinquencyRate: number | null = null;
    if (expectedRentForPeriod > 0) {
      delinquencyRate = ((expectedRentForPeriod - collectedRentForPeriod) / expectedRentForPeriod) * 100;
    }

    const delinquentUnits: DelinquentUnitInfo[] = [];
    activeLeasesForRentalPeriod.forEach(lease => { // `lease.id` is now guaranteed to be a string here
      const paymentsForThisLeaseThisPeriod = allPayments.filter(p => 
        p.leaseId === lease.id && 
        p.rentalPeriod === rentalPeriodInFocus &&
        new Date(p.paymentDate).getFullYear() === parseInt(targetMonthYear.split('-')[0]) &&
        new Date(p.paymentDate).getMonth() + 1 === parseInt(targetMonthYear.split('-')[1]) &&
        (p.paymentType === "Rent Payment" || !p.paymentType)
      );
      const amountPaidThisMonth = paymentsForThisLeaseThisPeriod.reduce((sum, p) => sum + p.actualRentPaid, 0);
      const amountDue = lease.rentAmount - amountPaidThisMonth;

      if (amountDue > 0) {
        const unit = unitsInGroup.find(u => u.id === lease.unitId);
        delinquentUnits.push({
          unitId: lease.unitId,
          unitNumber: unit?.unitNumber || 'N/A',
          tenantName: lease.tenantName,
          leaseId: lease.id, // Now safe, as lease.id is string
          leaseRentAmount: lease.rentAmount,
          amountPaidThisMonth: amountPaidThisMonth,
          amountDueThisMonth: amountDue,
          leaseEndDate: lease.leaseEndDate,
        });
      }
    });

    return { rate: delinquencyRate, expected: expectedRentForPeriod, collected: collectedRentForPeriod, units: delinquentUnits };
  }, [activeLeasesForRentalPeriod, allPayments, rentalPeriodInFocus, unitsInGroup, monthlyRentCollected, targetMonthYear]);

  return (
    <Card className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">{propertyGroup.groupName}</CardTitle>
        <p className="text-sm text-gray-500">Total Units: {totalUnitsInGroup}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-600">Occupancy (End of {formatMonthYear(targetMonthYear)})</h4>
          <p className="text-lg font-semibold text-gray-800">
            {monthlyOccupancyRate !== null ? `${monthlyOccupancyRate.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-600">Rent Collected (Payments in {formatMonthYear(targetMonthYear)} for {formatMonthYear(rentalPeriodInFocus)} rent)</h4>
          <p className="text-lg font-semibold text-gray-800">
            {formatCurrency(monthlyRentCollected)}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-600">YTD Rent Collected (Fiscal Year: Apr - Mar, ending {formatMonthYear(targetMonthYear)})</h4>
          <p className="text-lg font-semibold text-gray-800">
            {formatCurrency(ytdRentCollected)}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-600">Delinquency (for {formatMonthYear(rentalPeriodInFocus)} rent)</h4>
          <p className={`text-lg font-semibold ${ 
            (delinquencyData.rate ?? 0) > 15 ? 'text-red-600' : 
            (delinquencyData.rate ?? 0) > 5 ? 'text-amber-600' : // Using Tailwind amber for warning
            'text-gray-800'
          }`}>
            {delinquencyData.rate !== null ? `${delinquencyData.rate.toFixed(1)}%` : 'N/A'}
            <span className="text-xs text-gray-500 ml-1">
              ({formatCurrency(delinquencyData.expected - delinquencyData.collected)} overdue from {formatCurrency(delinquencyData.expected)})
            </span>
          </p>
        </div>
        {delinquencyData.units.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            className="mt-2 w-full"
            onClick={() => onViewDelinquentUnits(delinquencyData.units, propertyGroup.groupName, rentalPeriodInFocus)}
          >
            View {delinquencyData.units.length} Delinquent Unit(s)
          </Button>
        )}
        {multiMonthDelinquentUnits.length > 0 && (
          <Button 
            variant="destructive"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onViewMultiMonthDelinquentUnits(multiMonthDelinquentUnits, propertyGroup.groupName)}
          >
            View {multiMonthDelinquentUnits.length} Multi-Month Delinquent Unit(s)
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyGroupCard; 