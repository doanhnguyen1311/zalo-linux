# Investigate and fix Zalo Web login flow in Electron (Ubuntu/Linux)

## Current issue

The Electron app can open `https://chat.zalo.me` successfully.

QR login works:

* Scan QR code
* Approve login on the phone
* Zalo displays "Login successful"

However, **Electron never enters the chat UI**.

Instead it stays on the QR page or reloads back to the login page.

The same account works correctly in Chrome.

This means the login callback/session is failing inside Electron.

---

## IMPORTANT

Do NOT randomly modify code.

First investigate the entire login flow.

Find the real root cause before changing anything.

---

## Things to inspect

### 1. BrowserWindow

Verify every BrowserWindow option.

Especially:

* partition
* session
* sandbox
* contextIsolation
* nodeIntegration
* webSecurity
* nativeWindowOpen
* preload
* userAgent

Check whether any option prevents login completion.

---

### 2. Session

Verify that BrowserWindow and Session use the SAME partition.

Example:

```ts
partition: "persist:zalo"
```

and

```ts
session.fromPartition("persist:zalo")
```

must reference exactly the same partition.

Check whether cookies are really stored.

Print all cookies after QR confirmation.

Example:

```ts
session.cookies.get({})
```

---

### 3. Redirect flow

Trace every navigation.

Log

* will-navigate
* did-start-navigation
* did-redirect-navigation
* did-finish-load
* did-frame-finish-load
* did-navigate
* did-navigate-in-page

Print every URL.

Find where the login flow stops.

---

### 4. Popup handling

Inspect

```ts
window.open()

setWindowOpenHandler()

new-window
```

Determine whether login opens another window that is currently blocked.

---

### 5. Cookie / Storage

After QR approval inspect

Cookies

LocalStorage

SessionStorage

IndexedDB

Determine whether authentication data is successfully written.

---

### 6. DevTools

Open DevTools automatically.

Inspect:

Console

Network

Application

Look for:

401

403

redirect loop

SameSite cookie rejection

third-party cookie rejection

CSP errors

storage errors

Service Worker errors

---

### 7. Permission handling

Current logs show many denied permissions.

Verify whether any required permission is incorrectly denied.

Only allow permissions needed for Zalo domains.

---

### 8. Navigation blocking

Inspect all code using

will-navigate

setWindowOpenHandler

shell.openExternal

webRequest

beforeRequest

beforeSendHeaders

Make sure login redirects inside

chat.zalo.me

id.zalo.me

zalo.me

are NEVER blocked.

Only external websites should open in browser.

---

### 9. User-Agent

Compare Electron UA with Chrome UA.

Verify that login flow does not depend on Chromium version.

---

### 10. Network requests

Compare Electron Network requests against Chrome.

Look for missing headers or blocked requests.

Especially:

Cookie

Origin

Referer

Sec-Fetch

User-Agent

---

## Expected result

After scanning QR and pressing Login on the phone:

Electron should automatically redirect into

https://chat.zalo.me

and display the conversation list.

No reload loop.

No return to QR page.

Session must persist after restarting the app.

---

## Rule

Do NOT implement a blind fix.

Investigate first.

Explain the root cause with evidence.

Then implement the smallest correct fix.
