import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Image, ActivityIndicator, Platform, InteractionManager } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
//import { useAudioRecorder, RecordingOptions, AudioModule, RecordingPresets } from 'expo-audio';
import i18n from "../languages/langStrings";
import * as Constants from "../utils/Constants";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ServerOperations from "../utils/ServerOperations";

const AttachmentPicker = ({ onAttachmentSelected }) => {
    const [attachment, setAttachment] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    //const [audio, setAudio] = useState(null);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [imageUri, setImageUri] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isPickerActive, setIsPickerActive] = useState(false); // Prevent multiple picker calls
    const [activePickerType, setActivePickerType] = useState(null); // Track which picker is active: 'camera', 'image', 'file'

    // Minimal, animation-aware wait after closing the modal to avoid race conditions without adding noticeable delay
    const waitForModalClose = async () => {
        // Wait for ongoing animations/interactions to finish
        await new Promise(resolve => InteractionManager.runAfterInteractions(resolve));
        // Small iOS buffer to ensure presentation transition is done
        if (Platform.OS === 'ios') {
            await new Promise(resolve => setTimeout(resolve, 120));
        }
    };

    // Helper function to check and request permissions properly on iOS
    const checkAndRequestPermission = async (permissionType) => {
        try {
            let permissionResult;

            switch (permissionType) {
                case 'camera':
                    // First check current permission status
                    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
                    if (cameraStatus.status !== 'granted') {
                        // Request permission if not granted
                        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                    } else {
                        permissionResult = cameraStatus;
                    }
                    break;
                case 'mediaLibrary':
                    // First check current permission status
                    const libraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
                    if (libraryStatus.status !== 'granted') {
                        // Request permission if not granted
                        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    } else {
                        permissionResult = libraryStatus;
                    }
                    break;
                default:
                    throw new Error(`Unknown permission type: ${permissionType}`);
            }

            console.log(`Permission check for ${permissionType}:`, permissionResult);

            if (permissionResult.status === 'granted') {
                return true;
            } else {
                Alert.alert("Permission Required", `Permission to access ${permissionType} is required!`);
                return false;
            }
        } catch (error) {
            console.error(`Error requesting ${permissionType} permission:`, error);
            Alert.alert("Permission Error", `Failed to request ${permissionType} permission: ${error.message}`);
            return false;
        }
    };

    // Initialize permissions; pre-warm media/gallery permissions for snappier UX
    useEffect(() => {
        const initializeAsync = async () => {
            try {
                // Pre-request media library permission to avoid delay on first open
                try {
                    const libPerm = await ImagePicker.getMediaLibraryPermissionsAsync();
                    if (libPerm.status !== 'granted') {
                        await ImagePicker.requestMediaLibraryPermissionsAsync();
                    }
                } catch (e) {
                    console.warn('Media library permission check failed', e);
                }

                // Pre-warm camera permission state (no-op if already granted)
                try {
                    const camPerm = await ImagePicker.getCameraPermissionsAsync?.();
                    if (!camPerm || camPerm.status !== 'granted') {
                        await ImagePicker.requestCameraPermissionsAsync();
                    }
                } catch (e) {
                    console.warn('Camera permission check failed', e);
                }
            } catch (error) {
                console.warn('Initialization failed:', error);
            }
        };

        initializeAsync();
    }, []);

    // Add this function after your existing functions
    const takePicture = async () => {
        console.log('takePicture: Starting camera capture');

        // Prevent multiple simultaneous picker calls
        if (isPickerActive) {
            console.log('takePicture: Picker already active, ignoring call');
            return;
        }

        setIsPickerActive(true);
        setActivePickerType('camera');

        try {
            // Close modal and wait for animation to settle (fast, interaction-aware)
            setMenuVisible(false);
            console.log('takePicture: Waiting for modal to close...');
            await waitForModalClose();

            // Additional wait for iOS
            if (Platform.OS === 'ios') {
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log('takePicture: Additional iOS wait completed');
            }

            console.log('takePicture: Requesting camera permissions');
            // Use direct permission request
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            console.log('takePicture: Permission result:', permissionResult);

            if (permissionResult.status !== 'granted') {
                Alert.alert("Permission Required", "Camera access is required to take photos.");
                return;
            }

            console.log('takePicture: Camera permission granted, proceeding...');

            console.log('takePicture: Launching camera');

            // Try with minimal configuration first
            let result;
            try {
                console.log('takePicture: About to call launchCameraAsync...');

                // Add a timeout to detect if it's hanging
                const cameraPromise = ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                });

                const timeoutPromise = new Promise((resolve) => {
                    setTimeout(() => {
                        console.warn('takePicture: Camera launch timeout after 10 seconds');
                        resolve({ canceled: true, timeout: true });
                    }, 10000);
                });

                result = await Promise.race([cameraPromise, timeoutPromise]);

                if (result.timeout) {
                    Alert.alert("Timeout", "Camera launch timed out. This might be an iOS permission or configuration issue.");
                    return;
                }

                console.log('takePicture: launchCameraAsync returned');
                console.log('takePicture: Camera result:', result);
            } catch (cameraError) {
                console.error('takePicture: Camera launch error:', cameraError);
                Alert.alert("Camera Error", `Failed to launch camera: ${cameraError.message}`);
                return;
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // NOW show upload dialog since user took a photo
                setIsUploading(true);

                const asset = result.assets[0];
                console.log('takePicture: Processing asset:', asset);

                // Generate filename like in the working code
                const originalName = asset.fileName || "camera_photo.jpg";
                const dotIndex = originalName.lastIndexOf(".");
                const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : ".jpg";
                const generatedName = Date.now() + extension;

                const file = {
                    type: "image/*",
                    uri: asset.uri,
                    name: generatedName
                };
                setAttachment(file);

                console.log('takePicture: Uploading file:', file);
                const res = await ServerOperations.pickUploadHttpRequest(file, 1);
                console.log('takePicture: Upload result:', res);

                if (res && res.URL && res.URL !== "") {
                    onAttachmentSelected(res.URL);
                } else {
                    // Fallback to generated name if no URL returned
                    console.warn('takePicture: Upload returned empty URL, using generated name');
                    onAttachmentSelected(generatedName);
                }
            } else {
                console.log('takePicture: Camera was canceled or no assets');
            }
        } catch (error) {
            console.error("takePicture: Error:", error);
            Alert.alert("Error", `Failed to take picture: ${error.message}. Please try again.`);
        } finally {
            setIsUploading(false);
            setIsPickerActive(false);
            setActivePickerType(null);
        }
    };
    // Initialize audio recorder with high quality preset
    //const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    // Request recording permissions on component mount
    // useEffect(() => {
    //     (async () => {
    //         const status = await AudioModule.requestRecordingPermissionsAsync();
    //         if (!status.granted) {
    //             Alert.alert('Permission Required', 'Permission to access microphone was denied');
    //         }
    //     })();
    // }, []);

    // Start audio recording
    // const startRecording = async () => {
    //     try {
    //         // Check permission first
    //         const status = await AudioModule.requestRecordingPermissionsAsync();
    //         if (!status.granted) {
    //             Alert.alert("Permission Required", "Permission to access the microphone is required!");
    //             return;
    //         }

    //         // Prepare and start recording
    //         await audioRecorder.prepareToRecordAsync();
    //         audioRecorder.record();
    //         setIsRecording(true);
    //     } catch (error) {
    //         console.error("Failed to start recording", error);
    //         Alert.alert("Recording Error", "Failed to start recording. Please try again.");
    //     }
    // };

    // Stop audio recording
    // const stopRecording = async () => {
    //     try {
    //         if (!isRecording) {
    //             return;
    //         }

    //         // Stop recording - the recording will be available on audioRecorder.uri
    //         await audioRecorder.stop();
    //         setIsRecording(false);

    //         // Get the recorded file URI
    //         const uri = audioRecorder.uri;

    //         if (uri) {
    //             // Use more specific MIME type for audio
    //             const file = { type: "audio/m4a", uri, name: "recording.m4a" };
    //             setAttachment(file);

    //             const res = await ServerOperations.pickUploadHttpRequest(file);
    //             if (res.URL != null && res.URL != "") {
    //                 onAttachmentSelected(res.URL);
    //             }
    //         }

    //         setMenuVisible(false);
    //     } catch (error) {
    //         console.error("Failed to stop recording", error);
    //         Alert.alert("Recording Error", "Failed to stop recording. Please try again.");
    //         setIsRecording(false);
    //     }
    // };

    // Function to play audio with proper cleanup
    // const playAudio = async () => {
    //     try {
    //         if (audio) {
    //             await audio.unloadAsync();
    //             setAudio(null);
    //             return;
    //         }

    //         // Use AudioModule to create and play sound
    //         const { sound } = await AudioModule.Sound.createAsync(
    //             { uri: attachment.uri },
    //             { shouldPlay: true }
    //         );

    //         setAudio(sound);

    //         // Set up playback status listener for cleanup
    //         sound.setOnPlaybackStatusUpdate((status) => {
    //             if (status.didJustFinish) {
    //                 sound.unloadAsync();
    //                 setAudio(null);
    //             }
    //         });
    //     } catch (error) {
    //         console.error("Failed to play audio", error);
    //         Alert.alert("Playback Error", "Failed to play audio file.");
    //     }
    // };

    // Cleanup function when component unmounts
    // useEffect(() => {
    //     return () => {
    //         if (audio) {
    //             audio.unloadAsync();
    //         }
    //         if (isRecording) {
    //             audioRecorder.stop();
    //         }
    //     };
    // }, [audio, isRecording]);

    // Function to pick an image
    const pickImage = async () => {
        console.log('pickImage: Starting image selection, isPickerActive:', isPickerActive, 'activePickerType:', activePickerType);

        // Prevent multiple simultaneous picker calls
        if (isPickerActive) {
            console.log('pickImage: Picker already active, ignoring call. Active type:', activePickerType);
            return;
        }

        setIsPickerActive(true);
        setActivePickerType('image');

        try {
            // Close modal and wait for animation to settle (fast, interaction-aware)
            setMenuVisible(false);
            console.log('pickImage: Waiting for modal to close...');
            await waitForModalClose();

            // Additional wait for iOS like the working camera function
            if (Platform.OS === 'ios') {
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log('pickImage: Additional iOS wait completed');
            }

            console.log('pickImage: Requesting media library permissions');
            // Use direct permission request
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Required", "Photo library access is required to select images.");
                return;
            }

            console.log('pickImage: Launching image library with iOS-optimized config');

            // Add timeout detection like the working camera function
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.warn('pickImage: Image picker timeout after 10 seconds');
                    resolve({ canceled: true, timeout: true });
                }, 10000);
            });

            const pickerPromise = ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
                base64: false,
                exif: false,
                allowsMultipleSelection: false,
            });

            console.log('pickImage: Waiting for image picker response...');
            const result = await Promise.race([pickerPromise, timeoutPromise]);

            if (result.timeout) {
                Alert.alert("Timeout", "Image picker timed out. This might be an iOS permission or configuration issue.");
                return;
            }

            console.log('pickImage: Image picker result:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // NOW show upload dialog since user selected an image
                setIsUploading(true);

                const asset = result.assets[0];
                console.log('pickImage: Processing asset:', asset);

                // Generate filename like in the working code
                const originalName = asset.fileName || "image.jpg";
                const dotIndex = originalName.lastIndexOf(".");
                const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : ".jpg";
                const generatedName = Date.now() + extension;

                const file = {
                    type: "image/*",
                    uri: asset.uri,
                    name: generatedName
                };
                setAttachment(file);

                console.log('pickImage: Uploading file:', file);
                const res = await ServerOperations.pickUploadHttpRequest(file, 1);
                console.log('pickImage: Upload result:', res);

                if (res && res.URL && res.URL !== "") {
                    onAttachmentSelected(res.URL);
                } else {
                    // Fallback to generated name if no URL returned
                    console.warn('pickImage: Upload returned empty URL, using generated name');
                    onAttachmentSelected(generatedName);
                }
            } else {
                console.log('pickImage: Image selection was canceled or no assets');
            }
        } catch (error) {
            console.error("pickImage: Error:", error);
            Alert.alert("Error", `Failed to pick image: ${error.message}. Please try again.`);
        } finally {
            console.log('pickImage: Setting picker active to false');
            setIsUploading(false);
            setIsPickerActive(false);
            setActivePickerType(null);
        }
    };

    // Function to pick a file
    const pickFile = async () => {
        console.log('pickFile: Starting file selection, isPickerActive:', isPickerActive, 'activePickerType:', activePickerType);

        // Prevent multiple simultaneous picker calls
        if (isPickerActive) {
            console.log('pickFile: Picker already active, ignoring call. Active type:', activePickerType);
            return;
        }

        setIsPickerActive(true);
        setActivePickerType('file');

        try {
            // Close modal and wait for animation to settle (fast, interaction-aware)
            setMenuVisible(false);
            console.log('pickFile: Waiting for modal to close...');
            await waitForModalClose();

            // Additional wait for iOS like the working camera function
            if (Platform.OS === 'ios') {
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log('pickFile: Additional iOS wait completed');
            }

            console.log('pickFile: Launching document picker with iOS-optimized config');

            // Add timeout detection like the working camera function
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.warn('pickFile: Document picker timeout after 10 seconds');
                    resolve({ canceled: true, timeout: true });
                }, 10000);
            });

            const pickerPromise = DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
                multiple: false,
                presentationStyle: 'fullScreen',
            });

            console.log('pickFile: Waiting for document picker response...');
            const result = await Promise.race([pickerPromise, timeoutPromise]);

            if (result.timeout) {
                Alert.alert("Timeout", "Document picker timed out. This might be an iOS permission or configuration issue.");
                return;
            }

            console.log('pickFile: Document picker result:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // NOW show upload dialog since user selected a file
                setIsUploading(true);

                const asset = result.assets[0];
                console.log('pickFile: Processing asset:', asset);

                // Generate filename like in the working code
                const originalName = asset.name || "file";
                const dotIndex = originalName.lastIndexOf(".");
                const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : "";
                const generatedName = Date.now() + extension;

                const file = {
                    type: asset.mimeType || "application/octet-stream",
                    uri: asset.uri,
                    name: generatedName
                };
                setAttachment(file);

                console.log('pickFile: Uploading file:', file);
                const res = await ServerOperations.pickUploadHttpRequest(file, 1);
                console.log('pickFile: Upload result:', res);

                if (res && res.URL && res.URL !== "") {
                    onAttachmentSelected(res.URL);
                } else {
                    // Fallback to generated name if no URL returned
                    console.warn('pickFile: Upload returned empty URL, using generated name');
                    onAttachmentSelected(generatedName);
                }
            } else {
                console.log('pickFile: File selection was canceled or no assets');
            }
        } catch (error) {
            console.error("pickFile: Error:", error);
            // Handle specific document picker errors
            if (error.message && error.message.includes('Different document picking in progress')) {
                console.warn('pickFile: Document picker conflict detected, will retry after clearing state');
                Alert.alert("Picker Busy", "File picker is busy. Please wait a moment and try again.");
            } else {
                Alert.alert("Error", `Failed to pick file: ${error.message}. Please try again.`);
            }
        } finally {
            console.log('pickFile: Resetting picker state');
            setIsUploading(false);
            setIsPickerActive(false);
            setActivePickerType(null);
        }
    };

    // Handle attachment press
    const handleAttachmentPress = () => {
        if (attachment && attachment.type && attachment.type.startsWith("image")) {
            previewImage(attachment.uri);
        } else {
            Alert.alert("Unsupported File", "This file type is not supported for preview.");
        }
    };

    const previewImage = (uri) => {
        setImageUri(uri);
        setImagePreviewVisible(true);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.menuButton, isUploading && styles.menuButtonDisabled]}
                onPress={() => !isUploading && setMenuVisible(true)}
                disabled={isUploading}
            >
                {isUploading ? (
                    <ActivityIndicator size="small" color="#fff" style={{ marginHorizontal: 5 }} />
                ) : (
                    <Ionicons name="attach" size={24} color="#fff" style={{ marginHorizontal: 5 }} />
                )}
                <Text style={styles.menuButtonText}>
                    {isUploading ? i18n.t("uploading") || "Uploading..." : i18n.t("addAttachment")}
                </Text>
            </TouchableOpacity>

            {/* Loading Modal */}
            <Modal
                transparent={true}
                visible={isUploading}
                animationType="fade"
            >
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <Text style={styles.loadingText}>{i18n.t("uploading") || "Uploading..."}</Text>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent={true}
                visible={menuVisible}
                animationType="fade" // Changed from "slide" to "fade" for better iOS compatibility
                onRequestClose={() => setMenuVisible(false)}
                presentationStyle="overFullScreen" // Add this for iOS
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.menu}>
                        <TouchableOpacity style={styles.menuItem} onPress={takePicture}>
                            <Ionicons name="camera" size={20} color="#007bff" style={{ marginRight: 10 }} />
                            <Text style={styles.menuItemText}>{i18n.t("takePhoto")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={pickImage}>
                            <Ionicons name="image" size={20} color="#007bff" style={{ marginRight: 10 }} />
                            <Text style={styles.menuItemText}>{i18n.t("attachPhoto")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={pickFile}>
                            <Ionicons name="document" size={20} color="#007bff" style={{ marginRight: 10 }} />
                            <Text style={styles.menuItemText}>{i18n.t("attachFile")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10 }]}
                            onPress={() => setMenuVisible(false)}
                        >
                            <Ionicons name="close" size={20} color="#666" style={{ marginRight: 10 }} />
                            <Text style={[styles.menuItemText, { color: "#666" }]}>{i18n.t("cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={imagePreviewVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImagePreviewVisible(false)}
            >
                <View style={styles.previewOverlay}>
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setImagePreviewVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 10,
    },
    menuButton: {
        padding: 10,
        backgroundColor: Constants.darkBlueColor,
        borderRadius: 5,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        marginHorizontal: 50
    },
    menuButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    menuButtonDisabled: {
        opacity: 0.7,
    },
    loadingOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingContainer: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 30,
        alignItems: "center",
        minWidth: 150,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: "#333",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20, // Add padding for better iOS layout
    },
    menu: {
        backgroundColor: "#fff",
        borderRadius: 15, // Increased border radius for iOS style
        width: 280, // Slightly wider
        paddingVertical: 20,
        paddingHorizontal: 10,
        alignItems: "center",
        shadowColor: "#000", // Add shadow for iOS
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5, // For Android shadow
    },
    menuItem: {
        padding: 15,
        width: "100%",
        alignItems: "center",
        marginVertical: 2, // Reduced margin
        flexDirection: "row",
        justifyContent: "flex-start", // Changed to flex-start for better icon alignment
        borderRadius: 8, // Add border radius for individual items
    },
    menuItemText: {
        fontSize: 16,
        color: "#007bff",
    },
    attachmentInfo: {
        marginTop: 10,
    },
    previewOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    previewContainer: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    previewImage: {
        width: 300,
        height: 300,
        resizeMode: "contain",
    },
    closeButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: Constants.darkBlueColor,
        borderRadius: 5,
    },
    closeButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default AttachmentPicker;