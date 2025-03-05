# Tenant Management System - Testing Guide

This document provides a comprehensive testing plan for the Tenant Management System. It covers all major features, edge cases, and integration points to ensure the application functions correctly and reliably.

## Table of Contents

1. [Setup and Prerequisites](#setup-and-prerequisites)
2. [Authentication Testing](#authentication-testing)
3. [Tenant Dashboard Testing](#tenant-dashboard-testing)
4. [Tenant Management Testing](#tenant-management-testing)
5. [Lease Management Testing](#lease-management-testing)
6. [Rent Management Testing](#rent-management-testing)
7. [Analytics & Reporting Testing](#analytics--reporting-testing)
8. [Email Notifications Testing](#email-notifications-testing)
9. [WhatsApp Messaging Testing](#whatsapp-messaging-testing)
10. [Google Drive Integration Testing](#google-drive-integration-testing)
11. [Responsive Design Testing](#responsive-design-testing)
12. [Performance Testing](#performance-testing)
13. [Security Testing](#security-testing)
14. [Accessibility Testing](#accessibility-testing)

## Setup and Prerequisites

Before beginning the testing process, ensure you have:

1. Cloned the repository and installed all dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in a `.env.local` file:
   ```
   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Email
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@example.com
   EMAIL_PASSWORD=your_password
   EMAIL_FROM=noreply@example.com
   
   # Google Drive (for testing actual integration)
   GOOGLE_DRIVE_CLIENT_ID=your_client_id
   GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
   ```

3. Started the development server:
   ```bash
   npm run dev
   ```

4. Opened the application in your browser at [http://localhost:3000](http://localhost:3000)

## Authentication Testing

### Test Cases

1. **User Registration**
   - Navigate to the registration page
   - Test with valid credentials (should succeed)
   - Test with invalid email format (should show error)
   - Test with weak password (should show error)
   - Test with existing email (should show error)

2. **User Login**
   - Navigate to the login page
   - Test with valid credentials (should succeed)
   - Test with invalid email (should show error)
   - Test with incorrect password (should show error)
   - Test with non-existent account (should show error)

3. **Google Authentication**
   - Click "Sign in with Google" button
   - Complete Google authentication flow
   - Verify successful redirect back to the application
   - Verify user information is correctly displayed

4. **Password Reset**
   - Navigate to the password reset page
   - Enter a valid email (should send reset email)
   - Enter an invalid email (should show error)
   - Enter a non-existent email (should still show success message for security)

5. **Session Management**
   - Log in and verify session persistence across page refreshes
   - Test session timeout (if implemented)
   - Verify protected routes are inaccessible without authentication

6. **Logout**
   - Click logout button
   - Verify redirect to login page
   - Verify protected routes are no longer accessible

## Tenant Dashboard Testing

### Test Cases

1. **Dashboard Loading**
   - Log in and navigate to the dashboard
   - Verify all tenant data loads correctly
   - Verify loading states are displayed appropriately

2. **Data Display**
   - Verify tenant information is displayed correctly
   - Verify pagination works (if implemented)
   - Verify sorting functionality (if implemented)
   - Verify filtering functionality (if implemented)

3. **Responsive Layout**
   - Test dashboard on desktop, tablet, and mobile viewports
   - Verify all information is accessible on smaller screens
   - Verify interactive elements are usable on touch devices

4. **Empty State**
   - Test dashboard with no tenant data
   - Verify appropriate empty state message is displayed
   - Verify call-to-action for adding tenants is present

## Tenant Management Testing

### Test Cases

1. **Add Tenant Form**
   - Navigate to the add tenant form
   - Verify all required fields are marked as such
   - Test with all fields filled correctly (should succeed)
   - Test with missing required fields (should show errors)
   - Test with invalid data formats (should show errors)
   - Test file uploads for lease agreement and Adhaar card

2. **Edit Tenant**
   - Navigate to edit tenant form for an existing tenant
   - Verify form is pre-populated with correct data
   - Test updating various fields (should save correctly)
   - Verify unit number field is non-editable
   - Test with invalid data (should show errors)

3. **Delete Tenant**
   - Attempt to delete a tenant
   - Verify confirmation dialog appears
   - Test cancellation (should not delete)
   - Test confirmation (should delete and redirect)
   - Verify tenant no longer appears in dashboard

4. **Validation Rules**
   - Test phone number validation (format, length)
   - Test email validation
   - Test Adhaar number validation
   - Test PAN number validation
   - Test date validations (lease start/end dates)

## Lease Management Testing

### Test Cases

1. **Master Lease Table**
   - Verify all historical leases are displayed
   - Test sorting and filtering options
   - Verify lease details are accurate

2. **Active Leases Table**
   - Verify only active leases are displayed
   - Test tagging a lease as active/inactive
   - Verify changes reflect immediately in the UI

3. **Lease Details**
   - Verify all lease information is displayed correctly
   - Test viewing associated documents
   - Verify tenant information is linked correctly

4. **Lease Expiry**
   - Test display of soon-to-expire leases
   - Verify expiry notifications/indicators
   - Test filtering by expiry date range

## Rent Management Testing

### Test Cases

1. **Rent Payment Form**
   - Navigate to the rent payment form
   - Test unit selection dropdown (should populate tenant info)
   - Verify official rent amount auto-populates
   - Test entering actual rent paid
   - Test selecting rental period
   - Test adding landlord comments
   - Submit with valid data (should succeed)
   - Submit with invalid data (should show errors)

2. **Rent History Table**
   - Verify all rent entries are displayed
   - Test filtering by unit number
   - Test sorting by date, amount, etc.
   - Verify calculations for total rent collected

3. **Rent Discrepancies**
   - Test entering actual rent less than official rent
   - Verify discrepancy is highlighted
   - Test entering actual rent more than official rent
   - Verify overpayment is highlighted

4. **Rental Period Selection**
   - Test selecting current month
   - Test selecting past months (within 4-month window)
   - Test selecting future months (within 4-month window)
   - Test selecting outside the allowed window (should prevent selection)

## Analytics & Reporting Testing

### Test Cases

1. **Charts and Visualizations**
   - Verify rent collection chart displays correctly
   - Verify occupancy chart displays correctly
   - Verify foregone rent chart displays correctly
   - Test time period selection (if implemented)
   - Test data point interactions (tooltips, etc.)

2. **Data Accuracy**
   - Verify calculations for total rent collected
   - Verify calculations for occupancy rates
   - Verify calculations for foregone rent
   - Cross-check with raw data to ensure accuracy

3. **Responsive Charts**
   - Test charts on different screen sizes
   - Verify charts are readable on mobile devices
   - Verify interactive elements work on touch devices

4. **Export Functionality**
   - Test exporting reports (if implemented)
   - Verify exported data matches displayed data
   - Test different export formats (PDF, CSV, etc.)

## Email Notifications Testing

### Test Cases

1. **Transactional Emails**
   - Add a new tenant and verify notification email is sent
   - Add a new lease and verify notification email is sent
   - Record a rent payment and verify notification email is sent
   - Verify email content is correct and formatted properly

2. **Monthly Summary Report**
   - Trigger the monthly summary report manually
   - Verify email is sent to the landlord
   - Verify report contains current vs. expired leases
   - Verify report contains alerts for tenants on expired leases
   - Verify report contains expected rent income calculations
   - Verify email formatting and readability

3. **Email Error Handling**
   - Test with invalid email configuration
   - Verify appropriate error messages are displayed
   - Verify application continues to function despite email errors

4. **Email Templates**
   - Verify all email templates render correctly
   - Test with various data scenarios
   - Check for responsive email design

## WhatsApp Messaging Testing

### Test Cases

1. **WhatsApp Demo Page**
   - Navigate to `/whatsapp-demo`
   - Verify the page loads correctly
   - Test adding valid phone numbers
   - Test adding invalid phone numbers (should show error)
   - Test removing phone numbers from the list

2. **Message Composition**
   - Test entering a message
   - Test with empty message (should show error)
   - Verify character count/limits (if implemented)

3. **Message Sending**
   - Test sending to a single recipient
   - Test sending to multiple recipients
   - Verify success/failure messages
   - Test error handling for failed messages

4. **Mock API Integration**
   - Verify the mock API correctly simulates message sending
   - Test various response scenarios (success, partial success, failure)
   - Verify the UI correctly handles all response types

## Google Drive Integration Testing

### Test Cases

1. **Drive Demo Page**
   - Navigate to `/drive-demo`
   - Verify the page loads correctly
   - Test entering mock access token
   - Test entering mock folder ID (optional)

2. **File Upload**
   - Test selecting files of different types (PDF, images, etc.)
   - Test with valid files (should upload successfully)
   - Test with invalid files (if restrictions are implemented)
   - Verify upload progress indicator works
   - Verify success message and file link

3. **File Listing**
   - Verify files are listed correctly
   - Test with empty folder (should show empty state)
   - Verify file metadata is displayed correctly
   - Test file type icons/indicators

4. **Mock API Integration**
   - Verify the mock API correctly simulates Google Drive operations
   - Test various response scenarios (success, failure)
   - Verify the UI correctly handles all response types

5. **Real API Integration (if configured)**
   - Test with actual Google credentials
   - Verify files are actually uploaded to Google Drive
   - Verify files can be accessed via the provided links

## Responsive Design Testing

### Test Cases

1. **Desktop Layout**
   - Test on large screens (1920x1080 and above)
   - Verify all elements are properly sized and positioned
   - Check for any overflow or alignment issues

2. **Tablet Layout**
   - Test on medium screens (768px to 1024px)
   - Verify responsive design adjustments
   - Test touch interactions
   - Verify all functionality remains accessible

3. **Mobile Layout**
   - Test on small screens (320px to 767px)
   - Verify mobile-specific layouts
   - Test touch interactions
   - Verify all functionality remains accessible
   - Test navigation menu/hamburger menu

4. **Orientation Changes**
   - Test switching between portrait and landscape
   - Verify layout adjusts appropriately
   - Verify no content is lost during orientation change

## Performance Testing

### Test Cases

1. **Page Load Times**
   - Measure initial page load time
   - Measure navigation between pages
   - Test with cache cleared vs. with cache

2. **Data Loading**
   - Test loading large datasets
   - Verify pagination or infinite scroll performance
   - Measure time to display data after API response

3. **Form Submission**
   - Measure time to validate and submit forms
   - Verify UI responsiveness during submission
   - Test with slow network conditions

4. **Animation Smoothness**
   - Verify transitions and animations run at 60fps
   - Test on lower-end devices
   - Check for any jank or stuttering

## Security Testing

### Test Cases

1. **Authentication Security**
   - Test for session fixation vulnerabilities
   - Verify CSRF protection
   - Test password strength requirements
   - Verify secure cookie settings

2. **API Security**
   - Verify all API endpoints require authentication
   - Test for injection vulnerabilities
   - Verify proper error handling (no sensitive info leaked)

3. **File Upload Security**
   - Test uploading malicious file types
   - Verify file type validation
   - Test for path traversal vulnerabilities

4. **Data Protection**
   - Verify sensitive data is not exposed in client-side code
   - Test for insecure direct object references
   - Verify proper access controls

## Accessibility Testing

### Test Cases

1. **Keyboard Navigation**
   - Test navigating the entire application using only keyboard
   - Verify focus states are visible
   - Verify logical tab order
   - Test all interactive elements can be activated with keyboard

2. **Screen Reader Compatibility**
   - Test with screen readers (NVDA, VoiceOver, etc.)
   - Verify all content is announced correctly
   - Verify form labels and error messages are accessible

3. **Color Contrast**
   - Verify text meets WCAG AA contrast requirements
   - Test with color blindness simulators
   - Verify information is not conveyed by color alone

4. **ARIA Attributes**
   - Verify proper use of ARIA roles and attributes
   - Test dynamic content updates with live regions
   - Verify modal dialogs are properly implemented

## Reporting Issues

When reporting issues found during testing, please include:

1. **Test Case Reference**: Which test case from this document was being performed
2. **Environment**: Browser, device, screen size, etc.
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Expected Behavior**: What should have happened
5. **Actual Behavior**: What actually happened
6. **Screenshots/Videos**: Visual evidence of the issue if possible
7. **Console Errors**: Any errors from the browser console

## Test Tracking

Use the following format to track test results:

```
| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| AUTH-1  | User Registration | PASS/FAIL | Any observations |
```

Happy testing! 

## Unit and Lease Data Integrity Testing

This section focuses on testing the data integrity between units and leases, particularly around the unitNumber field and validation rules.

### Test Cases

1. **Unit Number Storage in Leases**
   - Add a new lease for an existing unit
   - Verify the unitNumber field is correctly stored in the lease document
   - Query the lease and confirm both unitId and unitNumber are present
   - Verify the unitNumber matches the actual unit number from the rental inventory

2. **Unit Existence Validation**
   - Attempt to create a lease for a non-existent unit ID
   - Verify an appropriate error message is displayed
   - Confirm no lease document is created in the database
   - Try the same with a unit ID that was recently deleted
   - Verify the system correctly prevents lease creation

3. **Unit Deletion Impact**
   - Create a lease for an existing unit
   - Delete the unit from the rental inventory
   - Verify existing leases still maintain their unitNumber field
   - Attempt to create a new lease for the deleted unit
   - Verify the system prevents creation with an appropriate error

4. **Unit Number Display Consistency**
   - Create multiple leases for the same unit
   - Verify all leases display the same unitNumber
   - Update a unit's details (but not the unitNumber)
   - Verify all associated leases still display the correct unitNumber

5. **Form Validation for Unit Selection**
   - Open the lease creation form
   - Leave the unit selection empty and attempt to submit
   - Verify the form shows an error message for the required unit
   - Select a valid unit and verify the form proceeds

6. **Edge Cases**
   - Test with a very large number of units in the rental inventory
   - Verify unit selection dropdown performs well
   - Test with units that have similar or duplicate unit numbers (if allowed)
   - Verify the system correctly distinguishes between them using unitId

7. **Data Migration Testing**
   - If applicable, test migration scripts that add unitNumber to existing leases
   - Verify all existing leases are correctly updated with their corresponding unitNumber
   - Check for any leases that couldn't be migrated (orphaned leases)

8. **Downstream Impact**
   - Create a lease with the unitNumber field
   - Create a rent payment record for this lease
   - Verify the rent payment correctly references both the lease and the unit
   - Generate reports that use the unitNumber field
   - Verify all reports display the correct unit information

When reporting issues related to unit and lease data integrity, include:
1. The specific test case that failed
2. The expected unitNumber and unitId values
3. The actual values stored in the database
4. Any error messages displayed to the user
5. Screenshots of the form or error state 