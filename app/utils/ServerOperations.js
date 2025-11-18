import { Platform } from "react-native";
import * as Constants from "./Constants";
import * as Commons from "./Commons";

const httpTimeout = (ms, promise) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("timeout"));
    }, ms);
    promise.then(resolve, reject);
  });

export const httpRequest = async (url) => {
  /* Send request */
  const TIMEOUT = 20000;

  const response = await httpTimeout(
    TIMEOUT,
    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }).catch((error) => {
      console.error(error);
      return Constants.networkError_code;
    })
  ).catch((error) => {
    return Constants.networkError_code;
  });
  const json = await response.json();
  return json;
};

export const ping = async (url, timeout) => {
  const response = await httpTimeout(
    timeout,
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "action=",
    })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error("HTTP response status not code 200 as expected.");
        }
      })
      .catch((error) => {
        console.error(error);
        return Constants.networkError_code;
      })
  ).catch((error) => {
    console.log(error);
    return Constants.networkError_code;
  });
  return response;
};

export const pickHttpRequest = async (params) => {
  /* Send request */
  params = params
    .replace(/١/g, 1)
    .replace(/٢/g, 2)
    .replace(/٣/g, 3)
    .replace(/٤/g, 4)
    .replace(/٥/g, 5)
    .replace(/٦/g, 6)
    .replace(/٧/g, 7)
    .replace(/٨/g, 8)
    .replace(/٩/g, 9)
    .replace(/٠/g, 0);
  const TIMEOUT = 20000;
  const user = await Commons.getFromAS("userID");
  const url = Constants.pickServerUrl + params + "&currentuser=" + user;

  console.log(url);

  try {
    const response = await httpTimeout(
      TIMEOUT,
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      })
    );

    // Check if response is valid
    if (!response) {
      console.error('Invalid response received');
      return Constants.networkError_code;
    }

    return response;
  } catch (error) {
    console.error('Network request failed:', error);
    return Constants.networkError_code;
  }
};

export const checkLogin = async (userID, password, appVersion) => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      /* Request params */
      let params = "";
      params += `action=${Constants.CHECK_LOGIN}`;
      params += `&USER=${userID}`;
      params += `&PASSWORD=${password}`;
      params += `&APP.VERSION=${appVersion}`;

      console.log('Login request params:', params);

      /* Send request */
      const response = await pickHttpRequest(params);

      /* Check response */
      if (response === Constants.networkError_code) {
        console.error('Network error during login, retry:', retryCount + 1);
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          continue;
        }
        console.error('Max retries reached, giving up');
        return null;
      }

      if (response && response.ok) {
        try {
          const jsonResult = await response.json();
          console.log('Login JSON result:', jsonResult);
          return jsonResult;
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          }
          return null;
        }
      }

      console.error('Login failed - response not ok:', response);
      // For non-network errors, don't retry
      return null;
    } catch (error) {
      console.error('Login request failed:', error);
      retryCount++;
      if (retryCount < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        continue;
      }
      return null;
    }
  }

  return null;
};

export const getEmpShift = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_EMP_SHIFT}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getNamesList = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_NAMES_LIST}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const pickUploadHttpRequest = async (file, retryNum) => {
  /* Send request */
  const TIMEOUT = 45000;
  const currServer = Constants.serverPublicBaseUrl;
  const url =
    "https://puresoft.ddns.net/pick/faces/redirect/NTDCOSERVICE?connector=ING.CONNECTOR";
  console.log(url);
  const body = new FormData();
  body.append("file", file);
  body.append("fname", file.name);
  body.append("fileupload", "y");
  body.append("action", "upload");
  const response = await httpTimeout(
    TIMEOUT,
    fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "multipart/form-data;",
      },
      body,
    }).catch((error) => {
      console.error(error);
      return Constants.networkError_code;
    })
  ).catch((error) => {
    console.log(error);
    return Constants.networkError_code;
  });
  console.log(JSON.stringify(response));
  if (response.ok !== true && retryNum < 4) {
    pickUploadHttpRequest(file, retryNum + 1);
  } else {
    if (response.ok !== true)
      Commons.okAlert("لم يتم الارسال", "الرجاء المحاولة مرة اخرى");
  }
  return response;
};

