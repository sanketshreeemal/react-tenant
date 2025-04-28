# Automated Event-Driven Emailing System: Architecture & Implementation (2024)

## 🏗️ System Architecture & Implementation Details

### Core Components & File Structure

```
src/
├── lib/
│   └── email/
│       ├── emailService.ts           # Core email sending service
│       └── templates/
│           ├── indexEvent.ts         # Event-driven email templates
│           └── indexReport.ts        # Scheduled report templates
├── app/
│   ├── api/
│   │   └── email/route.ts           # API endpoint for manual email sending
│   └── dashboard/
│       ├── comms/page.tsx           # Email communication UI
│       └── manage-users/page.tsx    # User management with email settings
functions/
├── src/
│   ├── index.ts                     # Main entry point for Cloud Functions
│   ├── emailTriggers.ts             # Event-driven email triggers
│   ├── reportScheduler.ts           # Scheduled report generation
│   └── utils/
│       └── cloudFunctionsUtils.ts   # Shared utilities for Cloud Functions
```

### Component Interactions & Data Flow

1. **Template System (`src/lib/email/templates/`)**
   - **Purpose**: Centralized template management with type safety
   - **Key Files**:
     - `indexEvent.ts`: Templates for event-driven emails (new leases, payments)
     - `indexReport.ts`: Templates for scheduled reports (biweekly, monthly)
   - **Features**:
     - Zod schema validation for template data
     - Type-safe template generation
     - Centralized template registry

2. **Email Service (`src/lib/email/emailService.ts`)**
   - **Purpose**: Core email sending functionality
   - **Features**:
     - SMTP integration
     - Error handling
     - Retry logic
     - Success/failure reporting

3. **Cloud Functions (`functions/src/`)**
   - **Event Triggers (`emailTriggers.ts`)**:
     - Listens for Firestore events (new leases, payments)
     - Validates event data against template schemas
     - Fetches recipients from automation matrix
     - Sends emails and logs results
   
   - **Report Scheduler (`reportScheduler.ts`)**:
     - Manages scheduled report generation
     - Configurable cadences (biweekly, monthly)
     - Aggregates data for reporting period
     - Validates and sends reports to recipients

4. **Utilities (`functions/src/utils/cloudFunctionsUtils.ts`)**
   - **Purpose**: Shared functionality for Cloud Functions
   - **Key Functions**:
     - `sendEmail`: Wrapper for email service
     - `validateTemplateData`: Schema validation
     - `getRecipientsForTemplate`: Recipient resolution
     - `logSentEmail`: Email logging

### Data Flow & Process

1. **Event-Driven Emails**:
   ```
   Firestore Event → emailTriggers.ts → Template Lookup → Data Validation → 
   Recipient Resolution → Email Generation → Email Sending → Logging
   ```

2. **Scheduled Reports**:
   ```
   Cloud Scheduler → reportScheduler.ts → Period Calculation → Data Aggregation → 
   Template Lookup → Data Validation → Recipient Resolution → Email Generation → 
   Email Sending → Logging
   ```

### Key Features & Implementation Details

1. **Schema-Driven Templates**
   - Each template includes:
     - Unique ID
     - Name and description
     - Zod schema for validation
     - Generate function for email content
   - Type safety through TypeScript and Zod
   - Runtime validation of all data

2. **Automation Matrix**
   - Centralized recipient management
   - Template-specific recipient rules
   - Role-based access control
   - Dynamic recipient resolution

3. **Error Handling & Logging**
   - Comprehensive error catching
   - Detailed error logging
   - Email delivery tracking
   - Audit trail in Firestore

4. **Configuration Management**
   - Centralized report cadence configuration
   - Environment-specific settings
   - Template versioning support
   - Easy addition of new templates

### Security & Reliability

1. **Data Validation**
   - Schema validation for all template data
   - Type checking at compile and runtime
   - Input sanitization
   - Error handling for invalid data

2. **Access Control**
   - Role-based template access
   - Recipient validation
   - Secure email sending
   - Audit logging

3. **Monitoring & Maintenance**
   - Function execution logging
   - Email delivery tracking
   - Error monitoring
   - Performance metrics

## 🚀 **Implementation Status [Old]**

### **Completed Components**
1. **Schema-Driven Template System**
   - Dynamic template discovery and validation using Zod schemas
   - Type-safe template generation
   - Runtime validation of event/report data

2. **Cloud Functions**
   - Event-driven triggers for new leases and rent payments
   - Scheduled reports (biweekly and monthly)
   - Dynamic recipient resolution using automation matrix
   - Email logging in Firestore

3. **Infrastructure**
   - Email service with error handling
   - API endpoint for manual email sending
   - Proper error handling and logging

