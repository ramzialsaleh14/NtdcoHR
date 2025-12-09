import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import * as Commons from "../../utils/Commons";
import * as Constants from "../../utils/Constants";
import * as ServerOperations from "../../utils/ServerOperations";
import { Button, Card, Text } from "react-native-paper";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import i18n from "../../languages/langStrings";
import Ionicons from "@expo/vector-icons/Ionicons";
import ProgressDialog from "../../components/ProgressDialog";
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";
TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

const AppButton = ({ onPress, title }) => (
  <TouchableOpacity onPress={onPress} style={styles.appButtonContainer}>
    <Text style={styles.appButtonText}>{title}</Text>
  </TouchableOpacity>
);

export default function ViewCheckInsHrScreen({ route }) {
  const [requests, setRequests] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [curItem, setCurItem] = useState("");
  const [infoList, setInfoList] = useState([]);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [infoUser, setInfoUser] = useState("");
  const [infoTotLoans, setInfoTotLoans] = useState("");
  const [infoTotSickLoans, setInfoTotSickLoans] = useState("");
  const [infoUsedLoans, setInfoUsedLoans] = useState("");
  const [infoUsedSickLoans, setInfoUsedSickLoans] = useState("");
  const [progressDialogVisible, setProgressDialogVisible] = useState(false);
  const [exportedFiles, setExportedFiles] = useState([]);

  const handleAttachmentPress = (attachment) => {
    const uri = Constants.attachmentPath + "/" + attachment;
    console.log(uri);
    Linking.openURL(uri);
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

  const allRequests = async () => {
    setProgressDialogVisible(true);
    const fromDate = route.params.fromDate;
    const toDate = route.params.toDate;
    const user = route.params.user;
    const status = route.params.status;
    const curUser = await Commons.getFromAS("userID");
    const reqs = await ServerOperations.getCheckInListHR(
      user,
      fromDate,
      toDate,
      status,
      curUser
    );
    setRequests(reqs);
    setProgressDialogVisible(false);
  };

  const exportToExcel = async () => {
    try {
      if (requests.length === 0) {
        Alert.alert(i18n.t("error"), "لا توجد بيانات للتصدير");
        return;
      }

      setProgressDialogVisible(true);

      // Prepare data for Excel
      const excelData = requests.map((item) => ({
        [i18n.t("empName") || "اسم الموظف"]: item.empName || "",
        [i18n.t("date") || "التاريخ"]: item.date || "",
        [i18n.t("location") || "الموقع"]: item.address || "",
        [i18n.t("timeIn") || "وقت الدخول"]: item.timeIn || "",
        [i18n.t("timeOut") || "وقت الخروج"]: item.timeOut || "",
        [i18n.t("vacation") || "اجازة"]: item.vac || "",
        [i18n.t("leave") || "مغادرة"]: item.leave || "",
        [i18n.t("absent") || "غياب"]: item.absent || "",
        [i18n.t("status") || "الحالة"]: item.notUpdated ? i18n.t("notUpdated") : i18n.t("updated") || "",
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Check Ins");

      // Generate Excel file
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileName = `CheckIns_${new Date().getTime()}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload file to server
      const file = {
        type: "*/*",
        uri: fileUri,
        name: fileName
      };
      console.log("Uploading file:", file);
      const res = await ServerOperations.pickUploadHttpRequest(file, 1);
      setProgressDialogVisible(false);

      console.log("Excel upload response:", JSON.stringify(res));

      if (res) {
        // Store the file in the exportedFiles array
        setExportedFiles(prev => [...prev, { name: fileName, type: "Excel" }]);
        Alert.alert("نجح", "تم حفظ الملف بنجاح");
      } else {
        Alert.alert("نجح", "تم حفظ الملف بنجاح");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      setProgressDialogVisible(false);
      Alert.alert(i18n.t("error"), "حدث خطأ أثناء التصدير");
    }
  };

  const exportToPDF = async () => {
    try {
      if (requests.length === 0) {
        Alert.alert(i18n.t("error"), "لا توجد بيانات للتصدير");
        return;
      }

      setProgressDialogVisible(true);

      // Create HTML content for PDF
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #A91B0D; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            h2 { text-align: center; color: #A91B0D; }
            .not-updated { color: #A91B0D; font-weight: bold; }
            .updated { color: #006400; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>تقرير بصمات الدوام</h2>
          <table>
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>التاريخ</th>
                <th>الموقع</th>
                <th>وقت الدخول</th>
                <th>وقت الخروج</th>
                <th>اجازة</th>
                <th>مغادرة</th>
                <th>غياب</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
      `;

      requests.forEach((item) => {
        const statusText = item.notUpdated ? i18n.t("notUpdated") : "";
        const statusClass = item.notUpdated ? "not-updated" : "updated";

        htmlContent += `
          <tr>
            <td>${item.empName || ""}</td>
            <td>${item.date || ""}</td>
            <td>${item.address || ""}</td>
            <td>${item.timeIn || ""}</td>
            <td>${item.timeOut || ""}</td>
            <td>${item.vac || ""}</td>
            <td>${item.leave || ""}</td>
            <td>${item.absent || ""}</td>
            <td class="${statusClass}">${statusText}</td>
          </tr>
        `;
      });

      htmlContent += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      const fileName = `CheckIns_${new Date().getTime()}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, htmlContent);

      // Upload file to server
      const file = {
        type: "*/*",
        uri: fileUri,
        name: fileName
      };

      const res = await ServerOperations.pickUploadHttpRequest(file, 1);
      setProgressDialogVisible(false);

      console.log("HTML upload response:", JSON.stringify(res));

      if (res) {
        // Store the file in the exportedFiles array
        setExportedFiles(prev => [...prev, { name: fileName, type: "PDF" }]);
        Alert.alert("نجح", "تم حفظ الملف بنجاح");
      } else {
        Alert.alert("نجح", "تم حفظ الملف بنجاح");
      }
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      setProgressDialogVisible(false);
      Alert.alert(i18n.t("error"), "حدث خطأ أثناء التصدير");
    }
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

      {/* Export Buttons */}
      <View style={styles.exportButtonsContainer}>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: "#006400" }]}
          onPress={exportToExcel}
        >
          <MaterialIcons name="table-chart" size={20} color="white" />
          <Text style={styles.exportButtonText}>تصدير Excel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: "#A91B0D" }]}
          onPress={exportToPDF}
        >
          <MaterialIcons name="picture-as-pdf" size={20} color="white" />
          <Text style={styles.exportButtonText}>تصدير PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Exported Files Links */}
      {exportedFiles.length > 0 && (
        <View style={styles.exportedFilesContainer}>
          <Text style={styles.exportedFilesTitle}>{i18n.t("exportedFiles")}:</Text>
          {exportedFiles.map((file, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleAttachmentPress(file.name)}
              style={styles.fileLink}
            >
              <MaterialIcons name="insert-drive-file" size={16} color="#006aff" />
              <Text style={styles.fileLinkText}>
                {file.type} - {new Date().toLocaleTimeString('ar-EG')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
      <FlatList
        keyExtractor={(item) => item.empNo + item.date}
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
                title={item.empName}
                titleStyle={styles.cardTitle}
              ></Card.Title>
              <Card.Content>
                {!!(item.submitDate !== "") ? (
                  <Text style={styles.textItemsStyle}>
                    {" "}
                    {i18n.t("date")} {":"} {item.date}{" "}
                  </Text>
                ) : null}

                {!!(item.address !== "" && item.address != null) ? (
                  <Text style={styles.textItemsStyle}>
                    {i18n.t("location")} {": "} {item.address}
                  </Text>
                ) : null}
                {!!(item.timeIn !== "") ? (
                  <Text style={styles.textItemsStyle}>
                    {" "}
                    {i18n.t("timeIn")} {":"} {item.timeIn}{" "}
                  </Text>
                ) : null}

                {!!(item.timeOut !== "") ? (
                  <Text style={styles.textItemsStyle}>
                    {" "}
                    {i18n.t("timeOut")} {":"} {item.timeOut}{" "}
                  </Text>
                ) : null}
                {!!(item.vac !== "") ? (
                  <Text style={{ marginLeft: 5, padding: 5 }}>
                    <Text style={styles.textItemsStyle}> {item.vac} </Text>
                  </Text>
                ) : null}

                {!!(item.leave !== "") ? (
                  <Text style={{ marginLeft: 5, padding: 5 }}>
                    <Text style={styles.textItemsStyle}> {item.leave} </Text>
                  </Text>
                ) : null}
                {!!(item.absent !== "") ? (
                  <Text style={{ marginLeft: 5, padding: 5 }}>
                    <Text style={styles.textItemsStyle}> {item.absent} </Text>
                  </Text>
                ) : null}
                {item.notUpdated === true ? (
                  <Text style={{ marginLeft: 5, padding: 5 }}>
                    <Text style={[styles.textItemsStyle, { color: "#A91B0D" }]}>
                      {i18n.t("notUpdated")}
                    </Text>
                  </Text>
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
    flex: 1,
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
  exportButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    elevation: 2,
  },
  exportButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 14,
  },
  exportedFilesContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    padding: 10,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  exportedFilesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    textAlign: "right",
  },
  fileLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 5,
  },
  fileLinkText: {
    color: "#006aff",
    fontSize: 14,
    textDecorationLine: "underline",
    marginLeft: 5,
    textAlign: "right",
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
});

//export default ViewRequestsHRScreen;
