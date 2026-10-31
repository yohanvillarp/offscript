# OFFSCRIPT public guide

Independent React + Vite + Tailwind application. This is the public documentation/landing site, not Studio or a hosted exploration service. It has its own private manifest and lockfile; npm Workspaces are not used.

## Local development

From the repository root, using Node.js 24 and npm:

```sh
npm --prefix apps/docs ci
npm --prefix apps/docs run dev
```

The server binds to loopback. Use the URL Vite prints. Production checks:

```sh
npm --prefix apps/docs run lint
npm --prefix apps/docs run build
npm --prefix apps/docs run preview
```

## Visual source boundary

The site imports Studio's semantic tokens, base styles, raven component/CSS and brand SVG directly. It does not copy their implementation or import Studio routing, state, API clients or runtime packages. Only the explicitly selected presentation files are bundled. The favicon and font license texts are static distribution assets; keep them aligned when changing upstream assets/fonts.

This build needs the repository checkout, including `apps/studio/src` and its brand SVG. It does not need Studio dependencies or any root server dependencies installed. React is deduplicated to the docs installation. A future extraction of shared visual sources should be a separate approved change.

The guide uses in-page anchors. No client router, SPA fallback rewrite, server, credentials, analytics or local-host connections are configured. Content is an explicit editorial selection; the build never publishes the whole technical documentation/context directory.

## Vercel

Create a separate Vercel project connected to this repository:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root Directory | Repository root (`.`; leave the field empty) |
| Node.js | 24.x |
| Install | `npm --prefix apps/docs ci` |
| Build | `npm --prefix apps/docs run build` |
| Output | `apps/docs/dist` |
| Production branch | `main` |

Using the repository root makes shared visual sources available without access outside Vercel's Root Directory. The root `vercel.json` explicitly installs and builds only docs; it does not install the root package, build Studio or start the local host. Keep automatic skipping of unaffected projects disabled until detection of shared visual changes has been verified. No environment variables are required. Do not add provider keys, npm tokens or local host credentials.

Alternatively, if the Vercel project's Root Directory is `apps/docs`, its local `vercel.json` uses `npm ci`, `npm run build` and `dist`, without a repeated `apps/docs` prefix. Enable **Include source files outside of the Root Directory in the Build Step** so Studio's visual sources are available. Select Node.js 24.x in project settings. Do not combine an app-root deployment with the repository-root commands in the table above.

If `npm ci` reports a missing lockfile, check this Root Directory/command pairing first: `apps/docs/package-lock.json` is tracked. Do not switch to `npm install` to conceal an incorrect working directory. `node_modules/`, `dist/` and `.vercel/` remain ignored; source, configuration and the lockfile must be committed.

Use branch previews to review the design before merging to main. Link `offscript.nikelyh.tech` in Vercel Domains only when ready; apply the DNS records Vercel gives for that project, verify ownership/HTTPS and test the resulting deployment. No DNS records or deployments are created by this repository change. Ignore `.vercel/` local project linkage.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Root Directory settings](https://vercel.com/docs/deployments/configure-a-build#root-directory).

## Editorial checks

Keep source/archive instructions distinct from an actually published npm release. The default browser runner is deterministic; do not present it as validated autonomous exploration. Recheck release status, commands and known limits before deploying. The site currently renders in the browser; static prerendering, a search index and social-preview artwork are not implemented. Browser/manual review is left to the operator.
