# Deployment Guide - BMA Bill Manager

This guide explains how to deploy the BMA application and its Google Sheets backend.

## 1. Google Sheets & Apps Script Setup

1. **Create Google Sheet**: Create a new Google Sheet named `BMA_Database`.
2. **Open Script Editor**: Go to **Extensions > Apps Script**.
3. **Add Code**: Paste the backend script code into the editor.
4. **Configure Sheet ID**: 
   - Copy your Google Sheet's ID from the URL (e.g., `1NQmiOBcn...`).
   - In the Apps Script code, locate `SpreadsheetApp.openById("...")` and paste your ID there.
5. **Deploy as Web App**:
   - Click **Deploy > New Deployment**.
   - Select **Type: Web App**.
   - **Execute as**: `Me` (your email).
   - **Who has access**: `Anyone`.
   - Click **Deploy** and copy the **Web App URL**.

## 2. Frontend Configuration

1. **Update API URL**:
   - In the project, open `constants.tsx`.
   - Replace the `API_URL` value with your **Web App URL** from step 1.5.
2. **Push to GitHub**:
   - Run `git add .`
   - Run `git commit -m "Update API URL"`
   - Run `git push origin main`

## 3. GitHub Pages Deployment

1. **Vite Configuration**:
   - Ensure `vite.config.ts` has the `base: '/BMA/'` setting (already configured).
2. **GitHub Actions**:
   - The project includes a `.github/workflows/deploy.yml` file.
   - Every time you push to the `main` branch, GitHub will automatically build and deploy the app.
3. **Enable Pages**:
   - Go to your GitHub repository **Settings > Pages**.
   - Under **Build and deployment > Source**, select **GitHub Actions**.
4. **Access Link**:
   - Your app will be live at `https://<your-username>.github.io/BMA/`.

## 4. Troubleshooting Permission Issues
If you see "You do not have permission to access the requested document":
- Ensure the account that deployed the script has **Editor** access to the Google Sheet.
- Ensure the **Sheet ID** in the script matches exactly (casing matters!).
- Re-deploy the script as a **New Version** after making any changes.
