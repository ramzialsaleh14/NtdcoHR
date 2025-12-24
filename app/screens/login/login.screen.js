import React, { useState, useEffect } from "react";

import { useNavigation } from "@react-navigation/native";
import * as ServerOperations from "../../utils/ServerOperations";
import * as Commons from "../../utils/Commons";
import * as Constants from "../../utils/Constants";
import {
  SafeAreaView,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  TextInput,
  Button,
} from "react-native";
import i18n from "../../languages/langStrings";

TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

export default function LoginScreen() {
  const navigation = useNavigation();
  const [userNo, onChangeUser] = useState("");
  const [password, onChangePassword] = useState("");
  const [userNoStorage, setUserNoStorage] = useState("");
  const [passwordStorage, setPasswordStorage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get login info from storage
  const getLoginInfo = async () => {
    try {
      const userFromStorage = await Commons.getFromAS("userID");
      const passFromStorage = await Commons.getFromAS("password");

      if (userFromStorage && passFromStorage) {
        setUserNoStorage(userFromStorage);
        setPasswordStorage(passFromStorage);
        onChangeUser(userFromStorage);
        onChangePassword(passFromStorage);
      }
    } catch (error) {
      console.error("Error loading credentials:", error);
    }
  };

  // Load credentials on mount
  useEffect(() => {
    getLoginInfo();
  }, []);

  // Auto-login effect when storage credentials are loaded
  useEffect(() => {
    if (userNoStorage && passwordStorage) {
      const autoLogin = async () => {
        try {
          const resp = await ServerOperations.checkLogin(userNoStorage, passwordStorage, Constants.appVersion);
          if (resp && resp.result === true) {
            await Commons.saveToAS("userID", userNoStorage);
            await Commons.saveToAS("password", passwordStorage);
            await Commons.saveToAS("curName", resp.name);
            await Commons.saveToAS("isHr", resp.isHr);
            const isHr = resp.isHr === "Y";
            const isManager = resp.isManager === true || resp.isManager === "true";
            navigation.navigate("Main", { isHr, isManager });
          } else if (!resp) {
            // Network error during auto-login - silently fail, user can manually retry
            console.log("Auto-login failed: No response from server");
          }
        } catch (error) {
          console.error("Auto-login error:", error);
          // Silently fail auto-login network errors - user can manually retry
        }
      };
      autoLogin();
    }
  }, [userNoStorage, passwordStorage, navigation]);

  const onLoginClick = async () => {
    if (isLoading) return; // Prevent multiple clicks

    setIsLoading(true);

    try {
      const resp = await ServerOperations.checkLogin(userNo, password, Constants.appVersion);

      if (!resp) {
        // No result returned - network error
        Commons.okAlert("خطأ في الاتصال", "لم يتم الارسال,يرجى التحقق من الشبكة والمحاولة مرة اخرى");
      } else if (resp.result === true) {
        // Save data first
        await Commons.saveToAS("userID", userNo);
        await Commons.saveToAS("password", password);
        await Commons.saveToAS("curName", resp.name);

        const isHr = resp.isHr === "Y";
        const isManager = resp.isManager === true || resp.isManager === "true";
        navigation.navigate("Main", { isHr, isManager });
      } else {
        const msg = resp?.msg || "رقم الموظف او كلمة المرور غير صحيحين";
        Commons.okAlert("", msg);
      }
    } catch (error) {
      console.error("Login error:", error);
      Commons.okAlert("خطأ في الاتصال", "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.cardContainer}>
      <Text style={styles.versionText}>
        {Constants.appVersion}
      </Text>

      <View style={styles.viewContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t("loginTitle")}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{i18n.t("user")}</Text>
            <TextInput
              value={userNo}
              onChangeText={onChangeUser}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{i18n.t("password")}</Text>
            <TextInput
              secureTextEntry={true}
              value={password}
              onChangeText={onChangePassword}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.loginButtonContainer}>
            <Button
              title={isLoading ? "جاري تسجيل الدخول..." : i18n.t("login")}
              onPress={onLoginClick}
              color="#A91B0D"
              disabled={isLoading}
            />
          </View>
        </View>
        <Image style={styles.image} source={require("./logo.png")} />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  viewContainer: {
    width: "80%",
    marginTop: 80,
  },
  cardContainer: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    color: "#A91B0D",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: "#A91B0D",
    marginBottom: 5,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  textInputFocused: {
    borderColor: "#A91B0D",
    borderWidth: 2,
  },
  versionText: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    minWidth: 60,
    width: "auto",
  },
  loginButtonContainer: {
    marginTop: 20,
    width: "100%",
  },
  image: {
    width: 160,
    height: 195,
    margin: 45,
    marginTop: 40,
    alignSelf: "center",
  },
  appButtonContainer: {
    backgroundColor: "#FF0000",
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 15,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  appButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingOverlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 15,
  },
});