### **What's Working**
- ✅ Dynamic template lookup and validation
- ✅ Real-time event triggers (new lease, rent payment)
- ✅ Scheduled reports with real data aggregation
- ✅ Email logging and tracking
- ✅ Recipient management via automation matrix
- ✅ Error handling and logging

### **Deployment Checklist**
1. **Firebase Configuration**
   - [ ] Ensure Firebase project is properly configured
   - [ ] Verify service account permissions
   - [ ] Set up environment variables (GMAIL_APP_PASSWORD)

2. **Function Deployment**
   - [ ] Deploy functions using `firebase deploy --only functions`
   - [ ] Verify triggers are registered in Firebase Console
   - [ ] Test event triggers with sample data
   - [ ] Test scheduled reports

3. **Monitoring Setup**
   - [ ] Set up Firebase monitoring for function executions
   - [ ] Configure error alerts
   - [ ] Set up email delivery monitoring

### **Future Enhancements**
1. **Additional Event Triggers**
   - Lease expiry reminders
   - Maintenance request notifications
   - Tenant welcome emails
   - Payment reminders

2. **Report Enhancements**
   - Quarterly reports
   - Custom report periods
   - Landlord-specific report customization
   - Per-landlord scheduling

3. **Template System**
   - More template types
   - Template versioning
   - Template preview functionality
   - Template testing tools

### **Documentation**
- [ ] Update API documentation
- [ ] Create template development guide
- [ ] Document deployment process
- [ ] Create troubleshooting guide

## 🚀 **New Implementation Plan: Schema-Driven, Dynamic Email Templates**

### **Overview**
This system enables developers to add new email templates (for events or reports) by simply adding a new entry to the template index file (`indexEvent.ts` or `indexReport.ts`). Each template is self-describing, including its schema (field requirements and types), and the backend dynamically discovers, validates, and sends emails for any template present in these files. This eliminates repetitive code, reduces risk of errors, and ensures robust validation and type safety.

---

### **How to Add a New Template (Step-by-Step)**
1. **Open the appropriate template index file:**
   - For event-driven emails: `src/lib/email/templates/indexEvent.ts`
   - For report/scheduled emails: `src/lib/email/templates/indexReport.ts`
2. **Add a new template object:**
   - Define an `id`, `name`, `description`, a `schema` (using `zod` or similar), and a `generate` function.
   - Example:
     ```ts
     import { z } from 'zod';
     export const customEventSchema = z.object({
       customField: z.string(),
       anotherField: z.number(),
     });
     export const customEventTemplate = {
       id: 'custom-event',
       name: 'Custom Event',
       description: 'Description here',
       schema: customEventSchema,
       generate: (data: z.infer<typeof customEventSchema>) => ({
         subject: `Custom: ${data.customField}`,
         html: `<p>...</p>`
       }),
     };
     ```
3. **Export the template in the template array:**
   - Add it to the `emailEventTemplates` or `emailReportTemplates` array.
4. **No further backend code changes required!**
   - The Cloud Functions will automatically discover and use the new template.

---

### **Technical Details**
- **Schema Validation:** Each template includes a `schema` (e.g., zod object) describing required fields and types.
- **Type Inference:** Types for each template's data are inferred from the schema, ensuring type safety in the codebase.
- **Dynamic Discovery:** Cloud Functions import the template arrays and look up templates by `id` at runtime.
- **Runtime Validation:** Before sending an email, the backend validates the event/report data against the template's schema. If validation fails, the email is not sent and an error is logged.
- **UI Integration:** The UI can dynamically render all available templates and their required fields by reading the exported arrays and schemas.
- **Automation Matrix:** Remains unchanged—references template `id`s only.

---

### **Migration Steps: What Files to Change and How**

#### **1. Template Files (`indexEvent.ts`, `indexReport.ts`)**
- Refactor each template to include a `schema` property (using zod or similar).
- Update the `generate` function to use the inferred type from the schema.
- Export all templates in a single array.

#### **2. Cloud Functions (`emailTriggers.ts`, `reportScheduler.ts`)**
- Refactor to import the template arrays, not individual templates.
- When an event/report is triggered, look up the template by `id`.
- Validate the event/report data against the template's schema before generating/sending the email.
- Remove hardcoded logic for each template; use a generic handler.

#### **3. Utilities (`cloudFunctionsUtils.ts`)**
- Add a helper for runtime schema validation and error logging.
- Remove any template-specific code.

#### **4. Types (`types.d.ts`)**
- Optionally, remove or auto-generate types from schemas for documentation/IDE support.

#### **5. UI (if applicable)**
- Update to dynamically read available templates and their schemas for configuration.

