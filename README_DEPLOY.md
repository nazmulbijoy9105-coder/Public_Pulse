# Public Pulse Deployment Guide (Vercel)

This guide will help you deploy the **Public Pulse** application to Vercel.

## Full-Stack Architecture

This app uses a **Full-Stack Architecture** to securely handle AI operations:
*   **Production (Vercel)**: Uses Serverless Functions in the `/api` directory.
*   **Development**: Uses `server.ts` (Express) to simulate the backend and serve the Vite frontend.
*   **Security**: This prevents your `GEMINI_API_KEY` from being exposed in the browser.

## Prerequisites

1.  A [Vercel](https://vercel.com) account.
2.  A [Google AI Studio](https://aistudio.google.com/app/apikey) API key for Gemini.
3.  A [Firebase](https://console.firebase.google.com) project (optional, if you want to use your own).

## Deployment Steps

1.  **Push to GitHub/GitLab/Bitbucket**: Ensure your code is in a repository.
2.  **Import Project to Vercel**:
    *   Go to [Vercel Dashboard](https://vercel.com/dashboard).
    *   Click **Add New...** -> **Project**.
    *   Import your repository.
3.  **Firebase OAuth Configuration (CRITICAL)**:
    *   If you see an error like "The current domain is not authorized for OAuth operations", you must:
        1.  Go to the [Firebase Console](https://console.firebase.google.com/).
        2.  Select your project: `publicpulse-5cf8c`.
        3.  Navigate to **Authentication** > **Settings** > **Authorized domains**.
        4.  Click **Add domain** and enter: `public-pulse-brown.vercel.app`.
        5.  Also add any other custom domains you use.
4.  **Configure Environment Variables**:
    *   In the **Environment Variables** section, add the following:
        *   `GEMINI_API_KEY`: Your Gemini API key.
        *   `VITE_APP_URL`: The URL where your app will be hosted (e.g., `https://your-app.vercel.app`).
        *   `VITE_FIREBASE_API_KEY`: Your Firebase API key.
        *   `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth Domain.
        *   `VITE_FIREBASE_PROJECT_ID`: Your Firebase Project ID.
        *   `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage Bucket.
        *   `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging Sender ID.
        *   `VITE_FIREBASE_APP_ID`: Your Firebase App ID.
        *   `VITE_FIREBASE_MEASUREMENT_ID`: Your Firebase Measurement ID (optional).
        *   `VITE_FIREBASE_FIRESTORE_DATABASE_ID`: Your Firestore Database ID (usually `(default)`).
4.  **Build Settings**:
    *   Vercel should automatically detect **Vite**.
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
    *   **Install Command**: `npm install`
5.  **Deploy**: Click **Deploy**.

## Routing (SPA)

The `vercel.json` file is already included to handle client-side routing. This ensures that refreshing the page on routes like `/dashboard` works correctly.

## Firebase Configuration

The app uses `firebase-applet-config.json` for its Firebase settings. If you want to use a different Firebase project for production, update this file before deploying.

## Security Note

Ensure your Firebase Security Rules (`firestore.rules`) are deployed to your Firebase project. You can do this via the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```
