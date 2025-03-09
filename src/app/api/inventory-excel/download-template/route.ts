import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
  try {
    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Define the header row with the expected columns and instructions
    const instructionRow = [
      "INSTRUCTIONS: Fill in your property details below. DO NOT modify the header row.",
      "", "", ""
    ];

    const propertyTypeNote = [
      "NOTE: For 'Property Type' column, enter either 'Residential' or 'Commercial' exactly as written.",
      "", "", ""
    ];

    const exampleNote = [
      "EXAMPLES: These rows are for reference only and will be ignored during import:",
      "", "", ""
    ];

    // Define the header row with the expected columns
    const headers = [
      "Unit Number*", 
      "Property Type*", 
      "Owner Details*", 
      "Bank Details (Optional)"
    ];
    
    // Sample data rows with examples for both Residential and Commercial
    const residentialExample = [
      "101", 
      "Residential", 
      "John Doe, +91 9876543210, johndoe@example.com", 
      "Bank: HDFC, Account: 12345678901234, IFSC: HDFC0001234"
    ];

    const commercialExample = [
      "Shop-A", 
      "Commercial", 
      "ABC Corporation, Contact: Jane Smith, +91 9876543210", 
      "Bank: ICICI, Account: 98765432109876, IFSC: ICIC0005678"
    ];
    
    // Create the worksheet with headers and examples
    const wsData = [
      instructionRow,
      propertyTypeNote,
      exampleNote,
      headers,
      residentialExample,
      commercialExample,
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add column width specifications for better readability
    const columnWidths = [
      { wch: 15 },  // Unit Number
      { wch: 15 },  // Property Type
      { wch: 40 },  // Owner Details
      { wch: 40 }   // Bank Details
    ];
    
    worksheet['!cols'] = columnWidths;

    // Add styling to differentiate instructions and examples from actual data
    // Mark the first few rows as instructional rows (with yellow background)
    for (let R = 0; R < 3; ++R) {
      for (let C = 0; C < 4; ++C) {
        const cell_ref = XLSX.utils.encode_cell({r: R, c: C});
        if(!worksheet[cell_ref]) worksheet[cell_ref] = {t:'s', v:''};
        worksheet[cell_ref].s = {
          fill: {fgColor: {rgb: "FFFFCC"}},
          font: {bold: true, color: {rgb: "FF0000"}}
        };
      }
    }

    // Mark the example rows (light blue background)
    for (let R = 4; R < 6; ++R) {
      for (let C = 0; C < 4; ++C) {
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
      "", "", ""
    ];
    XLSX.utils.sheet_add_aoa(worksheet, [warningRow], {origin: 6});
    
    // Style the warning
    for (let C = 0; C < 4; ++C) {
      const cell_ref = XLSX.utils.encode_cell({r: 6, c: C});
      if(!worksheet[cell_ref]) worksheet[cell_ref] = {t:'s', v:''};
      worksheet[cell_ref].s = {
        fill: {fgColor: {rgb: "E6F2FF"}},
        font: {bold: true, color: {rgb: "0000FF"}}
      };
    }
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Template");
    
    // Convert the workbook to a binary string
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers for file download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="rental_inventory_template.xlsx"'
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