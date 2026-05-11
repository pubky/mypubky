export const APP_NAME = "mypubky.com";
export const PUBKY_PROFILE_PATH = "/pub/pubky.app/profile.json";
export const CARD_SETTINGS_PATH = `/pub/${APP_NAME}/card.json`;
export const FILES_PATH = `/pub/${APP_NAME}/files`;
export const PUBKY_POSTS_PATH = "/pub/pubky.app/posts/";
export const PAYKIT_PATH_PREFIX = "/pub/paykit.app/v0";
export const PAYKIT_ONCHAIN_METHOD_ID = "onchain";
export const RELAY_URL = "https://httprelay.pubky.app/inbox/";
export const NEXUS_URL = import.meta.env.VITE_NEXUS_URL || "https://nexus.pubky.app";
export const CDN_URL = import.meta.env.VITE_CDN_URL || `${NEXUS_URL}/static`;
export const PKARR_RELAYS = (import.meta.env.VITE_PKARR_RELAYS || "https://pkarr.pubky.app,https://pkarr.pubky.org")
  .split(",")
  .map((relay) => relay.trim())
  .filter(Boolean);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DEFAULT_AVATAR_PATH = new URL("../assets/avatar.png", import.meta.url).href;
export const HOMEPAGE_BRAND_MARK = new URL("../assets/pubky.svg", import.meta.url).href;
export const HOMEPAGE_VISUAL = new URL("../assets/uservisual.png", import.meta.url).href;
export const HOMEPAGE_BRAND_ENDORSEMENT = new URL("../assets/brandendorsement.png", import.meta.url).href;
export const DEFAULT_BACKGROUNDS = [
  {
    id: "back1",
    label: "Back 1",
    type: "image",
    src: new URL("../assets/back1.png", import.meta.url).href
  },
  {
    id: "back2",
    label: "Back 2",
    type: "image",
    src: new URL("../assets/back2.png", import.meta.url).href
  },
  {
    id: "back3",
    label: "Back 3",
    type: "image",
    src: new URL("../assets/back3.png", import.meta.url).href
  }
];

export const SOCIAL_PLATFORMS = [
  {
    key: "pubky",
    label: "Pubky",
    matchers: ["pubky.app", "pubky://"],
    placeholder: "https://pubky.app/profile/",
    icon: "pubky"
  },
  {
    key: "x",
    label: "X",
    matchers: ["x.com", "twitter.com"],
    placeholder: "https://x.com/username",
    icon: "x"
  },
  {
    key: "telegram",
    label: "Telegram",
    matchers: ["telegram.me", "t.me"],
    placeholder: "https://t.me/username",
    icon: "telegram"
  },
  {
    key: "github",
    label: "GitHub",
    matchers: ["github.com"],
    placeholder: "https://github.com/username",
    icon: "github"
  },
  {
    key: "tiktok",
    label: "TikTok",
    matchers: ["tiktok.com"],
    placeholder: "https://tiktok.com/@username",
    icon: "tiktok"
  },
  {
    key: "youtube",
    label: "YouTube",
    matchers: ["youtube.com", "youtu.be"],
    placeholder: "https://youtube.com/@channel",
    icon: "youtube"
  }
];

export const AUTH_CAPABILITY_ENTRIES = [
  `${PUBKY_PROFILE_PATH}:rw`,
  `/pub/${APP_NAME}/:rw`,
  `${PAYKIT_PATH_PREFIX}/:rw`
];

export const AUTH_CAPABILITIES = AUTH_CAPABILITY_ENTRIES.join(",");

export const STORAGE_KEYS = {
  lastPubky: "mypubky:last-pubky",
  lastSession: "mypubky:last-session",
  lastSessionDiagnostic: "mypubky:last-session-diagnostic",
  draftShareMode: "mypubky:last-share-mode"
};
