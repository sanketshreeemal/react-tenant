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
        

Problem - 
Lets continue working on the tenants page @page.tsx . 
I am having issues with the way the vacancy formula is being applied. 

We are using a formula to calculate how many and which units are currently vacant and occupied. I think there is an error in that formula that calculates and presents which units are vacant. I suspect the issue is how the formula treats leases that are marked inactive. 
The logic should be as follows:
Check the rental inventory for that specific property group of units. Cross check that with how many of those units currently have an active lease (a lease where isActive field is True) - these are occupied units. Any remaining units that exist in the rental inventory collection not caputred here are vacant. 
I think the way the fomula is handling a a lease with the isactive field when FALSE is causing issues. There can and will be tenant leases that has expired or where the tenant has moved out (and therefore isActive toggled to FALSE) - but that does not mean the unit is vacant, since there might be another lease for the same unit that is toggled TRUE where a new tenancy is in progress. 

Do you understand the logic for the problem and what issue to look for and how to solve it? Do a robust formual check to see if it makes sense - does the fomula correctly handle what vacant means? (a unit with no lease, or a unit with a lease, but that lease is toggled FALSE and therefore not active). 
Right now, for your context, i have two records for unit PR216, one is toggled active (the lease currently in effect) and this lease shows up in the occupied tab. I also have another record for unit PR216 that is an old lease (isActive toggled FALSE) and this lease shows up in the Vacant tab. THe new formula should not consider PR216 vacant because there is an active lease, and also, critically - the same unit cannot show up in occupied and vacant at the same time - that is a logic flaw as well. Look into this, think through what the logic should be like,  what is currently is, the problem i am observing. Then make surgical changes to this function accordingly - only change specific code that makes this function more robust. 

- Solution description in detail - 

I think this is a crucial function that calcualtes vacanies per property group. Instead of isolating it in the tenant page, i believe its best to centralize this function by creating it in @firestoreUtils.ts and then calling it inside the payment page. I suspect this function will be called in other parts of the application as well. 

The current logic in groupLeasesByProperty seems to be adding units to the groups based on individual leases, which can lead to a unit appearing as both occupied (due to an active lease) and vacant (due to an inactive lease) if multiple lease records exist for it. Additionally, the way vacant units are identified might be flawed.
Here's the breakdown of the problem and the plan to fix it:
Problem: The function appears to process leases individually and then tries to add vacant units from inventory separately. This causes duplication when a unit (like PR216) has both active and inactive lease records. It incorrectly flags a unit as vacant based on an old inactive lease, even if a new active lease exists.
Correct Logic:
A unit is occupied if and only if there is at least one lease associated with it where isActive is true.
A unit is vacant if it exists in the rentalInventory but has no leases where isActive is true.
Each unit from the rentalInventory should appear exactly once in the final grouped list, categorized as either occupied or vacant based on the presence of an active lease.
The daysVacant calculation should ideally be based on the end date of the most recent lease associated with that unit, but for simplicity and consistency with the current code, we'll stick to calculating from the updatedAt timestamp of the relevant record (either the inventory item if never leased or the most recent inactive lease).
Solution: We need to refactor the groupLeasesByProperty function to first determine the definitive status (occupied or vacant) for each unit in the rentalInventory and then populate the groups.

