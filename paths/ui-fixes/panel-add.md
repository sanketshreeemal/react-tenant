Reference UI - Property Management Page 

I want to build a UI similar to the property Management page on my Payments Page and also my tenants page. 
The idea is to use panels and the carousal to consolidate and summarize data that is currently stored in a large table that is useful to have, but ultimately not easy to glance and get insights from. 

To that end, while using the exisitn gcomponents and design elements already created, i want to customize these panels for use inside the two additional pages of payments and tenants. 

First, lets start with the vision for tenants. 
    The tenants page shows all the leases across a proprety portfolio, and differentiated active from inactive leases. An active lease has a boolean "isactive" field that is true when lease is active (implying a tenant is currently paying rent, implying the unit is occupied), and false when the lease is no longer in effect. 
    The other fields are the rent (and security deposit) specified on the lease, when the lease is set to expire etc. 

    Panel Vision - Have the same design (carousal, panels inside at the property level, inside each panel ther eare multiple cards that show infomration). The key difference is how we design the inside of the panel - 
        Inside each panel, we will embed two tabs, one for Occupied, and another for Vacant. Inside each tab, the first card with be a progress bar component that shows how many units are Occupied (if on the occupied tab) or Vacant (if looking at the vacant tab) at the property level. 
        Under this initial card, we will then have a list of cards, one for each unit that falls under occupied or vacant (using the rules specified above)
        If a unit has an active lease, it is considered occupied, if a unit has no current active lease, it is considered vacant. 
        The individual unit tile will be designed interactively as follows 
        In the default panel  state, we see the occupied tab under each property group, progress bar under it, and the unit tiles with the details - Unit Number on the left, rent on the right. 
        The tiles on the vacant tab look slightly different: unit number on the left, and days vacant on the right (subtract the day the lease was updated (boolean was turned to false from todays date)). 
        
        Replciate this for all the property groups that have properties within them. 
        Make sure to use styling consistent with @theme.ts file, use the relevant compoenents from the UI directory - do not create custom css unless the compoennts needed do nto exist in the project already. 
        
    
-----------
# Technical Specification: Tenant & Payments Page Panels

## Overview
We are enhancing the **Tenants Page** and **Payments Page** by incorporating a **carousel-based panel system** similar to the Property Management Page UI. The goal is to improve data visualization by summarizing information from large tables into an interactive, glanceable format.

## General Approach
- **Leverage existing UI components** to ensure consistency.
- **Avoid custom CSS** unless strictly necessary.
- **Follow the theme configuration** from `@theme.ts`.
- **Use the UI directory** for available components.
- **Ensure responsiveness and accessibility** across devices.

## Implementation Breakdown
### **Step 1: Create the Panel Structure**
1. Implement a **carousel container** at the property level.
2. Each panel within the carousel represents a **single property**.
3. Each panel contains **two tabs**:
   - **Occupied Units**
   - **Vacant Units**

### **Step 2: Tab System Inside Panels**
1. Utilize an existing **Tabs Component**.
2. Default to the **Occupied tab** on first render.
3. Each tab contains:
   - **A progress bar component** (showing occupied/vacant units count).
   - **A list of unit tiles** with relevant details.

### **Step 3: Populate Occupied & Vacant Units**
1. Fetch unit data based on `isActive` boolean field.
   - **`true` → Occupied**
   - **`false` → Vacant**
2. Render unit tiles:
   - **Occupied Tab**:
     - Left: **Unit Number**
     - Right: **Monthly Rent**
   - **Vacant Tab**:
     - Left: **Unit Number**
     - Right: **Days Vacant** (computed as `today - last active date`)

### **Step 4: Implement Progress Bar Logic**
1. Calculate **total units** in the property.
2. Calculate **occupied units count**.
3. Render progress bar using:
   - Filled section → Percentage of occupied units.
   - Remaining section → Percentage of vacant units.

### **Step 5: Payments Page Customization**
1. Reuse the same panel structure from the Tenants Page.
2. Modify the tabs to:
   - **Rent Collection** (with collected & pending payments breakdown)
   - **Lease Expirations**
3. Inside the **Rent Collection tab**:
   - Progress bar → `Collected / Total Rent Units`
   - Pending payments list:
     - **Tenant Name**
     - **Unit Number**
     - **Amount Due**
     - **Overdue Label** (if applicable)
4. Inside the **Lease Expirations tab**:
   - Progress bar → `Expiring Leases / Total Leases`
   - List of expiring leases:
     - **Tenant Name**
     - **Unit Number**
     - **Expiration Date**

## Deployment Plan
1. **Phase 1**: Implement base panel & carousel structure.
2. **Phase 2**: Integrate the occupied/vacant logic.
3. **Phase 3**: Implement progress bar functionality.
4. **Phase 4**: Customize for Payments Page with tabs for Rent Collection & Lease Expirations.
5. **Phase 5**: Testing & QA (responsiveness, performance, accessibility).

## Key Considerations
- **Reusability:** Ensure components are modular for future expansion.
- **Performance Optimization:** Use efficient state management.
- **Accessibility:** Ensure all interactive elements are keyboard & screen-reader friendly.

## Expected Outcome
A **user-friendly** and **data-driven** interface for tenants & payments, improving readability and usability over the current large table format.

Payments logic - 
Yes, please replicate the same process we did in tenants to folder. I have created the necessary file structure. 
First migrate the form logic to the new page in @page.tsx. 

For the panel UI, we can use the same overal design, but we will change the internal details. At the highest level, lets have the property type filter as a drop down that defaults to rent, BUT also allows filtering the panel data across all the payment types. We also need a drop down for Month, which defaults to the curren tmonth. here is how the panel internal design should look - 

1. The tabs will show Paid / Unpaid. Under the paid tab, we will list all the units that have paid rent (if that is the payment type filter currently selected) for that month. The card will have unit number on the left and the rental amount paid on the right. In the unpaid section, we will have the list of units that hav enot yet paid rent, and also how much rent they are expected to pay. Above both, we will show the progress bar on % of rent collected (and pending). We will have this for all property groups. The filters are cruciual since they allow the user to look at specific data that they want - by month and by payment type. 

One key consideration to have here is what happens when a unit has not paid rent (only rent) for several months? THere should be a separate panel all the way to the left (first panel) that is titled "Multi Month Defaulters" and simply has a list of all the units that have unpaid rent from the last 4 months. So, if a unit skipped january rent payment, that unit will show up as a defaulter (the defaulter panel does not use the filters - it shows units from across the app who have not paid for multiple months). 

Build this systematically as well - make sure to fix any linter errors by looking at @types.d.ts and @firestoreUtils.ts for key functiosn that already exist. Only If they dont exist o rcannot be reused, create ne wfunctions for the panels. 