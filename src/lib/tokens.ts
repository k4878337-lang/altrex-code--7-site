import { PlatformTokens } from '../types.js';

const TOKENS_STORAGE_KEY = 'altrex_platform_tokens_v1';

export function getStoredTokens(): PlatformTokens {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load platform tokens:', e);
    return {};
  }
}

export function saveStoredTokens(tokens: PlatformTokens): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error('Failed to save platform tokens:', e);
  }
}

export function hasAnyToken(tokens?: PlatformTokens): boolean {
  const t = tokens || getStoredTokens();
  return Boolean(t.vercel || t.netlify || t.github || t.cloudflareToken || (t.neocitiesUser && t.neocitiesPass));
}

export function isSandboxEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location.hostname.toLowerCase();
    const isIframe = window.self !== window.top;
    return (
      isIframe ||
      host.includes('studio.google') ||
      host.includes('aistudio') ||
      host.includes('run.app') ||
      host.includes('webcontainer') ||
      host.includes('codesandbox') ||
      host.includes('stackblitz') ||
      host.includes('localhost')
    );
  } catch {
    return true;
  }
}
