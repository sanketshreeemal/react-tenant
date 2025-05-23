/**
 * theme.ts
 *
 * This file defines a minimalistic, light mode theme for the application.
 * It includes design tokens for colors, spacing, typography, border radii, and shadows.
 * These tokens ensure consistency across components and ease future iterations.
 */

const theme = {
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
    surface: "#FCFCFD",          // Very subtle off-white for card backgrounds

    // Text colors for primary and secondary content
    textPrimary: "#1F2937",      // Dark gray for primary text for strong contrast
    textSecondary: "#4B5563",    // Lighter gray for secondary information

    // Error color for alerts, validations, and error messages
    error: "#DC2626",            // A vivid red for errors

    // Border color used for outlines, dividers, etc.
    border: "#E5E7EB",           // Light gray border for subtle separations

    // Button-specific semantic colors
    button: {
      // Primary action buttons (submit, confirm, save)
      primary: "#1F2937",        // Changed to black for positive actions
      primaryHover: "#111827",   // Darker black for hover

      // Secondary/Cancel buttons
      secondary: "#FFFFFF",      // White background
      secondaryHover: "#F3F4F6", // Light gray for hover
      secondaryBorder: "#E5E7EB",// Border color
      secondaryText: "#1F2937",  // Black text for secondary buttons

      // Destructive action buttons (delete, remove)
      destructive: "#DC2626",    // Red
      destructiveHover: "#B91C1C", // Darker red for hover
    },

    // StatCard-specific colors
    statCard: {
      titleColor: "#4B5563",     // Gray for stat card titles
      valueColor: "#1F2937",     // Dark gray for values
      highlightValueColor: "#059669", // Green for highlighted values
      subtitleColor: "#6B7280",  // Medium gray for subtitles
      iconColor: "#374151",      // Dark gray for icons
      borderColor: "#E5E7EB",    // Light gray for borders #REF
      iconBgColor: "#F3F4F6",    // Light gray for icon background
      highlightBgColor: "#ECFDF5", // Light green for highlighted icon background
      highlightIconColor: "#047857", // Dark green for highlighted icon
    },

    // Property type pill colors
    propertyType: {
      residential: {
        text: "#3b82f6", // Blue
        bg: "rgba(59, 130, 246, 0.08)", // Light blue background
      },
      commercial: {
        text: "#8b5cf6", // Purple
        bg: "rgba(139, 92, 246, 0.08)", // Light purple background
      }
    },

    // BHK pill colors for different configurations
    bhk: {
      one: {
        text: "#059669",
        bg: "rgba(5, 150, 105, 0.08)",
      },
      two: {
        text: "#0891b2",
        bg: "rgba(155, 178, 8, 0.08)",
      },
      three: {
        text: "#6366f1",
        bg: "rgba(185, 33, 63, 0.08)",
      },
      four: {
        text: "#9333ea",
        bg: "rgba(234, 146, 51, 0.08)",
      },
      five: {
        text: "#db2777",
        bg: "rgba(219, 39, 119, 0.08)",
      }
    },

    // Area pill colors for commercial properties
    area: {
      text: "#475569",
      bg: "rgba(71, 85, 105, 0.08)",
    },
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
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",    // Medium shadow for panels and cards
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", // Larger shadow for elevated components
  },

  // -------------------------------------------------------------------------
  // Component-specific themes
  // -------------------------------------------------------------------------
  components: {
    // StatCard component specific theming
    statCard: {
      padding: "8px", // Using spacing.sm value directly
      borderRadius: "12px", // Using borderRadius.lg value directly
      shadow: "0 1px 2px rgba(0, 0, 0, 0.05)", // Using shadows.sm value directly
      hoverShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Using shadows.md value directly
      iconSize: "24px",
      titleFontSize: "0.9rem",
      valueFontSize: "1.5rem",
      valueFontWeight: "700",
      subtitleFontSize: "0.875rem"
    }
  }
} as const;

export { theme }; 