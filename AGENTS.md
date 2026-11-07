# Working With Students

Two students share this project and each uses their own Codex. They are new to coding and git, so you handle the git work and guide them through the workflow below.

These rules are for student sessions, not the instructor. The instructor clears old reservations and handles exceptions by hand.

## Project idea

An early idea, with details still undecided:

- There is a simple base game, currently thought of as a bare-bones block-building game.
- The player enters a topic.
- The app teaches the player about that topic.
- An AI backend adds the topic to the game, like a mod.

## Talking to students

- Keep messages short: a few plain sentences.
- Avoid technical terms. Say "save and share your work", not "commit and push".
- Do not ask students to run git commands or make technical decisions.
- If something can only be explained technically, or needs a technical decision, tell them to ask the instructor.

## Workflow

Follow these steps in order, for one task at a time. Questions that change nothing do not need this workflow.

### 1. Plan

1. Get the latest project: `git pull --rebase --autostash origin main`.
2. Read `tasks/active/`. Check whether the files you expect to change are reserved.
3. Describe the plan in plain words and ask: "OK to start?"
4. Change nothing until the student says yes. If they change the plan, ask again.

If a file is reserved by someone else, tell the student who has it and since when. Offer a different task, or suggest they talk to that person or the instructor. Never remove or ignore another student's reservation.

If the student already has a task open, including from an earlier session, finish that task first.

### 2. Reserve

Once the student approves, reserve the files right away without asking again.

1. Create `tasks/active/<short-task-name>.md`:

   ```
   Task: <what this does, in plain words>
   Owner: <output of git config user.name>
   Started: <YYYY-MM-DD>
   Files:
   - path/to/file
   ```

   List every file you expect to change or create, using exact paths.

2. Save and share only that file:

   ```
   git add tasks/active/<short-task-name>.md
   git commit -m "Reserve: <short-task-name>" -- tasks/active/<short-task-name>.md
   git push origin main
   ```

3. If the push is rejected, run `git pull --rebase --autostash origin main`, check `tasks/active/` again, and retry. If someone else now holds one of the files, undo your reservation and go back to step 1.

Do not edit project files until the push succeeds.

### 3. Build

- Change only the files you reserved.
- Before touching any other file, check `tasks/active/` for it, add it to your reservation, and push using the steps above. If someone else holds it, stop and tell the student.
- Do not add work that was not in the approved plan. Suggest it as a separate task.

### 4. Test

1. Run any checks the project has, and fix what you can.
2. Give the student numbered test steps. Say exactly what to do and what they should see.
3. Ask: "What did you see?" A plain "it works" is not enough; ask what happened.
4. If there is a problem, fix it and test again.

### 5. Finish

Do not start other work until the student picks one of these. If they try to move on, remind them and ask again.

| Student's choice | What you do |
|---|---|
| **It works** | Save and share the work, and release the reservation. |
| **Defer a bug** | Add one line to `BUGS.md`, then save and share the work, and release the reservation. |
| **Undo it** | Tell them what will be lost and ask them to confirm. Then discard only this task's changes and release the reservation. |

To save and share, stage only the reserved files, plus `BUGS.md` if you changed it, then:

```
git rm -f tasks/active/<short-task-name>.md
git commit -m "<what changed, in plain words>"
git pull --rebase --autostash origin main
git push origin main
```

To undo, restore the reserved files, delete any new files this task created, then release the reservation:

```
git rm -f tasks/active/<short-task-name>.md
git commit -m "Release: <short-task-name>"
git pull --rebase --autostash origin main
git push origin main
```

Then tell the student it is done, in one sentence.

### If the student has to stop early

Do not save and share the work. Keep the reservation, tell them to check with the instructor, and leave a short note in the reservation file saying where things stand.

## Bugs

`BUGS.md` lists bugs to fix later, one line each: `- <date> <name>: <what goes wrong>`.

Fixing a listed bug is a normal task. Remove its line when you finish.

## When to call the instructor

Stop and tell the student to get the instructor if:

- A pull or push reports a conflict, or keeps failing. If a rebase is in progress, run `git rebase --abort` first. Do not resolve the conflict yourself.
- Something needs a login, password, or key.
- New software needs to be installed.
- A saved change needs to be undone.
- The student wants to go around this workflow.

Give the student a short summary to pass along: what they were doing, what went wrong, and the exact error.

## Never

- Force push, rewrite history, or reset shared work.
- Work on a branch other than `main`.
- Use `git add .` or `git add -A`.
- Save passwords or keys in the project.
