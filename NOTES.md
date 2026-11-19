# Notes

The AI key comes from the server-only `getKey()` helper in `server/minddo-key.js`.

Only server code may call `getKey()`. Keep the MindDo token and returned AI key on the server; never send either one to the page or print them.

When OpenAI rejects a cached key, call `invalidateKey()` and let the next request fetch a fresh key.

The OpenAI model with “luna” in its name is `gpt-5.6-luna`.

## Run Mind Blocks

```text
node server/mind-blocks-server.js
```

Then open http://localhost:3000 in a browser.

## Version 1 status

1. Base block game — works. Start a quest, then tap a matching block or use arrow keys and Enter; the score increases.
2. Subject prompt — works. Type a subject on the start screen and choose Start quest.
3. AI adds the subject — works. The quest card shows the subject-based quest after the AI responds.
4. Questions as quests — works. Choose one of the three answers on the quest card.
5. Safe AI answers — works. The server sends the brief as instructions, keeps credentials private, runs on localhost, blocks `.env`, and shows a friendly error if the AI cannot answer.

## Maybe Later

Nothing yet.

## Next

Try the one-minute level with a few elementary subjects and collect feedback for the competition video.

The OpenAI model with “luna” in its name is `gpt-5.6-luna`.
