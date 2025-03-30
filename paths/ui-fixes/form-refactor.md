# Refactoring User Forms to Use Standardized Components

## Overview
The goal of this refactoring is to remove all custom CSS from our user forms and instead leverage pre-built, reusable components. This will improve consistency, maintainability, and scalability of our design. We will achieve this by:
- Using our theme configuration (`theme.ts`) for all standard colors and styles.
- Utilizing our pre-installed components as building blocks:
  - **Button**
  - **Card**
  - **Input**
  - **Select**
  - **Sonner**
  - **Textarea**
  - **Tooltip**

We currently have three key forms:
1. **Rental Inventory Form** – for users to input property portfolio details.
2. **Tenant and Lease Form** – for inputting lease details per unit.
3. **Rental Payment Form** – for inputting rental payment receipts.

We will tackle the refactoring one form at a time.

---

## General Guidelines and Best Practices

- **Theming and Styling:**  
  - Always import and reference the standard colors and style variables from src/theme/theme.ts
  - Do not add any inline or custom CSS. All styling should come from the component API or through theme-based props.
  - Prioritize simplicity and elegance - the form must look beautiful.

- **Component-First Approach:**  
  - Build the UI using our library components (Button, Card, Input, etc.) to ensure consistency across the application.
  - When a design pattern repeats (e.g., form containers or buttons), ensure the same component structure and styling is used.

- **Maintain Existing Functionality:**  
  - **Do not change function names, variables, or form validation logic.** The data from these forms is used elsewhere in the application.
  - Ensure that any validation messages and behaviors remain intact.
  
- **Accessibility & UX:**  
  - Use the Tooltip component to provide user guidance on buttons.
  - Ensure that Sonner (notification component) is triggered with the appropriate message and standard theme colors for both desktop and mobile.

- **Incremental Refactoring:**  
  - Tackle the forms one at a time to reduce risk. Validate each form's behavior before moving on.
  - Begin with the simplest form (Rental Inventory Form) to establish the pattern.

---

## Step 1: Rental Inventory Form in src/app/dashboard/rent/page.tsx

This form is the easiest implementation and serves as the starting point. The following changes should be made:

1. **Form Container:**
   - Replace the existing container with a **Card** component.
   - Set the header of the card to "Add New Property".
   - Within this container, add a nested, subtler container (could be another Card or a styled div based on a component) titled "Property Data" to house only the form fields.

2. **Form Fields:**
   - **Unit Number:**  
     - Use the **Input** component.
     - Mark this field as mandatory.
   - **Property Type:**  
     - Use the **Select** component.
     - Provide two options: `Residential` and `Commercial`, with `Residential` as the default.
   - **Owner Name:**  
     - Use the **Textarea** component.
     - Mark this field as mandatory.
   - **Bank Details:**  
     - Use the **Textarea** component.
     - This field is optional.

3. **Action Buttons:**
   - Outside the main form container (but still within the "Add New Property" Card), place two buttons:
     - **Submit Button:**  
       - Use the **Button** component.
       - Style it using the standard styles defined in `theme.ts`.
       - Attach a Tooltip that displays "Upload Property Data".
     - **Cancel Button:**  
       - Use the **Button** component.
       - Style it similarly as above (with theme-based styles).
       - Attach a Tooltip that displays "Cancel Upload".
   - Ensure that on click:
     - **Submit:** Triggers the Sonner component with the message "Property Uploaded Successfully".
     - **Cancel:** Triggers the Sonner component with the message "Property Upload Cancelled".
   - Both Sonner notifications must use standard colors from `theme.ts` and work seamlessly on both desktop and mobile devices.

4. **Container Closure:**
   - After the buttons (with a slight padding below), properly close the larger "Add New Property" container.
  
5. **Other Elements:**
   - **No Changes Elsewhere:**  
     - Leave the rest of the page (tables, layout outside the form container) unchanged.
     - Do not modify any functionality related to form validation, variable names, or backend integration.

