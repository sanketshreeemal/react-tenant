# Product Requirements Document: Delinquent Units Dashboard Feature

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to define the requirements for a new feature on the landlord dashboard that provides detailed analytics regarding delinquent rental units. This feature aims to enhance the current dashboard's capabilities by tracking and displaying units with unpaid rent from previous months, addressing a significant gap in the existing system which primarily focuses on current-month payments.

### 1.2 Goals
* Enable landlords to easily identify units with outstanding rent payments from past rental periods.
* Provide both an aggregate portfolio-level view and a property-specific view of delinquent units and associated data.
* Improve financial tracking and management capabilities for landlords using the application.
* Maintain consistency with the existing dashboard UI/UX for a seamless user experience.

### 1.3 Scope
This document covers the addition of a new section (card/tab) on the dashboard specifically for displaying delinquent unit information. It includes the logic required to identify delinquent units, calculate the total rent behind, and present this data based on the user's selected view (Aggregate or Property Specific).


---

## 2. Definitions

* **Delinquent Unit:** A rental unit with an `active` lease where the expected `Rent Payment` for one or more past `rentalPeriod`s is missing from the database, or a payment exists for a `rentalPeriod` but is less than the expected full rent amount for that period. (Note: Based on current system where absence = unpaid, the primary indicator is the *absence* of a full rent payment record for a specific `rentalPeriod`).
* **Rent in Arrears:** The practice where rent for a given period (e.g., January) is due and paid in the subsequent period (e.g., February).
* **Active Lease:** A lease agreement associated with a unit where the boolean field `active` is set to `true`. This indicates current occupancy and expected rent payment, regardless of the original lease `end_date`.
* **Rental Period:** The specific calendar month and year for which a rent payment is intended, as indicated by the `rentalPeriod` field on a payment document.
* **Aggregate View:** A dashboard display mode showing consolidated data across all properties managed by the landlord.
* **Property View:** A dashboard display mode showing data filtered specifically for a single selected property (e.g., a building).

---

## 3. Requirements

### 3.1 Functional Requirements

#### 3.1.1 Display of Delinquent Units (Aggregate View)
* The dashboard shall include a new section (card on desktop, tab on mobile) titled "Delinquent Units".
* In the Aggregate View, this section shall display the total count of delinquent units across the landlord's entire portfolio.
* It shall also display the total sum of rent behind for all delinquent units (calculated as per Requirement 3.1.6).
* A list or table view shall show each delinquent unit, indicating the property name, unit number, the number of delinquent months, and the total rent behind for that specific unit.

#### 3.1.2 Display of Delinquent Units (Property View)
* When the user selects a specific property using the toggle/dropdown, the "Delinquent Units" section shall update to display data filtered only for units within that selected property.
* The section shall show the count of delinquent units within the selected property.
* It shall display the total sum of rent behind for the delinquent units within the selected property.
* The list or table view shall show only the delinquent units belonging to the selected property, with details as in the Aggregate View (unit number, number of delinquent months, total rent behind for that unit).

#### 3.1.3 Delinquency Calculation Logic (Core)
* For each unit associated with the landlord:
    * Check if the unit has an `active` lease (i.e., the `active` boolean field on the associated lease document is `true`).
    * If there is no active lease, the unit is considered vacant and should be excluded from delinquency checks.
    * If there is an active lease, determine the period of expected occupancy based on the lease's `start_date` up to the current month, inclusive. For leases that have expired but are marked `active` (indicating month-to-month), the expected occupancy period extends from the `start_date` through the current month.
    * Identify the months within this expected occupancy period for which a `Rent Payment` document should exist, considering the "Rent in Arrears" rule (see Requirement 3.1.4).
    * For each identified month where a `Rent Payment` is expected, check the database for a payment document for that specific unit and that specific `rentalPeriod` with `paymentType` equal to `Rent Payment`.
    * **CRITICAL LOGIC:** A unit is delinquent if, for any month within the expected occupancy period (adjusted for arrears and the hard stop), there is *no* `Rent Payment` document found for that unit and the corresponding `rentalPeriod`, **OR** a `RentPayment` document exists for that `unitId` and `rentalPeriod` but its `actualRentPaid` is less than the `lease.rentAmount` for the active lease.
    * Compile a list of the specific `rentalPeriod`s (months) for which the unit is delinquent, noting for each period whether it was `unpaid` or `shortpaid`, and the amount of any shortfall.