export const sendLeaveRequest = async (
  user,
  fromDate,
  toDate,
  fromTime,
  toTime,
  notes,
  reqType,
  fName,
  location,
  carNo,
  person
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SUBMIT_LEAVE_REQ}`;
  params += `&USER=${user}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&FROM.TIME=${fromTime}`;
  params += `&TO.TIME=${toTime}`;
  params += `&NOTES=${notes}`;
  params += `&REQUEST.TYPE=${reqType}`;
  params += `&FNAME=${fName}`;
  params += `&LOCATION=${location}`;
  params += `&CAR.NO=${carNo}`;
  params += `&PERSON=${person}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getAllRequests = async (userID, fromDate, toDate, user, status) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_ALL_REQUESTS}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&USER=${user}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getMyRequestsLeaves = async (userID, fromDate, toDate, status) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_MY_REQUESTS_LEAVES}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getMyRequestsLoans = async (userID, fromDate, toDate, status) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_MY_REQUESTS_LOANS}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getMyRequestsAdmin = async (userID, fromDate, toDate, status) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_MY_REQUESTS_ADMIN}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLoanRequests = async (userID, fromDate, toDate) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LOAN_REQUESTS}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getAdminRequests = async (userID, fromDate, toDate) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_ADMIN_REQUESTS}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const submitLoan = async (
  user,
  loanAmount,
  numOfPayments,
  paymentAmount,
  notes,
  attachments
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SUBMIT_LOAN}`;
  params += `&USER=${user}`;
  params += `&LOAN.AMOUNT=${loanAmount}`;
  params += `&NUM.OF.PAYMENTS=${numOfPayments}`;
  params += `&PAYMENT.AMOUNT=${paymentAmount}`;
  params += `&NOTES=${notes}`;
  params += `&ATTACHMENTS=${attachments}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const submitAdminReq = async (user, reqType, notes, attachments) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SUBMIT_ADMIN_REQ}`;
  params += `&USER=${user}`;
  params += `&REQTYPE=${reqType}`;
  params += `&NOTES=${notes}`;
  params += `&ATTACHMENTS=${attachments}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLocationDistance = async (location, user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LOCATION_DISTANCE}`;
  params += `&LOCATION=${location}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const respondToRequest = async (userID, resp, reqID, respNotes) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.RESPOND_TO_REQUEST}`;
  params += `&USER=${userID}`;
  params += `&RESPONSE=${resp}`;
  params += `&REQID=${reqID}`;
  params += `&RESP.NOTES=${respNotes}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getAdminReqTypes = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_ADMIN_REQ_TYPES}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const respondToLoanRequest = async (userID, resp, reqID, respNotes) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.RESPOND_TO_LOAN_REQUEST}`;
  params += `&USER=${userID}`;
  params += `&RESPONSE=${resp}`;
  params += `&REQID=${reqID}`;
  params += `&RESP.NOTES=${respNotes}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const respondToAdminRequest = async (
  userID,
  resp,
  reqID,
  respNotes,
  attachment
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.RESPOND_TO_ADMIN_REQUEST}`;
  params += `&USER=${userID}`;
  params += `&RESPONSE=${resp}`;
  params += `&REQID=${reqID}`;
  params += `&RESP.NOTES=${respNotes}`;
  params += `&ATTACHMENT=${attachment}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getAllRequestsHR = async (
  userID,
  fromDate,
  toDate,
  userNo,
  status
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_ALL_REQUESTS_HR}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&USER.NO=${userNo}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLoansRequestsHR = async (
  userID,
  fromDate,
  toDate,
  userNo,
  status
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LOAN_REQUESTS_HR}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&USER.NO=${userNo}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getAdminRequestsHR = async (
  userID,
  fromDate,
  toDate,
  userNo,
  status
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_ADMIN_REQUESTS_HR}`;
  params += `&CUR.USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&USER.NO=${userNo}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getCheckInListHR = async (userID, fromDate, toDate, status, curUser) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_CHECK_IN_LIST_HR}`;
  params += `&USER=${userID}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&STATUS=${status}`;
  params += `&CUR.USER=${curUser}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getAllAnnouncements = async (fromDate, toDate) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_ANNOUNCEMENTS}`;
  params += `&FDATE=${fromDate}`;
  params += `&TDATE=${toDate}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const submitAnnoucement = async (title, desc, pdf) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SUBMIT_ANNOUNCEMENT}`;
  params += `&TITLE=${title}`;
  params += `&DESC=${desc}`;
  params += `&PDF=${pdf}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const sendUserToken = async (user, token, devId) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SEND_USER_TOKEN}`;
  params += `&USER=${user}`;
  params += `&TOKEN=${token}`;
  params += `&DEVID=${devId}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLeavesInfo = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LEAVES_INFO}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const submitAppleUser = async (user, password) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SUBMIT_APPLE_USER}`;
  params += `&USER=${user}`;
  params += `&PASSWORD=${password}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLocations = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LOCATIONS}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const checkInOrOut = async (
  user,
  date,
  time,
  location,
  address,
  type,
  leaveType,
  userToken
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.CHECK_IN_OR_OUT}`;
  params += `&USER=${user}`;
  params += `&DATE=${date}`;
  params += `&TIME=${time}`;
  params += `&LOCATION=${location}`;
  params += `&ADDRESS=${address}`;
  params += `&TYPE=${type}`;
  params += `&LEAVE.TYPE=${leaveType}`;
  params += `&TOKEN=${userToken}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const breakStart = async (user, date, fTime, tTime) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.BREAK_START}`;
  params += `&USER=${user}`;
  params += `&DATE=${date}`;
  params += `&FROM.TIME=${fTime}`;
  params += `&TO.TIME=${tTime}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const breakEnd = async (user, date, time) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.BREAK_END}`;
  params += `&USER=${user}`;
  params += `&DATE=${date}`;
  params += `&TIME=${time}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const CheckIsChecked = async (user, date, type) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.CHECK_IS_CHECKED}`;
  params += `&USER=${user}`;
  params += `&DATE=${date}`;
  params += `&TYPE=${type}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getCheckedInLocation = async (user, date) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_CHECKED_IN_LOCATION}`;
  params += `&USER=${user}`;
  params += `&DATE=${date}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getServerToken = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_SERVER_TOKEN}`;
  params += `&USER=${user}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLeaveTypes = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LEAVE_TYPES}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getServerCurTime = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_SERVER_CUR_TIME}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const clearUserDeviceID = async (userNo) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.CLEAR_USER_DEVICE_ID}`;
  params += `&USER=${userNo}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const changePassword = async (userNo, password) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.CHANGE_PASSWORD}`;
  params += `&USER=${userNo}`;
  params += `&PASSWORD=${password}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};
