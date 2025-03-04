# Multi-Phase Roadmap for Application Rebuild

This document provides a comprehensive, step-by-step roadmap for rebuilding the application. It is intended for an development team to follow sequentially. All general instructions, design rules, and process logic have been consolidated in this document to serve as context for efficient implementation.

---

## General Instructions

- **Code Quality & Version Control:**  
  - Follow clean code practices: meaningful naming conventions, modular functions, and detailed inline comments. Refer to documentation for next.js or any other languages for details when building the application if needed. 
  - Use Git with feature branches; commit frequently with descriptive messages.
  - Document all changes and maintain an updated changelog.

- **Security:**  
  - Validate and sanitize all user inputs on both client and server sides.
  - Enforce HTTPS for all communications and secure Firebase authentication.
  - Sanitize file uploads (validate file type and size).

- **Testing & Logging:**  
  - Implement automated unit, integration, and end-to-end tests (using Jest, Cypress, or similar frameworks).
  - Integrate robust logging (using libraries like Winston) to capture errors and significant events.
  - Set up real-time monitoring and alerts (e.g., Firebase Crashlytics) for production.

- **Deployment Best Practices:**  
  - Deploy using Firebase hosting with rollback strategies in place.
  - Ensure static assets are optimized and bundled efficiently.

---

## Design Rules

- **Component Library & Styling:**  
  - Use Shadcn UI components for all new UI components.
  - Style using Tailwind CSS.
  - Ensure components are responsive and accessible.

- **Page & Form Design:**  
  - New pages must be optimized for both mobile and desktop views.
  - Design pages to be clean, modern, and consistent with the existing design language (consistent color schemes, font styles, and reusable design layouts).
  - Ensure high contrast (e.g., black text on light backgrounds) for readability.
  - Forms should have a beautiful and modern design with clear input validation, error messaging, and consistency in UI elements.

---

## Phase 1: Preparation & Setup ✅ COMPLETED

1. **Set Up Development Environment:** ✅  
   - Clone the repository and create a dedicated branch for the rebuild.
   - Set up environment variables for API keys and Firebase credentials.
   - Install dependencies and configure ESLint/Prettier for code quality.

2. **Document Current State:** ✅  
   - Identified all files related to the current Tenants and Leases tabs.
   - Prepared backup/documentation of existing design elements for reference in `src/docs/current-state.md`.

**Implementation Details:**
- Created documentation file in `src/docs/current-state.md` with information about the current navigation structure, Tenants and Leases tabs, and data models.
- The existing application structure was thoroughly analyzed to understand the components, routing, and data flow.

---

## Phase 2: Dashboard & Inventory Management ✅ COMPLETED

1. **Dashboard Update:** ✅
   - Modified `/dashboard` by adding a blue button labeled **"Manage Rental Inventory"** on the top right within the title dashboard container.
   - This button navigates the user to the new Rental Inventory Management page.

2. **Rental Inventory Management Page:** ✅
   - **Purpose:** Allow users to view and upload their complete rental unit inventory.
   - **Firebase Collection: `rental-inventory`**  
     - **Fields:**
       - **Unit Number:** (String) Unique identifier (e.g., "101" or "HSR2").
       - **Property Type:** (Enum/Category) Options: *Commercial* or *Residential*.
       - **Owner Details:** (String)
       - **Bank Details:** (String, Optional)
   - **UI/Form Requirements:** 
     - Display a table of existing inventory items.
     - Provide a form with input validation and error messages.
     - Enforce unique Unit Number constraints.

**Implementation Details:**
- Added Rental Inventory type definition in `src/types.d.ts`
- Created Firebase utility functions in `src/lib/firebase/firestoreUtils.ts` for:
  - Adding rental inventory items
  - Getting all rental inventory items
  - Updating rental inventory items
  - Deleting rental inventory items
  - Checking if a unit number already exists
- Added a blue "Manage Rental Inventory" button to the dashboard page in `src/app/dashboard/page.tsx`
- Created the Rental Inventory Management page at `src/app/dashboard/rental-inventory/page.tsx` with:
  - Table view of inventory items
  - Add/Edit form with validation
  - Delete functionality
- Added a navigation link in `src/components/Navigation.tsx` with a Building icon
- Created a simple logger utility at `src/lib/logger.ts` for logging operations


