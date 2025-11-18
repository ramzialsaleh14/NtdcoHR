/*
 * DateTimePicker Implementation Notes:
 * 
 * ISSUE FIXED: DateTimePickers positioning on iOS - they were showing in wrong positions
 * 
 * SOLUTION IMPLEMENTED:
 * 1. iOS: DateTimePickers wrapped in Portal + Modal for centered display with spinner mode
 * 2. Android: DateTimePickers display natively without modal wrapper (unchanged)
 * 3. Fixed onChange handlers to properly handle 'dismissed' events
 * 4. Added modal styling for iOS DateTimePicker positioning
 * 5. Added Done buttons to iOS modals for better UX
 * 
 * RESULT: DateTimePickers now display properly positioned on both platforms:
 * - iOS: Shows centered modal with native wheel picker interface
 * - Android: Shows native calendar/time picker dialogs (unchanged)
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Constants from "expo-constants";
import uuid from "react-native-uuid";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Platform,
  Image,
  Pressable,
  FlatList,
  I18nManager,
  BackHandler,
  Dimensions,
  TextInput as RNTextInput,
  Modal as RNModal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Picker from "../../components/DropdownPickerWrapper";
import * as Constants2 from "../../utils/Constants";
import * as Notifications from "expo-notifications";
import * as ServerOperations from "../../utils/ServerOperations";
import * as Commons from "../../utils/Commons";
import i18n from "../../languages/langStrings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import moment from "moment";
import ProgressDialog from "../../components/ProgressDialog";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import * as Application from "expo-application";
import * as MediaLibrary from "expo-media-library";
import { Portal, Modal } from 'react-native-paper';

TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const AppButton = ({ onPress, title, mode, color, style, icon, children }) => {
  const isOutlined = mode === "outlined";
  const backgroundColor = color || (isOutlined ? "transparent" : "#rgb(1,135,134)");
  const textColor = isOutlined ? (color || "#rgb(1,135,134)") : "#fff";
  const borderColor = color || "#rgb(1,135,134)";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor,
          borderWidth: isOutlined ? 1 : 0,
          borderColor,
          borderRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginVertical: 4,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 40,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text
        style={{
          color: textColor,
          fontSize: 16,
          fontWeight: "500",
          textAlign: "center",
        }}
      >
        {children || title}
      </Text>
    </TouchableOpacity>
  );
};

export default function MainScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [curName, setCurName] = useState("");

  const registerUserToken = async () => {
    const devId = uuid.v4();
    setUserToken(devId);
    const userID = await Commons.getFromAS("userID");
    const curDevId = await Commons.getFromAS("devId");
    if (curDevId == null) {
      registerForPushNotificationsAsync().then((token) => {
        console.log(token);
        callSendUserToken(userID, token, devId);
      });
    } else {
      setProgressDialogVisible(true);
      const serverToken = await ServerOperations.getServerToken(userID);
      if (serverToken.res != curDevId) {
        if (serverToken.res == "") {
          await Commons.removeFromAS("devId");
          registerUserToken();
        } else {
          await Commons.removeFromAS("userID");
          await Commons.removeFromAS("password");
          await navigation.navigate("Login");
          Commons.okMsgAlert(i18n.t("tokenNotRegistered"));
        }
      } else {
        const userToken = await Commons.getFromAS("devId");
        console.log("devId:  " + userToken);
        setUserToken(userToken);
      }
      setProgressDialogVisible(false);
    }
  };

  const callSendUserToken = async (userID, token, devId) => {
    setProgressDialogVisible(true);
    const resp = await ServerOperations.sendUserToken(userID, token, devId);
    if (resp.res == "ok") {
      await Commons.saveToAS("devId", devId);
    } else if (resp.res == "exists") {
      Commons.okAlert("", i18n.t("tokenNotRegistered"));
      await Commons.removeFromAS("userID");
      await Commons.removeFromAS("password");
      navigation.navigate("Login");
    }
    setProgressDialogVisible(false);
  };

  const getCurBirthday = () => {
    const bDate = route.params.bDate;
    const day = bDate.split("/")[0];
    const month = bDate.split("/")[1];
    const curDate = moment().format("DD/MM/yyyy");
    const curDay = curDate.split("/")[0];
    const curMonth = curDate.split("/")[1];
    if (day == curDay && month == curMonth) {
      setShowModalBirthday(true);
    }
  };

  useEffect(() => {
    // Set language to Arabic by default
    const initializeLanguage = async () => {
      await Commons.saveToAS("lang", "ar");
      i18n.locale = "ar";
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    };

    initializeLanguage();

    const isHr = route.params.isHr;
    const isManager = route.params.isManager || false;
    setIsHr(isHr);
    setIsManager(isManager);
    registerUserToken();
    getCurUser();
    allLocations();
    MediaLibrary.requestPermissionsAsync();
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        //Commons.okAlert('Permission to access location was denied');
        return;
      }
      const resp = await ServerOperations.getNamesList();
      setNamesList(resp);
      setFilteredNamesList(resp);
      setFilteredNamesListDev(resp);
      setFilteredNamesListHrChecks(resp);
      setFilteredNamesListViewReqs(resp);
    })();
  }, []);

  // Notification listeners setup
  useEffect(() => {
    // Listener for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      // Handle notification tap here
      const data = response.notification.request.content.data;
      if (data && data.screen) {
        navigation.navigate(data.screen, data.params || {});
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const handleSearch = (text, type) => {
    if (type == "hr") {
      if (text) {
        const newData = namesList.filter((item) => {
          const itemData = item.name
            ? item.name.toUpperCase()
            : "".toUpperCase();
          const textData = text.toUpperCase();
          const itemDataId = item.id;
          return (
            itemData.indexOf(textData) > -1 || itemDataId.indexOf(text) > -1
          );
        });
        setFilteredNamesList(newData);
      } else {
        setFilteredNamesList(namesList);
      }
    }
    if (type == "hrChecks") {
      if (text) {
        const newData = namesList.filter((item) => {
          const itemData = item.name
            ? item.name.toUpperCase()
            : "".toUpperCase();
          const textData = text.toUpperCase();
          const itemDataId = item.id;
          return (
            itemData.indexOf(textData) > -1 || itemDataId.indexOf(text) > -1
          );
        });
        setFilteredNamesListHrChecks(newData);
      } else {
        setFilteredNamesListHrChecks(namesList);
      }
    }
    if (type == "dev") {
      if (text) {
        const newData = namesList.filter((item) => {
          const itemData = item.name
            ? item.name.toUpperCase()
            : "".toUpperCase();
          const textData = text.toUpperCase();
          const itemDataId = item.id;
          return (
            itemData.indexOf(textData) > -1 || itemDataId.indexOf(text) > -1
          );
        });
        setFilteredNamesListDev(newData);
      } else {
        setFilteredNamesListDev(namesList);
      }
    }
    if (type == "viewReqs") {
      if (text) {
        const newData = namesList.filter((item) => {
          const itemData = item.name
            ? item.name.toUpperCase()
            : "".toUpperCase();
          const textData = text.toUpperCase();
          const itemDataId = item.id;
          return (
            itemData.indexOf(textData) > -1 || itemDataId.indexOf(text) > -1
          );
        });
        setFilteredNamesListViewReqs(newData);
      } else {
        setFilteredNamesListViewReqs(namesList);
      }
    }
  };

  const getCurLocation = () => {
    let loctext = "Waiting..";
    if (errorMsg) {
      loctext = errorMsg;
    } else if (location) {
      loctext = JSON.stringify(location);
      setCurLocation(
        location.coords.latitude + "," + location.coords.longitude
      );
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;

    // CRITICAL: Create notification channel FIRST (required for Android 13+)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
      console.log("Notification channel created");
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }

    // SDK 54 REQUIRES projectId parameter
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        throw new Error('Project ID not found in app configuration');
      }

      console.log("Using projectId:", projectId);
      console.log("App ownership:", Constants.appOwnership);

      // Always use projectId for SDK 54
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })
      ).data;

    } catch (error) {
      console.error("Error getting push token:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      alert(`Failed to get push token: ${error.message}`);
      return;
    }

    console.log("token: " + token);
    console.log("projectID: " + Constants.expoConfig.extra.eas.projectId);
    console.log("App ownership: " + Constants.appOwnership);

    return token;
  }
  const [pickerVal, setPickerVal] = useState("Pending");
  const [pickerValHrChecks, setPickerValHrChecks] = useState("All");
  const [myReqsStatusPickerVal, setMyReqsStatusPickerVal] = useState("Pending");
  const [viewReqsStatusPickerVal, setViewReqsStatusPickerVal] = useState("Pending");
  // Default to leaves (matching reqTypeHrPickerVal values)
  const [reqTypePickerVal, setReqTypePickerVal] = useState("leaves");
  // Default to leaves - use same string keys as other reqType pickers
  const [myReqsTypePickerVal, setMyReqsTypePickerVal] = useState("leaves");
  const [reqTypeHrPickerVal, setReqTypeHrPickerVal] = useState("leaves");
  const [typePickerVal, setTypePickerVal] = useState("رسمية");
  const [lateCheckPickerVal, setlateCheckPickerVal] = useState("");
  const [locationPickerVal, setLocationPickerVal] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showModalHrChecks, setShowModalHrChecks] = useState(false);
  const [showSelectTypeModal, setShowSelectTypeModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSelectMyReqsTypeModal, setShowSelectMyReqsTypeModal] = useState(false);
  const [showSelectUserViewReqsModal, setShowSelectUserViewReqsModal] = useState(false);
  const [showModalBirthday, setShowModalBirthday] = useState(false);
  const [showFromDate, setShowFromDate] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [showFromDateHrChecks, setShowFromDateHrChecks] = useState(false);
  const [showToDateHrChecks, setShowToDateHrChecks] = useState(false);
  const [showFromDateViewReqs, setShowFromDateViewReqs] = useState(false);
  const [showToDateViewReqs, setShowToDateViewReqs] = useState(false);
  const [mode, setMode] = useState("date");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [fromDateText, setFromDateText] = useState("");
  const [toDateText, setToDateText] = useState("");
  const [userNoText, setUserNoText] = useState("");
  const [fromDateHrChecks, setFromDateHrChecks] = useState(new Date());
  const [toDateHrChecks, setToDateHrChecks] = useState(new Date());
  const [fromDateTextHrChecks, setFromDateTextHrChecks] = useState("");
  const [toDateTextHrChecks, setToDateTextHrChecks] = useState("");
  const [userNoTextHrChecks, setUserNoTextHrChecks] = useState("");
  const [fromDateViewReqs, setFromDateViewReqs] = useState(new Date());
  const [toDateViewReqs, setToDateViewReqs] = useState(new Date());
  const [fromDateTextViewReqs, setFromDateTextViewReqs] = useState("");
  const [toDateTextViewReqs, setToDateTextViewReqs] = useState("");
  const [userNoTextViewReqs, setUserNoTextViewReqs] = useState("");
  const [dialogNotes, setDialogNotes] = useState("");
  const [locations, setLocations] = useState([]);
  const [progressDialogVisible, setProgressDialogVisible] = useState(false);
  const [breakTime, setBreakTime] = useState(90);
  const [userToClear, setUserToClear] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isHr, setIsHr] = useState(false);
  const [isManager, setIsManager] = useState(false);
  //announcements modal
  const [showModalAnn, setShowModalAnn] = useState(false);
  const [showSelectUserHrModal, setShowSelectUserHrModal] = useState(false);
  const [showSelectUserHrChecksModal, setShowSelectUserHrChecksModal] =
    useState(false);
  const [showSelectUserClearDevModal, setShowSelectUserClearDevModal] =
    useState(false);
  const [showModalLateCheck, setShowModalLateCheck] = useState(false);
  const [showDialogClearDevice, setShowDialogClearDevice] = useState(false);
  const [showModalCheck, setShowModalCheck] = useState(false);
  const [showModalBreak, setShowModalBreak] = useState(false);
  const [showModalBreakInfo, setShowModalBreakInfo] = useState(false);
  const [showFromDateAnn, setShowFromDateAnn] = useState(false);
  const [showToDateAnn, setShowToDateAnn] = useState(false);
  const [fromDateAnn, setFromDateAnn] = useState(new Date());
  const [toDateAnn, setToDateAnn] = useState(new Date());
  const [fromDateTextAnn, setFromDateTextAnn] = useState("");
  const [toDateTextAnn, setToDateTextAnn] = useState("");
  const [showFromDateMyReqs, setShowFromDateMyReqs] = useState(false);
  const [showToDateMyReqs, setShowToDateMyReqs] = useState(false);
  const [fromDateMyReqs, setFromDateMyReqs] = useState(new Date());
  const [toDateMyReqs, setToDateMyReqs] = useState(new Date());
  const [fromDateTextMyReqs, setFromDateTextMyReqs] = useState("");
  const [toDateTextMyReqs, setToDateTextMyReqs] = useState("");
  const [curUser, setCurUser] = useState("");
  const [inOutFlag, setInOutFlag] = useState("");
  const [showFromTimeBreak, setShowFromTimeBreak] = useState(false);
  const [showToTimeBreak, setShowToTimeBreak] = useState(false);
  const [fromTimeBreak, setFromTimeBreak] = useState(new Date());
  const [toTimeBreak, setToTimeBreak] = useState(new Date());
  const [fromTimeTextBreak, setFromTimeTextBreak] = useState("");
  const [ToTimeTextBreak, setToTimeTextBreak] = useState("");
  const [searchTextHr, setSearchTextHr] = useState("");
  const [searchTextHrChecks, setSearchTextHrChecks] = useState("");
  const [searchTextClearDev, setSearchTextClearDev] = useState("");
  const [searchTextViewReqs, setSearchTextViewReqs] = useState("");
  //location
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [curLocation, setCurLocation] = useState("");
  const [dialogLocation, setDialogLocation] = useState("");
  const [dialogCarNo, setDialogCarNo] = useState("");
  const [is3ml, setIs3ml] = useState(false);
  const [namesList, setNamesList] = useState([]);
  const [fitleredNamesList, setFilteredNamesList] = useState([]);
  const [fitleredNamesListHrChecks, setFilteredNamesListHrChecks] = useState(
    []
  );
  const [fitleredNamesListDev, setFilteredNamesListDev] = useState([]);
  const [fitleredNamesListViewReqs, setFilteredNamesListViewReqs] = useState([]);

  // Temporary states for picker values
  const [tempFromDateAnn, setTempFromDateAnn] = useState(new Date());
  const [tempToDateAnn, setTempToDateAnn] = useState(new Date());
  const [tempFromTimeBreak, setTempFromTimeBreak] = useState(new Date());
  const [tempToTimeBreak, setTempToTimeBreak] = useState(new Date());
  const [tempFromDate, setTempFromDate] = useState(new Date());
  const [tempToDate, setTempToDate] = useState(new Date());
  const [tempFromDateHrChecks, setTempFromDateHrChecks] = useState(new Date());
  const [tempToDateHrChecks, setTempToDateHrChecks] = useState(new Date());
  const [tempFromDateViewReqs, setTempFromDateViewReqs] = useState(new Date());
  const [tempToDateViewReqs, setTempToDateViewReqs] = useState(new Date());
  const [tempFromDateMyReqs, setTempFromDateMyReqs] = useState(new Date());
  const [tempToDateMyReqs, setTempToDateMyReqs] = useState(new Date());

  const showFromTimepicker = () => {
    setTempFromTimeBreak(fromTimeBreak);
    setShowFromTimeBreak(true);
    setMode("time");
  };

  const showToTimepicker = () => {
    setTempToTimeBreak(toTimeBreak);
    setShowToTimeBreak(true);
    setMode("time");
  };

  const onChangeToTimeBreak = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowToTimeBreak(false);
      return;
    }

    const currentDate = selectedDate || tempToTimeBreak;
    setTempToTimeBreak(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowToTimeBreak(false);
      setToTimeBreak(currentDate);
      let tempDate = new Date(currentDate);
      let hours = tempDate.getHours();
      let hoursLength = hours.toLocaleString().length;
      if (hoursLength === 1) {
        hours = "0" + hours;
      }
      let mins = tempDate.getMinutes();
      let minsLength = mins.toLocaleString().length;
      if (minsLength === 1) {
        mins = "0" + mins;
      }
      let fTime = hours + ":" + mins;
      setToTimeTextBreak(fTime);
    }
  };

  const onChangeFromTimeBreak = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowFromTimeBreak(false);
      return;
    }

    const currentDate = selectedDate || tempFromTimeBreak;
    setTempFromTimeBreak(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowFromTimeBreak(false);
      setFromTimeBreak(currentDate);
      let tempDate = new Date(currentDate);
      let hours = tempDate.getHours();
      let hoursLength = hours.toLocaleString().length;
      if (hoursLength === 1) {
        hours = "0" + hours;
      }
      let mins = tempDate.getMinutes();
      let minsLength = mins.toLocaleString().length;
      if (minsLength === 1) {
        mins = "0" + mins;
      }
      let fTime = hours + ":" + mins;
      setFromTimeTextBreak(fTime);
    }
  };

  const getCurUser = async () => {
    const currentUser = await Commons.getFromAS("userID");
    const currentName = await Commons.getFromAS("curName");
    setCurName(currentName);
    if (currentUser == null) {
      clearStorage();
      Commons.okAlert("User Not Logged in");
    }
    setCurUser(currentUser);
  };

  function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000;
  }

  function toRad(Value) {
    return (Value * Math.PI) / 180;
  }

  const allLocations = async () => {
    const user = await Commons.getFromAS("userID");
    const locs = await ServerOperations.getLocations(user);
    setLocations(locs);
    console.log(locs[0]);
    let locVal = locs[0].locID + ";" + locs[0].name + ";" + locs[0].loc;
    setLocationPickerVal(locVal);
  };

  const renderLocList = () => {
    return locations.map((location) => {
      const locVal = `${location.locID};${location.name};${location.loc}`;
      return <Picker.Item key={location.locID} label={location.name} value={locVal} />;
    });
  };

  const onChangeFromDateAnn = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowFromDateAnn(false);
      return;
    }

    const currentDate = selectedDate || tempFromDateAnn;
    setTempFromDateAnn(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowFromDateAnn(false);
      setFromDateAnn(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setFromDateTextAnn(fDate);
    }
  };
  const onChangeToDateAnn = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowToDateAnn(false);
      return;
    }

    const currentDate = selectedDate || tempToDateAnn;
    setTempToDateAnn(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowToDateAnn(false);
      setToDateAnn(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setToDateTextAnn(fDate);
    }
  };
  const onChangeFromDateMyReqs = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowFromDateMyReqs(false);
      return;
    }

    const currentDate = selectedDate || tempFromDateMyReqs;
    setTempFromDateMyReqs(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowFromDateMyReqs(false);
      setFromDateMyReqs(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setFromDateTextMyReqs(fDate);
    }
  };
  const onChangeToDateMyReqs = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowToDateMyReqs(false);
      return;
    }

    const currentDate = selectedDate || tempToDateMyReqs;
    setTempToDateMyReqs(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowToDateMyReqs(false);
      setToDateMyReqs(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setToDateTextMyReqs(fDate);
    }
  };

  const showFromDatePickerAnn = () => {
    setTempFromDateAnn(fromDateAnn);
    setShowFromDateAnn(true);
    setMode("date");
  };

  const showToDatePickerAnn = () => {
    setTempToDateAnn(toDateAnn);
    setShowToDateAnn(true);
    setMode("date");
  };

  const showFromDatePickerMyReqs = () => {
    setTempFromDateMyReqs(fromDateMyReqs);
    setShowFromDateMyReqs(true);
    setMode("date");
  };

  const showToDatePickerMyReqs = () => {
    setTempToDateMyReqs(toDateMyReqs);
    setShowToDateMyReqs(true);
    setMode("date");
  };

  //ann

  const onChangeFromDate = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowFromDate(false);
      return;
    }

    const currentDate = selectedDate || tempFromDate;
    setTempFromDate(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowFromDate(false);
      setFromDate(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setFromDateText(fDate);
    }
  };
  const onChangeToDate = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowToDate(false);
      return;
    }

    const currentDate = selectedDate || tempToDate;
    setTempToDate(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowToDate(false);
      setToDate(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setToDateText(fDate);
    }
  };

  const onChangeFromDateViewReqs = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowFromDateViewReqs(false);
      return;
    }

    const currentDate = selectedDate || tempFromDateViewReqs;
    setTempFromDateViewReqs(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowFromDateViewReqs(false);
      setFromDateViewReqs(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setFromDateTextViewReqs(fDate);
    }
  };
  const onChangeToDateViewReqs = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowToDateViewReqs(false);
      return;
    }

    const currentDate = selectedDate || tempToDateViewReqs;
    setTempToDateViewReqs(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowToDateViewReqs(false);
      setToDateViewReqs(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setToDateTextViewReqs(fDate);
    }
  };

  const onChangeFromDateHrChecks = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowFromDateHrChecks(false);
      return;
    }

    const currentDate = selectedDate || tempFromDateHrChecks;
    setTempFromDateHrChecks(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowFromDateHrChecks(false);
      setFromDateHrChecks(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setFromDateTextHrChecks(fDate);
    }
  };
  const onChangeToDateHrChecks = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowToDateHrChecks(false);
      return;
    }

    const currentDate = selectedDate || tempToDateHrChecks;
    setTempToDateHrChecks(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowToDateHrChecks(false);
      setToDateHrChecks(currentDate);
      let tempDate = new Date(currentDate);
      let fDate =
        tempDate.getDate() +
        "/" +
        (tempDate.getMonth() + 1) +
        "/" +
        tempDate.getFullYear();
      setToDateTextHrChecks(fDate);
    }
  };

  const onBreakEndPress = async () => {
    setProgressDialogVisible(true);
    const date = moment().format("DD/MM/YYYY");
    const timeResp = await ServerOperations.getServerCurTime();
    const curTime = timeResp.res;
    const user = await Commons.getFromAS("userID");
    const resp = await ServerOperations.breakEnd(curUser, date, curTime);
    console.log(resp.res);
    if (resp.res == "noItem") {
      Commons.okAlert("لا يوجد طلب بدء استراحة");
      setProgressDialogVisible(false);
    }
    if (resp.res == "ok") {
      Commons.okAlert("تم انهاء الاستراحة");
      setProgressDialogVisible(false);
    }
    if (resp.res == "late") {
      const secondResp = await ServerOperations.sendLeaveRequest(
        user,
        date,
        "",
        resp.reqTime,
        curTime,
        "",
        "مغادرة سنوية",
        "",
        "",
        "",
        ""
      );
      if (secondResp.result === true) {
        Commons.okAlert("تم ارسال طلب مغادرة سنوية");
        setProgressDialogVisible(false);
      }
    }
    setProgressDialogVisible(false);
  };

  const onBreakInPress = async () => {
    const timeResp = await ServerOperations.getServerCurTime();
    const curTime = timeResp.res + ":00";
    console.log(curTime);
    if (
      curTime < "16:30:00" &&
      (curTime < "13:00:00" || curTime >= "15:00:00")
    ) {
      Commons.okAlert("غير مسموح", "خارج الوقت المحدد للبريك");
      return;
    }

    if (curTime >= "17:30:00") {
      Commons.okAlert("غير مسموح", "خارج الوقت المحدد للبريك");
      return;
    }
    setProgressDialogVisible(true);
    const date = moment().format("DD/MM/YYYY");
    const resp = await ServerOperations.breakStart(
      curUser,
      date,
      timeResp.res,
      ""
    );
    if (resp.res == "overLimit") {
      Commons.okAlert("الوقت المدخل يتعدى الوقت المسموح للاستراحة");
      setProgressDialogVisible(false);
    } else if (resp.res == "exists") {
      setProgressDialogVisible(false);
      Commons.okAlert("توجد استراحة فعالة");
    } else {
      setProgressDialogVisible(false);
      Commons.okAlert("تم بدء الاستراحة");
    }
  };

  const showFromDatePicker = () => {
    setTempFromDate(fromDate);
    setShowFromDate(true);
    setMode("date");
  };

  const showToDatePicker = () => {
    setTempToDate(toDate);
    setShowToDate(true);
    setMode("date");
  };

  const showFromDatePickerViewReqs = () => {
    setTempFromDateViewReqs(fromDateViewReqs);
    setShowFromDateViewReqs(true);
    setMode("date");
  };
  const showToDatePickerViewReqs = () => {
    setTempToDateViewReqs(toDateViewReqs);
    setShowToDateViewReqs(true);
    setMode("date");
  };
  const showFromDatePickerHrChecks = () => {
    setTempFromDateHrChecks(fromDateHrChecks);
    setShowFromDateHrChecks(true);
    setMode("date");
  };
  const showToDatePickerHrChecks = () => {
    setTempToDateHrChecks(toDateHrChecks);
    setShowToDateHrChecks(true);
    setMode("date");
  };

  const [userToken, setUserToken] = useState("");
  const onCheckInPress = async () => {
    console.log('CheckIn pressed - starting process');
    console.log('Platform:', Platform.OS);
    console.log('Setting progressDialogVisible to true');
    setProgressDialogVisible(true);

    try {
      const serCurTimeResp = await ServerOperations.getServerCurTime();
      let curTime = serCurTimeResp.res;
      const user = await Commons.getFromAS("userID");
      const date = moment().format("DD/MM/YYYY");

      const respChecked = await ServerOperations.CheckIsChecked(user, date, "In");
      console.log(respChecked.res);

      if (respChecked.res == "alreadyChecked") {
        setProgressDialogVisible(false);
        Commons.okAlert("توجد بصمة سابقة لك اليوم");
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      let curLocation =
        location.coords.latitude + "," + location.coords.longitude;
      let lat1 = curLocation.split(",")[0];
      let long1 = curLocation.split(",")[1];
      let locVal = locationPickerVal.split(";")[2];
      let lat2 = locVal.split(",")[0];
      let long2 = locVal.split(",")[1];
      let distance = calcCrow(lat1, long1, lat2, long2);
      let locId = locationPickerVal.split(";")[0];
      const locResp = await ServerOperations.getLocationDistance(locId, user);
      const allowedRadius = locResp.res;
      const ignoreLoc = locResp.ignoreLocation;

      if (
        allowedRadius == "" ||
        allowedRadius == undefined ||
        allowedRadius == null
      ) {
        setProgressDialogVisible(false);
        Commons.okAlert("", "المسافة المسموحة للموقع غير معرفة");
        return;
      }

      console.log("allowedRadius " + allowedRadius);
      if (distance <= allowedRadius || ignoreLoc == "Y") {
        const user = await Commons.getFromAS("userID");
        const date = moment().format("DD/MM/YYYY");
        const time = moment().format("HH:mm");
        let locId = locationPickerVal.split(";")[0];
        const resp = await ServerOperations.checkInOrOut(
          user,
          date,
          curTime,
          curLocation,
          locId,
          "In",
          "",
          userToken
        );
        setProgressDialogVisible(false);
        let msg = "";
        if (resp.res == "ok") {
          if (lateCheckPickerVal == "عمل") {
            //after ramadan make 9 => 8:30
            const leaveResp = await ServerOperations.sendLeaveRequest(
              user,
              date,
              date,
              "08:30",
              curTime,
              dialogNotes,
              "مغادرة رسمية",
              "",
              dialogLocation,
              dialogCarNo,
              ""
            );
            if (leaveResp.result === true) {
              msg = "تم ارسال طلب مغادرة رسمية";
            } else {
              msg = "لم يتم الارسال الرجاء المحاولة مرة اخرى";
            }
          }
          if (lateCheckPickerVal == "شخصية") {
            //after ramadan make 9 => 8:30
            const leaveResp = await ServerOperations.sendLeaveRequest(
              user,
              date,
              date,
              "08:30",
              curTime,
              dialogNotes,
              "مغادرة سنوية",
              "",
              "",
              "",
              ""
            );
            if (leaveResp.result === true) {
              msg = "تم ارسال طلب مغادرة سنوية";
              if (leaveResp.overlimit === true) {
                msg =
                  "وقت المغادرة تجاوز الاربع ساعات وسيتم احتسابها كاجازة سنوية";
              }
            } else {
              msg = "لم يتم الارسال الرجاء المحاولة مرة اخرى";
            }
          }
          if (msg == "") {
            Commons.okAlert("تم الارسال");
          } else {
            Commons.okAlert(msg);
          }
        } else {
          if (resp.res == "alreadyChecked") {
            Commons.okAlert("توجد بصمة سابقة لك اليوم");
          } else if (resp.res == "tokenExists") {
            Commons.okAlert("الحساب معرف على جهاز اخر");
          } else {
            Commons.okAlert(
              "لم يتم الارسال,الرجاء التأكد من الاتصال بالانترنت والمحاولة مرة اخرى"
            );
          }
        }
      } else {
        console.log("Location check failed - not near company building");
        Commons.okAlert("يرجى التواجد قرب مبنى الشركة");
      }
    } catch (error) {
      console.log("onCheckInPress error:", error);
      Commons.okAlert("حدث خطأ، الرجاء المحاولة مرة أخرى");
    } finally {
      console.log("onCheckInPress finally - hiding progress dialog");
      setProgressDialogVisible(false);
      setlateCheckPickerVal("");
    }
  };

  const onCheckOutPress = async () => {
    console.log("onCheckOutPress called - starting checkout process");
    console.log('Platform:', Platform.OS);
    console.log('Setting progressDialogVisible to true');
    setProgressDialogVisible(true);

    try {
      const serCurTimeResp = await ServerOperations.getServerCurTime();
      const curTime = serCurTimeResp.res;
      const dayOfWeek = moment().day();
      const user = await Commons.getFromAS("userID");
      const date = moment().format("DD/MM/YYYY");
      console.log(curTime);
      console.log(dayOfWeek);

      const respChecked = await ServerOperations.CheckIsChecked(
        user,
        date,
        "Out"
      );
      console.log(respChecked.res);

      if (respChecked.res == "alreadyCheckedOut") {
        Commons.okAlert("توجد بصمة خروج سابقة لك اليوم");
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      let curLocation =
        location.coords.latitude + "," + location.coords.longitude;
      let lat1 = curLocation.split(",")[0];
      let long1 = curLocation.split(",")[1];
      let locVal = locationPickerVal.split(";")[2];
      let lat2 = locVal.split(",")[0];
      let long2 = locVal.split(",")[1];
      let distance = calcCrow(lat1, long1, lat2, long2);
      let locId = locationPickerVal.split(";")[0];
      const locResp = await ServerOperations.getLocationDistance(locId, user);
      const allowedRadius = locResp.res;
      const ignoreLoc = locResp.ignoreLocation;

      if (
        allowedRadius == "" ||
        allowedRadius == undefined ||
        allowedRadius == null
      ) {
        Commons.okAlert("", "المسافة المسموحة للموقع غير معرفة");
        return;
      }

      console.log("allowedRadius " + allowedRadius);

      if (distance <= allowedRadius || ignoreLoc == "Y") {
        const user = await Commons.getFromAS("userID");
        const date = moment().format("DD/MM/YYYY");
        const time = moment().format("HH:mm");
        let locId = locationPickerVal.split(";")[0];
        const resp = await ServerOperations.checkInOrOut(
          user,
          date,
          curTime,
          curLocation,
          locId,
          "Out",
          "",
          userToken
        );

        let msg = "";
        if (resp.res == "ok") {
          if (lateCheckPickerVal == "عمل") {
            const leaveResp = await ServerOperations.sendLeaveRequest(
              user,
              date,
              date,
              curTime,
              "18:00",
              dialogNotes,
              "مغادرة رسمية",
              "",
              "",
              "",
              ""
            );
            if (leaveResp.result === true) {
              msg = "تم ارسال طلب مغادرة رسمية";
            } else {
              msg = "لم يتم الارسال الرجاء المحاولة مرة اخرى";
            }
          }
          if (lateCheckPickerVal == "شخصية") {
            const leaveResp = await ServerOperations.sendLeaveRequest(
              user,
              date,
              date,
              curTime,
              "18:00",
              dialogNotes,
              "مغادرة سنوية",
              "",
              "",
              "",
              ""
            );
            if (leaveResp.result === true) {
              msg = "تم ارسال طلب مغادرة سنوية";
            } else {
              msg = "لم يتم الارسال الرجاء المحاولة مرة اخرى";
            }
          }
          if (msg == "") {
            Commons.okAlert("تم الارسال");
          } else {
            Commons.okAlert(msg);
          }
        } else {
          if (resp.res == "notCheckedIn") {
            Commons.okAlert("لا توجد بصمة دخول لك اليوم");
          } else if (resp.res == "tokenExists") {
            Commons.okAlert("الحساب معرف على جهاز اخر");
          } else {
            Commons.okAlert(
              "لم يتم الارسال,الرجاء التأكد من الاتصال بالانترنت والمحاولة مرة اخرى"
            );
          }
        }
      } else {
        console.log("Location check failed - not near company building");
        Commons.okAlert("يرجى التواجد قرب مبنى الشركة");
      }
    } catch (error) {
      console.log("onCheckOutPress error:", error);
      Commons.okAlert("حدث خطأ، الرجاء المحاولة مرة أخرى");
    } finally {
      console.log("onCheckOutPress finally - hiding progress dialog");
      setProgressDialogVisible(false);
      setlateCheckPickerVal("");
    }
  };

  const handleSelectUserPress = (type) => {
    setProgressDialogVisible(true);
    if (type == "hr") {
      setShowSelectUserHrModal(true);
      setShowModal(false);
    }
    if (type == "hrChecks") {
      setShowSelectUserHrChecksModal(true);
      setShowModalHrChecks(false);
    }
    if (type == "clearDev") {
      setShowSelectUserClearDevModal(true);
      setShowDialogClearDevice(false);
    }
    if (type == "viewReqs") {
      setShowSelectUserViewReqsModal(true);
      setShowSelectTypeModal(false);
    }
    setProgressDialogVisible(false);
  };
  // const checkBreakType = async () => {
  //   setProgressDialogVisible(true);
  //   const date = moment().format('DD/MM/YYYY');
  //   const user = await Commons.getFromAS("userID");
  //   const resp = await ServerOperations.getCheckedInLocation(user,date);
  //   if(resp.res == "5"){
  //     if(resp.timeDiff == '01:30' || resp.timeDiff == '') setBreakTime(60);
  //     if(resp.timeDiff == '01:00') setBreakTime(30);
  //     setProgressDialogVisible(false);
  //   }else {
  //     setBreakTime(90);
  //     setProgressDialogVisible(false);
  //   }
  // }

  const clearStorage = async () => {
    await Commons.removeFromAS("userID");
    await Commons.removeFromAS("password");
    const user = await Commons.getFromAS("userID");
    console.log(user);
    navigation.navigate("Login");
    // BackHandler.exitApp();
  };

  // const changeLanguage = async () => {
  //   const curLang = await Commons.getFromAS("curLang");
  //   await Commons.removeFromAS("curLang");
  //   if (curLang == "ar") {
  //     await Commons.saveToAS("curLang", "en");
  //   }
  // };

  /* Language switching function - not used anymore since language is fixed to Arabic
  const switchLanguage = async (curLang) => {
    const changeTo = curLang == "English" ? "en" : "ar";
    console.log(changeTo);
    await Commons.removeFromAS("lang");
    await Commons.saveToAS("lang", changeTo);
    if (changeTo == "ar") {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    } else {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
    i18n.locale = changeTo;

    // Restart the app to apply language changes
    try {
      // Use setTimeout to ensure the language change is applied before reload
      setTimeout(() => {
        Updates.reloadAsync();
      }, 100);
    } catch (error) {
      console.error("Error reloading app:", error);
      // Fallback: show alert to user to restart manually
      alert("Language changed. Please restart the app to see changes.");
    }
  };
  */

  // Render Functions for Modals
  const renderSelectUserHrModal = () => {
    if (!showSelectUserHrModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowSelectUserHrModal(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <RNTextInput
          placeholder="Search"
          clearButtonMode="always"
          style={styles.searchBox}
          value={searchTextHr}
          onChangeText={(text) => {
            setSearchTextHr(text);
            handleSearch(text, "hr");
          }}
        />
        <FlatList
          keyExtractor={(item) => item.id}
          data={fitleredNamesList}
          extraData={fitleredNamesList}
          renderItem={({ item }) => (
            <View>
              <TouchableOpacity
                onPress={() => {
                  setUserNoText(item.id);
                  setShowSelectUserHrModal(false);
                  setShowModal(true);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    padding: 15,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ marginRight: 20, color: "red" }}>
                    {item.id}
                  </Text>
                  <Text>{item.name}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      </Modal>
    );
  };

  const renderSelectUserHrChecksModal = () => {
    if (!showSelectUserHrChecksModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowSelectUserHrChecksModal(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <RNTextInput
          placeholder="Search"
          clearButtonMode="always"
          style={styles.searchBox}
          value={searchTextHrChecks}
          onChangeText={(text) => {
            setSearchTextHrChecks(text);
            handleSearch(text, "hrChecks");
          }}
        />
        <FlatList
          keyExtractor={(item) => item.id}
          data={fitleredNamesListHrChecks}
          extraData={fitleredNamesListHrChecks}
          renderItem={({ item }) => (
            <View>
              <TouchableOpacity
                onPress={() => {
                  setUserNoTextHrChecks(item.id);
                  setShowSelectUserHrChecksModal(false);
                  setShowModalHrChecks(true);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    padding: 15,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ marginRight: 20, color: "red" }}>
                    {item.id}
                  </Text>
                  <Text>{item.name}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      </Modal>
    );
  };

  const renderSelectUserClearDevModal = () => {
    if (!showSelectUserClearDevModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowSelectUserClearDevModal(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <RNTextInput
          placeholder="Search"
          clearButtonMode="always"
          style={styles.searchBox}
          value={searchTextClearDev}
          onChangeText={(text) => {
            setSearchTextClearDev(text);
            handleSearch(text, "dev");
          }}
        />
        <FlatList
          keyExtractor={(item) => item.id}
          data={fitleredNamesListDev}
          extraData={fitleredNamesListDev}
          renderItem={({ item }) => (
            <View>
              <TouchableOpacity
                onPress={() => {
                  setUserToClear(item.id);
                  setShowSelectUserClearDevModal(false);
                  setShowDialogClearDevice(true);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    padding: 15,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ marginRight: 20, color: "red" }}>
                    {item.id}
                  </Text>
                  <Text>{item.name}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      </Modal>
    );
  };

  const renderSelectUserViewReqsModal = () => {
    if (!showSelectUserViewReqsModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowSelectUserViewReqsModal(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <RNTextInput
          placeholder="Search"
          clearButtonMode="always"
          style={styles.searchBox}
          value={searchTextViewReqs}
          onChangeText={(text) => {
            setSearchTextViewReqs(text);
            handleSearch(text, "viewReqs");
          }}
        />
        <FlatList
          keyExtractor={(item) => item.id}
          data={fitleredNamesListViewReqs}
          extraData={fitleredNamesListViewReqs}
          renderItem={({ item }) => (
            <View>
              <TouchableOpacity
                onPress={() => {
                  setUserNoTextViewReqs(item.id);
                  setShowSelectUserViewReqsModal(false);
                  setShowSelectTypeModal(true);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    padding: 15,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ marginRight: 20, color: "red" }}>
                    {item.id}
                  </Text>
                  <Text>{item.name}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      </Modal>
    );
  };

  const renderDialogClearDevice = () => {
    if (!showDialogClearDevice) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowDialogClearDevice(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <View>
          <Pressable onPress={() => handleSelectUserPress("clearDev")}>
            <View pointerEvents="none">
              <RNTextInput
                placeholder={i18n.t("selectUser")}
                value={userToClear}
                style={styles.textInputWithBorder}
                onChangeText={setUserToClear}
              />
            </View>
          </Pressable>
          <AppButton
            mode="contained"
            style={{ marginVertical: 25 }}
            onPress={async () => {
              setProgressDialogVisible(true);
              const resp = await ServerOperations.clearUserDeviceID(
                userToClear
              );
              if (resp.res == "sent") {
                Commons.okAlert("Device id cleared.");
              }
              setProgressDialogVisible(false);
            }}
          >
            {i18n.t("submit")}
          </AppButton>
        </View>
      </Modal>
    );
  };

  const renderChangePasswordModal = () => {
    if (!showChangePasswordModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowChangePasswordModal(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <View>
          <RNTextInput
            placeholder={i18n.t("newPassword")}
            value={newPassword}
            style={[styles.textInputWithBorder, { margin: 15, width: "90%" }]}
            onChangeText={setNewPassword}
          />
          <AppButton
            mode="contained"
            style={{ marginVertical: 25 }}
            onPress={async () => {
              setProgressDialogVisible(true);
              const userID = await Commons.getFromAS("userID");
              if (newPassword != "") {
                const resp = await ServerOperations.changePassword(
                  userID,
                  newPassword
                );
                if (resp.result == true) {
                  Commons.okAlert(i18n.t("passwordChanged"));
                  setShowChangePasswordModal(false);
                } else {
                  Commons.okAlert("لم يتم الارسال,كلمة المرور لا تصح");
                }
              }
              setProgressDialogVisible(false);
            }}
          >
            {i18n.t("submit")}
          </AppButton>
        </View>
      </Modal>
    );
  };

  const renderModalLateCheck = () => {
    if (!showModalLateCheck) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => {
          setShowModalLateCheck(false);
          setShowModalCheck(true);
        }}
        contentContainerStyle={styles.modalStyle}
      >
        <View style={{ padding: 35, margin: 15 }}>
          <Picker
            selectedValue={lateCheckPickerVal}
            style={styles.typePicker2}
            onValueChange={(itemValue, itemIndex) => {
              setlateCheckPickerVal(itemValue);
              setIs3ml(itemValue === "عمل");
            }}
          >
            <Picker.Item label="اختار سبب المغادرة" value="" />
            <Picker.Item label="شخصية" value="شخصية" />
            <Picker.Item label="عمل" value="عمل" />
          </Picker>
          <RNTextInput
            placeholder={i18n.t("notes")}
            style={[styles.textInputWithBorder, { width: "90%", margin: 15 }]}
            value={dialogNotes}
            onChangeText={setDialogNotes}
          />
          {!!is3ml && (
            <View>
              <RNTextInput
                placeholder={i18n.t("location")}
                style={[styles.textInputWithBorder, { width: "90%", margin: 15 }]}
                value={dialogLocation}
                onChangeText={setDialogLocation}
              />
              <RNTextInput
                placeholder={i18n.t("carNo")}
                style={[styles.textInputWithBorder, { width: "90%", margin: 15 }]}
                value={dialogCarNo}
                onChangeText={setDialogCarNo}
              />
            </View>
          )}
        </View>
        <AppButton
          style={styles.appButton}
          onPress={() => {
            if (lateCheckPickerVal !== "") {
              if (inOutFlag == "In") {
                onCheckInPress();
              } else if (inOutFlag == "Out") {
                onCheckOutPress();
              }
            } else {
              Commons.okAlert("الرجاء اختيار سبب المغادرة");
              return;
            }
            setShowModalLateCheck(false);
            setShowModalCheck(true);
          }}
        >
          {i18n.t("submit")}
        </AppButton>
      </Modal>
    );
  };

  const renderModalAnn = () => {
    if (!showModalAnn) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowModalAnn(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <View>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showFromDatePickerAnn}
          >
            {i18n.t("fromDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{fromDateTextAnn}</Text>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showToDatePickerAnn}
          >
            {i18n.t("toDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{toDateTextAnn}</Text>
        </View>
        <AppButton
          style={styles.appButton}
          onPress={() => {
            setShowModalAnn(false);
            if (fromDateAnn > toDateAnn) {
              Commons.okAlert(i18n.t("error"), "يوجد خطأ في ادخال التاريخ");
              return;
            }
            navigation.navigate(i18n.t("announcementsScreen"), {
              fromDateAnn: fromDateTextAnn,
              toDateAnn: toDateTextAnn,
              isHr: isHr,
            });
          }}
        >
          {i18n.t("show")}
        </AppButton>

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showFromDateAnn}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFromDateAnn(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="fromDatePickerAnn"
                    value={tempFromDateAnn}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeFromDateAnn}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleFromDateAnnDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showFromDateAnn && (
            <DateTimePicker
              testID="fromDatePickerAnn"
              value={fromDateAnn}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeFromDateAnn}
            />
          )
        )}

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showToDateAnn}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowToDateAnn(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="toDatePickerAnn"
                    value={tempToDateAnn}
                    minimumDate={fromDateAnn}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeToDateAnn}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleToDateAnnDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showToDateAnn && (
            <DateTimePicker
              testID="toDatePickerAnn"
              value={toDateAnn}
              minimumDate={fromDateAnn}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeToDateAnn}
            />
          )
        )}
      </Modal>
    );
  };

  const renderModalCheck = () => {
    if (!showModalCheck) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowModalCheck(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <View style={{ padding: 20, height: Dimensions.get("window").height / 2.8, justifyContent: 'flex-start' }}>
          <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: 'space-between' }}>
            <Picker
              selectedValue={locationPickerVal}
              onValueChange={(itemValue) => {
                setLocationPickerVal(itemValue);
              }}
              style={{ width: Dimensions.get("window").width / 1.5 }}
              containerStyle={{ width: Dimensions.get("window").width / 1.5 }}
              dropDownContainerStyle={{ width: Dimensions.get("window").width / 1.5 }}
              zIndex={6500}
              zIndexInverse={400}
            >
              {renderLocList()}
            </Picker>
          </View>
          <AppButton
            mode="contained"
            color="green"
            style={{ marginBottom: 5 }}
            onPress={onCheckInPress}
          >
            {i18n.t("checkIn")}
          </AppButton>
          <AppButton
            mode="contained"
            color="red"
            style={{ marginTop: 10 }}
            onPress={onCheckOutPress}
          >
            {i18n.t("checkOut")}
          </AppButton>
        </View>
      </Modal>
    );
  };

  const renderModalBreak = () => {
    if (!showModalBreak) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowModalBreak(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <AppButton
          mode="contained"
          color="green"
          style={{ marginBottom: 5 }}
          onPress={onBreakInPress}
        >
          {i18n.t("breakStart")}
        </AppButton>
        <AppButton
          mode="contained"
          color="red"
          onPress={onBreakEndPress}
          style={{ marginTop: 10 }}
        >
          {i18n.t("breakEnd")}
        </AppButton>
      </Modal>
    );
  };

  const renderModalBreakInfo = () => {
    if (!showModalBreakInfo) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => {
          setShowModalBreakInfo(false);
          setShowModalBreak(true);
        }}
        contentContainerStyle={styles.modalStyle}
      >
        <SafeAreaView>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={() => {
              showFromTimepicker();
            }}
          >
            {i18n.t("fromTime")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{fromTimeTextBreak}</Text>

          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={() => {
              showToTimepicker();
            }}
          >
            {i18n.t("toTime")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{ToTimeTextBreak}</Text>
        </SafeAreaView>
        <AppButton
          style={styles.appButton}
          onPress={() => {
            onBreakInPress();
            setShowModalBreakInfo(false);
          }}
        >
          {i18n.t("submit")}
        </AppButton>

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showFromTimeBreak}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFromTimeBreak(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectTime")}</Text>
                  <DateTimePicker
                    testID="fromTimePicker"
                    value={tempFromTimeBreak}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={onChangeFromTimeBreak}
                    themeVariant="light"
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleFromTimeBreakDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showFromTimeBreak && (
            <DateTimePicker
              testID="fromTimePicker"
              value={fromTimeBreak}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onChangeFromTimeBreak}
              themeVariant="light"
            />
          )
        )}

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showToTimeBreak}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowToTimeBreak(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectTime")}</Text>
                  <DateTimePicker
                    testID="toTimePicker"
                    value={tempToTimeBreak}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={onChangeToTimeBreak}
                    themeVariant="light"
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleToTimeBreakDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showToTimeBreak && (
            <DateTimePicker
              testID="toTimePicker"
              value={toTimeBreak}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onChangeToTimeBreak}
              themeVariant="light"
            />
          )
        )}
      </Modal>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => {
          setShowModal(false);
          setUserNoText("");
        }}
        contentContainerStyle={styles.modalStyle}
      >
        <View>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showFromDatePicker}
          >
            {i18n.t("fromDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{fromDateText}</Text>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showToDatePicker}
          >
            {i18n.t("toDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{toDateText}</Text>
        </View>
        <Pressable onPress={() => handleSelectUserPress("hr")}>
          <View pointerEvents="none">
            <RNTextInput
              placeholder={i18n.t("selectUser")}
              style={[styles.textInputWithBorder, { width: "50%", marginLeft: 10 }]}
              value={userNoText}
              editable={false}
            />
          </View>
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            padding: 10,
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 17, marginTop: 15 }}>
            {i18n.t("status")}
          </Text>
          <Picker
            selectedValue={pickerVal}
            onValueChange={(val) => setPickerVal(val)}
            style={{ width: 160 }}
            containerStyle={{ width: 160 }}
            dropDownContainerStyle={{ width: 160 }}
            zIndex={6000}
            zIndexInverse={500}
          >
            <Picker.Item label="Pending" value="Pending" />
            <Picker.Item label="Approved" value="Approved" />
            <Picker.Item label="Denied" value="Denied" />
            <Picker.Item label="All" value="All" />
          </Picker>
        </View>
        <View
          style={{
            flexDirection: "row",
            padding: 10,
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 17, marginTop: 15 }}>
            {i18n.t("reqType")}
          </Text>
          <Picker
            selectedValue={reqTypeHrPickerVal}
            onValueChange={(itemValue) => setReqTypeHrPickerVal(itemValue)}
            style={{ width: 160 }}
            containerStyle={{ width: 160 }}
            dropDownContainerStyle={{ width: 160 }}
            zIndex={5900}
            zIndexInverse={600}
          >
            <Picker.Item label="اجازات ومغادرات" value="leaves" />
            {/* <Picker.Item label="سلف" value="loans" /> */}
            <Picker.Item label="ادارية" value="admin" />
          </Picker>
        </View>
        <AppButton
          style={styles.appButton}
          onPress={() => {
            setShowModal(false);
            if (fromDate > toDate) {
              Commons.okAlert(i18n.t("error"), "يوجد خطأ في ادخال التاريخ");
              return;
            }
            if (reqTypeHrPickerVal == "leaves") {
              navigation.navigate(i18n.t("requestsHR"), {
                fromDateKey: fromDateText,
                toDateKey: toDateText,
                userNoKey: userNoText,
                statusKey: pickerVal,
              });
            }
            if (reqTypeHrPickerVal == "loans") {
              navigation.navigate(i18n.t("loansHR"), {
                fromDateKey: fromDateText,
                toDateKey: toDateText,
                userNoKey: userNoText,
                statusKey: pickerVal,
              });
            }
            if (reqTypeHrPickerVal == "admin") {
              navigation.navigate(i18n.t("adminHR"), {
                fromDateKey: fromDateText,
                toDateKey: toDateText,
                userNoKey: userNoText,
                statusKey: pickerVal,
              });
            }
          }}
        >
          {i18n.t("show")}
        </AppButton>

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showFromDate}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFromDate(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="fromDatePicker"
                    value={tempFromDate}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeFromDate}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleFromDateDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showFromDate && (
            <DateTimePicker
              testID="fromDatePicker"
              value={fromDate}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeFromDate}
            />
          )
        )}

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showToDate}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowToDate(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="toDatePicker"
                    value={tempToDate}
                    minimumDate={fromDate}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeToDate}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleToDateDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showToDate && (
            <DateTimePicker
              testID="toDatePicker"
              value={toDate}
              minimumDate={fromDate}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeToDate}
            />
          )
        )}
      </Modal>
    );
  };

  const renderModalHrChecks = () => {
    if (!showModalHrChecks) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowModalHrChecks(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <View>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showFromDatePickerHrChecks}
          >
            {i18n.t("fromDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{fromDateTextHrChecks}</Text>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showToDatePickerHrChecks}
          >
            {i18n.t("toDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{toDateTextHrChecks}</Text>
        </View>
        {!isManager && (<Pressable onPress={() => handleSelectUserPress("hrChecks")}>
          <View pointerEvents="none">
            <RNTextInput
              placeholder={i18n.t("selectUser")}
              style={[styles.textInputWithBorder, { width: "50%", marginLeft: 10 }]}
              value={userNoTextHrChecks}
              editable={false}
            />
          </View>
        </Pressable>)}
        <View
          style={{
            flexDirection: "row",
            padding: 10,
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 17, marginTop: 15 }}>
            {i18n.t("status")}
          </Text>
          <Picker
            selectedValue={pickerValHrChecks}
            onValueChange={(itemValue) => {
              setPickerValHrChecks(itemValue);
            }}
            style={{ width: 160 }}
            containerStyle={{ width: 160 }}
            dropDownContainerStyle={{ width: 160 }}
            zIndex={6050}
            zIndexInverse={550}
          >
            <Picker.Item label="جميع البصمات" value="All" />
            <Picker.Item label="الغياب" value="Absent" />
            <Picker.Item label="الاجازات" value="Vacation" />
            <Picker.Item label="المغادرات" value="Leave" />
            <Picker.Item label="الحضور" value="Checked" />
          </Picker>
        </View>
        <AppButton
          style={styles.appButton}
          onPress={() => {
            setShowModalHrChecks(false);
            if (fromDateHrChecks > toDateHrChecks) {
              Commons.okAlert(i18n.t("error"), "يوجد خطأ في ادخال التاريخ");
              return;
            }
            navigation.navigate(i18n.t("viewCheckInsHR"), {
              fromDate: fromDateTextHrChecks,
              toDate: toDateTextHrChecks,
              user: userNoTextHrChecks,
              status: pickerValHrChecks,
            });
          }}
        >
          {i18n.t("show")}
        </AppButton>

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showFromDateHrChecks}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFromDateHrChecks(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="fromDatePickerHrChecks"
                    value={tempFromDateHrChecks}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeFromDateHrChecks}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleFromDateHrChecksDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showFromDateHrChecks && (
            <DateTimePicker
              testID="fromDatePickerHrChecks"
              value={fromDateHrChecks}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeFromDateHrChecks}
            />
          )
        )}

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showToDateHrChecks}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowToDateHrChecks(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="toDatePickerHrChecks"
                    value={tempToDateHrChecks}
                    minimumDate={fromDateHrChecks}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeToDateHrChecks}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleToDateHrChecksDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showToDateHrChecks && (
            <DateTimePicker
              testID="toDatePickerHrChecks"
              value={toDateHrChecks}
              minimumDate={fromDateHrChecks}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeToDateHrChecks}
            />
          )
        )}
      </Modal>
    );
  };

  const renderSelectTypeModal = () => {
    if (!showSelectTypeModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => {
          setShowSelectTypeModal(false);
          setUserNoTextViewReqs("");
        }}
        contentContainerStyle={styles.modalStyle}
      >
        <View>
          <View>
            <AppButton
              mode="outlined"
              style={styles.dateTimeButtons}
              onPress={showFromDatePickerViewReqs}
            >
              {i18n.t("fromDate")}
            </AppButton>
            <Text style={styles.dateTimeTexts}>{fromDateTextViewReqs}</Text>
            <AppButton
              mode="outlined"
              style={styles.dateTimeButtons}
              onPress={showToDatePickerViewReqs}
            >
              {i18n.t("toDate")}
            </AppButton>
            <Text style={styles.dateTimeTexts}>{toDateTextViewReqs}</Text>
          </View>
          {/* <Pressable onPress={() => handleSelectUserPress("viewReqs")}>
            <View pointerEvents="none">
              <RNTextInput
                placeholder={i18n.t("selectUser")}
                style={[styles.textInputWithBorder, { width: "50%", marginLeft: 10 }]}
                value={userNoTextViewReqs}
                editable={false}
              />
            </View>
          </Pressable> */}
          <View
            style={{
              flexDirection: "row",
              padding: 10,
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 17, marginTop: 15 }}>
              {i18n.t("status")}
            </Text>
            <Picker
              selectedValue={viewReqsStatusPickerVal}
              onValueChange={(val) => setViewReqsStatusPickerVal(val)}
              style={{ width: 160 }}
              containerStyle={{ width: 160 }}
              dropDownContainerStyle={{ width: 160 }}
              zIndex={6200}
              zIndexInverse={400}
            >
              <Picker.Item label="Pending" value="Pending" />
              <Picker.Item label="Approved" value="Approved" />
              <Picker.Item label="Denied" value="Denied" />
            </Picker>
          </View>
          <View
            style={{
              flexDirection: "row",
              padding: 10,
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 17, marginTop: 15 }}>
              {i18n.t("reqType")}
            </Text>
            <Picker
              selectedValue={reqTypePickerVal}
              onValueChange={(itemValue) => setReqTypePickerVal(itemValue)}
              style={{ width: 160 }}
              containerStyle={{ width: 160 }}
              dropDownContainerStyle={{ width: 160 }}
              zIndex={5900}
              zIndexInverse={600}
            >
              <Picker.Item label="اجازات ومغادرات" value="leaves" />
              {/* <Picker.Item label="سلف" value="loans" /> */}
              <Picker.Item label="ادارية" value="admin" />
            </Picker>
          </View>
        </View>
        <AppButton
          style={styles.appButton}
          onPress={() => {
            setShowSelectTypeModal(false);
            if (fromDateViewReqs > toDateViewReqs) {
              Commons.okAlert(i18n.t("error"), "يوجد خطأ في ادخال التاريخ");
              return;
            }
            if (reqTypePickerVal == "leaves") {
              navigation.navigate(i18n.t("requests"), {
                fromDate: fromDateTextViewReqs,
                toDate: toDateTextViewReqs,
                userNoKey: userNoTextViewReqs,
                statusKey: viewReqsStatusPickerVal,
              });
            }
            if (reqTypePickerVal == "loans") {
              navigation.navigate(i18n.t("loanRequests"), {
                fromDate: fromDateTextViewReqs,
                toDate: toDateTextViewReqs,
                userNoKey: userNoTextViewReqs,
                statusKey: viewReqsStatusPickerVal,
              });
            }
            if (reqTypePickerVal == "admin") {
              navigation.navigate(i18n.t("adminRequests"), {
                fromDate: fromDateTextViewReqs,
                toDate: toDateTextViewReqs,
                userNoKey: userNoTextViewReqs,
                statusKey: viewReqsStatusPickerVal,
              });
            }
          }}
        >
          {i18n.t("show")}
        </AppButton>

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showFromDateViewReqs}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFromDateViewReqs(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="fromDatePickerViewReqs"
                    value={tempFromDateViewReqs}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeFromDateViewReqs}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleFromDateViewReqsDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showFromDateViewReqs && (
            <DateTimePicker
              testID="fromDatePickerViewReqs"
              value={fromDateViewReqs}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeFromDateViewReqs}
            />
          )
        )}

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showToDateViewReqs}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowToDateViewReqs(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="toDatePickerViewReqs"
                    value={tempToDateViewReqs}
                    minimumDate={fromDateViewReqs}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeToDateViewReqs}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleToDateViewReqsDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showToDateViewReqs && (
            <DateTimePicker
              testID="toDatePickerViewReqs"
              value={toDateViewReqs}
              minimumDate={fromDateViewReqs}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeToDateViewReqs}
            />
          )
        )}
      </Modal>
    );
  };

  const renderSelectMyReqsTypeModal = () => {
    if (!showSelectMyReqsTypeModal) return null;
    return (
      <Modal
        visible={true}
        onDismiss={() => setShowSelectMyReqsTypeModal(false)}
        contentContainerStyle={styles.modalStyle}
      >
        <View>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showFromDatePickerMyReqs}
          >
            {i18n.t("fromDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{fromDateTextMyReqs}</Text>
          <AppButton
            mode="outlined"
            style={styles.dateTimeButtons}
            onPress={showToDatePickerMyReqs}
          >
            {i18n.t("toDate")}
          </AppButton>
          <Text style={styles.dateTimeTexts}>{toDateTextMyReqs}</Text>
          <View
            style={{
              flexDirection: "row",
              padding: 10,
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 17, marginTop: 12 }}>
              {i18n.t("status")}
            </Text>
            <Picker
              selectedValue={myReqsStatusPickerVal}
              onValueChange={(itemValue) => setMyReqsStatusPickerVal(itemValue)}
              style={{ width: 160 }}
              containerStyle={{ width: 160 }}
              dropDownContainerStyle={{ width: 160 }}
              zIndex={6000}
              zIndexInverse={700}
            >
              <Picker.Item label="معلق" value="Pending" />
              <Picker.Item label="موافق عليه" value="Approved" />
              <Picker.Item label="مرفوض" value="Denied" />
              <Picker.Item label="الكل" value="All" />
            </Picker>
          </View>
          <View
            style={{
              flexDirection: "row",
              padding: 10,
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 17, marginTop: 12 }}>
              {i18n.t("reqType")}
            </Text>
            <Picker
              selectedValue={myReqsTypePickerVal}
              onValueChange={(itemValue) => setMyReqsTypePickerVal(itemValue)}
              style={{ width: 160 }}
              containerStyle={{ width: 160 }}
              dropDownContainerStyle={{ width: 160 }}
              zIndex={5900}
              zIndexInverse={800}
            >
              <Picker.Item label="اجازات ومغادرات" value="leaves" />
              {/* <Picker.Item label="سلف" value="loans" /> */}
              <Picker.Item label="ادارية" value="admin" />
            </Picker>
          </View>
        </View>
        <AppButton
          style={styles.appButton}
          onPress={() => {
            setShowSelectMyReqsTypeModal(false);
            if (fromDateMyReqs > toDateMyReqs) {
              Commons.okAlert(i18n.t("error"), "يوجد خطأ في ادخال التاريخ");
              return;
            }
            if (myReqsTypePickerVal == "leaves") {
              navigation.navigate(i18n.t("myLeaves"), {
                fromDate: fromDateTextMyReqs,
                toDate: toDateTextMyReqs,
                status: myReqsStatusPickerVal,
              });
            }
            if (myReqsTypePickerVal == "loans") {
              navigation.navigate(i18n.t("myLoans"), {
                fromDate: fromDateTextMyReqs,
                toDate: toDateTextMyReqs,
                status: myReqsStatusPickerVal,
              });
            }
            if (myReqsTypePickerVal == "admin") {
              navigation.navigate(i18n.t("myAdminReqs"), {
                fromDate: fromDateTextMyReqs,
                toDate: toDateTextMyReqs,
                status: myReqsStatusPickerVal,
              });
            }
          }}
        >
          {i18n.t("show")}
        </AppButton>

        {Platform.OS === 'ios' ? (
          <RNModal
            visible={showFromDateMyReqs}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFromDateMyReqs(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModalStyle}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                  <DateTimePicker
                    testID="fromDatePickerMyReqs"
                    value={tempFromDateMyReqs}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={onChangeFromDateMyReqs}
                  />
                  <AppButton
                    mode="contained"
                    onPress={handleFromDateMyReqsDone}
                    style={styles.datePickerButton}
                  >
                    {i18n.t("done") || "Done"}
                  </AppButton>
                </View>
              </View>
            </View>
          </RNModal>
        ) : (
          showFromDateMyReqs && (
            <DateTimePicker
              testID="fromDatePickerMyReqs"
              value={fromDateMyReqs}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeFromDateMyReqs}
            />
          )
        )}

        {Platform.OS === 'ios' ? (
          <Portal>
            <RNModal
              visible={showToDateMyReqs}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowToDateMyReqs(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.datePickerModalStyle}>
                  <View style={styles.datePickerContainer}>
                    <Text style={styles.datePickerTitle}>{i18n.t("selectDate")}</Text>
                    <DateTimePicker
                      testID="toDatePickerMyReqs"
                      value={tempToDateMyReqs}
                      minimumDate={fromDateMyReqs}
                      mode="date"
                      display="spinner"
                      themeVariant="light"
                      onChange={onChangeToDateMyReqs}
                    />
                    <AppButton
                      mode="contained"
                      onPress={handleToDateMyReqsDone}
                      style={styles.datePickerButton}
                    >
                      {i18n.t("done") || "Done"}
                    </AppButton>
                  </View>
                </View>
              </View>
            </RNModal>
          </Portal>
        ) : (
          showToDateMyReqs && (
            <DateTimePicker
              testID="toDatePickerMyReqs"
              value={toDateMyReqs}
              minimumDate={fromDateMyReqs}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeToDateMyReqs}
            />
          )
        )}
      </Modal>
    );
  };

  // Functions to handle Done button presses
  const handleFromDateAnnDone = () => {
    setShowFromDateAnn(false);
    setFromDateAnn(tempFromDateAnn);
    let tempDate = new Date(tempFromDateAnn);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setFromDateTextAnn(fDate);
  };

  const handleToDateAnnDone = () => {
    setShowToDateAnn(false);
    setToDateAnn(tempToDateAnn);
    let tempDate = new Date(tempToDateAnn);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setToDateTextAnn(fDate);
  };

  const handleFromTimeBreakDone = () => {
    setShowFromTimeBreak(false);
    setFromTimeBreak(tempFromTimeBreak);
    let tempDate = new Date(tempFromTimeBreak);
    let hours = tempDate.getHours();
    let hoursLength = hours.toLocaleString().length;
    if (hoursLength === 1) {
      hours = "0" + hours;
    }
    let mins = tempDate.getMinutes();
    let minsLength = mins.toLocaleString().length;
    if (minsLength === 1) {
      mins = "0" + mins;
    }
    let fTime = hours + ":" + mins;
    setFromTimeTextBreak(fTime);
  };

  const handleToTimeBreakDone = () => {
    setShowToTimeBreak(false);
    setToTimeBreak(tempToTimeBreak);
    let tempDate = new Date(tempToTimeBreak);
    let hours = tempDate.getHours();
    let hoursLength = hours.toLocaleString().length;
    if (hoursLength === 1) {
      hours = "0" + hours;
    }
    let mins = tempDate.getMinutes();
    let minsLength = mins.toLocaleString().length;
    if (minsLength === 1) {
      mins = "0" + mins;
    }
    let fTime = hours + ":" + mins;
    setToTimeTextBreak(fTime);
  };

  const handleFromDateDone = () => {
    setShowFromDate(false);
    setFromDate(tempFromDate);
    let tempDate = new Date(tempFromDate);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setFromDateText(fDate);
  };

  const handleToDateDone = () => {
    setShowToDate(false);
    setToDate(tempToDate);
    let tempDate = new Date(tempToDate);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setToDateText(fDate);
  };

  const handleFromDateHrChecksDone = () => {
    setShowFromDateHrChecks(false);
    setFromDateHrChecks(tempFromDateHrChecks);
    let tempDate = new Date(tempFromDateHrChecks);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setFromDateTextHrChecks(fDate);
  };

  const handleToDateHrChecksDone = () => {
    setShowToDateHrChecks(false);
    setToDateHrChecks(tempToDateHrChecks);
    let tempDate = new Date(tempToDateHrChecks);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setToDateTextHrChecks(fDate);
  };

  const handleFromDateViewReqsDone = () => {
    setShowFromDateViewReqs(false);
    setFromDateViewReqs(tempFromDateViewReqs);
    let tempDate = new Date(tempFromDateViewReqs);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setFromDateTextViewReqs(fDate);
  };

  const handleToDateViewReqsDone = () => {
    setShowToDateViewReqs(false);
    setToDateViewReqs(tempToDateViewReqs);
    let tempDate = new Date(tempToDateViewReqs);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setToDateTextViewReqs(fDate);
  };

  const handleFromDateMyReqsDone = () => {
    setShowFromDateMyReqs(false);
    setFromDateMyReqs(tempFromDateMyReqs);
    let tempDate = new Date(tempFromDateMyReqs);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setFromDateTextMyReqs(fDate);
  };

  const handleToDateMyReqsDone = () => {
    setShowToDateMyReqs(false);
    setToDateMyReqs(tempToDateMyReqs);
    let tempDate = new Date(tempToDateMyReqs);
    let fDate =
      tempDate.getDate() +
      "/" +
      (tempDate.getMonth() + 1) +
      "/" +
      tempDate.getFullYear();
    setToDateTextMyReqs(fDate);
  };

  // Main component return
  return (
    <SafeAreaView style={styles.view}>
      {/* <Text style={{alignSelf:"center",position:'absolute',top:"3%"}}>اهلا {curName}</Text> */}
      <ProgressDialog
        visible={progressDialogVisible}
        title="جاري التحميل..."
        cancelable={false}
      />
      <Image style={styles.image} source={require("./logo.png")} />

      {/* Render all modals */}
      <Portal>
        {renderSelectUserHrModal()}
      </Portal>
      <Portal>
        {renderSelectUserHrChecksModal()}
      </Portal>
      <Portal>
        {renderSelectUserClearDevModal()}
      </Portal>
      <Portal>
        {renderSelectUserViewReqsModal()}
      </Portal>
      <Portal>
        {renderDialogClearDevice()}
      </Portal>
      <Portal>
        {renderChangePasswordModal()}
      </Portal>
      <Portal>
        {renderModalLateCheck()}
      </Portal>
      <Portal>
        {renderModalAnn()}
      </Portal>
      <Portal>
        {renderModalCheck()}
      </Portal>
      <Portal>
        {renderModalBreak()}
      </Portal>
      <Portal>
        {renderModalBreakInfo()}
      </Portal>
      <Portal>
        {renderModal()}
      </Portal>
      <Portal>
        {renderModalHrChecks()}
      </Portal>
      <Portal>
        {renderSelectTypeModal()}
      </Portal>
      <Portal>
        {renderSelectMyReqsTypeModal()}
      </Portal>

      {/* Main Content */}
      <View>
        <AppButton
          style={[styles.appButton, { width: Dimensions.get("window").width - 15 }]}
          onPress={async () => {
            const res = await Location.hasServicesEnabledAsync();
            if (!res) {
              Commons.okAlert(i18n.t("error"), "الرجاء تفعيل خدمات الموقع");
            } else {
              setShowModalCheck(true);
            }
          }}
        >        {i18n.t("checkInOut")}
        </AppButton>

        {/* <AppButton
          style={[styles.appButton, { width: Dimensions.get("window").width - 15, backgroundColor: 'orange' }]}
          onPress={() => {
            console.log('Test button pressed - showing progress dialog');
            setProgressDialogVisible(true);
            setTimeout(() => {
              console.log('Test button - hiding progress dialog after 3 seconds');
              setProgressDialogVisible(false);
            }, 3000);
          }}
        >
          Test Progress Dialog
        </AppButton> */}

        <View style={{ flexDirection: "row" }}>
          <View>
            <AppButton
              style={styles.appButton}
              onPress={() => {
                navigation.navigate(i18n.t("leaves"));
              }}
            >
              {i18n.t("takeALeave")}
            </AppButton>
            <AppButton
              style={styles.appButton}
              onPress={() => {
                navigation.navigate(i18n.t("adminRequestScreen"));
              }}
            >
              {i18n.t("adminRequest")}
            </AppButton>

            <AppButton
              style={styles.appButton}
              onPress={() => {
                setShowModalAnn(true);
              }}
            >
              {i18n.t("announcements")}
            </AppButton>
            <AppButton
              style={styles.appButton}
              onPress={() => {
                setShowSelectMyReqsTypeModal(true);
              }}
            >
              {i18n.t("myRequestsMain")}
            </AppButton>
          </View>
          <View>
            {!!isManager && (
              <AppButton
                style={styles.appButton}
                onPress={() => {
                  setShowSelectTypeModal(true);
                }}
              >
                {i18n.t("viewRequests")}
              </AppButton>
            )}
            <AppButton
              style={styles.appButton}
              onPress={() => {
                setShowChangePasswordModal(true);
              }}
            >
              {i18n.t("changePassword")}
            </AppButton>

            {!!isHr && (
              <AppButton
                style={styles.appButton}
                onPress={() => {
                  setShowModal(true);
                }}
              >
                {i18n.t("viewRequestsHR")}
              </AppButton>
            )}
            {(isHr || isManager) && (
              <AppButton
                style={styles.appButton}
                onPress={() => {
                  setShowModalHrChecks(true);
                  setUserNoTextHrChecks("");
                }}
              >
                {i18n.t("viewCheckInsHRMain")}
              </AppButton>
            )}

            {!!isHr && (
              <AppButton
                style={styles.appButton}
                onPress={() => {
                  setShowDialogClearDevice(true);
                }}
              >
                Clear Device ID
              </AppButton>
            )}
          </View>
        </View>
      </View>

      {/* Bottom Navigation */}
      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
        marginBottom: '3%'
      }}>
        <AppButton
          mode="contained"
          color="red"
          onPress={clearStorage}
          style={{
            padding: 5,
            width: "30%",
          }}
          icon={<Ionicons color="#fff" size={20} name="log-out" />}
        >
          {i18n.t("logout")}
        </AppButton>
        <Text style={{
          alignSelf: "center",
          fontSize: 14,
          color: "#666",
          marginTop: 10,
          textAlign: "center",
          minWidth: 60,
          width: "auto"
        }} >
          {Constants2.appVersion}
        </Text>
        {/* Language change button hidden - fixed to Arabic
        <AppButton
          onPress={() => {
            switchLanguage(i18n.t("changeLang"));
          }}
          style={{ padding: 5 }}
          mode="contained"
          icon={<Ionicons color="#fff" size={20} name="language" />}
        >
          {i18n.t("changeLang")}
        </AppButton>
        */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  datetimepickerstyle: {
    alignSelf: "center",
    width: 100,
    padding: 15,
  },
  locPicker: {
    height: Platform.OS === "ios" ? 100 : 75,
    //marginTop: Platform.OS === "ios" ? -95 : -15,
    marginTop: -10,
    margin: 25,
    flex: 2,
    width: 300,
    marginRight: "10%",
    backgroundColor: Platform.OS === "android" ? "#ffffff" : "transparent",
    color: Platform.OS === "android" ? "#000000" : "#000000",
    borderWidth: Platform.OS === "android" ? 1 : 0,
    borderColor: Platform.OS === "android" ? "#cccccc" : "transparent",
    borderRadius: Platform.OS === "android" ? 4 : 0,
  },
  typePicker: {
    height: Platform.OS === "ios" ? 150 : 75,
    marginTop: Platform.OS === "ios" ? -50 : -15,
    marginBottom: Platform.OS === "ios" ? 40 : 25,
    margin: 25,
    flex: 2,
    width: 300,
    marginRight: "10%",
    backgroundColor: Platform.OS === "android" ? "#ffffff" : "transparent",
    color: Platform.OS === "android" ? "#000000" : "#000000",
    borderWidth: Platform.OS === "android" ? 1 : 0,
    borderColor: Platform.OS === "android" ? "#cccccc" : "transparent",
    borderRadius: Platform.OS === "android" ? 4 : 0,
  },
  typePicker2: {
    height: Platform.OS === "ios" ? 150 : 75,
    marginTop: Platform.OS === "ios" ? -55 : -15,
    marginBottom: Platform.OS === "ios" ? 40 : 25,
    alignSelf: "center",
    margin: 25,
    width: 300,
    marginRight: "10%",
    backgroundColor: Platform.OS === "android" ? "#ffffff" : "transparent",
    color: Platform.OS === "android" ? "#000000" : "#000000",
    borderWidth: Platform.OS === "android" ? 1 : 0,
    borderColor: Platform.OS === "android" ? "#cccccc" : "transparent",
    borderRadius: Platform.OS === "android" ? 4 : 0,
  },
  searchBox: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  textInputWithBorder: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  dateTimeTexts: {
    fontSize: 18,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  dateTimeButtons: {
    borderColor: "rgb(1,135,134)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxHeight: "80%",
  },
  view: {
    flex: 1,
    justifyContent: "center",
    alignContent: "center",
  },
  appButtonContainer: {
    elevation: 4,
    backgroundColor: "rgb(1,135,134)",
    borderRadius: 10,
    paddingVertical: 8,
    margin: 8,
    marginStart: 5,
    marginEnd: 5,
    width: Dimensions.get("window").width / 2 - 10,
    paddingHorizontal: 10,
  },
  appButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase",
  },
  appButton: {
    margin: 10,
    width: Dimensions.get("window").width / 2.2,
  },
  image: {
    width: 150,
    height: 155,
    marginBottom: 20,
    alignSelf: "center",
    marginTop: -75,
  },
  image2: {
    width: 350,
    height: 285,
    alignSelf: "center",
  },
  modalStyle: {
    backgroundColor: "white",
    padding: 30,
    margin: 20,
    borderRadius: 10,
    maxHeight: "80%",
  },
  datePickerModalStyle: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  datePickerButton: {
    backgroundColor: "rgb(1,135,134)",
    marginTop: 20,
    width: 120,
  },
});
