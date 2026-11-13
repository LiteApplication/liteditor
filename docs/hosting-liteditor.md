# Hosting LiteEditor

This page is for people who run their own copy of LiteEditor, for example to serve it under their own domain. You do not need it to use LiteEditor on a website repository. Editors only need access to the instance and to the repository.

LiteEditor is a static single-page app. It has no backend of its own. It needs two external pieces:

- a **GitHub OAuth App**, which identifies LiteEditor to GitHub;
- a **Gatekeeper** instance, a small proxy that holds the OAuth client secret and turns the OAuth code into an access token.

## 1. Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name**: any name, shown to users on the authorization screen.
   - **Homepage URL**: the origin of your LiteEditor instance, for example `https://editor.example.com`.
   - **Authorization callback URL**: the same origin with `/callback` appended, for example `https://editor.example.com/callback`.
3. Register the app and copy the **Client ID**.
4. Generate a **Client secret** and store it in your Gatekeeper configuration. Never put it in LiteEditor's environment or in the repository.

LiteEditor builds the callback URL at runtime from `window.location.origin + "/callback"`. The callback URL of the OAuth App must match it exactly.

Each OAuth App accepts one callback URL. For local development, register a second OAuth App whose callback is `http://localhost:5173/callback` (Vite's default port), or change the port with `vite --port` and update the callback to match.

### Scopes

LiteEditor requests these scopes when it redirects to GitHub:

| Scope | Why |
|---|---|
| `repo` | Read and write the repository contents, and read Actions runs for the build badge |
| `read:user` | Read the signed-in user's profile and organizations |

Scopes are requested by the app at login time. They are not set in the OAuth App settings page.

## 2. Deploy the Gatekeeper

LiteEditor exchanges the OAuth code by calling:

```
GET <VITE_TOKEN_PROXY_URL>/<code>
```

The response must be JSON, either `{ "token": "..." }` on success or `{ "error": "..." }` on failure. The reference implementation is [prose/gatekeeper](https://github.com/prose/gatekeeper). Deploy it with your OAuth App's client ID and client secret.

Requirements:

- The browser calls the proxy directly, so the proxy must allow requests from your LiteEditor origin (CORS).
- The proxy URL in `VITE_TOKEN_PROXY_URL` must include the path the proxy serves, for example `/authenticate`.

## 3. Environment variables

LiteEditor reads two variables. Both are inlined into the JavaScript bundle by Vite at build time, so you must rebuild after changing them.

| Variable | Example | Description |
|---|---|---|
| `VITE_GITHUB_CLIENT_ID` | `Iv1.xxxxxxxxxxxxxxxx` | OAuth App client ID (public) |
| `VITE_TOKEN_PROXY_URL` | `https://your-gatekeeper.example.com/authenticate` | Gatekeeper base URL. A trailing slash is optional |

Create a `.env` file at the repository root. You can start from `.env.example`:

```sh
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
VITE_TOKEN_PROXY_URL=https://your-gatekeeper.example.com/authenticate
```

Vite gives priority to real environment variables over `.env` files. In CI, you can set the values as repository variables and secrets instead of committing them (see [Deploying LiteEditor itself](#deploying-liteditor-itself)).

## 4. Build and run

Requirements: Node.js 24 (the version used in CI).

```sh
# Install dependencies
npm ci

# Development server with hot reload
npm run dev

# Production build (type check, then Vite build) into dist/
npm run build

# Preview the production build locally
npm run preview
```

`npm run build` writes the static site to `dist/`. Serve that folder from any static host.

If you host LiteEditor on GitHub Pages, copy `dist/index.html` to `dist/404.html` after the build so that the `/callback` route and other deep links load the app.

## 5. Deploying LiteEditor itself

The repository includes `.github/workflows/deploy-pages.yml`. It runs on every push to `main`:

1. `npm run schema:test` and `npm run schema:check`, to make sure the configuration schema stays backward compatible (see the [README](../README.md#compatibilité-du-schéma-et-versions));
2. `npm run build`;
3. copies `dist/index.html` to `dist/404.html`;
4. publishes `dist/` to GitHub Pages.

The site is served on the custom domain set in `public/CNAME`. Change that file if you deploy to another domain, and update the OAuth App's homepage and callback URLs to match.

**Build-time variables.** `.env` is tracked in git and holds only public values (the OAuth client ID and the proxy URL). The build uses them by default. To override them without editing the repository, set the repository variables `VITE_GITHUB_CLIENT_ID` and `VITE_TOKEN_PROXY_URL` (**Settings → Secrets and variables → Actions → Variables**); the workflow passes them to the build when they are set. Neither value is a secret: both end up in the shipped bundle.

Next: [Examples](examples.md)
