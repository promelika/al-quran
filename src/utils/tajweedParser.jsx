import React from 'react';

/**
 * Parses Quran Tajweed text format: [rule[text]]
 * Example: [h:1[ٱ]]
 * 
 * Rules mapping (approximate based on AlQuran Cloud):
 * n: Ghunnah (Green) - Nasalization
 * p: Qalqalah (Blue) - Echoing
 * m: Iqlab (Cyan) - Turning over
 * q: Ikhfa (Red/Gray) - Hiding
 * c: Idgham (Gray) - Merging
 * k: Qalqalah Kubra?
 * h: Hamzat Wasl (Light Gray)
 * l: Lam (variations)
 * g: ?
 */

const parseTajweed = (text) => {
    if (!text) return null;

    const parts = [];
    let currentIndex = 0;

    // Regex to match [rule[text] pattern (single closing bracket)
    // Matches: [ followed by rule followed by [ followed by content followed by ]

    const regex = /\[([a-zA-Z0-9:]+)\[([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > currentIndex) {
            parts.push(<span key={currentIndex}>{text.substring(currentIndex, match.index)}</span>);
        }

        const rule = match[1];
        const content = match[2];
        const className = `tajweed-${rule.split(':')[0]}`; // handle h:1 as tajweed-h

        parts.push(
            <span key={match.index} className={className}>
                {content}
            </span>
        );

        currentIndex = regex.lastIndex;
    }

    // Add remaining text
    if (currentIndex < text.length) {
        parts.push(<span key={currentIndex}>{text.substring(currentIndex)}</span>);
    }

    return parts;
};

export default parseTajweed;
