/**
 * Email Styles Constants
 *
 * Reusable CSS styles for email templates.
 * All styles are designed for email client compatibility (Gmail, Outlook, Apple Mail).
 * Uses inline CSS approach for maximum compatibility.
 */

export const emailStyles = {
  // Colors
  colors: {
    primary: "#2563eb", // Professional blue
    primaryDark: "#1e40af",
    text: "#1f2937", // Dark gray
    textSecondary: "#6b7280", // Medium gray
    textLight: "#9ca3af", // Light gray
    background: "#ffffff", // White
    backgroundBody: "#f3f4f6", // Light gray body background
    border: "#e5e7eb", // Light gray border
    borderDark: "#d1d5db", // Medium gray border
    success: "#10b981", // Green
    warning: "#f59e0b", // Amber
    error: "#ef4444", // Red
    tableRowEven: "#f9fafb", // Very light gray for alternating rows
  },

  // Typography
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: {
      base: "16px",
      small: "14px",
      xsmall: "12px",
      large: "18px",
      xlarge: "24px",
      h1: "28px",
      h2: "24px",
      h3: "20px",
      h4: "18px",
    },
    lineHeight: {
      base: "1.5",
      tight: "1.25",
      relaxed: "1.75",
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Spacing
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },

  // Table Styles
  table: {
    borderColor: "#e5e7eb",
    borderWidth: "1px",
    cellPadding: "12px",
    cellPaddingSmall: "8px",
    headerBackground: "#f9fafb",
    headerTextColor: "#1f2937",
    headerFontWeight: "600",
    rowBorderColor: "#e5e7eb",
  },

  // Button/CTA Styles
  button: {
    backgroundColor: "#2563eb",
    textColor: "#ffffff",
    padding: "12px 24px",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "600",
    hoverBackgroundColor: "#1e40af",
  },

  // Card/Section Styles
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "24px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },

  // Responsive Breakpoints (for media queries)
  breakpoints: {
    mobile: "600px",
  },
} as const;

/**
 * Generate inline style string for common elements
 */
export const getInlineStyles = {
  heading1: (): string => {
    return `font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.h1}; font-weight: ${emailStyles.typography.fontWeight.bold}; color: ${emailStyles.colors.text}; line-height: ${emailStyles.typography.lineHeight.tight}; margin: 0 0 ${emailStyles.spacing.lg} 0;`;
  },

  heading2: (): string => {
    return `font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.h2}; font-weight: ${emailStyles.typography.fontWeight.semibold}; color: ${emailStyles.colors.text}; line-height: ${emailStyles.typography.lineHeight.tight}; margin: ${emailStyles.spacing.xl} 0 ${emailStyles.spacing.md} 0;`;
  },

  heading3: (): string => {
    return `font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.h3}; font-weight: ${emailStyles.typography.fontWeight.semibold}; color: ${emailStyles.colors.text}; line-height: ${emailStyles.typography.lineHeight.tight}; margin: ${emailStyles.spacing.lg} 0 ${emailStyles.spacing.md} 0;`;
  },

  heading4: (): string => {
    return `font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.h4}; font-weight: ${emailStyles.typography.fontWeight.medium}; color: ${emailStyles.colors.text}; line-height: ${emailStyles.typography.lineHeight.tight}; margin: ${emailStyles.spacing.md} 0 ${emailStyles.spacing.sm} 0;`;
  },

  paragraph: (): string => {
    return `font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.base}; color: ${emailStyles.colors.text}; line-height: ${emailStyles.typography.lineHeight.base}; margin: 0 0 ${emailStyles.spacing.md} 0;`;
  },

  paragraphSmall: (): string => {
    return `font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.small}; color: ${emailStyles.colors.textSecondary}; line-height: ${emailStyles.typography.lineHeight.base}; margin: 0 0 ${emailStyles.spacing.sm} 0;`;
  },

  link: (): string => {
    return `color: ${emailStyles.colors.primary}; text-decoration: none;`;
  },

  table: (): string => {
    return `width: 100%; border-collapse: collapse; border: ${emailStyles.table.borderWidth} solid ${emailStyles.table.borderColor}; margin: ${emailStyles.spacing.md} 0;`;
  },

  tableHeader: (): string => {
    return `background-color: ${emailStyles.table.headerBackground}; color: ${emailStyles.table.headerTextColor}; font-weight: ${emailStyles.table.headerFontWeight}; text-align: left; padding: ${emailStyles.table.cellPadding}; border: ${emailStyles.table.borderWidth} solid ${emailStyles.table.borderColor};`;
  },

  tableCell: (): string => {
    return `padding: ${emailStyles.table.cellPadding}; border: ${emailStyles.table.borderWidth} solid ${emailStyles.table.borderColor}; font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.base}; color: ${emailStyles.colors.text};`;
  },

  tableCellSmall: (): string => {
    return `padding: ${emailStyles.table.cellPaddingSmall}; border: ${emailStyles.table.borderWidth} solid ${emailStyles.table.borderColor}; font-family: ${emailStyles.typography.fontFamily}; font-size: ${emailStyles.typography.fontSize.small}; color: ${emailStyles.colors.text};`;
  },
};
