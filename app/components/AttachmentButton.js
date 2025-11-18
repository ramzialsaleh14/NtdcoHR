import React from "react";
import { TouchableOpacity, Text } from "react-native";

TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

// Custom Button component for better reliability in APK builds
const AttachmentButton = ({ onPress, title, style, mode, color, icon, children }) => {
  const isOutlined = mode === "outlined";
  const backgroundColor = color || (isOutlined ? "transparent" : "rgb(1,135,134)");
  const textColor = isOutlined ? (color || "rgb(1,135,134)") : "#fff";
  const borderColor = color || "rgb(1,135,134)";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor,
          borderWidth: isOutlined ? 1 : 0,
          borderColor,
          borderRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginVertical: 4,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      {icon && <Text style={{ color: textColor, marginRight: 8 }}>{icon}</Text>}
      <Text style={{ color: textColor, fontSize: 16, fontWeight: "500" }}>
        {title || children}
      </Text>
    </TouchableOpacity>
  );
};

export default AttachmentButton;
