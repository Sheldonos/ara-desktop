/**
 * ARA Desktop — macOS Notarization Script
 * 
 * This script runs automatically after electron-builder signs the macOS app
 * (via the "afterSign" hook in package.json build config).
 * 
 * It submits the signed .app to Apple's notarization service, which is required
 * for macOS Gatekeeper to allow the app to run without warnings on end-user machines.
 * 
 * Required environment variables (set as GitHub Actions secrets):
 *   APPLE_ID                    — Your Apple ID email
 *   APPLE_APP_SPECIFIC_PASSWORD — App-specific password from appleid.apple.com
 *   APPLE_TEAM_ID               — Your 10-character Apple Developer Team ID
 * 
 * If these variables are not set (e.g., in local dev builds), notarization is skipped.
 */

const { notarize } = require("@electron/notarize");
const path = require("path");

module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize macOS builds
  if (electronPlatformName !== "darwin") {
    return;
  }

  // Skip if Apple credentials are not configured
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log(
      "[notarize] Skipping notarization — APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, " +
      "or APPLE_TEAM_ID not set. Set these as GitHub Actions secrets for production builds."
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`[notarize] Submitting ${appPath} to Apple notarization service...`);
  console.log(`[notarize] Apple ID: ${appleId} | Team: ${teamId}`);

  try {
    await notarize({
      tool: "notarytool",
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });
    console.log("[notarize] Notarization complete.");
  } catch (error) {
    console.error("[notarize] Notarization failed:", error);
    throw error; // Fail the build so unsigned apps don't get released
  }
};
