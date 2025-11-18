import React, { useEffect, useState, useMemo } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import { Platform, View, StyleSheet } from 'react-native';

/*
Reusable wrapper to emulate the basic @react-native-picker/picker API used in the app.
Props mapping:
 - selectedValue -> value
 - onValueChange(value, index)
 - children: previous <Picker.Item label value /> are supported; we read props
Usage:
    import Picker from '../../components/DropdownPickerWrapper';
*/

const PickerItem = () => null; // placeholder so existing <Picker.Item ... /> doesn't break.

const DropdownPickerWrapper = ({
    selectedValue,
    onValueChange,
    children,
    style,
    itemStyle,
    placeholder,
    disabled,
    zIndex = 5000,
    containerStyle,
    dropDownContainerStyle,
    zIndexInverse,
    ...rest
}) => {
    // Extract items from children (each child has props.label & props.value)
    const items = useMemo(() => {
        const arr = [];
        React.Children.forEach(children, (child, idx) => {
            if (child && child.props && (child.props.label || child.props.value !== undefined)) {
                arr.push({ label: child.props.label ?? String(child.props.value), value: child.props.value, _index: idx });
            }
        });
        return arr;
    }, [children]);

    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(selectedValue ?? null);
    const [data, setData] = useState(items);

    // Sync when parent changes selectedValue programmatically
    useEffect(() => {
        setValue(selectedValue);
    }, [selectedValue]);

    // Update internal items if children change
    useEffect(() => {
        setData(items);
    }, [items]);

    const handleChangeValue = (val) => {
        setValue(val);
        const index = data.findIndex(i => i.value === val);
        if (onValueChange) {
            onValueChange(val, index);
        }
    };

    return (
        <View style={[{ position: 'relative', zIndex, width: 'auto' }, containerStyle]}>
            <DropDownPicker
                open={open}
                value={value}
                items={data}
                setOpen={setOpen}
                setValue={(cb) => {
                    const next = typeof cb === 'function' ? cb(value) : cb;
                    handleChangeValue(next);
                }}
                setItems={setData}
                placeholder={placeholder}
                placeholderStyle={styles.placeholderStyle}
                disabled={disabled}
                style={[styles.control, style, itemStyle]}
                dropDownContainerStyle={[styles.dropdownContainer, dropDownContainerStyle]}
                listItemLabelStyle={styles.listItemLabel}
                labelStyle={styles.labelStyle}
                arrowIconStyle={styles.arrowIcon}
                listMode={Platform.OS === 'android' ? 'SCROLLVIEW' : 'FLATLIST'}
                zIndex={zIndex}
                zIndexInverse={zIndexInverse}
                dropDownDirection="AUTO"
                {...rest}
            />
        </View>
    );
};

DropdownPickerWrapper.Item = PickerItem;

export default DropdownPickerWrapper;

const styles = StyleSheet.create({
    control: {
        borderColor: '#008786',
        minHeight: 48,
        borderWidth: 1,
        backgroundColor: '#FAF9F6',
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    dropdownContainer: {
        borderColor: '#008786',
        backgroundColor: '#FFFFFF',
    },
    labelStyle: {
        fontSize: 15,
        color: '#000',
    },
    listItemLabel: {
        fontSize: 15,
        color: '#222',
    },
    placeholderStyle: {
        color: '#666',
        fontSize: 14,
    },
    arrowIcon: {
        tintColor: '#008786'
    }
});
