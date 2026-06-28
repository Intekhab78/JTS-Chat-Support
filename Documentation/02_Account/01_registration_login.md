# Registration, Login, and Session Gateway

This document provides a guide for account registration, dashboard login, profile settings, and session management in JTS Chat Support.

---

## 1. Overview & Business Purpose

The authentication gateway secures user identity, manages tenant isolation, and assigns role-based dashboards. 
*   **Registration** handles public sign-up for new clients (initializing basic expired accounts) and staff creation by administrators.
*   **Login Gateway** validates credentials and enforces rate limiting to protect against brute-force attacks.
*   **Session Management** uses JWT tokens and client-side timers to run security warnings and session refreshes.
*   **Profile Management** allows users to update display details, change passwords, and customize dashboard widget preferences.

---

## 2. Navigation Paths

*   **Public Gateway**: `/login` (Toggles between Sign In and Register tabs).
*   **Staff invitations panel**: `/client?tab=agents` or `/admin?tab=agents` (Click **New User / Invite Agent**).
*   **Settings Workspace**: `/agent?tab=settings` or `/purchase?tab=settings` or settings dropdown item in header.

---

## 3. User Roles & Required Permissions

*   **Public Portal**: Guest users (unauthenticated). No permissions required.
*   **Staff Creation**: Client Owners (`client`) and Administrators (`admin`). Requires `SETTINGS_MANAGE` and `/api/auth/agents/register` route access.
*   **Profile Customization**: Accessible to all logged-in users.

---

## 4. Prerequisites

1.  **Unique Emails**: Every account email must be unique in the database.
2.  **Website Scope**: Invited staff must be assigned to at least one active website ID to configure their data scope.
3.  **Active Connections**: Requires a connection to the backend server to submit requests.

---

## 5. Step-by-Step Instructions

### 5.1 Public Tenant Registration
1.  Navigate to the `/login` page.
2.  Click the **Register** tab.
3.  Enter your **Full Name**, **Email Address**, and a secure **Password**.
4.  Click **Create Account**. Your account is created, you are logged in, and you are redirected to the billing page `/client`.

### 5.2 Logging In to the Dashboard
1.  Navigate to `/login` (Ensure **Sign In** tab is active).
2.  Enter your **Email Address** and **Password**. Click **Sign In**.
3.  *2FA Step (If active)*: When prompted with the Authenticator Code request, enter the current **6-digit code** from your app, and click **Sign In** again.
4.  You are redirected to your role-specific workspace.

### 5.3 Inviting Staff Accounts
1.  Go to the **Agents** tab on the Client dashboard.
2.  Click **New User** to open the slide-out drawer.
3.  Enter the user's **Full Name**, **Email**, **Password**, select their **Workspace Role**, and check the allowed **Website Scopes**.
4.  Click **Save User**.

### 5.4 Extending an Expiring Session
1.  When your session is within **5 minutes of expiration**, the warning popup will display.
2.  Click **Extend Session** to refresh your session token.

### 5.5 Updating Profile & Password
1.  Navigate to your Settings page.
2.  Modify your **Full Name** or **Email Address** as needed.
3.  To change your password, enter a new password in the **New Password** field.
4.  Click **Save Changes**.

---

## 6. Field & Button Reference

### 6.1 Authentication Inputs
*   **Full Name**: Display name of the user (e.g. John Doe).
*   **Email Address**: Lowercase, trimmed email string.
*   **Password**: Login credential string (minimum 6 characters).
*   **Authenticator Code**: 6-digit TOTP verification token.

### 6.2 Interface Actions
*   **Sign In Button**: Submits credentials to `/api/auth/login`.
*   **Create Account Button**: Submits public signup to `/api/auth/register`.
*   **Save User Button**: Sends invitation details to `/api/auth/agents/register`.
*   **Extend Session Button**: Triggers `/api/auth/refresh` to extend the active token window.
*   **Logout Button**: Clears storage keys and terminates the active session.

---

## 7. Validation & Zod Schema Rules

*   **Public Registration**: Enforces Zod schemas:
    ```javascript
    const registerSchema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Invalid email format"),
      password: z.string().min(6, "Password must be at least 6 characters")
    });
    ```