6. **Issues to Fix Later:**
    - Form Title not fully dynamic 
        - If a user enters the form by manual add - they see "add property"
        - if a user enters through an edit button - they see "edit xyx property"
        - But if a user first tries to edit a unit, then cancels and clicks on add property, they still see the previous "edit xyz property. Essentially the form title is not re-loading based on what the user is trying to do. THe form content howeer are correctly empty instead of pre-populated. So the only problem is the title. 


---

## Step 2: Tenant and Lease Page

### Step 2.1: Form

For all the following steps, **use the `theme.ts` file** for standard colors, fonts, borders, buttons, etc. **Do not use any hardcoded design elements unless explicitly stated.**

- **Container & Header:**
  - Replace the existing container with a **Card** component.
  - Set the header of the card based on context:
    - **"Add New Lease"** if the user accesses the form via the **Add new lease button**.
    - **"Edit unit {Unit Number} {unit type} lease"** if accessed via the **Edit button**.
  - **Important Note:** The backend logic, functions, and values remain unchanged. Do not modify the suggested values in the CSS, validation rules, or error messages.

- **Nested Cards & Form Sections:**
  - **Unit Information:**
    - Create a nested Card titled **"Unit Information"**.
    - **Unit Number:** Use the **Select** component to provide a dropdown list.
    
  - **Tenant Information:**
    - Create a nested Card titled **"Tenant Information"**.
    - **Tenant Name:** Use the **Input** component *(Mandatory)*.
    - **Tenant Email Address:** Use the **Input** component *(Mandatory)*.
    - **Country Code:** Use the **Input** component *(Mandatory)*.
    - **Phone Number:** Use the **Input** component *(Mandatory)*.
    - **Adhaar Number:** Use the **Input** component *(Mandatory)*.
    - **Pan Card Number:** Use the **Input** component *(Optional)*.
    - **Permanent Address:** Use the **Textarea** component *(Optional)*.
    
  - **Lease Details:**
    - Create a nested Card titled **"Lease Details"**.
    - **Lease Start Date:** This is a date field. Use the existing CSS (ensuring dynamic responsiveness across screen sizes). *(Mandatory)*.
    - **Lease End Date:** This is a date field. Use the existing CSS (ensuring dynamic responsiveness across screen sizes).*(Mandatory)*.
    - **Monthly Rent Amount:** Use the **Input** component. *(Mandatory)*.
    - **Security Deposit Amount:** Use the **Input** component. *(Mandatory)*.
    - **Deposit Payment Method:** Use the **Select** component with the following options:  *(Mandatory)*.
      `[Cash, UPI, Bank Transfer, Cheque, Other - Specify in Comments]`
    - **Lease Status:** Keep the existing toggle button as is (no changes).
    - **Additional Comments:** Use the **Textarea** component. *(Optional)*.
    
- **Prefill Behavior:**
  - If the user accesses the form via the **Add button**, the form should be empty.
  - If the user accesses the form via the **Edit button**, the form should be prefilled with the existing data for that unit. **Note:** The Unit Number field should be non-editable in this case.

- **Finalizing the Outer Card:**
  - At the bottom of the outer Card, add two buttons using the standard button design from `theme.ts`:
    - **"Save lease"**
    - **"Cancel"**

---

### Step 2.2: Accordion Update

- The custom CSS accordion at the top of the page must be updated to reflect the new accordion design implemented on the property management page.
- **Action:** Adapt the content to match the exact design and positioning of the property management page’s accordion.

---

### Step 2.3: Top Banner Redesign

- The top banner must be re-designed to replicate the design used on the property management page.
- **Requirement:** While the styling and layout should be identical, the banner should maintain its own title as per its purpose on the Tenant and Lease page.

------
## Step 3: Rental Payment Form (General "Payments" Form)

This refactor updates the single rent payment form into a generalized "Payments" form that accommodates multiple payment types. The changes will be applied in small, independent steps to minimize risk and avoid breakage in the app logic and functions.



### Step 3.1: Front End Refactoring

