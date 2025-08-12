# Feature: Download Tenant Lease Data as Excel

## Overview

This feature allows a logged-in landlord to **download an Excel file** containing their tenant lease data from Firestore. The file will include **one sheet** titled `Tenant Leases`, populated with structured and formatted tenant lease data. This is the first phase of a broader feature, where **additional sheets** can later be added for other Firestore collections (e.g., Payments, Properties, etc.).

---

## Objective

Allow landlords to:
- Download a well-formatted `.xlsx` file
- View tenant lease data in a readable tabular format
- Ensure data is filtered per the **Authenticated landlord only**

---

## Functional Requirements

### 🔘 UI Component

- **Download Button** (placed appropriately, e.g., in dashboard or lease overview page)
  - Label: `Download Database` (**Done**)
  - Disabled while loading
  - Shows a spinner or progress indicator while file is generating
  - On success: triggers file download
  - On failure: displays toast/snackbar error

---

### 🔐 Auth & Permissions

- Only logged-in landlords can access this feature
- `landlordId` must be dynamically derived from the `auth.currentUser` or relevant context
- The query must be restricted to `landlords/{landlordId}/leases`

---

### 📁 Firestore Structure

**Firestore Path:** landlords/{landlordId}/leases

    Each document in this collection contains fields like:

    - tenantName, phoneNumber, unitNumber, leaseStartDate, etc.
    - Timestamps must be formatted as human-readable strings

    ---

### File Structure
src/lib/utils/excelutils.ts
File structure to fetch, format and structure data from Firestore and lastly create and downloads the excel file 


---

## Flow: Step-by-Step Implementation

### 1. **Click Event Handler**
- On click, invoke a handler that:
  - Gets the `landlordId` from auth/session
  - Calls Firestore fetch utility
  - Passes result to XLSX utility
  - Triggers browser download

### 2. **Fetching Data**
- Utility: `fetchTenantLeaseData(landlordId: string): Promise<TenantRow[]>`
- Convert timestamps using `date-fns` or similar
- Ensure null-safety on all fields

### 3. **Formatting for Excel**
- Utility: `generateExcelFile({ tenants })`
- Uses `xlsx`:
  - Sheet name: `"Tenant Leases"`
  - Column headers in friendly human-readable format
  - Data passed as array of objects
- Example columns:
  - `Tenant Name`, `Phone Number`, `Lease Start Date`, `Rent Amount`, etc.

### 4. **File Generation and Download**
- Uses `xlsx.utils.book_new`, `xlsx.utils.json_to_sheet`, and `xlsx.writeFile`
- File name: `data_{YYYYMMDD}.xlsx`

### 5. **UI Feedback**
- While downloading:
  - Disable button
  - Show `Spinner`
- On success:
  - Download triggers automatically
- On failure:
  - Show Alert Message Component: `"Failed to generate file. Please try again."`

---

## 🧱 Implementation Guidelines
To fetch firestore data
    Function: fetchTenantLeaseData(landlordId: string): Promise<TenantRow[]>
    Use getDocs(collection(db, landlords/${landlordId}/leases))
    Format timestamps and fallback to "" for missing fields
To Export data into excel workbook and download 
    Function: exportTenantDataToExcel(tenantRows: any[])
    Use xlsx to: Create workbook
    Add "Tenant Leases" sheet
    Call writeFile(workbook, 'data_20250512.xlsx')

For Next integration to add data from other collections (should be able to specify which collections)- 
    Add each dataset using xlsx.utils.json_to_sheet(data, options)
    Append to workbook with XLSX.utils.book_append_sheet(wb, sheet, sheetName)
