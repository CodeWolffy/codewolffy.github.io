<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    
    <!-- 月份映射模板 -->
    <xsl:template name="month-to-number">
        <xsl:param name="month"/>
        <xsl:choose>
            <xsl:when test="$month = 'Jan'">1</xsl:when>
            <xsl:when test="$month = 'Feb'">2</xsl:when>
            <xsl:when test="$month = 'Mar'">3</xsl:when>
            <xsl:when test="$month = 'Apr'">4</xsl:when>
            <xsl:when test="$month = 'May'">5</xsl:when>
            <xsl:when test="$month = 'Jun'">6</xsl:when>
            <xsl:when test="$month = 'Jul'">7</xsl:when>
            <xsl:when test="$month = 'Aug'">8</xsl:when>
            <xsl:when test="$month = 'Sep'">9</xsl:when>
            <xsl:when test="$month = 'Oct'">10</xsl:when>
            <xsl:when test="$month = 'Nov'">11</xsl:when>
            <xsl:when test="$month = 'Dec'">12</xsl:when>
            <xsl:otherwise><xsl:value-of select="$month"/></xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- 格式化日期模板：将 RFC-822 格式转为中文日期 -->
    <xsl:template name="format-date">
        <xsl:param name="date"/>
        <!-- RFC-822 格式: "Tue, 13 Jan 2026 00:00:00 GMT" -->
        <!-- 提取日期部分 -->
        <xsl:variable name="dateWithoutDay" select="substring-after($date, ', ')"/>
        <xsl:variable name="day" select="substring-before($dateWithoutDay, ' ')"/>
        <xsl:variable name="rest" select="substring-after($dateWithoutDay, ' ')"/>
        <xsl:variable name="monthAbbr" select="substring-before($rest, ' ')"/>
        <xsl:variable name="yearPart" select="substring-after($rest, ' ')"/>
        <xsl:variable name="year" select="substring-before($yearPart, ' ')"/>
        
        <xsl:variable name="month">
            <xsl:call-template name="month-to-number">
                <xsl:with-param name="month" select="$monthAbbr"/>
            </xsl:call-template>
        </xsl:variable>
        
        <xsl:value-of select="$year"/>年<xsl:value-of select="$month"/>月<xsl:value-of select="$day"/>日
    </xsl:template>
    
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
            <head>
                <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
                <style type="text/css">
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; background-color: #f6f6f6; color: #333; line-height: 1.6; margin: 0; padding: 0; }
                    .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
                    .header { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 2rem; text-align: center; }
                    .header h1 { margin: 0 0 0.5rem 0; font-size: 2rem; color: #111; }
                    .header p { margin: 0; color: #666; }
                    .header a { color: #2563eb; text-decoration: none; font-weight: 500; }
                    .header a:hover { text-decoration: underline; }
                    .stats { margin: 1rem 0 0.5rem; color: #666; font-size: 0.875rem; }
                    .stat-value { font-weight: 600; color: #333; }
                    .copy-btn { display: inline-flex; align-items: center; gap: 0.375rem; background: transparent; color: #666; border: 1px solid #ddd; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.8125rem; cursor: pointer; transition: all 0.15s ease; margin-top: 0.75rem; }
                    .copy-btn:hover { border-color: #2563eb; color: #2563eb; background: #f0f7ff; }
                    .copy-btn:active { transform: scale(0.98); }
                    .copy-btn svg { width: 14px; height: 14px; opacity: 0.7; }
                    .copy-btn.copied { border-color: #10b981; color: #10b981; background: #ecfdf5; }
                    .item { background: #fff; padding: 1.5rem 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 1rem; transition: transform 0.2s ease, box-shadow 0.2s ease; }
                    .item:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
                    .item h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600; }
                    .item h2 a { text-decoration: none; color: #111; }
                    .item h2 a:hover { color: #2563eb; }
                    .meta { font-size: 0.813rem; color: #888; margin-bottom: 0.75rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; }
                    .meta-item { display: flex; align-items: center; gap: 0.375rem; }
                    .meta svg { width: 14px; height: 14px; flex-shrink: 0; }
                    .desc { color: #555; font-size: 0.95rem; line-height: 1.7; }
                    .alert { background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); border: 1px solid #7dd3fc; color: #0369a1; padding: 1rem 1.25rem; border-radius: 10px; margin-bottom: 2rem; text-align: center; font-size: 0.9rem; }
                    .alert a { color: #0284c7; font-weight: 500; }
                    @media (prefers-color-scheme: dark) {
                        body { background-color: #0f0f0f; color: #e5e5e5; }
                        .header, .item { background: #1a1a1a; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid #262626; }
                        .header h1, .item h2 a { color: #f5f5f5; }
                        .header a { color: #60a5fa; }
                        .stats { color: #a3a3a3; }
                        .stat-value { color: #e5e5e5; }
                        .copy-btn { border-color: #404040; color: #a3a3a3; }
                        .copy-btn:hover { border-color: #60a5fa; color: #60a5fa; background: rgba(96, 165, 250, 0.1); }
                        .copy-btn.copied { border-color: #10b981; color: #10b981; background: rgba(16, 185, 129, 0.1); }
                        .item h2 a:hover { color: #60a5fa; }
                        .meta { color: #a3a3a3; }
                        .desc { color: #d4d4d4; }
                        .alert { background: linear-gradient(135deg, #172554 0%, #1e3a5f 100%); border-color: #1d4ed8; color: #93c5fd; }
                        .alert a { color: #60a5fa; }
                        .item:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.5); }
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
                        
                        <!-- 统计信息 -->
                        <p class="stats">共 <span class="stat-value"><xsl:value-of select="count(/rss/channel/item)"/></span> 篇文章</p>
                        
                        <!-- 复制订阅链接按钮 -->
                        <button class="copy-btn" id="copyBtn" onclick="copyRssLink()">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            <span id="copyText">复制订阅链接</span>
                        </button>
                        
                        <p style="margin-top: 1rem;">
                            <a href="{/rss/channel/link}">← 返回博客首页</a>
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
                                <!-- 作者信息 -->
                                <span class="meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    <xsl:value-of select="author"/>
                                </span>
                                <!-- 日期 -->
                                <span class="meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    <xsl:call-template name="format-date">
                                        <xsl:with-param name="date" select="pubDate"/>
                                    </xsl:call-template>
                                </span>
                            </div>
                            <div class="desc">
                                <xsl:value-of select="description"/>
                            </div>
                        </div>
                    </xsl:for-each>
                </div>
                
                <script>
                    function copyRssLink() {
                        var url = window.location.href;
                        navigator.clipboard.writeText(url).then(function() {
                            var btn = document.getElementById('copyBtn');
                            var text = document.getElementById('copyText');
                            btn.classList.add('copied');
                            text.textContent = '已复制！';
                            setTimeout(function() {
                                btn.classList.remove('copied');
                                text.textContent = '复制订阅链接';
                            }, 2000);
                        });
                    }
                </script>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
