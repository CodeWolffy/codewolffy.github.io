import { getSiteSettings } from '@/utils/site-settings';
import { createRobotsTxt } from '@/utils/seo';

export const prerender = true;

export async function GET() {
  const settings = await getSiteSettings();
  return new Response(createRobotsTxt(settings.urls.primary), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
