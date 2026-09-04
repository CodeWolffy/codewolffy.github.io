import assert from 'node:assert/strict';
import test from 'node:test';

import { getFallbackMetadata } from '../src/lib/mp3-metadata';
import {
  MUSIC_PLAYBACK_STATE_STORAGE_KEY,
  clampPlayerAnchor,
  clearPlayerAnchorStyle,
  getActiveLyricIndex,
  isPointerInsidePlayer,
  persistPlaybackState,
  readStoredPlaybackState,
} from '../src/components/music/player-utils';

test('getFallbackMetadata extracts title and artist from filename formatted as 歌名-歌手', () => {
  assert.deepEqual(getFallbackMetadata('/music/起风了-买辣椒也用券.mp3'), {
    title: '起风了',
    artist: '买辣椒也用券',
  });

  assert.deepEqual(getFallbackMetadata('/music/程艾影 - 赵雷.mp3'), {
    title: '程艾影',
    artist: '赵雷',
  });

  assert.deepEqual(getFallbackMetadata('/music/夜车—曾轶可.mp3'), {
    title: '夜车',
    artist: '曾轶可',
  });

  assert.deepEqual(getFallbackMetadata('/music/PureMusic.mp3'), {
    title: 'PureMusic',
    artist: '未知艺术家',
  });

  assert.deepEqual(getFallbackMetadata(''), {
    title: '未命名音乐',
    artist: '未知艺术家',
  });
});

test('getActiveLyricIndex returns -1 during prelude before first lyric and correct index during playback', () => {
  const lyrics = [
    { time: 10, text: '第一句歌词' },
    { time: 20, text: '第二句歌词' },
    { time: 30, text: '第三句歌词' },
  ];

  // 0s ~ 9.9s (前奏阶段)：尚未达到第一句歌词，应返回 -1
  assert.equal(getActiveLyricIndex(lyrics, 0), -1);
  assert.equal(getActiveLyricIndex(lyrics, 5), -1);
  assert.equal(getActiveLyricIndex(lyrics, 9.99), -1);

  // 达到第一句歌词
  assert.equal(getActiveLyricIndex(lyrics, 10), 0);
  assert.equal(getActiveLyricIndex(lyrics, 15), 0);

  // 达到第二句歌词
  assert.equal(getActiveLyricIndex(lyrics, 20), 1);
  assert.equal(getActiveLyricIndex(lyrics, 25), 1);

  // 达到最后一句歌词
  assert.equal(getActiveLyricIndex(lyrics, 30), 2);
  assert.equal(getActiveLyricIndex(lyrics, 60), 2);
});

test('clearPlayerAnchorStyle resets inline left, right, top and bottom properties', () => {
  const mockElement = {
    style: {
      left: '100px',
      right: 'auto',
      top: '50px',
      bottom: 'auto',
    },
  } as unknown as HTMLElement;

  clearPlayerAnchorStyle(mockElement);

  assert.equal(mockElement.style.left, '');
  assert.equal(mockElement.style.right, '');
  assert.equal(mockElement.style.top, '');
  assert.equal(mockElement.style.bottom, '');
});

test('clampPlayerAnchor keeps anchor within viewport boundaries', () => {
  // 视口在 Node 默认模拟下为 1024 x 768，PLAYER_EDGE_GAP 为 16
  const outOfBoundsAnchor = {
    horizontal: { edge: 'right' as const, offset: 9999 },
    vertical: { edge: 'top' as const, offset: -500 },
  };

  const clamped = clampPlayerAnchor(outOfBoundsAnchor, 44, 44);

  // 负 offset 会被钳制在安全边距内
  assert.ok(clamped.vertical.offset >= 16);
  assert.ok(clamped.horizontal.offset >= 16);
});

