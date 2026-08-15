import { forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import type { GutenbergKitEditorResult } from './editor-round-trip';

type NativeEvent<T> = { nativeEvent: T };

export type GutenbergKitEditorRef = {
    requestContent(): Promise<GutenbergKitEditorResult>;
};

export type GutenbergKitEditorProps = {
    initialTitle: string;
    initialContent: string;
    onReady?: (event: NativeEvent<Record<string, never>>) => void;
    onError?: (event: NativeEvent<{ message: string }>) => void;
    style?: StyleProp<ViewStyle>;
};

const NativeGutenbergKitEditor = requireNativeViewManager<GutenbergKitEditorProps>(
    'GutenbergKitEditor',
) as React.ComponentType<GutenbergKitEditorProps & React.RefAttributes<GutenbergKitEditorRef>>;

export const GutenbergKitEditor = forwardRef<GutenbergKitEditorRef, GutenbergKitEditorProps>(
    function GutenbergKitEditor(props, ref) {
        return <NativeGutenbergKitEditor {...props} ref={ref} />;
    },
);
