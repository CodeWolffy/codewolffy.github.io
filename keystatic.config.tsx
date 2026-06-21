// @ts-check
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
import { normalizeIframeUrl } from './src/utils/iframe-url';
import { getIconComponent, iconOptions, type IconType } from './src/lib/icons';
import { useMemo, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

const defaultIconValue: IconType = 'link';

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
  const CurrentIcon = getIconComponent(selectedValue);

  return (
    <div style={iconPickerFieldStyle}>
      <div style={iconPickerHeaderStyle}>
        <span style={iconPickerLabelStyle}>{label}</span>
        {description ? <span style={iconPickerDescriptionStyle}>{description}</span> : null}
      </div>
      <div style={iconPreviewCardStyle}>
        <span style={iconPreviewBoxStyle}>
          <CurrentIcon aria-hidden="true" height={24} style={iconSvgStyle} width={24} />
        </span>
        <span style={iconPreviewTextStyle}>
          <strong style={iconPreviewNameStyle}>{selectedOption?.label ?? '自定义图标'}</strong>
          <span style={iconPreviewValueStyle}>{selectedValue}</span>
        </span>
      </div>
      <div aria-label={label} role="radiogroup" style={iconGridStyle}>
        {iconOptions.map((option) => {
          const selected = option.value === selectedValue;
          const Icon = getIconComponent(option.value);

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
              <Icon aria-hidden="true" height={18} style={iconSvgStyle} width={18} />
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
  const sanitized = filename
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
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
        <div style={musicUploadListStyle}>
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

const keystaticStorage =
  process.env.NODE_ENV === 'production'
    ? {
        kind: 'github' as const,
        repo: {
          owner: 'CodeWolffy',
          name: 'codewolffy.github.io',
        },
      }
    : {
        kind: 'local' as const,
      };

export default config({
  ui: {
    brand: {
      name: '狼码纪博客后台',
      mark: () => (
        <>
          <img src="/favicon.png" height={24} alt="Logo" />
          <style>{`
                        /* 强制表格样式在编辑器中更易读 */
                        div[contenteditable] table {
                            width: 100% !important;
                            table-layout: auto !important;
                            border-collapse: collapse !important;
                            margin: 1em 0 !important;
                        }
                        div[contenteditable] td, 
                        div[contenteditable] th {
                            border: 1px solid #e2e8f0 !important;
                            padding: 8px 12px !important;
                            min-width: 50px;
                        }
                        div[contenteditable] th {
                            background-color: #f8fafc !important;
                            font-weight: bold !important;
                        }
                        /* 编辑器内容区宽度与前台页面保持一致，避免后台预览过窄 */
                        div[data-keystatic-scroll-area] > div > div {
                            max-width: 100% !important;
                        }
                        /* 放大 GitHub 登录按钮 */
                        a[href*="/api/keystatic/github/login"] {
                            transform: scale(3);
                            transform-origin: center;
                            margin: 60px !important;
                        }
                    `}</style>
        </>
      ),
    },
    navigation: {
      博客管理: ['posts'],
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
    posts: collection({
      label: '✍️ 博客文章',
      slugField: 'title',
      columns: ['title', 'pubDate', 'draft'],
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
            iframe: block({
              label: '嵌入视频 (iframe)',
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
              ContentView: (props) => {
                const rawSrc = props.value.src || '';
                const title = props.value.title;

                // 提取 URL 的逻辑
                let src = rawSrc;
                let warning = null;
                let extractedUrl: string | null = null;

                if (rawSrc.trim().startsWith('<iframe')) {
                  const match = rawSrc.match(/src=["'](.*?)["']/);
                  if (match && match[1]) {
                    src = match[1];
                    extractedUrl = match[1];
                    warning = (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '12px',
                          background: '#fffbeb',
                          border: '1px solid #fcd34d',
                          borderRadius: '6px',
                          color: '#92400e',
                          fontSize: '13px',
                        }}
                      >
                        <strong>⚠️ 检测到完整 iframe 代码</strong>
                        <p style={{ margin: '4px 0' }}>
                          请只保留{' '}
                          <code
                            style={{
                              background: '#fef3c7',
                              padding: '2px 4px',
                              borderRadius: '4px',
                            }}
                          >
                            src
                          </code>{' '}
                          属性中的链接。
                        </p>
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            wordBreak: 'break-all',
                            display: 'flex',
                            gap: '8px',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ fontSize: '12px', color: '#64748b' }}>建议修改为：</div>
                          <div
                            style={{
                              fontWeight: '500',
                              color: '#0f172a',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                            }}
                          >
                            {extractedUrl}
                          </div>
                          <button
                            type="button"
                            style={{
                              alignSelf: 'flex-start',
                              padding: '4px 12px',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              marginTop: '4px',
                            }}
                            onClick={() => {
                              if (extractedUrl) {
                                navigator.clipboard.writeText(extractedUrl);
                                alert('已复制链接！建议删除上方内容后粘贴。');
                              }
                            }}
                          >
                            📋 复制链接
                          </button>
                        </div>
                      </div>
                    );
                  }
                }

                // 处理预览用的 URL (禁用自动播放等)
                const previewSrc = normalizeIframeUrl(src);

                return (
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#f8fafc',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #e2e8f0',
                        background: '#fff',
                        fontSize: '12px',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>🎥 视频嵌入预览</span>
                      {extractedUrl && <span style={{ color: '#f59e0b' }}>⚠️ 格式需修正</span>}
                    </div>

                    {/* 预览区域 */}
                    {src ? (
                      <div
                        style={{
                          position: 'relative',
                          paddingBottom: '56.25%',
                          height: 0,
                          background: '#000',
                        }}
                      >
                        <iframe
                          src={previewSrc}
                          title={title}
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; presentation"
                          allowFullScreen
                          sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups allow-presentation allow-modals"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            zIndex: 0,
                            opacity: warning ? 0.5 : 1,
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ marginBottom: '8px', fontSize: '24px' }}>📺</div>
                        请在右侧输入视频地址
                      </div>
                    )}

                    {/* 警告信息 */}
                    {warning && <div style={{ padding: '0 12px 12px 12px' }}>{warning}</div>}

                    {title && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderTop: '1px solid #e2e8f0',
                          fontSize: '13px',
                          textAlign: 'center',
                          color: '#475569',
                          background: '#fff',
                        }}
                      >
                        {title}
                      </div>
                    )}
                  </div>
                );
              },
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
              ContentView: (props: {
                value: { type?: 'info' | 'tip' | 'warning' | 'danger'; title?: string };
                children?: ReactNode;
              }) => {
                const typeMap: Record<string, { color: string; border: string; icon: string }> = {
                  info: { color: '#eff6ff', border: '#bfdbfe', icon: 'ℹ️' },
                  tip: { color: '#ecfdf5', border: '#a7f3d0', icon: '💡' },
                  warning: { color: '#fffbeb', border: '#fde68a', icon: '⚠️' },
                  danger: { color: '#fef2f2', border: '#fecaca', icon: '🔥' },
                };
                const style = typeMap[props.value.type || 'info'];
                return (
                  <div
                    style={{
                      padding: '16px',
                      background: style.color,
                      border: `1px solid ${style.border}`,
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        fontWeight: 'bold',
                        marginBottom: '4px',
                      }}
                    >
                      <span>{style.icon}</span>
                      <span>{props.value.title}</span>
                    </div>
                    <div style={{ color: '#374151' }}>{props.children}</div>
                    <style>{`
                                    /* Fix Keystatic Slash Menu Z-Index */
                                    div[role="listbox"],
                                    div[data-reach-menu-popover],
                                    [id^="headlessui-portal-root"] {
                                        z-index: 99999 !important;
                                    }
                                `}</style>
                  </div>
                );
              },
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
              ContentView: (props) => {
                const chart = props.value.code?.value || '';

                // 简单的语法提示
                const getChartType = (code: string) => {
                  if (code.startsWith('flowchart') || code.startsWith('graph')) return '流程图';
                  if (code.startsWith('sequenceDiagram')) return '时序图';
                  if (code.startsWith('pie')) return '饼图';
                  if (code.startsWith('gantt')) return '甘特图';
                  if (code.startsWith('classDiagram')) return '类图';
                  if (code.startsWith('erDiagram')) return 'ER图';
                  if (code.startsWith('stateDiagram')) return '状态图';
                  return '图表';
                };

                return (
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#f8fafc',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #e2e8f0',
                        background: '#fff',
                        fontSize: '12px',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>📊 Mermaid {chart ? getChartType(chart.trim()) : '图表'}</span>
                      {chart && <span style={{ color: '#22c55e' }}>✓ 已输入</span>}
                    </div>

                    {chart ? (
                      <div style={{ padding: '16px', background: '#fff' }}>
                        <pre
                          style={{
                            margin: 0,
                            padding: '12px',
                            background: '#f1f5f9',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontFamily: 'ui-monospace, monospace',
                            overflow: 'auto',
                            maxHeight: '200px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {chart}
                        </pre>
                        <div
                          style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            color: '#94a3b8',
                            textAlign: 'center',
                          }}
                        >
                          ⓘ 图表将在文章页面渲染显示
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ marginBottom: '8px', fontSize: '24px' }}>📊</div>
                        <div style={{ marginBottom: '12px' }}>
                          请在上方“图表代码”中输入 Mermaid 代码
                        </div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                          示例：flowchart TD; A--&gt;B;
                        </div>
                      </div>
                    )}
                  </div>
                );
              },
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
              ContentView: (props: {
                value: { title: string; open: boolean };
                children?: ReactNode;
              }) => (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    margin: '16px 0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#f8fafc',
                      fontWeight: 500,
                    }}
                  >
                    {props.value.title}
                  </div>
                  <div style={{ padding: '16px' }}>{props.children}</div>
                </div>
              ),
            }),
            LinkCard: block({
              label: '🔗 链接卡片 (LinkCard)',
              schema: {
                title: fields.text({ label: '标题' }),
                url: fields.text({ label: '链接' }),
                description: fields.text({ label: '描述', multiline: true }),
              },
              ContentView: (props) => (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    margin: '16px 0',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{props.value.title}</div>
                  {props.value.description && (
                    <div style={{ color: '#64748b', marginTop: '4px' }}>
                      {props.value.description}
                    </div>
                  )}
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
                    {props.value.url}
                  </div>
                </div>
              ),
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
              ContentView: (props) => (
                <div style={{ margin: '16px 0' }}>
                  {props.value.items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.title}</div>
                        <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                          {item.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ),
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
              ContentView: (props) => (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    margin: '16px 0',
                  }}
                >
                  <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    {props.value.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 500,
                          background: index === 0 ? '#fff' : 'transparent',
                          borderBottom: index === 0 ? '2px solid #3b82f6' : 'none',
                        }}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '16px', background: '#fff' }}>
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '13px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {props.value.items[0]?.code}
                    </pre>
                  </div>
                </div>
              ),
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
