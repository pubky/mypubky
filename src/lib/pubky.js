import { AuthFlowKind, Client, Pubky, resolvePubky } from "@synonymdev/pubky";
import {
  AUTH_CAPABILITY_ENTRIES,
  AUTH_CAPABILITIES,
  CARD_SETTINGS_PATH,
  CDN_URL,
  DEFAULT_BACKGROUNDS,
  FILES_PATH,
  NEXUS_URL,
  PAYKIT_BITCOIN_METHOD_IDS,
  PAYKIT_PATH_PREFIX,
  PKARR_RELAYS,
  PUBKY_POSTS_PATH,
  PUBKY_PROFILE_PATH,
  RELAY_URL,
  SOCIAL_PLATFORMS,
  STORAGE_KEYS
} from "./config.js";
import {
  canonicalizeStoredUrl,
  extractMailtoAddress,
  formatRelativeTime,
  isMailtoUrl,
  mergeProfileData,
  normalizeCardBackgroundMode,
  normalizeUrl,
  shortenPubky,
  uid
} from "./utils.js";

const AUTH_POLL_INTERVAL_MS = 100;
const AUTH_POLL_MAX_ATTEMPTS = 3000;
const NEXUS_POST_LOOKUP_LIMIT = 5;
const NEXUS_TAG_LIMIT = 8;
const RETRYABLE_STATUS_CODES = new Set([404, 408, 429, 500, 502, 503, 504]);
const CROCKFORD_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

let sdkInstance;
let activeSession = null;

function summarizeErrorMessage(error) {
  if (!error) return "";
  if (error instanceof Error) return error.message || error.name || "";
  return String(error);
}

function readSessionDiagnostic() {
  const raw = localStorage.getItem(STORAGE_KEYS.lastSessionDiagnostic);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEYS.lastSessionDiagnostic);
    return null;
  }
}

function writeSessionDiagnostic(reason, details = {}) {
  const diagnostic = {
    reason,
    at: Date.now(),
    ...details
  };

  localStorage.setItem(STORAGE_KEYS.lastSessionDiagnostic, JSON.stringify(diagnostic));

  if (typeof window !== "undefined") {
    window.__mypubkySessionDiagnostic = diagnostic;
  }

  console.info("[mypubky] session diagnostic", diagnostic);
  return diagnostic;
}

function clearSessionDiagnostic() {
  localStorage.removeItem(STORAGE_KEYS.lastSessionDiagnostic);

  if (typeof window !== "undefined" && "__mypubkySessionDiagnostic" in window) {
    delete window.__mypubkySessionDiagnostic;
  }
}

function createSessionStateError(message, reason, diagnostic = null) {
  const error = new Error(message);
  error.name = "SessionStateError";
  error.sessionReason = reason;
  error.requiresReauth = [
    "no-session",
    "restore-failed",
    "expired",
    "capability-mismatch",
    "write-forbidden"
  ].includes(reason);
  error.diagnostic = diagnostic;
  return error;
}