#### 3.1.4 Handling Rent Arrears in Calculation
* **CRITICAL LOGIC:** When checking for delinquency for a given `rentalPeriod` (Month Y), the system must check for a `Rent Payment` document with the `rentalPeriod` field set to Month Y. However, due to rent in arrears, the *absence* of this payment should only flag delinquency if the current month is *two months or more* past Month Y.
    * Example: To check for delinquency for January 2025 rent (`rentalPeriod` = Jan 2025), the system should only consider this delinquent if the current date is March 1, 2025, or later, AND no `Rent Payment` document exists for the unit with `rentalPeriod` = Jan 2025. Rent due for January (expected in February) is considered delinquent only if not received by the end of February.

#### 3.1.5 Applying the Historical Data Hard Stop (March 2025)
* **CRITICAL LOGIC:** The delinquency calculation must **not** check for or report on expected rent payments for any `rentalPeriod` prior to March 2025, regardless of the lease start date. The earliest `rentalPeriod` to be considered for delinquency is March 2025.
    * Example: If a lease started in January 2025, the system should only look for missing `Rent Payment` documents with `rentalPeriod` from March 2025 onwards, applying the arrears logic. Missing payments for `rentalPeriod`s Jan 2025 or Feb 2025 should not be flagged as delinquent because data before March 2025 is not available.

#### 3.1.6 Calculating Total Rent Behind
* For each delinquent unit, the total rent behind shall be calculated by summing:
    * The full `rentAmount` specified on the unit's *active lease* document for each month identified as `unpaid` for that unit.
    * The difference between the `lease.rentAmount` and the `actualRentPaid` (the shortfall) for each month identified as `shortpaid` for that unit.
    * Example: If a unit with an `active` lease stating a `rentAmount` of $1000 is found to be `unpaid` for March 2025, and `shortpaid` for May 2025 (paid $600 instead of $1000), the total rent behind for that unit is $1000 (for March) + $400 (for May shortfall) = $1400.

#### 3.1.7 Filtering by Property
* The system must use the property selected via the dashboard toggle/dropdown to filter the units considered for the delinquency calculation and display.
* **CRITICAL LOGIC:** The database query or data processing logic should be context-aware of the selected property ID (or lack thereof for the Aggregate View) to ensure only relevant units and their associated leases and payments are considered. For the Property View, the search for units, leases, and payments should be constrained by the selected property ID. For the Aggregate View, this constraint is not applied.

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance
* The initial loading of the Delinquent Units section in the Aggregate View should be reasonably performant (acknowledging it may take a moment due to data volume).
* Switching between the Aggregate View and a Property View using the toggle/dropdown should be very fast, with no noticeable loading state. This suggests that data for all properties might be loaded initially in the Aggregate View and then filtered client-side for the Property View, or that the property-specific query is highly optimized.

#### 3.2.2 UI/UX Consistency
* The design and layout of the new Delinquent Units section (card/tab) must align with the existing Rent Collection Status and Lease Expiry Status sections for a cohesive look and feel across desktop and mobile views.

#### 3.2.3 Data Accuracy
* The delinquency calculations and displayed information must accurately reflect the data in the database based on the defined logic, arrears rule, and historical data hard stop.

---

## 4. Design Considerations

### 4.1 Dashboard Integration (Card/Tab)
* Integrate the Delinquent Units feature as a new card on the desktop dashboard layout.
* Implement it as a new tab within the mobile dashboard's tab component.

### 4.2 Toggle/Dropdown Functionality
* Ensure the existing Aggregate/Property Specific toggle or dropdown at the top of the dashboard correctly controls the data displayed in the Delinquent Units section, applying the filtering logic defined in Requirement 3.1.7.

### 4.3 Information Display
* Within the Delinquent Units section, clearly display:
    * The count of delinquent units.
    * The total rent behind (calculated as per updated 3.1.6).
    * A detailed breakdown per delinquent unit, including property (in aggregate view), unit number, tenant name, the total rent behind for that unit, and the number of delinquent months.
    * For each delinquent month/period within a unit's details:
        * The rental period (e.g., "YYYY-MM").
        * The status: "Unpaid" or "Short-paid".
        * If "Unpaid": The full rent amount due for that period.
        * If "Short-paid": The full rent amount due, the amount paid, and the calculated shortfall for that period.