#### General Guidelines
- **Theme Usage:**  
  Use the `theme.ts` file for all colors, fonts, borders, and button styles. No hardcoded design elements unless explicitly stated.
- **Component-based Styling:**  
  Replace all custom CSS with standard components. For HTML elements (e.g., dropdowns, calendar inputs), restyle them using the provided code snippet to maintain consistency.
- **Preserve Existing Logic:**  
  All auto-population rules, default values, and validations must remain unchanged unless specified.

#### Form Layout and Fields
1. **Overall Container:**  
   Update the form container to use the standard component-based layout.

2. **Form Fields Implementation:**
   - **Unit Number:**  
     - Use an HTML dropdown (styled per provided snippet) for unit selection.
   - **Payment Type (New Mandatory Field):**  
     - Use an HTML dropdown (styled accordingly) with these options:
       - Default: "Select Payment Type"
       - Rent Payment
       - Bill Payment
       - Maintenance Fee
       - Other
   - **Rental Period:**  
     - Use an HTML dropdown (styled similarly to tenant dropdowns) that shows a range of 4 months before and after the current month. *(Mandatory)*
   - **Tenant Name:**  
     - Refactor to use the **Input** component. This field remains auto-populated.
   - **Payment Date:**  
     - Use an HTML calendar input, restyled to match other inputs. *(Mandatory)*
   - **Payment Expected:**  
     - Use an **Input** component with conditional formatting:
       - **Default Value:** "N/A" when the form is opened and Payment Type is Bill Payment, Maintenance Fee, or Other.
       - For Rent Payment, use the suggested value based on the tenant’s expected rent (existing logic).
   - **Payment Collected:**  
     - Use an **Input** component. *(Mandatory)*
   - **Collection Method (New Field):**  
     - Use an HTML dropdown (styled consistently) with options similar to the deposit type in the Tenant Form (e.g., Cash, UPI, Check, Bank Transfer).
   - **Unit Owner:**  
     - Use an **Input** component; keep it auto-populated.
   - **Bank Details:**  
     - Use an **Input** component; keep it auto-populated.
   - **Comments:**  
     - Use a **Textarea** component with conditional formatting:
       - **Default Value:** "Comments"
       - **Conditional Behavior:**
         - **Rent Payment:** Suggested value "Comments"; field is not mandatory.
         - **Bill Payment:** Suggested value "What type of bill payment? Electricity, Water, Gas etc"; field becomes mandatory.
         - **Maintenance Fee:** Suggested value "Comments"; field is not mandatory.
         - **Other:** Suggested value "What type of payment is this for?"; field becomes mandatory.
   - **Attachment:**  
     - Include a file upload field for attaching relevant files.


### Step 3.2: Back End Adjustments

#### Data Structure Changes
- **Add New Field:**  
  - Introduce a new field, `paymentType`, in the existing `rent-collection` collection in Firebase.
- **Files to Update:**  
  - Update all relevant files such as `firestoreUtils`, `type.d.ts`, and any other modules where payment data is processed to accommodate the new field.

#### Logic and Data Handling
- **Modify Existing Formulas:**
  - Change all formulas that reference `actualRentPaid` so that they only use its value if `paymentType` is set to "Rent Payment".  
  - This ensures that payments for bills, maintenance, or other fees do not inadvertently populate rent-related fields.
- **Data Migration:**  
  - For existing entries in the `rent-collection` collection that lack a `paymentType` value, set the default value to "Rent" to ensure a smooth migration. If automating this is complex, consider a manual update via the Firestore dashboard.
- **Future Analytics:**  
  - Note that separate analytics and logic for non-rent payments can be implemented in the future; for now, focus on maintaining existing functionality.


### Step 3.3: Integration Testing & Final Verification

#### Testing Guidelines
- **Frontend Validation:**  
  - Verify that all fields are rendered correctly using the new components and that their conditional formatting (e.g., for Payment Expected and Comments) works as expected.
  - Ensure that auto-populated fields and default values remain unchanged.
  - Confirm that dropdowns and calendar inputs are styled as per the provided code snippet.

