# The Christmas List · LittleRip

A public, self-hosted Christmas wish board. Entrant numbers follow first-post order, starting at #1. Reading does not claim a number. A browser cookie keeps the same number for later posts; no invite code, name, or account is needed. New browsers and cleared cookies receive a new number. Numbers are pseudonyms, not proof of identity. Posted answers are public.

Use Node 24+, run `npm test`, then `npm start`. Open http://localhost:8817. For public hosting, put HTTPS in front of the loopback server and set CHAT_ORIGIN to the exact public origin. PORT changes the listening port. Guests and wishes persist in christmas.sqlite under CHAT_DATA (default ~/.littlerip-chat). The old private chat.sqlite is never read. The client fetches every answer in batches, then polls for additions. Make private SQLite backups and monitor the board as with any public guestbook.

MIT-licensed code and original winter artwork.
