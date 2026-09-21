import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSerializedBlocks, normalizeEditorResult } from './editor-round-trip.js';

test('serialized Gutenberg block comments survive the native result boundary', () => {
    const content = '<!-- wp:paragraph --><p>Hello from GutenbergKit.</p><!-- /wp:paragraph -->';
    const result = normalizeEditorResult({ title: 'Diagnostic', content });

    assert.equal(result.content, content);
    assert.equal(hasSerializedBlocks(result.content), true);
});

test('rejects malformed native editor results', () => {
    assert.throws(() => normalizeEditorResult({ title: 'Missing content' }), TypeError);
});
