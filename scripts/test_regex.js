
const content = `
Here is a video:
<iframe src="//player.bilibili.com/player.html?aid=115933616015126&bvid=BV17Lz7BCE2W" title="听见你说！！" width="100%" />

And another one:
<iframe src="https://youtube.com/embed/xyz" title="YouTube Video"></iframe>
`;

function processContent(content) {
    return content.replace(
        /<iframe\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>(?:<\/iframe>)?/gi,
        (match, beforeSrc, src, afterSrc) => {
            console.log('--- Match ---');
            console.log('Before:', beforeSrc);
            console.log('Src:', src);
            console.log('After:', afterSrc);

            // Extract title
            const fullAttributes = beforeSrc + ' ' + afterSrc;
            const titleMatch = fullAttributes.match(/title=["']([^"']+)["']/);
            const title = titleMatch ? titleMatch[1] : '';
            console.log('Extracted Title:', title);

            let iframeStyle = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;';
            
            // Reconstruct logic
            return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin-bottom: 10px;">
    <iframe src="${src}" ${beforeSrc.trim()} ${afterSrc.trim()} style="${iframeStyle}"></iframe>
</div>
${title ? `<div style="text-align: center; margin-bottom: 20px; color: #666; font-size: 0.9em;">${title}</div>` : ''}`;
        }
    );
}

const result = processContent(content);
console.log('\n--- Result ---');
console.log(result);
