# Analytics Dashboard (Historical Implementation Summary)

## Proposed Metrics for Enhanced Analytics Dashboard

This section outlines key metrics, their calculation methods, the Firestore functions (existing or new) required for their implementation, and their importance for landlords. These metrics aim to provide a comprehensive view of portfolio performance.

### I. Occupancy and Vacancy Metrics

1.  **Overall Occupancy Rate**
    *   **Description:** Percentage of rental units that are currently occupied.
    *   **Formula:** `(Number of Occupied Units / Total Number of Rental Units) * 100`
    *   **Implementation:**
        *   `totalUnits`: Count from `getAllRentalInventory(landlordId)`.
        *   `occupiedUnits`: Count from `getAllActiveLeases(landlordId)`.
    *   **Importance:** A fundamental indicator of portfolio health and income generation potential. Tracking trends helps identify leasing successes or challenges.

2.  **Vacancy Rate**
    *   **Description:** Percentage of rental units that are currently vacant.
    *   **Formula:** `(Number of Vacant Units / Total Number of Rental Units) * 100` or `100 - Occupancy Rate`.
    *   **Implementation:**
        *   `totalUnits`: From `getAllRentalInventory(landlordId)`.
        *   `occupiedUnits`: From `getAllActiveLeases(landlordId)`.
        *   `vacantUnits = totalUnits - occupiedUnits`.
    *   **Importance:** Highlights non-income-generating units. Consistently high vacancy can signal issues with pricing, unit condition, or market demand.

3.  **Average Vacancy Duration**
    *   **Description:** Average number of days units remain vacant between leases.
    *   **Formula:** Average of (Start Date of New Lease for Unit X - End Date of Previous Lease for Unit X) over a period.
    *   **Implementation:**
        *   Requires analyzing historical lease data.
        *   **Functions:** `getAllLeases(landlordId)`, `getAllRentalInventory(landlordId)`.
        *   **Logic:** For each unit, sort leases by end date. Calculate gaps between lease end and next lease start. Average these gaps. The `groupLeasesByProperty` function already calculates current `daysVacant` for *currently vacant* units, which is a good starting point for a snapshot. A historical average needs more processing.
        *   *(Consider New Function: `calculateAverageHistoricalVacancyDuration(landlordId, period)`)*
    *   **Importance:** Measures leasing efficiency and market desirability. Shorter durations improve cash flow and reduce holding costs.

### II. Financial Performance Metrics

