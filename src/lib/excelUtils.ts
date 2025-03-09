import { saveAs } from 'file-saver';

/**
 * Downloads the rental inventory Excel template
 */
export const downloadInventoryTemplate = async () => {
  try {
    const response = await fetch('/api/inventory-excel/download-template', {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to download template');
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Use file-saver to save the file
    saveAs(blob, 'rental_inventory_template.xlsx');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error downloading template:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to download inventory template' 
    };
  }
};

/**
 * Uploads an Excel file with rental inventory data
 * @param file The Excel file to upload
 * @returns Result object with success status, counts, and any errors
 */
export const uploadInventoryExcel = async (file: File) => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Make the API request
    const response = await fetch('/api/inventory-excel/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload inventory data');
    }
    
    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    console.error('Error uploading inventory data:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to upload inventory data',
      successful: 0,
      failed: 0,
      errors: [error.message || 'Unknown error occurred']
    };
  }
};

/**
 * Downloads the tenant Excel template
 */
export const downloadTenantTemplate = async () => {
  try {
    const response = await fetch('/api/tenant-excel/download-template', {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to download template');
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Use file-saver to save the file
    saveAs(blob, 'tenant_template.xlsx');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error downloading tenant template:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to download tenant template' 
    };
  }
};

/**
 * Uploads an Excel file with tenant data
 * @param file The Excel file to upload
 * @returns Result object with success status, counts, and any errors
 */
export const uploadTenantExcel = async (file: File) => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Make the API request
    const response = await fetch('/api/tenant-excel/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload tenant data');
    }
    
    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    console.error('Error uploading tenant data:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to upload tenant data',
      successful: 0,
      failed: 0,
      errors: [error.message || 'Unknown error occurred']
    };
  }
}; 