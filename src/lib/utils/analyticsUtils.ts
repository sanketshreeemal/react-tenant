/**
 * Calculates the rental period for a given target month and year.
 * Assumes rent is paid in arrears, so if the target month is May 2025 (payments recorded in May),
 * the rental period in focus is April 2025.
 *
 * @param targetMonthYear - The month and year payments are recorded, in "YYYY-MM" format.
 * @returns The rental period in "YYYY-MM" format.
 * @example
 * getRentalPeriodForTargetMonth("2025-05") // returns "2025-04"
 * getRentalPeriodForTargetMonth("2025-01") // returns "2024-12"
 */
export const getRentalPeriodForTargetMonth = (targetMonthYear: string): string => {
  const [year, month] = targetMonthYear.split('-').map(Number);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error('Invalid targetMonthYear format. Expected "YYYY-MM".');
  }

  let rentalYear = year;
  let rentalMonth = month - 1;

  if (rentalMonth === 0) {
    rentalMonth = 12;
    rentalYear -= 1;
  }

  return `${rentalYear}-${String(rentalMonth).padStart(2, '0')}`;
};

// Future analytics utility functions can be added here. 

import { Lease, RentPayment, RentalInventory, MultiMonthDelinquentUnitInfo } from "@/types";

/**
 * Checks if a lease is active at the end of a given month.
 * A lease is active if its start date is before or on the month-end
 * and its end date is after or on the month-end.
 *
 * @param lease The lease object.
 * @param targetMonthYear The target month in "YYYY-MM" format.
 * @returns True if the lease is active at the end of the target month, false otherwise.
 */
export const isLeaseActiveAtMonthEnd = (lease: Lease, targetMonthYear: string): boolean => {
  if (!lease.leaseStartDate || !lease.leaseEndDate) return false;

  const [year, month] = targetMonthYear.split('-').map(Number);
  // End of the target month (last day, 23:59:59.999)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999); 
  // Start of the target month (first day, 00:00:00.000) - for clarity, though not strictly needed for this logic
  // const monthStart = new Date(year, month - 1, 1);

  const leaseStartDate = new Date(lease.leaseStartDate);
  const leaseEndDate = new Date(lease.leaseEndDate);

  return leaseStartDate <= monthEnd && leaseEndDate >= monthEnd;
};

/**
 * Checks if a lease period overlaps with any part of a given rental period (month).
 * A lease is active if its start date is before or on the rental period's end
 * and its end date is after or on the rental period's start.
 *
 * @param lease The lease object.
 * @param rentalPeriod The rental period in "YYYY-MM" format.
 * @returns True if the lease is active during any part of the rental period, false otherwise.
 */
export const isLeaseActiveDuringRentalPeriod = (lease: Lease, rentalPeriod: string): boolean => {
  if (!lease.leaseStartDate || !lease.leaseEndDate) return false;

  const [year, month] = rentalPeriod.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1); // First day of the rental period
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the rental period

  const leaseStartDate = new Date(lease.leaseStartDate);
  const leaseEndDate = new Date(lease.leaseEndDate);

  return leaseStartDate <= periodEnd && leaseEndDate >= periodStart;
};

/**
 * Filters payments for a specific set of leases that fall within a given rental period.
 *
 * @param allPayments Array of all RentPayment objects.
 * @param targetLeaseIds Array of lease IDs to filter payments for.
 * @param rentalPeriod The rental period in "YYYY-MM" format to match against payment.rentalPeriod.
 * @returns Filtered array of RentPayment objects.
 */
export const filterPaymentsForRentalPeriodAndLeases = (
  allPayments: RentPayment[],
  targetLeaseIds: string[],
  rentalPeriod: string
): RentPayment[] => {
  if (!allPayments || !targetLeaseIds || !rentalPeriod) return [];
  return allPayments.filter(payment =>
    payment.leaseId &&
    targetLeaseIds.includes(payment.leaseId) &&
    payment.rentalPeriod === rentalPeriod &&
    (payment.paymentType === "Rent Payment" || !payment.paymentType) // Consider only rent payments
  );
};

/**
 * Calculates the Year-to-Date (YTD) rent collected for a specific group of leases.
 * YTD is defined as payments recorded from March of the targetMonthYear's year
 * up to and including the targetMonthYear.
 *
 * @param allPayments Array of all RentPayment objects for the landlord.
 * @param groupLeaseIds Array of lease IDs belonging to the specific property group.
 * @param targetMonthYear The target month and year in "YYYY-MM" format, e.g., "2025-05".
 *                        This defines the end of the YTD period.
 * @returns The total YTD rent collected as a number.
 */
