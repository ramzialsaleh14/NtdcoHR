import { Platform } from "react-native";
// Urls
// ********* DON'T FORGET TO UPDATE VERSION ON WEBSERVICE *********
export const appVersion = "v1.8.5"; // ********* DON'T FORGET TO UPDATE VERSION ON WEBSERVICE *********
// ********* DON'T FORGET TO UPDATE VERSION ON WEBSERVICE *********
export const serverBaseUrl = "http://ntdco.ddns.net";
//export const serverBaseUrl = "http://192.168.1.231:8080";
export const serverPublicBaseUrl = "http://ntdco.ddns.net";
//export const serverPublicBaseUrl = "http://192.168.1.231:8080";
export const pickServerUrl =
  serverBaseUrl +
  "/pick/faces/redirect?item_id=HR.WEBSERVICE&input_id=1&service=y&appversion=" +
  appVersion +
  "&";
export const pickPublicServerUrl =
  serverPublicBaseUrl +
  "/pick/faces/redirect?item_id=HR.WEBSERVICE&input_id=1&service=y&appversion=" +
  appVersion +
  "&";

export const attachmentPath =
  serverPublicBaseUrl + "/pick/faces/attachments/HRapp";
export const CURRENT_SERVER = "CURRENT_SERVER";
export const CURRENT_SERVER_IP = "CURRENT_SERVER_IP";
export const greenColor = "#6BA561";
export const darkBlueColor = "#386280";
// User
export const cur_user = "cur.user";

// Codes
export const networkError_code = 100;

// Actions
export const SUBMIT_LEAVE_REQ = "SUBMIT.LEAVE.REQ";
export const CHECK_LOGIN = "CHECK.LOGIN";
export const UPLOAD = "UPLOAD";
export const GET_ALL_REQUESTS = "GET.ALL.REQUESTS";
export const GET_LOAN_REQUESTS = "GET.LOAN.REQUESTS";
export const GET_ADMIN_REQUESTS = "GET.ADMIN.REQUESTS";
export const GET_ALL_REQUESTS_HR = "GET.ALL.REQUESTS.HR";
export const GET_LOAN_REQUESTS_HR = "GET.LOAN.REQUESTS.HR";
export const GET_ADMIN_REQUESTS_HR = "GET.ADMIN.REQUESTS.HR";
export const GET_CHECK_IN_LIST_HR = "GET.CHECK.IN.LIST.HR";
export const GET_MY_REQUESTS_LEAVES = "GET.MY.REQUESTS.LEAVES";
export const GET_MY_REQUESTS_LOANS = "GET.MY.REQUESTS.LOANS";
export const GET_MY_REQUESTS_ADMIN = "GET.MY.REQUESTS.ADMIN";
export const RESPOND_TO_REQUEST = "RESPOND.TO.REQUEST";
export const RESPOND_TO_LOAN_REQUEST = "RESPOND.TO.LOAN.REQUEST";
export const RESPOND_TO_ADMIN_REQUEST = "RESPOND.TO.ADMIN.REQUEST";
export const SUBMIT_ANNOUNCEMENT = "SUBMIT.ANNOUNCEMENT";
export const GET_ANNOUNCEMENTS = "GET.ANNOUNCEMENTS";
export const SEND_USER_TOKEN = "SEND.USER.TOKEN";
export const GET_LEAVES_INFO = "GET.LEAVES.INFO";
export const SUBMIT_APPLE_USER = "SUBMIT.APPLE.USER";
export const GET_LOCATIONS = "GET.LOCATIONS";
export const CHECK_IN_OR_OUT = "CHECK.IN.OR.OUT";
export const BREAK_START = "BREAK.START";
export const BREAK_END = "BREAK.END";
export const CHECK_IS_CHECKED = "CHECK.IS.CHECKED";
export const GET_CHECKED_IN_LOCATION = "GET.CHECKED.IN.LOCATION";
export const GET_SERVER_CUR_TIME = "GET.SERVER.CUR.TIME";
export const CLEAR_USER_DEVICE_ID = "CLEAR.USER.DEVICE.ID";
export const GET_LEAVE_TYPES = "GET.LEAVE.TYPES";
export const GET_SERVER_TOKEN = "GET.SERVER.TOKEN";
export const GET_LOCATION_DISTANCE = "GET.LOCATION.DISTANCE";
export const SUBMIT_LOAN = "SUBMIT.LOAN";
export const SUBMIT_ADMIN_REQ = "SUBMIT.ADMIN.REQ";
export const GET_ADMIN_REQ_TYPES = "GET.ADMIN.REQ.TYPES";
export const GET_NAMES_LIST = "GET.NAMES.LIST";
export const CHANGE_PASSWORD = "CHANGE.PASSWORD";
export const GET_EMP_SHIFT = "GET.EMP.SHIFT";
