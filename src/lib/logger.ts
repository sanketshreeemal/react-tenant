/**
 * Simple logger utility with different log levels.
 * In a production environment, you might want to use a more robust solution
 * or disable certain log levels.
 */

const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  /**
   * Log informational messages
   * @param message The message to log
   */
  info: (message: string) => {
    if (!isProduction) {
      console.log(`[INFO] ${message}`);
    }
  },

  /**
   * Log warning messages
   * @param message The message to log
   */
  warn: (message: string) => {
    console.warn(`[WARNING] ${message}`);
  },

  /**
   * Log error messages
   * @param message The message to log
   */
  error: (message: string) => {
    console.error(`[ERROR] ${message}`);
  },

  /**
   * Log debug messages (only in development)
   * @param message The message to log
   */
  debug: (message: string) => {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

export default logger; 