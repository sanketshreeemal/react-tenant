import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { addRentalInventory, checkUnitNumberExists } from '@/lib/firebase/firestoreUtils';

// Keywords that indicate a row is an instruction or example row
const INSTRUCTION_KEYWORDS = [
  'INSTRUCTION', 'NOTE', 'EXAMPLE', 'DELETE', 'IMPORTANT',
  'DO NOT', 'BEFORE UPLOADING', 'REFERENCE', 'IGNORED'
];

export async function POST(req: NextRequest) {
  try {
    // Check if the request contains multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
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
    
    // Find header row (skip instruction rows)
    let headerRowIndex = -1;
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      // Skip empty rows
      if (!row || row.length === 0) continue;
      
      // If this row has our expected headers, it's the header row
      if (row.includes('Unit Number*') && 
          row.includes('Property Type*') && 
          row.includes('Owner Details*')) {
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
    const propertyTypeIndex = headers.indexOf('Property Type*');
    const ownerDetailsIndex = headers.indexOf('Owner Details*');
    const bankDetailsIndex = headers.indexOf('Bank Details (Optional)');
    
    // Check if all required columns are present
    if (unitNumberIndex === -1 || propertyTypeIndex === -1 || ownerDetailsIndex === -1) {
      return NextResponse.json(
        { error: 'Missing required columns. Your Excel file must include "Unit Number*", "Property Type*", and "Owner Details*" columns.' },
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
          // Skip rows with "residential"/"commercial" in the first column that match our examples
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
        
        // Check and validate property type
        let propertyType = String(row[propertyTypeIndex] || '').trim();
        if (propertyType !== 'Commercial' && propertyType !== 'Residential') {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Invalid Property Type "${propertyType}". Must be either "Residential" or "Commercial".`);
          continue;
        }
        
        // Check if owner details exists
        const ownerDetails = String(row[ownerDetailsIndex] || '').trim();
        if (!ownerDetails) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Owner Details is required`);
          continue;
        }
        
        // Check if the unit number already exists
        const exists = await checkUnitNumberExists(unitNumber);
        if (exists) {
          results.failed++;
          results.errors.push(`Unit ${unitNumber}: Already exists in the database`);
          continue;
        }
        
        // Add the rental inventory item
        const bankDetails = bankDetailsIndex >= 0 ? String(row[bankDetailsIndex] || '').trim() : '';
        
        await addRentalInventory({
          unitNumber,
          propertyType: propertyType as 'Commercial' | 'Residential',
          ownerDetails,
          bankDetails: bankDetails || undefined
        });
        
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error processing row: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      ...results,
      message: `Processed ${results.successful + results.failed + results.skipped} rows: ${results.successful} added successfully, ${results.failed} failed, ${results.skipped} skipped (including instructions and examples).`
    });
  } catch (error: any) {
    console.error('Error processing Excel upload:', error);
    return NextResponse.json(
      { error: `Failed to process Excel upload: ${error.message}` },
      { status: 500 }
    );
  }
} 