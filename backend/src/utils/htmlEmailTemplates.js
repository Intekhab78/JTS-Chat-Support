/**
 * Build a premium, responsive HTML email template for the JTS CRM System.
 * Follows modern styling guidelines: violet branding accents, slate neutrals, 
 * Outfit/Inter sans-serif typography, clean spacing, and call-to-actions.
 * 
 * @param {string} title - Email header title.
 * @param {string} message - Email content body message.
 * @param {string} [ctaText] - Action button text.
 * @param {string} [ctaUrl] - Action button hyperlink target.
 * @returns {string} Fully responsive, compiled HTML template.
 */
export function buildPremiumEmailTemplate(title, message, ctaText, ctaUrl) {
  const currentYear = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        /* CSS reset & compatibility rules */
        body {
          margin: 0;
          padding: 0;
          width: 100% !important;
          background-color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #334155;
          -webkit-font-smoothing: antialiased;
        }
        table {
          border-spacing: 0;
          width: 100%;
        }
        td {
          padding: 0;
        }
        img {
          border: 0;
        }
        
        /* Layout structures */
        .wrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f8fafc;
          padding-top: 40px;
          padding-bottom: 40px;
        }
        .main-card {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .inner-content {
          padding: 40px;
        }
        
        /* Branding & Header styles */
        .logo-bar {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          padding: 30px 40px;
          text-align: center;
        }
        .logo-text {
          color: #ffffff;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 0;
        }
        .logo-subtitle {
          color: #c7d2fe;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        
        /* Message Area styling */
        .email-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .email-body {
          font-size: 15px;
          color: #475569;
          margin-bottom: 30px;
          line-height: 1.7;
        }
        
        /* Action buttons */
        .button-wrapper {
          text-align: center;
          margin-bottom: 30px;
          margin-top: 30px;
        }
        .cta-button {
          display: inline-block;
          padding: 14px 30px;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 14px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
        }
        
        /* Footer area */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <center class="wrapper">
        <table class="main-card">
          <tr>
            <td class="logo-bar">
              <div class="logo-text">JTS Command Center</div>
              <div class="logo-subtitle">Enterprise CRM Ecosystem</div>
            </td>
          </tr>
          <tr>
            <td class="inner-content">
              <h1 class="email-title">${title}</h1>
              <div class="email-body">
                ${message}
              </div>
              ${ctaText && ctaUrl ? `
                <div class="button-wrapper">
                  <a href="${ctaUrl}" class="cta-button" target="_blank">${ctaText}</a>
                </div>
              ` : ''}
              <div class="footer">
                This is an automated system dispatch. Please do not reply directly to this mail transmission.<br>
                &copy; ${currentYear} JTS Chat Support & Operations. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </center>
    </body>
    </html>
  `;
}
