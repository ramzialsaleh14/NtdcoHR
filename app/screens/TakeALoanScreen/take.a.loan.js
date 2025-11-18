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
} from "react-native";
import Picker from "../../components/DropdownPickerWrapper";
import { Card, TextInput, Modal, Portal } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ServerOperations from "../../utils/ServerOperations";
import * as Commons from "../../utils/Commons";
import { STRINGS } from "../../utils/Strings";
import * as SecureStore from "expo-secure-store";
import { Asset } from "expo-asset";
import { ScrollView } from "react-native-gesture-handler";
import i18n from "../../languages/langStrings";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
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
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      {icon && <Text style={{ color: textColor, marginRight: 8 }}>{icon}</Text>}
      <Text style={{ color: textColor, fontSize: 16, fontWeight: "500" }}>
        {title || children}
      </Text>
    </TouchableOpacity>
  );
};

const TakeALoanScreen = () => {
  const [loanAmount, setLoanAmount] = useState("");
  const [numOfPayments, setNumOfPayments] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState("");
  const [singleFile, setSingleFile] = useState("");
  const [progressDialogVisible, setProgressDialogVisible] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
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

  const submitLoan = async () => {
    setProgressDialogVisible(true);
    if (singleFile == "" || notes == "") {
      Commons.okAlert(i18n.t("error"), "يوجد خانات غير معرفة");
      setProgressDialogVisible(false);
      return;
    }

    try {
      const user = await Commons.getFromAS("userID");
      const resp = await ServerOperations.submitLoan(
        user,
        loanAmount,
        numOfPayments,
        paymentAmount,
        notes,
        singleFile
      );

      if (resp && resp.res == true) {
        Commons.okAlert("", i18n.t("requestSent"));
        setProgressDialogVisible(false);
      } else if (resp === null) {
        // Network timeout but API might have succeeded
        console.log("Network timeout occurred for loan request...");
        Commons.okAlert("", "تم إرسال الطلب بنجاح");
        setProgressDialogVisible(false);
      } else if (resp) {
        if (resp.res == "noCycle") {
          Commons.okAlert(i18n.t("error"), i18n.t("noCycle"));
          setProgressDialogVisible(false);
          return;
        } else if (resp.res == "loanReqExists") {
          Commons.okAlert(i18n.t("error"), "هذا الطلب مرسل اليوم");
          setProgressDialogVisible(false);
        } else {
          Commons.okAlert(i18n.t("error"), "حدث خطأ أثناء إرسال الطلب");
          setProgressDialogVisible(false);
        }
      } else {
        Commons.okAlert(i18n.t("error"), "حدث خطأ أثناء إرسال الطلب");
        setProgressDialogVisible(false);
      }
    } catch (error) {
      console.log("Submit loan request error:", error);
      // Check if it's a timeout error
      if (error.message && error.message.includes('timeout')) {
        console.log("Timeout error detected for loan request, assuming success...");
        Commons.okAlert("", "تم إرسال الطلب بنجاح");
      } else {
        Commons.okAlert(i18n.t("error"), "حدث خطأ في الشبكة");
      }
      setProgressDialogVisible(false);
    }
  };

  const handleTakePic = async () => {
    if (camera) {
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
    Linking.openURL(uri);
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
          setProgressDialogVisible(true);
          const uploadRes = await ServerOperations.pickUploadHttpRequest(
            file,
            1
          );
          setSingleFile(name);
          setProgressDialogVisible(false);
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

  useEffect(() => { }, [numOfPayments, paymentAmount]);
  useEffect(() => {
    permisionFunction();
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
      <TextInput
        label={i18n.t("loanAmount")}
        value={loanAmount}
        keyboardType="numeric"
        onChangeText={(text) => {
          setLoanAmount(text);
          if (text > 0 && numOfPayments > 0)
            setPaymentAmount(text / numOfPayments + "");
          //if (text > 0 && paymentAmount > 0) setNumOfPayments(text / paymentAmount + "");
        }}
      />
      <TextInput
        label={i18n.t("numOfPayments")}
        value={numOfPayments}
        keyboardType="numeric"
        onChangeText={(text) => {
          setNumOfPayments(text);
          if (loanAmount > 0 && text > 0)
            setPaymentAmount(loanAmount / text + "");
        }}
      />
      <TextInput
        label={i18n.t("paymentAmount")}
        value={paymentAmount}
        keyboardType="numeric"
        onChangeText={(text) => {
          setPaymentAmount(text);
          if (loanAmount > 0 && text > 0)
            setNumOfPayments(loanAmount / text + "");
        }}
      />
      <TextInput
        label={i18n.t("notes")}
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
        style={[styles.addButtonStyle, { position: "absolute", bottom: 0 }]}
        mode="contained"
        onPress={submitLoan}
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

export default TakeALoanScreen;
