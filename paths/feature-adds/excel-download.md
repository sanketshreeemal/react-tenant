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

### 📦 File Structure
src/lib/utils/excelutils.ts


