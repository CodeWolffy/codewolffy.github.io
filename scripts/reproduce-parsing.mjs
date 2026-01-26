
import fs from 'fs';
import path from 'path';

const content = `---
title: for和foreach区别？
description: 在Java编程中，for循环（传统循环）和foreach循环（增强型循环，Introduced in Java 5）是遍历数组和集合的两种主要方式。
pubDate: 2024-01-18
coverImage: /images/posts/for-foreach/coverImage.png
draft: true
category:
  discriminant: existing
  value: 前端技术
tags:
  - discriminant: existing
    value: typescript
  - discriminant: existing
    value: react
  - discriminant: existing
    value: frontend-dev
---`;

function parseFrontmatter(content) {
    // Support both LF and CRLF
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    return match[1];
}

function extractTagsAndCategories(frontmatter) {
    const tags = new Set();
    const categories = new Set();

    if (!frontmatter) return { tags, categories };

    const lines = frontmatter.split(/\r?\n/);
    let currentKey = null;
    let inList = false;

    const stripComment = (str) => {
        const idx = str.indexOf('#');
        return idx === -1 ? str : str.substring(0, idx);
    };

    const cleanValue = (val) => {
        if (!val) return '';
        return stripComment(val).trim().replace(/^['"]|['"]$/g, '');
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) continue;

        // Detect Key
        const keyMatch = line.match(/^([a-zA-Z0-9_]+):/);
        if (keyMatch) {
            currentKey = keyMatch[1];
            inList = false;
        }

        console.log(`[Line] "${line}" | Key: ${currentKey} | InList: ${inList}`);

        if (currentKey === 'tags') {
            if (trimmed.startsWith('- ')) {
                inList = true;
                const valuePart = trimmed.substring(2).trim();

                if (!valuePart.startsWith('discriminant:') && !valuePart.includes(':')) {
                    const val = cleanValue(valuePart);
                    if (val && val !== 'discriminant' && val !== 'value') tags.add(val);
                }
                else if (valuePart.startsWith('value:')) {
                    const val = cleanValue(valuePart.substring(6));
                    if (val) tags.add(val);
                }
            } else if (inList) {
                if (trimmed.startsWith('value:')) {
                    const val = cleanValue(trimmed.substring(6));
                    if (val) tags.add(val);
                    console.log(`[Found Tag] ${val}`);
                }
            }
        } else if (currentKey === 'category') {
            if (trimmed.startsWith('value:')) {
                const val = cleanValue(trimmed.substring(6));
                if (val) categories.add(val);
                console.log(`[Found Cat] ${val}`);
            }
        }
    }

    return { tags, categories };
}

const fm = parseFrontmatter(content);
const result = extractTagsAndCategories(fm);
console.log('Result:', result);