1.  **Gross Potential Rent (GPR)**
    *   **Description:** Total expected monthly rent if all units were occupied at their current lease or estimated market rent.
    *   **Formula:** Sum of (rent amount for occupied units + potential rent for vacant units).
    *   **Implementation:**
        *   Occupied units: Sum `rentAmount` from `getAllActiveLeases(landlordId)`.
        *   Vacant units: For each vacant unit (from `getAllRentalInventory` not in `getAllActiveLeases`), estimate potential rent (e.g., last lease's rent via `getAllLeases`, or an average).
    *   **Importance:** Theoretical maximum rental income, serving as a benchmark for actual performance.

2.  **Actual Monthly Revenue (Collected Rent)**
    *   **Description:** Total rent actually collected in a given month.
    *   **Formula:** Sum of `paymentAmount` for 'Rent Payment' type within the target month.
    *   **Implementation:**
        *   `getAllPayments(landlordId)`: Filter by `paymentDate` (for the month) and `paymentType`.
    *   **Importance:** Reflects the actual cash inflow, crucial for financial planning and operations.

3.  **Monthly Rent Collection Rate**
    *   **Description:** Percentage of expected rent that was actually collected for a given month.
    *   **Formula:** `(Actual Collected Rent for Month / Expected Rent for Month) * 100`.
    *   **Implementation:**
        *   `Actual Collected Rent`: As above.
        *   `Expected Rent for Month`: Sum of `rentAmount` for all leases active during that specific month. (Filter `getAllLeases` for leases active in the month, or use `getAllActiveLeases` and sum rent for those falling in `currentMonth` based on `getRentCollectionStatus` logic).
        *   Leverage `getRentCollectionStatus(activeLeases, rentPayments, currentMonth)` where `Expected Rent = (Sum of payments made) + totalPendingAmount`.
    *   **Importance:** Measures collection efficiency. Low rates indicate problems with tenants' ability to pay or collection processes.

4.  **Delinquency Rate (by Amount and Unit Count)**
    *   **Description:** Rent that is overdue, expressed as a monetary value and as a percentage of units.
    *   **Formula (Amount):** `(Total Overdue Rent / Expected Rent for Month) * 100`.
    *   **Formula (Units):** `(Number of Units with Overdue Rent / Total Occupied Units) * 100`.
    *   **Implementation:**
        *   Use `getRentCollectionStatus(activeLeases, rentPayments, currentMonth)`.
        *   `Total Overdue Rent`: `totalPendingAmount`.
        *   `Number of Units with Overdue Rent`: `unpaid` count.
        *   `Total Occupied Units`: `paid + unpaid` count.
    *   **Importance:** Key indicator of payment issues and potential bad debt. Helps prioritize collection efforts.

5.  **Average Rent per Occupied Unit**
    *   **Description:** Average monthly rent generated by occupied units.
    *   **Formula:** `(Total Monthly Rent from Active Leases / Number of Occupied Units)`.
    *   **Implementation:**
        *   `Total Monthly Rent`: Sum `rentAmount` from `getAllActiveLeases(landlordId)`.
        *   `Number of Occupied Units`: Count of leases from `getAllActiveLeases(landlordId)`.
    *   **Importance:** Provides a benchmark for rental income. Useful for comparing across different unit types or property groups and for pricing strategies.

6.  **Foregone Rent (Economic Vacancy Loss)**
    *   **Description:** Estimated rental income lost due to vacant units.
    *   **Formula:** Sum of (potential monthly rent for each vacant unit).
    *   **Implementation:**
        *   Identify vacant units (`getAllRentalInventory` minus `getAllActiveLeases`).
        *   For each vacant unit, estimate its potential rent (e.g., using its last lease rent from `getAllLeases`, or an average for similar units). The historical dashboard used average rent of active leases.
        *   `groupLeasesByProperty` can provide `daysVacant` for currently vacant units, which can be multiplied by a daily potential rent for a more dynamic calculation.
    *   **Importance:** Quantifies the direct financial impact of vacancies, emphasizing the need to fill them quickly.

### III. Leasing and Portfolio Metrics

1.  **Leases Expiring Soon (Count & Total Value)**
    *   **Description:** Number of active leases due to expire within a defined future period (e.g., 30, 60, 90 days) and their combined monthly rental value.
    *   **Implementation:**
        *   Directly use `getLeaseExpirations(activeLeases, daysThreshold)`. The function returns `count` and `totalLeaseValue`.
        *   `activeLeases` obtained from `getAllActiveLeases(landlordId)`.
    *   **Importance:** Enables proactive lease renewal management and marketing efforts for units that will become vacant, minimizing downtime.

2.  **Unit Turnover Rate**
    *   **Description:** Percentage of units that had a tenant move out during a specific period.
    *   **Formula:** `(Number of Move-Outs in Period / Average Total Number of Units in Period) * 100`.
    *   **Implementation:**
        *   `Number of Move-Outs`: Count leases from `getAllLeases(landlordId)` where `endDate` falls within the specified period.
        *   `Average Total Number of Units`: Count from `getAllRentalInventory(landlordId)`.
        *   *(Consider New Function: `calculateTurnoverRate(landlordId, period)`)*
    *   **Importance:** High turnover is costly (make-ready, marketing, vacancy). This metric can indicate tenant satisfaction, competitiveness of rental offerings, or market conditions.

3.  **Portfolio Performance by Property Group**
    *   **Description:** Key metrics (e.g., Occupancy Rate, Collected Rent, Collection Rate, Average Rent) segmented by defined property groups.
    *   **Implementation:**
        *   Utilize `groupLeasesByProperty(leases, rentalInventory, propertyGroups)` as a foundational function. This groups units and provides some initial data.
        *   For each property group, further calculate the desired metrics by filtering leases (`getAllLeases`), payments (`getAllPayments`), and inventory (`getAllRentalInventory`) related to the units within that group.
        *   Requires `getAllPropertyGroups(landlordId)`.
    *   **Importance:** Allows landlords to compare performance across different segments of their portfolio, identify strong/weak areas, and make targeted management decisions.

### IV. Time-Based Analysis and Visualizations

*   **Trend Analysis:** All the above metrics should be trackable over time (e.g., monthly, quarterly, annually). This will require fetching data within specific date ranges or processing comprehensive datasets to aggregate by period.
*   **Visualizations:** Utilize charts (line, bar, pie) and summary cards for intuitive presentation of these metrics, similar to the historical dashboard.
*   **Filtering:** Allow users to filter analytics by:
    *   **Time Range:** (e.g., 3 months, 6 months, 1 year, custom range, all time).
    *   **Property Group:** To view metrics for specific groups or the entire portfolio.

This list provides a robust set of metrics. The implementation will rely heavily on the existing `firestoreUtils.ts` functions, with potential for a few new helper functions for more complex temporal calculations like historical vacancy duration or turnover rates. The key is to aggregate and present this data in a way that offers actionable insights to landlords.

---------------------------------------------------------------------------


## Property Level Analysis Build-Out

### Vision & Goals

To create an intuitive and powerful analytics section focused on property-level performance. Landlords should be able to quickly assess the health of each property group regarding occupancy, financial returns (rent collected), and delinquencies, with the ability to drill down into specifics for actionable insights. The dashboard will initially focus on data from March of the current year onwards.

### Dashboard Layout & Design Principles

1.  **Overall Structure: Property Group Cards**
    *   The main view will display a series of "Property Group Cards," one for each group defined by the landlord (e.g., "Downtown Condos," "Suburban Homes," "Default Group").
    *   These cards will be arranged in a clean, scrollable list or grid.
    *   Each card will provide a snapshot of key metrics for that property group for a selected month and Year-to-Date (YTD).

2.  **Selected Month Context:**
    *   A global month/year selector (defaulting to the last fully completed month, e.g., if it's mid-April, it defaults to March) will control the "Monthly" metrics displayed on all cards. The earliest selectable month will be March of the current year.
    *   YTD calculations will always run from March of the current year to the selected month.

3.  **Visual Elements & Information Hierarchy (per Card):**
    *   **Card Header:** Property Group Name (e.g., "Downtown Condos").
    *   **Key Metrics Display:**
        *   **Monthly Occupancy (for selected month):** Displayed prominently (e.g., "95% Occupied"). Optionally, a mini-trend line showing occupancy for the last 3-6 months (since March) could be embedded.
        *   **Monthly Rent Collected (for selected month):** Clear currency value (e.g., "$15,500 Collected").
        *   **YTD Rent Collected (March to selected month):** Clear currency value (e.g., "$45,000 YTD").
        *   **Delinquency Rate (for selected month):** Percentage (e.g., "5% Delinquent") with a visual indicator (e.g., color-coded: green for low, yellow for medium, red for high).
    *   **Actionable Drill-Down:** A "View Details" button or icon on each card to access more granular information for that property group. Clicking the delinquency rate could directly open the delinquent units view.

4.  **Scalability & Future Expansion:**
    *   The card-based design is inherently scalable for an increasing number of property groups.
    *   For future metrics: Cards can accommodate more data points, or a "summary/detailed" toggle per card could be introduced.
    *   The "View Details" action can navigate to a more comprehensive page for that property group, allowing for more charts, tables, and unit-level data without cluttering the main dashboard. This master-detail pattern is robust.

5.  **Modern Look & Feel:**
    *   Clean typography, ample whitespace, and a consistent visual language.
    *   Interactive elements should provide clear feedback (hovers, clicks).
    *   The design should be responsive, adapting well to various screen sizes.

### Data Presentation & Metrics (per Property Group Card)

For each property group, and based on the globally selected `targetMonthYear` (e.g., "2024-04"):

1.  **Monthly Occupancy (End-of-Month for `targetMonthYear`)**
    *   **Calculation:** `(Number of Occupied Units in Group at end of targetMonthYear / Total Units in Group) * 100`
    *   **Display:** "XX% Occupied"
    *   **Insight:** Immediate understanding of how full the property group is for the chosen month.

2.  **Monthly Rent Collected (for `targetMonthYear`)**
    *   **Calculation:** Sum of all `RentPayment` amounts for leases within the property group where `paymentDate` falls within `targetMonthYear`.
    *   **Display:** "$X,XXX Collected"
    *   **Insight:** Actual cash flow generated by the group for the month.

3.  **Year-to-Date (YTD) Rent Collected (March YYYY to `targetMonthYear`)**
    *   **Calculation:** Sum of all `RentPayment` amounts for leases within the property group where `paymentDate` is between March 1st of the current year and the end of `targetMonthYear`.
    *   **Display:** "$Y,YYY YTD"
    *   **Insight:** Cumulative financial performance of the group for the current operational year (since app launch).

4.  **Delinquency Rate & Drill-Down (for `targetMonthYear`)**
    *   **Calculation:**
        *   `Expected Rent for Group`: Sum of `rentAmount` for all active leases in the group during `targetMonthYear`.
        *   `Collected Rent for Group`: As calculated for "Monthly Rent Collected."
        *   `Delinquency Rate = ((Expected Rent - Collected Rent) / Expected Rent) * 100` (if Expected > 0).
    *   **Display:** "Z% Delinquent" (with color coding).
    *   **Insight:** Highlights payment issues.
    *   **Drill-Down (on click/View Details):**
        *   A modal or expanded section showing a list of delinquent units within that property group:
            *   Unit Number
            *   Tenant Name (from Lease)
            *   Lease Rent Amount
            *   Amount Paid (for `targetMonthYear`)
            *   Amount Due (for `targetMonthYear`)
            *   Lease End Date

### Implementation Plan

1.  **Core Data Structure for Display (per Property Group):**
    ```typescript
    interface PropertyGroupMonthlyAnalytics {
        propertyGroupId: string;
        propertyGroupName: string;
        totalUnitsInGroup: number;
        selectedMonth: string; // e.g., "2024-03"
        monthlyOccupancyRate: number | null; // Percentage
        monthlyRentCollected: number;
        ytdRentCollected: number; // From March YYYY to selectedMonth
        monthlyDelinquencyRate: number | null; // Percentage
        delinquentUnits: Array<{
            unitId: string;
            unitNumber: string;
            tenantName?: string;
            leaseRentAmount: number;
            amountPaidThisMonth: number;
            amountDueThisMonth: number;
            leaseEndDate?: Date;
        }>;
        // Optional: For mini trend charts
        // historicalMonthlyOccupancy: Array<{ month: string, rate: number }>;
    }
    ```

2.  **Main Orchestration Logic (e.g., in a custom React hook `usePropertyAnalytics` or a service):**
    *   Input: `landlordId`, `targetMonthYear` (e.g., "YYYY-MM").
    *   Step 1: Fetch all necessary raw data:
        *   `propertyGroups = await getAllPropertyGroups(landlordId)`
        *   `allInventory = await getAllRentalInventory(landlordId)`
        *   `allLeases = await getAllLeases(landlordId)` (ensure leases have populated `unitId`, `startDate`, `endDate`, `rentAmount`)
        *   `allPayments = await getAllPayments(landlordId)` (ensure payments have `leaseId`, `paymentDate`, `paymentAmount`)
    *   Step 2: Process data for each property group:
        *   Iterate through `propertyGroups`. For each `group`:
            *   Filter `allInventory` to get `unitsInGroup = allInventory.filter(inv => inv.propertyGroupId === group.id)`.
            *   `totalUnitsInGroup = unitsInGroup.length`.
            *   `unitIdsInGroup = unitsInGroup.map(u => u.id)`.
            *   Filter `allLeases` to get `leasesInGroup = allLeases.filter(lease => unitIdsInGroup.includes(lease.unitId))`.
            *   **Calculate Monthly Occupancy:**
                *   `activeLeasesForMonthEnd = leasesInGroup.filter(lease => isLeaseActiveAtMonthEnd(lease, targetMonthYear))`.
                *   `monthlyOccupancyRate = totalUnitsInGroup > 0 ? (activeLeasesForMonthEnd.length / totalUnitsInGroup) * 100 : null`.
            *   **Calculate Monthly Rent Collected:**
                *   `paymentsThisMonthForGroup = filterPaymentsForPeriod(allPayments, leasesInGroup.map(l => l.id), targetMonthYear)`.
                *   `monthlyRentCollected = sumPayments(paymentsThisMonthForGroup)`.
            *   **Calculate YTD Rent Collected:**
                *   `paymentsYTDForGroup = filterPaymentsForPeriod(allPayments, leasesInGroup.map(l => l.id), "YYYY-03", targetMonthYear)`. // YYYY is current year
                *   `ytdRentCollected = sumPayments(paymentsYTDForGroup)`.
            *   **Calculate Delinquency:**
                *   `activeLeasesForMonth = leasesInGroup.filter(lease => isLeaseActiveDuringMonth(lease, targetMonthYear))`.
                *   `expectedRentThisMonth = activeLeasesForMonth.reduce((sum, lease) => sum + lease.rentAmount, 0)`.
                *   `collectedRentThisMonth = monthlyRentCollected`.
                *   `monthlyDelinquencyRate = expectedRentThisMonth > 0 ? ((expectedRentThisMonth - collectedRentThisMonth) / expectedRentThisMonth) * 100 : null`.
                *   `delinquentUnits = identifyDelinquentUnits(activeLeasesForMonth, paymentsThisMonthForGroup)`.
            *   Store/return these metrics for the group.

3.  **Existing Firestore Functions to Leverage:**
    *   `getAllPropertyGroups(landlordId)`: To get the list of groups.
    *   `getAllRentalInventory(landlordId)`: To get all units and identify units per group.
    *   `getAllLeases(landlordId)`: For occupancy, expected rent, and linking payments.
    *   `getAllPayments(landlordId)`: For collected rent.
    *   The principles from `groupLeasesByProperty` are relevant for associating leases and units with property groups, though we'll need more specific date-based filtering here.

4.  **New Helper Functions/Logic (could be within the main orchestration logic or separate utility functions):**
    *   `isLeaseActiveAtMonthEnd(lease: Lease, targetMonthYear: string): boolean`: Checks if lease `startDate` <= month-end of `targetMonthYear` AND `endDate` >= month-end of `targetMonthYear`.
    *   `isLeaseActiveDuringMonth(lease: Lease, targetMonthYear: string): boolean`: Checks if the lease period overlaps with any part of `targetMonthYear`.
    *   `filterPaymentsForPeriod(allPayments: RentPayment[], targetLeaseIds: string[], startMonthYear: string, endMonthYear?: string): RentPayment[]`: Filters payments for specific leases within a given month or date range.
    *   `sumPayments(payments: RentPayment[]): number`: Sums `paymentAmount`.
    *   `identifyDelinquentUnits(activeLeases: Lease[], paymentsForMonth: RentPayment[]): DelinquentUnitInfo[]`: Compares expected rent from leases to actual payments made for those leases for the month, and lists discrepancies.

5.  **Data Flow for Drill-Down to Property Group Details:**
    *   When "View Details" is clicked for a property group card, the UI can either:
        *   Navigate to a new route (e.g., `/analytics/property-group/{groupId}?month={targetMonthYear}`). This page would then fetch/calculate more detailed data for that specific group (e.g., unit-by-unit breakdown, historical charts for that group only).
        *   Expand a section or open a modal, passing the `PropertyGroupMonthlyAnalytics` object and potentially fetching more detailed unit-level lease/payment history for that specific group if not already loaded.

### Addressing Real Estate Expert & UI Design Expert Perspectives

*   **Real Estate Value:**
    *   The focus on *actionable* metrics (delinquency with unit details, occupancy trends) is key.
    *   YTD figures provide a good performance overview.
    *   The ability to see performance *per property group* allows for targeted management strategies.
    *   Tracking from March provides a clear baseline for the app's usage period.
*   **UI/UX Effectiveness:**
    *   **Clarity:** Metrics should be unambiguous. Use clear labels and consistent formatting.
    *   **Simplicity:** Avoid overwhelming the user. The main dashboard gives a high-level summary. Details are available on demand.
    *   **Elegance & Modernity:** Use of space, typography, and subtle animations can enhance the feel. `recharts` or a similar library can be used for any mini-trends or future detailed charts.
    *   **Completeness (for this phase):** This design covers the requested metrics (occupancy, rent collected MTD/YTD, delinquency) at the property group level effectively.



--------------------------------------------------------------------------


## Phased Implementation Plan for Property Level Analytics

This plan breaks down the development of the Property Level Analytics dashboard into three distinct phases. Each phase is designed to be implementable independently and chronologically, leveraging existing components (conceptually, from `src/components/ui/`) and styling from `src/theme/theme.ts`.

**Core Assumptions & Definitions:**

*   **`targetMonthYear`**: The month and year selected by the user in the UI (e.g., "2025-05" for May 2025). This is the month *payments are recorded*.
*   **`rentalPeriodInFocus`**: The actual rental period being analyzed for rent collection and delinquency. Due to rent paid in arrears, if `targetMonthYear` is May 2025, then `rentalPeriodInFocus` is April 2025.
*   **Earliest Data**: Rent payments exist from March 2025 onwards. This means the earliest `targetMonthYear` for rent-related metrics will be March 2025, covering the February 2025 `rentalPeriodInFocus`. Occupancy can be calculated for earlier `targetMonthYear` if inventory/lease data exists. The month selector should be constrained accordingly.

### Phase 1: Setup, Data Foundation, and Basic Property Group Display

**Goal:** Establish the page structure, implement the global month selector, fetch foundational data, and display basic information for each property group.

**Status: COMPLETED**

**Steps & Implementation Details:**

1.  **Page Structure & Month Selector:**
    *   [x] Create the main analytics page component (`src/app/dashboard/analytics/page.tsx`).
    *   [x] Add a global month/year selector component (`<MonthYearPicker />` in `src/components/ui/MonthYearPicker.tsx`).
        *   [x] This component manages the `targetMonthYear` state.
        *   [x] Defaults to the last fully completed month.
        *   [x] Constrains selectable months (Earliest March 2025, latest current month).
        *   [x] Styling concepts noted for future theme integration.
2.  **Data Fetching Hook/Service (Initial):**
    *   [x] Create a custom React hook (`usePropertyAnalyticsData` in `src/hooks/usePropertyAnalyticsData.ts`).
    *   [x] In this phase, the hook fetches:
        *   [x] `propertyGroups = await getAllPropertyGroups(landlordId)`
        *   [x] `allInventory = await getAllRentalInventory(landlordId)`
    *   [x] Implemented basic loading states and error handling.
3.  **Property Group Cards (Basic):**
    *   [x] For each `propertyGroup` fetched, render a "Property Group Card" (`<PropertyGroupCard />` in `src/components/analytics/PropertyGroupCard.tsx`).
    *   [x] Layout concepts noted for future grid/list components.
    *   [x] Styling concepts noted.
    *   [x] Display on each card:
        *   [x] Property Group Name.
        *   [x] Total Units in Group (calculated by filtering `allInventory` based on `propertyGroup.groupName` matching `inventoryItem.groupName`).
            *   *Note: This deviates from the plan's `inv.propertyGroupId === group.id` due to current `RentalInventory` type structure. Future phases/refactors might involve updating `RentalInventory` to include `propertyGroupId` for more direct linking if desired.*
4.  **Helper: Date Conversion Logic:**
    *   [x] Create a utility function `getRentalPeriodForTargetMonth(targetMonthYear: string): string` (in `src/lib/utils/analyticsUtils.ts`).
        *   [x] Example: If `targetMonthYear` is "2025-05", it returns "2025-04".

**Key Functions Used/Implemented:**

*   **Existing Firestore:**
    *   [x] `getAllPropertyGroups(landlordId)`
    *   [x] `getAllRentalInventory(landlordId)`
*   **New (Utility):**
    *   [x] `getRentalPeriodForTargetMonth(targetMonthYear: string): string`
*   **New (Hooks):**
    *   [x] `usePropertyAnalyticsData(landlordId)`
*   **New (Components):**
    *   [x] `src/app/dashboard/analytics/property/page.tsx`
    *   [x] `src/components/ui/MonthYearPicker.tsx`
    *   [x] `src/components/analytics/PropertyGroupCard.tsx`

**UI Components (Conceptual - to be built or mapped to existing in `src/components/ui/`):**

*   [x] `<PageLayout>` (basic structure in `page.tsx`)
*   [x] `<MonthYearPicker>`
*   [x] `<Grid>` or `<Flex>` (using Tailwind CSS grid for now)
*   [x] `<Card>` (basic div structure in `PropertyGroupCard.tsx`)
*   [x] `<Heading>` (using `h1`, `h3`)
*   [x] `<Text>` (using `p`)
*   [x] `<LoadingSpinner>` / `<ErrorMessage>` (basic text/div placeholders in `page.tsx`)

**Outcome of Phase 1:** A functional page at `src/app/dashboard/analytics/page.tsx` displaying a list of property groups with their names and total unit counts. A month selector allows changing the `targetMonthYear`. The page fetches data using the new hook and handles loading/error states for data fetching and auth. This sets a solid foundation for Phase 2.

---

### Phase 2: Single-Month Metrics (Occupancy, Rent Collection, Delinquency)

**Goal:** Calculate and display key monthly performance metrics for each property group based on the selected `targetMonthYear` and the derived `rentalPeriodInFocus`. Implement drill-down for delinquent units for the focused rental period.

**Status: COMPLETED**

**Steps & Implementation Details:**

1.  **Extend Data Fetching:**
    *   [x] Modified `usePropertyAnalyticsData` to also fetch:
        *   [x] `allLeases = await getAllLeases(landlordId)`
        *   [x] `allPayments = await getAllPayments(landlordId)`
    *   [x] Updated return type and object from the hook.
2.  **Calculate & Display Monthly Occupancy:**
    *   [x] For each `PropertyGroupCard` and the selected `targetMonthYear`:
        *   [x] Determined active leases at the *end* of `targetMonthYear` using `isLeaseActiveAtMonthEnd`.
        *   [x] Formula: `(Number of Occupied Units in Group at end of targetMonthYear / Total Units in Group) * 100` implemented.
        *   [x] Display: "XX% Occupied (as of end of [targetMonthYear])" in `PropertyGroupCard`.
3.  **Calculate & Display Monthly Rent Collected:**
    *   [x] For each `PropertyGroupCard` and the selected `targetMonthYear`:
        *   [x] `rentalPeriodInFocus = getRentalPeriodForTargetMonth(targetMonthYear)` used.
        *   [x] Filtered `allPayments` recorded in `targetMonthYear` for leases within the current property group and for `rentalPeriodInFocus`.
        *   [x] Summed these payments.
        *   [x] Display: "$X,XXX Collected (in [targetMonthYear] for [rentalPeriodInFocus] Rent)" in `PropertyGroupCard`.
4.  **Calculate & Display Monthly Delinquency Rate:**
    *   [x] For each `PropertyGroupCard` and `targetMonthYear`:
        *   [x] Used `rentalPeriodInFocus`.
        *   [x] Identified leases active during `rentalPeriodInFocus` for the group using `isLeaseActiveDuringRentalPeriod`.
        *   [x] `expectedRentForPeriod = Sum of rentAmount for these active leases`.
        *   [x] `collectedRentForPeriod = Sum of payments (actualRentPaid) recorded in targetMonthYear attributed to these leases for rentalPeriodInFocus`.
        *   [x] Formula: `((expectedRentForPeriod - collectedRentForPeriod) / expectedRentForPeriod) * 100` implemented.
        *   [x] Display: "Z% Delinquent (for [rentalPeriodInFocus] Rent)" in `PropertyGroupCard`, with conditional text color for high rates.
5.  **Delinquent Units Drill-Down (Single Month):**
    *   [x] On each `PropertyGroupCard`, added a "View Delinquent Units" `<Button>`.
    *   [x] Action opens a `<DelinquencyModal />` (`src/components/analytics/DelinquencyModal.tsx`).
    *   [x] Modal state (visibility, data) managed in `analytics/page.tsx`.
    *   [x] Content: A table listing units within that property group that are delinquent for `rentalPeriodInFocus`.
        *   [x] Columns: Unit Number, Tenant Name, Lease Rent Amount, Amount Paid, Amount Due, Lease End Date.
        *   [x] Used `<Table>` components from `src/components/ui/table.tsx` and `<Card>` for modal structure.

**Key Functions & Types Used/Implemented:**

*   **Existing Firestore (via `usePropertyAnalyticsData`):**
    *   [x] `getAllLeases(landlordId)`
    *   [x] `getAllPayments(landlordId)`
*   **New Types (in `src/types.d.ts`):**
    *   [x] `DelinquentUnitInfo` interface.
*   **New Utilities (in `src/lib/utils/analyticsUtils.ts`):**
    *   [x] `isLeaseActiveAtMonthEnd(lease: Lease, targetMonthYear: string): boolean`
    *   [x] `isLeaseActiveDuringRentalPeriod(lease: Lease, rentalPeriod: string): boolean`
    *   [x] `filterPaymentsForRentalPeriodAndLeases(payments: RentPayment[], targetLeaseIds: string[], rentalPeriod: string): RentPayment[]` (Note: `PropertyGroupCard` does more specific filtering by payment date as well).
*   **Core Logic in `PropertyGroupCard.tsx` for:**
    *   [x] Calculating monthly occupancy.
    *   [x] Calculating monthly rent collected (for specific rental period, with payments in target month).
    *   [x] Calculating monthly delinquency (rate and delinquent unit list).
*   **Modified Components:**
    *   [x] `src/hooks/usePropertyAnalyticsData.ts` (extended to fetch leases and payments).
    *   [x] `src/components/analytics/PropertyGroupCard.tsx` (major enhancements for Phase 2 metrics and modal trigger).
    *   [x] `src/app/dashboard/analytics/page.tsx` (to pass new data and manage modal).
*   **New Components:**
    *   [x] `src/components/analytics/DelinquencyModal.tsx`

**UI Components Leveraged (from `src/components/ui/`):**

*   [x] `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` (used in `PropertyGroupCard` and `DelinquencyModal`).
*   [x] `<Button>` (used in `PropertyGroupCard` and `DelinquencyModal`).
*   [x] `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>` (used in `DelinquencyModal`).

**Outcome of Phase 2:** Property group cards now display dynamic monthly occupancy, rent collected (clarifying payment month vs. rental period), and delinquency rates for the selected `targetMonthYear`. Users can drill down via a modal to see specific units delinquent for the `rentalPeriodInFocus`. The UI for cards is more structured using existing Card components.

---

### Phase 3: YTD Metrics, Multi-Month Delinquency Tracking & UI Polish

**Goal:** Add Year-to-Date financial metrics, implement tracking for units with multiple consecutive months of non-payment, and refine the overall UI/UX.

**Status: COMPLETED**

**Steps & Implementation Details:**

1.  **Calculate & Display YTD Rent Collected:**
    *   [x] For each `PropertyGroupCard`:
        *   [x] Calculate sum of all `RentPayment` amounts for leases within the group, where `paymentDate` is between March of `targetMonthYear`'s year and the current `targetMonthYear` (inclusive), using `calculateYtdRentCollected` utility.
        *   [x] **Display:** "$Y,YYY YTD Collected (Payments Mar YYYY - [targetMonthYear])" in `PropertyGroupCard.tsx`.
        *   [x] Utility function `calculateYtdRentCollected` added to `src/lib/utils/analyticsUtils.ts`.
2.  **Identify Multi-Month Delinquent Units:**
    *   [x] This is the most complex part of this phase. For each unit in each property group:
        *   [x] Determine its payment status for `rentalPeriodInFocus`.
        *   [x] Determine its payment status for `getRentalPeriodForTargetMonth(targetMonthYear - 1 month)` (and further back as configured).
        *   [x] A unit is "multi-month delinquent" if it has outstanding rent for a configurable number (e.g., 2) of consecutive rental periods up to `rentalPeriodInFocus`.
    *   [x] **Display:**
        *   [x] On the `PropertyGroupCard`, add an indicator and button for "X Units with Multi-Month Delinquency."
        *   [x] Clicking this opens a new dedicated modal (`MultiMonthDelinquencyModal.tsx`) to display these units.
    *   [x] **Data for Drill-Down:** Unit Number, Tenant Name, Rent Amount, Months Delinquent (e.g., "Feb & Mar 2025"), Total Amount Overdue across these months - handled by `MultiMonthDelinquentUnitInfo` and the new modal.
    *   [x] **New Type:** `MultiMonthDelinquentUnitInfo` in `src/types.d.ts`.
    *   [x] **New Utility:** `identifyMultiMonthDelinquentUnits` in `src/lib/utils/analyticsUtils.ts`.
    *   [x] `page.tsx` updated to handle state and props for the new modal.
3.  **UI Polish & Enhancements:**
    *   [ ] **Mini-Trends (Optional):** Consider adding small, embedded line charts within each `PropertyGroupCard` for occupancy rate over the last 3-6 `targetMonthYear`s (data permitting since March 2025). Use `recharts` or a similar library.
        *   [ ] **Styling**: Subtle lines, `theme.colors.primary` or `secondary`.
    *   [x] **Visual Cues:** Enhance visual cues for delinquency rates (e.g., more distinct color progression based on severity using `theme.colors.error` and potentially yellow/orange shades). 
        *   [x] Implemented a three-tier color system (gray, amber, red) for delinquency rate text in `PropertyGroupCard.tsx`.
    *   [ ] **Loading/Empty States:** Ensure all data points and drill-downs have graceful loading and empty state representations.
    *   [ ] **Accessibility & Responsiveness:** Review and ensure the dashboard is accessible and performs well on different screen sizes.
    *   [ ] **Tooltips:** Add tooltips to explain complex metrics or date interpretations if needed (e.g., `<Tooltip text="...">`).

**Key Functions to Use/Implement:**

*   **New (Core Logic / Utilities):**
    *   `calculateYTDRentCollectedForGroup(groupLeaseIds: string[], allPayments: RentPayment[], targetMonthYear: string): number`
    *   `identifyMultiMonthDelinquentUnits(groupLeases: Lease[], allPayments: RentPayment[], currentTargetMonth: string, consecutiveMonthsThreshold: number = 2): MultiMonthDelinquentUnitInfo[]`
        *   This function will need to iterate back through previous rental periods.
*   **Libraries:**
    *   `recharts` (optional, for mini-trends).

**UI Components (Conceptual):**

*   `<LineChart>` (from `recharts`, if used for mini-trends).
*   `<Tooltip>`: For hover information.

**Outcome of Phase 3:** The analytics dashboard is feature-complete for this initial property-level view. It includes YTD financial data, a critical system for flagging repeatedly delinquent tenants, and a more polished user experience. The system is robust and provides highly actionable insights.

This phased approach should guide a junior developer systematically, ensuring clarity at each step and leveraging the project's existing theme and component concepts.

