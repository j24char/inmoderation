export default {
  expo: {
    name: "InModeration",
    slug: "InModeration",
    ios: {
      bundleIdentifier: "com.jalanc.inmoderation",
      icon: "./assets/icon.png",
      supportsTablet: true
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        // You MUST use the Project ID provided in the error message
        projectId: "8b00c0d1-6c2f-41aa-aacf-db02f8c01baa", 
      },
    },
  },
};
