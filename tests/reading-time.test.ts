import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateReadingTime, getReadingTimeMinutes } from '../src/utils/reading-time';

test('empty content has a one-minute minimum', () => {
  assert.deepEqual(calculateReadingTime(''), {
    minutes: 1,
    wordCount: 0,
    imageCount: 0,
    codeLines: 0,
    mermaidCount: 0,
    videoCount: 0,
    text: '约 1 分钟',
  });
});

test('reading time counts code, images, diagrams and video separately', () => {
  const content = `---\ntitle: test\n---\n中文内容 and English words.\n\n![示例](./image.png)\n\n\`\`\`ts\nconst a = 1;\nconst b = 2;\n\`\`\`\n\n\`\`\`mermaid\ngraph TD\nA-->B\n\`\`\`\n\n<Iframe src="https://www.youtube.com/embed/test" />`;
  const result = calculateReadingTime(content);

  assert.equal(result.imageCount, 1);
  assert.equal(result.codeLines, 2);
  assert.equal(result.mermaidCount, 1);
  assert.equal(result.videoCount, 1);
  assert.ok(result.minutes >= 3);
  assert.equal(getReadingTimeMinutes(content), result.minutes);
});
