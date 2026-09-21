import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'wp-native-shell';
import {
    GutenbergKitEditor,
    type GutenbergKitEditorRef,
} from '../../src/gutenbergkit/GutenbergKitEditor';
import {
    hasSerializedBlocks,
    normalizeEditorResult,
    type GutenbergKitEditorResult,
} from '../../src/gutenbergkit/editor-round-trip';

const INITIAL_TITLE = 'GutenbergKit diagnostic';
const INITIAL_CONTENT = '<!-- wp:paragraph --><p>Edit this paragraph in GutenbergKit.</p><!-- /wp:paragraph -->';

export default function GutenbergKitDiagnostic() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const theme = useTheme();
    const editor = useRef<GutenbergKitEditorRef>(null);
    const [ready, setReady] = useState(false);
    const [result, setResult] = useState<GutenbergKitEditorResult | null>(null);
    const [error, setError] = useState('');

    const requestContent = async () => {
        setError('');
        try {
            setResult(normalizeEditorResult(await editor.current?.requestContent()));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to read editor content.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Pressable onPress={() => navigation.openDrawer()} accessibilityRole="button">
                    <Text style={{ color: theme.colors.primary }}>Menu</Text>
                </Pressable>
                <Text style={[styles.title, { color: theme.colors.text }]}>GutenbergKit</Text>
                <Pressable disabled={!ready} onPress={() => void requestContent()} accessibilityRole="button">
                    <Text style={{ color: ready ? theme.colors.primary : theme.colors.textMuted }}>Request</Text>
                </Pressable>
            </View>

            <GutenbergKitEditor
                ref={editor}
                initialTitle={INITIAL_TITLE}
                initialContent={INITIAL_CONTENT}
                onReady={() => setReady(true)}
                onError={({ nativeEvent }) => setError(nativeEvent.message)}
                style={styles.editor}
            />

            <ScrollView style={[styles.result, { borderTopColor: theme.colors.border }]} contentContainerStyle={styles.resultContent}>
                <Text style={{ color: theme.colors.textMuted }}>
                    {ready ? 'Editor ready' : 'Loading bundled GutenbergKit editor'}
                </Text>
                {error ? <Text style={{ color: theme.colors.error }}>{error}</Text> : null}
                {result ? (
                    <>
                        <Text style={{ color: hasSerializedBlocks(result.content) ? theme.colors.primary : theme.colors.error }}>
                            {hasSerializedBlocks(result.content) ? 'Serialized block comments verified' : 'Serialized block comments missing'}
                        </Text>
                        <Text selectable style={{ color: theme.colors.text }}>{result.title}</Text>
                        <Text selectable style={[styles.markup, { color: theme.colors.text }]}>{result.content}</Text>
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: { fontSize: 18, fontWeight: '600' },
    editor: { flex: 1 },
    result: { borderTopWidth: StyleSheet.hairlineWidth, maxHeight: 220 },
    resultContent: { gap: 8, padding: 16 },
    markup: { fontFamily: 'monospace', fontSize: 12 },
});
