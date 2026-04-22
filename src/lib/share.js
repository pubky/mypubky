import { DEFAULT_BACKGROUNDS } from "./config.js";
import { shortenPubky } from "./utils.js";

function escapeXml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createShareCardSvg(profile) {
  const background =
    DEFAULT_BACKGROUNDS.find((entry) => entry.id === profile.backgroundId)?.src ||
    profile.backgroundUrl;
  const name = escapeXml(profile.name || "Your name");
  const bio = escapeXml(profile.bio || "Portable profile for the freedom web");
  const pubky = escapeXml(shortenPubky(profile.pubky));
  const avatar = escapeXml(profile.resolvedAvatarUrl || profile.image || "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGlow" x1="600" y1="100" x2="600" y2="530" gradientUnits="userSpaceOnUse">
      <stop stop-color="rgba(255,255,255,0.08)" />
      <stop offset="1" stop-color="rgba(255,255,255,0.02)" />
    </linearGradient>
  </defs>
  <image href="${background}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1200" height="630" fill="rgba(5,5,10,0.28)"/>
  <rect x="350" y="75" rx="32" width="500" height="480" fill="#05050a"/>
  <rect x="350" y="75" rx="32" width="500" height="480" fill="url(#cardGlow)"/>
  <text x="600" y="138" fill="#89898f" font-family="'Inter Tight', Inter, sans-serif" font-size="18" text-anchor="middle" letter-spacing="0.18em">${pubky}</text>
  <clipPath id="avatarClip">
    <circle cx="600" cy="220" r="68" />
  </clipPath>
  <circle cx="600" cy="220" r="68" fill="#16161b"/>
  <image href="${avatar}" x="532" y="152" width="136" height="136" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>
  <text x="600" y="350" fill="white" font-family="'Inter Tight', Inter, sans-serif" font-size="68" font-weight="700" text-anchor="middle">${name}</text>
  <foreignObject x="420" y="380" width="360" height="95">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#d4d4db;font-family:'Inter Tight',Inter,sans-serif;font-size:22px;line-height:1.35;text-align:center;">
      ${bio}
    </div>
  </foreignObject>
  <text x="600" y="515" fill="#c8ff00" font-family="'Inter Tight', Inter, sans-serif" font-size="24" font-weight="700" text-anchor="middle">mypubky.com</text>
</svg>`;
}