**Tweaks to be made later:**
- Do not have a popup form. Instead, have the form embedded within the page. Easier UI and better for mobile interactions. 
- The button on the dashboard page should be identical to the add tenant button. Right now it is slightly off. The "+" in front is a great design element. 
- In addition to the button, there is also a new tab created in the navigation bar. This should not be there. Can add the buildign logo to the button itself, that is a nice touch.

---

## Phase 3: Removal of Legacy Functionality ✅ COMPLETED

1. **Remove Outdated Modules:** ✅
   - Deleted the "Tenants" and "Leases" tabs entirely from the UI.
   - Removed all files, routes, components, and API endpoints related to adding, editing, or deleting tenants or leases.
   - Created extensive documentation of design elements for future re-implementation.

**Implementation Details:**
- Removed "Tenants" and "Leases" entries from the navigation items in `src/components/Navigation.tsx`
- Created a backup of the tenants and leases components at `src/archives/phase3-backup/` for reference
- Deleted the tenants and leases directories at `src/app/dashboard/tenants` and `src/app/dashboard/leases`
- Enhanced documentation in `src/docs/current-state.md` with detailed descriptions of:
  - UI components and design elements
  - Form layouts and validations
  - Table structures
  - Interactive elements
  - General design patterns
- Updated the Dashboard page to remove references to tenants and leases:
  - Changed stat cards to focus on rental units instead of tenants/leases
  - Updated the "Upcoming Lease Expirations" section to "Rental Inventory Overview"
  - Added a "+" icon to the "Manage Rental Inventory" button for consistency
- Maintained all shared utilities and type definitions to prevent breaking dependencies

**Design Elements Preserved for Phase 4:**
- Blue primary action buttons with "+" icon for add actions
- Table layouts with search/filter functionality
- Form validation patterns
- Toggle components for active/inactive states
- Edit/Delete action buttons with appropriate colors

---

## Phase 4: Tenant & Lease Management ✅ COMPLETED

1. **Tenant Tab:**  ✅  
   - Created a new **Tenant** tab displaying a table with all tenants and their lease histories.
   - Sorted the table to show active leases first and inactive leases below.
   - Implemented support for multiple lease records per unit (one active and possibly multiple inactive).
   - Added search functionality for the tenant table.

2. **Lease Collection Schema:**  ✅  
   - **Firebase Collection: `lease`**  
     - **Fields:**
       - **Unit ID:** (String) - Primary key that connects to rental inventory
       - **Tenant Name:** (String)
       - **Country Code:** (String; starting with "+" followed by integers)
       - **Phone Number:** (String)
       - **Email Address:** (String, validated)
       - **Adhaar Number:** (String)
       - **Pan Number:** (String, Optional)
       - **Employer Name:** (String, Optional)
       - **Permanent Address:** (String, Optional)
       - **Lease Start Date:** (Date)
       - **Lease End Date:** (Date)
       - **Rent Amount:** (Number/Currency)
       - **Security Deposit:** (Number/Currency)
       - **Deposit Method:** (Enum: *Cash*, *Bank transfer*, *UPI*, *Check*)
       - **Lease Agreement URL:** (String, for document upload)
       - **Additional Document URL:** (String, Optional)
       - **Additional Comments:** (String, Optional)
       - **Is Active:** (Boolean)
       - **Created At:** (Date)
       - **Updated At:** (Date)
     - **Rule Implementation:** Only one lease per unit may be active at any given time, enforced through Firebase utility functions with validation checks.

3. **Embedded Form Implementation:**  ✅  
   - Created an embedded form (not a popup) for adding new tenant leases.
   - Implemented form validation with clear error messages.
   - Added formatting for lease period with visual duration indicators.
   - Connected the form to the Firebase backend with proper error handling.

4. **Firebase Utility Functions:**  ✅  
   - Implemented `addLease` function with validation checks for active leases.
   - Created `getAllLeases` function with sorting by active status and date.
   - Added `updateLease` and `deleteLease` functions.
   - Implemented helper functions for checking active lease status.
   - Ensured proper error handling and logging throughout.

5. **User Interface Enhancements:**  ✅  
   - Improved lease period display with duration indicators (e.g., "2y 3m") for better readability.
   - Added status indicators for active/inactive leases.
   - Implemented a responsive form layout with proper grouping of related fields.
   - Ensured high color contrast for improved accessibility and readability.

**Implementation Details:**
- Unit Number serves as the key joining field across all collections for analytics and reporting.
- The Lease table displays formatted dates, lease duration, status indicators, and placeholders for action buttons.
- Form validation ensures data integrity before submission to Firebase.
- Added to the Navigation component with proper icon and routing.