test('readStoredPlaybackState and persistPlaybackState work correctly with valid and corrupted data', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
  };

  try {
    // 1. 无数据时返回 null
    assert.equal(readStoredPlaybackState(), null);

    // 2. 正常持久化与读取
    persistPlaybackState({
      audio: '/music/起风了-买辣椒也用券.mp3',
      currentTime: 125,
      playMode: 'shuffle',
    });

    assert.deepEqual(readStoredPlaybackState(), {
      audio: '/music/起风了-买辣椒也用券.mp3',
      currentTime: 125,
      playMode: 'shuffle',
    });

    // 3. 异常数据自愈与容错（空音频路径、负数时间戳、未知播放模式）
    store[MUSIC_PLAYBACK_STATE_STORAGE_KEY] = JSON.stringify({
      audio: '   ',
      currentTime: -50,
      playMode: 'invalid_mode',
    });

    assert.deepEqual(readStoredPlaybackState(), {});

    // 4. JSON 格式损坏
    store[MUSIC_PLAYBACK_STATE_STORAGE_KEY] = 'invalid-json{{{';
    assert.equal(readStoredPlaybackState(), null);
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  }
});

test('isPointerInsidePlayer correctly identifies player interactions and protects against disconnected nodes', () => {
  // 1. 空值边界检验
  assert.equal(isPointerInsidePlayer(null, null), false);
  assert.equal(isPointerInsidePlayer({} as HTMLElement, null), false);

  // 模拟 DOM 环境
  class MockNode {
    parentElement: MockElement | null = null;
    isConnected = true;
  }

  class MockElement extends MockNode {
    classList = {
      contains: (name: string) => this._classes.includes(name),
    };
    _classes: string[] = [];
    _attributes: Record<string, string> = {};

    getAttribute(key: string) {
      return this._attributes[key] ?? null;
    }

    setAttribute(key: string, value: string) {
      this._attributes[key] = value;
    }

    closest(selector: string): MockElement | null {
      if (
        selector.includes('[data-player-interactive="true"]') &&
        this.getAttribute('data-player-interactive') === 'true'
      ) {
        return this;
      }
      if (
        selector.includes('[data-player-controls="true"]') &&
        this.getAttribute('data-player-controls') === 'true'
      ) {
        return this;
      }
      return this.parentElement?.closest(selector) ?? null;
    }
  }

  class MockHTMLElement extends MockElement {
    children: MockNode[] = [];
    contains(target: MockNode): boolean {
      if (target === this) return true;
      return this.children.some(
        (c) => c === target || (c instanceof MockHTMLElement && c.contains(target))
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Node = MockNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Element = MockElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).HTMLElement = MockHTMLElement;

  try {
    const surface = new MockHTMLElement();
    const button = new MockElement();
    button.parentElement = surface;
    surface.children.push(button);

    // 2. 正常子元素 contains 判定
    assert.equal(
      isPointerInsidePlayer(surface as unknown as HTMLElement, button as unknown as EventTarget),
      true
    );

    // 3. composedPath 判定（即使未挂载在 surface.children 中，但在 composedPath 序列中）
    const pathItem = new MockElement();
    pathItem.setAttribute('data-player-interactive', 'true');
    assert.equal(
      isPointerInsidePlayer(
        surface as unknown as HTMLElement,
        new MockNode() as unknown as EventTarget,
        [pathItem as unknown as EventTarget]
      ),
      true
    );

    // 4. 关键防护：React setState 导致的脱卸节点判定（!isConnected）
    const unmountedSvg = new MockElement();
    unmountedSvg.isConnected = false; // 已从 DOM 脱卸
    assert.equal(
      isPointerInsidePlayer(
        surface as unknown as HTMLElement,
        unmountedSvg as unknown as EventTarget
      ),
      true
    );

    // 5. 纯外部元素（在 DOM 树中，但与播放器无任何关联）
    const outsideElement = new MockElement();
    outsideElement.isConnected = true;
    assert.equal(
      isPointerInsidePlayer(
        surface as unknown as HTMLElement,
        outsideElement as unknown as EventTarget
      ),
      false
    );
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).Node;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).Element;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).HTMLElement;
  }
});
