import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { addLease, getAllRentalInventory, checkUnitNumberExists } from '@/lib/firebase/firestoreUtils';
import { RentalInventory } from '@/types';

// Keywords that indicate a row is an instruction or example row
const INSTRUCTION_KEYWORDS = [
  'INSTRUCTION', 'NOTE', 'EXAMPLE', 'DELETE', 'IMPORTANT',
  'DO NOT', 'BEFORE UPLOADING', 'REFERENCE', 'IGNORED'
];

// Valid deposit method options
const VALID_DEPOSIT_METHODS = ['Cash', 'Bank transfer', 'UPI', 'Check'];

export async function POST(req: NextRequest) {
  try {
    // Check if the request contains multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const landlordId = formData.get('landlordId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!landlordId) {
      return NextResponse.json(
        { error: 'Landlord ID is required' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'File must be an Excel spreadsheet (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Convert the file to an ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Parse the Excel file
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert the worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Get rental inventory for validation
    const rentalInventory = await getAllRentalInventory(landlordId);
    
    // Find header row (skip instruction rows)
    let headerRowIndex = -1;
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      // Skip empty rows
      if (!row || row.length === 0) continue;
      
      // If this row has our expected headers, it's the header row
      if (row.includes('Unit Number*') && 
          row.includes('Tenant Name*') && 
          row.includes('Email*')) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      return NextResponse.json(
        { error: 'Could not find header row with required columns in the Excel file. Please use the provided template.' },
        { status: 400 }
      );
    }
    
    // Extract headers and data rows (skip the header row itself)
    const headers = jsonData[headerRowIndex];
    const data = jsonData.slice(headerRowIndex + 1);
    
    // Map column indices
    const unitNumberIndex = headers.indexOf('Unit Number*');
    const tenantNameIndex = headers.indexOf('Tenant Name*');
    const countryCodeIndex = headers.indexOf('Country Code*');
    const phoneNumberIndex = headers.indexOf('Phone Number*');
    const emailIndex = headers.indexOf('Email*');
    const adhaarNumberIndex = headers.indexOf('Adhaar Number*');
    const panNumberIndex = headers.indexOf('PAN Number');
    const employerNameIndex = headers.indexOf('Employer Name');
    const permanentAddressIndex = headers.indexOf('Permanent Address');
    const leaseStartDateIndex = headers.indexOf('Lease Start Date*');
    const leaseEndDateIndex = headers.indexOf('Lease End Date*');
    const rentAmountIndex = headers.indexOf('Rent Amount*');
    const securityDepositIndex = headers.indexOf('Security Deposit*');
    const depositMethodIndex = headers.indexOf('Deposit Method*');
    
    // Check if all required columns are present
    const requiredIndices = [
      { index: unitNumberIndex, name: 'Unit Number*' },
      { index: tenantNameIndex, name: 'Tenant Name*' },
      { index: countryCodeIndex, name: 'Country Code*' },
      { index: phoneNumberIndex, name: 'Phone Number*' },
      { index: emailIndex, name: 'Email*' },
      { index: adhaarNumberIndex, name: 'Adhaar Number*' },
      { index: leaseStartDateIndex, name: 'Lease Start Date*' },
      { index: leaseEndDateIndex, name: 'Lease End Date*' },
      { index: rentAmountIndex, name: 'Rent Amount*' },
      { index: securityDepositIndex, name: 'Security Deposit*' },
      { index: depositMethodIndex, name: 'Deposit Method*' }
    ];
    
    const missingColumns = requiredIndices
      .filter(item => item.index === -1)
      .map(item => item.name);
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { 
          error: `Missing required columns: ${missingColumns.join(', ')}. Your Excel file must include all required columns marked with an asterisk (*).` 
        },
        { status: 400 }
      );
    }
    
    // Process each row and add to Firestore
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
      skipped: 0
    };
    
    for (const row of data) {
      // Skip empty rows
      if (!row || row.length === 0) {
        results.skipped++;
        continue;
      }
      
      // Check if this is an instruction or example row
      const firstCell = String(row[0] || '').trim();
      if (INSTRUCTION_KEYWORDS.some(keyword => firstCell.toUpperCase().includes(keyword)) || 
          // Skip rows with values that match our examples
          (firstCell === '101' || firstCell === 'Shop-A')) {
        results.skipped++;
        continue;
      }
      
      try {
        const unitNumber = String(row[unitNumberIndex] || '').trim();
        
        // Skip if unit number is empty
        if (!unitNumber) {
          results.skipped++;
          continue;
        }
        
        // Find the unit in rental inventory
        const unit = rentalInventory.find(
          u => u.unitNumber === unitNumber || u.id === unitNumber
        );
        
        if (!unit) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Unit does not exist in rental inventory. Please add this unit to inventory first.`);
          continue;
        }
        
        // Extract tenant data
        const tenantName = String(row[tenantNameIndex] || '').trim();
        if (!tenantName) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Tenant Name is required`);
          continue;
        }
        
        // Extract other fields
        const countryCode = String(row[countryCodeIndex] || '').trim();
        if (!countryCode) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Country Code is required`);
          continue;
        }
        
        const phoneNumber = String(row[phoneNumberIndex] || '').trim();
        if (!phoneNumber) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Phone Number is required`);
          continue;
        }
        
        const email = String(row[emailIndex] || '').trim();
        if (!email) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Email is required`);
          continue;
        }
        
        // Validate email format
        if (!/\S+@\S+\.\S+/.test(email)) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Email format is invalid`);
          continue;
        }
        
        const adhaarNumber = String(row[adhaarNumberIndex] || '').trim();
        if (!adhaarNumber) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Adhaar Number is required`);
          continue;
        }
        
        // Validate Adhaar number (12 digits)
        if (!/^\d{12}$/.test(adhaarNumber)) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Adhaar Number must be exactly 12 digits`);
          continue;
        }
        
        // Parse date fields
        let leaseStartDate, leaseEndDate;
        try {
          const startDateStr = String(row[leaseStartDateIndex] || '').trim();
          leaseStartDate = new Date(startDateStr);
          if (isNaN(leaseStartDate.getTime())) {
            throw new Error('Invalid date format');
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Invalid Lease Start Date format. Use YYYY-MM-DD.`);
          continue;
        }
        
        try {
          const endDateStr = String(row[leaseEndDateIndex] || '').trim();
          leaseEndDate = new Date(endDateStr);
          if (isNaN(leaseEndDate.getTime())) {
            throw new Error('Invalid date format');
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Invalid Lease End Date format. Use YYYY-MM-DD.`);
          continue;
        }
        
        // Validate lease dates
        if (leaseEndDate <= leaseStartDate) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Lease End Date must be after Lease Start Date`);
          continue;
        }
        
        // Parse numeric values
        let rentAmount, securityDeposit;
        try {
          rentAmount = Number(row[rentAmountIndex]);
          if (isNaN(rentAmount) || rentAmount < 0) {
            throw new Error('Invalid rent amount');
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Rent Amount must be a positive number`);
          continue;
        }
        
        try {
          securityDeposit = Number(row[securityDepositIndex]);
          if (isNaN(securityDeposit) || securityDeposit < 0) {
            throw new Error('Invalid security deposit');
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Security Deposit must be a positive number`);
          continue;
        }
        
        // Validate deposit method
        const depositMethod = String(row[depositMethodIndex] || '').trim();
        if (!VALID_DEPOSIT_METHODS.includes(depositMethod)) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Invalid Deposit Method. Must be one of: ${VALID_DEPOSIT_METHODS.join(', ')}`);
          continue;
        }
        
        // Get optional fields
        const panNumber = panNumberIndex >= 0 ? String(row[panNumberIndex] || '').trim() : '';
        const employerName = employerNameIndex >= 0 ? String(row[employerNameIndex] || '').trim() : '';
        const permanentAddress = permanentAddressIndex >= 0 ? String(row[permanentAddressIndex] || '').trim() : '';
        
        // Add the lease
        await addLease(landlordId, {
          landlordId,
          unitId: unit.id || '',
          unitNumber: unit.unitNumber,
          tenantName,
          countryCode,
          phoneNumber,
          email,
          adhaarNumber,
          panNumber: panNumber || undefined,
          employerName: employerName || undefined,
          permanentAddress: permanentAddress || undefined,
          leaseStartDate,
          leaseEndDate,
          rentAmount,
          securityDeposit,
          depositMethod: depositMethod as 'Cash' | 'Bank transfer' | 'UPI' | 'Check',
          isActive: true,
        });
        results.successful++;
        
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error processing row: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      ...results,
      message: `Processed ${results.successful + results.failed + results.skipped} rows: ${results.successful} tenants added successfully, ${results.failed} failed, ${results.skipped} skipped (including instructions and examples).`
    });
  } catch (error: any) {
    console.error('Error processing Excel upload:', error);
    return NextResponse.json(
      { error: `Failed to process Excel upload: ${error.message}` },
      { status: 500 }
    );
  }
} 