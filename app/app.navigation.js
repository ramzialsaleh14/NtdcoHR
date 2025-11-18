import React from "react";
import { Image, TouchableOpacity } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import SplashScreen from "./screens/splash/splash.screen";
import LoginScreen from "./screens/login/login.screen";
import MainScreen from "./screens/mainScreen/main.screen";
import TakeALeaveScreen from "./screens/TakeALeaveScreen/take.a.leave";
import TakeALoanScreen from "./screens/TakeALoanScreen/take.a.loan";
import ViewRequestsScreen from "./screens/viewRequests/ViewRequestsScreen";
import ViewRequestsLoansScreen from "./screens/viewRequests/ViewRequestsLoansScreen";
import ViewRequestsHRScreen from "./screens/viewRequestsHR/ViewRequestsHRScreen";
import AnnouncementScreen from "./screens/AnnouncementScreen/Announcements";
import i18n from "./languages/langStrings";
import AdminRequestsScreen from "./screens/AdminRequests/AdminRequestsScreen";
import ViewRequestsAdminScreen from "./screens/viewRequests/ViewRequestsAdminScreen";
import ViewLoansHRScreen from "./screens/viewRequestsHR/ViewLoansHRScreen";
import ViewAdminHRScreen from "./screens/viewRequestsHR/ViewAdminHRScreen";
import MyRequestsLeaves from "./screens/MyRequests/MyRequestsLeaves";
import MyRequestsLoans from "./screens/MyRequests/MyRequestsLoans";
import MyRequestsAdmin from "./screens/MyRequests/MyRequestsAdmin";
import ViewCheckInsHrScreen from "./screens/viewRequestsHR/ViewCheckInsHRScreen";

const { Navigator, Screen } = createStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Navigator initialRouteName="Login">
      <Screen
        options={{
          headerShown: false,
        }}
        name="Splash"
        component={SplashScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: false,
        }}
        name="Login"
        component={LoginScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: false,
        }}
        name="Main"
        component={MainScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("leaves")}
        component={TakeALeaveScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("loans")}
        component={TakeALoanScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("adminRequestScreen")}
        component={AdminRequestsScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("requests")}
        component={ViewRequestsScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("viewCheckInsHR")}
        component={ViewCheckInsHrScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("loanRequests")}
        component={ViewRequestsLoansScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("adminRequests")}
        component={ViewRequestsAdminScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("requestsHR")}
        component={ViewRequestsHRScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("loansHR")}
        component={ViewLoansHRScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("adminHR")}
        component={ViewAdminHRScreen}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("myLoans")}
        component={MyRequestsLoans}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("myAdminReqs")}
        component={MyRequestsAdmin}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("myLeaves")}
        component={MyRequestsLeaves}
      ></Screen>
      <Screen
        options={{
          headerShown: true,
        }}
        name={i18n.t("announcementsScreen")}
        component={AnnouncementScreen}
      ></Screen>
    </Navigator>
  </NavigationContainer>
);

export default AppNavigator;