*   **Staff invitation Limits**: Checks that the number of active personnel is within the tenant's plan limits.
*   **Profile Updates Schema**:
    ```javascript
    const profileSchema = z.object({
      name: z.string().min(2, "Name is too short"),
      email: z.string().email("Invalid email"),
      password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal(''))
    });
    ```

---

## 8. Operational Flows

### 8.1 Success Flow (Sign-In)
1.  User enters credentials and clicks **Sign In**.
2.  The backend verifies email and password hash.
3.  The server returns a `200 OK` response with a JWT token cookie.
4.  The dashboard client saves the token, and the routing engine redirects the user to their role-specific homepage.

### 8.2 Failure Flow (Sign-In)
1.  User enters an incorrect password and clicks **Sign In**.
2.  The backend rejects the request, returning a `401 Unauthorized` status code.
3.  The frontend displays the error message in a red alert container on the login card, keeping the user on the `/login` page.

---

## 9. API Reference & Database Models

### 9.1 Endpoints List
*   `POST /api/auth/register` (Public tenant registration).
*   `POST /api/auth/login` (User sign-in).
*   `POST /api/auth/refresh` (Session token refresh).
*   `GET /api/auth/me` (Profile retrieval).
*   `POST /api/auth/agents/register` (Staff creation).
*   `PATCH /api/users/profile` (Profile update).
*   `PATCH /api/users/preferences` (User dashboard preferences).

### 9.2 Models In Use
*   [User Model](file:///backend/src/models/User.js): Stores user credentials, active roles, and 2FA settings.

---

## 10. Business Rules

*   **Role Routing Rules**: Upon successful login, the application redirects the user to their role-specific landing page:
    ```javascript
    function destinationForRole(role) {
      if (role === "purchase") return "/purchase";
      if (role === "agent") return "/agent";
      if (role === "sales") return "/sales";
      if (role === "manager") return "/manager";
      if (role === "admin") return "/admin";
      if (role === "client") return "/client";
      return "/agent";
    }
    ```
*   **Automatic Offline Heartbeat**: If an agent closes their browser tab without clicking log out, the server detects the socket disconnection and transitions their status to Offline after a 30-second heartbeat check.

---

## 11. Troubleshooting & FAQ

### Issue: "Too many login attempts. Please try again after 15 minutes." (Rate Limited)
*   **Symptom**: Attempting to log in returns a `429 Too Many Requests` status code.
*   **Probable Cause**: The IP address sent more than 5 login requests in a 15-minute window.
*   **Resolution**: Wait for the 15-minute lockout timer to expire.

### Can I change my login email address?
Display names and passwords can be updated from the profile settings tab. Login emails are static keys and cannot be altered from the dashboard. Contact your system administrator to update email keys in the database.

---

## 12. Best Practices

*   **Avoid Shared Logins**: Ensure every user has a separate account to maintain accurate audit trails.
*   **Logout Explicitly**: Always click the Sign Out button when leaving your workstation to ensure session keys are cleared from browser memory.

---

## 13. Screenshot & Video Checklists

### Screenshot 1: Login Card
*   **Screenshot Name**: `auth_login_card.png`
*   **Page**: `/login` (Sign In tab active)
*   **Screen Location**: Centered credentials container.
*   **Why it is needed**: Shows where users enter their email address and password to log in.
*   **Annotation required**: Callout labels pointing to email input, password input, and the Sign In button.
*   **Highlight areas**: Email input box and the Sign In button.
*   **Zoom areas**: None.

### Video Walkthrough: Onboarding Tenant Registration Flow
*   **Recording Name**: `auth_tenant_signup_flow`
*   **Target Page**: `/login`
*   **Actions to Record**: Open the `/login` portal -> Click Register -> Enter info -> Click Create Account -> Verify redirect to `/client`.
*   **Duration Limit**: Max 15 seconds.

---

## 14. Related Documentation

*   [Multi-Factor Authentication (MFA / 2FA)](file:///e:/Chat%20Support/Documentation/02_Account/02_two_factor_auth.md)
*   [Password Recovery and Resets](file:///e:/Chat%20Support/Documentation/02_Account/03_password_reset.md)
*   [Billing & Subscription Administration](file:///e:/Chat%20Support/Documentation/02_Account/04_billing_subscriptions.md)
