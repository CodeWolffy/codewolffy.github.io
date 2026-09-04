// @ts-check
import { createElement } from 'react';
import {
  config,
  fields,
  collection,
  singleton,
  type AssetsFormField,
  type BasicFormField,
  type FormFieldInputProps,
  type FormFieldStoredValue,
} from '@keystatic/core';
import { block } from '@keystatic/core/content-components';
import { getIconComponent, iconOptions, type IconType } from './src/lib/icons';
import postOptions from './src/generated/post-options.json';
import {
  CalloutContentView,
  CodeGroupContentView,
  DetailsContentView,
  IframeContentView,
  LinkCardContentView,
  MermaidContentView,
  StepsContentView,
  mdxEditorStyles,
} from './src/components/keystatic/MdxContentPreviews';
import { useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';

const defaultIconValue: IconType = 'link';

function PostSelectInput({
  value,
  onChange,
  label,
}: FormFieldInputProps<string> & { label: string }) {
  return (
    <label style={{ display: 'grid', width: '100%', gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          minWidth: 0,
          minHeight: 44,
          padding: '8px 36px 8px 12px',
          border: '1px solid #a1a1aa',
          borderRadius: 8,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
        }}
      >
        {postOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function postSelectField({ label }: { label: string }): BasicFormField<string> {
  const defaultValue = postOptions[0]?.value || '';
  const normalizeValue = (value: FormFieldStoredValue) =>
    typeof value === 'string' ? value : defaultValue;

  return {
    kind: 'form',
    label,
    Input(props) {
      return <PostSelectInput label={label} {...props} />;
    },
    defaultValue() {
      return defaultValue;
    },
    parse: normalizeValue,
    serialize(value) {
      return { value };
    },
    validate(value) {
      return value || defaultValue;
    },
    reader: { parse: normalizeValue },
  };
}

type IconPickerFieldOptions = {
  label: string;
  description?: string;
  defaultValue?: IconType;
};

const iconPickerFieldStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
};

const iconPickerHeaderStyle: CSSProperties = {
  display: 'grid',
  gap: '0.25rem',
};

const iconPickerLabelStyle: CSSProperties = {
  color: '#111827',
  fontSize: 14,
  fontWeight: 600,
};

const iconPickerDescriptionStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  lineHeight: 1.5,
};

const iconPreviewCardStyle: CSSProperties = {
  alignItems: 'center',
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  display: 'flex',
  gap: '0.75rem',
  padding: '0.75rem',
};

const iconPreviewBoxStyle: CSSProperties = {
  alignItems: 'center',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  color: '#111827',
  display: 'inline-flex',
  flexShrink: 0,
  height: 40,
  justifyContent: 'center',
  width: 40,
};

const iconPreviewTextStyle: CSSProperties = {
  display: 'grid',
  gap: 2,
  minWidth: 0,
};

const iconPreviewNameStyle: CSSProperties = {
  color: '#111827',
  fontSize: 14,
  fontWeight: 600,
};

const iconPreviewValueStyle: CSSProperties = {
  color: '#6b7280',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 12,
};

const iconGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.5rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
};

const iconSvgStyle: CSSProperties = {
  display: 'block',
  flexShrink: 0,
};

const getIconChoiceStyle = (selected: boolean): CSSProperties => ({
  alignItems: 'center',
  background: selected ? '#eff6ff' : '#fff',
  border: selected ? '2px solid #2563eb' : '1px solid #d1d5db',
  borderRadius: 8,
  color: selected ? '#1d4ed8' : '#374151',
  cursor: 'pointer',
  display: 'flex',
  fontSize: 13,
  fontWeight: selected ? 600 : 500,
  gap: '0.5rem',
  minHeight: 42,
  padding: selected ? '0.5625rem 0.6875rem' : '0.625rem 0.75rem',
  textAlign: 'left',
});

function IconPickerInput({
  value,
  onChange,
  autoFocus,
  label,
  description,
}: FormFieldInputProps<string> & IconPickerFieldOptions) {
  const selectedValue = value || defaultIconValue;
  const selectedOption = iconOptions.find((option) => option.value === selectedValue);
  const focusValue = selectedOption?.value ?? defaultIconValue;

  return (
    <div style={iconPickerFieldStyle}>
      <div style={iconPickerHeaderStyle}>
        <span style={iconPickerLabelStyle}>{label}</span>
        {description ? <span style={iconPickerDescriptionStyle}>{description}</span> : null}
      </div>
      <div style={iconPreviewCardStyle}>
        <span style={iconPreviewBoxStyle}>
          {createElement(getIconComponent(selectedValue), {
            'aria-hidden': true,
            height: 24,
            style: iconSvgStyle,
            width: 24,
          })}
        </span>
        <span style={iconPreviewTextStyle}>
          <strong style={iconPreviewNameStyle}>{selectedOption?.label ?? '自定义图标'}</strong>
          <span style={iconPreviewValueStyle}>{selectedValue}</span>
        </span>
      </div>
      <div aria-label={label} role="radiogroup" style={iconGridStyle}>
        {iconOptions.map((option) => {
          const selected = option.value === selectedValue;

          return (
            <button
              aria-checked={selected}
              autoFocus={autoFocus && option.value === focusValue}
              key={option.value}
              onClick={() => onChange(option.value)}
              role="radio"
              style={getIconChoiceStyle(selected)}
              type="button"
            >
              {createElement(getIconComponent(option.value), {
                'aria-hidden': true,
                height: 18,
                style: iconSvgStyle,
                width: 18,
              })}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function iconPickerField({
  label,
  description = '点击图标即可选择，保存值仍然是原来的图标标识。',
  defaultValue = defaultIconValue,
}: IconPickerFieldOptions): BasicFormField<string> & { options: typeof iconOptions } {
  const normalizeValue = (value: FormFieldStoredValue) =>
    typeof value === 'string' && value.length > 0 ? value : defaultValue;

  return {
    kind: 'form',
    label,
    options: iconOptions,
    Input(props) {
      return <IconPickerInput description={description} label={label} {...props} />;
    },
    defaultValue() {
      return defaultValue;
    },
    parse: normalizeValue,
    serialize(value) {
      return { value: value || defaultValue };
    },
    validate(value) {
      return value || defaultValue;
    },
    reader: {
      parse: normalizeValue,
    },
  };
}

const musicPublicDirectory = 'public/music';
const musicPublicPath = '/music/';

type MusicFilesFieldOptions = {
  label: string;
  description?: string;
};

type MusicFileItem = {
  path: string;
  filename: string;
  relativePath?: string;
  content?: Uint8Array;
};

type MusicFilesValue = {
  files: MusicFileItem[];
  knownRelativePaths: string[];
};

type MusicUploadStatus = {
  added: number;
  duplicate: number;
  invalid: number;
};

const musicUploadFieldStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
};

const musicUploadHeaderStyle: CSSProperties = {
  display: 'grid',
  gap: '0.25rem',
};

const musicUploadLabelStyle: CSSProperties = {
  color: '#111827',
  fontSize: 14,
  fontWeight: 600,
};

const musicUploadDescriptionStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  lineHeight: 1.5,
};

const musicUploadButtonStyle: CSSProperties = {
  alignItems: 'center',
  background: '#fff',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  color: '#374151',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: 14,
  fontWeight: 500,
  justifyContent: 'center',
  justifySelf: 'start',
  minHeight: 38,
  padding: '0.5rem 0.875rem',
};

const musicUploadSummaryStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
};

const musicUploadListStyle: CSSProperties = {
  display: 'grid',
  gap: '0.5rem',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
};

const musicUploadItemStyle: CSSProperties = {
  alignItems: 'center',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'space-between',
  minHeight: 46,
  padding: '0.625rem 0.75rem',
};

const musicUploadFileTextStyle: CSSProperties = {
  display: 'grid',
  gap: 2,
  minWidth: 0,
};

const musicUploadFileNameStyle: CSSProperties = {
  color: '#111827',
  fontSize: 14,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const musicUploadFilePathStyle: CSSProperties = {
  color: '#6b7280',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 12,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const musicUploadRemoveButtonStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #fecaca',
  borderRadius: 8,
  color: '#dc2626',
  cursor: 'pointer',
  flexShrink: 0,
  fontSize: 13,
  padding: '0.375rem 0.625rem',
};

const musicUploadEmptyStyle: CSSProperties = {
  background: '#f9fafb',
  border: '1px dashed #d1d5db',
  borderRadius: 10,
  color: '#6b7280',
  fontSize: 13,
  padding: '0.875rem',
};

const musicUploadInputStyle: CSSProperties = {
  display: 'none',
};

const isMp3Path = (value: string) => /\.mp3(?:$|[?#])/i.test(value);

const decodePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeStoredMusicPath = (value: unknown) => {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim().replace(/\\/g, '/');
  if (!trimmed || !isMp3Path(trimmed)) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const withoutPublic = trimmed.replace(/^\/?public\//i, '');
  if (withoutPublic.startsWith('/music/')) return withoutPublic;
  if (withoutPublic.startsWith('music/')) return `/${withoutPublic}`;
  if (withoutPublic.startsWith('/')) return withoutPublic;

  return `${musicPublicPath}${withoutPublic.replace(/^\/+/, '')}`;
};

const getMusicRelativePath = (path: string) => {
  const normalized = normalizeStoredMusicPath(path);
  if (!normalized || /^https?:\/\//i.test(normalized)) return undefined;

  const pathname = normalized.split(/[?#]/, 1)[0];
  if (!pathname.startsWith(musicPublicPath)) return undefined;

  const relativePath = decodePath(pathname.slice(musicPublicPath.length));
  return relativePath || undefined;
};

const toMusicPublicPath = (relativePath: string) =>
  `${musicPublicPath}${relativePath.replace(/^\/+/, '')}`;

const getMusicFilename = (path: string) => {
  const relativePath = getMusicRelativePath(path);
  const filename = relativePath ? relativePath.split('/').pop() : path.split('/').pop();
  return decodePath(filename || 'MP3 音乐');
};

const getMusicPathKey = (path: string) => {
  const normalized = normalizeStoredMusicPath(path) ?? path;
  return decodePath(normalized).replace(/\\/g, '/').toLowerCase();
};

const sanitizeMp3Filename = (filename: string) => {
  const sanitized = Array.from(filename.normalize('NFC'), (character) =>
    '<>:"/\\|?*'.includes(character) || character.charCodeAt(0) <= 31 ? '-' : character
  )
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitized) return 'track.mp3';
  if (/\.mp3$/i.test(sanitized)) return sanitized;

  return `${sanitized.replace(/\.[^.]*$/, '')}.mp3`;
};

const normalizeMusicFilesFromStoredValue = (value: FormFieldStoredValue) => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const paths: string[] = [];

  value.forEach((item) => {
    const path = normalizeStoredMusicPath(item);
    if (!path) return;

    const key = getMusicPathKey(path);
    if (seen.has(key)) return;

    seen.add(key);
    paths.push(path);
  });

  return paths;
};

function MusicFilesInput({
  value,
  onChange,
  autoFocus,
  label,
  description,
}: FormFieldInputProps<MusicFilesValue> & MusicFilesFieldOptions) {
  const [status, setStatus] = useState<MusicUploadStatus | null>(null);

  const knownPathKeys = useMemo(() => {
    const keys = new Set<string>();

    value.knownRelativePaths.forEach((relativePath) => {
      keys.add(getMusicPathKey(toMusicPublicPath(relativePath)));
    });

    value.files.forEach((file) => {
      keys.add(getMusicPathKey(file.path));
    });

    return keys;
  }, [value.files, value.knownRelativePaths]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    const nextFiles = [...value.files];
    const nextKnownRelativePaths = new Set(value.knownRelativePaths);
    const nextKnownPathKeys = new Set(knownPathKeys);
    const nextStatus: MusicUploadStatus = { added: 0, duplicate: 0, invalid: 0 };

    for (const file of selectedFiles) {
      if (!/\.mp3$/i.test(file.name)) {
        nextStatus.invalid += 1;
        continue;
      }

      const filename = sanitizeMp3Filename(file.name);
      const path = toMusicPublicPath(filename);
      const key = getMusicPathKey(path);

      if (nextKnownPathKeys.has(key)) {
        nextStatus.duplicate += 1;
        continue;
      }

      const content = new Uint8Array(await file.arrayBuffer());
      nextFiles.push({
        path,
        filename,
        relativePath: filename,
        content,
      });
      nextKnownRelativePaths.add(filename);
      nextKnownPathKeys.add(key);
      nextStatus.added += 1;
    }

    input.value = '';
    onChange({
      files: nextFiles,
      knownRelativePaths: Array.from(nextKnownRelativePaths),
    });
    setStatus(nextStatus);
  };

  const handleRemove = (index: number) => {
    onChange({
      ...value,
      files: value.files.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  return (
    <div style={musicUploadFieldStyle}>
      <style>{`
        [data-scrollable] > div:has([data-music-upload-list]) {
          max-width: none !important;
          width: 100% !important;
        }

        @media (max-width: 1180px) {
          [data-music-upload-list] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 860px) {
          [data-music-upload-list] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div style={musicUploadHeaderStyle}>
        <span style={musicUploadLabelStyle}>{label}</span>
        {description ? <span style={musicUploadDescriptionStyle}>{description}</span> : null}
      </div>
      <label style={musicUploadButtonStyle}>
        多选上传 MP3
        <input
          accept="audio/mpeg,.mp3"
          autoFocus={autoFocus}
          multiple
          onChange={handleUpload}
          style={musicUploadInputStyle}
          type="file"
        />
      </label>
      {status ? (
        <div style={musicUploadSummaryStyle}>
          已添加 {status.added} 个，跳过重复 {status.duplicate} 个，忽略非 MP3 {status.invalid} 个。
        </div>
      ) : null}
      {value.files.length > 0 ? (
        <div data-music-upload-list="" style={musicUploadListStyle}>
          {value.files.map((file, index) => (
            <div key={`${file.path}-${index}`} style={musicUploadItemStyle}>
              <span style={musicUploadFileTextStyle}>
                <span style={musicUploadFileNameStyle}>{file.filename}</span>
                <span style={musicUploadFilePathStyle}>{file.path}</span>
              </span>
              <button
                onClick={() => handleRemove(index)}
                style={musicUploadRemoveButtonStyle}
                type="button"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={musicUploadEmptyStyle}>尚未添加 MP3 文件。</div>
      )}
    </div>
  );
}

function musicFilesField({
  label,
  description = '可一次选择多个 MP3；保存到 public/music 并保留原文件名，重复文件会自动跳过。',
}: MusicFilesFieldOptions): AssetsFormField<MusicFilesValue, MusicFilesValue, string[]> {
  return {
    kind: 'form',
    formKind: 'assets',
    directories: [musicPublicDirectory],
    Input(props) {
      return <MusicFilesInput description={description} label={label} {...props} />;
    },
    defaultValue() {
      return { files: [], knownRelativePaths: [] };
    },
    parse(value, { external }) {
      const externalMusicFiles = external.get(musicPublicDirectory);
      const knownRelativePaths = Array.from(externalMusicFiles?.keys() ?? []).filter(isMp3Path);
      const files = normalizeMusicFilesFromStoredValue(value).map((path) => {
        const relativePath = getMusicRelativePath(path);
        const content =
          relativePath && externalMusicFiles?.has(relativePath)
            ? externalMusicFiles.get(relativePath)
            : undefined;

        return {
          path,
          filename: getMusicFilename(path),
          relativePath,
          content,
        };
      });

      return { files, knownRelativePaths };
    },
    serialize(value) {
      const seen = new Set<string>();
      const paths: string[] = [];
      const externalFiles = new Map<string, Uint8Array>();

      value.files.forEach((file) => {
        const path = normalizeStoredMusicPath(file.path);
        if (!path) return;

        const key = getMusicPathKey(path);
        if (seen.has(key)) return;

        seen.add(key);
        paths.push(path);

        if (file.relativePath && file.content) {
          externalFiles.set(file.relativePath, file.content);
        }
      });

      return {
        value: paths,
        other: new Map<string, Uint8Array>(),
        external: new Map<string, ReadonlyMap<string, Uint8Array>>([
          [musicPublicDirectory, externalFiles],
        ]),
      };
    },
    validate(value) {
      return {
        ...value,
        files: value.files.filter((file) => Boolean(normalizeStoredMusicPath(file.path))),
      };
    },
    reader: {
      parse: normalizeMusicFilesFromStoredValue,
    },
  };
}

const keyStaticStorageMode =
  typeof process !== 'undefined' ? process.env.KEYSTATIC_STORAGE : undefined;
const useLocalKeystaticStorage = keyStaticStorageMode === 'local' || import.meta.env.DEV;

const keystaticStorage = useLocalKeystaticStorage
  ? {
      kind: 'local' as const,
    }
  : {
      kind: 'github' as const,
      repo: {
        owner: 'CodeWolffy',
        name: 'codewolffy.github.io',
      },
    };

export default config({
  ui: {
    brand: {
      name: '狼码纪博客后台',
      mark: () => (
        <>
          <img src="/favicon.png" height={24} alt="Logo" />
          <style>{mdxEditorStyles}</style>
          <style>{`
            /* 放大 GitHub 登录按钮 */
            a[href*='/api/keystatic/github/login'] {
              margin: 60px !important;
              transform: scale(3);
              transform-origin: center;
            }
          `}</style>
        </>
      ),
    },
    navigation: {
      博客管理: ['posts', 'series'],
      页面管理: ['about', 'friendsPage', 'projects'],
      音乐管理: ['musicLibrary'],
      友链管理: ['friends'],
      站点设置: ['siteSettings'],
    },
  },
  storage: keystaticStorage,
  singletons: {
    about: singleton({
      label: '🙋 关于我',
      path: 'src/content/pages/about',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: '页面标题', defaultValue: '关于我' }),
        tagline: fields.text({ label: '个性签名/头衔', defaultValue: 'StackOverflow 野生代言人' }),
        subtitle: fields.text({ label: '页面副标题', defaultValue: '软件工程师 & 技术爱好者' }),
        name: fields.text({ label: '显示名称 (CodeWolffy)', defaultValue: 'CodeWolffy' }),

        avatar: fields.image({
          label: '头像',
          directory: 'public/images/pages',
          publicPath: '/images/pages/',
          validation: { isRequired: false },
        }),
        skills: fields.array(fields.text({ label: '技能' }), {
          label: '技术栈',
          itemLabel: (props) => props.value || '技能',
          description: '点击 "添加" 按钮增加新的技能',
        }),
        socialLinks: fields.array(
          fields.object({
            name: fields.text({ label: '名称' }),
            url: fields.text({ label: '链接' }),
            icon: iconPickerField({ label: '图标类型' }),
          }),
          {
            label: '联系方式',
            itemLabel: (props) => props.fields.name.value || '联系方式',
            description: '添加社交联系方式',
          }
        ),
        content: fields.mdx({
          label: '详细介绍',
          options: {
            image: {
              directory: 'public/images/pages',
              publicPath: '/images/pages/',
            },
          },
        }),
      },
    }),
    friendsPage: singleton({
      label: '🔗 友链页面设置',
      path: 'src/content/friendsPage/index',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: '页面标题', defaultValue: '友情链接' }),
        description: fields.text({ label: '页面描述', defaultValue: '优质资源与友站推荐' }),
        applyTitle: fields.text({ label: '申请友链标题', defaultValue: '申请友链' }),
        applyDescription: fields.text({
          label: '申请友链说明',
          multiline: true,
          defaultValue: '如果您想交换友链，请通过以下方式联系我，并提供您的站点名称、描述和头像。',
        }),
        contactMethods: fields.array(
          fields.object({
            name: fields.text({ label: '名称' }),
            url: fields.text({ label: '链接' }),
            icon: iconPickerField({ label: '图标类型' }),
          }),
          {
            label: '联系方式',
            itemLabel: (props) => props.fields.name.value || '联系方式',
            description: '添加申请友链的联系方式',
          }
        ),
      },
    }),
    musicLibrary: singleton({
      label: '🎵 音乐管理',
      path: 'src/content/music/library',
      format: { data: 'json' },
      schema: {
        files: musicFilesField({
          label: '音乐文件',
          description:
            '可一次选择多个 MP3，保存时保留原文件名；重复文件会自动跳过。歌名、歌手、专辑、封面和歌词都从 MP3 标签读取。',
        }),
      },
    }),
    siteSettings: singleton({
      label: '⚙️ 站点设置',
      path: 'src/content/site/settings',
      format: { data: 'json' },
      schema: {
        name: fields.text({ label: '站点名称' }),
        description: fields.text({ label: '站点描述', multiline: true }),
        author: fields.object(
          {
            name: fields.text({ label: '作者名称' }),
          },
          { label: '作者信息' }
        ),
        urls: fields.object(
          {
            primary: fields.text({ label: '主站点地址' }),
            githubPages: fields.text({ label: 'GitHub Pages 地址' }),
          },
          { label: '站点地址' }
        ),
        og: fields.object(
          {
            defaultImage: fields.text({ label: '默认 OG 图片' }),
            locale: fields.text({ label: 'OG 语言' }),
          },
          { label: 'Open Graph' }
        ),
        rss: fields.object(
          {
            title: fields.text({ label: 'RSS 标题' }),
            description: fields.text({ label: 'RSS 描述', multiline: true }),
            language: fields.text({ label: 'RSS 语言' }),
            stylesheet: fields.text({ label: 'RSS 样式表' }),
          },
          { label: 'RSS 设置' }
        ),
        verification: fields.object(
          {
            google: fields.array(fields.text({ label: '验证码' }), {
              label: 'Google 站点验证',
              itemLabel: (props) => props.value || '验证码',
            }),
          },
          { label: '站点验证' }
        ),
        analytics: fields.object(
          {
            busuanzi: fields.object(
              {
                enabled: fields.checkbox({ label: '启用不蒜子统计', defaultValue: true }),
                origin: fields.text({ label: '不蒜子 Origin' }),
                scriptId: fields.text({ label: '脚本 ID' }),
                scriptSrc: fields.text({ label: '脚本地址' }),
                pagePvContainerId: fields.text({ label: '页面 PV 容器 ID' }),
                pagePvValueId: fields.text({ label: '页面 PV 值 ID' }),
                timeoutMs: fields.number({ label: '超时时间 (ms)', defaultValue: 5000 }),
              },
              { label: '不蒜子统计' }
            ),
          },
          { label: '统计代码' }
        ),
        comments: fields.object(
          {
            giscus: fields.object(
              {
                enabled: fields.checkbox({ label: '启用 Giscus 评论', defaultValue: true }),
                id: fields.text({ label: '容器 ID' }),
                repo: fields.text({ label: '仓库 (owner/repo)' }),
                repoId: fields.text({ label: '仓库 ID' }),
                category: fields.text({ label: '分类' }),
                categoryId: fields.text({ label: '分类 ID' }),
                mapping: fields.select({
                  label: '映射方式',
                  options: [
                    { label: 'pathname', value: 'pathname' },
                    { label: 'url', value: 'url' },
                    { label: 'title', value: 'title' },
                    { label: 'og:title', value: 'og:title' },
                    { label: 'specific', value: 'specific' },
                    { label: 'number', value: 'number' },
                  ],
                  defaultValue: 'pathname',
                }),
                reactionsEnabled: fields.select({
                  label: '启用反应',
                  options: [
                    { label: '启用', value: '1' },
                    { label: '禁用', value: '0' },
                  ],
                  defaultValue: '1',
                }),
                emitMetadata: fields.select({
                  label: '发送元数据',
                  options: [
                    { label: '启用', value: '1' },
                    { label: '禁用', value: '0' },
                  ],
                  defaultValue: '0',
                }),
                inputPosition: fields.select({
                  label: '输入框位置',
                  options: [
                    { label: '底部', value: 'bottom' },
                    { label: '顶部', value: 'top' },
                  ],
                  defaultValue: 'bottom',
                }),
                lang: fields.text({ label: '语言', defaultValue: 'zh-CN' }),
                loading: fields.select({
                  label: '加载方式',
                  options: [
                    { label: 'eager', value: 'eager' },
                    { label: 'lazy', value: 'lazy' },
                  ],
                  defaultValue: 'eager',
                }),
              },
              { label: 'Giscus 评论' }
            ),
          },
          { label: '评论设置' }
        ),
        socials: fields.array(
          fields.object({
            label: fields.text({ label: '平台名称' }),
            href: fields.text({ label: '链接地址' }),
          }),
          {
            label: '社交链接',
            itemLabel: (props) => props.fields.label.value || '社交链接',
          }
        ),
        navigation: fields.array(
          fields.object({
            label: fields.text({ label: '导航名称' }),
            href: fields.text({ label: '链接地址' }),
          }),
          {
            label: '顶部导航',
            itemLabel: (props) => props.fields.label.value || '导航项',
          }
        ),
        links: fields.object(
          {
            github: fields.text({ label: 'GitHub 链接' }),
            rss: fields.text({ label: 'RSS 链接' }),
            keystaticPosts: fields.text({ label: 'Keystatic 文章链接前缀' }),
          },
          { label: '其他链接' }
        ),
        ui: fields.object(
          {
            home: fields.object(
              {
                badge: fields.text({ label: '首页徽标文案' }),
                taglineFallback: fields.text({ label: '主标题兜底文案 (未填关于页签名时)' }),
                subtitleFallback: fields.text({ label: '副标题兜底文案 (未填关于页副标题时)' }),
                readButton: fields.text({ label: '“开始阅读”按钮' }),
                archivesButton: fields.text({ label: '“归档列表”按钮' }),
                latestTitle: fields.text({ label: '最新文章区标题' }),
                viewAllText: fields.text({ label: '“查看全部”文案' }),
              },
              { label: '首页文案' }
            ),
            archives: fields.object(
              {
                eyebrow: fields.text({ label: '眉头标签' }),
                title: fields.text({ label: '页面标题' }),
                description: fields.text({ label: '页面描述', multiline: true }),
              },
              { label: '归档页文案' }
            ),
            series: fields.object(
              {
                eyebrow: fields.text({ label: '眉头标签' }),
                title: fields.text({ label: '页面标题' }),
                description: fields.text({ label: '页面描述', multiline: true }),
              },
              { label: '专栏列表页文案' }
            ),
            taxonomy: fields.object(
              {
                eyebrow: fields.text({ label: '眉头标签' }),
                title: fields.text({ label: '页面标题' }),
                description: fields.text({ label: '页面描述', multiline: true }),
              },
              { label: '分类与标签页文案' }
            ),
            tags: fields.object(
              {
                eyebrow: fields.text({ label: '眉头标签' }),
                title: fields.text({ label: '页面标题' }),
                description: fields.text({ label: '页面描述', multiline: true }),
              },
              { label: '标签页文案' }
            ),
            projects: fields.object(
              {
                eyebrow: fields.text({ label: '眉头标签' }),
                title: fields.text({ label: '页面标题' }),
                description: fields.text({ label: '页面描述', multiline: true }),
                moreTitle: fields.text({ label: '“更多项目”区标题' }),
                moreDescription: fields.text({ label: '“更多项目”区描述', multiline: true }),
              },
              { label: '项目页文案' }
            ),
            copyright: fields.object(
              {
                licenseName: fields.text({ label: '许可协议名称' }),
                licenseUrl: fields.text({ label: '许可协议链接' }),
                noticePrefix: fields.text({ label: '版权声明前缀', multiline: true }),
                noticeSuffix: fields.text({ label: '版权声明后缀', multiline: true }),
              },
              { label: '文章版权声明' }
            ),
            footer: fields.object(
              {
                rights: fields.text({ label: '页脚版权后缀' }),
              },
              { label: '页脚' }
            ),
          },
          { label: '界面文案 (UI)' }
        ),
      },
    }),
  },
  collections: {
    categories: collection({
      label: '🏷️ 分类管理',
      slugField: 'name',
      path: 'src/content/categories/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: '分类名称' } }),
      },
    }),
    tags: collection({
      label: '🔖 标签管理',
      slugField: 'name',
      path: 'src/content/tags/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: '标签名称' } }),
      },
    }),
    series: collection({
      label: '📚 专栏管理',
      slugField: 'name',
      columns: ['name', 'status', 'priority'],
      previewUrl: '/series/{slug}/',
      path: 'src/content/series/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({
          name: {
            label: '专栏名称',
            description: '用于后台列表、专栏页和文章详情展示。',
            validation: { isRequired: true, length: { min: 2, max: 40 } },
          },
          slug: {
            label: '专栏链接 (Slug)',
            description: '仅使用小写英文、数字和连字符；发布后不建议修改，以免旧链接失效。',
            validation: {
              length: { min: 2, max: 80 },
              pattern: {
                regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: '仅允许小写英文、数字和连字符，例如 java-core-basics。',
              },
            },
          },
        }),
        description: fields.text({
          label: '专栏简介',
          multiline: true,
          description: '建议用 1～3 句话说明适合谁阅读、能学到什么，会显示在专栏列表和详情页。',
          validation: { isRequired: true, length: { min: 10, max: 200 } },
        }),
        coverImage: fields.image({
          label: '专栏封面（可选）',
          directory: 'public/images/series',
          publicPath: '/images/series/',
          validation: { isRequired: false },
          description: '建议使用 16:9 横图，至少 1200×675，优先使用 WebP/JPEG 并控制文件大小。',
        }),
        status: fields.select({
          label: '专栏状态',
          options: [
            { label: '连载中', value: 'ongoing' },
            { label: '已完结', value: 'completed' },
          ],
          defaultValue: 'ongoing',
          description: '连载中表示后续还会增加篇章；全部内容发布完成后再切换为已完结。',
        }),
        priority: fields.integer({
          label: '推荐排序（0～100）',
          defaultValue: 0,
          validation: { min: 0, max: 100 },
          description: '数字越大越靠前。普通专栏保持 0，重点推荐可设为 50～100。',
        }),
        posts: fields.array(postSelectField({ label: '选择文章' }), {
          label: '专栏文章编排',
          itemLabel: (props) =>
            postOptions.find((option) => option.value === props.value)?.label ||
            props.value ||
            '请选择文章',
          description:
            '在这里统一添加、移除并拖拽调整专栏文章；列表顺序就是前台显示的篇章顺序，同一篇文章只能加入一个专栏。',
        }),
      },
    }),
    posts: collection({
      label: '✍️ 博客文章',
      slugField: 'title',
      columns: ['title', 'pubDate', 'draft'],
      previewUrl: '/blog/{slug}/',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: { label: '文章标题' },
          slug: {
            label: '文章链接 (Slug)',
            description: '这是文章的唯一网址标识。建议使用英文（例如：my-first-post），以便分享。',
          },
        }),
        description: fields.text({
          label: '摘要描述',
          multiline: true,
          description: '这句话会显示在文章列表页，也会作为 SEO 的描述。',
        }),
        pubDate: fields.date({
          label: '发布日期',
          defaultValue: { kind: 'today' },
        }),
        updatedDate: fields.date({
          label: '更新日期',
          description: '修改文章后，如需显示“最近修改时间”，请手动更新此日期。',
        }),
        coverImage: fields.image({
          label: '封面图片 (上传)',
          directory: 'public/images/posts',
          publicPath: '/images/posts/',
          validation: { isRequired: false },
          description: '优先显示上传的图片',
        }),
        heroImage: fields.text({
          label: '封面图片 (网络链接)',
          description: '如果未上传图片，将显示此链接',
        }),
        draft: fields.checkbox({
          label: '草稿状态',
          description: '勾选后，文章将不会在生产环境中显示',
          defaultValue: false,
        }),
        category: fields.conditional(
          fields.select({
            label: '分类模式',
            options: [
              { label: '选择现有分类', value: 'existing' },
              { label: '输入新分类', value: 'custom' },
            ],
            defaultValue: 'existing',
          }),
          {
            existing: fields.relationship({
              label: '选择分类',
              collection: 'categories',
            }),
            custom: fields.text({
              label: '输入分类名称',
              description: '输入一个新的分类名称',
            }),
          }
        ),
        series: fields.relationship({
          label: '旧版专栏归属（兼容字段）',
          collection: 'series',
          validation: { isRequired: false },
          description: '请勿用于新的专栏编排；请前往“专栏管理”统一添加、移除和排序文章。',
        }),
        seriesOrder: fields.integer({
          label: '旧版篇章序号（兼容字段）',
          validation: { isRequired: false, min: 1, max: 999 },
          description: '仅为兼容既有文章保留；新顺序以“专栏管理”中的拖拽顺序为准。',
        }),
        tags: fields.array(
          fields.conditional(
            fields.select({
              label: '标签模式',
              options: [
                { label: '选择现有标签', value: 'existing' },
                { label: '输入新标签', value: 'custom' },
              ],
              defaultValue: 'existing',
            }),
            {
              existing: fields.relationship({
                label: '选择标签',
                collection: 'tags',
              }),
              custom: fields.text({
                label: '输入标签名称',
              }),
            }
          ),
          {
            label: '标签列表',
            itemLabel: (props) => {
              const value = props.value as unknown;

              if (typeof value === 'string' && value.trim()) {
                return value;
              }

              if (value && typeof value === 'object') {
                const item = value as {
                  value?: unknown;
                  label?: unknown;
                };

                if (typeof item.value === 'string' && item.value.trim()) {
                  return item.value;
                }

                if (typeof item.label === 'string' && item.label.trim()) {
                  return item.label;
                }
              }

              return '标签';
            },
            description: '点击 "添加" 按钮增加多个标签',
          }
        ),
        content: fields.mdx({
          label: '正文内容',
          options: {
            image: {
              directory: 'public/images/posts',
              publicPath: '/images/posts/',
            },
          },
          components: {
            Iframe: block({
              label: '嵌入视频 (Iframe)',
              schema: {
                src: fields.text({
                  label: '视频地址 (Source URL)',
                  description:
                    '请输入 iframe 代码中 src 引号内的内容。如果您复制了整个 <iframe> 代码，请看下方的“智能提示”。',
                }),
                title: fields.text({
                  label: '标题 (Title)',
                  description: '视频的简短描述，用于辅助功能',
                }),
              },
              ContentView: IframeContentView,
            }),
            Callout: block({
              label: '提示框 (Callout)',
              schema: {
                type: fields.select({
                  label: '类型',
                  options: [
                    { label: 'ℹ️ 信息 (Info)', value: 'info' },
                    { label: '💡 提示 (Tip)', value: 'tip' },
                    { label: '⚠️ 警告 (Warning)', value: 'warning' },
                    { label: '🔥 危险 (Danger)', value: 'danger' },
                  ],
                  defaultValue: 'info',
                }),
                title: fields.text({ label: '标题 (可选)' }),
                content: fields.child({
                  kind: 'block',
                  placeholder: '请输入提示内容...',
                  formatting: {
                    inlineMarks: 'inherit',
                    softBreaks: 'inherit',
                    listTypes: 'inherit',
                  },
                  links: 'inherit',
                }),
              },
              ContentView: CalloutContentView,
            }),
            Mermaid: block({
              label: '📊 Mermaid 图表',
              schema: {
                code: fields.object({
                  value: fields.text({
                    label: '图表代码',
                    multiline: true,
                    description:
                      '输入 Mermaid 语法。常用类型：flowchart（流程图）、sequenceDiagram（时序图）、pie（饼图）、gantt（甘特图）',
                  }),
                }),
              },
              ContentView: MermaidContentView,
            }),
            Details: block({
              label: '🔽 折叠详情 (Details)',
              schema: {
                title: fields.text({ label: '标题' }),
                open: fields.checkbox({ label: '默认展开', defaultValue: false }),
                content: fields.child({
                  kind: 'block',
                  placeholder: '请输入折叠内容...',
                  formatting: 'inherit',
                  links: 'inherit',
                }),
              },
              ContentView: DetailsContentView,
            }),
            LinkCard: block({
              label: '🔗 链接卡片 (LinkCard)',
              schema: {
                title: fields.text({ label: '标题' }),
                url: fields.text({ label: '链接' }),
                description: fields.text({ label: '描述', multiline: true }),
              },
              ContentView: LinkCardContentView,
            }),
            Steps: block({
              label: '📝 步骤 (Steps)',
              schema: {
                items: fields.array(
                  fields.object({
                    title: fields.text({ label: '步骤标题' }),
                    content: fields.text({ label: '步骤内容', multiline: true }),
                  }),
                  {
                    label: '步骤',
                    itemLabel: (props) => props.fields.title.value || '步骤',
                  }
                ),
              },
              ContentView: StepsContentView,
            }),
            CodeGroup: block({
              label: '💻 代码组 (CodeGroup)',
              schema: {
                items: fields.array(
                  fields.object({
                    label: fields.text({ label: '标签名' }),
                    language: fields.text({ label: '语言', defaultValue: 'text' }),
                    code: fields.text({ label: '代码', multiline: true }),
                  }),
                  {
                    label: '代码块',
                    itemLabel: (props) => props.fields.label.value || '代码块',
                  }
                ),
              },
              ContentView: CodeGroupContentView,
            }),
          }, // Close components
        }), // Close fields.mdx
      }, // Close schema
    }), // Close posts collection
    friends: collection({
      label: '🔗 友情链接',
      slugField: 'name',
      columns: ['name', 'priority', 'url', 'description'],
      path: 'src/content/friends/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({
          name: { label: '网站名称' },
          slug: {
            label: '文件名 (Slug)',
            description: '友链的唯一标识，用于文件命名',
          },
        }),
        description: fields.text({ label: '网站描述' }),
        avatar: fields.image({
          label: '网站图标 (上传)',
          directory: 'public/images/friends',
          publicPath: '/images/friends/',
          validation: { isRequired: false },
        }),
        avatarUrl: fields.text({
          label: '网站图标 (网络链接)',
          description: '如果未上传图片，将显示此链接',
        }),
        url: fields.text({ label: '网站地址' }),
        priority: fields.number({
          label: '排序优先级',
          defaultValue: 0,
          description: '数字越大越靠前显示',
        }),
      },
    }),
    projects: collection({
      label: '💼 项目展示',
      slugField: 'title',
      columns: ['title', 'priority', 'github'],
      path: 'src/content/projects/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({
          name: { label: '项目名称' },
          slug: {
            label: '文件名 (Slug)',
            description: '项目的唯一标识，用于文件命名',
          },
        }),
        description: fields.text({ label: '项目描述', multiline: true }),
        coverImage: fields.image({
          label: '封面图片 (上传)',
          directory: 'public/images/projects',
          publicPath: '/images/projects/',
          validation: { isRequired: false },
          description: '优先显示上传的图片',
        }),
        image: fields.text({
          label: '封面图片 (网络链接)',
          description: '如果未上传图片，将显示此链接',
        }),
        tags: fields.array(fields.text({ label: '标签' }), {
          label: '技术栈标签',
          itemLabel: (props) => props.value || '标签',
          description: '添加项目使用的技术栈',
        }),
        github: fields.text({ label: 'GitHub 链接' }),
        demo: fields.text({ label: '演示链接（可选）' }),
        priority: fields.number({ label: '排序优先级', defaultValue: 0 }),
      },
    }),
  }, // Close collections
});
