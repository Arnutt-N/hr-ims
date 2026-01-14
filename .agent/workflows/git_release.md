---
description: Commit, Tag, Push, and Save Log (Release) - SECURE/MANUAL PUSH
---

1. Check Current Status
// turbo
   - Run `git status`

2. Stage All Changes
// turbo
   - Run `git add .`

3. Verify Staged Changes (Summary)
// turbo
   - Run `git status`
   - Run `git diff --staged --stat`

4. Commit Changes (EDIT MESSAGE)
   - Run `git commit -m "feat: updates"`

5. Tag Version (EDIT TAG)
   - Run `git tag -a v0.0.0 -m "release v0.0.0"`

6. Push Changes (MANUAL CONFIRMATION REQUIRED)
   - Run `git push`

7. Push Tags
// turbo
   - Run `git push --tags`

8. Create Log Directory
// turbo
   - Run `if not exist project-log-md mkdir project-log-md`

9. Update Release Log
// turbo
   - Run `cmd /c "echo. >> project-log-md\history.md && echo ---------------------------------------- >> project-log-md\history.md && echo ## Release Log: %date% %time% >> project-log-md\history.md && git log -1 --stat --decorate >> project-log-md\history.md"`
