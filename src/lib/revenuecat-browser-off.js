/* Stands in for react-native-purchases' dist/browser/nativeModule on iOS and Android
   (metro.config.js sends it here). That module is RevenueCat's "browser mode": a whole web
   SDK (@revenuecat/purchases-js-hybrid-mappings, 0.84 MB of the JS bundle) that
   react-native-purchases only uses in Expo Go, in the Rork sandbox or on the web. This app
   always has the native RNPurchases module, so purchases.js never picks it; with this file
   it would get null instead and throw its own "native module not found" error. */
exports.browserNativeModuleRNPurchases = null;