export const calculateYtdRentCollected = (
  allPayments: RentPayment[],
  groupLeaseIds: string[],
  targetMonthYear: string, // e.g., "2025-05"
): number => {
  if (!allPayments || !groupLeaseIds || !targetMonthYear) return 0;

  const [targetYear, targetMonthNumber] = targetMonthYear.split('-').map(Number); // targetMonthNumber is 1-indexed

  if (isNaN(targetYear) || isNaN(targetMonthNumber)) {
    console.error("Invalid targetMonthYear format in calculateYtdRentCollected");
    return 0;
  }

  let fiscalYearStartYear = targetYear;
  const fiscalYearStartMonth = 4; // April is the 4th month (1-indexed)

  // If the target month is Jan, Feb, or Mar, the fiscal year started in the *previous* calendar year.
  if (targetMonthNumber < fiscalYearStartMonth) { // targetMonthNumber is 1-Jan, 2-Feb, 3-Mar
    fiscalYearStartYear = targetYear - 1;
  }

  // Determine the start of the YTD period (April 1st of the determined fiscalYearStartYear)
  const ytdStartDate = new Date(fiscalYearStartYear, fiscalYearStartMonth - 1, 1); 
  // Determine the end of the YTD period (end of targetMonthYear)
  const ytdEndDate = new Date(targetYear, targetMonthNumber, 0, 23, 59, 59, 999); // day 0 of targetMonth+1 is last day of targetMonth

  if (ytdEndDate < ytdStartDate) {
    // This can happen if targetMonthYear is before April of the first tracking year (e.g. target is Feb 2025)
    // In such cases, YTD is effectively zero for that incomplete preceding fiscal year part.
    // Or if there's a logic error, so good to log.
    // console.warn(`YTD EndDate (${ytdEndDate.toISOString()}) is before StartDate (${ytdStartDate.toISOString()}) for target ${targetMonthYear}. Returning 0.`);
    return 0;
  }

  const ytdPayments = allPayments.filter(payment => {
    if (!payment.leaseId || !groupLeaseIds.includes(payment.leaseId)) {
      return false;
    }
    if (payment.paymentType !== "Rent Payment" && payment.paymentType) { // Ensure it's a rent payment or type is undefined (older data)
        return false;
    }

    const paymentDate = new Date(payment.paymentDate);
    return paymentDate >= ytdStartDate && paymentDate <= ytdEndDate;
  });

  return ytdPayments.reduce((sum, payment) => sum + (payment.actualRentPaid || 0), 0);
};

/**
 * Identifies all past delinquent rental periods for leases within a group.
 * A unit is considered to have a delinquency if rent for any active rental period was not fully paid.
 *
 * @param groupLeases Array of leases belonging to the specific property group (must have lease.id).
 * @param allInventory Array of all rental inventory to find unit numbers.
 * @param allPayments Array of all RentPayment objects for the landlord.
 * @param currentTargetMonthYear The current target month for analysis (YYYY-MM), payments are typically made in this month for the previous rental period.
 * @returns An array of MultiMonthDelinquentUnitInfo objects, where each object details all delinquent periods for a lease.
 */
