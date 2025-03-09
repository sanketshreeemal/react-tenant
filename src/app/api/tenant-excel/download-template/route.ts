import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
  try {
    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Define the header row with the expected columns and instructions
    const instructionRow = [
      "INSTRUCTIONS: Fill in your tenant details below. DO NOT modify the header row.",
      "", "", "", "", "", "", "", "", "", "", "", "", ""
    ];

    const propertyTypeNote = [
      "NOTE: For 'Property Type' column, enter either 'Residential' or 'Commercial' exactly as written.",
      "", "", "", "", "", "", "", "", "", "", "", "", ""
    ];

    const depositMethodNote = [
      "NOTE: For 'Deposit Method' column, enter one of: 'Cash', 'Bank transfer', 'UPI', or 'Check' exactly as written.",
      "", "", "", "", "", "", "", "", "", "", "", "", ""
    ];

    const exampleNote = [
      "EXAMPLES: These rows are for reference only and will be ignored during import:",
      "", "", "", "", "", "", "", "", "", "", "", "", ""
    ];

    // Define the header row with the expected columns
    const headers = [
      "Unit Number*", 
      "Tenant Name*", 
      "Country Code*",
      "Phone Number*",
      "Email*",
      "Adhaar Number*",
      "PAN Number",
      "Employer Name",
      "Permanent Address",
      "Lease Start Date*",
      "Lease End Date*",
      "Rent Amount*",
      "Security Deposit*",
      "Deposit Method*"
    ];
    
    // Sample data rows with examples
    const example1 = [
      "101", 
      "John Doe",
      "+91",
      "9876543210",
      "john.doe@example.com",
      "123456789012", // 12-digit Adhaar
      "ABCDE1234F", // PAN (optional)
      "Acme Corporation", // Employer (optional)
      "123 Main St, Bangalore 560001", // Address (optional)
      "2023-10-01", // Lease start date (YYYY-MM-DD)
      "2024-10-01", // Lease end date (YYYY-MM-DD)
      "25000", // Rent amount (number)
      "50000", // Security deposit (number)
      "UPI" // Deposit method (Cash, Bank transfer, UPI, Check)
    ];

    const example2 = [
      "Shop-A", 
      "ABC Corporation",
      "+91",
      "9876543211",
      "contact@abccorp.com",
      "987654321098", // 12-digit Adhaar
      "PQRST5678G", // PAN (optional)
      "", // Employer (optional)
      "456 Business Park, Mumbai 400001", // Address (optional)
      "2023-11-01", // Lease start date (YYYY-MM-DD)
      "2024-11-01", // Lease end date (YYYY-MM-DD)
      "75000", // Rent amount (number)
      "200000", // Security deposit (number)
      "Bank transfer" // Deposit method (Cash, Bank transfer, UPI, Check)
    ];
    
    // Create the worksheet with headers and examples
    const wsData = [
      instructionRow,
      propertyTypeNote,
      depositMethodNote,
      exampleNote,
      headers,
      example1,
      example2,
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add column width specifications for better readability
    const columnWidths = [
      { wch: 15 },  // Unit Number
      { wch: 25 },  // Tenant Name
      { wch: 15 },  // Country Code
      { wch: 15 },  // Phone Number
      { wch: 25 },  // Email
      { wch: 15 },  // Adhaar Number
      { wch: 15 },  // PAN Number
      { wch: 25 },  // Employer Name
      { wch: 40 },  // Permanent Address
      { wch: 15 },  // Lease Start Date
      { wch: 15 },  // Lease End Date
      { wch: 15 },  // Rent Amount
      { wch: 15 },  // Security Deposit
      { wch: 15 }   // Deposit Method
    ];
    
    worksheet['!cols'] = columnWidths;

    // Add styling to differentiate instructions and examples from actual data
    // Mark the first few rows as instructional rows (with yellow background)
    for (let R = 0; R < 4; ++R) {
      for (let C = 0; C < headers.length; ++C) {
        const cell_ref = XLSX.utils.encode_cell({r: R, c: C});
        if(!worksheet[cell_ref]) worksheet[cell_ref] = {t:'s', v:''};
        worksheet[cell_ref].s = {
          fill: {fgColor: {rgb: "FFFFCC"}},
          font: {bold: true, color: {rgb: "FF0000"}}
        };
      }
    }

    // Mark the example rows (light blue background)
    for (let R = 5; R < 7; ++R) {
      for (let C = 0; C < headers.length; ++C) {
        const cell_ref = XLSX.utils.encode_cell({r: R, c: C});
        if(worksheet[cell_ref]) {
          worksheet[cell_ref].s = {
            fill: {fgColor: {rgb: "E6F2FF"}},
            font: {italic: true}
          };
        }
      }
    }

    // Add note about example rows at the bottom
    const warningRow = [
      "NOTE: The example and instruction rows will be automatically skipped during import.",
      "", "", "", "", "", "", "", "", "", "", "", "", ""
    ];
    XLSX.utils.sheet_add_aoa(worksheet, [warningRow], {origin: 7});
    
    // Style the warning
    for (let C = 0; C < headers.length; ++C) {
      const cell_ref = XLSX.utils.encode_cell({r: 7, c: C});
      if(!worksheet[cell_ref]) worksheet[cell_ref] = {t:'s', v:''};
      worksheet[cell_ref].s = {
        fill: {fgColor: {rgb: "E6F2FF"}},
        font: {bold: true, color: {rgb: "0000FF"}}
      };
    }
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tenants Template");
    
    // Convert the workbook to a binary string
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers for file download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="tenant_template.xlsx"'
      }
    });
  } catch (error) {
    console.error('Error generating Excel template:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel template' },
      { status: 500 }
    );
  }
} 