---

## 5. Data Model 

The implementation will primarily interact with the following data structures (conceptual):

* **Units:** Corresponds to the `RentalInventory` Firestore collection.
    *   Relevant `RentalInventory` fields:
        *   `id` (string): Document ID, used as `unitId`.
        *   `unitNumber` (string): Human-readable unit identifier.
        *   `groupName` (string, optional): Name of the property group the unit belongs to. This links a unit to a "Property".
* **Properties:** Corresponds to the `PropertyGroup` Firestore collection.
    *   Relevant `PropertyGroup` fields:
        *   `id` (string): Document ID.
        *   `groupName` (string): Name of the property (e.g., building name).
* **Leases:** Corresponds to the `Lease` Firestore collection.
    *   Relevant `Lease` fields:
        *   `id` (string): Document ID.
        *   `landlordId` (string): Identifier for the landlord.
        *   `unitId` (string): Foreign key linking to the `RentalInventory` (Unit).
        *   `leaseStartDate` (Date): The start date of the lease.
        *   `leaseEndDate` (Date): The end date of the lease.
        *   `isActive` (boolean): Critical field to determine if a lease is currently active, especially for month-to-month scenarios beyond `leaseEndDate`.
        *   `rentAmount` (number): The monthly rent amount due as per the lease.
* **Payments:** Corresponds to the `RentPayment` Firestore collection.
    *   Relevant `RentPayment` fields:
        *   `id` (string): Document ID.
        *   `leaseId` (string): Foreign key linking to the `Lease`.
        *   `unitId` (string): Foreign key linking to the `RentalInventory` (Unit).
        *   `actualRentPaid` (number): The amount of rent actually paid.
        *   `paymentType` (string): Must be "Rent Payment" to be considered for delinquency.
        *   `rentalPeriod` (string): The month and year (format "YYYY-MM") for which the payment is made.

---

## 6. Firestore Functions 

* **Existing Functions:**
    *   `getAllActiveLeases(landlordId: string)`: To fetch all leases where `isActive` is true for the given landlord. This is the primary source of leases to check for delinquency (PRD 3.1.3).
    *   `getAllPayments(landlordId: string)` (also aliased as `getAllRentPayments`): To fetch all payment records for the landlord. These will be filtered by `paymentType: "Rent Payment"` and matched against `rentalPeriod`s (PRD 3.1.3).
    *   `getAllRentalInventory(landlordId: string)`: To retrieve `unitNumber` for display and `groupName` for associating units with properties/property groups (PRD 3.1.1, 3.1.2, 3.1.7).
    *   `getAllPropertyGroups(landlordId: string)`: To fetch property group details (e.g., `groupName` for display) and to enable filtering by property if a `propertyGroupId` is provided for the Property View (PRD 3.1.2, 3.1.7).

