# @reupload/client

Browser client for uploading files through **your backend file router** — never expose a Reupload API key in the front end.

Works in React, Next.js (App + Pages), SolidStart, Vite, and any environment with `fetch` and `FormData`.

Pair with [`@reupload/sdk`](../reupload-sdk) on your server, or any API that implements the [default routes](#backend-file-router) below.

## Install

```bash
npm install @reupload/client
```

Optional React hook:

```bash
npm install @reupload/client react
```

## Environment

```env
# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3001

# Vite
VITE_API_URL=http://localhost:3001
```

## Quick start (CDN flow)

Your backend exposes `POST /uploads/prepare`, the browser PUTs to the signed CDN URL, then `POST /uploads/complete`. See the [React/Next + Node guide](https://docs.reupload.dev/react-next-node).

```ts
import { createReuploadClientFromEnv } from "@reupload/client";

const client = createReuploadClientFromEnv();

async function onFileSelected(file: File) {
  const { uploadId, fileId } = await client.uploadFile(file);

  const final = await client.pollUploadStatus(uploadId);
  if (final.status === "COMPLETED") {
    console.log("Ready:", fileId);
  }
}
```

## Backend file router

Default paths (override with `routes` in the constructor):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/uploads/prepare` | Create session → return `uploadUrl`, `uploadId`, `fileId` |
| `POST` | `/uploads/complete` | Finalize CDN upload (`{ uploadId }`) |
| `GET` | `/uploads/:uploadId/status` | Poll `{ status, fileId }` |
| `GET` | `/files/:fileId/access` | Signed download URL |

Custom paths:

```ts
const client = new ReuploadClient({
  apiUrl: "https://api.myapp.com",
  routes: {
    prepare: "/api/v1/files/prepare",
    status: (id) => `/api/v1/files/uploads/${id}`,
  },
});
```

Use [`@reupload/sdk`](../reupload-sdk) on your server to implement these routes.

## API

### `ReuploadClient`

| Method | Description |
|--------|-------------|
| `uploadFile(file, options?)` | Full CDN flow via your backend |
| `prepareUpload(meta)` | Step 1 only (CDN) |
| `completeUpload({ uploadId })` | Step 3 only (CDN) |
| `getUploadStatus(uploadId)` | Single status poll |
| `pollUploadStatus(uploadId, options?)` | Poll until terminal status |
| `getFileAccess(fileId, query?)` | Signed URL from your backend |
| `openFileInNewTab(fileId)` | `window.open(access.url)` |

### Low-level

- `putFileToUploadUrl(uploadUrl, file, { onProgress })` — CDN PUT with optional XMLHttpRequest progress
- `validateFile(file, { maxBytes, accept })` — client-side checks before upload
- `pollUploadStatus(fetcher, options)` — standalone poller

### Errors

```ts
import { isReuploadClientError } from "@reupload/client";

try {
  await client.uploadFile(file);
} catch (error) {
  if (isReuploadClientError(error)) {
    console.log(error.phase); // "backend" | "cdn"
    console.log(error.status, error.message);
  }
}
```

## React hook

```tsx
"use client";

import { useReuploadUpload } from "@reupload/client/react";

export function FileUpload() {
  const { upload, state, reset, isUploading } = useReuploadUpload({
    validation: { maxBytes: 52_428_800, accept: ["image/*", "application/pdf"] },
  });

  return (
    <div>
      <input
        type="file"
        disabled={isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {state.status === "completed" ? (
        <p>Done — {state.fileId}</p>
      ) : null}
      {state.status === "error" ? <p>{state.message}</p> : null}
      <button type="button" onClick={reset}>
        Reset
      </button>
    </div>
  );
}
```

Options:

- `poll: true` — poll status after upload (default `false`)
- `client` — reuse a configured `ReuploadClient`

For server-side direct uploads (browser → your API → Reupload), use [`@reupload/sdk`](../reupload-sdk) on the server — not this package.

### Confirm before upload

`ReuploadClient.uploadFile()` and `useReuploadUpload().upload()` always start the upload when you call them — there is no built-in file-picker or auto-upload behavior.

For confirm-before-upload UX, use [`@reupload/react`](../reupload-react) with `immediateUpload={false}`. The shared `BeforeUploadHandler` type is exported for optional async gates on confirm:

```ts
import type { BeforeUploadHandler } from "@reupload/client";

const onBeforeUpload: BeforeUploadHandler = async (files) => {
  return window.confirm(`Upload ${files.length} file(s)?`);
};
```

## SolidStart / H3

Use the client in API route handlers or components — same as React. For file input in the browser:

```ts
import { createReuploadClientFromEnv } from "@reupload/client";

const client = createReuploadClientFromEnv();
await client.uploadFile(file);
```

SolidStart server routes that receive uploads should use `@reupload/sdk/h3` instead.

## Development

```bash
cd node-packages/reupload-client
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
