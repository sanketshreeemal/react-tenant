import { getAllLeases, getAllRentalInventory, getAllPayments } from '../firebase/firestoreUtils';
import { Lease, RentalInventory, RentPayment } from '@/types';
import * as XLSX from 'xlsx';

// Helper to format date, fallback for undefined dates
const formatDate = (date: Date | undefined | string): string => {
  if (!date) return "";
  try {
    // Attempt to create a Date object. If it's already a Date object, this is fine.
    // If it's a string, it will try to parse it.
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return ""; // Invalid date
    }
    return d.toLocaleDateString('en-CA', { // Using 'en-CA' for YYYY-MM-DD format, easily sortable
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return ""; // Error during parsing or formatting
  }
};

// Interface for the row data we want in Excel, derived from Lease type
interface TenantLeaseExcelRow {
  'Tenant Name': string;
  'Unit Number': string;
  'Email': string;
  'Phone Number': string;
  'Lease Start Date': string;
  'Lease End Date': string;
  'Rent Amount': number | string; // Allow string for empty/error states
  'Security Deposit': number | string; // Allow string for empty/error states
  'Deposit Method': string;
  'Status': string;
  'Additional Comments': string;
  'Created At': string;
  'Updated At': string;
}

// Interface for Property Details row data (from RentalInventory)
interface PropertyDetailsExcelRow {
  'Unit Number': string;
  'Property Type': string;
  'Owner Details': string;
  'Bank Details': string;
  'Property Group': string;
  'Number of Bedrooms': number | string;
  'Square Feet Area': number | string;
  'Created At': string;
  'Updated At': string;
}

// Interface for Payment Details row data (from RentPayment)
interface PaymentDetailsExcelRow {
  'Unit Number': string;
  'Tenant Name': string;
  'Official Rent': number | string;
  'Actual Rent Paid': number | string;
  'Payment Type': string;
  'Collection Method': string;
  'Rental Period (YYYY-MM)': string;
  'Payment Date': string;
  'Landlord Comments': string;
  'Created At': string;
  'Updated At': string;
}

/**
 * Fetches data for leases, rental inventory, and rent payments for a given landlordId,
 * formats it, and triggers a download of an Excel file with multiple sheets.
 * @param landlordId The ID of the landlord.
 * @throws Will throw an error if landlordId is missing, or during data fetching/Excel generation.
 */
export const downloadAllDataAsExcel = async (landlordId: string): Promise<void> => {
  if (!landlordId) {
    throw new Error("Landlord ID is required to download data.");
  }

  try {
    // Fetch all data concurrently
    const [leases, rentalInventoryItems, rentPayments] = await Promise.all([
      getAllLeases(landlordId),
      getAllRentalInventory(landlordId),
      getAllPayments(landlordId),
    ]);

    const workbook = XLSX.utils.book_new();

    // Process and add Tenant Leases sheet
    if (leases && leases.length > 0) {
      const tenantLeaseRows: TenantLeaseExcelRow[] = leases.map(lease => ({
        'Tenant Name': lease.tenantName || '',
        'Unit Number': lease.unitNumber || '',
        'Email': lease.email || '',
        'Phone Number': `${lease.countryCode || ''}${lease.phoneNumber || ''}`.trim() || '',
        'Lease Start Date': formatDate(lease.leaseStartDate),
        'Lease End Date': formatDate(lease.leaseEndDate),
        'Rent Amount': lease.rentAmount === undefined || lease.rentAmount === null ? '' : lease.rentAmount,
        'Security Deposit': lease.securityDeposit === undefined || lease.securityDeposit === null ? '' : lease.securityDeposit,
        'Deposit Method': lease.depositMethod || '',
        'Status': lease.isActive ? 'Active' : 'Inactive',
        'Additional Comments': lease.additionalComments || '',
        'Created At': formatDate(lease.createdAt),
        'Updated At': formatDate(lease.updatedAt),
      }));
      const leaseWorksheet = XLSX.utils.json_to_sheet(tenantLeaseRows);
      XLSX.utils.book_append_sheet(workbook, leaseWorksheet, "Tenant Leases");
    } else {
      console.warn("No lease data found. 'Tenant Leases' sheet will be empty or not created if all are empty.");
      // Optionally create an empty sheet with headers if desired, even for no data
      const emptySheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, emptySheet, "Tenant Leases (No Data)");
    }

    // Process and add Property Details sheet
    if (rentalInventoryItems && rentalInventoryItems.length > 0) {
      const propertyDetailsRows: PropertyDetailsExcelRow[] = rentalInventoryItems.map(item => ({
        'Unit Number': item.unitNumber || '',
        'Property Type': item.propertyType || '',
        'Owner Details': item.ownerDetails || '',
        'Bank Details': item.bankDetails || 'N/A',
        'Property Group': item.groupName || 'N/A',
        'Number of Bedrooms': item.numberOfBedrooms === null || item.numberOfBedrooms === undefined ? 'N/A' : item.numberOfBedrooms,
        'Square Feet Area': item.squareFeetArea === null || item.squareFeetArea === undefined ? 'N/A' : item.squareFeetArea,
        'Created At': formatDate(item.createdAt),
        'Updated At': formatDate(item.updatedAt),
      }));
      const inventoryWorksheet = XLSX.utils.json_to_sheet(propertyDetailsRows);
      XLSX.utils.book_append_sheet(workbook, inventoryWorksheet, "Property Details");
    } else {
      console.warn("No rental inventory data found. 'Property Details' sheet will be empty or not created if all are empty.");
      const emptySheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, emptySheet, "Property Details (No Data)");
    }

    // Process and add Payment Details sheet
    if (rentPayments && rentPayments.length > 0) {
      const paymentDetailsRows: PaymentDetailsExcelRow[] = rentPayments.map(payment => ({
        'Unit Number': payment.unitNumber || '',
        'Tenant Name': payment.tenantName || 'N/A',
        'Official Rent': payment.officialRent === undefined || payment.officialRent === null ? 'N/A' : payment.officialRent,
        'Actual Rent Paid': payment.actualRentPaid === undefined || payment.actualRentPaid === null ? '' : payment.actualRentPaid,
        'Payment Type': payment.paymentType || '',
        'Collection Method': payment.collectionMethod || '',
        'Rental Period (YYYY-MM)': payment.rentalPeriod || '',
        'Payment Date': formatDate(payment.paymentDate),
        'Landlord Comments': payment.comments || '',
        'Created At': formatDate(payment.createdAt),
        'Updated At': formatDate(payment.updatedAt),
      }));
      const paymentWorksheet = XLSX.utils.json_to_sheet(paymentDetailsRows);
      XLSX.utils.book_append_sheet(workbook, paymentWorksheet, "Payment Details");
    } else {
      console.warn("No rent payment data found. 'Payment Details' sheet will be empty or not created if all are empty.");
      const emptySheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, emptySheet, "Payment Details (No Data)");
    }
    
    // Check if workbook has any sheets before trying to write file
    if (workbook.SheetNames.length === 0) {
        // This case should ideally be handled by UI, preventing download if all data sources are empty
        // For now, we can throw an error or log it.
        console.warn("No data found for any collection. Excel file will not be generated.");
        throw new Error("No data available to export. All collections are empty.");
    }

    // Trigger Download
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}${month}${day}`;
    const fileName = `data_${dateString}.xlsx`;

    XLSX.writeFile(workbook, fileName);

  } catch (error: any) {
    console.error("Error during Excel data fetching or generation:", error);
    // Ensure the error message is propagated or a specific one is thrown
    throw new Error(`Failed to generate Excel file: ${error.message || 'Unknown error during processing'}`);
  }
};
