/**
 * Logger utility for detailed API error logging
 * This helps with debugging API issues, especially when using external services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  service?: string;
  endpoint?: string;
  requestData?: any;
  responseData?: any;
  statusCode?: number;
  additionalInfo?: Record<string, any>;
}

// Get log level from environment variable
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;
const LOG_API_ERRORS = process.env.LOG_API_ERRORS !== 'false';

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Determines if a log should be shown based on its level
 */
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
};

/**
 * Format log message with timestamp and level
 */
const formatLogMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * Format object for logging
 */
const formatObject = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return `[Unserializable Object: ${typeof obj}]`;
  }
};

/**
 * Log a message at the specified level
 */
const log = (level: LogLevel, message: string, options?: LogOptions): void => {
  if (!shouldLog(level)) return;

  let logMessage = formatLogMessage(level, message);
  
  // Add service and endpoint info if available
  if (options?.service) {
    logMessage += `\nService: ${options.service}`;
  }
  
  if (options?.endpoint) {
    logMessage += `\nEndpoint: ${options.endpoint}`;
  }
  
  if (options?.statusCode) {
    logMessage += `\nStatus Code: ${options.statusCode}`;
  }
  
  // Add request data if available
  if (options?.requestData) {
    logMessage += `\nRequest Data: ${formatObject(options.requestData)}`;
  }
  
  // Add response data if available
  if (options?.responseData) {
    logMessage += `\nResponse Data: ${formatObject(options.responseData)}`;
  }
  
  // Add additional info if available
  if (options?.additionalInfo) {
    logMessage += `\nAdditional Info: ${formatObject(options.additionalInfo)}`;
  }
  
  // Log to appropriate console method
  switch (level) {
    case 'debug':
      console.debug(logMessage);
      break;
    case 'info':
      console.info(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'error':
      console.error(logMessage);
      break;
  }
  
  // In a production environment, you might want to send logs to a service like Sentry
  // if (level === 'error' && process.env.NODE_ENV === 'production') {
  //   // Send to error tracking service
  // }
};

/**
 * Log API error with detailed information
 */
export const logApiError = (
  error: any,
  service: string,
  endpoint: string,
  requestData?: any,
  additionalInfo?: Record<string, any>
): void => {
  if (!LOG_API_ERRORS) return;
  
  let responseData;
  let statusCode;
  
  // Extract response data and status code if available
  if (error.response) {
    responseData = error.response.data;
    statusCode = error.response.status;
  }
  
  // Get error message
  const errorMessage = error.message || 'Unknown error';
  
  // Log the error
  log('error', `API Error: ${errorMessage}`, {
    service,
    endpoint,
    requestData,
    responseData,
    statusCode,
    additionalInfo: {
      ...additionalInfo,
      stack: error.stack
    }
  });
};

/**
 * Log API success with detailed information
 */
export const logApiSuccess = (
  service: string,
  endpoint: string,
  requestData?: any,
  responseData?: any,
  additionalInfo?: Record<string, any>
): void => {
  if (!shouldLog('debug')) return;
  
  log('debug', `API Success: ${service} - ${endpoint}`, {
    service,
    endpoint,
    requestData,
    responseData,
    additionalInfo
  });
};

/**
 * Log API request with detailed information
 */
export const logApiRequest = (
  service: string,
  endpoint: string,
  requestData?: any,
  additionalInfo?: Record<string, any>
): void => {
  if (!shouldLog('debug')) return;
  
  log('debug', `API Request: ${service} - ${endpoint}`, {
    service,
    endpoint,
    requestData,
    additionalInfo
  });
};

/**
 * General logger methods
 */
export const logger = {
  debug: (message: string, options?: LogOptions) => log('debug', message, options),
  info: (message: string, options?: LogOptions) => log('info', message, options),
  warn: (message: string, options?: LogOptions) => log('warn', message, options),
  error: (message: string, options?: LogOptions) => log('error', message, options),
  apiError: logApiError,
  apiSuccess: logApiSuccess,
  apiRequest: logApiRequest
};

export default logger; 