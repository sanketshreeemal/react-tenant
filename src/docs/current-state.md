# Current State Documentation

## Navigation Structure
The application currently uses a sidebar navigation with the following tabs:
- Dashboard (`/dashboard`)
- Tenants (`/dashboard/tenants`)
- Leases (`/dashboard/leases`)
- Rent (`/dashboard/rent`)
- Analytics (`/dashboard/analytics`)
- Email Notifications (`/dashboard/email`)
- WhatsApp Messaging (`/dashboard/whatsapp`)
- Documents (`/dashboard/documents`)

## Tenants Tab
The Tenants tab is located at `/dashboard/tenants` and includes:
- A page component at `src/app/dashboard/tenants/page.tsx`
- An "Add Tenant" functionality at `src/app/dashboard/tenants/add/`

The Tenants tab allows users to view, add, edit, and delete tenant information.

### UI Components and Design Elements
- **Add Tenant Button**: Blue button with a "+" icon in the header section of the page
- **Tenant Table**: Displays tenant information with columns for name, contact details, etc.
- **Search/Filter**: Input field for filtering tenants
- **Action Buttons**: "Edit" and "Delete" buttons for each tenant row
- **Pagination**: Controls for navigating through multiple pages of tenants

### Add Tenant Form
- Form fields include personal information, contact details, and document uploads
- Validation for required fields and proper formatting (email, phone numbers)
- Cancel and Submit buttons at the bottom of the form

## Leases Tab
The Leases tab is located at `/dashboard/leases` and includes:
- A page component at `src/app/dashboard/leases/page.tsx`

The Leases tab allows users to manage lease agreements for properties.

### UI Components and Design Elements
- **Lease Table**: Displays lease information with columns for tenant, unit, dates, rent amount, etc.
- **Active/Inactive Toggle**: Switch to toggle between active and inactive leases
- **View Details Button**: Button to view complete lease details
- **Action Buttons**: "Edit" and "Delete" buttons for each lease row

### Lease Form Elements
- Form fields for lease details, including start/end dates, rent amount, and security deposit
- Unit selection dropdown
- Tenant association
- Document upload section for lease agreements
- Validation for all required fields

## Data Models
The application uses the following data models:

### Tenant Model
```typescript
export interface Tenant {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: {
    countryCode: string;
    mobileNumber: string;
  };
  adhaarNumber: string;
  panNumber?: string;
  permanentAddress?: string;
  currentEmployer?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Lease Model
```typescript
export interface Lease {
  id?: string;
  unitId: string;
  tenantId: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  rentAmount: number;
  securityDeposit?: number;
  securityDepositPaymentMethod?: string;
  leaseAgreementDocumentUrl?: string;
  adhaarCardCopyUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Important Design Notes for Future Implementation
- The application uses a consistent blue color scheme for primary actions
- Forms are designed with clear labels and validation messages
- Tables have a clean, modern design with alternating row colors for readability
- Action buttons use intuitive icons and appropriate colors (blue for edit, red for delete)
- Required fields are clearly marked with an asterisk (*)
- Responsive design accommodates both desktop and mobile views

This documentation will be used as a reference when re-implementing these features in Phase 4. 