export const identifyAllPastDelinquencies = (
  groupLeases: (Lease & { id: string })[],
  allInventory: RentalInventory[],
  allPayments: RentPayment[],
  currentTargetMonthYear: string 
): MultiMonthDelinquentUnitInfo[] => {
  if (!groupLeases || !allPayments || !currentTargetMonthYear) {
    return [];
  }

  const delinquentUnitsList: MultiMonthDelinquentUnitInfo[] = [];
  const MIN_RENTAL_PERIOD_YEAR = 2025;
  const MIN_RENTAL_PERIOD_MONTH = 3; // March

  groupLeases.forEach(lease => {
    const allDelinquentPeriodsForLease: Array<{ period: string; amountDue: number }> = [];
    
    const leaseStartDate = new Date(lease.leaseStartDate);
    const leaseEndDate = new Date(lease.leaseEndDate);

    // Determine the effective start for checking delinquencies
    let effectiveStartYear = leaseStartDate.getFullYear();
    let effectiveStartMonth = leaseStartDate.getMonth() + 1; // 1-indexed

    if (effectiveStartYear < MIN_RENTAL_PERIOD_YEAR || (effectiveStartYear === MIN_RENTAL_PERIOD_YEAR && effectiveStartMonth < MIN_RENTAL_PERIOD_MONTH)) {
      effectiveStartYear = MIN_RENTAL_PERIOD_YEAR;
      effectiveStartMonth = MIN_RENTAL_PERIOD_MONTH;
    }

    // The "latest" rental period we'd consider for delinquency reporting based on currentTargetMonthYear
    const latestRentalPeriodToConsider = getRentalPeriodForTargetMonth(currentTargetMonthYear);
    const [latestRentalYear, latestRentalMonthNum] = latestRentalPeriodToConsider.split('-').map(Number);
    // We check delinquencies for rental periods up to and including latestRentalPeriodToConsider
    const maxRentalPeriodDate = new Date(latestRentalYear, latestRentalMonthNum - 1, 1);

    let periodYear = effectiveStartYear;
    let periodMonth = effectiveStartMonth; 

    // Loop through each month from effective start up to the maxRentalPeriodDate or lease end
    while (true) {
      const currentIterationRentalPeriodDate = new Date(periodYear, periodMonth - 1, 1);

      // Stop if current rental period iteration is after the lease officially ended
      if (currentIterationRentalPeriodDate > leaseEndDate) {
        break;
      }
      // Stop if current rental period iteration is beyond the latest period we want to report on
      // OR if it's before our minimum tracking period (this check is more of a safeguard, main logic is at effectiveStartYear/Month)
      if (currentIterationRentalPeriodDate > maxRentalPeriodDate || 
          (periodYear < MIN_RENTAL_PERIOD_YEAR || (periodYear === MIN_RENTAL_PERIOD_YEAR && periodMonth < MIN_RENTAL_PERIOD_MONTH))) {
        break;
      }

      const rentalPeriodString = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;

      // Check if the lease was effectively active during this rentalPeriodString.
      // isLeaseActiveDuringRentalPeriod checks if any part of the lease overlaps with the rental period.
      if (!isLeaseActiveDuringRentalPeriod(lease, rentalPeriodString)) {
        // Advance to the next month
        periodMonth++;
        if (periodMonth > 12) {
          periodMonth = 1;
          periodYear++;
        }
        continue;
      }
      
      // Payment for rentalPeriodString (e.g., "2024-03") is expected in the *following* month (e.g., "2024-04").
      const paymentMonthDate = new Date(periodYear, periodMonth, 1); // 1st day of month *after* rentalPeriodString
      const paymentMonthForRentalPeriod = `${paymentMonthDate.getFullYear()}-${String(paymentMonthDate.getMonth() + 1).padStart(2, '0')}`;
      
      const paymentsMadeInPaymentMonthForRentalPeriod = allPayments.filter(p =>
        p.leaseId === lease.id &&
        p.rentalPeriod === rentalPeriodString && // Payment is FOR this rental period
        new Date(p.paymentDate).getFullYear() === paymentMonthDate.getFullYear() && // Payment occurred in the expected payment month's year
        new Date(p.paymentDate).getMonth() === paymentMonthDate.getMonth() && // Payment occurred in the expected payment month
        (p.paymentType === "Rent Payment" || !p.paymentType)
      );

      const amountPaidThisPeriod = paymentsMadeInPaymentMonthForRentalPeriod.reduce((sum, p) => sum + p.actualRentPaid, 0);
      const amountDueThisPeriod = lease.rentAmount - amountPaidThisPeriod;

      if (amountDueThisPeriod > 0.01) { // Using a small threshold for floating point precision
        allDelinquentPeriodsForLease.push({ period: rentalPeriodString, amountDue: amountDueThisPeriod });
      }

      // Advance to the next month for checking
      periodMonth++;
      if (periodMonth > 12) {
        periodMonth = 1;
        periodYear++;
      }
    }

    if (allDelinquentPeriodsForLease.length > 0) {
      const unit = allInventory.find(u => u.id === lease.unitId);
      delinquentUnitsList.push({
        unitId: lease.unitId,
        unitNumber: unit?.unitNumber || 'N/A',
        tenantName: lease.tenantName,
        leaseId: lease.id,
        leaseRentAmount: lease.rentAmount,
        delinquentPeriods: allDelinquentPeriodsForLease.sort((a,b) => a.period.localeCompare(b.period)), // Sort chronologically
        totalOverdueAmount: allDelinquentPeriodsForLease.reduce((sum, dp) => sum + dp.amountDue, 0),
        countDelinquentMonths: allDelinquentPeriodsForLease.length, 
        lastLeaseEndDate: lease.leaseEndDate,
      });
    }
  });

  // Post-process to ensure one entry per leaseId, primarily for robustness if logic were to somehow produce duplicates.
  // Current logic should produce one entry per lease if delinquent.
  const uniqueDelinquents = Array.from(new Map(delinquentUnitsList.map(item => [item.leaseId, item])).values());

  return uniqueDelinquents;
}; 