Explanation of Changes:
Import differenceInDays: Added from date-fns for accurate day calculation.
Initialization: The groups object is initialized based on propertyGroups first, ensuring all defined groups exist. A 'Default' group is added if any inventory item lacks a group name.
Inventory Map: Created inventoryMap using rentalInventory for efficient lookup of unit details (like unitNumber, groupName) by unitId. We also calculate totalUnits per group here based on inventory count.
Active Lease Map: Created activeLeaseUnits map. This stores only the single most relevant active lease for each unitId. If multiple active leases exist (which ideally shouldn't happen but guards against it), it picks the one most recently updated.
Process Inventory: The core logic now iterates through the inventoryMap. For each unit:
It checks the activeLeaseUnits map.
If Active: An "occupied" entry is created using details from the active lease and the inventory (unitNumber). daysVacant is undefined.
If Not Active: An "vacant" entry is created.
It now tries to find the most recent lease end date (leaseEndDate) for that unit from all associated leases (active or inactive).
If the latest leaseEndDate is in the past, daysVacant is calculated from that date.
If there's no past leaseEndDate (e.g., lease ends in the future but is inactive, or no leases ever existed), it falls back to calculating based on the updatedAt timestamp of the most recently updated inactive lease, or finally the inventory createdAt date / current date.
daysVacant is ensured to be non-negative.
Unique IDs: Uses lease ID for occupied units and generates an ID like inv-${unitId} for vacant units to ensure stable keys.
Sorting: Added sorting for units within each group by unitNumber (optional but good for consistency) and maintained the sorting for the groups themselves.
Console Logs: Added more detailed logging to trace the process.
This revised logic ensures that each unit from your rentalInventory is evaluated once, its status (occupied/vacant) is determined based on the presence of an active lease, and it's added to the correct group without duplication. The calculation for daysVacant is also refined to be more meaningful.

import { Lease, RentalInventory, PropertyGroup } from "@/types";
import { format, differenceInDays } from 'date-fns'; // Import differenceInDays

// ... other imports ...

export default function TenantsManagement() {
  // ... existing state and hooks ...

  const getUnitNumber = (unitId: string): string => {
    // Ensure rentalInventory is defined and not empty before searching
    if (!rentalInventory || rentalInventory.length === 0) {
      // console.warn("getUnitNumber called with empty or undefined rentalInventory");
      return unitId || "Unknown"; // Return unitId as fallback if provided, else "Unknown"
    }
    if (!unitId) {
      // console.warn("Empty unitId passed to getUnitNumber");
      return "Unknown";
    }
  
    // console.log(`Looking up unit number for unitId: ${unitId}`);
    // console.log("Available inventory:", rentalInventory);
  
    // Prioritize finding by ID first
    const unitById = rentalInventory.find(item => item.id === unitId);
    if (unitById) {
      // console.log(`Found unit by ID match: ${unitById.unitNumber}`);
      return unitById.unitNumber;
    }
  
    // Fallback to finding by unitNumber if ID match fails (less likely to be correct)
    const unitByNumber = rentalInventory.find(item => item.unitNumber === unitId);
    if (unitByNumber) {
      // console.log(`Found unit by unit number match (fallback): ${unitByNumber.unitNumber}`);
      return unitByNumber.unitNumber;
    }
  
    // console.log(`No matching unit found for ${unitId}, using ID as fallback`);
    return unitId; // Return the original unitId if no match found
  };
  

  const groupLeasesByProperty = () => {
    console.log("Starting groupLeasesByProperty...");
    console.log("Rental Inventory:", rentalInventory);
    console.log("Leases:", leases);
    console.log("Property Groups:", propertyGroups);

    const groups: Record<string, {
        groupName: string;
        units: { id: string; unitNumber: string; rent?: number; daysVacant?: number; isActive: boolean; lastUpdated: Date }[];
        totalUnits: number;
    }> = {};

    // 1. Initialize groups based on PropertyGroups and ensure a 'Default' group exists if needed
    propertyGroups.forEach(pg => {
        if (!groups[pg.groupName]) {
            groups[pg.groupName] = { groupName: pg.groupName, units: [], totalUnits: 0 };
        }
    });
    if (rentalInventory.some(inv => !inv.groupName) && !groups['Default']) {
       groups['Default'] = { groupName: 'Default', units: [], totalUnits: 0 };
    }

    // 2. Create a map of rental inventory for easy lookup and initialize totalUnits
    const inventoryMap = new Map<string, RentalInventory>();
    rentalInventory.forEach(inv => {
        if (inv.id) {
            inventoryMap.set(inv.id, inv);
            const groupName = inv.groupName || 'Default';
            if (!groups[groupName]) { // Ensure group exists if inventory item belongs to a group not in PropertyGroups
                 groups[groupName] = { groupName: groupName, units: [], totalUnits: 0 };
            }
            groups[groupName].totalUnits++;
        } else {
            console.warn("Inventory item missing ID:", inv);
        }
    });

    // 3. Identify units with active leases
    const activeLeaseUnits = new Map<string, Lease>();
    leases.forEach(lease => {
        if (lease.isActive && lease.unitId) {
             // If multiple active leases exist for the same unit, prioritize the one updated most recently
            const existingActive = activeLeaseUnits.get(lease.unitId);
            if (!existingActive || new Date(lease.updatedAt) > new Date(existingActive.updatedAt)) {
                 activeLeaseUnits.set(lease.unitId, lease);
            }
        }
    });
    console.log("Active Lease Units Map:", activeLeaseUnits);


    // 4. Process each unit from the inventory map
    inventoryMap.forEach((inv, unitId) => {
        const groupName = inv.groupName || 'Default';
        const group = groups[groupName];
        
        if (!group) {
            console.warn(`Inventory unit ${unitId} belongs to group "${groupName}" which was not initialized. Skipping.`);
            return; // Should not happen if initialization is correct, but safety check
        }

        const activeLease = activeLeaseUnits.get(unitId);

        if (activeLease) {
            // Unit is OCCUPIED
            console.log(`Unit ${unitId} (${inv.unitNumber}) is OCCUPIED by active lease ${activeLease.id}`);
            group.units.push({
                id: activeLease.id || `lease-${unitId}`, // Use lease ID if available
                unitNumber: inv.unitNumber, // Get unit number from inventory
                rent: activeLease.rentAmount,
                isActive: true,
                lastUpdated: new Date(activeLease.updatedAt),
                daysVacant: undefined // Occupied units don't have daysVacant
            });
        } else {
            // Unit is VACANT
            console.log(`Unit ${unitId} (${inv.unitNumber}) is VACANT.`);
             // Find the *most recent* lease (active OR inactive) that ended for this unit to calculate vacancy start
            const relatedLeases = leases
                .filter(l => l.unitId === unitId)
                .sort((a, b) => new Date(b.leaseEndDate).getTime() - new Date(a.leaseEndDate).getTime()); // Sort by end date DESC

            let daysVacant: number | undefined = undefined;
            let lastUpdatedDate: Date | null = null; // Use null to indicate no relevant lease end date found yet

            if (relatedLeases.length > 0) {
                 const mostRecentLease = relatedLeases[0];
                 const endDate = new Date(mostRecentLease.leaseEndDate);
                 // Check if the most recent lease end date is in the past
                 if (endDate < new Date()) {
                    lastUpdatedDate = endDate;
                    daysVacant = differenceInDays(new Date(), endDate);
                 } else {
                     // If the latest lease ends in the future but is inactive, this is an edge case.
                     // For now, treat it as vacant from 'now' or use inventory creation date? Let's use 'now' (0 days vacant).
                     // Or maybe use the 'updatedAt' timestamp of the inactive lease? Let's find the most RECENTLY UPDATED inactive lease
                     const inactiveLeases = leases
                         .filter(l => l.unitId === unitId && !l.isActive)
                         .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                     
                     if (inactiveLeases.length > 0) {
                         lastUpdatedDate = new Date(inactiveLeases[0].updatedAt);
                         daysVacant = differenceInDays(new Date(), lastUpdatedDate);
                     }
                 }
            }
            
             // If no lease history found at all, consider vacancy from inventory creation if available?
             // For now, if lastUpdatedDate is still null, use current date.
             if (lastUpdatedDate === null) {
                 lastUpdatedDate = inv.createdAt ? new Date(inv.createdAt) : new Date(); // Fallback to inventory creation or now
                 daysVacant = differenceInDays(new Date(), lastUpdatedDate);
             }
             // Ensure daysVacant is not negative
             daysVacant = Math.max(0, daysVacant ?? 0);


            console.log(`Unit ${unitId} vacancy details: daysVacant=${daysVacant}, lastUpdated=${lastUpdatedDate}`);

            group.units.push({
                id: `inv-${unitId}`, // Create a unique ID based on inventory
                unitNumber: inv.unitNumber,
                rent: undefined, // Vacant units don't have current rent
                isActive: false,
                lastUpdated: lastUpdatedDate || new Date(), // Use calculated date or now
                daysVacant: daysVacant
            });
        }
    });
    
     // 5. Sort units within each group (optional, e.g., by unit number)
     Object.values(groups).forEach(group => {
         group.units.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
     });

    // 6. Sort the groups themselves
    const sortedGroups = Object.values(groups).sort((a, b) => {
        if (a.groupName === 'Default') return 1;
        if (b.groupName === 'Default') return -1;
         // Sort primarily by number of units descending
        if (a.totalUnits !== b.totalUnits) {
            return b.totalUnits - a.totalUnits;
        }
        // Then by group name alphabetically
        return a.groupName.localeCompare(b.groupName);
    });
    
    console.log("Finished groupLeasesByProperty. Result:", sortedGroups);
    return sortedGroups;
  };
  
  // ... rest of the component ...
}



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