function getSdk() {
  if (!sdkInstance) {
    sdkInstance = Pubky.withClient(new Client({ pkarr: { relays: PKARR_RELAYS } }));
  }
  return sdkInstance;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pubkyUri(pubky, path) {
  return `pubky://${pubky}${path}`;
}

function pubkyAddress(pubky, path) {
  return `pubky${pubky}${path}`;
}

function getPublicAddresses(pubky, path) {
  return [pubkyAddress(pubky, path), pubkyUri(pubky, path)];
}

function isDirectMediaUrl(source = "") {
  return (
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("data:") ||
    source.startsWith("blob:")
  );
}

function isResponseNotFound(response) {
  return response?.status === 404;
}

function extractSessionPubky(session) {
  if (!session) return "";

  try {
    if (typeof session?.info?.publicKey?.z32 === "function") {
      return session.info.publicKey.z32();
    }
    if (typeof session?.info?.publicKey?.toString === "function") {
      const value = session.info.publicKey.toString();
      return typeof value === "string" && value.startsWith("pubky")
        ? value.replace(/^pubky/, "")
        : value || "";
    }
  } catch {
    // ignore and fall through
  }

  return "";
}

function getStoredSessionExport() {
  return localStorage.getItem(STORAGE_KEYS.lastSession) || "";
}

function clearStoredSession({ keepPubky = false } = {}) {
  localStorage.removeItem(STORAGE_KEYS.lastSession);
  if (!keepPubky) {
    localStorage.removeItem(STORAGE_KEYS.lastPubky);
  }
}

function invalidateStoredSession({ clearStorage = true, keepPubky = false, reason = "", details = {} } = {}) {
  activeSession = null;
  if (clearStorage) {
    clearStoredSession({ keepPubky });
  }
  if (reason) {
    writeSessionDiagnostic(reason, details);
  }
}

async function getStoredSession() {
  if (activeSession) {
    return activeSession;
  }

  const sessionExport = getStoredSessionExport();
  if (!sessionExport) return null;

  try {
    const sdk = getSdk();
    const session = await sdk.restoreSession(sessionExport);
    const pubky = extractSessionPubky(session);
    if (!pubky) {
      clearStoredSession();
      writeSessionDiagnostic("restore-missing-pubky", {
        message: "Stored session restored without a valid public key."
      });
      return null;
    }

    localStorage.setItem(STORAGE_KEYS.lastPubky, pubky);
    activeSession = session;
    if (hasRequiredCapabilities(session)) {
      clearSessionDiagnostic();
    } else {
      writeSessionDiagnostic("restored-missing-capabilities", {
        pubky,
        capabilities: getSessionCapabilities(session)
      });
    }
    return session;
  } catch (error) {
    activeSession = null;
    writeSessionDiagnostic("restore-failed", {
      message: summarizeErrorMessage(error)
    });
    return null;
  }
}

function parseCapabilityEntry(entry = "") {
  const separatorIndex = entry.lastIndexOf(":");
  if (separatorIndex < 0) {
    return { scope: entry, actions: "" };
  }

  return {
    scope: entry.slice(0, separatorIndex),
    actions: entry.slice(separatorIndex + 1)
  };
}

function normalizeCapabilityScope(scope = "") {
  if (!scope) return "/";
  if (scope === "/") return "/";
  return scope.endsWith("/") ? scope : `${scope}/`;
}

function capabilityAllows(grantedEntry, requiredEntry) {
  const granted = parseCapabilityEntry(grantedEntry);
  const required = parseCapabilityEntry(requiredEntry);
  const grantedScope = normalizeCapabilityScope(granted.scope);
  const requiredScope = normalizeCapabilityScope(required.scope);

  if (!(requiredScope === grantedScope || requiredScope.startsWith(grantedScope))) {
    return false;
  }

  return [...required.actions].every((action) => granted.actions.includes(action));
}

function getSessionCapabilities(session) {
  if (Array.isArray(session?.info?.capabilities)) {
    return session.info.capabilities;
  }

  if (Array.isArray(session?.capabilities)) {
    return session.capabilities;
  }

  return [];
}

function hasRequiredCapabilities(session, requiredEntries = AUTH_CAPABILITY_ENTRIES) {
  const grantedEntries = getSessionCapabilities(session);
  if (!grantedEntries.length) return false;

  return requiredEntries.every((requiredEntry) =>
    grantedEntries.some((grantedEntry) => capabilityAllows(grantedEntry, requiredEntry))
  );
}

function createCanceledError() {
  const error = new Error("Auth flow canceled");
  error.name = "AuthFlowCanceled";
  return error;
}

function extractStatusCode(error) {
  if (!error || typeof error !== "object") return undefined;

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  if (!("data" in error) || !error.data || typeof error.data !== "object") {
    return undefined;
  }

  return typeof error.data.statusCode === "number" ? error.data.statusCode : undefined;
}

function isRetryableRelayPollError(error) {
  if (error && typeof error === "object" && error.name === "RequestError") {
    const statusCode = extractStatusCode(error);
    return !statusCode || RETRYABLE_STATUS_CODES.has(statusCode);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timed out") || message.includes("timeout")) return true;
    if (message.includes("gateway") || message.includes("service unavailable")) return true;
  }

  return false;
}

function createCancelableAuthApproval(flow) {
  let canceled = false;
  let freed = false;

  const cancelAuthFlow = () => {
    canceled = true;
    if (freed) return;
    freed = true;
    try {
      flow.free();
    } catch {
      // ignore duplicate frees
    }
  };

  const awaitApproval = (async () => {
    await sleep(0);

    let attempts = 0;
    for (;;) {
      if (canceled) throw createCanceledError();
      if (++attempts > AUTH_POLL_MAX_ATTEMPTS) {
        throw new Error("Auth flow timed out.");
      }

      try {
        const maybeSession = await flow.tryPollOnce();
        if (maybeSession) return maybeSession;
      } catch (error) {
        if (canceled) throw createCanceledError();
        if (isRetryableRelayPollError(error)) {
          await sleep(AUTH_POLL_INTERVAL_MS);
          continue;
        }
        throw error;
      }

      await sleep(AUTH_POLL_INTERVAL_MS);
    }
  })();

  return {
    awaitApproval: awaitApproval.finally(() => cancelAuthFlow()),
    cancelAuthFlow
  };
}

async function fetchPublicResponse(sdk, url) {
  const response = await sdk.publicStorage.get(url);
  if (isResponseNotFound(response)) return null;
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response;
}

async function fetchJsonPublic(sdk, url) {
  const response = await fetchPublicResponse(sdk, url);
  if (!response) return null;
  return response.json();
}

async function fetchJsonPublicByPath(sdk, pubky, path) {
  let lastError = null;

  for (const address of getPublicAddresses(pubky, path)) {
    try {
      return await sdk.publicStorage.getJson(address);
    } catch (error) {
      const statusCode = extractStatusCode(error);
      if (statusCode === 404) continue;
      lastError = error;
    }

    try {
      const response = await sdk.client.fetch(resolvePubky(address));
      if (isResponseNotFound(response)) continue;
      if (!response.ok) throw new Error(`Failed to load ${address}`);
      return await response.json();
    } catch (error) {
      const statusCode = extractStatusCode(error);
      if (statusCode === 404) continue;
      lastError = error;
    }
  }

  if (lastError) {
    console.warn(`Unable to load public JSON at ${path} for ${pubky}.`, lastError);
  }

  return null;
}

async function fetchRemoteJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.json();
}

