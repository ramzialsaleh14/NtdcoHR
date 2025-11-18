import { I18nManager } from "react-native";
import * as Commons from "./Commons";
import * as Constants from "./Constants";

let STRINGS = { ok: "", user: "", password: "", login: "" };

export const loadStrings = async () => {
  // const language = await Commons.getFromAS(Constants.language);
  // let { locale } = await Localization.getLocalizationAsync();
  // console.log(locale);
  // if (locale !== "ar" && locale !== "en") {
  //   locale = "en";
  // }
  // locale = language == null ? locale : language;
  const locale = await Commons.language();

  const isArLtrOrEnRtl =
    (!I18nManager.isRTL && locale.startsWith("ar")) ||
    (I18nManager.isRTL && !locale.startsWith("ar"));
  if (locale.startsWith("en")) {
    STRINGS = {
      ok: "OK",
      user: "User",
      password: "Password",
      login: "Login",
    };
  } else {
    STRINGS = {
      ok: "موافق",
      user: "رقم الموظف",
      password: "كلمة المرور",
      login: "دخول",
    };
  }
  return STRINGS;
};

//export STRINGS;