- **Backend Validation:**  
  - Check that the new `paymentType` field is correctly stored in Firestore and that data retrieval functions (especially formulas referencing `actualRentPaid`) behave correctly based on the payment type.
  - Run integration tests to ensure that the changes have not impacted existing payment calculations and that non-rent payments do not interfere with rent-related logic.


---

## Additional Technical Considerations

- **Component Prop Passing:**  
  - When using components, pass props for colors, sizes, and any variant styles that are available in the component API. Refer to the component documentation for available options.
  
- **Responsive Design:**  
  - Verify that the components render correctly on both desktop and mobile. Adjust any layout components if necessary using responsive properties provided by the component library.
  
- **Error Handling & Validation:**  
  - Double-check that custom validation messages and error states are maintained. If a component handles error state visually, ensure that it conforms to our app's design guidelines via `theme.ts`.

- **Version Control:**  
  - Refactor one form at a time starting with step 1. This makes it easier to track changes and revert if any issues arise.

- **Documentation & Comments:**  
  - Comment on your code to explain any changes made, especially where you replace custom CSS with a component approach.
  - Update this file to reflect that the forms now adhere to the standardized component design and what was changed.

---

## Technical Specifications for Form Components

### Container Structure
1. **Main Form Container**
   - Component: `Card`
   - Props:
     - className: "mb-8"
   - Children:
     - `CardHeader` with `CardTitle` for form title
     - `CardContent` for form body

2. **Inner Form Container**
   - Component: `Card`
   - Props:
     - className: "bg-surface border-border"
   - Children:
     - `CardHeader` with `CardTitle` for section title
     - `CardContent` with grid layout

### Form Fields
1. **Text Input**
   - Component: `Input`
   - Wrapper:
     - Label: text-sm font-medium text-textSecondary mb-1
   - Props:
     - type: "text"
     - required: true/false based on field
     - placeholder: Descriptive example text

2. **Select Input**
   - Components: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
   - Wrapper:
     - Label: text-sm font-medium text-textSecondary mb-1
   - Props:
     - value: controlled value
     - onValueChange: handler function
     - SelectValue: placeholder text
     - SelectItem: value and display text

3. **Textarea**
   - Component: `Textarea`
   - Wrapper:
     - Label: text-sm font-medium text-textSecondary mb-1
   - Props:
     - rows: 3
     - required: true/false based on field
     - placeholder: Descriptive example text

### Action Buttons
1. **Cancel Button**
   - Component: `Button`
   - Props:
     - variant: "outline"
     - type: "button"

2. **Submit Button**
   - Component: `Button`
   - Props:
     - type: "submit"
     - variant: "default" (primary style)

### Layout
1. **Grid System**
   - Container: className="grid grid-cols-1 gap-4 md:grid-cols-2"
   - Full-width fields: className="col-span-2"
   - Half-width fields: className="col-span-1"

2. **Spacing**
   - Between sections: mt-6
   - Between form elements: gap-4
   - Button group: space-x-3

### Error Handling
1. **Form Error Display**
   - Component: `AlertMessage`
   - Props:
     - variant: "error"
     - className: "mb-6"
   - Placement: Top of form, below header

### Theme Integration
1. **Colors**
   - Text: theme.colors.textSecondary for labels
   - Borders: theme.colors.border
   - Background: theme.colors.surface for inner card
   - Buttons: Uses theme.colors.button values

2. **Typography**
   - Labels: theme.typography.fontSize.sm
   - Input text: theme.typography.fontSize.base
   - Card titles: theme.typography.fontSize.base

3. **Spacing**
   - Uses theme.spacing values for consistent gaps and padding

### Tooltip Implementation
1. **Provider Setup**
   - Component: `TooltipProvider`
   - Placement: At the root level of the form page/component
   - Import: `import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"`

2. **Tooltip Structure**
   ```tsx
   <TooltipProvider>
     <Tooltip>
       <TooltipTrigger asChild>
         <div>
           {/* The element that triggers the tooltip */}
         </div>
       </TooltipTrigger>
       <TooltipContent>
         {/* The tooltip message */}
       </TooltipContent>
     </Tooltip>
   </TooltipProvider>
   ```

