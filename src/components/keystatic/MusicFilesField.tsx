import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import type { AssetsFormField, FormFieldInputProps } from '@keystatic/core';
import {
  addMusicFiles,
  musicPublicDirectory,
  maxAudioFileBytes,
  normalizeMusicFilesFromStoredValue,
  parseMusicFiles,
  removeMusicFile,
  serializeMusicFiles,
  validateMusicFiles,
  type MusicFilesValue,
  type MusicUploadStatus,
} from './music-files';

type MusicFilesFieldOptions = { label: string; description?: string };

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

function MusicFilesInput({
  value,
  onChange,
  autoFocus,
  label,
  description,
}: FormFieldInputProps<MusicFilesValue> & MusicFilesFieldOptions) {
  const [status, setStatus] = useState<MusicUploadStatus | null>(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const uploadInProgress = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (uploadInProgress.current) return;
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    input.value = '';
    uploadInProgress.current = true;
    setIsUploading(true);
    setError('');
    setStatus(null);
    try {
      const result = await addMusicFiles(value, selectedFiles);
      if (mounted.current) {
        onChange(result.value);
        setStatus(result.status);
      }
    } catch (error) {
      if (mounted.current)
        setError(error instanceof Error ? error.message : '音乐文件读取失败，请重新选择。');
    } finally {
      uploadInProgress.current = false;
      if (mounted.current) setIsUploading(false);
    }
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
        <span style={musicUploadDescriptionStyle}>
          仅支持 MP3，每个文件不超过 {maxAudioFileBytes / 1024 / 1024} MiB。
        </span>
      </div>
      <label style={musicUploadButtonStyle}>
        多选上传 MP3
        <input
          accept="audio/mpeg,.mp3"
          autoFocus={autoFocus}
          multiple
          onChange={handleUpload}
          disabled={isUploading}
          style={musicUploadInputStyle}
          type="file"
        />
      </label>
      {status ? (
        <div style={musicUploadSummaryStyle}>
          已添加 {status.added} 个，跳过重复 {status.duplicate} 个，忽略非 MP3 {status.invalid}{' '}
          个，超过大小限制 {status.oversized} 个。
        </div>
      ) : null}
      {error ? (
        <div role="alert" style={musicUploadSummaryStyle}>
          {error}
        </div>
      ) : null}
      {isUploading ? <div role="status">正在读取音乐文件…</div> : null}
      {value.files.length > 0 ? (
        <div data-music-upload-list="" style={musicUploadListStyle}>
          {value.files.map((file, index) => (
            <div key={`${file.path}-${index}`} style={musicUploadItemStyle}>
              <span style={musicUploadFileTextStyle}>
                <span style={musicUploadFileNameStyle}>{file.filename}</span>
                <span style={musicUploadFilePathStyle}>{file.path}</span>
              </span>
              <button
                onClick={() => onChange(removeMusicFile(value, index))}
                disabled={isUploading}
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

export function musicFilesField({
  label,
  description = '可一次选择多个 MP3；保留原文件名，重复曲目会自动跳过。',
}: MusicFilesFieldOptions): AssetsFormField<MusicFilesValue, MusicFilesValue, string[]> {
  return {
    kind: 'form',
    formKind: 'assets',
    directories: [musicPublicDirectory],
    Input(props) {
      return <MusicFilesInput description={description} label={label} {...props} />;
    },
    defaultValue() {
      return { files: [], availableFiles: [] };
    },
    parse(value, { external }) {
      return parseMusicFiles(value, external.get(musicPublicDirectory));
    },
    serialize: serializeMusicFiles,
    validate: validateMusicFiles,
    reader: { parse: normalizeMusicFilesFromStoredValue },
  };
}
