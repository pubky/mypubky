import {
  DEFAULT_AVATAR_PATH,
  DEFAULT_BACKGROUNDS,
  HOMEPAGE_BRAND_ENDORSEMENT,
  HOMEPAGE_BRAND_MARK,
  HOMEPAGE_FAVICON_MARK,
  HOMEPAGE_VISUAL,
  MAX_UPLOAD_BYTES,
  SOCIAL_PLATFORMS
} from "./lib/config.js";
import {
  createAuthFlow,
  createEmptyDraft,
  loadProfileBundle,
  restoreSession,
  saveProfileBundle,
  signOut,
  waitForAuth
} from "./lib/pubky.js";
import { renderQrSvg } from "./lib/qr.js";
import {
  buildProfileUrl,
  clampUploadSize,
  cn,
  download,
  escapeHtml,
  fileToDataUrl,
  formatRelativeTime,
  isMailtoUrl,
  isValidMailtoUrl,
  normalizeUrl,
  sanitizeBrowserUrl,
  shortenPubky,
  uid
} from "./lib/utils.js";
import BITCOIN_BADGE_IMAGE from "./assets/bitcoin.png";
import HOMEPAGE_DEMO from "./assets/demo.png";
import HOMEPAGE_SWIRL from "./assets/swirl.svg";
import X_BRAND_MARK from "./assets/x.svg";

const APP_VERSION = __APP_VERSION__;
const HERO_MOTION_MODE = "loop"; // Set to "interactive" to restore pointer/scroll-driven hero motion.
const HERO_LOOP_DURATION_SECONDS = 6;

function icon(name) {
  const lucide = (body, attrs = "") => `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${attrs}>
      ${body}
    </svg>
  `;

  const icons = {
    pubky:
      `<img class="icon__brand-image" src="${HOMEPAGE_BRAND_MARK}" alt="" />`,
    x:
      `<img class="icon__asset-image" src="${X_BRAND_MARK}" alt="" />`,
    telegram:
      lucide('<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" />'),
    github:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.4 2.8 8.2 6.6 9.5.5.1.7-.2.7-.5v-1.8c-2.7.6-3.2-1.2-3.2-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.5 1.1 3.1.8.1-.7.4-1.1.6-1.4-2.1-.2-4.3-1.1-4.3-4.8 0-1 .3-1.8.9-2.4-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a8.7 8.7 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.6.9 1.5.9 2.4 0 3.7-2.2 4.6-4.3 4.8.4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A10.2 10.2 0 0 0 22 12.2C22 6.6 17.5 2 12 2Z" fill="currentColor"/></svg>',
    tiktok:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 5.82A4.83 4.83 0 0 0 20.38 8v2.74a7.57 7.57 0 0 1-3.76-.99v5.07a5.83 5.83 0 1 1-5.03-5.78v2.84a3.07 3.07 0 1 0 2.27 2.94V2h2.74c.07 1.52.63 2.94 1.6 3.82Z" fill="currentColor"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.8 8.1s-.2-1.5-.9-2.2c-.8-.8-1.8-.8-2.3-.9C15.4 4.7 12 4.7 12 4.7h0s-3.4 0-6.7.3c-.5 0-1.5.1-2.3.9-.7.7-.9 2.2-.9 2.2S2 9.9 2 11.7v1.7c0 1.8.2 3.6.2 3.6s.2 1.5.9 2.2c.8.8 1.9.8 2.4.9 1.7.2 6.5.3 6.5.3s3.4 0 6.7-.3c.5 0 1.5-.1 2.3-.9.7-.7.9-2.2.9-2.2s.2-1.8.2-3.6v-1.7c0-1.8-.2-3.6-.2-3.6ZM9.9 15.4V9.3l5.8 3-5.8 3.1Z" fill="currentColor"/></svg>',
    share:
      lucide('<path d="M12 2v13" /><path d="m16 6-4-4-4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />'),
    wallet:
      lucide('<path d="M17 14h.01" /><path d="M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14" />'),
    "arrow-left":
      lucide('<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />'),
    "square-user-round":
      lucide('<path d="M18 21a6 6 0 0 0-12 0" /><circle cx="12" cy="11" r="4" /><rect width="18" height="18" x="3" y="3" rx="2" />'),
    pencil:
      lucide('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />'),
    paint:
      lucide('<path d="M11 7 6 2" /><path d="M18.992 12H2.041" /><path d="M21.145 18.38A3.34 3.34 0 0 1 20 16.5a3.3 3.3 0 0 1-1.145 1.88c-.575.46-.855 1.02-.855 1.595A2 2 0 0 0 20 22a2 2 0 0 0 2-2.025c0-.58-.285-1.13-.855-1.595" /><path d="m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33" />'),
    logout:
      lucide('<path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />'),
    signin:
      lucide('<path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5" /><path d="M15 12H4" />'),
    close:
      lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
    plus:
      lucide('<path d="M5 12h14" /><path d="M12 5v14" />'),
    create:
      lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M19 8v6" /><path d="M16 11h6" />'),
    "file-text":
      lucide('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />'),
    trash:
      lucide('<path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6" /><path d="M14 11v6" />'),
    image:
      lucide('<path d="M13.5 21H5a2 2 0 0 1-2-2V8.5" /><path d="m15 2 5 5" /><path d="M17 22v-5.5a.5.5 0 0 0-.5-.5H11" /><path d="M5 17l3.586-3.586a2 2 0 0 1 2.828 0L13 15" /><path d="m14 14 1.586-1.586a2 2 0 0 1 2.828 0L20 14" /><path d="M5 6.5V4a2 2 0 0 1 2-2h7.5L20 7.5V10" /><circle cx="9" cy="9" r="1" />'),
    "image-plus":
      lucide('<rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /><path d="m14 14-1-1a2 2 0 0 0-2.828 0L9 14" /><path d="M15 8h6" /><path d="M18 5v6" />'),
    qr:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm10-2h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm4 0h2v4h-2zm-4 2h4v2h-4z" fill="currentColor"/></svg>',
    check:
      lucide('<path d="M20 6 9 17l-5-5" />'),
    clock:
      lucide('<circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" />'),
    "arrow-up-right":
      lucide('<path d="M7 17 17 7" /><path d="M7 7h10v10" />')
  };

  return icons[name] || "";
}

function toggleMarkup(checked, field) {
  return `
    <button class="toggle ${checked ? "is-on" : ""}" type="button" data-action="toggle-switch" data-field="${field}" aria-pressed="${checked}">
      <span class="toggle__thumb"></span>
    </button>
  `;
}

function platformInput(platform, draft) {
  const entry = draft.socialLinks.find((social) => social.key === platform.key);
  const isPubky = platform.key === "pubky";
  const pubkyProfileUrl = draft.pubky ? `https://pubky.app/profile/${draft.pubky}` : "https://pubky.app/profile/";
  const value = isPubky ? pubkyProfileUrl : (entry?.url || "");
  return `
    <label class="social-field">
      <span class="social-field__icon icon-button" aria-hidden="true">${icon(platform.icon)}</span>
      <input
        type="url"
        class="field"
        ${isPubky ? 'disabled aria-disabled="true"' : `data-social-key="${platform.key}"`}
        placeholder="${escapeHtml(platform.placeholder)}"
        value="${escapeHtml(value)}"
      />
    </label>
  `;
}

function buildPaykitQrValue(pubky = "") {
  return String(pubky || "").trim();
}

function buildBitcoinQrValue(address = "") {
  const normalized = String(address || "").trim();
  return normalized ? `bitcoin:${normalized}` : "";
}

function extractPostId(post = {}) {
  const uri = String(post?.uri || "");
  return uri.split("/").filter(Boolean).pop() || "";
}

