import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Pressable,
} from "react-native";
import * as Commons from "../../utils/Commons";
import * as Constants from "../../utils/Constants";
import * as ServerOperations from "../../utils/ServerOperations";
import {
  Button,
  Card,
  Text,
  TextInput,
  Portal,
  Modal,
} from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import i18n from "../../languages/langStrings";
import ProgressDialog from "../../components/ProgressDialog";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import { Camera, CameraType, useCameraPermissions } from "expo-camera";
import AttachmentPicker from "../../components/AttachmentPicker";
import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";

TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

const AppButton = ({ onPress, title }) => (
  <TouchableOpacity onPress={onPress} style={styles.appButtonContainer}>
    <Text style={styles.appButtonText}>{title}</Text>
  </TouchableOpacity>
);

const ViewRequestsAdminScreen = ({ route }) => {
  const [requests, setRequests] = useState([]);
  const [infoList, setInfoList] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [curItem, setCurItem] = useState("");
  const [respNotes, setRespNotes] = useState("");
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [infoUser, setInfoUser] = useState("");
  const [infoTotLoans, setInfoTotLoans] = useState("");
  const [infoTotSickLoans, setInfoTotSickLoans] = useState("");
  const [infoUsedLoans, setInfoUsedLoans] = useState("");
  const [infoUsedSickLoans, setInfoUsedSickLoans] = useState("");
  const [progressDialogVisible, setProgressDialogVisible] = useState(false);
  const [singleFile, setSingleFile] = useState("");
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [type, setType] = useState('back');
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(null);

  const allRequests = async () => {
    setProgressDialogVisible(true);
    const userID = await Commons.getFromAS("userID");
    const fromDate = route.params.fromDate;
    const toDate = route.params.toDate;
    const reqs = await ServerOperations.getAdminRequests(
      userID,
      fromDate,
      toDate
    );
    setRequests(reqs);
    setProgressDialogVisible(false);
  };

  const permisionFunction = async () => {
    // here is how you can get the camera permission
    const { status } = await requestPermission();
    if (status !== "granted") {
      alert("Permission for media access needed.");
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
      setSingleFile({ name });
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
          const uploadRes = await ServerOperations.pickUploadHttpRequest(
            file,
            1
          );
          setSingleFile({ name });
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

  const handleTakePic = async () => {
    if (camera) {
      setProgressDialogVisible(true);
      const res = await camera.takePictureAsync({ quality: 0 });
      // const res = await manipulateAsync(
      //   photox.localUri || photox.uri,
      //   [
      //     {
      //       resize:
      //         photox.width > photox.height ? {width: 1000 } : {height: 1000 },
      //     },
      //   ],
      //   {compress: 0, format: SaveFormat.PNG }
      // );
      if (res !== undefined && res !== null && res !== "") {
        const name =
          new Date().getTime() + res.uri.substring(res.uri.lastIndexOf("."));
        const file = { uri: res.uri, name, type: "*/*" };
        const uploadRes = await ServerOperations.pickUploadHttpRequest(file, 1);
        setSingleFile(name);
        setShowCaptureModal(false);
        setOpenModal(true);
        setProgressDialogVisible(false);
      }
      setProgressDialogVisible(false);
    }
  };

  const setLeavesInfo = async (user) => {
    setProgressDialogVisible(true);
    const info = await ServerOperations.getLeavesInfo(user);
    if (info != "") {
      setInfoUser(info[0].userName);
      setInfoTotLoans(info[0].totLoans);
      setInfoTotSickLoans(info[0].totSickLoans);
      setInfoUsedLoans(info[0].usedLoans);
      setInfoUsedSickLoans(info[0].usedSickLoans);
      setInfoList(info);
      //setOpenInfoModal(true);
      setProgressDialogVisible(false);
    } else {
      Commons.okAlert("لا يوجد رصيد اجازات لهذا الموظف");
    }
    setProgressDialogVisible(false);
  };

  const respondToReq = async (resp) => {
    setProgressDialogVisible(true);
    const userID = await Commons.getFromAS("userID");
    const res = await ServerOperations.respondToAdminRequest(
      userID,
      resp,
      curItem.id,
      respNotes,
      singleFile
    );
    if (res.res === "SENT") {
      curItem.status = resp;
      Commons.toast(resp + ".");
      var index = requests.indexOf(curItem);
      if (index !== -1) {
        requests.splice(index, 1);
      }
      setRequests([...requests]);
      setOpenModal(false);
    }
    //  else if (res.res === "EXISTS") {
    //   Commons.okAlert(i18n.t("anotherLeaveApproved"));
    // }
    setProgressDialogVisible(false);
  };

  useEffect(() => {
    allRequests();
  }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ProgressDialog
        visible={progressDialogVisible}
        title="جاري التحميل..."
        cancelable={false}
      />
      <Portal>
        {!!showCaptureModal && (
          <Modal
            contentContainerStyle={styles.modalStyle}
            onDismiss={() => {
              setShowCaptureModal(false);
              setOpenModal(true);
            }}
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
              <Button onPress={handleTakePic} icon="camera" mode="contained">
                {i18n.t("takePicture")}
              </Button>
            </View>
          </Modal>
        )}
      </Portal>
      <Modal transparent visible={openInfoModal}>
        <View style={styles.modalBackground}>
          <View style={styles.infoModalContainer}>
            <MaterialIcons
              name="close"
              size={24}
              style={{
                padding: 10,
                paddingTop: 15,
                alignSelf: "flex-end",
                position: "absolute",
                marginTop: -10,
                color: "#808080",
                marginRight: 5,
              }}
              onPress={() => setOpenInfoModal(false)}
            />
            {/* <Text
              style={{
                position: "absolute",
                padding: 15,
                fontSize: 16,
                top: 0,
                alignSelf: "center",
                fontWeight: "bold",
              }}
            >
              {i18n.t("userLeavesInfo")}
            </Text> */}
            <Text
              style={[
                styles.cardTitle,
                { color: "#A91B0D", position: "absolute", padding: 15 },
              ]}
            >
              {infoUser}
            </Text>
            <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
              {" "}
              {i18n.t("totalLoans")} {": "} {infoTotLoans}
            </Text>
            <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
              {" "}
              {i18n.t("totalSickLoans")} {": "} {infoTotSickLoans}
            </Text>
            <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
              {" "}
              {i18n.t("usedLoans")} {": "} {infoUsedLoans}
            </Text>
            <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
              {" "}
              {i18n.t("usedSickLoans")} {": "} {infoUsedSickLoans}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "black" }} />
              <View style={{ flex: 1, height: 1, backgroundColor: "black" }} />
            </View>

            <FlatList
              keyExtractor={(item) => item.id}
              data={infoList}
              extraData={infoList}
              renderItem={({ item }) => (
                <View style={styles.cardContainer}>
                  <Card>
                    <Card.Content>
                      {!!(item.type != "" && item.type != null) ? (
                        <Text style={styles.reqTypeStyle}> {item.type} </Text>
                      ) : null}
                      {!!(item.fromDate != "" && item.fromDate != null) ? (
                        <Text style={styles.textItemsStyle}>
                          {" "}
                          {i18n.t("fromDate")} {": "} {item.fromDate}
                        </Text>
                      ) : null}
                      {!!(item.toDate != "" && item.toDate != null) ? (
                        <Text style={styles.textItemsStyle}>
                          {" "}
                          {i18n.t("toDate")} {": "} {item.toDate}
                        </Text>
                      ) : null}
                      {!!(
                        item.days != "" &&
                        item.days != 0 &&
                        item.days != null
                      ) ? (
                        <Text style={styles.textItemsStyle}>
                          {" "}
                          {i18n.t("days")} {": "} {item.days}
                        </Text>
                      ) : null}
                      {!!(
                        item.hours != "" &&
                        item.hours != 0 &&
                        item.hours != null
                      ) ? (
                        <Text style={styles.textItemsStyle}>
                          {" "}
                          {i18n.t("hours")} {": "} {item.hours}
                        </Text>
                      ) : null}
                    </Card.Content>
                  </Card>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Portal>
        {!!openModal && (
          <Modal
            visible={true}
            contentContainerStyle={styles.modalStyle}
            onDismiss={() => setOpenModal(false)}
          >
            <View style={styles.modalBackground}>
              <Text
                style={{
                  padding: 10,
                  fontSize: 16,
                  alignSelf: "center",
                }}
              >
                {i18n.t("respondToRequest")}
              </Text>

              <TextInput
                label={i18n.t("respondNotes")}
                value={respNotes}
                style={{ marginBottom: 25 }}
                onChangeText={setRespNotes}
              />
              <SafeAreaView>
                <AttachmentPicker onAttachmentSelected={setSingleFile} />
                <TouchableOpacity onPress={() => handleAttachmentPress(singleFile)}>
                  <Text style={{ textDecorationLine: 'underline', color: "#007AFF", textAlign: 'center', marginTop: 10 }}>
                    {singleFile ? singleFile : ""}
                  </Text>
                </TouchableOpacity>
              </SafeAreaView>
              <Button
                mode="outlined"
                style={{
                  backgroundColor: "#00FF00",
                }}
                onPress={() => respondToReq("Approved")}
              >
                {i18n.t("approve")}
              </Button>
              <Button
                mode="outlined"
                style={{
                  backgroundColor: "#FF0000",
                }}
                onPress={() => respondToReq("Denied")}
                labelStyle={{ color: "white" }}
              >
                {i18n.t("deny")}
              </Button>
            </View>
          </Modal>
        )}
      </Portal>

      <FlatList
        keyExtractor={(item) => item.id}
        data={requests}
        extraData={requests}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <Card>
              <MaterialIcons
                name="info-outline"
                style={{ padding: 15, position: "absolute" }}
                size={28}
                color="rgb(178,34,34)"
              />
              <Card.Title
                title={item.userName}
                titleStyle={styles.cardTitle}
              ></Card.Title>
              <Card.Content>
                {!!(item.submitDate !== "") ? (
                  <Text style={styles.textItemsStyle}>
                    {" "}
                    {i18n.t("date")} {":"} {item.submitDate}{" "}
                  </Text>
                ) : null}
                {!!(item.reqType !== "") ? (
                  <Text style={styles.textItemsStyle}>
                    {" "}
                    {i18n.t("reqType")} {item.reqType}{" "}
                  </Text>
                ) : null}
                {!!(item.adminNotes !== "") ? (
                  <Text
                    style={[styles.textItemsStyle, { alignSelf: "center" }]}
                  >
                    {" "}
                    {item.adminNotes}{" "}
                  </Text>
                ) : null}

                {!!(
                  item.attachments !== "" && item.attachments !== "undefined"
                ) ? (
                  <View>
                    {/* <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("attachments")}{" "}
                    </Text> */}
                    <Button
                      mode="outlined"
                      icon="file"
                      uppercase="false"
                      style={{
                        padding: 10,
                        width: "80%",
                        margin: 10,
                      }}
                      onPress={() =>
                        Linking.openURL(
                          `${Constants.serverBaseUrl}/pick/faces/attachments/HRapp/` +
                          item.attachments
                        )
                      }
                    >
                      {item.attachments}
                    </Button>
                  </View>
                ) : null}
                {!!(item.notes !== "") ? (
                  <Text style={styles.textItemsStyle}>
                    {" "}
                    {i18n.t("notes")} {":"} {item.notes}{" "}
                  </Text>
                ) : null}

                {!!(item.status !== "") ? (
                  <Text style={{ marginLeft: 5, padding: 5 }}>
                    <Text style={styles.textItemsStyle}>
                      {i18n.t("status")}
                    </Text>
                    <Text
                      style={[
                        styles.textItemsStyle,
                        {
                          color:
                            item.status === "Approved"
                              ? "#00FF00"
                              : item.status === "Denied"
                                ? "#FF0000"
                                : item.status === "Pending"
                                  ? "#FFCD01"
                                  : null,
                        },
                      ]}
                    >
                      {" "}
                      {item.status}{" "}
                    </Text>
                  </Text>
                ) : null}

                <View style={styles.loginButtonContainer}>
                  <AppButton
                    title={i18n.t("respond")}
                    onPress={() => {
                      setOpenModal(true);
                      setCurItem(item);
                    }}
                  />
                </View>
              </Card.Content>
            </Card>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 50,
    borderRadius: 10,
    elevation: 20,
  },
  infoModalContainer: {
    width: "90%",
    height: "80%",
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 50,
    marginVertical: 10,
    borderRadius: 10,
    elevation: 20,
  },
  modalBackground: {},
  textItemsStyle: {
    fontSize: 15,
    fontWeight: "bold",
    padding: 5,
  },
  reqTypeStyle: {
    color: "#A91B0D",
    fontSize: 16,
    alignSelf: "center",
    fontWeight: "bold",
  },
  mainContainer: {
    backgroundColor: "#FFF",
  },
  viewContainer: {
    width: "80%",
  },
  cardContainer: {
    display: "flex",
    flex: 1,
    padding: 15,
    paddingTop: 30,
  },

  loginButtonStyle: {
    margin: 2,
    marginLeft: 0,
    marginRight: 0,
  },

  loginButtonContainer: {
    margin: 15,
    alignSelf: "center",
    marginBottom: 2,
    width: "40%",
  },

  appButtonContainer: {
    backgroundColor: "rgb(178,34,34)",
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cardTitle: {
    color: "#000",
    fontWeight: "bold",
    alignSelf: "center",
    fontSize: 18,
    padding: 15,
  },
  appButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase",
  },
  modalStyle: {
    backgroundColor: "white",
    padding: 30,
  },
});

export default ViewRequestsAdminScreen;
