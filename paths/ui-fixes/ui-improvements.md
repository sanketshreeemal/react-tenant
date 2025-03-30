# Technical Instructions for AI Agent: Shadcn & Tailwind Refactor Implementation

This document contains clear, step-by-step instructions to implement the integration of Shadcn UI components with Tailwind CSS into the project. Follow the steps below while keeping in mind the global rules and best practices outlined at the end.

---

## Global Rules

1. **Consistency:**  
   - Use centralized design tokens (colors, spacing, fonts) from Tailwind config and, if needed, a dedicated theme file.
   - Avoid hardcoding styles; all style references must use variables or tokens.

2. **Modularity:**  
   - All UI components must be built as reusable, self-contained modules.
   - Use clear and descriptive naming conventions for files and components.

3. **Incremental Changes:**  
   - Implement changes one component or page at a time.
   - Ensure stable commits and maintain version control integrity.

4. **Documentation:**  
   - Document each new component's API and usage.
   - Maintain clear comments and commit messages for all changes.

5. **Testing:**  
   - Validate changes locally using a development environment.
   - Use Storybook or similar tools to preview components in isolation before integration.

---

## Step-by-Step Instructions

### Step 1: Organize Folder Structure

1. **Create a dedicated folder for UI components:**  
   - Path: `/src/components/ui/`
2. **Ensure a clear separation of concerns:**  
   - Place reusable components (buttons, cards, inputs, progress bar, navbar, form, accordion, message) in this folder.
3. **Maintain other existing folders:**  
   - Keep static assets in `/public/`
   - Retain global styles in `/src/app/globals.css`
   - Place utility functions, contexts, and hooks in `/src/lib/`

COMPLETED: Verified the existing folder structure which already had the required organization. The '/src/components/ui/' folder exists with some basic components (button, card, input).

### Step 2: Audit Existing Components

1. **Search for Shadcn and Radix references:**  
   - Identify existing usage (e.g., in `button.tsx`).
2. **Document custom components:**  
   - List components currently in `/src/components/ui/` and note which need refactoring.
3. **Plan Integration:**  
   - Decide which custom components to refactor first (e.g., Buttons, Inputs).

COMPLETED: Audited existing components. Found that button.tsx already uses Radix UI (@radix-ui/react-slot) and follows Shadcn component patterns. The UI folder contains basic components (button.tsx, card.tsx, input.tsx) that will form the foundation of our theme-based components.

### Step 3: Implement a Centralized Theme

1. **Update Tailwind Config:**  
   - Configure your theme settings (colors, spacing, fonts, etc.) within `tailwind.config.ts` using the `theme.extend` property.
   - Ensure the values defined here align with the design tokens you want to enforce across the app.

2. **Create a Dedicated Theme File:**  
   - Create a file at `/src/theme/theme.ts` that exports your design tokens. For example:
     - **Colors:** Define primary, secondary, and additional colors.
     - **Spacing:** Define scale values (small, medium, large, etc.).
     - **Typography:** Define font families and sizes.
   - This file becomes the single source of truth for your design tokens, ensuring consistency and easy iteration.

3. **Integrate Theme Tokens with Global Styles:**  
   - Update `src/app/globals.css` to reference the tokens via Tailwind utility classes, ensuring that global styles adhere to your theme.
   - Optionally, import tokens from `/src/theme/theme.ts` into your component styles if needed, to maintain consistency between Tailwind and any custom CSS.
   - Verify that updates to tokens in either `tailwind.config.ts` or `theme.ts` are automatically reflected throughout your application.

COMPLETED: Created a centralized theme system with three key components:
1. Created `/src/theme/theme.ts` with the provided theme configuration that defines colors, spacing, typography, border radii, and shadows
2. Updated `tailwind.config.ts` to import and integrate the theme tokens, making them available throughout the application via Tailwind classes
3. Enhanced `globals.css` with utility classes that reference the theme tokens and added the required font imports to support the theme


### Step 4: Updated tailwind.config.ts file 
- I want you to update the tailwind.config.ts file to use the theme.ts file we just created such that all the design is centralized in theme.ts and tailwind.config.ts references theme.ts. 
An example codebase for tailwind.config.ts could be the following - 

import type { Config } from 'tailwindcss';
import { theme } from './src/theme/theme'; // Importing the centralized theme file

