<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
            <head>
                <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
                <style type="text/css">
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; background-color: #f6f6f6; color: #333; line-height: 1.6; margin: 0; padding: 0; }
                    .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
                    .header { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 2rem; text-align: center; }
                    .header h1 { margin: 0 0 0.5rem 0; font-size: 2rem; color: #111; }
                    .header p { margin: 0; color: #666; }
                    .header a { color: #000; text-decoration: none; border-bottom: 2px solid #000; }
                    .item { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 1.5rem; transition: transform 0.2s ease; }
                    .item:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    .item h2 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                    .item h2 a { text-decoration: none; color: #111; }
                    .item h2 a:hover { color: #2563eb; }
                    .meta { font-size: 0.875rem; color: #888; margin-bottom: 1rem; }
                    .desc { color: #444; }
                    .alert { background: #eeffff; border: 1px solid #bde; color: #336699; padding: 1rem; border-radius: 4px; margin-bottom: 2rem; text-align: center; font-size: 0.9rem; }
                    @media (prefers-color-scheme: dark) {
                        body { background-color: #1a1a1a; color: #e5e5e5; }
                        .header, .item { background: #262626; box-shadow: none; border: 1px solid #333; }
                        .header h1, .item h2 a { color: #fff; }
                        .header a { color: #fff; border-bottom-color: #fff; }
                        .meta { color: #a3a3a3; }
                        .desc { color: #d4d4d4; }
                        .alert { background: #1e293b; border-color: #334155; color: #94a3b8; }
                        .item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="alert">
                        📢 这是一个 RSS 订阅源。建议使用 <a href="https://feedly.com" target="_blank">Feedly</a> 或 <a href="https://netnewswire.com" target="_blank">NetNewsWire</a> 等阅读器订阅。
                    </div>
                    <div class="header">
                        <h1><xsl:value-of select="/rss/channel/title"/></h1>
                        <p><xsl:value-of select="/rss/channel/description"/></p>
                        <p style="margin-top: 1rem;">
                            <a href="{/rss/channel/link}">⟵ 返回博客首页</a>
                        </p>
                    </div>
                    
                    <xsl:for-each select="/rss/channel/item">
                        <div class="item">
                            <h2>
                                <a href="{link}" target="_blank">
                                    <xsl:value-of select="title"/>
                                </a>
                            </h2>
                            <div class="meta">
                                发布于 <xsl:value-of select="pubDate"/>
                            </div>
                            <div class="desc">
                                <xsl:value-of select="description"/>
                            </div>
                        </div>
                    </xsl:for-each>
                </div>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
