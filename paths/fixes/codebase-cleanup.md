Goal is to clean up the code base - remove any temporary or unused files. 
Following a systematic approach to clean-up:
    Check if the following files / functions in these files / features are being imported somewhere in the application. If they are not being imported, make sure there are no dependencies and delete them. If they are being imported somewhere, flag what files they are beign imported inside and if the imports are being used. Update this documentation with those detials and awat further instructions. 
    If a fiel and imports are not being used, their routes not being imported etc and are safe to delete with zero impact to the application, mark what other files need to be adjusted - such as packages in package.json may have to be adjusted to remove technical bloat from unused features or packages etc. 


    1. Used to have a feature that allows a user to download and upload excel files with data that is then written into the application backend - that feature has been depricated and removed from the fron-end. Need to clean up the files and depdendencies that were built out to make those features work. 
        Example files - 
            in src/app/lib/excelUtils
            in src/app/api/inventory-excel/download-template/route.ts
            in src/app/api/inventory-excel/upload/route.ts
            in src/app/api/tenant-excel/download-template/route.ts
            in src/app/api/tenant-excel/upload/route.ts

    2. Whatsapp Integration was planned and attemped but ultimately not executed. 
        in src/app/lib/whatsapp/messageUtils.ts
        in src/app/api/whatsapp/send/route.ts
        in src/app/api/whatsapp/status/route.ts
        ACTION: These files were confirmed unused and have been deleted.

 

        **Summary of Actions Taken (Excel Feature Deprecation):**
        *   Removed all functions and the `file-saver` import from `src/lib/excelUtils.ts`. The file is now empty, ready for the future "Download All Data" feature.
        *   Deleted the following API route files:
            *   `src/app/api/inventory-excel/download-template/route.ts`
            *   `src/app/api/inventory-excel/upload/route.ts`
            *   `src/app/api/tenant-excel/download-template/route.ts`
            *   `src/app/api/tenant-excel/upload/route.ts`
        *   In `src/app/dashboard/property-mgmt/page.tsx`:
            *   Removed imports: `downloadInventoryTemplate`, `uploadInventoryExcel` from `@/lib/excelUtils` and `FileUp`, `FileDown`, `AlertTriangle`, `CheckCircle`, `XCircle` from `lucide-react` (selectively, keeping `Loader2`, `X`).
            *   Removed state variables: `fileInputRef`, `isUploading`, `uploadResults`, `showUploadResults`.
            *   Removed `useEffect` hook for hiding upload results.
            *   Removed functions: `handleDownloadTemplate`, `handleFileSelect`, `handleUploadFile`, `triggerFileInput`.
            *   Removed JSX: Excel download/upload buttons, hidden file input, bulk upload instructions accordion, and upload results display.
        *   In `src/app/dashboard/tenants/page.tsx`:
            *   Removed imports: `downloadTenantTemplate`, `uploadTenantExcel` from `@/lib/excelUtils` and `FileUp`, `FileDown`, `AlertTriangle`, `CheckCircle` from `lucide-react` (selectively, keeping `Loader2`, `X`, `XCircle`).
            *   Removed state variables: `fileInputRef`, `isUploading`, `uploadResults`, `showUploadResults`, `isInstructionsExpanded`.
            *   Removed `useEffect` hook for hiding upload results.
            *   Removed functions: `handleDownloadTemplate`, `handleFileSelect`, `triggerFileInput`, `handleUploadFile`, `closeUploadResults`, `toggleInstructions`.
            *   Removed JSX: Excel download/upload buttons, hidden file input, bulk upload instructions accordion, and upload results display.
        *   The `xlsx` and `file-saver` dependencies in `package.json` have been kept for future use.

