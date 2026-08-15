export type GutenbergKitEditorResult = {
    title: string;
    content: string;
};

export function normalizeEditorResult(value: unknown): GutenbergKitEditorResult;
export function hasSerializedBlocks(content: string): boolean;