function buildNexusUserViewUrl(pubky) {
  const url = new URL(`${NEXUS_URL}/v0/user/${encodeURIComponent(pubky)}`);
  url.searchParams.set("depth", "1");
  return url.toString();
}

function buildNexusUserTagsUrl(pubky) {
  const url = new URL(`${NEXUS_URL}/v0/user/${encodeURIComponent(pubky)}/tags`);
  url.searchParams.set("limit_tags", String(NEXUS_TAG_LIMIT));
  return url.toString();
}

function buildNexusAuthorPostsUrl(pubky) {
  const url = new URL(`${NEXUS_URL}/v0/stream/posts/keys`);
  url.searchParams.set("source", "author");
  url.searchParams.set("author_id", pubky);
  url.searchParams.set("limit", String(NEXUS_POST_LOOKUP_LIMIT));
  url.searchParams.set("order", "descending");
  return url.toString();
}

function buildNexusPostUrl(authorPubky, postId) {
  return `${NEXUS_URL}/v0/post/${encodeURIComponent(authorPubky)}/${encodeURIComponent(postId)}`;
}

async function fetchJsonSessionByPath(session, path) {
  try {
    return await session.storage.getJson(path);
  } catch (error) {
    const statusCode = extractStatusCode(error);
    if (statusCode === 404) return null;
    throw error;
  }
}

async function putJson(session, path, payload) {
  await session.storage.putJson(path, payload);
}

async function deletePath(session, path) {
  try {
    await session.storage.delete(path);
  } catch (error) {
    const statusCode = extractStatusCode(error);
    if (statusCode === 404) return;
    throw error;
  }
}

async function putFile(session, path, file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  await session.storage.putBytes(path, bytes);
}

function buildPaykitMethodPath(methodId) {
  return `${PAYKIT_PATH_PREFIX}/${methodId}`;
}

function getPaykitBitcoinMethodId(bitcoinAddress = "") {
  const normalized = String(bitcoinAddress || "").trim().toLowerCase();
  if (normalized.startsWith("bc1p")) return PAYKIT_BITCOIN_METHOD_IDS.p2tr;
  if (normalized.startsWith("bc1q")) {
    return normalized.length > 50
      ? PAYKIT_BITCOIN_METHOD_IDS.p2wsh
      : PAYKIT_BITCOIN_METHOD_IDS.p2wpkh;
  }
  return "";
}

function getManagedPaykitPaths() {
  return Object.values(PAYKIT_BITCOIN_METHOD_IDS).map((methodId) =>
    buildPaykitMethodPath(methodId)
  );
}

async function syncPaykitEndpoint(session, enabled, bitcoinAddress = "") {
  const trimmedAddress = bitcoinAddress.trim();
  const methodId = getPaykitBitcoinMethodId(trimmedAddress);
  const paykitPath = methodId ? buildPaykitMethodPath(methodId) : "";
  const stalePaths = getManagedPaykitPaths().filter((path) => path !== paykitPath);

  if (enabled && trimmedAddress && paykitPath) {
    await Promise.all([
      putJson(session, paykitPath, { value: trimmedAddress }),
      ...stalePaths.map((path) => deletePath(session, path))
    ]);
    return;
  }

  await Promise.all(getManagedPaykitPaths().map((path) => deletePath(session, path)));
}

function createPubkyAppProfile(draft) {
  const prioritizedLinks = [];
  const seen = new Set();

  for (const social of draft.socialLinks || []) {
    const normalizedUrl = canonicalizeStoredUrl(social.url || "");
    const title = String(social.label || social.key || "").trim().slice(0, 100);
    if (!normalizedUrl || !title || isMailtoUrl(normalizedUrl)) continue;
    const fingerprint = createLinkFingerprint({ title, url: normalizedUrl });
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    prioritizedLinks.push({ title, url: normalizedUrl });
  }

  for (const link of draft.buttonLinks || []) {
    const normalizedUrl = canonicalizeStoredUrl(link.url || "");
    const title = String(link.title || "").trim().slice(0, 100);
    if (!normalizedUrl || !title || isMailtoUrl(normalizedUrl)) continue;
    const fingerprint = createLinkFingerprint({ title, url: normalizedUrl });
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    prioritizedLinks.push({ title, url: normalizedUrl });
  }

  return {
    name: draft.name.trim(),
    bio: draft.bio.trim(),
    image: draft.image || "",
    links: prioritizedLinks.slice(0, 5).map((link) => ({
      title: link.title,
      url: link.url.slice(0, 300)
    })),
    status: draft.status?.trim() || ""
  };
}

