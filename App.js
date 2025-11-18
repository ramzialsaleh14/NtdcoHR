import 'react-native-gesture-handler';
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider } from "react-native-paper";
import AppNavigator from "./app/app.navigation";
import { theme } from "./App.style";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import * as Strings from "./app/utils/Strings";
import * as Localization from "expo-localization";
import i18n from "i18n-js";
import * as Commons from "./app/utils/Commons";
import * as Updates from 'expo-updates';
import { BackHandler } from 'react-native';

// Polyfill for deprecated BackHandler.removeEventListener
if (!BackHandler.removeEventListener) {
  BackHandler.removeEventListener = (eventType, handler) => {
    // In newer React Native versions, addEventListener returns a subscription object
    // This polyfill provides backward compatibility
    console.warn('BackHandler.removeEventListener is deprecated. Use the subscription returned by addEventListener.');
    return () => { }; // Return empty function for compatibility
  };
}

const getLanguage = async () => {
  const currentLang = await Commons.getFromAS("lang");
  if (currentLang == null || currentLang == "") {
    if (currentLang == "en") await Commons.saveToAS("lang", "en");
    if (currentLang == "ar") await Commons.saveToAS("lang", "ar");
  }
  if (currentLang == "en") i18n.locale = "en";
  if (currentLang == "ar") i18n.locale = "ar";
  if (currentLang == "" || currentLang == null) i18n.locale = "ar";
  i18n.enableFallback = true;
};

const App = () => {
  // Check for updates manually on app start
  useEffect(() => {
    async function checkForUpdates() {
      try {
        console.log('Checking for updates...');
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log('Update available, downloading...');
          await Updates.fetchUpdateAsync();
          console.log('Update downloaded, reloading...');
          await Updates.reloadAsync();
        } else {
          console.log('No update available');
        }
      } catch (error) {
        console.log('Update check failed:', error);
      }
    }

    // Only check for updates in production builds, not in development
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);

  getLanguage();
  return (
    <PaperProvider theme={theme}>
      <AppNavigator />
    </PaperProvider>
  );
};

export default App;
