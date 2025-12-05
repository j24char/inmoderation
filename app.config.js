export default {
  expo: {
    name: "InModeration",
    slug: "InModeration",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    assetBundlePatterns: ["**/*"],
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.jalanc.inmoderation",
      icon: "./assets/icon.png",
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      },
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Allow $(PRODUCT_NAME) to access your photos to select an avatar.",
        NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to access your camera to take a photo for your avatar."
      },
      buildNumber: "10000"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "8b00c0d1-6c2f-41aa-aacf-db02f8c01baa"
      }
    }
  }
};