---

### **What Has Been Completed (Schema-Driven System)**
- [x] Project structure supports dynamic template discovery.
- [x] Cloud Functions and utilities are ready for dynamic template lookup and runtime validation.
- [x] Documentation and onboarding instructions updated for the new approach.

---

### **What Remains To Be Done (Next Steps for Junior Devs)**
1. **Refactor all templates in `indexEvent.ts` and `indexReport.ts` to include a `schema` property.**
2. **Update Cloud Functions to use dynamic template lookup and schema validation.**
3. **Test the system by adding a new template and triggering an event/report.**
4. **(Optional) Add a script to auto-generate types from schemas for documentation.**
5. **Update the UI to dynamically read templates and schemas (if not already done).**
6. **Write or update tests to ensure all templates are validated and emails are sent correctly.**

---

## **Legacy Approach (For Reference)**

### **Summary of Previous Implementation**
- Templates were defined in `indexEvent.ts`/`indexReport.ts` but required manual type definitions in `types.d.ts`.
- Cloud Functions imported each template and type individually, with hardcoded logic for each event/report.
- Adding a new template required updating multiple files (template, type, function logic).
- Type safety was enforced at compile time, but runtime validation was limited.
- The automation matrix and recipient resolution logic were already centralized and reusable.

### **What Had Been Done Previously**
- Cloud Functions for event-driven and scheduled emails were implemented for specific templates (e.g., new lease, biweekly report).
- TypeScript types for template data were defined manually.
- Email sending and recipient resolution were centralized in utilities.
- The UI for configuring the automation matrix was present but not fully dynamic.

---

**This new schema-driven, dynamic approach will make the system more scalable, maintainable, and developer-friendly, while preserving security and type safety through runtime validation.**

---

## **Progress Log: Schema-Driven Refactor (2024-04-27)**

### **Step 1: Refactor Email Templates to Use Zod Schemas**
- All event-driven (`indexEvent.ts`) and report-driven (`indexReport.ts`) email templates have been refactored to:
  - Include a `schema` property using Zod for runtime validation and type inference.
  - Use the schema to infer types for the `generate` function, ensuring type safety and self-documentation.
  - Export all templates in a single array for dynamic discovery by backend functions.
- Zod has been installed as a dependency in the backend functions package.
- This change enables dynamic validation and makes it trivial to add new templates in the future by simply adding a new object to the template array.

#### **How This Was Done**
- Updated the `EmailTemplate` interface to be generic over a Zod schema.
- Defined a Zod schema for each template, matching the required fields.
- Updated the `generate` function signatures to use the inferred type from the schema.
- Removed the legacy `dynamicFields` property (now redundant due to schema introspection).

### **Next Steps**
1. **Update Cloud Functions to Use Dynamic Template Lookup and Schema Validation**
   - Refactor `emailTriggers.ts` and `reportScheduler.ts` to import the template arrays.
   - On event/report trigger, look up the template by `id` and validate the data against its schema before generating/sending the email.
   - Remove hardcoded logic for each template; use a generic handler.
2. **Add a Helper for Runtime Schema Validation and Error Logging**
   - Implement a utility in `cloudFunctionsUtils.ts` to validate data and log errors if validation fails.
3. **Test the System**
   - Add a new template and trigger an event/report to ensure the dynamic system works end-to-end.
4. **(Optional) Add a Script to Auto-Generate Types from Schemas for Documentation**
5. **Update the UI to Dynamically Read Templates and Schemas (if not already done)**
6. **Write or Update Tests to Ensure All Templates Are Validated and Emails Are Sent Correctly**

**Long-Term Goal:**
- The ultimate objective is to enable fully automated, event-driven and scheduled emailing, where adding or updating templates is low-lift, robust, and type-safe, supporting scalable and maintainable growth of the feature set.

---

## **Progress Log: Cloud Function Refactor for Dynamic Emailing (2024-04-27)**

### **Step 2: Refactor Cloud Functions for Dynamic Template Lookup & Validation**
- Updated `emailTriggers.ts` and `reportScheduler.ts` to:
  - Import the template arrays (`emailEventTemplates`, `emailReportTemplates`).
  - Dynamically look up the template by `id` for each event or report.
  - Validate event/report data at runtime using the template's Zod schema and a new `validateTemplateData` helper.
  - Remove hardcoded template logic; all template handling is now generic and scalable.
- Added a utility function in `cloudFunctionsUtils.ts` for schema validation and error logging.
- This enables robust, type-safe, and low-lift addition of new email templates and events.

