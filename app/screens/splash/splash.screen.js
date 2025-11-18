import React, { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import * as Constants from "../../utils/Constants";
import {
    SafeAreaView,
    View,
    Image,
    StyleSheet,
    Text,
} from "react-native";

export default function SplashScreen() {
    const navigation = useNavigation();

    useEffect(() => {
        // Navigate to login after 1 second
        const timer = setTimeout(() => {
            navigation.replace("Login");
        }, 1000);

        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Image style={styles.logo} source={require("../login/logo.png")} />
                <Text style={styles.version}>{Constants.appVersion}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    logo: {
        width: 200,
        height: 244,
        marginBottom: 20,
    },
    version: {
        position: "absolute",
        bottom: 50,
        alignSelf: "center",
        color: "#666",
        fontSize: 14,
        textAlign: "center",
        minWidth: 60,
        width: "auto",
    },
});
