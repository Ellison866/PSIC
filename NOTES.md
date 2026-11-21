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

## Minecraft-style world update

The game now uses a small 7x7 tile world with grass, dirt, stone, water, and wood blocks. The player moves with WASD or arrow keys, collects glowing target blocks, and sees collected blocks in a hotbar.

## 3D-style block world update

The world is now an original 11x11 isometric 3D-style scene. Players can mine with E/space, build with B, select inventory slots, craft stone from dirt and wood, and watch the scene switch between day and night during the level.

## Voxel rebuild

The client now stores blocks as true `x,y,z` voxel coordinates in a `Map` and renders visible cube faces on a canvas. The learning quest, timer, scoring, inventory, crafting, day/night cycle, and server-only AI flow remain part of the game.

## First-person view

The voxel canvas now uses a lightweight first-person raycast camera. W/S move, A/D and arrow keys turn, pointer dragging looks around, and tapping the view mines.

## Terrain generation

The world uses a repeatable seed to generate rolling hills, layered grass/dirt/stone, water basins, and original wood trees. The first-person renderer now finds the highest voxel in each terrain column and shows the seed in the game header.

The renderer also draws a terrain silhouette fallback when no ray hits are visible, preventing the scene from appearing as only a flat sky and ground.

The raycast begins beyond the player's own ground cell so the camera does not turn that cell into one giant flat wall.

## Current terrain prototype

The client game has been intentionally restarted to focus only on seeded terrain generation and textured voxel rendering. Movement, mining, placing, crafting, quests, and timers are deferred until the terrain view is solid. The server-side MindDo/OpenAI flow remains in place.
