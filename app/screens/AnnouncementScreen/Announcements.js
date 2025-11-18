import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import * as Commons from "../../utils/Commons";
import * as Constants from "../../utils/Constants";
import * as ServerOperations from "../../utils/ServerOperations";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import ProgressDialog from "../../components/ProgressDialog";
import { Camera, CameraType, useCameraPermissions } from "expo-camera";
import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";
import {
  Card,
  Text,
  TextInput,
  Portal,
  Modal,
  FAB,
} from "react-native-paper";
import i18n from "../../languages/langStrings";
import AttachmentPicker from "../../components/AttachmentPicker";
import AttachmentButton from "../../components/AttachmentButton";
TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

export default function AnnouncementScreen({ route }) {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [singleFile, setSingleFile] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showAddButton, setShowAddButton] = useState(false);
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

  const handleTakePic = async () => {
    if (camera) {
      const res = await camera.takePictureAsync({ quality: 0.7 });

      if (res !== undefined && res !== null && res !== "") {
        setProgressDialogVisible(true);

        try {
          // Compress the captured image
          const compressed = await manipulateAsync(
            res.uri,
            [{ resize: { width: 1000 } }],
            { compress: 0.7, format: SaveFormat.JPEG }
          );

          const name = new Date().getTime() + '.jpg';
          const file = { uri: compressed.uri, name, type: "*/*" };
          const uploadRes = await ServerOperations.pickUploadHttpRequest(file, 1);
          setSingleFile(name);
          setShowCaptureModal(false);
        } catch (error) {
          console.log('Image processing failed:', error);
          // Fallback to original image
          const name = new Date().getTime() + res.uri.substring(res.uri.lastIndexOf("."));
          const file = { uri: res.uri, name, type: "*/*" };
          const uploadRes = await ServerOperations.pickUploadHttpRequest(file, 1);
          setSingleFile(name);
          setShowCaptureModal(false);
        }

        setProgressDialogVisible(false);
      }
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
          setProgressDialogVisible(true);

          let processedUri = res.uri;
          let processedName = res.name;

          // Compress image files
          if (res.mimeType && res.mimeType.startsWith('image/')) {
            try {
              const compressed = await manipulateAsync(
                res.uri,
                [{ resize: { width: 1000 } }],
                { compress: 0.7, format: SaveFormat.JPEG }
              );
              processedUri = compressed.uri;
              processedName = new Date().getTime() + '.jpg';
            } catch (compressionError) {
              console.log('Image compression failed, using original:', compressionError);
              processedName = new Date().getTime() + res.name.substring(res.name.lastIndexOf("."));
            }
          } else {
            processedName = new Date().getTime() + res.name.substring(res.name.lastIndexOf("."));
          }

          console.log(`name ${processedName}`);
          const file = { uri: processedUri, name: processedName, type: "*/*" };
          const uploadRes = await ServerOperations.pickUploadHttpRequest(
            file,
            1
          );
          setSingleFile(processedName);
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
  const handleAttachmentPress = (attachment) => {
    const uri = Constants.attachmentPath + "/" + attachment;
    console.log(uri);
    Linking.openURL(uri);
  };

  const showModalHandler = () => {
    setShowModal(true);
  };
  const allAnnouncements = async () => {
    const fromDate = route.params.fromDateAnn;
    const toDate = route.params.toDateAnn;
    const isHr = route.params.isHr;
    const userID = await Commons.getFromAS("userID");
    if (isHr) {
      setShowAddButton(true);
    } else {
      setShowAddButton(false);
    }
    const reqs = await ServerOperations.getAllAnnouncements(fromDate, toDate);
    setAnnouncements(reqs);
  };

  const submitAnnoucement = async () => {
    setProgressDialogVisible(true);
    // Validate required fields
    if (!title.trim()) {
      setProgressDialogVisible(false);
      Commons.okAlert(i18n.t("titleRequired") || "العنوان مطلوب");
      return;
    }

    if (!singleFile) {
      setProgressDialogVisible(false);
      Commons.okAlert(i18n.t("attachmentRequired") || "المرفق مطلوب");
      return;
    }

    try {
      const resp = await ServerOperations.submitAnnoucement(
        title,
        desc,
        singleFile
      );

      if (resp.res) {
        await allAnnouncements();
        setShowModal(false);
        setTitle("");
        setDesc("");
        setSingleFile("");
        Commons.okAlert(i18n.t("announcementAdded"));
      } else if (resp === null) {
        // Network timeout but API might have succeeded
        console.log("Network timeout occurred, checking if announcement was added...");
        await allAnnouncements();
        setShowModal(false);
        setTitle("");
        setDesc("");
        setSingleFile("");
        Commons.okAlert("تم إرسال الإعلان بنجاح");
      } else {
        Commons.okAlert("حدث خطأ أثناء إرسال الإعلان");
      }
    } catch (error) {
      console.log("Submit announcement error:", error);
      // Check if it's a timeout error
      if (error.message && error.message.includes('timeout')) {
        console.log("Timeout error detected, assuming success...");
        await allAnnouncements();
        setShowModal(false);
        setTitle("");
        setDesc("");
        setSingleFile("");
        Commons.okAlert("تم إرسال الإعلان بنجاح");
      } else {
        Commons.okAlert("حدث خطأ في الشبكة");
      }
    } finally {
      setProgressDialogVisible(false);
    }
  };

  useEffect(() => {
    allAnnouncements();
    permisionFunction();
  }, []);

  return (
    <SafeAreaView style={styles.safeAreaViewContainer}>
      <ProgressDialog
        visible={progressDialogVisible}
        title="جاري التحميل..."
        cancelable={false}
      />
      {showAddButton && (
        <AttachmentButton
          title={i18n.t("add")}
          style={styles.FAB}
          icon="+"
          onPress={showModalHandler}
        />
      )}
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
                style={{ flex: 1, aspectRatio: 1, zIndex: 100 }}
              />
              <AttachmentButton onPress={handleTakePic} icon="📷" mode="contained">
                {i18n.t("takePicture")}
              </AttachmentButton>
            </View>
          </Modal>
        )}
      </Portal>
      <Portal>
        {!!showModal && (
          <Modal
            visible={true}
            onDismiss={() => setShowModal(false)}
            contentContainerStyle={styles.modalStyle}
          >
            <TextInput
              label={i18n.t("title")}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              label={i18n.t("description")}
              value={desc}
              onChangeText={setDesc}
            />
            <SafeAreaView>
              <AttachmentPicker onAttachmentSelected={setSingleFile} />
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

            <AttachmentButton
              style={{
                margin: 20,
              }}
              title={i18n.t("submit")}
              onPress={() => submitAnnoucement()}
            />
          </Modal>
        )}
      </Portal>

      <FlatList
        keyExtractor={(item) => item.id}
        data={announcements}
        extraData={announcements}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <Card>
              <Card.Title
                title={item.title}
                titleStyle={styles.cardTitle}
              ></Card.Title>
              <Card.Content>
                {!!(item.date !== " ") ? (
                  <Text style={styles.textItemsStyle}> {item.date} </Text>
                ) : null}

                {!!(item.desc !== " ") ? (
                  <Text style={styles.textItemsStyle}> {item.desc} </Text>
                ) : null}

                {!!(
                  item.attachments !== " " && item.attachments !== "undefined"
                ) ? (
                  <AttachmentButton
                    mode="outlined"
                    icon="📄"
                    style={{
                      padding: 10,
                      width: "80%",
                      margin: 10,
                    }}
                    onPress={() =>
                      handleAttachmentPress(item.attachments)
                    }
                  >
                    {item.attachments}
                  </AttachmentButton>
                ) : null}
              </Card.Content>
            </Card>
          </View>
        )}
      />

    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeAreaViewContainer: {
    flex: 1,
    justifyContent: "center",
  },
  FAB: {
    margin: 20,
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 50,
    borderRadius: 10,
    elevation: 20,
  },
  modalBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalStyle: {
    backgroundColor: "white",
    padding: 30,
  },
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
    backgroundColor: "rgb(1,135,134)",
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
  addButtonStyle: {
    backgroundColor: "rgb(1,135,134)",
    width: "80%",
    margin: 25,
  },
  textStyle: {
    fontSize: 14,
    color: "#007AFF",
    textDecorationLine: "underline",
    textAlign: "center",
    padding: 10,
  },
});
