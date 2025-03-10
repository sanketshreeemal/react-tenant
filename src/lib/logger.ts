/**
 * Simple logger utility with different log levels.
 * In a production environment, you might want to use a more robust solution
 * or disable certain log levels.
 */

const isProduction = process.env.NODE_ENV === 'production';

type LogData = Record<string, any>;

const logger = {
  /**
   * Log informational messages
   * @param message The message to log
   * @param data Additional data to log
   */
  info: (message: string, data?: LogData) => {
    if (!isProduction) {
      if (data) {
        console.log(`[INFO] ${message}`, data);
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
  },

  /**
   * Log warning messages
   * @param message The message to log
   * @param data Additional data to log
   */
  warn: (message: string, data?: LogData) => {
    if (data) {
      console.warn(`[WARNING] ${message}`, data);
    } else {
      console.warn(`[WARNING] ${message}`);
    }
  },

  /**
   * Log error messages
   * @param message The message to log
   * @param data Additional data to log
   */
  error: (message: string, data?: LogData) => {
    if (data) {
      console.error(`[ERROR] ${message}`, data);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },

  /**
   * Log debug messages (only in development)
   * @param message The message to log
   * @param data Additional data to log
   */
  debug: (message: string, data?: LogData) => {
    if (!isProduction) {
      if (data) {
        console.log(`[DEBUG] ${message}`, data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },

  /**
   * Log API request information
   * @param service The service name
   * @param endpoint The endpoint name
   * @param data Additional data to log
   */
  apiRequest: (service: string, endpoint: string, data?: LogData) => {
    if (!isProduction) {
      console.log(`[API REQUEST] ${service}/${endpoint}`, data || {});
    }
  },

  /**
   * Log API success information
   * @param service The service name
   * @param endpoint The endpoint name
   * @param data Additional data to log
   */
  apiSuccess: (service: string, endpoint: string, data?: LogData) => {
    if (!isProduction) {
      console.log(`[API SUCCESS] ${service}/${endpoint}`, data || {});
    }
  },

  /**
   * Log API error information
   * @param error The error object
   * @param service The service name
   * @param endpoint The endpoint name
   * @param data Additional data to log
   */
  apiError: (error: Error, service: string, endpoint: string, data?: LogData) => {
    console.error(`[API ERROR] ${service}/${endpoint}:`, error.message, data || {});
  }
};

export default logger; 