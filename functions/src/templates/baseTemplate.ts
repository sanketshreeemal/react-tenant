/**
 * Base Email Template
 *
 * Provides a responsive, email-client compatible base template structure.
 * Uses table-based layout for maximum compatibility across email clients.
 * Includes preview text support and proper meta tags.
 */

import { emailStyles, getInlineStyles } from "./emailStyles";

export interface BaseTemplateOptions {
  previewText?: string;
  headerText?: string;
  footerText?: string;
}

/**
 * Generates a complete HTML email template with responsive design
 *
 * @param content - The main HTML content to be inserted into the template
 * @param options - Optional configuration for preview text, header, and footer
 * @returns Complete HTML email string ready for sending
 */
export function generateBaseTemplate(
  content: string,
  options: BaseTemplateOptions = {}
): string {
  const { previewText = "", headerText = "Property Management", footerText = "" } = options;

  // Preview text (preheader) - shown in email client preview
  const preheaderHtml = previewText ?
    `<div style="display: none; font-size: 1px; color: ${emailStyles.colors.backgroundBody}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${previewText}
      </div>` :
    "";

  // Header section
  const headerHtml = `
    <tr>
      <td style="padding: ${emailStyles.spacing.xl} ${emailStyles.spacing.lg}; background-color: ${emailStyles.colors.primary};">
        <h1 style="${getInlineStyles.heading1()} color: ${emailStyles.colors.background}; text-align: center;">
          ${headerText}
        </h1>
      </td>
    </tr>
  `;

  // Footer section
  const footerHtml = footerText ?
    `
    <tr>
      <td style="padding: ${emailStyles.spacing.lg}; background-color: ${emailStyles.colors.backgroundBody}; text-align: center; border-top: 1px solid ${emailStyles.colors.border};">
        <p style="${getInlineStyles.paragraphSmall()}">
          ${footerText}
        </p>
        <p style="${getInlineStyles.paragraphSmall()} margin-top: ${emailStyles.spacing.sm};">
          This is an automated email from Urban Leases.
        </p>
      </td>
    </tr>
  ` :
    `
    <tr>
      <td style="padding: ${emailStyles.spacing.lg}; background-color: ${emailStyles.colors.backgroundBody}; text-align: center; border-top: 1px solid ${emailStyles.colors.border};">
        <p style="${getInlineStyles.paragraphSmall()}">
          This is an automated email from Urban Leases.
        </p>
      </td>
    </tr>
  `;

  // Complete HTML email structure
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Property Management Report</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles for email clients */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    /* Responsive styles */
    @media only screen and (max-width: ${emailStyles.breakpoints.mobile}) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .content-cell {
        padding: ${emailStyles.spacing.md} !important;
      }
      .hide-mobile {
        display: none !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: ${emailStyles.colors.backgroundBody}; font-family: ${emailStyles.typography.fontFamily}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  ${preheaderHtml}
  <!-- Main email container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${emailStyles.colors.backgroundBody};">
    <tr>
      <td align="center" style="padding: ${emailStyles.spacing.xl} ${emailStyles.spacing.md};">
        <!-- Email content wrapper (max 600px for email-safe width) -->
        <table role="presentation" class="email-container" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: ${emailStyles.colors.background}; border-radius: ${emailStyles.card.borderRadius}; overflow: hidden; box-shadow: ${emailStyles.card.boxShadow};">
          ${headerHtml}
          <!-- Main content area -->
          <tr>
            <td class="content-cell" style="padding: ${emailStyles.spacing.xl} ${emailStyles.spacing.lg};">
              ${content}
            </td>
          </tr>
          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
