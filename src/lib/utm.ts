export function addUtmParams(url: string, issueNumber: number, content: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'fullstackbulletin.com');
    u.searchParams.set('utm_medium', 'newsletter');
    u.searchParams.set('utm_campaign', `fullstackBulletin-${issueNumber}`);
    u.searchParams.set('utm_content', content);
    return u.toString();
  } catch {
    return url;
  }
}
