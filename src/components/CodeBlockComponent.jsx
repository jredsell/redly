import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlockComponent({ node }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const textContent = node.textContent;
        navigator.clipboard.writeText(textContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy code: ', err);
        });
    };

    return (
        <NodeViewWrapper className="tiptap-code-block-wrapper relative group">
            <button
                type="button"
                className="copy-code-btn"
                onClick={handleCopy}
                title="Copy code"
                aria-label="Copy code"
            >
                {copied ? <Check size={14} className="icon-check" /> : <Copy size={14} />}
            </button>
            <pre>
                <NodeViewContent as="code" />
            </pre>
        </NodeViewWrapper>
    );
}