function validateDraft(draft) {
  const name = draft.name.trim();
  const bio = draft.bio.trim();

  if (name.length < 3 || name.length > 50) {
    throw new Error("Name must be between 3 and 50 characters.");
  }

  if (bio.length > 160) {
    throw new Error("Bio must be 160 characters or fewer.");
  }

  if (draft.buttonLinks.length > 10) {
    throw new Error("Use up to 10 button links in this first version.");
  }

  if (draft.bitcoinAddress && draft.bitcoinAddress.trim().length > 120) {
    throw new Error("Bitcoin address must be 120 characters or fewer.");
  }

  if (draft.donateEnabled && draft.bitcoinAddress && !getPaykitBitcoinMethodId(draft.bitcoinAddress)) {
    throw new Error("Use a bc1q or bc1p Bitcoin address for Paykit donations.");
  }
}

function createLinkFingerprint(link = {}) {
  return `${String(link.title || "").trim()}\u0000${normalizeUrl(link.url || "")}`;
}

function serializeCardLink(link = {}) {
  const normalizedUrl = normalizeUrl(link.url || "");
  const title = String(link.title || "").trim().slice(0, 100);

  if (isMailtoUrl(normalizedUrl)) {
    const address = extractMailtoAddress(normalizedUrl);
    return {
      title,
      mailto: address
    };
  }

  return {
    title,
    url: normalizedUrl.slice(0, 300)
  };
}

function normalizeDraftLink(link = {}) {
  return {
    title: String(link.title || "").trim().slice(0, 100),
    url: normalizeUrl(link.url || "")
  };
}

function normalizeDraftSocial(platform = {}, social = {}) {
  if (platform.key === "pubky") {
    return {
      key: platform.key,
      label: platform.label,
      title: String(platform.label || platform.key || "").trim().slice(0, 100),
      url: ""
    };
  }

  return {
    key: platform.key,
    label: platform.label,
    title: String(platform.label || platform.key || "").trim().slice(0, 100),
    url: normalizeUrl(social.url || "")
  };
}

function createCardSettings(draft, sharedLinks) {
  const remainingSharedLinks = new Map();

  for (const link of sharedLinks) {
    const fingerprint = createLinkFingerprint(link);
    remainingSharedLinks.set(fingerprint, (remainingSharedLinks.get(fingerprint) || 0) + 1);
  }

  const overflowLinks = draft.sharedLinks.filter((link) => {
    const fingerprint = createLinkFingerprint(link);
    const remaining = remainingSharedLinks.get(fingerprint) || 0;
    if (remaining > 0) {
      remainingSharedLinks.set(fingerprint, remaining - 1);
      return false;
    }
    return true;
  });

  return {
    pubky: draft.pubky,
    backgroundId: draft.backgroundId,
    backgroundType: draft.backgroundType,
    backgroundUrl: draft.backgroundUrl,
    cardPosition: draft.cardPosition,
    cardBackgroundMode: normalizeCardBackgroundMode(
      draft.cardBackgroundMode,
      draft.cardBackgroundVisible ?? true
    ),
    showLatestPost: draft.showLatestPost,
    showTags: draft.showTags,
    donateEnabled: draft.donateEnabled,
    donateEndpoint: draft.donateEnabled ? draft.pubky : "",
    bitcoinAddress: draft.bitcoinAddress.trim(),
    extraLinks: overflowLinks.map((link) => serializeCardLink(link)),
    extraSocials: draft.extraSocials
  };
}

function deriveUnifiedLinks(buttonLinks = [], socialLinks = []) {
  const unified = [];

  for (const link of buttonLinks) {
    if (!link.url || !link.title) continue;
    unified.push({
      title: link.title,
      url: normalizeUrl(link.url)
    });
  }

  for (const social of socialLinks) {
    if (!social.url) continue;
    unified.push({
      title: social.title || social.label || social.key,
      url: normalizeUrl(social.url)
    });
  }

  return unified;
}

function normalizePublicStorageAddress(source = "", ownerPubky = "") {
  if (!source) return "";
  if (source.startsWith("pubky://")) {
    return `pubky${source.slice("pubky://".length)}`;
  }
  if (source.startsWith("pubky")) {
    return source;
  }
  if (source.startsWith("/pub/") && ownerPubky) {
    return pubkyAddress(ownerPubky, source);
  }
  return "";
}

function getAttachmentSource(attachment) {
  if (!attachment) return "";
  if (typeof attachment === "string") return attachment.trim();
  if (typeof attachment?.url === "string") return attachment.url.trim();
  if (typeof attachment?.path === "string") return attachment.path.trim();
  if (typeof attachment?.src === "string") return attachment.src.trim();
  if (typeof attachment?.source === "string") return attachment.source.trim();
  if (typeof attachment?.file === "string") return attachment.file.trim();
  if (typeof attachment?.file?.url === "string") return attachment.file.url.trim();
  if (typeof attachment?.file?.path === "string") return attachment.file.path.trim();
  return "";
}

function isVideoAttachmentSource(source = "") {
  const value = String(source || "").toLowerCase();
  return [".mp4", ".webm", ".mov", ".m4v", ".ogg"].some((extension) => value.includes(extension));
}

