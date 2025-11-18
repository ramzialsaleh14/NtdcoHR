import React from "react";
import {
  Alert,
  Platform,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  FlatList,
  Image,
  NativeModules,
  ScrollView,
  Text,
  Button,
  Keyboard,
  CheckBox,
} from "react-native";
import Toast from "react-native-root-toast";
import * as Constants from "./Constants";
//import { STRINGS } from "./Strings";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

// export const getPath = (uri: string) => {
//   if (uri.startsWith("content://")) {
//     return RNFetchBlob.fs.stat(uri).then((info) => info?.path);
//   }
//   return uri;
// };

export const saveToAS = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.log(error);
  }
};

export const getTintColor = () =>
  Platform.OS === "android" ? "white" : "black";

export const getFromAS = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.log(error);
  }
};

export const multiSaveToAS = async (pairs) => {
  try {
    await AsyncStorage.multiSet(pairs);
  } catch (error) {
    console.log(error);
  }
};

export const removeFromAS = async (key) => {
  try {
    return await AsyncStorage.removeItem(key);
  } catch (error) {
    console.log(error);
  }
};

export const language = async () => {
  const language = await getFromAS(Constants.language);
  let { locale } = await Localization.getLocalizationAsync();

  if (!locale.startsWith("ar") && !locale.startsWith("en")) {
    locale = "en";
  }
  locale = language == null ? locale : language;
  return locale;
};

export const okAlert = (title, msg, cancelable = true, fnToPerform = null) => {
  Alert.alert(
    title,
    msg,
    [
      {
        text: "ok",
        style: "cancel",
        onPress: fnToPerform,
      },
    ],
    { cancelable }
  );
};

export const okMsgAlert = (msg, cancelable = true, fnToPerform = null) => {
  okAlert(
    Platform.OS === "android" ? "" : msg,
    Platform.OS === "android" ? msg : "",
    cancelable,
    fnToPerform
  );
};

export const confirmAlert = (title, msg, yesFn) => {
  Alert.alert(title, msg, [
    {
      text: "cancel",
      style: "cancel",
    },
    {
      text: "yes",
      onPress: yesFn,
    },
  ]);
};

export const confirmLanguageAlert = (title, msg, yesFn) => {
  Alert.alert(title, msg, [
    {
      text: "cancel",
      style: "cancel",
    },
    {
      text: "yes",
      onPress: yesFn,
    },
  ]);
};

export const toast = (value, top = true, duration = Toast.durations.SHORT) => {
  Toast.show(value, {
    duration: duration,
    position: top ? Toast.positions.TOP + 72 : -42,
    shadow: true,
    animation: true,
    delay: 0,
  });
};

export const isIphoneX = () => {
  const dimen = Dimensions.get("window");
  return (
    Platform.OS === "ios" &&
    !Platform.isPad &&
    !Platform.isTVOS &&
    (dimen.height === 812 ||
      dimen.width === 812 ||
      dimen.height === 896 ||
      dimen.width === 896)
  );
};

//export const isArabic = () => STRINGS.curLanguage.startsWith("ar");
