export function normalizeEditorResult(value) {
    if (!value || typeof value !== 'object') {
        throw new TypeError('The native editor result must be an object.');
    }

    const { title, content } = value;
    if (typeof title !== 'string' || typeof content !== 'string') {
        throw new TypeError('The native editor result must contain string title and content values.');
    }

    return { title, content };
}

export function hasSerializedBlocks(content) {
    return /<!--\s+wp:[\w/-]+(?:\s+\{.*?\})?\s+-->[\s\S]*?<!--\s+\/wp:[\w/-]+\s+-->/.test(content);
}
