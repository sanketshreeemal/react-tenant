/**
 * theme.ts
 *
 * This file defines a minimalistic, light mode theme for the application.
 * It includes design tokens for colors, spacing, typography, border radii, and shadows.
 * These tokens ensure consistency across components and ease future iterations.
 */

export const theme = {
  // -------------------------------------------------------------------------
  // Colors: Define the primary color palette and supporting colors.
  // -------------------------------------------------------------------------
  colors: {
    // Primary color used for main actions (e.g., buttons, links)
    primary: "#1E40AF", // A strong blue tone

    // Secondary color for accents and less prominent elements
    secondary: "#64748B", // A muted blue-gray

    // Background colors for the overall page and surfaces (cards, panels)
    background: "#FFFFFF",       // Clean white background for the page
    surface: "#F8F9FA",          // Light gray for card backgrounds or elevated surfaces

    // Text colors for primary and secondary content
    textPrimary: "#1F2937",      // Dark gray for primary text for strong contrast
    textSecondary: "#4B5563",    // Lighter gray for secondary information

    // Error color for alerts, validations, and error messages
    error: "#DC2626",            // A vivid red for errors

    // Border color used for outlines, dividers, etc.
    border: "#E5E7EB",           // Light gray border for subtle separations
  },

  // -------------------------------------------------------------------------
  // Spacing: Define standard spacing values used throughout the app.
  // -------------------------------------------------------------------------
  spacing: {
    xs: "4px",   // Extra small spacing
    sm: "8px",   // Small spacing
    md: "16px",  // Medium spacing (common default)
    lg: "24px",  // Large spacing
    xl: "32px",  // Extra large spacing
  },

  // -------------------------------------------------------------------------
  // Typography: Define font families and sizes for a consistent text style.
  // -------------------------------------------------------------------------
  typography: {
    fontFamily: {
      // Primary sans-serif font for general text
      sans: "'Inter', sans-serif",
      // Monospace font for code snippets or specialized text
      mono: "'Roboto Mono', monospace",
    },
    fontSize: {
      xs: "0.75rem",   // Extra small text (approx. 12px)
      sm: "0.875rem",  // Small text (approx. 14px)
      base: "1rem",    // Base text size (approx. 16px)
      lg: "1.125rem",  // Large text (approx. 18px)
      xl: "1.25rem",   // Extra large text (approx. 20px)
      "2xl": "1.5rem", // 2x extra large (approx. 24px)
      "3xl": "1.875rem", // 3x extra large (approx. 30px)
      "4xl": "2.25rem",  // 4x extra large (approx. 36px)
    },
  },

  // -------------------------------------------------------------------------
  // Border Radius: Define rounded corners for UI elements.
  // -------------------------------------------------------------------------
  borderRadius: {
    sm: "4px",  // Small radius for subtle rounding
    md: "8px",  // Medium radius for standard elements
    lg: "12px", // Large radius for highly rounded elements
  },

  // -------------------------------------------------------------------------
  // Shadows: Define shadow presets for elevating UI elements.
  // -------------------------------------------------------------------------
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",   // Subtle shadow for small components
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",      // Medium shadow for panels and cards
  },
};

export default theme; 