# Notes

The AI key comes from `getKey()` in `server/minddo-key.js`.

Only server code may call `getKey()`. Keep the MindDo token and returned AI key on the server; never send either one to the page or print them.
