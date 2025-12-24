/*
 * DateTimePicker Implementation Fixed:
 * - iOS: DateTimePickers wrapped in Portal + Modal for centered display
 * - Android: DateTimePickers display natively without modal wrapper
 * - Fixed onChange handlers to handle 'dismissed' events properly
 * - Set platform-specific display modes for better native experience
 * - Added modal styling for iOS DateTimePicker positioning
 */

import React, { useState, useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Dimensions,
  TextInput as RNTextInput,
  Modal as RNModal,
  FlatList,
} from "react-native";
import Picker from "../../components/DropdownPickerWrapper";
import { Card, TextInput, Modal, Portal } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ServerOperations from "../../utils/ServerOperations";
import * as Commons from "../../utils/Commons";
import * as Constants from "../../utils/Constants";
import { STRINGS } from "../../utils/Strings";
import * as SecureStore from "expo-secure-store";
import { Asset } from "expo-asset";
import * as MediaLibrary from "expo-media-library";
import { ScrollView } from "react-native-gesture-handler";
import i18n from "../../languages/langStrings";
import * as ImagePicker from "expo-image-picker";
import ProgressDialog from "../../components/ProgressDialog";
import { Camera, CameraType, useCameraPermissions, CameraView } from "expo-camera";
import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";
import AttachmentPicker from "../../components/AttachmentPicker";
import AttachmentButton from "../../components/AttachmentButton";
import { useNavigation } from "@react-navigation/native";

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
const TakeALeaveScreen = () => {
  const navigation = useNavigation();
  // selectedValue holds the id (numeric or code); selectedValueDesc holds the label/desc
  const [selectedValue, setSelectedValue] = useState(null);
  const [selectedValueDesc, setSelectedValueDesc] = useState("");
  const [singleFile, setSingleFile] = useState("");
  const [location, setLocation] = useState("");
  const [carNo, setCarNo] = useState("");
  const [notes, setNotes] = useState("");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isHR, setIsHR] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [showSelectEmployeeModal, setShowSelectEmployeeModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  //components to show
  const [selectedValue1st, setSelectedValue1st] = useState("");
  const [selectedValue2nd, setSelectedValue2nd] = useState("");
  const [showComponent1st, setShowComponent1st] = useState(false);
  const [showComponent2nd, setShowComponent2nd] = useState(false);
  const [isEjazeh, setIsEjazeh] = useState(false);
  const [isMoghadarah, setIsMoghadara] = useState(true);
  const [isSick, setIsSick] = useState(false);
  const [isFemaleOnly, setIsFemaleOnly] = useState(true);
  const [isRasmyeh, setIsRasmyeh] = useState(false);
  const [isOmomeh, setIsOmomeh] = useState(false);
  const [isOmomehHour, setIsOmomehHour] = useState(false);
  const [isOboweh, setIsOboweh] = useState(false);
  const [isFirstDeath, setIsFirstDeath] = useState(false);
  //Date and time
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDate, setShowFromDate] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [showFromTime, setShowFromTime] = useState(false);
  const [showToTime, setShowToTime] = useState(false);
  const [mode, setMode] = useState("date");
  const [fromDateText, setFromDateText] = useState("");
  const [toDateText, setToDateText] = useState("");
  const [fromDateTextForCheck, setFromDateTextForCheck] = useState("");
  const [toDateTextForCheck, setToDateTextForCheck] = useState("");
  const [fromTime, setFromTime] = useState(new Date());
  const [toTime, setToTime] = useState(new Date());
  const [fromTimeText, setFromTimeText] = useState("");
  const [toTimeText, setToTimeText] = useState("");
  // Temporary states for picker values
  const [tempFromDate, setTempFromDate] = useState(new Date());
  const [tempToDate, setTempToDate] = useState(new Date());
  const [tempFromTime, setTempFromTime] = useState(new Date());
  const [tempToTime, setTempToTime] = useState(new Date());
  const [image, setImage] = useState(null);
  const [progressDialogVisible, setProgressDialogVisible] = useState(false);
  const [type, setType] = useState('back');
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(null);
  const [showAttachment, setShowAttachment] = useState(false);
  // Shift times from server
  const [shiftFromTime, setShiftFromTime] = useState("08:00");
  const [shiftToTime, setShiftToTime] = useState("20:00");

  const renderLeavesList = () => {
    return leaveTypes.map((leaveType) => {
      return (
        <Picker.Item
          key={leaveType.id}
          label={leaveType.desc}
          value={leaveType.id}
          item={leaveType}
        />
      );
    });
  };

  const permisionFunction = async () => {
    // here is how you can get the camera permission
    const { status } = await requestPermission();
    if (status !== "granted") {
      alert("Permission for media access needed.");
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Get user ID for shift lookup
        const userID = await Commons.getFromAS("userID");
        const isHrValue = await Commons.getFromAS("isHr");

        // Check if user is HR
        const hrStatus = isHrValue === "Y";
        setIsHR(hrStatus);

        // Fetch leave types
        const leaveTypesData = await ServerOperations.getLeaveTypes();
        if (leaveTypesData && leaveTypesData.length > 0) {
          const first = leaveTypesData[0];
          setSelectedValue(first.id);
          setSelectedValueDesc(first.desc);
          setShowComponent2nd(first.setShowComponent2nd);
          setShowComponent1st(first.setShowComponent1st);
          setIsSick(first.isSick);
          setIsFemaleOnly(first.isFemaleOnly);
          setIsRasmyeh(first.isRasmyeh);
          setIsEjazeh(first.isEjazeh);
          setIsMoghadara(first.isMoghadarah);
          setIsOmomeh(first.isOmomeh);
          setIsOmomehHour(first.isOmomehHour);
          setIsOboweh(first.isOboweh);
          setIsFirstDeath(first.isFirstDeath);
          setShowAttachment(first.showAttachment);
        }
        setLeaveTypes(leaveTypesData);

        // Fetch employees list if HR
        if (hrStatus) {
          try {
            setLoadingEmployees(true);
            const employeesData = await ServerOperations.getNamesList();
            if (employeesData && employeesData.length > 0) {
              setEmployees(employeesData);
              setFilteredEmployees(employeesData);
              // Set first employee as default
              setSelectedEmployeeId(employeesData[0].id);
              setSelectedEmployeeName(employeesData[0].name);
            }
          } catch (error) {
            console.error("Error fetching employees list:", error);
          } finally {
            setLoadingEmployees(false);
          }
        }

        // Fetch employee shift times
        if (userID) {
          const shiftData = await ServerOperations.getEmpShift(userID);
          if (shiftData && shiftData.fromTime && shiftData.toTime) {
            setShiftFromTime(shiftData.fromTime);
            setShiftToTime(shiftData.toTime);
          }
        }
      } catch (error) {
        console.error("Error initializing leave screen data:", error);
      }
    };

    initializeData();
    permisionFunction();
  }, []);



  const handleSearch = (text) => {
    setSearchText(text);
    if (text) {
      const newData = employees.filter((item) => {
        const itemDataId = item.id
          ? item.id.toUpperCase()
          : "".toUpperCase();
        const itemData = item.name
          ? item.name.toUpperCase()
          : "".toUpperCase();
        const textData = text.toUpperCase();
        return itemData.indexOf(textData) > -1 || itemDataId.indexOf(textData) > -1;
      });
      setFilteredEmployees(newData);
    } else {
      setFilteredEmployees(employees);
    }
  };

  const submitRequest = async () => {
    //getUserID();
    const loggedInUserID = await Commons.getFromAS("userID");
    // Use selected employee ID if HR, otherwise use logged-in user ID
    const userID = isHR && selectedEmployeeId ? selectedEmployeeId : loggedInUserID;
    let person = "";
    if (selectedValue1st === "") {
      person = selectedValue2nd;
    } else {
      person = selectedValue1st;
    }
    setProgressDialogVisible(true);
    switch (selectedValue) {
      case 9:
      case 10:
        if (fromDateText === "") {
          Commons.okMsgAlert(i18n.t("dateMustBeFilled"));
          setProgressDialogVisible(false);
          return;
        }
        if (fromTimeText === "") {
          Commons.okMsgAlert(i18n.t("timeMustBeFilled"));
          setProgressDialogVisible(false);
          return;
        }
        if (toTimeText < fromTimeText) {
          Commons.okAlert(i18n.t("toTimeNeedsToBeBigger"));
          setProgressDialogVisible(false);
          return;
        }
        if (fromTimeText !== "" && fromTimeText < shiftFromTime) {
          Commons.okAlert(i18n.t("error"), `وقت البداية يجب أن يكون بعد ${shiftFromTime}`);
          setProgressDialogVisible(false);
          return;
        }
        if (toTimeText !== "" && toTimeText > shiftToTime) {
          Commons.okAlert(i18n.t("error"), `وقت النهاية يجب أن يكون قبل ${shiftToTime}`);
          setProgressDialogVisible(false);
          return;
        }
        break;
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 11:
        if (fromDateText === "") {
          Commons.okMsgAlert(i18n.t("dateMustBeFilled"));
          setProgressDialogVisible(false);
          return;
        }
        if (
          toDateTextForCheck !== "" &&
          toDateTextForCheck < fromDateTextForCheck
        ) {
          Commons.okAlert(i18n.t("toDateNeedsToBeBigger"));
          setProgressDialogVisible(false);
          return;
        }

        break;

      default:
        break;
    }

    if (selectedValueDesc === "اجازة رسمية" || selectedValueDesc === "مغادرة رسمية") {
      if (location == "") {
        Commons.okAlert("يجب ادخال الموقع");
        setProgressDialogVisible(false);
        return;
      }
      if (carNo == "") {
        Commons.okAlert("يجب ادخال رقم السيارة");
        setProgressDialogVisible(false);
        return;
      }
    }

    if (notes == "") {
      Commons.okAlert("يجب ادخال ملاحظات");
      setProgressDialogVisible(false);
      return;
    }

    if (showAttachment) {
      if (singleFile == "") {
        Commons.okAlert("يجب ادخال مرفق");
        setProgressDialogVisible(false);
        return;
      }
    }

    if (
      fromDateTextForCheck != "" &&
      toDateTextForCheck != "" &&
      fromDateTextForCheck > toDateTextForCheck
    ) {
      Commons.okAlert(i18n.t("error"), "يوجد خطأ في ادخال التاريخ");
      setProgressDialogVisible(false);
      return;
    }


    try {
      const resp = await ServerOperations.sendLeaveRequest(
        userID,
        fromDateText,
        toDateText,
        fromTimeText,
        toTimeText,
        notes,
        // Send id*desc format as requested
        selectedValue + "*" + selectedValueDesc,
        singleFile,
        location,
        carNo,
        person
      );

      if (resp && resp.result === true) {
        if (resp.overlimit == true) {
          Commons.okMsgAlert(
            "وقت المغادرة تجاوز الاربع ساعات وسيتم احتسابها كاجازة سنوية"
          );
        } else {
          Commons.okMsgAlert(i18n.t("requestSent"));
          navigation.goBack();
        }
        setProgressDialogVisible(false);
      } else if (resp === null) {
        // Network timeout but API might have succeeded
        console.log("Network timeout occurred for leave request...");
        Commons.okMsgAlert("تم إرسال الطلب بنجاح");
        setProgressDialogVisible(false);
        navigation.goBack();
      } else if (resp) {
        if (resp.res == "noCycle") {
          Commons.okAlert(i18n.t("error"), i18n.t("noCycle"));
          setProgressDialogVisible(false);
          return;
        }
        if (resp.res == "leaveReqExists") {
          Commons.okAlert(i18n.t("error"), "هذا الطلب مرسل من قبل");
          setProgressDialogVisible(false);
        }
      } else {
        Commons.okAlert(i18n.t("error"), "حدث خطأ أثناء إرسال الطلب");
        setProgressDialogVisible(false);
      }
    } catch (error) {
      console.log("Submit leave request error:", error);
      // Check if it's a timeout error
      if (error.message && error.message.includes('timeout')) {
        console.log("Timeout error detected for leave request, assuming success...");
        Commons.okMsgAlert("تم إرسال الطلب بنجاح");
      } else {
        Commons.okAlert(i18n.t("error"), "حدث خطأ في الشبكة");
      }
      setProgressDialogVisible(false);
    }
  };

  const showFromDatePicker = () => {
    setTempFromDate(fromDate);
    setShowFromDate(true);
    setMode("date");
  };
  const showToDatePicker = () => {
    if (!isOmomeh && !isFirstDeath && !isOboweh) {
      setTempToDate(toDate);
      setShowToDate(true);
      setMode("date");
    }
  };
  const showFromTimepicker = () => {
    setTempFromTime(fromTime);
    setShowFromTime(true);
    setMode("time");
  };
  const showToTimePicker = () => {
    if (!isOmomehHour) {
      setTempToTime(toTime);
      setShowToTime(true);
      setMode("time");
    }
  };

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
      let day =
        tempDate.getDate() < 10 ? "0" + tempDate.getDate() : tempDate.getDate();
      let month =
        tempDate.getMonth() + 1 < 10
          ? "0" + (tempDate.getMonth() + 1)
          : tempDate.getMonth() + 1;
      let year =
        tempDate.getFullYear() < 10
          ? "0" + tempDate.getFullYear()
          : tempDate.getFullYear();
      let fDate = day + "/" + month + "/" + year;
      let fDateForCheck = year + "/" + month + "/" + day;
      setFromDateTextForCheck(fDateForCheck);
      setFromDateText(fDate);

      if (isOmomeh) {
        const currentToDate = new Date(currentDate);
        currentToDate.setDate(currentToDate.getDate() + 69);
        setToDate(currentToDate);
        setTempToDate(currentToDate);
        let tempToDateVar = new Date(currentToDate);
        let toDay =
          tempToDateVar.getDate() < 10 ? "0" + tempToDateVar.getDate() : tempToDateVar.getDate();
        let toMonth =
          tempToDateVar.getMonth() + 1 < 10
            ? "0" + (tempToDateVar.getMonth() + 1)
            : tempToDateVar.getMonth() + 1;
        let toYear =
          tempToDateVar.getFullYear() < 10
            ? "0" + tempToDateVar.getFullYear()
            : tempToDateVar.getFullYear();
        let toFDate = toDay + "/" + toMonth + "/" + toYear;
        setToDateText(toFDate);
        let toFDateForCheck = toYear + "/" + toMonth + "/" + toDay;
        setToDateTextForCheck(toFDateForCheck);
      } else if (isFirstDeath) {
        const currentToDate = new Date(currentDate);
        currentToDate.setDate(currentToDate.getDate() + 2);
        setToDate(currentToDate);
        setTempToDate(currentToDate);
        let tempToDateVar = new Date(currentToDate);
        let toDay =
          tempToDateVar.getDate() < 10 ? "0" + tempToDateVar.getDate() : tempToDateVar.getDate();
        let toMonth =
          tempToDateVar.getMonth() + 1 < 10
            ? "0" + (tempToDateVar.getMonth() + 1)
            : tempToDateVar.getMonth() + 1;
        let toYear =
          tempToDateVar.getFullYear() < 10
            ? "0" + tempToDateVar.getFullYear()
            : tempToDateVar.getFullYear();
        let toFDate = toDay + "/" + toMonth + "/" + toYear;
        setToDateText(toFDate);
        let toFDateForCheck = toYear + "/" + toMonth + "/" + toDay;
        setToDateTextForCheck(toFDateForCheck);
      } else if (isOboweh) {
        const currentToDate = new Date(currentDate);
        currentToDate.setDate(currentToDate.getDate() + 2);
        setToDate(currentToDate);
        setTempToDate(currentToDate);
        let tempToDateVar = new Date(currentToDate);
        let toDay =
          tempToDateVar.getDate() < 10 ? "0" + tempToDateVar.getDate() : tempToDateVar.getDate();
        let toMonth =
          tempToDateVar.getMonth() + 1 < 10
            ? "0" + (tempToDateVar.getMonth() + 1)
            : tempToDateVar.getMonth() + 1;
        let toYear =
          tempToDateVar.getFullYear() < 10
            ? "0" + tempToDateVar.getFullYear()
            : tempToDateVar.getFullYear();
        let toFDate = toDay + "/" + toMonth + "/" + toYear;
        setToDateText(toFDate);
        let toFDateForCheck = toYear + "/" + toMonth + "/" + toDay;
        setToDateTextForCheck(toFDateForCheck);
      } else {
        if (toDateText === "") {
          setToDate(currentDate);
          setTempToDate(currentDate);
          setToDateText(fDate);
          setToDateTextForCheck(fDateForCheck);
        }
      }
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
      let day =
        tempDate.getDate() < 10 ? "0" + tempDate.getDate() : tempDate.getDate();
      let month =
        tempDate.getMonth() + 1 < 10
          ? "0" + (tempDate.getMonth() + 1)
          : tempDate.getMonth() + 1;
      let year =
        tempDate.getFullYear() < 10
          ? "0" + tempDate.getFullYear()
          : tempDate.getFullYear();
      let fDate = day + "/" + month + "/" + year;
      setToDateText(fDate);
      let fDateForCheck = year + "/" + month + "/" + day;
      setToDateTextForCheck(fDateForCheck);
    }
  };

  const onChangeFromTime = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowFromTime(false);
      return;
    }

    const currentDate = selectedDate || tempFromTime;
    setTempFromTime(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowFromTime(false);
      setFromTime(currentDate);
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
      setFromTimeText(fTime);

      if (isOmomehHour) {
        const newToTime = new Date(currentDate);
        newToTime.setHours(newToTime.getHours() + 1);
        setToTime(newToTime);
        setTempToTime(newToTime);
        let toTimeHours = newToTime.getHours();
        let newHoursLength = toTimeHours.toLocaleString().length;
        if (newHoursLength === 1) {
          toTimeHours = "0" + toTimeHours;
        }
        let newToTimeText = toTimeHours + ":" + mins;
        setToTimeText(newToTimeText);
      }
    }
  };

  const onChangeToTime = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowToTime(false);
      return;
    }

    const currentDate = selectedDate || tempToTime;
    setTempToTime(currentDate);

    // On Android, close the picker and apply the selection immediately
    if (Platform.OS === 'android') {
      setShowToTime(false);
      setToTime(currentDate);
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
      setToTimeText(fTime);
    }
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });
    if (
      result !== undefined &&
      result !== null &&
      result !== "" &&
      !result.cancelled
    ) {
      let temp = result.uri.split("/");
      let temp2 = temp[temp.length - 1];
      const name =
        new Date().getTime() + temp2.substring(temp2.lastIndexOf("."));
      const file = { uri: result.uri, name, type: "*/*" };
      console.log(file);
      const uploadRes = await ServerOperations.pickUploadHttpRequest(file, 1);
      console.log(uploadRes);
      setSingleFile(name);
    }
  };

  const handleAttachmentPress = (attachment) => {
    const uri = Constants.attachmentPath + "/" + attachment;
    console.log(uri);
    Linking.openURL(
      uri
    )
  };

  const selectOneFile = async () => {
    //Opening Document Picker for selection of one file
    const isGranted = await MediaLibrary.getPermissionsAsync();
    if (isGranted) {
      try {
        const res = await DocumentPicker.getDocumentAsync({});
        //Setting the state to show single file attributes

        if (res !== undefined && res !== null && res !== "") {
          const name =
            new Date().getTime() +
            res.name.substring(res.name.lastIndexOf("."));
          console.log(`name ${name}`);
          const file = { uri: res.uri, name, type: "*/*" };
          console.log(file);
          const uploadRes = await ServerOperations.pickUploadHttpRequest(
            file,
            1
          );
          console.log(uploadRes);
          setSingleFile(name);
        }
      } catch (err) {
        // //Handling any exception (If any)
        // if (DocumentPicker.isCancel(err)) {
        //   //If user canceled the document selection
        //   alert("Canceled from single doc picker");
        // } else {
        //   //For Unknown Error
        //   alert("Unknown Error: " + JSON.stringify(err));
        //   throw err;
        // }
      }
    } else {
      MediaLibrary.requestPermissionsAsync();
    }
  };

  // Functions to handle Done button presses
  const handleFromDateDone = () => {
    setShowFromDate(false);
    setFromDate(tempFromDate);
    let tempDate = new Date(tempFromDate);
    let day =
      tempDate.getDate() < 10 ? "0" + tempDate.getDate() : tempDate.getDate();
    let month =
      tempDate.getMonth() + 1 < 10
        ? "0" + (tempDate.getMonth() + 1)
        : tempDate.getMonth() + 1;
    let year =
      tempDate.getFullYear() < 10
        ? "0" + tempDate.getFullYear()
        : tempDate.getFullYear();
    let fDate = day + "/" + month + "/" + year;
    let fDateForCheck = year + "/" + month + "/" + day;
    setFromDateTextForCheck(fDateForCheck);
    setFromDateText(fDate);

    if (isOmomeh) {
      const currentToDate = new Date(tempFromDate);
      currentToDate.setDate(currentToDate.getDate() + 69);
      setToDate(currentToDate);
      setTempToDate(currentToDate);
      let tempToDateVar = new Date(currentToDate);
      let toDay =
        tempToDateVar.getDate() < 10 ? "0" + tempToDateVar.getDate() : tempToDateVar.getDate();
      let toMonth =
        tempToDateVar.getMonth() + 1 < 10
          ? "0" + (tempToDateVar.getMonth() + 1)
          : tempToDateVar.getMonth() + 1;
      let toYear =
        tempToDateVar.getFullYear() < 10
          ? "0" + tempToDateVar.getFullYear()
          : tempToDateVar.getFullYear();
      let toFDate = toDay + "/" + toMonth + "/" + toYear;
      setToDateText(toFDate);
      let toFDateForCheck = toYear + "/" + toMonth + "/" + toDay;
      setToDateTextForCheck(toFDateForCheck);
    } else if (isFirstDeath) {
      const currentToDate = new Date(tempFromDate);
      currentToDate.setDate(currentToDate.getDate() + 2);
      setToDate(currentToDate);
      setTempToDate(currentToDate);
      let tempToDateVar = new Date(currentToDate);
      let toDay =
        tempToDateVar.getDate() < 10 ? "0" + tempToDateVar.getDate() : tempToDateVar.getDate();
      let toMonth =
        tempToDateVar.getMonth() + 1 < 10
          ? "0" + (tempToDateVar.getMonth() + 1)
          : tempToDateVar.getMonth() + 1;
      let toYear =
        tempToDateVar.getFullYear() < 10
          ? "0" + tempToDateVar.getFullYear()
          : tempToDateVar.getFullYear();
      let toFDate = toDay + "/" + toMonth + "/" + toYear;
      setToDateText(toFDate);
      let toFDateForCheck = toYear + "/" + toMonth + "/" + toDay;
      setToDateTextForCheck(toFDateForCheck);
    } else if (isOboweh) {
      const currentToDate = new Date(tempFromDate);
      currentToDate.setDate(currentToDate.getDate() + 2);
      setToDate(currentToDate);
      setTempToDate(currentToDate);
      let tempToDateVar = new Date(currentToDate);
      let toDay =
        tempToDateVar.getDate() < 10 ? "0" + tempToDateVar.getDate() : tempToDateVar.getDate();
      let toMonth =
        tempToDateVar.getMonth() + 1 < 10
          ? "0" + (tempToDateVar.getMonth() + 1)
          : tempToDateVar.getMonth() + 1;
      let toYear =
        tempToDateVar.getFullYear() < 10
          ? "0" + tempToDateVar.getFullYear()
          : tempToDateVar.getFullYear();
      let toFDate = toDay + "/" + toMonth + "/" + toYear;
      setToDateText(toFDate);
      let toFDateForCheck = toYear + "/" + toMonth + "/" + toDay;
      setToDateTextForCheck(toFDateForCheck);
    } else {
      if (toDateText === "") {
        setToDate(tempFromDate);
        setTempToDate(tempFromDate);
        setToDateText(fDate);
        setToDateTextForCheck(fDateForCheck);
      }
    }
  };

  const handleToDateDone = () => {
    setShowToDate(false);
    setToDate(tempToDate);
    let tempDate = new Date(tempToDate);
    let day =
      tempDate.getDate() < 10 ? "0" + tempDate.getDate() : tempDate.getDate();
    let month =
      tempDate.getMonth() + 1 < 10
        ? "0" + (tempDate.getMonth() + 1)
        : tempDate.getMonth() + 1;
    let year =
      tempDate.getFullYear() < 10
        ? "0" + tempDate.getFullYear()
        : tempDate.getFullYear();
    let fDate = day + "/" + month + "/" + year;
    setToDateText(fDate);
    let fDateForCheck = year + "/" + month + "/" + day;
    setToDateTextForCheck(fDateForCheck);
  };

  const handleFromTimeDone = () => {
    setShowFromTime(false);
    setFromTime(tempFromTime);
    let tempDate = new Date(tempFromTime);
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
    setFromTimeText(fTime);

    if (isOmomehHour) {
      const newToTime = new Date(tempFromTime);
      newToTime.setHours(newToTime.getHours() + 1);
      setToTime(newToTime);
      setTempToTime(newToTime);
      let toTimeHours = newToTime.getHours();
      let newHoursLength = toTimeHours.toLocaleString().length;
      if (newHoursLength === 1) {
        toTimeHours = "0" + toTimeHours;
      }
      let newToTimeText = toTimeHours + ":" + mins;
      setToTimeText(newToTimeText);
    }
  };

  const handleToTimeDone = () => {
    setShowToTime(false);
    setToTime(tempToTime);
    let tempDate = new Date(tempToTime);
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
    setToTimeText(fTime);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressDialog
        visible={progressDialogVisible}
        title="جاري التحميل..."
        cancelable={false}
      />
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
                  minimumDate={isHR ? undefined : new Date()}
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
            minimumDate={isHR ? undefined : new Date()}
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
                  testID="ToDatePicker"
                  value={tempToDate}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  minimumDate={isHR ? undefined : new Date()}
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
            testID="ToDatePicker"
            value={toDate}
            mode="date"
            display="default"
            themeVariant="light"
            minimumDate={isHR ? undefined : new Date()}
            onChange={onChangeToDate}
          />
        )
      )}

      {Platform.OS === 'ios' ? (
        <RNModal
          visible={showFromTime}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFromTime(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModalStyle}>
              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerTitle}>{i18n.t("selectTime")}</Text>
                <DateTimePicker
                  testID="fromTimePicker"
                  value={tempFromTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={onChangeFromTime}
                />
                <AppButton
                  mode="contained"
                  onPress={handleFromTimeDone}
                  style={styles.datePickerButton}
                >
                  {i18n.t("done") || "Done"}
                </AppButton>
              </View>
            </View>
          </View>
        </RNModal>
      ) : (
        showFromTime && (
          <DateTimePicker
            testID="fromTimePicker"
            value={fromTime}
            mode="time"
            is24Hour={false}
            display="default"
            themeVariant="light"
            onChange={onChangeFromTime}
          />
        )
      )}

      {Platform.OS === 'ios' ? (
        <RNModal
          visible={showToTime}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowToTime(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModalStyle}>
              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerTitle}>{i18n.t("selectTime")}</Text>
                <DateTimePicker
                  testID="toTimePicker"
                  value={tempToTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={onChangeToTime}
                />
                <AppButton
                  mode="contained"
                  onPress={handleToTimeDone}
                  style={styles.datePickerButton}
                >
                  {i18n.t("done") || "Done"}
                </AppButton>
              </View>
            </View>
          </View>
        </RNModal>
      ) : (
        showToTime && (
          <DateTimePicker
            testID="toTimePicker"
            value={toTime}
            mode="time"
            is24Hour={false}
            display="default"
            themeVariant="light"
            onChange={onChangeToTime}
          />
        )
      )}

      {isHR && (
        <View style={styles.employeeContainer}>
          <Text style={styles.employeeLabel}>{i18n.t("employee")}</Text>
          <TouchableOpacity
            style={styles.employeeInput}
            onPress={() => setShowSelectEmployeeModal(true)}
            disabled={loadingEmployees}
          >
            <Text style={styles.employeeInputText}>
              {loadingEmployees ? "جاري التحميل..." : (selectedEmployeeName || i18n.t("selectEmployee"))}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Portal>
        <Modal
          visible={showSelectEmployeeModal}
          onDismiss={() => setShowSelectEmployeeModal(false)}
          contentContainerStyle={styles.modalStyle}
        >
          <Text style={styles.modalLabel}>{i18n.t("selectEmployee")}</Text>
          <RNTextInput
            placeholder="Search"
            clearButtonMode="always"
            style={styles.searchBox}
            value={searchText}
            onChangeText={handleSearch}
          />
          <FlatList
            keyExtractor={(item) => item.id}
            data={filteredEmployees}
            extraData={filteredEmployees}
            renderItem={({ item }) => (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedEmployeeId(item.id);
                    setSelectedEmployeeName(item.name);
                    setShowSelectEmployeeModal(false);
                    setSearchText("");
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      padding: 15,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      backgroundColor: "#fff",
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
      </Portal>

      <Picker
        selectedValue={selectedValue}
        placeholder={i18n.t("select")}
        style={styles.mainPicker}
        listMode="SCROLLVIEW"
        dropDownContainerStyle={{
          maxHeight: leaveTypes.length > 0 ? leaveTypes.length * 48 : 200, // 48px per item, adjust as needed
          width: Dimensions.get("window").width / 1.5 + 35,
          alignSelf: "center",
          zIndex: 5000,
        }}
        zIndex={5000}
        zIndexInverse={1000}
        onValueChange={(itemValue, itemIndex) => {
          const picked = leaveTypes.find(l => l.id === itemValue) || leaveTypes[itemIndex];
          if (!picked) return;
          setSelectedValue(picked.id);
          setSelectedValueDesc(picked.desc);
          setShowComponent2nd(picked.setShowComponent2nd);
          setShowComponent1st(picked.setShowComponent1st);
          setIsSick(picked.isSick);
          setIsFemaleOnly(picked.isFemaleOnly);
          setIsRasmyeh(picked.isRasmyeh);
          setIsEjazeh(picked.isEjazeh);
          setIsMoghadara(picked.isMoghadarah);
          setIsOmomeh(picked.isOmomeh);
          setIsOmomehHour(picked.isOmomehHour);
          setIsOboweh(picked.isOboweh);
          setIsFirstDeath(picked.isFirstDeath);
          setShowAttachment(picked.showAttachment);
          setShowFromDate(false);
          setShowToDate(false);
          setShowFromTime(false);
          setShowToTime(false);
          setSingleFile("");
          setFromDateText("");
          setToDateText("");
          setFromTimeText("");
          setToTimeText("");
          setSelectedValue1st("");
          setSelectedValue2nd("");
        }}
      >
        {leaveTypes.map(l => (
          <Picker.Item key={l.id} label={l.desc} value={l.id} />
        ))}
      </Picker>
      <Card>
        <Card.Content>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!!isEjazeh && (
              <SafeAreaView>
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
              </SafeAreaView>
            )}

            {!!isMoghadarah && (
              <SafeAreaView>
                <AppButton
                  mode="outlined"
                  style={styles.dateTimeButtons}
                  onPress={showFromDatePicker}
                >
                  {i18n.t("date")}
                </AppButton>
                <Text style={styles.dateTimeTexts}>{fromDateText}</Text>
                <AppButton
                  mode="outlined"
                  style={styles.dateTimeButtons}
                  onPress={showFromTimepicker}
                >
                  {i18n.t("fromTime")}
                </AppButton>
                <Text style={styles.dateTimeTexts}>{fromTimeText}</Text>

                <AppButton
                  mode="outlined"
                  style={styles.dateTimeButtons}
                  onPress={showToTimePicker}
                >
                  {i18n.t("toTime")}
                </AppButton>
                <Text style={styles.dateTimeTexts}>{toTimeText}</Text>
              </SafeAreaView>
            )}

            {!!isRasmyeh && (
              <SafeAreaView>
                <TextInput
                  label={i18n.t("location")}
                  value={location}
                  onChangeText={setLocation}
                />
                <TextInput
                  label={i18n.t("carNo")}
                  value={carNo}
                  onChangeText={setCarNo}
                />
              </SafeAreaView>
            )}

            {!!showComponent1st && (
              <View
                style={{
                  flexDirection: "row",
                  alignContent: "center",
                  alignItems: "center",
                  alignSelf: "center",
                }}
              >
                <Text style={{ padding: 20, fontSize: 16 }}>
                  {i18n.t("deceased")}
                </Text>
                <Picker
                  selectedValue={selectedValue1st}
                  style={{
                    height: Platform.OS === "ios" ? 150 : 75,
                    width: 150,
                    marginTop: Platform.OS === "ios" ? -25 : 0,
                    backgroundColor: Platform.OS === "android" ? "#ffffff" : "transparent",
                    color: Platform.OS === "android" ? "#000000" : "#000000",
                    borderWidth: Platform.OS === "android" ? 1 : 0,
                    borderColor: Platform.OS === "android" ? "#cccccc" : "transparent",
                    borderRadius: Platform.OS === "android" ? 4 : 0,
                  }}
                  itemStyle={styles.pickerItem}
                  dropdownIconColor={Platform.OS === "android" ? "#000000" : undefined}
                  onValueChange={(itemValue, itemIndex) =>
                    setSelectedValue1st(itemValue)
                  }
                >
                  <Picker.Item label="ام" value="ام" />
                  <Picker.Item label="اب" value="اب" />
                  <Picker.Item label="اخ" value="اخ" />
                  <Picker.Item label="اخت" value="اخت" />
                  <Picker.Item label="ابن" value="ابن" />
                  <Picker.Item label="ابنة" value="ابنة" />
                  <Picker.Item label="زوج" value="زوجة" />
                  <Picker.Item label="زوجة" value="زوجة" />
                </Picker>
              </View>
            )}

            {!!showComponent2nd && (
              <View
                style={{
                  flexDirection: "row",
                  alignContent: "center",
                  alignItems: "center",
                  alignSelf: "center",
                }}
              >
                <Text style={{ padding: 20, fontSize: 16 }}>
                  {i18n.t("deceased")}
                </Text>
                <Picker
                  selectedValue={selectedValue2nd}
                  style={{
                    height: Platform.OS === "ios" ? 150 : 75,
                    width: 150,
                    marginTop: Platform.OS === "ios" ? -25 : 0,
                    backgroundColor: Platform.OS === "android" ? "#ffffff" : "transparent",
                    color: Platform.OS === "android" ? "#000000" : "#000000",
                    borderWidth: Platform.OS === "android" ? 1 : 0,
                    borderColor: Platform.OS === "android" ? "#cccccc" : "transparent",
                    borderRadius: Platform.OS === "android" ? 4 : 0,
                  }}
                  itemStyle={styles.pickerItem}
                  dropdownIconColor={Platform.OS === "android" ? "#000000" : undefined}
                  onValueChange={(itemValue, itemIndex) =>
                    setSelectedValue2nd(itemValue)
                  }
                >
                  <Picker.Item label="جد" value="جد" />
                  <Picker.Item label="جدة" value="جدة" />
                  <Picker.Item label="عم" value="عم" />
                  <Picker.Item label="عمة" value="عمة" />
                  <Picker.Item label="خال" value="خال" />
                  <Picker.Item label="خالة" value="خالة" />
                  <Picker.Item label="اقارب" value="اقارب" />
                </Picker>
              </View>
            )}

            <TextInput
              label={i18n.t("notes")}
              multiline={true}
              value={notes}
              onChangeText={setNotes}
            />
            {!!showAttachment && (
              <SafeAreaView>
                <AttachmentPicker onAttachmentSelected={(file) => {
                  console.log('AttachmentPicker returned:', file);
                  setSingleFile(file);
                }} />
                {singleFile ? (
                  <AttachmentButton
                    mode="outlined"
                    icon="📄"
                    style={{
                      padding: 10,
                      width: "80%",
                      margin: 10,
                      alignSelf: "center",
                    }}
                    onPress={() => handleAttachmentPress(singleFile)}
                  >
                    {singleFile}
                  </AttachmentButton>
                ) : (
                  <Text style={{ textAlign: "center", padding: 20, color: "#666" }}>
                    {i18n.t("noAttachmentSelected")}
                  </Text>
                )}
              </SafeAreaView>
            )}


            <AppButton
              style={styles.addButtonStyle}
              mode="contained"
              onPress={submitRequest}
            >
              {i18n.t("submit")}
            </AppButton>
          </ScrollView>
        </Card.Content>
      </Card>
    </SafeAreaView>
  );
};

const menuStyle = {};

const styles = StyleSheet.create({
  datetimepickerstyle: {
    alignSelf: "center",
    width: 100,
    padding: 15,
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
  mainPicker: {
    height: Platform.OS === "ios" ? 150 : 75,
    width: 250,
    marginLeft: Platform.OS === "ios" ? 0 : "23%",
    alignSelf: Platform.OS === "ios" ? "center" : null,
    marginTop: Platform.OS === "ios" ? -35 : 0,
    backgroundColor: Platform.OS === "android" ? "#FAF9F6" : "transparent",
    color: Platform.OS === "android" ? "#000000" : "#000000",
    borderWidth: Platform.OS === "android" ? 1 : 0,
    borderColor: Platform.OS === "android" ? "#cccccc" : "transparent",
    borderRadius: Platform.OS === "android" ? 4 : 0,
  },
  pickerItem: {
    color: "#000000",
    backgroundColor: "#ffffff",
    fontSize: 16,
  },
  addButtonStyle: {
    backgroundColor: "rgb(1,135,134)",
    width: "80%",
    margin: 25,
  },
  cardContainer: {
    display: "flex",
    flex: 1,
    width: "100%",
    backgroundColor: "#fff",
  },
  container: {
    width: "100%",
    backgroundColor: "#FAF9F6",
    paddingTop: 40,
    alignItems: "stretch",
  },
  modalStyle: {
    backgroundColor: "white",
    padding: 30,
    margin: 20,
    borderRadius: 10,
    maxHeight: "80%",
  },
  modalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
    fontWeight: "500",
  },
  employeeContainer: {
    marginBottom: 15,
  },
  employeeLabel: {
    fontSize: 16,
    color: "rgb(1,135,134)",
    marginBottom: 8,
    fontWeight: "600",
    textAlign: "center",
  },
  employeeInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    backgroundColor: "#fff",
    minHeight: 48,
    justifyContent: "center",
  },
  employeeInputText: {
    fontSize: 16,
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerModalStyle: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
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
});

export default TakeALeaveScreen;
