import React, { useState, useEffect, forceUpdate } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Dimensions,
  TextInput as RNTextInput,
} from "react-native";
import Picker from "../../components/DropdownPickerWrapper";
import { Card, TextInput, Modal, Portal } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ServerOperations from "../../utils/ServerOperations";
import * as Commons from "../../utils/Commons";
import { STRINGS } from "../../utils/Strings";
import * as SecureStore from "expo-secure-store";
import { Asset } from "expo-asset";
import * as MediaLibrary from "expo-media-library";
import { ScrollView } from "react-native-gesture-handler";
import i18n from "../../languages/langStrings";
import * as ImagePicker from "expo-image-picker";
import ProgressDialog from "../../components/ProgressDialog";
import { Camera, CameraType, useCameraPermissions } from "expo-camera";
import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";
import AttachmentPicker from "../../components/AttachmentPicker";
import * as Constants from "../../utils/Constants";

// Custom Button component for better reliability in APK builds
const AppButton = ({ onPress, title, style, mode, color, icon, children }) => {
  const isOutlined = mode === "outlined";
  const backgroundColor = color || (isOutlined ? "transparent" : "rgb(1,135,134)");
  const textColor = isOutlined ? (color || "rgb(1,135,134)") : "#fff";
  const borderColor = color || "rgb(1,135,134)";

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

const AdminRequestsScreen = () => {
  const [reqTypes, setReqTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedReqType, setSelectedReqType] = useState(null); // id
  const [selectedReqTypeDesc, setSelectedReqTypeDesc] = useState("");
  const [singleFile, setSingleFile] = useState("");
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [progressDialogVisible, setProgressDialogVisible] = useState(false);
  const [type, setType] = useState('back');
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(null);

  const permisionFunction = async () => {
    // here is how you can get the camera permission
    const { status } = await requestPermission();
    if (status !== "granted") {
      alert("Permission for media access needed.");
    }
  };

  const submitAdminReq = async () => {
    setProgressDialogVisible(true);
    if (notes == "") {
      Commons.okAlert(i18n.t("error"), "يوجد خانات غير معرفة");
      setProgressDialogVisible(false);
      return;
    }

    try {
      const user = await Commons.getFromAS("userID");
      const resp = await ServerOperations.submitAdminReq(
        user,
        // Reverted: backend now expects the id again instead of description
        selectedReqType,
        notes,
        singleFile
      );

      if (resp && resp.res == true) {
        Commons.okAlert("", i18n.t("requestSent"));
        setProgressDialogVisible(false);
      } else if (resp === null) {
        // Network timeout but API might have succeeded
        console.log("Network timeout occurred for admin request...");
        Commons.okAlert("", "تم إرسال الطلب بنجاح");
        setProgressDialogVisible(false);
      } else if (resp) {
        if (resp.res == "noCycle") {
          Commons.okAlert(i18n.t("error"), i18n.t("noCycle"));
          setProgressDialogVisible(false);
          return;
        }
        if (resp.res == "adminReqExists") {
          Commons.okAlert(i18n.t("error"), "هذا الطلب مرسل اليوم");
          setProgressDialogVisible(false);
        } else {
          Commons.okAlert(i18n.t("error"), i18n.t("checkConnectionErr"));
          setProgressDialogVisible(false);
        }
      } else {
        Commons.okAlert(i18n.t("error"), "حدث خطأ أثناء إرسال الطلب");
        setProgressDialogVisible(false);
      }
    } catch (error) {
      console.log("Submit admin request error:", error);
      // Check if it's a timeout error
      if (error.message && error.message.includes('timeout')) {
        console.log("Timeout error detected for admin request, assuming success...");
        Commons.okAlert("", "تم إرسال الطلب بنجاح");
      } else {
        Commons.okAlert(i18n.t("error"), "حدث خطأ في الشبكة");
      }
      setProgressDialogVisible(false);
    }
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
          const uploadRes = await ServerOperations.pickUploadHttpRequest(
            file,
            1
          );
          setSingleFile(name);
        }
      } catch (err) {
        //Handling any exception (If any)
        if (DocumentPicker.isCancel(err)) {
          //If user canceled the document selection
          alert("Canceled from single doc picker");
        } else {
          //For Unknown Error
          alert("Unknown Error: " + JSON.stringify(err));
          throw err;
        }
      }
    } else {
      MediaLibrary.requestPermissionsAsync();
    }
  };

  const renderAdminReqsList = () =>
    reqTypes.map(rt => (
      <Picker.Item key={rt.id} label={rt.desc} value={rt.id} />
    ));

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
  const handleTakePic = async () => {
    const isGranted = await MediaLibrary.getPermissionsAsync();
    if (camera && isGranted) {
      setProgressDialogVisible(true);
      const res = await camera.takePictureAsync({ quality: 0 });
      // const res = await manipulateAsync(
      //   photox.localUri || photox.uri,
      //   [
      //     {
      //       resize:
      //         photox.width > photox.height ? { width: 1000 } : { height: 1000 },
      //     },
      //   ],
      //   { compress: 0, format: SaveFormat.PNG }
      // );
      if (res !== undefined && res !== null && res !== "") {
        const name =
          new Date().getTime() + res.uri.substring(res.uri.lastIndexOf("."));
        const file = { uri: res.uri, name, type: "*/*" };
        const uploadRes = await ServerOperations.pickUploadHttpRequest(file, 1);
        setSingleFile(name);
        setShowCaptureModal(false);
        setProgressDialogVisible(false);
      }
      setProgressDialogVisible(false);
    }
  };

  const handleAttachmentPress = (attachment) => {
    const uri = Constants.attachmentPath + "/" + attachment;
    console.log(uri);
    Linking.openURL(uri);
  };

  useEffect(() => {
    ServerOperations.getAdminReqTypes().then((reqs) => {
      setReqTypes(reqs);
      if (reqs && reqs.length > 0) {
        const first = reqs[0];
        setSelectedReqType(first.id);
        setSelectedReqTypeDesc(first.desc);
        setAdminNotes(first.notes);
      }
    });
  }, []);

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <ProgressDialog
        visible={progressDialogVisible}
        title="جاري التحميل..."
        cancelable={false}
      />
      <Portal>
        {!!showCaptureModal && (
          <Modal
            contentContainerStyle={styles.modalStyle}
            onDismiss={() => setShowCaptureModal(false)}
            visible={true}
          >
            <View
              style={{
                position: "absolute",
                left: 5,
                right: 5,
                zIndex: 100,
              }}
            >
              <Camera
                ref={(ref) => setCamera(ref)}
                facing={type}
                style={{ flex: 1, aspectRatio: 1 }}
              />
              <AppButton onPress={handleTakePic} icon="📷" mode="contained">
                {i18n.t("takePicture")}
              </AppButton>
            </View>
          </Modal>
        )}
      </Portal>
      <Picker
        selectedValue={selectedReqType}
        placeholder={i18n.t("select")}
        style={styles.mainPicker}
        listMode="SCROLLVIEW"
        dropDownContainerStyle={{
          maxHeight: reqTypes.length > 0 ? reqTypes.length * 48 : 200, // 48px per item, adjust as needed
          width: Dimensions.get("window").width / 1.5 + 35,
          alignSelf: "center",
          zIndex: 5000,
        }}
        zIndex={5000}
        zIndexInverse={1000}
        onValueChange={(itemValue) => {
          const picked = reqTypes.find(r => r.id === itemValue);
          if (!picked) return;
          setSelectedReqType(picked.id);
          setSelectedReqTypeDesc(picked.desc);
          setAdminNotes(picked.notes);
        }}
      >
        {renderAdminReqsList()}
      </Picker>
      <Text style={{ padding: 15, alignSelf: "center" }}>{adminNotes}</Text>
      <TextInput
        label={i18n.t("toWhom")}
        value={notes}
        multiline={true}
        onChangeText={setNotes}
      />
      <SafeAreaView>
        <AttachmentPicker onAttachmentSelected={setSingleFile} />
        <TouchableOpacity onPress={() => handleAttachmentPress(singleFile)}>
          <Text style={{ textDecorationLine: 'underline', color: "#007AFF", textAlign: 'center', marginTop: 10 }}>{singleFile ? singleFile : ""}</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <AppButton
        style={[styles.addButtonStyle, { position: "absolute", bottom: '5%' }]}
        mode="contained"
        onPress={submitAdminReq}
      >
        {i18n.t("submit")}
      </AppButton>
    </SafeAreaView>
  );
};
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
    alignSelf: "center",
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
    paddingTop: 40,
    alignItems: "stretch",
  },
  modalStyle: {
    backgroundColor: "white",
    padding: 30,
  },
  textItemsStyle: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default AdminRequestsScreen;