---

## Phase 4.5: Tenant Edit/Delete & Lease Toggle Functionality

1. **Tenant Table Enhancements:**  
   - In the Tenant tab, display rows with key tenant information.
   - Include an **Actions** column with buttons for:
     - **View:** Navigate to a detailed lease view page.
     - **Edit:** Open a pre-populated form for editing lease details.
     - **Toggle Lease Status:** Enable toggling between active and inactive status.
  
2. **View Lease Details:**  
   - On clicking **View**, redirect the user to a dedicated page that displays all lease agreement details fetched from the `lease` collection in a user-friendly, modern UI.

3. **Edit Lease Details:**  
   - When **Edit** is clicked, open the existing Add Tenant (or Lease) form pre-populated with data from the specific lease.
   - All fields are editable except for the Unit Number.
   - Updates should modify the existing record rather than creating a new lease.
   - Include a red **Delete** button at the bottom of the form.
     - On clicking **Delete**, display a confirmation popup.
     - Upon confirmation, delete the lease from Firebase and redirect the user back to the Tenant tab with a success message.

4. **Lease Toggle Functionality:**  
   - Implement an interactive toggle element reflecting the lease's active status.
   - Toggling off a lease should occur immediately.
   - When toggling on a lease, cross-check the database:
     - If another lease for the same unit is already active, display a UI-friendly error message with tenant name and lease duration details.
     - The error must prompt the user to deactivate the conflicting lease before activating another.

5. **UI Consistency:**  
   - Ensure all pages and forms follow the design rules (clean, modern, responsive, and consistent with existing styles).

---

## Phase 5: Rent Collection Management

1. **Rent Collection Tab – UI/Table:**  
   - Ensure the existing table displays all historical rent collection entries, sorted with the latest month first.
   - Confirm that search filters for Month-Year and Unit Number are functioning properly.

2. **Add Rent Entry Form – Enhancements:**  

   - **Process Flow:**  
     - **Step 1:** User clicks the **"Add Rent Entry"** button (located at the top left) to open the form.
     - **Step 2:**  
       - **Unit Number Field:** Provide a dropdown populated by querying the `rental-inventory` collection.
       - **Auto-Populate:** Once a unit is selected, query the `lease` collection in Firebase for the active lease to auto-fill:
         - Tenant Name
         - Expected Rent
         - Bank Details
         - Unit Owner information
     - **Step 3:** Additional Form Fields for User Input:
       - **Rental Period:** Dropdown listing month-year values from 4 months before to 4 months after the current month.
       - **Rent Received:** (Currency/Number)
       - **Rent Paid Date:** (Date)
       - **Comments:** (String)
     - **Step 4:** Validate all inputs on submission. On success, redirect the user back to the Rent Collection tab with an updated table view.
   - **AI Agent Implementation Note:**  
     - Some form fields may already exist; identify any missing fields and integrate the process logic.
     - Consult relevant design and process documents to fill in any missing pieces.

---

## Phase 6: Build Process, Testing, and Deployment

1. **Local Build & CI/CD Pipeline:**  
   - Set up a local development environment mirroring production.
   - Integrate ESLint/Prettier for code formatting.
   - Configure CI/CD pipelines (e.g., GitHub Actions) to automate testing and building.

2. **Automated Testing:**  
   - Write comprehensive unit tests (using Jest/Mocha).
   - Develop integration tests for form submissions, database interactions, and API endpoints.
   - Implement end-to-end tests (using Cypress or Selenium) for critical user workflows.

3. **Logging & Monitoring:**  
   - Implement logging on both client and server using libraries like Winston.
   - Set up real-time error monitoring and alerts (using Firebase Crashlytics or equivalent).

4. **Deployment:**  
   - Use Firebase hosting for deployment.
   - Ensure all dependencies are pinned to avoid version conflicts.
   - Optimize static assets and bundle efficiently.
   - Implement rollback strategies to handle deployment failures.

5. **Final Validation:**  
   - Run the full test suite.
   - Verify logging and error monitoring are active.
   - Deploy to a staging environment first, validate functionality, then proceed to production.

---

By following this multi-phase roadmap and adhering to the general instructions and design rules, the application will be rebuilt efficiently with a modern, secure, and error-resistant architecture. This document should serve as the complete set of guidelines for the AI agent or development team to execute with minimal supervision.