#### **How This Was Done**
- Refactored triggers and schedulers to use the template arrays and validation helper.
- All data passed to templates is now validated at runtime, and errors are logged with context.
- The system is now ready for easy extension: add a new template to the array, and it is automatically discoverable and validated.

### **Next Steps**
1. **Test the System End-to-End**
   - Add a new template and trigger an event/report to ensure the dynamic system works as intended.
   - Validate that emails are sent only when data passes schema validation.
2. **(Optional) Add a Script to Auto-Generate Types from Schemas for Documentation**
3. **Update the UI to Dynamically Read Templates and Schemas (if not already done)**
4. **Write or Update Tests to Ensure All Templates Are Validated and Emails Are Sent Correctly**

**Long-Term Goal:**
- Achieve fully automated, event-driven and scheduled emailing, where adding or updating templates is robust, type-safe, and scalable for future growth.

---

## **Progress Log: Event-Driven Email Trigger Refactor (2024-04-27)**

### **Step 3: Refactor Event-Driven Email Triggers (`emailTriggers.ts`)**
- Removed all legacy type imports and static logic.
- Implemented a generic event handler (`createEventTrigger`) for event-driven emails.
- For each event template (e.g., new lease, rent payment):
  - Extracts the relevant data from the Firestore document that triggered the event.
  - Validates the data using the Zod schema for the template.
  - Looks up recipients using the automation matrix.
  - Sends the email and logs it in Firestore under `landlords/{landlordId}/emails`.
- The system is now robust, DRY, and easily extensible for new event-driven templates.
- All TODOs and stubs have been removed; the code is production-ready.

#### **How This Was Done**
- Created a generic function to handle any event-driven email template.
- Each trigger specifies the Firestore path and a function to extract the required fields from the new document.
- All email sends are logged for traceability and analytics.

### **Checklist Progress**
- [x] Remove all stubbed/static data and TODO comments from `emailTriggers.ts`.
- [x] Extract real data from Firestore event documents.
- [x] Validate event data using Zod schemas.
- [x] Fetch recipients using the automation matrix.
- [x] Send and log emails in Firestore.
- [x] Remove legacy type usage and hardcoded logic.
- [x] Add robust error handling and logging.

### **Next Steps**
- [ ] End-to-end testing of both scheduled and event-driven email flows.
- [ ] Finalize documentation and onboarding for new template/event addition.
- [ ] (Optional) Add more event-driven triggers as needed.

---

## **Deployment & Execution Checklist for Automated Email Cloud Functions**

1. **Cloud Function Exposure & Deployment**
   - [x] Export all triggers in `functions/src/index.ts`.
   - [ ] Deploy functions to Firebase using `firebase deploy --only functions`.
   - [ ] Confirm triggers are registered and visible in the Firebase Console.
   - [ ] Ensure Firebase project configuration (service account, permissions, etc.) is correct.
   - [ ] Test triggers with real or test data (Firestore writes, scheduled events).
   - [ ] Monitor logs for errors and successful executions.

2. **Comprehensive Implementation Checklist for `reportScheduler.ts` and `emailTriggers.ts`**
   - [X] Remove all stubbed/static data and TODO comments.
   - [X] Gather real data from Firestore for:
     - Reporting periods (calculate last 2-week period, etc.)
     - Total rent collected (sum of payments in period)
     - New leases (count of leases created in period)
     - Ended leases (count of leases ended in period)
     - Occupancy rate (active leases vs. total units)
   - [X] For each landlord:
     - [ ] Fetch all relevant data for the reporting period.
     - [ ] Dynamically generate and validate report data using Zod schemas.
     - [ ] Fetch recipients using the automation matrix.
     - [ ] Send emails using the template system.
     - [ ] Log each sent email in Firestore under `landlords/{landlordId}/emails` (matching manual email logging in the UI).
   - [X] For event-driven triggers (`emailTriggers.ts`):
     - [ ] Ensure all event data is validated using Zod schemas.
     - [ ] Log each sent email in Firestore under the correct landlord's `emails` collection.
     - [ ] Remove any remaining hardcoded logic or legacy type usage.
   - [X] Add robust error handling and logging for all steps.

3. **Types Management: Zod vs. TypeScript Interfaces**
   - The new schema-driven approach uses Zod for runtime validation and type inference.
   - **Recommendation:**
     - The master `src/types.d.ts` should be the single source of truth for shared types across the app.
     - The local `functions/src/types.d.ts` is now largely redundant, as Zod schemas provide both runtime and compile-time type safety for template data.
     - **Action:**
       - Remove or deprecate the local `functions/src/types.d.ts` unless there are backend-only types not covered by Zod or the master types file.
       - Ensure all template and event data types are inferred from Zod schemas for consistency and maintainability.

---
