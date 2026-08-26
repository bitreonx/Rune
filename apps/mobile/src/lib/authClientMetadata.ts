import type { AuthClientPresentationMetadata } from "@rune/contracts";
import { Platform } from "react-native";

export function authClientMetadata(appVersion?: string): AuthClientPresentationMetadata {
  return {
    label: "RUNE Mobile",
    deviceType: "mobile",
    ...(Platform.OS === "ios" ? { os: "iOS" } : Platform.OS === "android" ? { os: "Android" } : {}),
    surface: "mobile",
    ...(appVersion ? { appVersion } : {}),
  };
}