const tailwindConfig: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Scan all source files for class usage
    './components/**/*.{js,ts,jsx,tsx}', // Include shared components
    './app/**/*.{js,ts,jsx,tsx}', // Ensure Tailwind is applied to app-specific components
  ],
  theme: {
    extend: {
      colors: {
        primary: theme.colors.primary, // Main accent color
        secondary: theme.colors.secondary, // Supporting color
        background: theme.colors.background, // Light mode background
        foreground: theme.colors.foreground, // Text & foreground elements
        muted: theme.colors.muted, // Low-emphasis elements (e.g., disabled buttons)
        border: theme.colors.border, // Borders & separators
      },
      fontFamily: {
        sans: theme.fonts.body, // Default sans-serif font
        heading: theme.fonts.heading, // Headings & emphasis text
      },
      borderRadius: {
        DEFAULT: theme.borderRadius.default, // Standard rounded corners
        lg: theme.borderRadius.lg, // Large rounded corners
        full: theme.borderRadius.full, // Fully rounded (e.g., pill buttons)
      },
      spacing: {
        sm: theme.spacing.sm, // Small spacing
        md: theme.spacing.md, // Medium spacing
        lg: theme.spacing.lg, // Large spacing
        xl: theme.spacing.xl, // Extra-large spacing
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // Ensures consistent form styling
    require('@tailwindcss/typography'), // Better readability for long-form content
    require('@tailwindcss/aspect-ratio'), // Utility for controlling aspect ratios
  ],
  darkMode: 'class', // Enables dark mode via the `.dark` class
};

export default tailwindConfig;

Use the above as a baseline, and make any adjustments to this to resolve errors on the page. I want to ensure that any code that was referencing this file will still be usable. 
make sure to edit the content paths if necessary. 

1. Changed the import from `import theme from './src/theme/theme'` to `import { theme } from './src/theme/theme'` to match the theme export format
2. Renamed the config variable to `tailwindConfig` as per the example
3. Maintained compatibility with existing code by preserving the original HSL color variables
4. Added theme-prefixed versions of all theme.ts variables to enable gradual migration:
   - Added 'theme-' prefix to colors (theme-primary, theme-secondary, etc.)
   - Added 'theme-' prefix to spacing values
   - Added fontSize configuration from the theme with 'theme-' prefix
   - Preserved existing borderRadius configurations while adding themed versions
5. Added darkMode: 'class' to support proper dark mode toggling
6. Updated globals.css utility classes to reference the new theme- prefixed variables

Challenges encountered and resolved:
- Fixed an issue where the import format of the theme didn't match its export format
- Ensured backward compatibility with existing styles by keeping both the old variable naming scheme and adding the new theme-prefixed variables
- Updated the utility classes in globals.css to use the new theme variable names
- Verified TypeScript compatibility by running the TypeScript compiler, which reported no errors

### Step 5: Define Component API Specifications

1. **Design Components for Reusability:**  
   - Buttons: Support variants (confirm, delete, cancel, etc.).
   - Forms: Single flexible form component supporting text inputs, dropdowns, date fields, toggles, and file uploads.
   - Navigation: A responsive nav bar component.
   - Cards, Progress Bars, Accordions, and Message components should follow similar design guidelines.
2. **Document Props & Variants:**  
   - Create a simple API specification document (can be inline comments) detailing the expected props and behavior for each component.

### Step 6: Incremental Implementation

1. **Begin with Core Components:**  
   - Start with Buttons and Inputs as they are used widely.
2. **Implement Component Wrappers:**  
   - For each component (e.g., `/src/components/ui/button.tsx`), implement a wrapper that uses Shadcn or Tailwind utility classes.
3. **Commit Changes Incrementally:**  
   - After each component implementation, commit with clear commit messages.

### Step 7: Integrate Components into Pages

1. **Select a High-Impact Page (e.g., a Dashboard or Form Screen):**  
   - Replace hardcoded UI elements with the new reusable components.
2. **Test Responsiveness:**  
   - Use browser developer tools to ensure that components adapt to mobile and desktop viewports.
3. **Refactor Incrementally:**  
   - Once a page is stable, move on to the next.

### Step 8: Cleanup & Documentation

1. **Remove Unused Styles:**  
   - After components are integrated, remove any obsolete CSS from the global stylesheet.
2. **Document the New Design System:**  
   - Write documentation on how to use the new UI components and update the centralized theme.
3. **Final Testing:**  
   - Run a full regression test to ensure no disruptions or breakages occur.

---

## Final Note

Proceed with these instructions systematically, ensuring that every change adheres to the global rules and best practices. Once the folder structure and theme are in place, further instructions will cover importing Shadcn components, integrating them with your custom code, and finalizing the refactor for production deployment.



### Alert-message DOCUMENTATION

The AlertMessage component has been implemented to standardize error and success messages across the application. The following instances of alert messages have been found in the codebase and should be updated to use the new component:

1. **Email Notifications Page** (`src/app/dashboard/email/page.tsx`):
   - Success message for email sent
   - Error message for email sending failure
   - Success message for monthly report generation
   - Error message for monthly report generation failure
   - Error message for tenant selection validation

2. **Rent Management Page** (`src/app/dashboard/rent/page.tsx`):
   - Lines 529, 762: Error messages with red background and border
   - Lines 544, 777: Success messages with green background and border
   - These messages appear to be related to rent payment status and updates

3. **Documents Page** (`src/app/dashboard/documents/page.tsx`):
   - Line 136: Error message with red background and border
   - Appears to be related to document upload or processing errors

To update these instances, replace the existing alert markup with the new AlertMessage component:

```tsx
<AlertMessage
  variant="success" // or "error", "info", "warning"
  message="Your message here"
/>
```

The AlertMessage component provides:
- Consistent styling across the application
- Four variants: success, error, info, warning
- Automatic icon selection based on variant
- Proper spacing and responsive design
- Theme-based colors from the centralized theme file 

Note: There are also SetFormErrors on the tenant page that throw errors if the form validation rules are not met (for example "Cannot create a new active lease for Unit OR1B. This unit already has an active lease for tenant veer. Please deactivate the current active lease first." - This pops up in a container that shoudl also be using the set theme and compoennts in alertmessage.tsx) also have "Lease end date must be after start date" etc. All can be using the component. 

### Alert Message Implementation Updates

1. **Component Enhancement**
   - Updated `alert-message.tsx` to use theme variables from `theme.ts`
   - Added automatic scroll-to-top behavior when messages appear
   - Ensured consistent styling across all variants

2. **Theme Integration**
   - Alert colors are now centrally managed in `theme.ts`
   - Colors are referenced using theme variables instead of hardcoded values
   - Makes it easier to maintain and update alert styling across the application

3. **Alert Message Usage Pattern**
   Instead of using direct alert() calls or custom error divs, we now use:
   ```tsx
   const [alertMessage, setAlertMessage] = useState<{
     type: 'success' | 'error' | 'info' | 'warning',
     message: string
   } | null>(null);

   // Show success message
   setAlertMessage({
     type: 'success',
     message: 'Operation completed successfully'
   });

   // Show error message
   setAlertMessage({
     type: 'error',
     message: 'An error occurred'
   });

   // In JSX
   {alertMessage && (
     <AlertMessage
       variant={alertMessage.type}
       message={alertMessage.message}
     />
   )}
   ```

4. **Updated Pages**
   - **Tenants Management Page** (`src/app/dashboard/tenants/page.tsx`):
     - Replaced all alert() calls with AlertMessage component
     - Converted form validation errors to use AlertMessage
     - Added automatic scroll behavior for better UX
     - Locations updated:
       - Lease status toggle messages
       - Lease deletion confirmation/error
       - Form validation errors
       - Template download/upload messages

   - **Rent Management Page** (`src/app/dashboard/rent/page.tsx`):
     - Replaced custom styled alerts with AlertMessage component
     - Consolidated multiple message states into a single alertMessage state
     - Updated locations:
       - Form error messages
       - Success messages for rent recording
       - Rent warning messages (when rent differs from expected)
       - Delete error/success messages

   - **Documents Page** (`src/app/dashboard/documents/page.tsx`):
     - Replaced custom error message styling with AlertMessage
     - Updated error handling for document loading failures

   - **Rental Inventory Page** (`src/app/dashboard/rental-inventory/page.tsx`):
     - Replaced custom alert styling with AlertMessage
     - Updated locations:
       - Form validation errors
       - Upload result notifications
       - Delete confirmation messages
       - Success/error messages for inventory operations

5. **Benefits of the New Implementation**
   - Consistent styling across all alerts
   - Centralized theme management
   - Improved user experience with automatic scrolling
   - Type safety for message variants
   - Easier maintenance and updates
   - Better accessibility with proper ARIA roles (provided by shadcn)
   - Reduced code duplication
   - Standardized error handling across the application
   - IMPORTANT - to change the colours - do so in the alert-message component page, not the theme page. Those values are not useful. 

6. **Future Considerations**
   - Consider adding support for multiple simultaneous alerts
   - Add support for dismissible alerts where appropriate
   - Consider adding support for custom action buttons within alerts
   - Add animation support for alert appearance/disappearance 

   ------- Alert Message summary ---------
   Let's summarize all the changes we've made:
    Created the AlertMessage component with:
        Theme-based styling
        Automatic scroll-to-top behavior
        Four variants: success, error, info, warning
        Consistent styling and icons
    Updated pages to use the AlertMessage component:
        Email Notifications Page
        Rent Management Page
        Documents Page
        Rental Inventory Page
        Tenants Management Page
        Dashboard Page
        WhatsApp Page
    Implemented scroll-to-top behavior:
        Added useEffect in AlertMessage component that scrolls to top when message changes
        This behavior is automatically applied to all pages using the component
    Theme Integration:
        Alert colors are defined in theme.ts
        Colors are referenced using theme variables
        Consistent styling across all alerts




Forms 
I really like the input component - should use that for all my forms instead of custom input boxs 
    npx shadcn@latest add input
use select for drop downs in the forms 
    npx shadcn@latest add select
Test Area is also good, not necessary but good to add for input fields across the differnt pages (email, tables, forms etc)
    npx shadcn@latest add textarea
Tooltip will also be a good addition for buttons that can add more information - essentially a hover text box when placed over something 
    npx shadcn@latest add tooltip
I like scroll area - can use for the dashboard containers with the lease and rent payment. Scoll through each instead of scrolling through the whole page 
    npx shadcn@latest add scroll-area



Maybe worthwhile having TABS for when we update the rent payment interface to handle rent, maintenance, utility, fines etc as all payment inputs - instead of multiple pages, have tabs on the page such that they landlord can toggle on the same page. 
    npx shadcn@latest add tabs



I also like the progress bar - although we only use it in one place, could make a compenent 
    npx shadcn@latest add progress