3. **Best Practices**
   - Always wrap tooltips with `TooltipProvider` at the highest possible level
   - Use `asChild` prop on `TooltipTrigger` when wrapping custom components
   - Keep tooltip content concise and helpful
   - Use tooltips consistently across similar UI elements
   - Ensure tooltip text contrasts well with its background

4. **Common Use Cases**
   - Form field explanations
   - Button action descriptions
   - Icon button labels
   - Additional context for form elements

### Accessibility
1. **Form Fields**
   - All inputs have associated labels
   - Required fields marked with asterisk (*)
   - Tooltips provide additional context
   - Proper ARIA attributes via component props

2. **Interactive Elements**
   - Keyboard navigation support
   - Focus states for all interactive elements
   - Clear visual feedback for actions

### Notifications
1. **Toast Messages**
   - Uses Sonner component for success/error notifications
   - Consistent styling with theme colors
   - Auto-dismissal after standard duration

This specification serves as the standard for implementing all forms in the application, ensuring consistency in styling, behavior, and user experience.

------

now, lets work on re-designing and refactoring the table in @page.tsx  to allow for the values that we have created to show up properly. 
First, payment ype column is not loading the data correctly. The value here for each payment record should be the Payment Type the user fills in the form. 
Right now, after a page reload, all records are being defaulted to a Rent payment. We do not need backward compatibility for old records becasue all records have a valid  Payment Type field.


Further, all columns in the table should have a sort function by ascending or decending. The default is for the rental period to be sorted from latest to oldest. however, if the user clicks on any column header, the that column should now be the sorting priority with an identical arrow of if the sorting is ascending or decending. That arrow should only appear if a column is actively sorting. The current default sort of Rental period is good.

Next, the search input field needs to be refactored to an Input Compoennt with the same placeholder. But, i see that this search input field has functionality only for unit number and tenant name. I want the field to be able to search the entire table for what the user wants - whether its a number, a word, a group of letters, a month etc. If a user Types March, all rows that have "March" in any field should appear. Same for numbers - if a user types 500, any row with a field of 500 should show up, whether its the unit number or the expected amount or the actual amount. The table should be fully searchable and dynamic - the user need not press enter - the table updates as the user types in the values. 

Fix the table and the search bar functionality. If you find any other areas of improvement while you are fixing these, only note them here at the end, do not action those extra changes without my permission. 

-----
Prompt - 
Lets work on debugging the table presented to the user in @page.tsx . Specifically, i want to focus on teh Payment Type field in the table. As it stands today, despite what the user selects as Payment Type in the payment form on the same page, the table always defaults to the Payment Type being Rent Payment. For instance, if a user selects Maintenance Fee as the type of payment they are recording, what we want is the table to show Maintenance fee for that payment record, but rigth now it shows Rent Payment. 

I beleve some legacy function that was implemented before Payment Type field was added is causing issues in the way that this table is loading. But i am not sure how or where the issue lies. 

To debug this, i want to take a systematic approach. First, analyse  the form submission logic, the intialization state of the form, and the retrieval logic to populate the tabel as it relates to rent payment. I want you to do some investigative work, and follow the trail of possibel issues in the way that these functions have been written on the @page.tsx , hwo they are connected to @firestoreUtils.ts page where the database writing and retrieval is being handled, and then cross reference @types.d.ts to make sure types are as they should be. Goign through this should systematically reveal the problem on why default state is beign applied for Rent Payment. 

I want you to note that we do not ned to consider previous for backward compatibility - all records will always have a rent payment field, this field will never be empty. 

For the output, i specifically do not want you to change or write any code. I wan tyou to analyse the code base as instructed to debug the issue and then report back what you find in a structered response in @payment-table.md where you show me what areas of my logic seem to be the problem, hat specifiec functions are not behaving properly or are outdated. 

Then present your proposed solution in the same file for me to review. 