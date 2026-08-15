/**
 * Open-Slack URL and Client-Side Routing Utilities
 * Supports GitHub Pages base paths (e.g. /Open-Slack/) and local development (/)
 */

export function getBasePath(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  if (pathname.startsWith('/Open-Slack')) {
    return '/Open-Slack';
  }
  return '';
}

/**
 * Checks whether the current browser URL targets the Workspace App (/app)
 */
export function isAppRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/+$/, '');
  const basePath = getBasePath();
  const relativePath = basePath ? path.replace(basePath, '') : path;
  return relativePath === '/app' || relativePath.startsWith('/app/');
}

/**
 * Parses query parameters from window.location.search or hash
 */
export function getUrlParams(): {
  workspace: string | null;
  channel: string | null;
  messageId: string | null;
  invite: string | null;
} {
  if (typeof window === 'undefined') {
    return { workspace: null, channel: null, messageId: null, invite: null };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const workspace = searchParams.get('workspace');
  const channel = searchParams.get('channel');
  const messageId = searchParams.get('messageId');

  // Check hash for invite payloads
  let invite: string | null = null;
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    invite = hashParams.get('invite') || (window.location.hash.startsWith('#invite=') ? window.location.hash.slice(8) : null);
  }

  return { workspace, channel, messageId, invite };
}

/**
 * Generates the application URL for a given workspace name
 * Example: https://animesh.kundus.in/Open-Slack/app?workspace=Decentralized%20HQ
 */
export function getAppUrl(workspaceName?: string): string {
  const basePath = getBasePath();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const query = workspaceName ? `?workspace=${encodeURIComponent(workspaceName)}` : '';
  return `${origin}${basePath}/app${query}`;
}

/**
 * Generates the landing page root URL
 * Example: https://animesh.kundus.in/Open-Slack/
 */
export function getLandingUrl(): string {
  const basePath = getBasePath();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${basePath}/`;
}

/**
 * Generates a direct permalink to a specific chat message
 */
export function getMessagePermalink(
  workspaceName: string,
  channelId: string,
  messageId: string
): string {
  const basePath = getBasePath();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const query = new URLSearchParams({
    workspace: workspaceName,
    channel: channelId,
    messageId: messageId,
  }).toString();
  return `${origin}${basePath}/app?${query}`;
}

/**
 * Updates the browser address bar with the workspace app URL without reloading the page
 */
export function updateWorkspaceUrl(workspaceName: string, replace = false): void {
  if (typeof window === 'undefined') return;
  const basePath = getBasePath();
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set('workspace', workspaceName);
  
  // Preserve messageId or channel if already present
  const targetUrl = `${basePath}/app?${searchParams.toString()}${window.location.hash}`;
  
  if (replace) {
    window.history.replaceState({ workspace: workspaceName }, '', targetUrl);
  } else {
    window.history.pushState({ workspace: workspaceName }, '', targetUrl);
  }
}

/**
 * Updates the browser address bar to point back to the landing page
 */
export function updateLandingUrl(replace = false): void {
  if (typeof window === 'undefined') return;
  const basePath = getBasePath();
  const targetUrl = `${basePath}/${window.location.hash}`;
  if (replace) {
    window.history.replaceState({}, '', targetUrl);
  } else {
    window.history.pushState({}, '', targetUrl);
  }
}
