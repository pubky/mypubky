# mypubky.com

`mypubky.com` is a portable profile card for the freedom web, powered by Pubky.

It is designed to feel more like a shareable identity card than a typical "link in bio" page. A profile can combine a user’s Pubky identity, avatar, bio, social links, custom background, latest posts, profile tags, sharing tools, and Paykit-ready donation flows into one visual page that can be shared anywhere.

## What the product does

- Presents a public profile at a route like `/:pubky`
- Reads shared identity data from `pubky.app`
- Lets the owner sign in with Pubky Ring and edit their profile
- Supports custom image or video backgrounds
- Supports left, center, or right card placement
- Supports multiple card background modes: `Dark`, `Blur`, and `Clear`
- Shows up to 3 latest Pubky posts
- Shows Pubky profile tags
- Includes a share flow with profile link + QR
- Includes a donation flow with `Paykit QR` and optional `Bitcoin QR`

The editing experience uses a 3D card flip. The public profile, share state, donate state, and editor all stay inside the same visual card system.

## Current feature set

### Public profile

- Avatar, display name, shortened Pubky, and bio
- Button links under the bio
- Social icons
- Optional profile tags
- Up to 3 latest Pubky posts
- Share state as a card flip
- Donate state as a card flip

### Editing

- Sign in with Pubky Ring QR auth
- `Content` and `Style` tabs inside the flipped editor
- Avatar upload
- Name and bio editing
- Link button creation, deletion, and drag-to-reorder
- Social platform fields, including auto-derived Pubky profile URL
- Toggles for latest posts, profile tags, and donations
- Optional Bitcoin address field for Paykit / Bitcoin donate flow

### Styling

- 3 default backgrounds plus custom upload
- Image and short looping video background support
- Card background modes:
  - `Dark`
  - `Blur`
  - `Clear`
- Card position:
  - `Left`
  - `Center`
  - `Right`

### Share + donate

- Share panel with profile link + QR
- Downloadable profile QR
- Donate panel with Paykit-native Pubky QR
- Optional Bitcoin QR tab when a Bitcoin address is set
- Paykit method publishing under the user’s public Pubky storage

## Tech stack

- [Vite](https://vitejs.dev/)
- Vanilla JavaScript
- CSS
- [`@synonymdev/pubky`](https://www.npmjs.com/package/@synonymdev/pubky)
- [`qr`](https://www.npmjs.com/package/qr)

This project is intentionally lightweight. It is built as a static frontend app and does not require a traditional database or custom backend for the core profile flow.

## Storage model

The app uses Pubky public storage and keeps shared identity data aligned with `pubky.app` where possible.

- Shared profile:
  - `/pub/pubky.app/profile.json`
- mypubky card settings:
  - `/pub/mypubky.com/card.json`
- mypubky uploads:
  - `/pub/mypubky.com/files/*`
- Paykit public method files:
  - `/pub/paykit/v0/*`

In practice:

- `name`, `bio`, `image`, and portable links are aligned with `pubky.app`
- presentation-specific settings live in `mypubky.com`
- optional payment method files live in `paykit`

## Run locally

1. Install Node.js 20 or newer
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open the local URL shown by Vite

## Build for production

Create a production build with:

```bash
npm run build
```

Vite will generate a static output in `dist/`.

## Deployment

The app is designed to be deployable as a static site.

Typical flow:

1. Run `npm install`
2. Run `npm run build`
3. Upload the generated `dist/` folder to a static host

Good hosting options include:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- any static host that supports HTTPS

For profile routes like `/:pubky`, the host must rewrite unknown routes back to `index.html` so the client app can boot and resolve the Pubky itself.

This repo now includes common static-host fallback files:

- `public/.htaccess` for Apache-style hosting
- `public/_redirects` for Netlify-style hosting

After `npm run build`, make sure those files are uploaded with the rest of `dist/`.

## Notes

- Auth is handled with Pubky Ring QR approval
- Sessions are stored locally and restored when possible
- The app includes lightweight session diagnostics to help explain when a session expires or loses required permissions
- Uploaded media is currently capped by app rules for simpler UX

## Vision

`mypubky.com` is not just a links page.

It is meant to be a portable public identity surface for Pubky:

- who you are
- how to reach you
- how to verify it is really you
- how to follow you in the ecosystem
- how to support you

The goal is to make Pubky useful and shareable anywhere on the web.