function isImageAttachmentSource(source = "") {
  const value = String(source || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"].some((extension) => value.includes(extension));
}

function inferAttachmentType(attachment, source = "") {
  const candidates = [
    attachment?.type,
    attachment?.kind,
    attachment?.mime,
    attachment?.mimeType,
    attachment?.contentType,
    attachment?.mediaType,
    attachment?.file?.type,
    attachment?.file?.mime,
    attachment?.file?.mimeType
  ]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);

  if (candidates.some((value) => value.includes("video"))) {
    return "video";
  }

  if (candidates.some((value) => value.includes("image"))) {
    return "image";
  }

  if (isVideoAttachmentSource(source)) {
    return "video";
  }

  if (isImageAttachmentSource(source)) {
    return "image";
  }

  return "";
}

function parsePubkyFileReference(source = "", ownerPubky = "") {
  if (!source) return null;

  let normalizedSource = source.trim();

  if (normalizedSource.startsWith("/pub/") && ownerPubky) {
    normalizedSource = pubkyUri(ownerPubky, normalizedSource);
  }

  const match = normalizedSource.match(
    /^pubky:\/\/([^/]+)\/pub\/[^/]+\/files\/([^/?#]+)$/i
  );

  if (!match) return null;

  return {
    pubky: match[1],
    fileId: match[2]
  };
}

function buildCdnFileUrl(source = "", ownerPubky = "", variant = "main") {
  const reference = parsePubkyFileReference(source, ownerPubky);
  if (!reference) return "";
  return `${CDN_URL}/files/${encodeURIComponent(reference.pubky)}/${encodeURIComponent(reference.fileId)}/${variant}`;
}

function buildCdnAvatarUrl(pubky = "") {
  if (!pubky) return "";
  return `${CDN_URL}/avatar/${encodeURIComponent(pubky)}`;
}

async function loadMediaObjectUrl(sdk, source, ownerPubky = "") {
  const address = normalizePublicStorageAddress(source, ownerPubky);
  if (!address) return "";

  const response = await fetchPublicResponse(sdk, address);
  if (!response) return "";

  const blob = await response.blob();
  if (!blob.size) return "";

  return URL.createObjectURL(blob);
}

function fallbackMediaSource(source = "", ownerPubky = "") {
  if (!source) return "";
  if (isDirectMediaUrl(source)) {
    return source;
  }

  const normalizedAddress = normalizePublicStorageAddress(source, ownerPubky);
  if (normalizedAddress) {
    const cdnFileUrl = buildCdnFileUrl(source, ownerPubky);
    if (cdnFileUrl) {
      return cdnFileUrl;
    }

    try {
      return resolvePubky(normalizedAddress);
    } catch {
      return "";
    }
  }

  return "";
}

async function resolvePubkyMediaUrl(sdk, source, ownerPubky = "") {
  if (!source) return "";
  if (isDirectMediaUrl(source)) {
    return source;
  }

  try {
    const blobUrl = await loadMediaObjectUrl(sdk, source, ownerPubky);
    if (blobUrl) return blobUrl;
  } catch {
    // Fall through to resolver-based fallback.
  }

  const cdnFileUrl = buildCdnFileUrl(source, ownerPubky);
  if (cdnFileUrl) {
    return cdnFileUrl;
  }

  try {
    const address = normalizePublicStorageAddress(source, ownerPubky) || fallbackMediaSource(source, ownerPubky);
    return resolvePubky(address);
  } catch {
    return fallbackMediaSource(source, ownerPubky);
  }
}

function normalizeListedAddress(pubky, entry) {
  if (typeof entry === "string") {
    return entry.startsWith("pubky") ? entry : pubkyUri(pubky, entry);
  }
  if (typeof entry?.url === "string") {
    return entry.url;
  }
  if (typeof entry?.path === "string") {
    return entry.path.startsWith("pubky") ? entry.path : pubkyUri(pubky, entry.path);
  }
  return "";
}

async function loadNexusUserView(pubky) {
  try {
    return await fetchRemoteJson(buildNexusUserViewUrl(pubky));
  } catch (error) {
    console.warn(`Unable to load Nexus user view for ${pubky}.`, error);
    return null;
  }
}

function normalizeNexusTags(tags = []) {
  return tags
    .map((tag) => ({
      label: String(tag?.label || "").trim(),
      count:
        Number(tag?.taggers_count) ||
        (Array.isArray(tag?.taggers) ? tag.taggers.length : Array.isArray(tag?.taggers_id) ? tag.taggers_id.length : 0)
    }))
    .filter((tag) => tag.label)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, NEXUS_TAG_LIMIT);
}

async function loadProfileTags(pubky, nexusUserView = null) {
  const fromView = normalizeNexusTags(nexusUserView?.tags);
  if (fromView.length) return fromView;

  try {
    const data = await fetchRemoteJson(buildNexusUserTagsUrl(pubky));
    return normalizeNexusTags(Array.isArray(data) ? data : []);
  } catch (error) {
    console.warn(`Unable to load profile tags for ${pubky}.`, error);
    return [];
  }
}

function extractPostIdFromUri(uri = "") {
  return uri.split("/").filter(Boolean).pop() || "";
}

function decodeCrockfordBase32(value = "") {
  let result = 0n;

  for (const rawCharacter of value.toUpperCase()) {
    const character = rawCharacter === "O" ? "0" : rawCharacter === "I" || rawCharacter === "L" ? "1" : rawCharacter;
    const index = CROCKFORD_BASE32_ALPHABET.indexOf(character);
    if (index < 0) return 0;
    result = (result * 32n) + BigInt(index);
  }

  return Number(result);
}

function normalizeLatestPost(authorPubky, payload) {
  const details = payload?.details || payload || {};
  const content = String(details.content || "").trim();
  const attachments = Array.isArray(details.attachments) ? details.attachments.filter(Boolean) : [];

  if (!content && !attachments.length) {
    return null;
  }

  return {
    content,
    kind: details.kind || "short",
    attachments,
    uri: details.uri || "",
    relativeTime: formatRelativeTime(details.indexed_at || 0),
    authorName: "",
    authorPubkyFull: authorPubky,
    authorPubky: shortenPubky(authorPubky),
    indexedAt: details.indexed_at || 0,
    tags: Array.isArray(payload?.tags) ? payload.tags : []
  };
}

async function loadLatestPostsFromNexus(pubky) {
  try {
    const stream = await fetchRemoteJson(buildNexusAuthorPostsUrl(pubky));
    const postKeys = Array.isArray(stream?.post_keys) ? stream.post_keys : [];
    const posts = [];

    for (const postKey of postKeys) {
      const [authorPubky, postId] = String(postKey).split(":");
      if (!authorPubky || !postId) continue;

      const post = await fetchRemoteJson(buildNexusPostUrl(authorPubky, postId));
      const normalized = normalizeLatestPost(authorPubky, post);
      if (normalized) {
        posts.push(normalized);
      }

      if (posts.length >= 3) {
        return posts;
      }
    }
  } catch (error) {
    console.warn(`Unable to load latest Nexus posts for ${pubky}.`, error);
  }

  return [];
}

async function loadLatestPostsFromHomeserver(sdk, pubky) {
  let postIndex = [];

  try {
    postIndex = await sdk.publicStorage.list(pubkyAddress(pubky, PUBKY_POSTS_PATH), null, true, 3, false);
  } catch {
    try {
      postIndex = await sdk.publicStorage.list(pubkyUri(pubky, PUBKY_POSTS_PATH), null, true, 3, false);
    } catch {
      postIndex = [];
    }
  }

  if (!Array.isArray(postIndex) || !postIndex.length) return [];

  const posts = [];

  for (const listedPost of postIndex) {
    const latestUrl = normalizeListedAddress(pubky, listedPost);
    if (!latestUrl) continue;

    try {
      const data = await fetchJsonPublic(sdk, latestUrl);
      if (!data) continue;
      const postId = extractPostIdFromUri(latestUrl);
      const normalized = {
        content: String(data.content || "").trim(),
        kind: data.kind || "short",
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        parent: data.parent || null,
        uri: latestUrl,
        relativeTime: formatRelativeTime(decodeCrockfordBase32(postId)),
        authorName: "",
        authorPubkyFull: pubky,
        authorPubky: shortenPubky(pubky),
        indexedAt: decodeCrockfordBase32(postId),
        tags: []
      };

      if (normalized.content || normalized.attachments.length) {
        posts.push(normalized);
      }
    } catch {
      // skip bad post entries
    }
  }

  return posts;
}

async function loadLatestPosts(sdk, pubky) {
  const nexusPosts = await loadLatestPostsFromNexus(pubky);
  if (nexusPosts.length) return nexusPosts.slice(0, 3);
  const homeserverPosts = await loadLatestPostsFromHomeserver(sdk, pubky);
  return homeserverPosts.slice(0, 3);
}

function getBackgroundById(backgroundId) {
  return DEFAULT_BACKGROUNDS.find((entry) => entry.id === backgroundId) || DEFAULT_BACKGROUNDS[0];
}

export async function createAuthFlow() {
  const sdk = getSdk();
  const authFlow = sdk.startAuthFlow(AUTH_CAPABILITIES, AuthFlowKind.signin(), RELAY_URL);
  const { awaitApproval, cancelAuthFlow } = createCancelableAuthApproval(authFlow);

  return {
    authFlow,
    authUrl: authFlow.authorizationUrl,
    awaitApproval,
    cancelAuthFlow
  };
}

export async function waitForAuth(approvalPromise) {
  const session = await approvalPromise;
  const pubky = extractSessionPubky(session);
  activeSession = session;
  clearSessionDiagnostic();

  if (pubky) {
    localStorage.setItem(STORAGE_KEYS.lastPubky, pubky);
  }

  if (typeof session?.export === "function") {
    localStorage.setItem(STORAGE_KEYS.lastSession, session.export());
  }

  return {
    session,
    pubky
  };
}

export async function restoreSession() {
  const session = await getStoredSession();
  return {
    pubky: extractSessionPubky(session),
    diagnostic: readSessionDiagnostic(),
    hasRequiredCapabilities: session ? hasRequiredCapabilities(session) : false
  };
}

export async function signOut() {
  const session = await getStoredSession();
  activeSession = null;
  clearStoredSession();
  clearSessionDiagnostic();

  if (!session || typeof session.signout !== "function") return;

  try {
    await session.signout();
  } catch {
    // ignore signout failures and still clear local state
  }
}

export async function loadProfileBundle(pubky) {
  const sdk = getSdk();
  const session = await getStoredSession();
  const sessionPubky = extractSessionPubky(session);
  const ownSession = session && sessionPubky === pubky ? session : null;

  const [sessionPubkyProfile, sessionCardSettings] = ownSession
    ? await Promise.all([
        fetchJsonSessionByPath(ownSession, PUBKY_PROFILE_PATH),
        fetchJsonSessionByPath(ownSession, CARD_SETTINGS_PATH)
      ])
    : [null, null];

  const [publicPubkyProfile, publicCardSettings, nexusUserView, latestPosts] = await Promise.all([
    fetchJsonPublicByPath(sdk, pubky, PUBKY_PROFILE_PATH),
    fetchJsonPublicByPath(sdk, pubky, CARD_SETTINGS_PATH),
    loadNexusUserView(pubky),
    loadLatestPosts(sdk, pubky)
  ]);

  const tags = await loadProfileTags(pubky, nexusUserView);

  const pubkyProfile = {
    ...(nexusUserView?.details || {}),
    ...(publicPubkyProfile || {}),
    ...(sessionPubkyProfile || {})
  };
  const cardSettings = sessionCardSettings || publicCardSettings;

  const baseBackground = getBackgroundById(cardSettings?.backgroundId);
  const merged = mergeProfileData(
    pubkyProfile,
    {
      ...cardSettings,
      pubky,
      latestPosts,
      tags,
      backgroundUrl: cardSettings?.backgroundUrl || baseBackground.src,
      backgroundType: cardSettings?.backgroundType || baseBackground.type
    }
  );

  merged.pubky = pubky;
  merged.latestPosts = merged.showLatestPost ? latestPosts : [];
  merged.tags = merged.showTags ? tags : [];
  const resolvedAvatarUrl = await resolvePubkyMediaUrl(sdk, merged.image, pubky).catch(() =>
    fallbackMediaSource(merged.image, pubky)
  );
  const cdnAvatarUrl = buildCdnAvatarUrl(pubky);
  merged.resolvedAvatarUrl = isDirectMediaUrl(merged.image)
    ? resolvedAvatarUrl || cdnAvatarUrl
    : cdnAvatarUrl || resolvedAvatarUrl;
  merged.resolvedBackgroundUrl = await resolvePubkyMediaUrl(sdk, merged.backgroundUrl, pubky).catch(() => fallbackMediaSource(merged.backgroundUrl, pubky));

  if (Array.isArray(merged.latestPosts)) {
    merged.latestPosts = await Promise.all(
      merged.latestPosts.map(async (post) => {
        const resolvedAttachments = post.attachments?.length
          ? (await Promise.all(
              post.attachments.map((attachment) =>
                (async () => {
                  const ownerPubky = post.authorPubkyFull || pubky;
                  const source = getAttachmentSource(attachment);
                  const type = inferAttachmentType(attachment, source);
                  if (!source) {
                    return { source: "", type };
                  }

                  const resolvedSource = await resolvePubkyMediaUrl(sdk, source, ownerPubky).catch(() =>
                    fallbackMediaSource(source, ownerPubky)
                  );

                  return {
                    source: resolvedSource || fallbackMediaSource(source, ownerPubky),
                    type
                  };
                })()
              )
            ))
          : [];

        return {
          ...post,
          resolvedAttachments
        };
      })
    );
  }

  return merged;
}

export async function saveProfileBundle(pubky, draft) {
  const session = await getStoredSession();
  if (!session) {
    const diagnostic = readSessionDiagnostic();
    const reason = diagnostic?.reason === "restore-failed" ? "restore-failed" : "no-session";
    throw createSessionStateError(
      reason === "restore-failed"
        ? "Your previous Pubky Ring session could not be restored. Sign in again to keep editing."
        : "Please sign in with Pubky Ring first.",
      reason,
      diagnostic
    );
  }

  if (!hasRequiredCapabilities(session)) {
    const sessionPubky = extractSessionPubky(session);
    const diagnostic = writeSessionDiagnostic("capability-mismatch", {
      pubky: sessionPubky || pubky,
      capabilities: getSessionCapabilities(session)
    });
    throw createSessionStateError(
      "Your Pubky Ring session is missing one or more required write permissions. Sign in again to refresh access to pubky.app, mypubky.com, and paykit.",
      "capability-mismatch",
      diagnostic
    );
  }

  const sessionPubky = extractSessionPubky(session);
  if (!sessionPubky || sessionPubky !== pubky) {
    throw new Error("You can only edit your own profile.");
  }

  const nextDraft = structuredClone(draft);
  nextDraft.buttonLinks = (nextDraft.buttonLinks || [])
    .map((link) => normalizeDraftLink(link))
    .filter((link) => link.title && link.url);
  nextDraft.socialLinks = SOCIAL_PLATFORMS.map((platform) => {
    const existing = nextDraft.socialLinks?.find((entry) => entry.key === platform.key) || {};
    return normalizeDraftSocial(platform, existing);
  });
  validateDraft(nextDraft);

  if (nextDraft.avatarFile) {
    const extension = nextDraft.avatarFile.name.split(".").pop() || "png";
    const path = `${FILES_PATH}/avatar-${uid("asset")}.${extension}`;
    await putFile(session, path, nextDraft.avatarFile);
    nextDraft.image = pubkyUri(pubky, path);
  }

  if (nextDraft.backgroundFile) {
    const extension = nextDraft.backgroundFile.name.split(".").pop() || "png";
    const path = `${FILES_PATH}/background-${uid("asset")}.${extension}`;
    await putFile(session, path, nextDraft.backgroundFile);
    nextDraft.backgroundUrl = pubkyUri(pubky, path);
    nextDraft.backgroundType = nextDraft.backgroundFile.type.startsWith("video/")
      ? "video"
      : "image";
  }

  const unifiedLinks = deriveUnifiedLinks(nextDraft.buttonLinks, nextDraft.socialLinks);
  nextDraft.sharedLinks = unifiedLinks;
  nextDraft.extraSocials = nextDraft.socialLinks
    .filter((social) => {
      const sharedIndex = unifiedLinks.findIndex((link) =>
        normalizeUrl(link.url) === normalizeUrl(social.url)
      );
      return sharedIndex >= 5;
    })
    .map((social) => ({
      key: social.key,
      title: social.label || social.key,
      url: normalizeUrl(social.url)
    }));

  const pubkyAppProfile = createPubkyAppProfile(nextDraft);
  const sharedLinks = pubkyAppProfile.links;
  const cardSettings = createCardSettings(nextDraft, sharedLinks);

  try {
    await Promise.all([
      putJson(session, PUBKY_PROFILE_PATH, pubkyAppProfile),
      putJson(session, CARD_SETTINGS_PATH, cardSettings),
      syncPaykitEndpoint(session, nextDraft.donateEnabled, nextDraft.bitcoinAddress)
    ]);
  } catch (error) {
    const statusCode = extractStatusCode(error);
    if (statusCode === 401 || statusCode === 403) {
      activeSession = null;
      const diagnostic = writeSessionDiagnostic(statusCode === 401 ? "expired" : "write-forbidden", {
        pubky,
        statusCode,
        message: summarizeErrorMessage(error)
      });
      throw createSessionStateError(
        statusCode === 401
          ? "Your Pubky Ring session appears to have expired. Sign in again and we can retry the save."
          : "Your Pubky Ring session no longer has write access for this save. Sign in again to refresh permissions.",
        statusCode === 401 ? "expired" : "write-forbidden",
        diagnostic
      );
    }

    throw error;
  }

  if (typeof session?.export === "function") {
    localStorage.setItem(STORAGE_KEYS.lastSession, session.export());
  }
  localStorage.setItem(STORAGE_KEYS.lastPubky, pubky);
  clearSessionDiagnostic();

  return loadProfileBundle(pubky);
}

export function createEmptyDraft(pubky, currentProfile = {}) {
  const background = getBackgroundById(currentProfile.backgroundId);
  const isCustomBackground = currentProfile.backgroundId === "custom";
  const socialLinks = SOCIAL_PLATFORMS.map((platform) => {
    const existing = currentProfile.socialLinks?.find((entry) => entry.key === platform.key);
    return normalizeDraftSocial(platform, existing || {});
  });

  return {
    pubky,
    name: currentProfile.name || "",
    bio: currentProfile.bio || "",
    image: currentProfile.image || "",
    status: currentProfile.status || "",
    buttonLinks: currentProfile.buttonLinks?.length
      ? currentProfile.buttonLinks
          .map((entry) => normalizeDraftLink(entry))
          .filter((entry) => entry.title && entry.url)
      : [],
    socialLinks,
    backgroundId: currentProfile.backgroundId || background.id,
    backgroundType: currentProfile.backgroundType || background.type,
    backgroundUrl:
      currentProfile.backgroundUrl ||
      (isCustomBackground ? currentProfile.resolvedBackgroundUrl || background.src : background.src),
    cardPosition: currentProfile.cardPosition || "center",
    cardBackgroundMode: normalizeCardBackgroundMode(
      currentProfile.cardBackgroundMode,
      currentProfile.cardBackgroundVisible ?? true
    ),
    showLatestPost: currentProfile.showLatestPost ?? true,
    showTags: currentProfile.showTags ?? true,
    donateEnabled: currentProfile.donateEnabled ?? true,
    donateEndpoint: currentProfile.donateEndpoint || pubky || "",
    bitcoinAddress: currentProfile.bitcoinAddress || "",
    avatarFile: null,
    avatarPreview: "",
    backgroundFile: null,
    backgroundPreview: isCustomBackground ? currentProfile.resolvedBackgroundUrl || "" : ""
  };
}

export async function resolvePreviewAsset(url) {
  const sdk = getSdk();
  const storedPubky = localStorage.getItem(STORAGE_KEYS.lastPubky) || "";
  return resolvePubkyMediaUrl(sdk, url, storedPubky);
}
