# Custom ProgressDialog Component

## Overview

This is a custom ProgressDialog component that replaces the problematic `react-native-progress-dialog` library. It provides better iOS compatibility and more consistent behavior across platforms.

## Features

- ✅ Works reliably on both iOS and Android
- ✅ Customizable appearance and behavior
- ✅ Proper modal handling with backdrop press support
- ✅ Platform-specific styling (shadows on iOS, elevation on Android)
- ✅ RTL text support for Arabic
- ✅ Cancelable option with callback support

## Props

| Prop             | Type     | Default                | Description                                         |
| ---------------- | -------- | ---------------------- | --------------------------------------------------- |
| `visible`        | boolean  | `false`                | Controls dialog visibility                          |
| `title`          | string   | `'Loading...'`         | Title text to display                               |
| `message`        | string   | `''`                   | Optional message text                               |
| `cancelable`     | boolean  | `false`                | Whether dialog can be dismissed by tapping backdrop |
| `onCancel`       | function | `() => {}`             | Callback when dialog is cancelled                   |
| `indicatorColor` | string   | `'#007AFF'`            | Color of the loading spinner                        |
| `indicatorSize`  | string   | `'large'`              | Size of the loading spinner                         |
| `overlayColor`   | string   | `'rgba(0, 0, 0, 0.5)'` | Background overlay color                            |
| `containerStyle` | object   | `{}`                   | Custom styles for dialog container                  |
| `titleStyle`     | object   | `{}`                   | Custom styles for title text                        |
| `messageStyle`   | object   | `{}`                   | Custom styles for message text                      |

## Usage Examples

### Basic Usage

```javascript
<ProgressDialog
  visible={isLoading}
  title="جاري التحميل..."
  cancelable={false}
/>
```

### With Message

```javascript
<ProgressDialog
  visible={isLoading}
  title="جاري الرفع..."
  message="يرجى الانتظار حتى اكتمال الرفع"
  cancelable={false}
/>
```

### Cancelable Dialog

```javascript
<ProgressDialog
  visible={isLoading}
  title="جاري التحميل..."
  cancelable={true}
  onCancel={() => {
    setIsLoading(false);
    // Cancel the operation
  }}
/>
```

### Custom Styling

```javascript
<ProgressDialog
  visible={isLoading}
  title="Loading..."
  indicatorColor="#FF6B6B"
  overlayColor="rgba(0, 0, 0, 0.7)"
  containerStyle={{ backgroundColor: "#f0f0f0" }}
  titleStyle={{ color: "#333", fontSize: 18 }}
/>
```

## Migration from react-native-progress-dialog

### Before (old library):

```javascript
import ProgressDialog from "react-native-progress-dialog";

<ProgressDialog visible={progressDialogVisible} />;
```

### After (custom component):

```javascript
import ProgressDialog from "../../components/ProgressDialog";

<ProgressDialog
  visible={progressDialogVisible}
  title="جاري التحميل..."
  cancelable={false}
/>;
```

## iOS-Specific Improvements

- Uses native Modal component instead of problematic third-party implementation
- Proper shadow rendering on iOS
- Correct touch handling and backdrop press behavior
- Better performance and memory management
- No flickering or rendering issues

## Notes

- The component automatically handles RTL text alignment for Arabic
- Platform-specific styling is applied automatically
- The dialog prevents interaction with background content when visible
- Touch events are properly handled to prevent accidental dismissal