* **New Functions Implemented:**

    *   **`getDelinquentUnitsForDashboard(landlordId: string, currentSystemDate: Date, propertyGroupId?: string): Promise<DelinquencyDashboardData>`**
        *   **Status: IMPLEMENTED**
        *   **Purpose:** This function is the main backend utility that gathers all necessary data and computes the delinquency information as per the detailed PRD requirements for the dashboard.
        *   **Parameters:**
            *   `landlordId: string`: The ID of the landlord.
            *   `currentSystemDate: Date`: The current date, used to determine the "current month" for arrears calculations. This provides flexibility for analysis and testing.
            *   `propertyGroupId?: string` (optional): If provided, filters results for a specific property group (for "Property View"). If omitted, calculates for all properties ("Aggregate View").
        *   **Returns:** `Promise<DelinquencyDashboardData>`, with a structure like:
            ```typescript
            interface DelinquentPeriodDetail {
              rentalPeriod: string;
              status: 'unpaid' | 'shortpaid';
              amountDue: number;        // Full lease.rentAmount for this period
              amountPaid?: number;       // Actual amount paid if status is 'shortpaid'
              amountShort?: number;      // Calculated shortfall if status is 'shortpaid' (amountDue - amountPaid)
            }

            interface DelinquentUnitDisplayInfo {
              unitId: string;
              leaseId: string;
              unitNumber: string;
              propertyName: string; // From PropertyGroup or RentalInventory.groupName
              activeLeaseRentAmount: number; // rentAmount from the active lease
              delinquentDetails: DelinquentPeriodDetail[]; // List of detailed delinquent periods
              numberOfDelinquentMonths: number;
              totalRentBehindForUnit: number; // Sum of (amountDue for 'unpaid' OR amountShort for 'shortpaid')
              tenantName: string; // For display purposes
            }

            interface DelinquencyDashboardData {
              totalDelinquentUnitsCount: number;
              grandTotalRentBehind: number;
              units: DelinquentUnitDisplayInfo[]; // Sorted as needed for display
            }
            ```
        *   **Core Logic Implemented:**
            1.  Determines the current month string (e.g., "YYYY-MM") from `currentSystemDate`.
            2.  Fetches all data: Calls `getAllActiveLeases`, `getAllPayments`, `getAllRentalInventory`, and `getAllPropertyGroups` for the `landlordId`.
            3.  Filters `RentalInventory` by `propertyGroupId` if provided. Then filters active leases to include only those associated with the filtered inventory. If no `propertyGroupId`, uses all active leases.
            4.  Iterates through each relevant `activeLease`:
                a.  Identifies the range of `rentalPeriod`s to check for delinquency: from `max(lease.leaseStartDate, March_1_2025)` up to the month *immediately preceding* the current month derived from `currentSystemDate`.
                b.  For each `rentalPeriod` in this range:
                    i.  **Applies Arrears Logic (PRD 3.1.4):** A `rentalPeriod` is only considered for delinquency if `currentSystemDate` is on or after the first day of the month that is *two months after* the `rentalPeriod`.
                    ii. **Applies Historical Hard Stop (PRD 3.1.5):** Ensures `rentalPeriod` is March 2025 or later.
                    iii. **Checks for Delinquency (PRD 3.1.3):** Queries the fetched payments. The unit is delinquent for this `rentalPeriod` if:
                        *   No `RentPayment` document exists for this `unitId` and `rentalPeriod` with `paymentType: "Rent Payment"` (status: `unpaid`).
                        *   OR, a `RentPayment` document exists, but its `actualRentPaid` is less than the `lease.rentAmount` (status: `shortpaid`).
                c.  If the unit is found delinquent for one or more `rentalPeriod`s, compiles the list of these `DelinquentPeriodDetail` objects. Calculates `totalRentBehindForUnit` by summing `lease.rentAmount` for each `unpaid` `rentalPeriod` and the `amountShort` for each `shortpaid` `rentalPeriod` (PRD 3.1.6).
                d.  Stores details for display (unit number, property name, delinquent details, total behind, etc.).
            5.  Aggregates results: Sums counts and total amounts to populate `DelinquencyDashboardData`.
            6.  Sorts the resulting list of delinquent units for consistent display.

---

## 7. Future Considerations

* **Partial Payments:** While the current logic treats the absence of a full `Rent Payment` document for a `rentalPeriod` as delinquency, a future enhancement could explicitly handle cases where a `Rent Payment` document exists for a `rentalPeriod` but the `amount` is less than the expected `rentAmount` from the lease. This would require comparing the payment amount to the lease rent amount in the delinquency check.

---

## 8. Next Steps for Feature Completion

