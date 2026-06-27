interface CopyrightProps {
  author?: string;
  licenseName?: string;
  licenseUrl?: string;
  noticePrefix?: string;
  noticeSuffix?: string;
}

export function Copyright({
  author = 'CodeWolffy',
  licenseName = 'CC BY-NC-SA 4.0',
  licenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  noticePrefix = '本博客所有文章除特别声明外，均采用',
  noticeSuffix = '许可协议。文章可能参考了其他优秀文章，如有侵权请联系删除。',
}: CopyrightProps) {
  return (
    <div className="my-2 p-2 rounded-lg bg-secondary/50 border border-border text-sm">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
          <span className="font-semibold text-muted-foreground min-w-16">文章作者：</span>
          <span>{author}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
          <span className="font-semibold text-muted-foreground min-w-16">版权声明：</span>
          <span>
            {noticePrefix}{' '}
            <a
              href={licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {licenseName}
            </a>{' '}
            {noticeSuffix}
          </span>
        </div>
      </div>
    </div>
  );
}
