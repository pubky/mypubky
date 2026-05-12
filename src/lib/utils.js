import { DEFAULT_BACKGROUNDS, SOCIAL_PLATFORMS } from "./config.js";

export function normalizeCardBackgroundMode(mode = "", legacyVisible = true) {
  if (mode === "dark" || mode === "blur" || mode === "clear") {
    return mode;
  }

  return legacyVisible === false ? "blur" : "dark";
}

export function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function shortenPubky(pubky = "") {
  if (!pubky) return "";
  if (pubky.length <= 10) return pubky;
  return `${pubky.slice(0, 4)}...${pubky.slice(-4)}`;
}

export function cn(...values) {
  return values.filter(Boolean).join(" ");
}

export function normalizeUrl(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (trimmed.startsWith("pubky://")) {
    const withoutScheme = trimmed.slice("pubky://".length);
    const pubky = withoutScheme.split("/").filter(Boolean)[0] || "";
    if (!pubky) return "";
    return `https://pubky.app/profile/${pubky}`;
  }

  if (emailPattern.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  if (lower.startsWith("mailto")) {
    const address = extractMailtoAddress(trimmed);
    if (!address) return "";
    return `mailto:${address}`;
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function canonicalizeStoredUrl(value = "") {
  const normalized = normalizeUrl(String(value || "").trim());
  if (!normalized) return "";

  if (isMailtoUrl(normalized)) {
    const address = extractMailtoAddress(normalized).split("?")[0].trim();
    return address ? `mailto:${address}` : "";
  }

  return normalized;
}

export function sanitizeBrowserUrl(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return "";
}

export function isMailtoUrl(value = "") {
  return String(value || "").trim().toLowerCase().startsWith("mailto:");
}

export function extractMailtoAddress(value = "") {
  let address = String(value || "").trim();
  if (!address) return "";

  while (/^mailto\s*:?\s*/i.test(address)) {
    address = address.replace(/^mailto\s*:?\s*/i, "").trim();
  }

  return address;
}

export function isValidMailtoUrl(value = "") {
  const normalized = canonicalizeStoredUrl(String(value || "").trim());
  if (!isMailtoUrl(normalized)) return false;

  const address = extractMailtoAddress(normalized).split("?")[0].trim();
  if (!address) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

function hostnameMatches(hostname = "", matcher = "") {
  const normalizedHostname = String(hostname || "").toLowerCase();
  const normalizedMatcher = String(matcher || "").toLowerCase();
  if (!normalizedHostname || !normalizedMatcher) return false;
  return normalizedHostname === normalizedMatcher || normalizedHostname.endsWith(`.${normalizedMatcher}`);
}

function getSocialPlatform(url = "") {
  const normalized = canonicalizeStoredUrl(url);
  if (!normalized || isMailtoUrl(normalized)) return null;

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();

  return (
    SOCIAL_PLATFORMS.find((platform) =>
      platform.key !== "pubky" &&
      platform.matchers.some((matcher) => {
        const normalizedMatcher = String(matcher || "").toLowerCase();
        if (!normalizedMatcher) return false;
        if (normalizedMatcher.endsWith("://")) {
          return protocol === normalizedMatcher;
        }
        return hostnameMatches(hostname, normalizedMatcher);
      })
    ) || null
  );
}

export function isSocialLink(url = "") {
  return Boolean(getSocialPlatform(url));
}

function resolveStoredLinkUrl(link = {}) {
  if (typeof link?.url === "string" && link.url.trim()) {
    return canonicalizeStoredUrl(link.url);
  }

  if (typeof link?.mailto === "string" && link.mailto.trim()) {
    const address = extractMailtoAddress(link.mailto);
    return address ? `mailto:${address}` : "";
  }

  return "";
}

export function splitLinks(links = [], extraSocials = []) {
  const socials = new Map();
  const buttons = [];

  for (const link of links) {
    const normalized = canonicalizeStoredUrl(resolveStoredLinkUrl(link));
    if (!normalized) continue;

    const platform = getSocialPlatform(normalized);

    if (platform) {
      socials.set(platform.key, {
        key: platform.key,
        label: platform.label,
        icon: platform.icon,
        url: normalized,
        title: link.title || platform.label
      });
      continue;
    }

    buttons.push({
      title: link.title || "Link",
      url: normalized
    });
  }

  for (const social of extraSocials) {
    const normalized = canonicalizeStoredUrl(social.url || "");
    if (!normalized || !social.key || social.key === "pubky") continue;
    const platform = SOCIAL_PLATFORMS.find((entry) => entry.key === social.key);
    socials.set(social.key, {
      key: social.key,
      label: platform?.label || social.key,
      icon: platform?.icon || social.key,
      url: normalized,
      title: social.title || platform?.label || social.key
    });
  }

  return {
    buttons,
    socials: SOCIAL_PLATFORMS.map((platform) => socials.get(platform.key)).filter(Boolean)
  };
}

export function mergeProfileData(pubkyProfile = {}, cardProfile = {}) {
  const unifiedLinks = Array.isArray(pubkyProfile.links) ? [...pubkyProfile.links] : [];
  const extraLinks = Array.isArray(cardProfile.extraLinks) ? cardProfile.extraLinks : [];
  const extraSocials = Array.isArray(cardProfile.extraSocials) ? cardProfile.extraSocials : [];
  const categorized = splitLinks(unifiedLinks.concat(extraLinks), extraSocials);
  const backgroundId = cardProfile.backgroundId || DEFAULT_BACKGROUNDS[0].id;
  const isCustomBackground = backgroundId === "custom";
  const fallbackBackground =
    DEFAULT_BACKGROUNDS.find((background) => background.id === backgroundId) ||
    DEFAULT_BACKGROUNDS[0];

  return {
    pubky: cardProfile.pubky || "",
    name: pubkyProfile.name || "",
    bio: pubkyProfile.bio || "",
    image: pubkyProfile.image || "",
    links: unifiedLinks,
    buttonLinks: categorized.buttons,
    socialLinks: categorized.socials,
    status: pubkyProfile.status || "",
    backgroundId,
    backgroundType:
      cardProfile.backgroundType ||
      (isCustomBackground ? "image" : fallbackBackground.type),
    backgroundUrl: cardProfile.backgroundUrl || fallbackBackground.src,
    cardPosition: cardProfile.cardPosition || "center",
    cardBackgroundMode: normalizeCardBackgroundMode(
      cardProfile.cardBackgroundMode,
      cardProfile.cardBackgroundVisible ?? true
    ),
    showLatestPost: cardProfile.showLatestPost ?? true,
    showTags: cardProfile.showTags ?? true,
    donateEnabled: cardProfile.donateEnabled ?? false,
    donateEndpoint: cardProfile.donateEndpoint || "",
    bitcoinAddress: cardProfile.bitcoinAddress || "",
    paykitMethods: Array.isArray(cardProfile.paykitMethods) ? cardProfile.paykitMethods : [],
    latestPosts: Array.isArray(cardProfile.latestPosts) ? cardProfile.latestPosts : [],
    tags: cardProfile.tags || []
  };
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(String(timestamp));
  if (Number.isNaN(date.getTime())) return "";

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clampUploadSize(file, maxBytes) {
  if (!file) return;
  if (file.size > maxBytes) {
    throw new Error(`File must be 10 MB or smaller.`);
  }
}

export function buildProfileUrl(pubky = "") {
  if (!pubky) return window.location.origin;
  return `${window.location.origin}/profile/${pubky}`;
}

export function download(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
