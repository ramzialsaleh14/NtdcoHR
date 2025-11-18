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
} from "react-native";
import * as Commons from "../../utils/Commons";
import * as Constants from "../../utils/Constants";
import * as ServerOperations from "../../utils/ServerOperations";
import { Button, Card, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import i18n from "../../languages/langStrings";
import { AntDesign } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import ProgressDialog from "../../components/ProgressDialog";
TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

const AppButton = ({ onPress, title }) => (
  <TouchableOpacity onPress={onPress} style={styles.appButtonContainer}>
    <Text style={styles.appButtonText}>{title}</Text>
  </TouchableOpacity>
);

export default function ViewRequestsHRScreen({ route }) {
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

  const renderStatusList = (statusList) => {
    return statusList.map((status) => {
      if (status.includes("Denied"))
        return (
          <Text style={{ color: "#FF0000" }}>
            {" "}
            {status.replace("Denied", "مرفوض")}{" "}
          </Text>
        );
      if (status.includes("Pending"))
        return (
          <Text style={{ color: "#FFCD01" }}>
            {" "}
            {status.replace("Pending", "معلق")}{" "}
          </Text>
        );
      if (status.includes("Approved"))
        return (
          <Text style={{ color: "#00FF00" }}>
            {" "}
            {status.replace("Approved", "موافق عليه")}{" "}
          </Text>
        );
    });
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
      setOpenInfoModal(true);
      setProgressDialogVisible(false);
    } else {
      Commons.okAlert("لا يوجد رصيد اجازات لهذا الموظف");
    }
    setProgressDialogVisible(false);
  };

  const allRequests = async () => {
    const userID = await Commons.getFromAS("userID");
    const fromDate = route.params.fromDateKey;
    const toDate = route.params.toDateKey;
    const userNo = route.params.userNoKey;
    const status = route.params.statusKey;
    const reqs = await ServerOperations.getAllRequestsHR(
      userID,
      fromDate,
      toDate,
      userNo,
      status
    );
    setRequests(reqs);
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
        keyExtractor={(item) => item.id}
        data={requests}
        extraData={requests}
        renderItem={({ item }) => (
          <Pressable onPress={() => setLeavesInfo(item.user)}>
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
                  {!!(item.reqType !== " ") ? (
                    <Text style={styles.reqTypeStyle}> {item.reqType} </Text>
                  ) : null}
                  {!!(item.id != "" && item.id != null) ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("reqNo")} {": "} {item.id}
                    </Text>
                  ) : null}

                  {!!(item.user != "" && item.user != null) ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("user")} {": "} {item.user}
                    </Text>
                  ) : null}

                  {!!(item.fromDate !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("fromDate")} {":"} {item.fromDate}{" "}
                    </Text>
                  ) : null}

                  {!!(item.toDate !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("toDate")} {":"} {item.toDate}{" "}
                    </Text>
                  ) : null}

                  {!!(item.fromTime !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("from")} {item.fromTime}{" "}
                    </Text>
                  ) : null}

                  {!!(item.toTime !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("to")} {item.toTime}{" "}
                    </Text>
                  ) : null}

                  {!!(
                    item.attachments !== " " && item.attachments !== "undefined"
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
                  {!!(item.location !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("location")} {":"} {item.location}{" "}
                    </Text>
                  ) : null}
                  {!!(item.carNo !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("carNo")} {":"} {item.carNo}{" "}
                    </Text>
                  ) : null}

                  {!!(item.person !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("deceased")} {item.person}{" "}
                    </Text>
                  ) : null}

                  {!!(item.notes !== " ") ? (
                    <Text style={styles.textItemsStyle}>
                      {" "}
                      {i18n.t("notes")} {":"} {item.notes}{" "}
                    </Text>
                  ) : null}

                  {!!(item.respNotes !== "") ? (
                    <Text style={{ marginLeft: 5, padding: 5 }}>
                      <Text style={styles.textItemsStyle}>
                        {" "}
                        {item.respNotes}{" "}
                      </Text>
                    </Text>
                  ) : null}

                  {!!(item.status !== " ")
                    ? renderStatusList(item.status)
                    : null}
                </Card.Content>
              </Card>
            </View>
          </Pressable>
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
