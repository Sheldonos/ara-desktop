# ARA Desktop — Code Signing & Secrets Setup

This guide covers everything needed to sign, notarize, and publish ARA Desktop for macOS and Windows. All secrets are stored as GitHub Actions repository secrets and are never committed to the codebase.

---

## Overview

| Platform | Requirement | Why |
|---|---|---|
| macOS | Apple Developer certificate + notarization | Required for Gatekeeper; without it users see "unidentified developer" warning |
| Windows | EV Code Signing certificate | Required to avoid SmartScreen warnings on first launch |
| GitHub | `GH_TOKEN` with `contents: write` | Required for electron-builder to publish releases |

---

## Step 1 — GitHub Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Select scope: `repo` (full control)
3. Copy the token
4. In the `ara-desktop` repo → **Settings → Secrets and variables → Actions**
5. Add secret: `GH_TOKEN` = `<your token>`

This token is used by `electron-builder` to upload `.dmg`, `.exe`, and `.AppImage` files to GitHub Releases.

---

## Step 2 — macOS Code Signing

### 2a. Get a Developer ID Certificate

1. Log in to [developer.apple.com](https://developer.apple.com)
2. Go to **Certificates, IDs & Profiles → Certificates → +**
3. Select **Developer ID Application** (for distribution outside the App Store)
4. Follow the CSR instructions and download the `.cer` file
5. Double-click to install it in Keychain Access

### 2b. Export the Certificate as Base64

```bash
# Find the certificate name in Keychain
security find-identity -v -p codesigning

# Export as .p12 (you'll set a password)
security export -k ~/Library/Keychains/login.keychain-db \
  -t identities \
  -f pkcs12 \
  -o ~/ara-signing.p12

# Convert to base64 for the GitHub secret
base64 -i ~/ara-signing.p12 | pbcopy
```

### 2c. Add GitHub Secrets

| Secret Name | Value |
|---|---|
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded `.p12` file (from step 2b) |
| `APPLE_CERTIFICATE_PASSWORD` | Password you set when exporting the `.p12` |
| `APPLE_TEAM_ID` | Your 10-character Team ID (found at developer.apple.com → Membership) |
| `APPLE_ID` | Your Apple ID email address |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from [appleid.apple.com](https://appleid.apple.com) → Security → App-Specific Passwords |

### 2d. How the CI Uses These

The `release.yml` workflow:
1. Decodes `APPLE_CERTIFICATE_BASE64` and imports it into a temporary macOS keychain
2. `electron-builder` uses it to sign the `.app` bundle
3. `scripts/notarize.js` submits the signed app to Apple's notarization service using `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD`
4. Apple returns a notarization ticket which is stapled to the `.dmg`

---

## Step 3 — Windows Code Signing

Windows code signing requires an **EV (Extended Validation) Code Signing Certificate** from a trusted CA. Standard OV certificates no longer bypass SmartScreen as of 2023.

### 3a. Purchase an EV Certificate

Recommended CAs:
- [DigiCert](https://www.digicert.com/code-signing/) — most widely trusted
- [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) — cost-effective
- [GlobalSign](https://www.globalsign.com/en/code-signing-certificate/)

EV certificates are delivered on a hardware USB token (FIDO2/HSM). For CI/CD, you need a cloud HSM option — DigiCert KeyLocker or SSL.com eSigner both support GitHub Actions.

### 3b. Using DigiCert KeyLocker (Recommended for CI)

1. Purchase an EV Code Signing cert with KeyLocker from DigiCert
2. Follow DigiCert's [GitHub Actions guide](https://docs.digicert.com/en/digicert-keylocker/ci-cd-integrations/github-actions.html)
3. Add these secrets:

| Secret Name | Value |
|---|---|
| `SM_API_KEY` | DigiCert KeyLocker API key |
| `SM_CLIENT_CERT_FILE_B64` | Base64-encoded client certificate |
| `SM_CLIENT_CERT_PASSWORD` | Client certificate password |
| `SM_CODE_SIGNING_CERT_SHA1_HASH` | SHA1 thumbprint of your signing cert |

### 3c. Alternative — Self-Signed (Development Only)

For development/testing without a paid certificate:

```powershell
# On Windows — creates a self-signed cert (NOT trusted by SmartScreen)
New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=ARA Platform Dev" `
  -CertStoreLocation Cert:\CurrentUser\My

# Export
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*ARA*" }
Export-PfxCertificate -Cert $cert -FilePath ara-dev.pfx -Password (ConvertTo-SecureString "password" -AsPlainText -Force)
```

Add as `WINDOWS_CERTIFICATE_BASE64` and `WINDOWS_CERTIFICATE_PASSWORD` secrets.

---

## Step 4 — Trigger a Release

Once all secrets are configured:

```bash
cd ara-desktop

# Bump version (patch = 1.0.0 → 1.0.1, minor = 1.0.0 → 1.1.0, major = 1.0.0 → 2.0.0)
npm version patch

# Push the version tag — this triggers release.yml
git push origin main --follow-tags
```

The GitHub Actions workflow will:
1. Build the renderer (Vite) and main process (TypeScript)
2. Package `.dmg` (macOS Intel + Apple Silicon), `.exe` (Windows x64), `.AppImage` + `.deb` (Linux)
3. Sign and notarize the macOS build
4. Sign the Windows installer
5. Create a GitHub Release with all artifacts attached
6. The ARA Desktop app will detect the new release via `electron-updater` and silently update

---

## Step 5 — Update the Download Page

After your first release is published, update the download links in the ARA web app:

```
ara-platform/client/src/pages/Download.tsx
```

The download links already point to:
```
https://github.com/Sheldonos/ara-desktop/releases/latest/download/ARA-{version}-arm64.dmg
https://github.com/Sheldonos/ara-desktop/releases/latest/download/ARA-Setup-{version}.exe
```

These URLs automatically resolve to the latest release once GitHub Releases are published.

---

## Secrets Checklist

| Secret | Required For | Status |
|---|---|---|
| `GH_TOKEN` | Publishing releases | Add to repo secrets |
| `APPLE_CERTIFICATE_BASE64` | macOS signing | Add to repo secrets |
| `APPLE_CERTIFICATE_PASSWORD` | macOS signing | Add to repo secrets |
| `APPLE_TEAM_ID` | macOS notarization | Add to repo secrets |
| `APPLE_ID` | macOS notarization | Add to repo secrets |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS notarization | Add to repo secrets |
| `SM_API_KEY` | Windows signing (DigiCert) | Add when cert purchased |
| `SM_CLIENT_CERT_FILE_B64` | Windows signing (DigiCert) | Add when cert purchased |
| `SM_CLIENT_CERT_PASSWORD` | Windows signing (DigiCert) | Add when cert purchased |
| `SM_CODE_SIGNING_CERT_SHA1_HASH` | Windows signing (DigiCert) | Add when cert purchased |

---

## Local Testing Without Secrets

To test the build pipeline locally without signing:

```bash
# macOS — builds unsigned .dmg (works locally, not distributable)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist

# Windows — builds unsigned .exe
npm run dist -- --win
```

Unsigned builds work fine for local testing. Only production releases need signing.
