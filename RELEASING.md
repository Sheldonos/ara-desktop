# ARA Desktop — Release Guide

This document explains how to create a new release, set up code signing, and understand the CI/CD pipeline.

---

## Quick Release (No Code Signing)

To publish a new release without code signing (unsigned builds work fine for internal testing):

```bash
# 1. Bump the version in package.json
npm version patch   # or minor / major

# 2. Push the tag — this triggers the GitHub Actions release workflow
git push origin main --follow-tags
```

The workflow will build `.dmg` (macOS), `.exe` (Windows), and `.AppImage` / `.deb` (Linux), then publish them as a GitHub Release automatically.

---

## Code Signing Setup (Recommended for Production)

### macOS — Developer ID Certificate

1. Obtain a **Developer ID Application** certificate from [Apple Developer](https://developer.apple.com/account/resources/certificates/list).
2. Export it as a `.p12` file with a strong password.
3. Base64-encode it:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```
4. Add these secrets to the GitHub repo (`Settings → Secrets → Actions`):

   | Secret | Value |
   |---|---|
   | `APPLE_CERTIFICATE_BASE64` | Base64-encoded `.p12` content |
   | `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` file |
   | `APPLE_TEAM_ID` | Your 10-character Apple Team ID |
   | `APPLE_ID` | Your Apple ID email |
   | `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from [appleid.apple.com](https://appleid.apple.com) |

### Windows — Code Signing Certificate

1. Obtain an EV or OV code signing certificate from a trusted CA (DigiCert, Sectigo, etc.).
2. Export as `.p12` / `.pfx`.
3. Base64-encode and add secrets:

   | Secret | Value |
   |---|---|
   | `WIN_CERTIFICATE_BASE64` | Base64-encoded `.pfx` content |
   | `WIN_CERTIFICATE_PASSWORD` | Password for the `.pfx` file |

---

## Workflow Files

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | Push to `main`/`develop`, PRs | TypeScript check + build verification |
| `.github/workflows/release.yml` | Push a `v*.*.*` tag | Build all platforms, sign, publish GitHub Release |

---

## electron-builder Configuration

The `build` section in `package.json` configures:
- **macOS**: `.dmg` + `.zip` for x64 and arm64, hardened runtime, notarization
- **Windows**: NSIS installer (`.exe`) for x64
- **Linux**: `.AppImage` + `.deb` for x64
- **Auto-update feed**: GitHub Releases (`latest-mac.yml`, `latest.yml`, `latest-linux.yml`)

---

## Auto-Update Flow (electron-updater)

1. App starts → waits 5 seconds → calls `autoUpdater.checkForUpdates()`
2. If a newer version is found on GitHub Releases, it downloads silently in the background
3. When download completes, a dialog asks the user to restart now or later
4. On restart, the new version is installed automatically

The update feed URLs are:
- macOS: `https://github.com/Sheldonos/ara-desktop/releases/latest/download/latest-mac.yml`
- Windows: `https://github.com/Sheldonos/ara-desktop/releases/latest/download/latest.yml`
- Linux: `https://github.com/Sheldonos/ara-desktop/releases/latest/download/latest-linux.yml`

---

## Required GitHub Secret

The `GITHUB_TOKEN` secret is automatically provided by GitHub Actions — no manual setup needed. It is used to:
- Upload release assets
- Publish the GitHub Release

---

## Versioning Convention

Follow [Semantic Versioning](https://semver.org/):
- `v1.0.0` — stable release
- `v1.0.1` — patch (bug fixes)
- `v1.1.0` — minor (new features, backward compatible)
- `v2.0.0` — major (breaking changes)
- `v1.1.0-beta.1` — pre-release (not delivered to auto-updater stable channel)