function extractPostAuthorPubky(post = {}) {
  const uri = String(post?.uri || "");
  const match = uri.match(/^pubky:\/\/([^/]+)\//i);
  return match?.[1] || "";
}

function buildPubkyPostUrl(post = {}, fallbackPubky = "") {
  const postId = extractPostId(post);
  const authorPubky = String(post?.authorPubkyFull || extractPostAuthorPubky(post) || fallbackPubky || "").trim();
  if (!postId) {
    return fallbackPubky ? `https://pubky.app/${fallbackPubky}` : "https://pubky.app";
  }
  if (!authorPubky) {
    return `https://pubky.app/post/${postId}`;
  }
  return `https://pubky.app/post/${authorPubky}/${postId}`;
}

function isVideoMedia(source = "") {
  const value = String(source || "").toLowerCase();
  return [".mp4", ".webm", ".mov", ".m4v", ".ogg"].some((extension) => value.includes(extension));
}

function isImageMedia(source = "") {
  const value = String(source || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"].some((extension) => value.includes(extension));
}

function getAttachmentSource(attachment) {
  if (!attachment) return "";
  if (typeof attachment === "string") return attachment.trim();
  if (typeof attachment?.url === "string") return attachment.url.trim();
  if (typeof attachment?.path === "string") return attachment.path.trim();
  if (typeof attachment?.src === "string") return attachment.src.trim();
  if (typeof attachment?.source === "string") return attachment.source.trim();
  return "";
}

function getResolvedAttachmentSource(attachment) {
  if (!attachment) return "";
  if (typeof attachment === "string") return attachment.trim();
  if (typeof attachment?.source === "string") return attachment.source.trim();
  if (typeof attachment?.url === "string") return attachment.url.trim();
  return "";
}

function getResolvedAttachmentType(attachment) {
  return String(attachment?.type || "").toLowerCase();
}

function getPostPreview(post) {
  const attachments = Array.isArray(post?.attachments) ? post.attachments : [];
  const resolvedAttachments = Array.isArray(post?.resolvedAttachments) ? post.resolvedAttachments : [];
  const postKind = String(post?.kind || "").toLowerCase();

  for (let index = 0; index < attachments.length; index += 1) {
    const originalSource = getAttachmentSource(attachments[index]);
    const resolvedAttachment = resolvedAttachments[index];
    const resolvedSource = getResolvedAttachmentSource(resolvedAttachment) || originalSource;
    const resolvedType = getResolvedAttachmentType(resolvedAttachment);

    if (!resolvedSource) {
      continue;
    }

    if (
      resolvedType === "video" ||
      postKind === "video" ||
      isVideoMedia(originalSource) ||
      isVideoMedia(resolvedSource)
    ) {
      return {
        source: resolvedSource,
        type: "video"
      };
    }

    if (resolvedType === "image" || isImageMedia(originalSource) || isImageMedia(resolvedSource) || resolvedSource) {
      return {
        source: resolvedSource,
        type: "image"
      };
    }
  }

  return null;
}

function getTagColor(label = "") {
  const normalized = String(label || "").trim();
  const lowerLabel = normalized.toLowerCase();
  const customCases = [
    { name: "bitcoin", color: "#FF9900" },
    { name: "synonym", color: "#FF6600" },
    { name: "bitkit", color: "#FF4400" },
    { name: "pubky", color: "#C8FF00" },
    { name: "blocktank", color: "#FFAE00" },
    { name: "tether", color: "#26A17B" }
  ];

  for (const special of customCases) {
    if (lowerLabel === special.name) {
      return special.color;
    }
  }

  const hash = Array.from(normalized).reduce((value, character) => {
    return character.charCodeAt(0) + ((value << 5) - value);
  }, 0);

  const positiveHash = Math.abs(hash);
  const randomByte = positiveHash & 0xff;
  const randomHex = randomByte.toString(16).padStart(2, "0").toUpperCase();
  const patterns = [
    `FF00${randomHex}`,
    `FF${randomHex}00`,
    `${randomHex}FF00`,
    `${randomHex}00FF`,
    `00${randomHex}FF`,
    `00FF${randomHex}`
  ];

  return `#${patterns[positiveHash % patterns.length]}`;
}

function renderTagPill(tag, { className = "", count } = {}) {
  const label = String(tag?.label || tag?.name || "").trim();
  if (!label) return "";

  const resolvedCount =
    count ??
    tag?.count ??
    tag?.taggers_count ??
    (Array.isArray(tag?.taggers) ? tag.taggers.length : "");

  const displayCount = String(resolvedCount || "").trim();
  const color = getTagColor(label);
  const classes = ["tag-pill", className].filter(Boolean).join(" ");

  return `<span class="${classes}" style="--tag-color:${color}">${escapeHtml(label)}${
    displayCount ? ` <span>${escapeHtml(displayCount)}</span>` : ""
  }</span>`;
}

export class MyPubkyApp {
  constructor(root) {
    this.root = root;
    this.panelFlipTimer = 0;
    this.cardHeightObserver = null;
    this.confettiBurstEl = null;
    this.confettiTimer = 0;
    this.draggingLinkIndex = -1;
    this.heroLoopStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.heroMotion = {
      active: false,
      frame: 0,
      pokeAnimation: null,
      x: 0,
      y: 0
    };
    this.profileParallax = {
      active: false,
      currentY: 0,
      targetY: 0,
      frame: 0
    };
    this.state = {
      booting: true,
      loading: false,
      routePubky: "",
      sessionPubky: "",
      profile: null,
      draft: null,
      modal: null,
      auth: null,
      sessionDiagnostic: null,
      pendingAction: null,
      activePanel: "",
      editorTab: "content",
      donateQrMode: "paykit",
      cardFlipped: false,
      notice: "",
      error: ""
    };
  }

  async init() {
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("input", this.handleInput);
    this.root.addEventListener("change", this.handleChange);
    this.root.addEventListener("submit", this.handleSubmit);
    this.root.addEventListener("dragstart", this.handleDragStart);
    this.root.addEventListener("dragover", this.handleDragOver);
    this.root.addEventListener("drop", this.handleDrop);
    this.root.addEventListener("dragend", this.handleDragEnd);
    this.root.addEventListener("pointerdown", this.handlePointerDown);
    this.root.addEventListener("pointermove", this.handlePointerMove);
    this.root.addEventListener("pointerleave", this.handlePointerLeave);
    this.root.addEventListener("pointerup", this.handlePointerEnd);
    this.root.addEventListener("pointercancel", this.handlePointerEnd);
    window.addEventListener("popstate", this.handleRouteChange);
    window.addEventListener("scroll", this.handleWindowScroll, { passive: true });

    const restored = await restoreSession();
    this.state.sessionPubky = restored.pubky || "";
    this.state.sessionDiagnostic = restored.diagnostic || null;
    this.state.booting = false;
    await this.syncRoute();
  }

  handleRouteChange = async () => {
    await this.syncRoute();
  };

  handleWindowScroll = () => {
    const progress = this.getWindowScrollProgress();
    this.updateProfileParallaxTarget(progress);
    if (this.shouldUseScrollDrivenHeroMotion()) {
      this.updateHeroVisualMotionFromProgress(progress);
    }
  };

  handlePointerMove = (event) => {
    if (!this.shouldUseInteractiveHeroMotion() || this.shouldUseScrollDrivenHeroMotion()) return;
    this.heroMotion.x = event.clientX;
    this.heroMotion.y = event.clientY;

    if (this.heroMotion.frame) return;
    this.heroMotion.frame = window.requestAnimationFrame(() => {
      this.heroMotion.frame = 0;
      this.updateHeroVisualMotion();
    });
  };

  handlePointerDown = (event) => {
    if (!this.shouldUseInteractiveHeroMotion() || this.shouldUseScrollDrivenHeroMotion()) return;
    this.heroMotion.x = event.clientX;
    this.heroMotion.y = event.clientY;
    this.updateHeroVisualMotion();
  };

  handlePointerLeave = () => {
    if (!this.shouldUseInteractiveHeroMotion() || this.shouldUseScrollDrivenHeroMotion()) return;
    this.resetHeroVisualMotion();
  };

  handlePointerEnd = (event) => {
    if (!this.shouldUseInteractiveHeroMotion() || this.shouldUseScrollDrivenHeroMotion()) return;
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      this.resetHeroVisualMotion();
    }
  };

  handleDragStart = (event) => {
    const chip = event.target.closest("[data-link-index]");
    if (!chip || !chip.hasAttribute("draggable")) return;

    const index = Number.parseInt(chip.dataset.linkIndex || "-1", 10);
    if (!Number.isInteger(index) || index < 0) return;

    this.draggingLinkIndex = index;
    chip.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", String(index));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  };

  handleDragOver = (event) => {
    if (this.draggingLinkIndex < 0) return;
    const chip = event.target.closest("[data-link-index]");
    if (!chip) return;

    const targetIndex = Number.parseInt(chip.dataset.linkIndex || "-1", 10);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex === this.draggingLinkIndex) return;

    event.preventDefault();
    this.clearLinkDragTargets();
    chip.classList.add("is-drop-target");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  };

  handleDrop = (event) => {
    if (this.draggingLinkIndex < 0) return;
    const chip = event.target.closest("[data-link-index]");
    if (!chip) return;

    const toIndex = Number.parseInt(chip.dataset.linkIndex || "-1", 10);
    const fromIndex = this.draggingLinkIndex;
    this.draggingLinkIndex = -1;
    this.clearLinkDragTargets();

    if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex === fromIndex) return;

    event.preventDefault();
    this.reorderLinkButtons(fromIndex, toIndex);
  };

  handleDragEnd = () => {
    this.draggingLinkIndex = -1;
    this.clearLinkDragTargets();
  };

  updateHeroVisualMotion() {
    const artwork = this.root.querySelector(".hero__art");
    const visual = this.root.querySelector(".hero__visual:not(.hero__visual--dialog)");
    const swirl = this.root.querySelector(".hero__swirl");
    const demo = this.root.querySelector(".hero__demo");
    if (!artwork || !visual) {
      this.resetHeroVisualMotion();
      return;
    }

    const rect = artwork.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(this.heroMotion.x - centerX, this.heroMotion.y - centerY);
    const influenceRadius = Math.max(rect.width * 0.95, 280);
    const proximity = Math.max(0, 1 - distance / influenceRadius);
    this.applyHeroVisualMotion(proximity, { visual, swirl, demo });
  }

  updateHeroVisualMotionFromProgress(progress) {
    if (!this.shouldUseScrollDrivenHeroMotion()) {
      return;
    }

    const visual = this.root.querySelector(".hero__visual:not(.hero__visual--dialog)");
    if (!visual) return;

    const swirl = this.root.querySelector(".hero__swirl");
    const demo = this.root.querySelector(".hero__demo");
    const proximity = Math.max(0, Math.min(1, Number(progress) || 0));
    this.applyHeroVisualMotion(proximity, { visual, swirl, demo });
  }

  applyHeroVisualMotion(proximity, elements = {}) {
    const { visual, swirl, demo } = elements;
    if (!visual) return;

    const scale = 1 + proximity * 0.1;
    const rotate = -10 * proximity;
    const swirlRotate = 14 * proximity;
    const swirlOpacity = proximity;
    const swirlScale = 1 + proximity;
    const demoRotate = 10 * proximity;
    const demoOpacity = 1;
    const demoScale = 0.22 + proximity * 2;

    visual.style.setProperty("--hero-visual-scale", scale.toFixed(3));
    visual.style.setProperty("--hero-visual-rotate", `${rotate.toFixed(2)}deg`);
    if (swirl) {
      swirl.style.setProperty("--hero-swirl-rotate", `${swirlRotate.toFixed(2)}deg`);
      swirl.style.setProperty("--hero-swirl-opacity", swirlOpacity.toFixed(3));
      swirl.style.setProperty("--hero-swirl-scale", swirlScale.toFixed(3));
    }

    if (demo) {
      demo.style.setProperty("--hero-demo-rotate", `${demoRotate.toFixed(2)}deg`);
      demo.style.setProperty("--hero-demo-opacity", demoOpacity.toFixed(3));
      demo.style.setProperty("--hero-demo-scale", demoScale.toFixed(3));
    }
  }

  resetHeroVisualMotion() {
    const visual = this.root.querySelector(".hero__visual:not(.hero__visual--dialog)");
    const swirl = this.root.querySelector(".hero__swirl");
    const demo = this.root.querySelector(".hero__demo");
    if (!visual) return;
    visual.style.setProperty("--hero-visual-scale", "1");
    visual.style.setProperty("--hero-visual-rotate", "0deg");
    if (swirl) {
      swirl.style.setProperty("--hero-swirl-rotate", "0deg");
      swirl.style.setProperty("--hero-swirl-opacity", "0");
      swirl.style.setProperty("--hero-swirl-scale", "1");
    }
    if (demo) {
      demo.style.setProperty("--hero-demo-rotate", "0deg");
      demo.style.setProperty("--hero-demo-opacity", "1");
      demo.style.setProperty("--hero-demo-scale", "0.22");
    }
  }

  updateProfileParallaxTarget(progress) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.profileParallax.targetY = 0;
      this.profileParallax.currentY = 0;
      this.applyProfileParallax();
      return;
    }

    this.profileParallax.targetY = Number((-18 * progress).toFixed(3));
    this.startProfileParallaxFrame();
  }

  startProfileParallaxFrame() {
    if (this.profileParallax.frame) return;
    this.profileParallax.frame = window.requestAnimationFrame(this.stepProfileParallax);
  }

  stepProfileParallax = () => {
    this.profileParallax.frame = 0;
    const delta = this.profileParallax.targetY - this.profileParallax.currentY;

    if (Math.abs(delta) < 0.08) {
      this.profileParallax.currentY = this.profileParallax.targetY;
      this.applyProfileParallax();
      return;
    }

    this.profileParallax.currentY += delta * 0.12;
    this.applyProfileParallax();
    this.startProfileParallaxFrame();
  };

  applyProfileParallax() {
    const stage = this.root.querySelector(".profile-stage");
    if (!stage) return;
    stage.style.setProperty("--stage-parallax-y", `${this.profileParallax.currentY.toFixed(3)}px`);
  }

  resetProfileParallax() {
    if (this.profileParallax.frame) {
      window.cancelAnimationFrame(this.profileParallax.frame);
      this.profileParallax.frame = 0;
    }
    this.profileParallax.currentY = 0;
    this.profileParallax.targetY = 0;
    this.applyProfileParallax();
  }

  handleClick = async (event) => {
    if (event.target.closest(".hero__visual:not(.hero__visual--dialog)")) {
      if (this.shouldUseAuthDeepLink()) {
        return;
      }
      await this.openAuthModal("create");
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action } = button.dataset;

    try {
      switch (action) {
        case "open-brand":
          this.openModal("brand");
          break;
        case "open-auth":
          await this.openAuthModal(button.dataset.mode || "create");
          break;
        case "open-auth-link":
          if (this.state.auth?.authUrl) {
            window.location.href = this.state.auth.authUrl;
          }
          break;
        case "close-modal":
          this.closeModal();
          break;
        case "start-create":
          await this.openAuthModal("create");
          break;
        case "copy-link":
          await navigator.clipboard.writeText(buildProfileUrl(this.state.routePubky));
          this.setNotice("Profile link copied.");
          break;
        case "open-share":
          this.openPanel("share");
          break;
        case "download-share":
          this.downloadProfileQr();
          break;
        case "open-donate":
          this.openPanel("donate");
          break;
        case "close-donate":
          this.closePanel({ resetDraft: false });
          break;
        case "close-back":
          this.closePanel({ resetDraft: false });
          break;
        case "open-edit":
          this.openPanel("edit");
          break;
        case "open-style":
          this.state.editorTab = "style";
          this.openPanel("edit");
          break;
        case "set-editor-tab":
          this.state.editorTab = button.dataset.value === "style" ? "style" : "content";
          this.render();
          break;
        case "cancel-panel":
          this.closePanel({ resetDraft: true });
          break;
        case "save-panel":
          await this.saveDraft();
          break;
        case "sign-out":
          {
            const currentSessionPubky = this.state.sessionPubky;
            await signOut();
            this.state.sessionPubky = "";
            this.state.activePanel = "";
            this.setNotice("Signed out.");
            if (this.state.routePubky === currentSessionPubky) {
              this.navigate("/");
            } else {
              this.render();
            }
          }
          break;
        case "follow-profile":
          window.open(`https://pubky.app/profile/${this.state.routePubky}`, "_blank", "noopener");
          break;
        case "open-add-link":
          this.openModal("add-link", { title: "", url: "" });
          break;
        case "delete-link":
          this.removeLink(button.dataset.index);
          break;
        case "trigger-avatar-upload":
          this.root.querySelector("#avatar-upload")?.click();
          break;
        case "trigger-background-upload":
          this.root.querySelector("#background-upload")?.click();
          break;
        case "select-background":
          this.selectBackground(button.dataset.backgroundId);
          break;
        case "set-card-position":
          this.updateDraftField("cardPosition", button.dataset.value);
          break;
        case "set-card-background-mode":
          this.updateDraftField("cardBackgroundMode", button.dataset.value || "dark");
          break;
        case "set-donate-qr-mode":
          this.state.donateQrMode = button.dataset.value || "paykit";
          this.render();
          break;
        case "toggle-switch":
          this.toggleDraftField(button.dataset.field);
          break;
        case "go-home":
          this.navigate("/");
          break;
        default:
          break;
      }
    } catch (error) {
      this.setError(error.message || "Something went wrong.");
    }
  };

  handleInput = (event) => {
    const field = event.target.dataset.field;
    if (field) {
      this.updateDraftField(field, event.target.value, { render: false });
      return;
    }

    const socialKey = event.target.dataset.socialKey;
    if (socialKey) {
      this.updateDraftSocial(socialKey, event.target.value);
    }
  };

  handleChange = async (event) => {
    const target = event.target;
    if (target.id === "avatar-upload") {
      const file = target.files?.[0];
      if (!file) return;
      clampUploadSize(file, MAX_UPLOAD_BYTES);
      const preview = await fileToDataUrl(file);
      this.state.draft.avatarFile = file;
      this.state.draft.avatarPreview = preview;
      this.render();
      return;
    }

    if (target.id === "background-upload") {
      const file = target.files?.[0];
      if (!file) return;
      clampUploadSize(file, MAX_UPLOAD_BYTES);
      const preview = await fileToDataUrl(file);
      this.state.draft.backgroundFile = file;
      this.state.draft.backgroundPreview = preview;
      this.state.draft.backgroundType = file.type.startsWith("video/") ? "video" : "image";
      this.state.draft.backgroundUrl = preview;
      this.state.draft.backgroundId = "custom";
      this.render();
    }
  };

  handleSubmit = async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();

    if (form.dataset.form === "add-link") {
      const title = form.querySelector('[name="title"]')?.value?.trim();
      const url = form.querySelector('[name="url"]')?.value?.trim();
      if (!title || !url) {
        this.setError("Add both a label and URL.");
        return;
      }

      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl) {
        this.setError("Use a valid URL or email address.");
        return;
      }

      if (/^mailto\b/i.test(url) && !isValidMailtoUrl(normalizedUrl)) {
        this.setError("Use mailto format like mailto:hello@example.com.");
        return;
      }

      this.state.draft.buttonLinks.push({
        title,
        url: normalizedUrl
      });
      this.closeModal();
      this.render();
    }
  };

  async syncRoute() {
    const nextRoute = this.getRoutePubky();
    this.resetProfileParallax();
    if (nextRoute === this.state.routePubky && !this.state.booting) {
      this.render();
      return;
    }

    this.state.routePubky = nextRoute;
    this.state.profile = null;
    this.state.activePanel = "";
    this.state.modal = null;
    this.state.loading = Boolean(nextRoute);
    this.render();

    if (!nextRoute) {
      this.state.loading = false;
      this.render();
      return;
    }

    try {
      const profile = await loadProfileBundle(nextRoute);
      const preparedProfile = await this.prepareProfileAssets(profile);
      if (this.state.routePubky !== nextRoute) return;
      this.state.profile = preparedProfile;
      this.state.draft = createEmptyDraft(nextRoute, preparedProfile);
    } catch (error) {
      this.state.profile = createEmptyDraft(nextRoute, { pubky: nextRoute });
      this.state.profile.pubky = nextRoute;
      this.state.profile.image = "";
      this.state.profile.resolvedAvatarUrl = DEFAULT_AVATAR_PATH;
      this.state.profile.resolvedBackgroundUrl = DEFAULT_BACKGROUNDS[0].src;
      this.state.draft = createEmptyDraft(nextRoute, this.state.profile);
      this.setError(error.message || "Unable to load profile.");
    } finally {
      this.state.loading = false;
      this.render();
    }
  }

  getRoutePubky() {
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (!pathname) return "";
    if (pathname === "profile") return "";
    if (pathname.startsWith("profile/")) {
      return pathname.slice("profile/".length);
    }
    return pathname;
  }

  navigate(path, replace = false) {
    const next = path.startsWith("/") ? path : `/${path}`;
    if (replace) {
      window.history.replaceState({}, "", next);
    } else {
      window.history.pushState({}, "", next);
    }
    this.syncRoute();
  }

  openModal(type, payload = {}) {
    this.state.modal = { type, payload };
    this.render();
  }

  closeModal(options = {}) {
    const { cancelAuth = true } = options;
    if (cancelAuth && this.state.modal?.type === "auth") {
      this.state.auth?.cancelAuthFlow?.();
      this.state.auth = null;
      this.state.pendingAction = null;
    }
    this.state.modal = null;
    this.render();
  }

  openPanel(panel) {
    const editablePanel = panel === "edit" || panel === "style";
    if (editablePanel && !this.isOwnProfile()) return;
    window.clearTimeout(this.panelFlipTimer);
    if (editablePanel) {
      this.resetDraft();
      this.state.editorTab = panel === "style" ? "style" : "content";
      panel = "edit";
    }
    if (panel === "donate") {
      this.state.donateQrMode = "paykit";
    }
    this.state.activePanel = panel;
    this.state.cardFlipped = false;
    this.render();
    this.flipCardToBack();
  }

  closePanel({ resetDraft } = { resetDraft: true }) {
    if (!this.state.activePanel) return;

    window.clearTimeout(this.panelFlipTimer);
    this.state.cardFlipped = false;

    const card = this.root.querySelector(".profile-card");
    if (card) {
      card.classList.remove("is-flipped");
    }

    this.panelFlipTimer = window.setTimeout(() => {
      if (resetDraft) {
        this.resetDraft();
      }
      this.state.activePanel = "";
      this.render();
    }, 720);
  }

  flipCardToBack() {
    const card = this.root.querySelector(".profile-card");
    if (!card) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!this.state.activePanel) return;
        card.classList.add("is-flipped");
        this.state.cardFlipped = true;
      });
    });
  }

  resetDraft() {
    this.state.draft = createEmptyDraft(this.state.routePubky, this.state.profile || {});
  }

  clearLinkDragTargets() {
    this.root.querySelectorAll("[data-link-index].is-dragging, [data-link-index].is-drop-target").forEach((node) => {
      node.classList.remove("is-dragging", "is-drop-target");
    });
  }

  getSessionDiagnosticMessage() {
    const diagnostic = this.state.sessionDiagnostic;
    if (!diagnostic?.reason) return "";

    switch (diagnostic.reason) {
      case "restore-failed":
        return "Your previous Pubky Ring session could not be restored. Scan to refresh it.";
      case "restored-missing-capabilities":
      case "capability-mismatch":
        return "Your stored session is missing one or more required write permissions. Scan to refresh access.";
      case "expired":
        return "Your previous Pubky Ring session appears to have expired. Scan to continue.";
      case "write-forbidden":
        return "Your stored session can no longer write the required paths. Scan to refresh permissions.";
      default:
        return "";
    }
  }

  shouldUseAuthDeepLink() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  }

  shouldUseInteractiveHeroMotion() {
    return HERO_MOTION_MODE === "interactive";
  }

  shouldUseScrollDrivenHeroMotion() {
    return this.shouldUseInteractiveHeroMotion() && this.shouldUseAuthDeepLink();
  }

  getHeroLoopTimingAttributes() {
    if (HERO_MOTION_MODE !== "loop") return "";

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsedSeconds = Math.max(0, (now - this.heroLoopStartedAt) / 1000);
    const cycleOffset = elapsedSeconds % HERO_LOOP_DURATION_SECONDS;

    return ` style="--hero-loop-duration:${HERO_LOOP_DURATION_SECONDS}s;--hero-loop-delay:-${cycleOffset.toFixed(3)}s"`;
  }

  getWindowScrollProgress() {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScroll <= 0) return 0;
    return Math.max(0, Math.min(1, window.scrollY / maxScroll));
  }

  async openAuthModal(mode, options = {}) {
    const { message = "", pendingAction = null } = options;
    const auth = await createAuthFlow();
    const requestId = uid("auth");
    this.state.pendingAction = pendingAction;
    this.state.auth = {
      id: requestId,
      mode,
      cancelAuthFlow: auth.cancelAuthFlow,
      authUrl: auth.authUrl,
      useDeepLink: this.shouldUseAuthDeepLink(),
      qrSvg: renderQrSvg(auth.authUrl, 10),
      message: message || (mode === "signin" ? this.getSessionDiagnosticMessage() : ""),
      error: ""
    };
    this.openModal("auth", { mode });
    this.waitForAuth(requestId, auth.awaitApproval);
  }

  async waitForAuth(requestId, approvalPromise) {
    try {
      const result = await waitForAuth(approvalPromise);
      if (this.state.auth?.id !== requestId) return;
      this.state.sessionPubky = result.pubky;
      this.state.sessionDiagnostic = null;
      this.closeModal({ cancelAuth: false });
      const pendingAction = this.state.pendingAction;
      this.state.pendingAction = null;
      this.setNotice("Signed in with Pubky Ring.");
      if (result.pubky) {
        if (this.state.routePubky !== result.pubky) {
          this.navigate(`/profile/${result.pubky}`);
        } else {
          this.render();
        }
      }

      if (pendingAction?.type === "save-draft") {
        if (result.pubky && result.pubky === this.state.routePubky) {
          await this.saveDraft({
            skipReauthPrompt: true,
            successMessage: "Session refreshed. Profile saved."
          });
        } else if (result.pubky) {
          this.setError("You signed in as a different Pubky, so the pending save was canceled.");
        } else {
          this.setError("Session refreshed, but we could not verify the Pubky for the pending save.");
        }
      }
    } catch (error) {
      if (this.state.auth?.id === requestId) {
        console.error("Pubky auth failed", error);
        this.state.auth = {
          ...this.state.auth,
          error: error?.message || "Auth request was cancelled."
        };
        this.render();
      }
    }
  }

  async saveDraft(options = {}) {
    const { skipReauthPrompt = false, successMessage = "Profile saved." } = options;
    if (!this.isOwnProfile() || !this.state.draft) return;
    this.state.loading = true;
    this.render();

    try {
      const nextProfile = await saveProfileBundle(this.state.routePubky, this.state.draft);
      this.state.profile = nextProfile;
      this.state.draft = createEmptyDraft(this.state.routePubky, nextProfile);
      this.setNotice(successMessage);
      this.celebrateSave();
      this.closePanel({ resetDraft: false });
    } catch (error) {
      this.state.sessionDiagnostic = error?.diagnostic || this.state.sessionDiagnostic;
      if (error?.requiresReauth && !skipReauthPrompt) {
        this.state.loading = false;
        this.render();
        await this.openAuthModal("signin", {
          message: error.message || "Sign in again to continue.",
          pendingAction: { type: "save-draft", routePubky: this.state.routePubky }
        });
        return;
      }
      this.setError(error.message || "Unable to save profile.");
    } finally {
      this.state.loading = false;
      if (!this.state.activePanel || this.state.cardFlipped) {
        this.render();
      }
    }
  }

  updateDraftField(field, value, options = {}) {
    if (!this.state.draft) return;
    const { render = true } = options;
    this.state.draft[field] = value;
    if (render) {
      this.render();
    }
  }

  updateDraftSocial(key, url) {
    if (!this.state.draft) return;
    const entry = this.state.draft.socialLinks.find((item) => item.key === key);
    if (entry) {
      entry.url = url;
    }
  }

  toggleDraftField(field) {
    if (!this.state.draft) return;
    this.state.draft[field] = !this.state.draft[field];
    this.render();
  }

  removeLink(indexValue) {
    const index = Number(indexValue);
    if (Number.isNaN(index) || !this.state.draft) return;
    this.state.draft.buttonLinks.splice(index, 1);
    this.render();
  }

  reorderLinkButtons(fromIndex, toIndex) {
    if (!this.state.draft?.buttonLinks?.length) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= this.state.draft.buttonLinks.length || toIndex >= this.state.draft.buttonLinks.length) {
      return;
    }

    const nextLinks = [...this.state.draft.buttonLinks];
    const [moved] = nextLinks.splice(fromIndex, 1);
    if (!moved) return;
    nextLinks.splice(toIndex, 0, moved);
    this.state.draft.buttonLinks = nextLinks;
    this.render();
  }

  selectBackground(backgroundId) {
    if (!this.state.draft) return;
    const background = DEFAULT_BACKGROUNDS.find((entry) => entry.id === backgroundId);
    if (!background) return;
    this.state.draft.backgroundId = background.id;
    this.state.draft.backgroundType = background.type;
    this.state.draft.backgroundUrl = background.src;
    this.state.draft.backgroundFile = null;
    this.state.draft.backgroundPreview = "";
    this.render();
  }

  isOwnProfile() {
    return Boolean(this.state.routePubky && this.state.sessionPubky && this.state.routePubky === this.state.sessionPubky);
  }

  currentProfileView() {
    const editablePanelOpen = this.state.activePanel === "edit" || this.state.activePanel === "style";
    if (editablePanelOpen && this.state.draft) {
      const draft = this.state.draft;
      const fallbackBackgroundUrl = this.state.profile?.resolvedBackgroundUrl || DEFAULT_BACKGROUNDS[0].src;
      const background =
        draft.backgroundPreview ||
        (draft.backgroundId === "custom" ? fallbackBackgroundUrl : draft.backgroundUrl) ||
        draft.backgroundUrl ||
        fallbackBackgroundUrl;
      return {
        ...this.state.profile,
        ...draft,
        resolvedAvatarUrl: draft.avatarPreview || this.state.profile?.resolvedAvatarUrl || DEFAULT_AVATAR_PATH,
        resolvedBackgroundUrl: background,
        socialLinks: draft.socialLinks.filter((entry) => entry.url.trim()),
        buttonLinks: draft.buttonLinks
      };
    }
    return this.state.profile;
  }

  preloadImage(url) {
    return new Promise((resolve) => {
      if (!url) {
        resolve(false);
        return;
      }

      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  async prepareProfileAssets(profile) {
    const prepared = { ...profile };
    const fallbackBackgroundUrl = DEFAULT_BACKGROUNDS[0].src;
    const targetAvatarUrl = prepared.image
      ? prepared.resolvedAvatarUrl || DEFAULT_AVATAR_PATH
      : DEFAULT_AVATAR_PATH;

    prepared.resolvedAvatarUrl = (await this.preloadImage(targetAvatarUrl))
      ? targetAvatarUrl
      : DEFAULT_AVATAR_PATH;

    if (prepared.backgroundType === "image") {
      const targetBackgroundUrl = prepared.resolvedBackgroundUrl || fallbackBackgroundUrl;
      prepared.resolvedBackgroundUrl = (await this.preloadImage(targetBackgroundUrl))
        ? targetBackgroundUrl
        : fallbackBackgroundUrl;
    } else {
      prepared.resolvedBackgroundUrl = prepared.resolvedBackgroundUrl || fallbackBackgroundUrl;
    }

    return prepared;
  }

  setNotice(message) {
    this.state.notice = message;
    this.state.error = "";
    this.render();
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => {
      this.state.notice = "";
      this.render();
    }, 2400);
  }

  setError(message) {
    this.state.error = message;
    this.state.notice = "";
    this.render();
    window.clearTimeout(this.errorTimer);
    this.errorTimer = window.setTimeout(() => {
      this.state.error = "";
      this.render();
    }, 3200);
  }

  celebrateSave() {
    this.confettiBurstEl?.remove();
    window.clearTimeout(this.confettiTimer);

    const burst = document.createElement("div");
    burst.className = "confetti-burst";

    const palette = ["#c8ff00", "#ffffff", "#00d1ff", "#ff8a00", "#ff3d7f", "#7c4dff"];
    const count = 96;

    for (let index = 0; index < count; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      const angle = Math.random() * Math.PI * 2;
      const distance = 140 + Math.random() * 480;
      const driftX = Math.cos(angle) * distance;
      const driftY = Math.sin(angle) * distance;
      piece.style.setProperty("--confetti-x", `${driftX.toFixed(2)}px`);
      piece.style.setProperty("--confetti-y", `${driftY.toFixed(2)}px`);
      piece.style.setProperty("--confetti-mid-x", `${(driftX * 0.62).toFixed(2)}px`);
      piece.style.setProperty("--confetti-mid-y", `${(driftY * 0.62 - 36).toFixed(2)}px`);
      piece.style.setProperty("--confetti-rotate", `${(Math.random() * 960 - 480).toFixed(2)}deg`);
      piece.style.setProperty("--confetti-delay", `${(Math.random() * 0.09).toFixed(3)}s`);
      piece.style.setProperty("--confetti-duration", `${(1.2 + Math.random() * 0.55).toFixed(3)}s`);
      piece.style.setProperty("--confetti-size", `${(8 + Math.random() * 10).toFixed(2)}px`);
      piece.style.setProperty("--confetti-color", palette[index % palette.length]);
      piece.style.setProperty("--confetti-opacity", `${(0.84 + Math.random() * 0.16).toFixed(3)}`);
      if (Math.random() > 0.55) {
        piece.classList.add("confetti-piece--circle");
      }
      burst.appendChild(piece);
    }

    document.body.appendChild(burst);
    this.confettiBurstEl = burst;
    this.confettiTimer = window.setTimeout(() => {
      burst.remove();
      if (this.confettiBurstEl === burst) {
        this.confettiBurstEl = null;
      }
    }, 2200);
  }

  downloadProfileQr() {
    const profileUrl = buildProfileUrl(this.state.routePubky);
    if (!profileUrl) return;
    const svg = renderQrSvg(profileUrl, 10);
    download(`mypubky-${this.state.routePubky || "profile"}-qr.svg`, svg, "image/svg+xml;charset=utf-8");
    this.setNotice("Profile QR downloaded.");
  }

  render() {
    const profile = this.currentProfileView();
    const routeView = this.state.routePubky ? "profile" : "home";
    const shouldShowProfileSkeleton = routeView === "profile" && !profile;
    this.root.innerHTML = `
      <div class="shell shell--${routeView}">
        ${routeView === "home" ? this.renderHome() : shouldShowProfileSkeleton ? this.renderProfileSkeleton() : this.renderProfile(profile)}
        ${this.renderModal(profile)}
        ${this.renderToasts()}
        <input id="avatar-upload" type="file" accept="image/*" hidden />
        <input id="background-upload" type="file" accept="image/*,video/*" hidden />
      </div>
    `;
    this.bindImageFallbacks();
    this.applyProfileParallax();
    if (routeView === "home" && this.shouldUseScrollDrivenHeroMotion()) {
      this.updateHeroVisualMotionFromProgress(this.getWindowScrollProgress());
    }
  }

  bindImageFallbacks() {
    const images = [...this.root.querySelectorAll("img[data-fallback-src]")];
    for (const image of images) {
      image.addEventListener(
        "error",
        () => {
          const fallbackSrc = image.dataset.fallbackSrc;
          if (!fallbackSrc || image.dataset.fallbackApplied === "true") return;
          image.dataset.fallbackApplied = "true";
          image.src = fallbackSrc;
        },
        { once: true }
      );
    }
  }

  bindCardHeightObserver() {
    this.cardHeightObserver?.disconnect?.();
    this.cardHeightObserver = null;
  }

  renderHome() {
    return `
      <main class="home-page">
        <section class="hero">
          <header class="home-header">
            <div class="brand-mark" aria-label="mypubky.com">
              <img class="brand-mark__image" src="${HOMEPAGE_FAVICON_MARK}" alt="" />
              <span>mypubky.com</span>
            </div>
          </header>
          <div class="hero__content">
            <div class="hero__copy">
              <h1>Your portable profile for the freedom web</h1>
              <p>Create a social presence that’s built to last.</p>
              <div class="hero__actions">
                <button class="button button--secondary button--lg button--with-icon hero-cta hero-cta--secondary" type="button" data-action="open-auth" data-mode="signin">
                  <span class="button__icon" aria-hidden="true">${icon("signin")}</span>
                  <span>Sign in</span>
                </button>
                <button class="button button--primary button--lg button--with-icon hero-cta hero-cta--primary" type="button" data-action="open-auth" data-mode="create">
                  <span class="button__icon" aria-hidden="true">${icon("create")}</span>
                  <span>Create</span>
                </button>
              </div>
            </div>
            <div class="${cn("hero__art", HERO_MOTION_MODE === "loop" && "hero__art--loop")}"${this.getHeroLoopTimingAttributes()}>
              <div class="hero__swirl" aria-hidden="true" style="background-image:url('${escapeHtml(HOMEPAGE_SWIRL)}')"></div>
              <div class="hero__demo" aria-hidden="true" style="background-image:url('${escapeHtml(HOMEPAGE_DEMO)}')"></div>
              <button
                class="hero__visual"
                type="button"
                data-action="open-auth"
                data-mode="create"
                aria-label="Create your profile"
                style="background-image:url('${escapeHtml(HOMEPAGE_VISUAL)}')"
              ></button>
            </div>
          </div>
          <footer class="home-footer">
            <a href="https://synonym.to" target="_blank" rel="noreferrer" aria-label="Visit Synonym">
              <img class="home-footer__endorsement" src="${HOMEPAGE_BRAND_ENDORSEMENT}" alt="Synonym, a tether company" />
            </a>
            <p class="home-footer__version">mypubky.com v${escapeHtml(APP_VERSION)}</p>
          </footer>
        </section>
      </main>
    `;
  }

  renderProfile(profile) {
    const current = profile || {};
    const own = this.isOwnProfile();
    const signedOut = !this.state.sessionPubky;
    const editablePanelOpen = this.state.activePanel === "edit" || this.state.activePanel === "style";
    const donateOpen = this.state.activePanel === "donate";
    const shareOpen = this.state.activePanel === "share";
    const cardBackOpen = editablePanelOpen || donateOpen || shareOpen;
    const backgroundUrl =
      sanitizeBrowserUrl(current.resolvedBackgroundUrl || DEFAULT_BACKGROUNDS[0].src) ||
      DEFAULT_BACKGROUNDS[0].src;
    const avatarUrl =
      sanitizeBrowserUrl(current.resolvedAvatarUrl || DEFAULT_AVATAR_PATH) ||
      DEFAULT_AVATAR_PATH;
    const flipped = Boolean(cardBackOpen && this.state.cardFlipped);
    const cardBackgroundMode = current.cardBackgroundMode || "dark";
    const showLatestPosts = Boolean(
      current.showLatestPost &&
      Array.isArray(current.latestPosts) &&
      current.latestPosts.some(
        (post) => post?.content || post?.resolvedAttachments?.length || post?.attachments?.length
      )
    );
    const showTags = current.showTags && current.tags?.length;

    return `
      <main class="profile-page">
        <section class="profile-stage">
          ${current.backgroundType === "video"
            ? `<video class="stage-media" src="${escapeHtml(backgroundUrl)}" autoplay muted loop playsinline></video>`
            : `<div class="stage-media stage-media--image" style="background-image:url('${escapeHtml(backgroundUrl)}')"></div>`}
          <div class="stage-overlay"></div>
          ${own
            ? (editablePanelOpen ? this.renderPanelNav() : this.renderOwnerToolbar())
            : signedOut
              ? this.renderPublicProfileToolbar()
              : ""}
          <div class="profile-stack profile-stack--${escapeHtml(current.cardPosition || "center")}">
            <div class="${cn("profile-column", `profile-column--card-background-${cardBackgroundMode}`)}">
            <div class="${cn("profile-card-shell", cardBackOpen && "profile-card-shell--panel")}">
                <div class="${cn("profile-card", cardBackOpen && "profile-card--panel", flipped && "is-flipped")}">
                  <article class="profile-face profile-face--front">
                    <div class="profile-face__body">
                      <div class="profile-card__main">
                        <div class="card-topbar">
                          <div class="card-topbar__slot card-topbar__slot--start">
                            <button
                              class="${cn("icon-button", !current.donateEnabled && "icon-button--disabled")}"
                              type="button"
                              ${current.donateEnabled ? 'data-action="open-donate"' : 'disabled'}
                              aria-label="Donate"
                            >${icon("wallet")}</button>
                          </div>
                          <div class="card-topbar__slot card-topbar__slot--center">
                            <button class="card-brand" type="button" data-action="open-brand" aria-label="About mypubky.com">${icon("pubky")}</button>
                          </div>
                          <div class="card-topbar__slot card-topbar__slot--end">
                            <button class="icon-button" type="button" data-action="open-share" aria-label="Share">${icon("share")}</button>
                          </div>
                        </div>
                        <div class="profile-card__header">
                          <div class="card-meta">${escapeHtml(shortenPubky(current.pubky || this.state.routePubky))}</div>
                          <button class="avatar avatar--display" type="button" ${own ? 'data-action="trigger-avatar-upload"' : ""} aria-label="Profile avatar">
                            <img src="${escapeHtml(avatarUrl)}" data-fallback-src="${escapeHtml(DEFAULT_AVATAR_PATH)}" alt="${escapeHtml(current.name || "Profile avatar")}" />
                          </button>
                          <h2>${escapeHtml(current.name || "Unnamed")}</h2>
                          <p class="profile-card__bio">${escapeHtml(current.bio || "A portable profile for the freedom web.")}</p>
                          ${showTags ? `<div class="tag-row">${current.tags.map((tag) => renderTagPill(tag)).join("")}</div>` : ""}
                        </div>
                        <div class="chip-row">
                          ${current.buttonLinks?.map((link) => {
                            const safeUrl = sanitizeBrowserUrl(link.url);
                            if (!safeUrl) return "";
                            const targetAttrs = isMailtoUrl(safeUrl) ? "" : ' target="_blank" rel="noreferrer"';
                            return `<a class="chip chip--button" href="${escapeHtml(safeUrl)}"${targetAttrs}>${escapeHtml(link.title)}</a>`;
                          }).join("") || ""}
                        </div>
                        <div class="social-row">
                          <a class="icon-button" href="https://pubky.app/profile/${escapeHtml(current.pubky || this.state.routePubky)}" target="_blank" rel="noreferrer" aria-label="Open on pubky.app">${icon("pubky")}</a>
                          ${current.socialLinks?.map((link) => {
                            const safeUrl = sanitizeBrowserUrl(link.url);
                            if (!safeUrl) return "";
                            return `<a class="icon-button" href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(link.label)}">${icon(link.icon)}</a>`;
                          }).join("") || ""}
                        </div>
                      </div>
                    </div>
                  </article>
                ${cardBackOpen
                  ? `
                    <article class="profile-face profile-face--back">
                      <div class="profile-face__body">
                        ${
                          donateOpen
                            ? this.renderDonateBack(current)
                            : shareOpen
                              ? this.renderShareBack(current)
                              : this.renderEditorBack()
                        }
                      </div>
                    </article>
                  `
                  : ""}
              </div>
            </div>
            ${!cardBackOpen && showLatestPosts ? this.renderLatestPosts(current.latestPosts, avatarUrl) : ""}
            ${!cardBackOpen ? this.renderProfileFooter() : ""}
            </div>
          </div>
        </section>
      </main>
    `;
  }

  renderProfileFooter() {
    return `
      <footer class="profile-footer" aria-label="Profile footer">
        <p>mypubky.com v${escapeHtml(APP_VERSION)}</p>
      </footer>
    `;
  }

  renderProfileSkeleton() {
    return `
      <main class="profile-page">
        <section class="profile-stage">
          <div class="stage-media stage-media--image stage-media--loading" aria-hidden="true"></div>
          <div class="stage-overlay"></div>
          <div class="profile-stack profile-stack--center">
            <div class="profile-column">
              <div class="profile-card-shell">
                <div class="profile-card">
                  <article class="profile-face profile-face--front profile-face--skeleton">
                    <div class="profile-face__body">
                      <div class="profile-card__main">
                        <div class="card-topbar">
                          <div class="card-topbar__slot card-topbar__slot--start"><span class="skeleton skeleton--icon"></span></div>
                          <div class="card-topbar__slot card-topbar__slot--center"><span class="skeleton skeleton--icon skeleton--brand"></span></div>
                          <div class="card-topbar__slot card-topbar__slot--end"><span class="skeleton skeleton--icon"></span></div>
                        </div>
                        <div class="profile-card__header">
                          <span class="skeleton skeleton--label"></span>
                          <span class="skeleton skeleton--avatar"></span>
                          <span class="skeleton skeleton--title"></span>
                          <span class="skeleton skeleton--line skeleton--line-lg"></span>
                          <span class="skeleton skeleton--line"></span>
                        </div>
                        <div class="chip-row">
                          <span class="skeleton skeleton--chip"></span>
                          <span class="skeleton skeleton--chip"></span>
                          <span class="skeleton skeleton--chip"></span>
                        </div>
                        <div class="social-row">
                          <span class="skeleton skeleton--icon"></span>
                          <span class="skeleton skeleton--icon"></span>
                          <span class="skeleton skeleton--icon"></span>
                          <span class="skeleton skeleton--icon"></span>
                          <span class="skeleton skeleton--icon"></span>
                        </div>
                        <div class="tag-row">
                          <span class="skeleton skeleton--tag"></span>
                          <span class="skeleton skeleton--tag"></span>
                          <span class="skeleton skeleton--tag"></span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
              ${Array.from({ length: 3 })
                .map(
                  () => `
                    <section class="post-card post-card--skeleton">
                      <span class="skeleton skeleton--post-avatar"></span>
                      <span class="skeleton skeleton--line skeleton--line-lg"></span>
                      <div class="post-card__meta">
                        <span class="skeleton skeleton--preview"></span>
                        <span class="skeleton skeleton--tag"></span>
                      </div>
                    </section>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>
      </main>
    `;
  }

  renderOwnerToolbar() {
    return `
      <div class="owner-toolbar">
        <button class="button button--toolbar" type="button" data-action="open-edit">${icon("pencil")} <span>Edit</span></button>
        <button class="button button--toolbar" type="button" data-action="sign-out">${icon("logout")} <span>Sign out</span></button>
      </div>
    `;
  }

  renderPublicProfileToolbar() {
    return `
      <div class="owner-toolbar">
        <button class="button button--toolbar" type="button" data-action="open-brand">${icon("create")} <span>Create</span></button>
        <button class="button button--toolbar" type="button" data-action="open-auth" data-mode="signin">${icon("signin")} <span>Sign in</span></button>
      </div>
    `;
  }

  renderPanelNav() {
    const saving = this.state.loading;
    return `
      <div class="owner-toolbar owner-toolbar--panel">
        <button class="button button--toolbar" type="button" data-action="cancel-panel" ${saving ? "disabled" : ""}>${icon("close")} <span>Cancel</span></button>
        <button class="button button--primary button--toolbar ${saving ? "button--is-loading" : ""}" type="button" data-action="save-panel" ${saving ? "disabled aria-busy=\"true\"" : ""}>
          ${saving ? '<span class="button__spinner" aria-hidden="true"></span>' : icon("check")}
          <span>${saving ? "Saving..." : "Save"}</span>
        </button>
      </div>
    `;
  }

  renderLatestPosts(posts, avatarUrl) {
    const safeAvatarUrl = sanitizeBrowserUrl(avatarUrl) || DEFAULT_AVATAR_PATH;
    const items = posts
      .slice(0, 3)
      .map((post) => {
        const primaryTag = Array.isArray(post?.tags) && post.tags.length ? post.tags[0] : null;
        const tagCount = String(
          primaryTag?.taggers_count || primaryTag?.count || primaryTag?.taggers?.length || 0
        );
        const postUrl = buildPubkyPostUrl(post, this.state.routePubky);

        return `
          <a class="post-card" href="${escapeHtml(postUrl)}" target="_blank" rel="noreferrer">
            <div class="post-card__avatar">
              <img src="${escapeHtml(safeAvatarUrl)}" data-fallback-src="${escapeHtml(DEFAULT_AVATAR_PATH)}" alt="" />
            </div>
            <div class="post-card__copy">
              <p class="post-card__body">${escapeHtml(post?.content || "Untitled post")}</p>
            </div>
            <div class="post-card__meta">
              <time class="post-card__time">${icon("clock")}<span>${escapeHtml(post?.relativeTime || formatRelativeTime(Date.now()))}</span></time>
              ${primaryTag ? renderTagPill(primaryTag, { className: "tag-pill--post", count: tagCount }) : ""}
            </div>
          </a>
        `;
      })
      .join("");

    return items ? `<div class="posts-stack" aria-label="Posts">${items}</div>` : "";
  }

  renderDonateBack(profile) {
    const paykitTarget = buildPaykitQrValue(profile.pubky || this.state.routePubky);
    const bitcoinAddress = String(profile.bitcoinAddress || "").trim();
    const hasBitcoinAddress = Boolean(bitcoinAddress);
    const qrMode =
      hasBitcoinAddress && this.state.donateQrMode === "bitcoin"
        ? "bitcoin"
        : "paykit";
    const qrValue =
      qrMode === "bitcoin"
        ? buildBitcoinQrValue(bitcoinAddress)
        : paykitTarget;
    const qrBadgeImage = qrMode === "bitcoin" ? BITCOIN_BADGE_IMAGE : HOMEPAGE_BRAND_MARK;

    return `
      <div class="donate-panel">
        <div class="card-topbar donate-panel__topbar">
          <div class="card-topbar__slot card-topbar__slot--start">
            <button class="icon-button" type="button" data-action="close-back" aria-label="Back to profile">${icon("arrow-left")}</button>
          </div>
          <div class="card-topbar__slot card-topbar__slot--center">
            <button class="card-brand" type="button" data-action="open-brand" aria-label="About mypubky.com">${icon("pubky")}</button>
          </div>
          <div class="card-topbar__slot card-topbar__slot--end"></div>
        </div>
        ${
          hasBitcoinAddress
            ? `
              <div class="donate-tabs" role="tablist" aria-label="Donation QR type">
                <button class="${cn("donate-tab", qrMode === "paykit" && "is-active")}" type="button" data-action="set-donate-qr-mode" data-value="paykit" role="tab" aria-selected="${qrMode === "paykit"}">Paykit QR</button>
                <button class="${cn("donate-tab", qrMode === "bitcoin" && "is-active")}" type="button" data-action="set-donate-qr-mode" data-value="bitcoin" role="tab" aria-selected="${qrMode === "bitcoin"}">Bitcoin QR</button>
              </div>
            `
            : ""
        }
        <div class="donate-panel__qr">
          ${renderQrSvg(qrValue, 10)}
          <div class="qr-frame__badge ${qrMode === "bitcoin" ? "qr-frame__badge--bitcoin" : "qr-frame__badge--paykit"}" aria-hidden="true">
            <img class="${qrMode === "bitcoin" ? "bitcoin-badge__image" : "qr-frame__badge-image qr-frame__badge-image--paykit"}" src="${qrBadgeImage}" alt="" />
          </div>
        </div>
        <p class="donate-panel__note">Thank you. Your support is greatly appreciated.</p>
      </div>
    `;
  }

  renderShareBack(profile) {
    const profileUrl = buildProfileUrl(profile.pubky || this.state.routePubky);

    return `
      <div class="share-panel donate-panel">
        <div class="card-topbar donate-panel__topbar">
          <div class="card-topbar__slot card-topbar__slot--start">
            <button class="icon-button" type="button" data-action="close-back" aria-label="Back to profile">${icon("arrow-left")}</button>
          </div>
          <div class="card-topbar__slot card-topbar__slot--center">
            <button class="card-brand" type="button" data-action="open-brand" aria-label="About mypubky.com">${icon("pubky")}</button>
          </div>
          <div class="card-topbar__slot card-topbar__slot--end"></div>
        </div>
        <div class="share-panel__link">
          <span class="share-box__label">Profile link</span>
          <div class="share-box">
            <input
              class="share-box__input"
              type="text"
              readonly
              value="${escapeHtml(profileUrl)}"
              aria-label="Profile URL"
            />
            <button class="button button--ghost button--sm" type="button" data-action="copy-link">Copy</button>
          </div>
        </div>
        <div class="donate-panel__qr donate-panel__qr--share">
          ${renderQrSvg(profileUrl, 10)}
          <div class="qr-frame__badge qr-frame__badge--paykit" aria-hidden="true">
            <img class="qr-frame__badge-image qr-frame__badge-image--paykit" src="${HOMEPAGE_BRAND_MARK}" alt="" />
          </div>
        </div>
        <div class="panel-actions">
          <button class="button button--primary button--lg" type="button" data-action="download-share">Download profile QR</button>
        </div>
      </div>
    `;
  }

  renderEditorBack() {
    const editorTab = this.state.editorTab === "style" ? "style" : "content";
    return `
      <div class="panel-content ${editorTab === "style" ? "panel-content--style" : ""}">
        <div class="donate-tabs editor-tabs" role="tablist" aria-label="Editor section">
          <button
            class="${cn("donate-tab", editorTab === "content" && "is-active")}"
            type="button"
            data-action="set-editor-tab"
            data-value="content"
            role="tab"
            aria-selected="${editorTab === "content"}"
          >
            <span class="donate-tab__inner">${icon("file-text")}<span>Content</span></span>
          </button>
          <button
            class="${cn("donate-tab", editorTab === "style" && "is-active")}"
            type="button"
            data-action="set-editor-tab"
            data-value="style"
            role="tab"
            aria-selected="${editorTab === "style"}"
          >
            <span class="donate-tab__inner">${icon("paint")}<span>Style</span></span>
          </button>
        </div>
        ${editorTab === "style" ? this.renderStyleContent() : this.renderEditContent()}
      </div>
    `;
  }

  renderEditContent() {
    const draft = this.state.draft || createEmptyDraft(this.state.routePubky, this.state.profile || {});
    const avatarPreview =
      sanitizeBrowserUrl(draft.avatarPreview || this.state.profile?.resolvedAvatarUrl || DEFAULT_AVATAR_PATH) ||
      DEFAULT_AVATAR_PATH;
    return `
      <div class="editor-panel editor-panel--content">
        <section class="panel-section panel-section--intro">
          <div class="panel-content__header">${escapeHtml(shortenPubky(draft.pubky || this.state.routePubky))}</div>
          <button class="avatar avatar--editor" type="button" data-action="trigger-avatar-upload">
            <img src="${escapeHtml(avatarPreview)}" data-fallback-src="${escapeHtml(DEFAULT_AVATAR_PATH)}" alt="Avatar preview" />
            <span class="avatar__overlay">${icon("image-plus")}</span>
          </button>
          <label class="field-group">
            <span>Name</span>
            <input class="field" data-field="name" value="${escapeHtml(draft.name)}" placeholder="Your name or alias" />
          </label>
          <label class="field-group">
            <span>Bio</span>
            <textarea class="field field--textarea" data-field="bio" placeholder="Tell a bit about yourself">${escapeHtml(draft.bio)}</textarea>
          </label>
        </section>
        <section class="field-section">
          <div class="field-section__header">
            <span>Link buttons</span>
          </div>
          <div class="chip-row chip-row--editable">
            ${draft.buttonLinks.map((link, index) => `
              <span class="chip chip--button chip--draggable" draggable="true" data-link-index="${index}" aria-label="Drag to reorder ${escapeHtml(link.title)}">
                ${escapeHtml(link.title)}
                <button type="button" class="chip__remove" data-action="delete-link" data-index="${index}" aria-label="Remove link">${icon("trash")}</button>
              </span>
            `).join("")}
            <button class="button button--secondary button--sm" type="button" data-action="open-add-link">${icon("plus")} <span>add</span></button>
          </div>
        </section>
        <section class="field-section">
          <span>Socials</span>
          <div class="social-grid">
            ${SOCIAL_PLATFORMS.map((platform) => platformInput(platform, draft)).join("")}
          </div>
        </section>
        <section class="field-section">
          <span>Latest Pubky posts</span>
          <div class="toggle-row">
            <p>Show latest three pubky posts on profile</p>
            ${toggleMarkup(draft.showLatestPost, "showLatestPost")}
          </div>
        </section>
        <section class="field-section">
          <span>Profile tags</span>
          <div class="toggle-row">
            <p>Display pubky.app profile tags</p>
            ${toggleMarkup(draft.showTags, "showTags")}
          </div>
        </section>
        <section class="field-section">
          <span>Donations</span>
          <div class="toggle-row">
            <p>Enable donations, tips, and other payments via Paykit.</p>
            ${toggleMarkup(draft.donateEnabled, "donateEnabled")}
          </div>
          <label class="field-group field-group--stack-gap">
            <span>Bitcoin address</span>
            <input class="field" data-field="bitcoinAddress" value="${escapeHtml(draft.bitcoinAddress || "")}" placeholder="bc1..." />
          </label>
        </section>
      </div>
    `;
  }

  renderStyleContent() {
    const draft = this.state.draft || createEmptyDraft(this.state.routePubky, this.state.profile || {});
    const cardBackgroundMode = draft.cardBackgroundMode || "dark";
    const hasSavedCustomBackground =
      draft.backgroundId === "custom" &&
      !draft.backgroundPreview &&
      this.state.profile?.backgroundId === "custom";
    const customBackgroundPreview =
      sanitizeBrowserUrl(
      draft.backgroundPreview ||
      (hasSavedCustomBackground ? (this.state.profile?.resolvedBackgroundUrl || draft.backgroundUrl || "") : "")
      ) || "";
    const customBackgroundType =
      draft.backgroundId === "custom"
        ? (draft.backgroundType || this.state.profile?.backgroundType || "image")
        : "image";
    return `
      <div class="editor-panel editor-panel--style">
        <section class="field-section">
          <span>Background image</span>
          <div class="background-grid">
            ${DEFAULT_BACKGROUNDS.map((background) => `
              <button class="${cn("background-option", draft.backgroundId === background.id && "is-selected")}" type="button" data-action="select-background" data-background-id="${background.id}">
                <img src="${background.src}" alt="${escapeHtml(background.label)}" />
              </button>
            `).join("")}
            <button class="${cn("background-option background-option--upload", draft.backgroundId === "custom" && "is-selected")}" type="button" data-action="trigger-background-upload">
              ${
                customBackgroundPreview
                  ? `
                    ${
                      customBackgroundType === "video"
                        ? `<video src="${escapeHtml(customBackgroundPreview)}" muted autoplay loop playsinline preload="metadata" aria-hidden="true"></video>`
                        : `<img src="${escapeHtml(customBackgroundPreview)}" alt="Custom background preview" />`
                    }
                  `
                  : `<span class="background-option__label">Upload</span>`
              }
            </button>
          </div>
        </section>
        <section class="field-section">
          <span>Card background</span>
          <div class="segment-row segment-row--card-background">
            ${[
              { value: "dark", label: "Dark" },
              { value: "blur", label: "Blur" },
              { value: "clear", label: "Clear" }
            ].map((option) => `
              <button
                class="${cn("segment segment--style", cardBackgroundMode === option.value && "is-active")}"
                type="button"
                data-action="set-card-background-mode"
                data-value="${option.value}"
              >
                ${escapeHtml(option.label)}
              </button>
            `).join("")}
          </div>
        </section>
        <section class="field-section">
          <span>Profile card position</span>
          <div class="segment-row">
            ${["left", "center", "right"].map((position) => `
              <button class="${cn("segment segment--style", draft.cardPosition === position && "is-active")}" type="button" data-action="set-card-position" data-value="${position}">
                ${escapeHtml(position.charAt(0).toUpperCase() + position.slice(1))}
              </button>
            `).join("")}
          </div>
        </section>
      </div>
    `;
  }

  renderModal(profile) {
    if (!this.state.modal) return "";
    const { type } = this.state.modal;

    let content = "";
    if (type === "brand") {
      content = `
        <div class="dialog dialog--brand">
          <button class="dialog__close" type="button" data-action="close-modal">${icon("close")}</button>
          <div class="dialog__header">
            <h3>Your portable profile for the freedom web</h3>
            <p>Create a social presence that’s built to last. One that nobody can take away from you.</p>
          </div>
          <div class="hero__art hero__art--dialog">
            <img class="hero__visual hero__visual--dialog" src="${HOMEPAGE_VISUAL}" alt="Pubky profile illustration" />
          </div>
          <div class="dialog__actions">
            <button class="button button--secondary button--lg" type="button" data-action="close-modal">Cancel</button>
            <button class="button button--primary button--lg" type="button" data-action="start-create">Create</button>
          </div>
        </div>
      `;
    }

    if (type === "auth") {
      const mode = this.state.auth?.mode || "create";
      const useDeepLink = Boolean(this.state.auth?.useDeepLink);
      const title = mode === "signin" ? "Sign in to your profile" : "Create your profile";
      const subtitle =
        mode === "signin"
          ? useDeepLink
            ? `
              Authorize with <a href="https://pubkyring.app" target="_blank" rel="noreferrer" class="dialog__accent">Pubky Ring</a> to sign in.
            `
            : `
              Open <a href="https://pubkyring.app" target="_blank" rel="noreferrer" class="dialog__accent">Pubky Ring</a>, scan QR, sign in.
            `
          : useDeepLink
            ? `
              Join <a href="https://pubky.app" target="_blank" rel="noreferrer" class="dialog__accent">pubky.app</a>, authorize with
              <a href="https://pubkyring.app" target="_blank" rel="noreferrer" class="dialog__accent">Pubky Ring</a>.
            `
            : `
              Join <a href="https://pubky.app" target="_blank" rel="noreferrer" class="dialog__accent">pubky.app</a>, download
              <a href="https://pubkyring.app" target="_blank" rel="noreferrer" class="dialog__accent">Pubky Ring</a>, scan QR.
            `;
      content = `
        <div class="dialog dialog--auth">
          <button class="dialog__close" type="button" data-action="close-modal">${icon("close")}</button>
          <div class="dialog__header dialog__header--auth">
            <h3>${title}</h3>
            <p>${subtitle}</p>
          </div>
          ${useDeepLink
            ? `
              <div class="dialog__mobile-auth">
                <button class="button button--primary button--lg" type="button" data-action="open-auth-link">
                  <span class="button__icon" aria-hidden="true">${icon("signin")}</span>
                  <span>Authorize</span>
                </button>
              </div>
            `
            : `
              <div class="dialog__qr-wrap">
                <div class="qr-frame qr-frame--auth">
                  ${this.state.auth?.qrSvg || ""}
                  <div class="qr-frame__badge" aria-hidden="true">
                    <img class="qr-frame__badge-image" src="${HOMEPAGE_BRAND_MARK}" alt="" />
                  </div>
                </div>
              </div>
            `}
          ${this.state.auth?.message ? `<p class="dialog__status">${escapeHtml(this.state.auth.message)}</p>` : ""}
          ${this.state.auth?.error ? `<p class="dialog__error">${escapeHtml(this.state.auth.error)}</p>` : ""}
          <div class="dialog__actions">
            <button class="button button--secondary button--lg" type="button" data-action="close-modal">Cancel</button>
          </div>
        </div>
      `;
    }

    if (type === "share") {
      const targetProfile = profile || this.state.profile || {};
      content = `
        <div class="dialog dialog--share">
          <button class="dialog__close" type="button" data-action="close-modal">${icon("close")}</button>
          <div class="dialog__header">
            <h3>Share profile</h3>
          </div>
          <div class="share-box">
            <input
              class="share-box__input"
              type="text"
              readonly
              value="${escapeHtml(buildProfileUrl(this.state.routePubky))}"
              aria-label="Profile URL"
            />
            <button class="button button--ghost button--sm" type="button" data-action="copy-link">Copy</button>
          </div>
          <div class="donate-panel__qr donate-panel__qr--share">
            ${renderQrSvg(buildProfileUrl(this.state.routePubky), 10)}
            <div class="qr-frame__badge qr-frame__badge--paykit" aria-hidden="true">
              <img class="qr-frame__badge-image qr-frame__badge-image--paykit" src="${HOMEPAGE_BRAND_MARK}" alt="" />
            </div>
          </div>
          <div class="dialog__actions">
            <button class="button button--secondary button--lg" type="button" data-action="close-modal">Close</button>
            <button class="button button--primary button--lg" type="button" data-action="download-share">Download profile QR</button>
          </div>
        </div>
      `;
    }

    if (type === "add-link") {
      const payload = this.state.modal.payload || {};
      content = `
        <div class="dialog">
          <button class="dialog__close" type="button" data-action="close-modal">${icon("close")}</button>
          <div class="dialog__header">
            <h3>Create link button</h3>
            <p>Add any link you want to your profile.</p>
          </div>
          <form class="dialog__form" data-form="add-link">
            <label class="field-group">
              <span>Link label</span>
              <input class="field" name="title" placeholder="For example ‘Portfolio’" value="${escapeHtml(payload.title || "")}" />
            </label>
            <label class="field-group">
              <span>Link URL</span>
              <input class="field" name="url" placeholder="https://" value="${escapeHtml(payload.url || "")}" />
            </label>
            <div class="dialog__actions">
              <button class="button button--secondary button--lg" type="button" data-action="close-modal">Cancel</button>
              <button class="button button--primary button--lg" type="submit">Save</button>
            </div>
          </form>
        </div>
      `;
    }

    return `<div class="modal-backdrop">${content}</div>`;
  }

  renderToasts() {
    if (!this.state.notice && !this.state.error) return "";
    return `
      <div class="toast ${this.state.error ? "toast--error" : ""}">
        ${escapeHtml(this.state.error || this.state.notice)}
      </div>
    `;
  }
}
