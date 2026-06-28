# Password Recovery and Resets

This document details the password recovery process inside JTS Chat Support, explaining the security measures used, token lifetimes, email integrations, and how to recover a forgotten password.

---

## 1. Overview & Business Purpose

If a user forgets their password, they can trigger the password recovery process. This workflow:
1.  Allows users to submit their email address on the login page.
2.  Generates a cryptographically secure, single-use token on the backend.
3.  Sends a secure reset link to the user's email.
4.  Allows the user to input a new password and completes the validation process.

---

## 2. Navigation Paths

*   **Request Reset Link URL**: `/login` (click **Forgot your password?**).
*   **Secure Reset Form URL**: `/reset-password/:token` (dynamic link received in your recovery email).

---

## 3. User Roles & Required Permissions

*   **Target Roles**: Any registered user completing the password recovery process. No specific permissions are required.

---

## 4. Prerequisites

*   **SMTP Service Enabled**: The backend server must have a configured SMTP integration to deliver recovery emails.
*   **Active Email Access**: The user must have access to the inbox of the email address registered with their JTS Chat Support profile.

---

## 5. Step-by-Step Instructions

### 5.1 Requesting a Password Reset Link
1.  Navigate to the login gateway `/login`.
2.  Click the **Forgot your password?** link at the bottom of the card.
3.  Enter your registered **Email Address** in the input field.
4.  Click **Request Reset Link**.
5.  The screen will display a status message: "If an account with that email exists, a password reset link has been sent."
6.  Check your email inbox for an email from "JTS Support".

### 5.2 Performing the Password Reset
1.  Open the password reset email and click the **Reset Password** button.
2.  You will be redirected to the secure reset page (`/reset-password/<token>`).
3.  Enter your **New Password** (minimum 6 characters).
4.  Re-enter the password in the **Confirm Password** field.
5.  Click **Reset Password**.
6.  The application will verify the token, hash your new password, update the database, and display a success message: "Password has been reset successfully. You can now log in with your new password."
7.  Click the redirect link to return to `/login` and sign in.

---

## 6. Field & Button Reference

### 6.1 Form Inputs
*   **Email Address**: Input field to specify the account email address for recovery.
*   **New Password**: Text box to specify your new login credentials (minimum 6 characters).
*   **Confirm Password**: Re-enter the new password to confirm the inputs match, preventing spelling mistakes.

### 6.2 Action Triggers
*   **Request Reset Link**: Submits the recovery email to `/api/auth/forgot-password`.
*   **Reset Password**: Submits the new credentials payload to `/api/auth/reset-password/:token`.
*   **Back to Login**: Returns to `/login` portal.

---

## 7. Validation & Zod Schema Rules

*   **Email Syntax**: Standard RFC check.
*   **Password Length**: Minimum 6 characters.
*   **Password Matching**: Verification ensures `password === confirmPassword`.
*   **Token Expiration**: Token verification is validated in database:
    ```javascript
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() } // Not expired (1 hour limit)
    });
    ```

---

## 8. Operational Flows

### 8.1 Success Flow
1.  User enters matching passwords and clicks **Reset Password**.
2.  The backend verifies the token and confirms it is within the 1-hour expiration window.
3.  The new password is encrypted using Bcrypt (12 rounds) and saved.
4.  The reset token and expiration fields are cleared from the database.
5.  The server returns a `200 OK` response with a success status message.

### 8.2 Failure Flow
1.  User attempts to submit a new password using an expired or invalid token.
2.  The backend search for the token fails or the expiration check fails.
3.  The request is rejected, returning a `400 Bad Request` status code.
4.  The frontend displays the error message in a red alert container, and the form submission is blocked.

---

## 9. API Reference & Database Models

### 9.1 Endpoints List
*   `POST /api/auth/forgot-password` (Accepts email query).
*   `POST /api/auth/reset-password/:token` (Submits new credentials).

### 9.2 Models In Use
*   [User Model](file:///backend/src/models/User.js): Holds dynamic `resetPasswordToken` and `resetPasswordExpires` fields.

---

## 10. Business Rules

*   **Anti-Enumeration Security**: The system returns a generic success message regardless of whether the email exists in the database.
*   **Single-Use Tokens**: The token is invalidated immediately upon a successful password reset to prevent replay attacks.
*   **Audit Logging**: The backend records a security event under the action key `auth.password_reset_completed` in the audit log when a password reset is completed.

---

## 11. Troubleshooting & FAQ

### Issue: "Password reset link is invalid or has expired"
*   **Symptom**: Clicking the link in the recovery email displays a token validation error.
*   **Resolution**: Return to `/login` and submit a new recovery request. Open the *most recent* email received and copy the entire URL link manually.

---

## 12. Best Practices

*   **Verify Email Spelling**: Double-check your email spelling before requesting a reset. The system will not return an error for non-existent emails, so typos will result in no email being sent.
*   **Use Strong Passwords**: Ensure your new password is at least 8 characters long and contains uppercase letters, lowercase letters, numbers, and symbols.

---

## 13. Screenshot & Video Checklists

### Screenshot 1: Forgot Password Panel
*   **Screenshot Name**: `auth_forgot_password.png`
*   **Page**: `/login` (Forgot Password form active)
*   **Screen Location**: Centered recovery container.
*   **Why it is needed**: Shows where users enter their email address to request a recovery link.
*   **Annotation required**: Callout labels pointing to the email input and request button.
*   **Highlight areas**: Email input box and the Request Reset Link button.
*   **Zoom areas**: None.

### Video Walkthrough: Password Recovery Flow
*   **Recording Name**: `auth_password_recovery_flow`
*   **Target Page**: `/login`
*   **Actions to Record**: Click Forgot Password -> Enter email -> Click Request Link -> Click Reset Link in email client -> Enter matching passwords -> Click Reset Password.
*   **Duration Limit**: Max 25 seconds.

---

## 14. Related Documentation

*   [Registration, Login, and Session Gateway](file:///e:/Chat%20Support/Documentation/02_Account/01_registration_login.md)
*   [Two-Factor Authentication (2FA)](file:///e:/Chat%20Support/Documentation/02_Account/02_two_factor_auth.md)
*   [Outbound SMTP Server Setup](file:///e:/Chat%20Support/Documentation/18_Settings/01_system_configurations.md)
