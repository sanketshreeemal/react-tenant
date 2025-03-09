# .cursorrules – Tenant Management System

This file contains comprehensive instructions for building a robust, efficient, and secure Tenant Management System for landlords managing multiple properties. The application leverages modern web technologies and best practices for development, testing, deployment, error handling, and analytics/reporting. It is designed to run with minimal supervision and provides a complete, automated workflow from build to deployment.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Feature Specifications](#feature-specifications)
    - [Authentication](#authentication)
    - [Tenant Dashboard](#tenant-dashboard)
    - [Add Tenant](#add-tenant)
    - [Edit Tenant](#edit-tenant)
    - [Lease Management](#lease-management)
    - [Rent Management](#rent-management)
    - [Analytics & Reporting](#analytics--reporting)
    - [Email Notifications](#email-notifications)
    - [WhatsApp Messaging Integration](#whatsapp-messaging-integration)
    - [Google Drive Integration](#google-drive-integration)
5. [UI/UX Design Guidelines](#uiux-design-guidelines)
6. [Build Process & Deployment](#build-process--deployment)
7. [Testing & Quality Assurance](#testing--quality-assurance)
8. [Logging, Error Handling, and Monitoring](#logging-error-handling-and-monitoring)
9. [Conflict Resolution & Git Best Practices](#conflict-resolution--git-best-practices)
10. [Additional Best Practices](#additional-best-practices)

---

## Project Overview

Build a tenant management system that centralizes tenant, lease, and rent data for landlords with multiple properties. The system provides:
- Secure, Google-based authentication.
- A modern, responsive dashboard for managing tenant data.
- Full CRUD operations on tenant, lease, and rent data.
- Historical tracking of tenant leases per unit.
- Robust analytics with beautiful, responsive tables and charts.
- Automated email reporting and WhatsApp messaging capabilities.
- Integration with Google Drive for secure document storage.

---

## Tech Stack

- **Languages & Frameworks:**  
  - TypeScript
  - Next.js (App Router) with React
- **Styling:**  
  - Tailwind CSS (modern, clean, pastel-themed UI with animations and transitions)
- **Backend & Storage:**  
  - Firebase (central database for tenant, lease, and rent information)
  - Google Drive API (for document storage)
- **Authentication & Email:**  
  - Google Authentication (for login/signup)
  - Google SMTP server (for transactional and monthly summary email notifications)
- **Deployment:**  
  - Vercel

---

## Project Structure

Adopt a clear folder structure for maintainability and scalability


---

## Feature Specifications

### Authentication
- **Functionality:**
  - Implement Google authentication using Firebase.
  - Allow landlords to sign up and log in securely.
- **Instructions:**
  - Integrate Firebase Authentication with Google as a provider.
  - Use Next.js middleware for route protection.
  - Utilize secure cookies/sessions for maintaining user state.

### Tenant Dashboard
- **Features & Assets:**
  - Responsive table view listing all tenants across properties.
  - Detailed columns: tenant name, unit number, contact info, lease dates, and historical lease data.
- **Purpose:**
  - Enable landlords to quickly view and analyze tenant data.
- **Instructions:**
  - Use Next.js data fetching methods (Server Components or SWR) as per [Next.js documentation](https://nextjs.org/docs/app/building-your-application/data-fetching).
  - Implement mobile responsiveness with Tailwind’s utilities.
  - Include pagination or infinite scroll for large datasets.

### Add Tenant
- **Features & Assets:**
  - Modern UI form with required fields:
    - Unit Number, First Name, Last Name, Email, Adhaar Number, Phone Number, PAN Number, Current Employer, Permanent Address, Lease Start Date, Lease End Date, Rent Amount, Security Deposit (with payment method options)
    - File upload fields for: Lease Agreement, Adhaar Card copy.
- **Purpose:**
  - Allow landlords to add new tenants and store related data in Firebase.
- **Instructions:**
  - Validate all fields using libraries such as [React Hook Form](https://react-hook-form.com/).
  - Store data in Firebase Firestore.
  - Use Firebase Storage and Google Drive API for document uploads.
  - Implement error handling and UI feedback (loading spinners, toasts).

### Edit Tenant
- **Features & Assets:**
  - Pre-populated form with existing tenant data (editable except unit number).
  - Options for updating tenant data or deleting a record.
  - Confirmation dialogs to prevent accidental deletions.
- **Purpose:**
  - Allow landlords to update or remove tenant records securely.
- **Instructions:**
  - Reuse and modify the Add Tenant form for editing.
  - Use optimistic UI updates and secure deletion flows.

### Lease Management
- **Features & Assets:**
  - **Two Tables:**
    - A master table containing all leases (historical and current).
    - An "Active Leases" table that landlords tag for current leases.
  - **Data Stored:**
    - Lease details including unit number, tenant names, lease start/end dates, rent details, and document links.
- **Purpose:**
  - Maintain a complete record of all leases while enabling focused analytics, messaging, and reporting on active leases.
- **Instructions:**
  - Design database schemas in Firebase to distinguish between historical and active leases.
  - Provide UI filters for landlords to tag and view active leases.
  - Ensure the active leases table is the source for analytics and messaging.

### Rent Management
- **Features & Assets:**
  - Form for entering rent payments:
    - Dropdown for selecting a unit (from active leases).
    - Auto-populate Tenant Name and Official Rent.
    - Fields for Actual Rent Paid, Rental Period (dropdown with a 4-month window before and after the current month), and landlord comments.
  - Dashboard table displaying all rent entries with filtering options by unit number.
- **Purpose:**
  - Enable landlords to record and review rent payments in a structured and responsive manner.
- **Instructions:**
  - Use controlled components for form management.
  - Validate and store rent entries in Firebase.
  - Display the rent entries table using responsive UI components.

### Analytics & Reporting
- **Features & Assets:**
  - **Analytics Page:**
    - Beautiful, responsive tables and charts that display time-series data on:
      - Rent collected over time.
      - Number of occupied vs. vacant units.
      - Estimated foregone rent per month for vacant units.
    - Additional analytics such as occupancy trends, tenant turnover rates, and predictive insights.
- **Purpose:**
  - Provide landlords with actionable insights into property performance and rent trends.
- **Instructions:**
  - Integrate charting libraries (e.g., Chart.js or Recharts) for dynamic data visualization.
  - Use Firebase data queries to populate charts and tables in real time.
  - Ensure charts are fully responsive and intuitive.
  - Create logic to calculate foregone rent for vacant units based on historical rent data.

### Email Notifications
- **Features & Assets:**
  - **Transactional Emails:**
    - Immediate notifications when a new tenant/lease or rent payment is added.
  - **Monthly Summary Report:**
    - On the first of every month, automatically email the landlord a detailed report including:
      - A list of current vs. expired leases.
      - Alerts for tenants paying on expired leases with a reminder to refresh leases.
      - Expected rent income for the month based on occupied vs. vacant units.
      - Additional metrics as per analytics.
- **Purpose:**
  - Keep landlords informed about critical updates and provide monthly performance insights.
- **Instructions:**
  - Use Next.js API routes or Cloud Functions to trigger emails via the Google SMTP server.
  - Secure endpoints and log email events.
  - Automate monthly reports using scheduled functions (e.g., Firebase Cloud Functions with Pub/Sub or cron jobs).

### WhatsApp Messaging Integration
- **Features & Assets:**
  - **Messaging UI:**
    - Intuitive interface for composing, editing, and sending messages.
    - A “Send” button that broadcasts the message to all phone numbers in the active leases table.
  - **Husk of Messaging Logic:**
    - Basic integration logic to simulate WhatsApp messaging reminders for rental dues on the first of every month.
- **Purpose:**
  - Allow landlords to send timely reminders directly to tenants.
- **Instructions:**
  - Create a messaging component that retrieves phone numbers from active leases.
  - Develop a basic messaging API that can be integrated with WhatsApp Business API (or a placeholder service) for sending messages.
  - Include an editing interface on the website for message customization.
  - Log sent messages and provide confirmation notifications to the landlord.

### Google Drive Integration
- **Features & Assets:**
  - Upload and store documents (Lease Agreement, Adhaar Card copy) to a designated Google Drive account.
- **Purpose:**
  - Offload document storage from Firebase while centralizing file management.
- **Instructions:**
  - Use the provided Google Drive API logic.
  - Validate file types and sizes before uploading.
  - Secure authentication and authorization for Google Drive access.

---

## UI/UX Design Guidelines

- **Modern & Clean Design:**
  - Use pastel color palettes with Tailwind CSS.
  - Consistent typography, spacing, and iconography.
- **Responsiveness:**
  - Mobile-first design; test on various screen sizes.
- **Animations & Transitions:**
  - Use subtle animations (hover effects, modal transitions) to enhance user experience.
- **Accessibility:**
  - Follow ARIA guidelines for interactive elements.
  - Ensure proper color contrast and keyboard navigability.
- **Data Visualization:**
  - Use responsive charts and tables that adjust seamlessly to different screen sizes.

---

## Build Process & Deployment

- **Local Development:**
  - Use `npm run dev` (or `yarn dev`) to start the Next.js development server.
  - Leverage ESLint and Prettier for consistent code quality.
- **Build & Test:**
  - Run `npm run build` to generate a production build.
  - Execute unit and integration tests using Jest and React Testing Library.
  - Optionally implement E2E tests using Cypress.
- **Deployment:**
  - Deploy on Vercel with environment variables (Firebase credentials, Google API keys, SMTP credentials) configured securely.
  - Enable automatic deployments on push to the main branch.
- **Continuous Integration:**
  - Set up GitHub Actions (or similar CI/CD pipelines) to run tests, lint checks, and build scripts on each pull request.
- **Security:**
  - Regularly audit dependencies.
  - Use HTTPS, secure cookies, and proper input sanitization.
  - Apply rate limiting on API routes.

---

## Testing & Quality Assurance

- **Unit Testing:**
  - Write comprehensive tests for all components, utilities, and API endpoints with Jest.
- **Integration Testing:**
  - Use React Testing Library to simulate user interactions and validate workflows.
- **End-to-End Testing:**
  - Use Cypress for critical user flows (authentication, data entry, notifications, messaging).
- **Code Coverage:**
  - Aim for high test coverage and integrate coverage reporting into CI.
- **Error Simulation:**
  - Test failure cases (API errors, network timeouts) to ensure graceful error handling and user feedback.

---

## Logging, Error Handling, and Monitoring

- **Logging:**
  - Implement a logging utility (e.g., Winston or custom logger) for client and server logs.
  - Log critical errors and user actions.
- **Error Handling:**
  - Use try/catch blocks and global error boundaries in React.
  - Provide clear, actionable error messages via toasts or modals.
- **Monitoring:**
  - Integrate monitoring tools (e.g., Sentry) to track runtime errors and performance issues.
  - Set up alerts for production-critical issues.

---

## Conflict Resolution & Git Best Practices

- **Branching Strategy:**
  - Adopt Git Flow or a similar model:
    - `main` for production-ready code.
    - `develop` for integration.
    - Feature branches for new features/bug fixes.
- **Commit Messages:**
  - Follow Conventional Commits (e.g., `feat:`, `fix:`, `docs:`).
- **Code Reviews:**
  - Mandate pull requests with thorough reviews.
- **Merge Conflicts:**
  - Regularly sync with `develop` to minimize conflicts.
- **Documentation:**
  - Keep this file and README.md updated with process or architecture changes.

---

## Additional Best Practices

- **Performance Optimization:**
  - Lazy-load components and optimize assets with Next.js image optimization.
- **Developer Experience:**
  - Write clear inline comments and maintain detailed documentation.
  - Enable TypeScript strict mode to catch errors early.
- **Security Audits:**
  - Regularly review Firebase security rules and API authorizations.
  - Manage environment variables securely.
- **Automation:**
  - Automate build, test, and deployment processes to minimize manual intervention.
- **Scalability:**
  - Design the system with scalability in mind (e.g., modular components, efficient data queries).

---

By following these comprehensive instructions, your Tenant Management System will be built on a solid foundation of best practices. This design ensures a smooth build process, robust testing, secure deployments, detailed analytics and reporting, and automated notifications and messaging—all aimed at providing an exceptional user experience for landlords.



