import {
    Github, Mail, MessageCircle, Send, Link as LinkIcon,
    Twitter, Instagram, Youtube, Phone, Globe,
    Linkedin, MessageSquare, Radio, Tv, BookOpen, Bookmark, Flame, Music
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * 根据图标类型返回对应的 Lucide 图标组件
 * @param iconType 图标类型标识符
 * @returns Lucide 图标组件
 */
export function getIconComponent(iconType: string): LucideIcon {
    switch (iconType) {
        case 'github': return Github;
        case 'mail': return Mail;
        case 'wechat': return MessageCircle;
        case 'qq': return Send;
        case 'twitter': return Twitter;
        case 'instagram': return Instagram;
        case 'bilibili': return Tv;
        case 'youtube': return Youtube;
        case 'telegram': return Send;
        case 'discord': return MessageSquare;
        case 'linkedin': return Linkedin;
        case 'weibo': return Radio;
        case 'zhihu': return BookOpen;
        case 'tiktok': return Music;
        case 'xiaohongshu': return Bookmark;
        case 'juejin': return Flame;
        case 'phone': return Phone;
        case 'globe': return Globe;
        default: return LinkIcon;
    }
}
