import * as Localization from "expo-localization";
import i18n from "i18n-js";
import en from "./en";
import ar from "./ar";
import * as Commons from "../utils/Commons";
//i18n.locale = Localization.locale.split("-")[0];
i18n.fallbacks = true;
i18n.translations = {
  en,
  ar,
};

export default i18n;
