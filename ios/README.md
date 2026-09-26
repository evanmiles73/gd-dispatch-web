# GD Car iOS

Native shell for the existing GD Car web application and APNs device registration.

## Required Apple/Xcode settings
- Bundle Identifier must match the server environment variable `APNS_BUNDLE_ID`.
- Enable Signing & Capabilities > Push Notifications.
- Enable Background Modes > Remote notifications only if background notification handling is added later.
- Use a real iPhone for APNs validation.
- Configure Vercel production secrets: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID`.
- Never commit the Apple `.p8` private key.

The current backend defaults to `tw.gd.dispatch.ios` when APNS_BUNDLE_ID is absent. Prefer setting APNS_BUNDLE_ID explicitly before production release.
