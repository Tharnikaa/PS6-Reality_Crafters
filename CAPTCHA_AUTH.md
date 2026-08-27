# Public Authentication Documentation (Mobile Number + Google reCAPTCHA v2)

This document provides a comprehensive technical overview of the **Public Citizen Authentication Flow** for **CivicResolve (PS6-Reality_Crafters)**.

---

## 1. Architecture Flow Diagram

```
Citizen
   │
   ▼
Enter Mobile Number (+91 format)
   │
   ▼
Complete Google reCAPTCHA v2 Checkbox ("I'm not a robot")
   │
   ▼
Obtain CAPTCHA Token (grecaptcha.getResponse())
   │
   ▼
Send POST /api/auth/signin or /api/auth/signup
   │
   ▼
Express.js Backend Rate Limiter
   │
   ▼
Google reCAPTCHA Verification (backend siteverify API)
   │
   ├── [FAILED] ──► Reject Request & Return CAPTCHA Error Message
   │
   └── [SUCCESS]
          │
          ▼
   Lookup User in Database (public_users table)
          │
          ├── [NOT FOUND (Sign In)] ──► Return "Account not found. Please sign up."
          │
          ├── [ALREADY EXISTS (Sign Up)] ──► Return "An account already exists with this mobile number."
          │
          └── [AUTHENTICATED] ──► Issue JWT Token & Access Public Dashboard
```

---

## 2. Technical Topics Covered

### 1. What Google reCAPTCHA v2 Is
Google reCAPTCHA v2 is a human-verification security service provided by Google that uses a standard checkbox ("I'm not a robot") and risk analysis algorithms to distinguish human users from automated bots.

### 2. Why CAPTCHA Is Used
CAPTCHA prevents malicious bots, automated scripts, and spam crawlers from flooding authentication endpoints, creating fake accounts, or overloading civic reporting systems.

### 3. Why OTP Is NOT Used
OTP requires cellular SMS gateways, introduces delivery delays, incurs carrier costs, and creates usability barriers for citizens in low-network areas. Mobile Number + Google reCAPTCHA v2 provides immediate, friction-free verification.

### 4. What the Site Key Is
The **Site Key** (`6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`) is a public identifier used in the frontend HTML to render the Google reCAPTCHA checkbox widget.

### 5. What the Secret Key Is
The **Secret Key** (`6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`) is a private key used exclusively on the Express backend to verify CAPTCHA tokens with Google's servers.

### 6. Where Each Key Is Stored
- **Site Key**: Exposed in frontend `public/index.html` (`data-sitekey`).
- **Secret Key**: Stored exclusively in server environment variable `RECAPTCHA_SECRET_KEY` inside `.env`.

### 7. How the Frontend Obtains the CAPTCHA Token
When the user checks "I'm not a robot", Google's client widget verifies the user and returns an encrypted response token accessible via `grecaptcha.getResponse()`.

### 8. How the Token Reaches Express
The frontend includes `captchaToken` in the JSON request body sent to `POST /api/auth/signin` or `POST /api/auth/signup`.

### 9. How Express Verifies It with Google
The backend calls `backend/captchaService.js`, sending a URL-encoded `POST` request to `https://www.google.com/recaptcha/api/siteverify` containing `secret` and `response` (the token).

### 10. What Happens When Verification Fails
Express halts processing and returns an HTTP 400 JSON response:
`{ "success": false, "message": "CAPTCHA verification failed. Please try again." }`. The frontend displays an error banner and calls `grecaptcha.reset()`.

### 11. What Happens When Verification Succeeds
Express proceeds to normalize the mobile number and perform database user lookup/registration.

### 12. How Mobile Number Authentication Works
The mobile number is normalized to international format (e.g. `+919876543210`) and serves as the unique citizen account identifier in the `public_users` table.

### 13. Sign In Flow
1. User enters Mobile Number & completes reCAPTCHA v2.
2. Express verifies CAPTCHA token with Google.
3. Express queries `public_users` table for mobile number.
4. If found, returns JWT token & redirects to Public Dashboard.
5. If not found, returns `"Account not found. Please sign up."`.

### 14. Sign Up Flow
1. User enters Full Name (optional), Mobile Number & completes reCAPTCHA v2.
2. Express verifies CAPTCHA token with Google.
3. Express checks if mobile already exists in `public_users`.
4. If exists, returns `"An account already exists with this mobile number."`.
5. If new, inserts user record into `public_users` and returns JWT token.

### 15. Forgot Password Flow
Displays account recovery instructions advising citizens that public accounts are linked directly to their mobile number and offering support contact details.

### 16. Security Considerations
- `RECAPTCHA_SECRET_KEY` is listed in `.gitignore` and never committed or sent to client browsers.
- In-memory rate limiting (`backend/rateLimiter.js`) restricts auth requests to max 15 requests/min per IP.
- Frontend grecaptcha widget is automatically reset upon failed attempts or mobile number modification.

### 17. Environment Variable Setup
In `.env`:
```env
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
```

### 18. Local Development Setup
Run the project locally:
```bash
# 1. Install dependencies (if needed)
npm install

# 2. Run backend server
node server.js

# 3. Open portal in browser
# http://localhost:3000
```

---

## 3. Summary of API Endpoints

| Endpoint | Method | Body Payload | Description |
|---|---|---|---|
| `/api/auth/signin` | `POST` | `{ "mobile": "9876543210", "captchaToken": "..." }` | Verifies CAPTCHA token with Google & logs in existing citizen |
| `/api/auth/signup` | `POST` | `{ "mobile": "9876543210", "captchaToken": "...", "name": "Anand S" }` | Verifies CAPTCHA token with Google & creates new citizen account |