1.  **Data Fetching Integration in Frontend Component:**
    *   **Done** In the new frontend component/page for the "Delinquent Units" dashboard section, import the `getDelinquentUnitsForDashboard` utility function from `src/lib/firebase/firestoreUtils.ts`. (Already imported)
    *   **Done** Use React hooks (`useEffect`, `useState`, `useCallback` as per existing patterns in files like `src/app/dashboard/page.tsx`) to call `getDelinquentUnitsForDashboard`. (Placeholder data removed, actual function call implemented using `selectedPropertyGroupId` from the new dropdown).
    *   **Done** Pass the necessary `landlordId`, `currentSystemDate` (this can be `new Date()` generated on the client or passed consistently), and the optional `propertyGroupId` (from the dashboard's property selection toggle/dropdown) to the function. (`selectedPropertyGroupId` state is connected and correctly passed as `propertyGroupId`).
    *   **Done** Manage loading and error states during the data fetching process. (Basic loading/error state management maintained and improved for the delinquent units section).

2.  **Frontend UI Development (Dashboard Card/Tab):**
    *   **COMPLETED (Initial Structure):** Design and implement the new "Delinquent Units" card/tab on the dashboard UI as per PRD 3.1.1, 3.1.2, and 4.1. The card is positioned centrally on desktop (3-column layout) and as the middle tab on mobile (3-tab layout).
    *   **COMPLETED (Initial Structure):** Ensure UI/UX consistency with existing dashboard elements (PRD 3.2.2). Card structure, scroll areas, and placeholder content adhere to existing patterns.
    *   **NEW (UI Implemented):** Implemented the property group filter dropdown next to the dashboard title, populated with property groups fetched from Firestore. The dashboard title and filter are now within a styled Card.

3.  **Data Display (Frontend):**
    *   Once data is successfully fetched into the component's state, display it as required:
        *   **Done** Total count of delinquent units. (Display implemented with actual data).
        *   **Done** Grand total rent behind. (Display implemented with actual data reflecting updated calculation logic).
        *   **Done** A list view through individual cards for each delinquent unit, displaying property name, unit number, tenant name, total rent behind for unit, and number of delinquent months. For each delinquent period within a unit, display its status (unpaid/short-paid), amount due, amount paid (if short-paid), and shortfall (if short-paid), consistent with PRD 4.3. (Display implemented with actual data, styled nested cards, and detailed period breakdown).
    *   **Done** Connect the `selectedPropertyGroupId` state (from the new dropdown) to the `fetchDelinquentUnits` (or `getDelinquentUnitsForDashboard`) function call. When the Aggregate/Property Specific dropdown changes (PRD 4.2), re-fetch data by calling `getDelinquentUnitsForDashboard` again with the appropriate `propertyGroupId` (or `undefined` for aggregate view - "all" value in dropdown). (Re-fetching on dropdown change is implemented).

### Remaining Tasks Checklist:

- [ ] **Data Fetching Optimization:**
    - [ ] Consider a better data fetching structure when the `propertyGroupId` state changes - ideally no new data should be called, only filtering of the existing comprehensive data for the specific property (see end of PRD section 3.2.1 & 8.3).
- [ ] **Testing:**
    - [ ] **Unit Tests:** Write unit tests for the `getDelinquentUnitsForDashboard` function in `firestoreUtils.ts` (as previously outlined, covering various scenarios like arrears, hard stop, partial payments, property filtering, edge cases).
    - [ ] **Component Tests (Frontend):**
        - [ ] Test the React component responsible for displaying the delinquent units with actual data.
        - [ ] Mock the `getDelinquentUnitsForDashboard` function to provide various data responses (empty, single/multiple delinquencies, errors) and verify the component renders correctly.
        - [ ] Test UI interactions, such as the property filter changing and triggering a re-fetch (with mocked function calls), and verify the data displayed updates correctly.
    - [ ] **End-to-End (E2E) Tests (Optional but Recommended):** If your project has an E2E testing setup, create tests to simulate user interaction with the live dashboard to verify:
        - [ ] Correct data display in aggregate and property-specific views against a test dataset in Firebase when the new property filter is used.
        - [ ] Correct filtering when property selection changes via the new dropdown.
- [ ] **Performance Review:**
    - [ ] Assess the performance of `getDelinquentUnitsForDashboard` with representative data amounts (PRD 3.2.1), especially when filtering by property group.
    - [ ] Evaluate frontend rendering performance, especially when the list of delinquent units is long or when switching between aggregate and property views using the new dropdown.
- [ ] **Code Review and Refinement:**
    - [ ] Conduct thorough code reviews for both the utility function and the frontend component changes, especially the integration of the property filter and data fetching logic.
    - [ ] Refine code for clarity, efficiency, and adherence to coding standards.
- [ ] **Documentation Update (if any further changes):**
    - [ ] Update any relevant internal documentation if the implementation details change significantly from this plan.


