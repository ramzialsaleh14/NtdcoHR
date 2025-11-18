import React from 'react';
import {
    Modal,
    View,
    ActivityIndicator,
    Text,
    StyleSheet,
    Platform,
    StatusBar,
} from 'react-native';

const ProgressDialog = ({
    visible = false,
    title = 'Loading...',
    message = '',
    cancelable = false,
    onCancel = () => { },
    indicatorColor = '#007AFF',
    indicatorSize = 'large',
    overlayColor = 'rgba(0, 0, 0, 0.5)',
    containerStyle = {},
    titleStyle = {},
    messageStyle = {}
}) => {
    if (!visible) {
        return null;
    }

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={cancelable ? onCancel : () => { }}
            statusBarTranslucent={Platform.OS === 'android'}
            hardwareAccelerated={Platform.OS === 'android'}
            presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
            supportedOrientations={['portrait', 'landscape']}
        >
            <StatusBar backgroundColor={overlayColor} barStyle="light-content" />
            <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
                <View style={[styles.container, containerStyle]}>
                    <ActivityIndicator
                        size={indicatorSize}
                        color={indicatorColor}
                        style={styles.indicator}
                        animating={true}
                    />
                    {title && (
                        <Text style={[styles.title, titleStyle]}>{title}</Text>
                    )}
                    {message && (
                        <Text style={[styles.message, messageStyle]}>{message}</Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999999,
            },
            android: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
            },
        }),
    },
    container: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 150,
        maxWidth: 280,
        ...Platform.select({
            ios: {
                zIndex: 1000000,
                shadowColor: '#000',
                shadowOffset: {
                    width: 0,
                    height: 4,
                },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                zIndex: 10000,
                elevation: 8,
            },
        }),
    },
    indicator: {
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
        ...Platform.select({
            ios: {
                fontFamily: 'System',
            },
        }),
    },
    message: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        ...Platform.select({
            ios: {
                fontFamily: 'System',
            },
        }),
    },
});

export default ProgressDialog;
