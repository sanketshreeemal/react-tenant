import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import logger from '../logger';

/**
 * Upload a file to Firebase Storage with timeout and error handling
 * @param file The file to upload
 * @param path The storage path where the file should be stored
 * @param timeoutMs Timeout in milliseconds (default: 30000 - 30 seconds)
 * @returns Promise with the download URL
 */
export const uploadFileWithTimeout = async (
  file: File,
  path: string,
  timeoutMs: number = 30000
): Promise<string> => {
  try {
    logger.info(`Starting file upload to path: ${path}`, {
      additionalInfo: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        destination: path
      }
    });

    // Create a reference to the file location
    const storageRef = ref(storage, path);
    
    // Create the upload promise
    const uploadPromise = uploadBytes(storageRef, file);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`File upload timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });
    
    // Race the promises to implement the timeout
    const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
    
    logger.info(`File uploaded successfully to ${path}`, {
      additionalInfo: {
        fileName: file.name,
        fileSize: file.size,
        metadata: uploadResult
      }
    });
    
    // Get the download URL with timeout
    const urlPromise = getDownloadURL(storageRef);
    const downloadURL = await Promise.race([
      urlPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Getting download URL timed out after ${timeoutMs / 1000} seconds`));
        }, timeoutMs);
      })
    ]);
    
    logger.info(`Download URL obtained: ${downloadURL}`);
    
    return downloadURL;
  } catch (error) {
    logger.error(`Error uploading file to ${path}`, {
      additionalInfo: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
}; 