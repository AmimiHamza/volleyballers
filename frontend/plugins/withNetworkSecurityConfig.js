const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");
const { mkdirSync, writeFileSync } = require("fs");
const { join, dirname } = require("path");

/**
 * Expo config plugin that adds a network_security_config.xml to the Android
 * project and references it in AndroidManifest.xml.
 *
 * This allows cleartext (HTTP) traffic to any host — needed because the
 * backend API is served over plain HTTP during development / early deployment.
 */
function withNetworkSecurityConfig(config) {
  return withAndroidManifest(config, async (modConfig) => {
    const manifest = modConfig.modResults;

    // 1. Write network_security_config.xml into the res/xml directory
    const resDir = join(
      modConfig.modRequest.platformProjectRoot,
      "app",
      "src",
      "main",
      "res",
      "xml"
    );
    mkdirSync(resDir, { recursive: true });

    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;
    writeFileSync(join(resDir, "network_security_config.xml"), xmlContent);

    // 2. Add android:networkSecurityConfig to the <application> tag
    const application = manifest.manifest.application?.[0];
    if (application) {
      application.$["android:networkSecurityConfig"] =
        "@xml/network_security_config";
      // Ensure cleartext is also flagged
      application.$["android:usesCleartextTraffic"] = "true";
    }

    return modConfig;
  });
}

module.exports = withNetworkSecurityConfig;
