# Notes

The AI key comes from the server-only `getKey()` helper in `server/minddo-key.js`.

Only server code may call `getKey()`. Keep the MindDo token and returned AI key on the server; never send either one to the page or print them.

When OpenAI rejects a cached key, call `invalidateKey()` and let the next request fetch a fresh key.
