# LittleRip Chat

An invite-only, self-hosted text server for a small group. Open source under MIT. No Discord account, external database, or npm dependencies required.

## Start

Use Node.js 24+ (with built-in SQLite). Run `npm test`, then `npm start`. Open http://localhost:8817. In a second terminal, run `node admin.mjs invite your-name` and paste the single-use code on the sign-in page. Codes expire in 24 hours; sessions in 30 days. For another device or after signing out, issue a new code for the same name. Give **different people different names**. Anyone holding a code can sign in as that name; share it privately.

- `node admin.mjs invite friend-name`: issue a login code.
- `node admin.mjs channel music`: add a shared channel (reload to see it).
- `node admin.mjs revoke friend-name`: invalidate all their codes and sessions.

Members see the same channels and the latest 100 messages per channel. Updates poll every two seconds while the tab is visible. All messages persist in SQLite. Enter sends; Shift+Enter inserts a newline. No voice, DMs, attachments or Discord import yet.

## Hosting and data

The server only listens on loopback. Put it behind an HTTPS reverse proxy/tunnel and set `CHAT_ORIGIN=https://your-domain.example` (the exact public origin). Redirect alternate hostnames to that origin. Set `PORT` to change the local port. Use a supervisor to restart the process. Keep the host online.

The app and admin CLI must share `CHAT_DATA` (default: `~/.littlerip-chat`). Codes and session keys are stored as hashes. Messages are not end-to-end encrypted: the host can read them. The database is private runtime data, **not** part of this repository. Back it up with SQLite's online backup facility or stop the server and copy the whole data directory. Protect backups like the database itself.
