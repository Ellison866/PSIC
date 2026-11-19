# Project brief: Mind Blocks

## Competition

I am entering the Presidential SI Challenge, Standard Track, Elementary (K–5). The project submission deadline is December 23, 2026 at 5:00pm Eastern / 2:00pm Pacific.

## Problem

People in learning struggle with subjects. This matters because students should have a simple, encouraging way to become more confident. In 2024, 41% of U.S. eighth-grade students scored below the Basic level in math: https://nces.ed.gov/nationsreportcard/subject/publications/stt2024/pdf/2024219NP8.pdf

## Solution

Mind Blocks is a simple base game where a player enters a subject or prompt. The AI adds that subject to the game and turns learning questions into short quests. It should be simpler than Khan Academy and give kind, safe answers. The app should double-check information before showing it when possible.

## MVP features, in order

1. The user can play the base block game.
2. The user can enter a subject or prompt to start the game.
3. The AI adds that subject to the game.
4. The AI generates questions disguised as quests.
5. The AI gives correct, safe answers to real questions.

## AI instructions

- Ask the AI when the user types a subject.
- The AI adds the subject to the game and talks to the app.
- Be kind and concise.
- Follow the safety plan: do not knowingly give unsafe or unsupported answers; explain that a teacher can double-check important work.

## Version 1 game

Build one short level that is fun for about a minute. Use simple colored shapes, no copyrighted characters, and leave later ideas out. The player collects matching blocks and answers one short learning quest. Include a start screen, score, timer, Game Over screen, Play Again button, keyboard controls, and phone tapping.

## Technical requirements

- Plain HTML, CSS, and JavaScript with no build step.
- Keep tuning numbers in one CONFIG object at the top of the game script.
- Use the real OpenAI API through a small local Node.js helper.
- Get the AI key only from the existing server-side `getKey()` helper.
- Never send or print the key or MindDo token.
- Send this brief as the AI system instructions with every AI message.
- Pause with “Thinking…” while the AI is answering.
