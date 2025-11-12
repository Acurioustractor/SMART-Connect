# VS Code Git Guide - Quick Reference

## ✅ Git Configuration (Already Set Up!)

Your Git is now configured to avoid those annoying push/pull errors:

```bash
# Automatically set - you're good to go!
pull.rebase = false       # Merge strategy for divergent branches
push.default = current    # Push to current branch by default
```

**New Git Aliases Available:**
- `git sync` - Pull and push in one command
- `git pushup` - Push current branch and set upstream

## 🚀 Pushing to GitHub from VS Code

### Method 1: Using VS Code UI (Easiest!)

#### Step 1: Open Your Project
```
File → Open Folder → Select "SMART Connect Interviews"
```

#### Step 2: View Changes
1. Click the **Source Control** icon in the left sidebar (looks like a branch icon)
2. You'll see all files that have changed

#### Step 3: Stage Files
- **Option A:** Click the **+** icon next to each file you want to commit
- **Option B:** Click the **+** icon at the top to stage ALL files at once

#### Step 4: Write Commit Message
1. In the text box at the top, type your commit message
   - Example: `"Add Supabase integration and setup guides"`
2. Press **Cmd+Enter** (Mac) or **Ctrl+Enter** (Windows)
   - Or click the **✓ Commit** button

#### Step 5: Push to GitHub
1. Click the **"..."** menu (three dots) in Source Control panel
2. Click **Push**
3. If prompted, confirm the push

**That's it!** ✅ Your changes are now on GitHub.

---

### Method 2: Super Simple (NEW! Using Git Aliases)

#### The Easiest Way - One Command:

```bash
git add . && git commit -m "Your message" && git sync
```

Or if it's your first push on a new branch:

```bash
git add . && git commit -m "Your message" && git pushup
```

That's it! No more complicated steps.

---

### Method 3: Using VS Code Terminal (Traditional)

#### Step 1: Open Terminal
Press **Cmd+`** (backtick key, below Escape)

#### Step 2: Navigate to Your Project
```bash
cd "/Users/benknight/code/SMART Connect Interviews"
```

#### Step 3: Check Status
```bash
git status
```
This shows what files have changed.

#### Step 4: Stage Files
```bash
# Stage all files
git add .

# Or stage specific files
git add hub/app/page.tsx
```

#### Step 5: Commit
```bash
git commit -m "Your commit message here"
```

#### Step 6: Push
```bash
git push
```

---

## 📝 Common Git Commands

### Check What Branch You're On
```bash
git branch
```
Should show: `claude/use-report-information-011CV3qaw5LBK9jwDsymchvh`

### View All Changes
```bash
git status
```

### View What Changed in Files
```bash
git diff
```

### Pull Latest Changes
```bash
git pull
```

### Create a New Branch
```bash
git checkout -b feature/your-feature-name
```

### Switch Branches
```bash
git checkout main
git checkout claude/use-report-information-011CV3qaw5LBK9jwDsymchvh
```

---

## 🔧 VS Code Git Features

### View File History
1. Right-click on any file
2. Select **"Git: View File History"**
3. See all commits that changed this file

### Compare Changes
1. Click any file in Source Control panel
2. VS Code shows side-by-side diff (what was deleted/added)

### Undo Changes
- **Before committing:**
  - Click the **↶** icon next to a file to discard changes
- **After committing:**
  - Use `git reset HEAD~1` in terminal (keeps changes)

### Resolve Merge Conflicts
If you see merge conflict markers:
1. VS Code highlights them
2. Click **"Accept Current Change"** or **"Accept Incoming Change"**
3. Or manually edit the file
4. Stage the file and commit

---

## ⚡ VS Code Extensions for Git (Optional)

Install these for better Git experience:

1. **GitLens** (highly recommended!)
   - Shows who wrote each line of code
   - Inline blame annotations
   - Rich commit history

2. **Git Graph**
   - Visual representation of branches
   - See commit history as a tree

3. **GitHub Pull Requests**
   - Create/review PRs directly in VS Code

To install:
1. Click Extensions icon (left sidebar)
2. Search for the extension name
3. Click "Install"

---

## 🚨 Common Issues & Solutions

### Issue: "Permission denied"
**Solution:** You need to authenticate with GitHub
```bash
# Set up SSH key or use GitHub CLI
gh auth login
```

### Issue: "Your branch is behind"
**Solution:** Pull first, then push
```bash
git pull
git push
```

### Issue: "Merge conflict"
**Solution:**
1. Open conflicted files
2. Choose which changes to keep
3. Delete conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
4. Stage and commit

### Issue: Accidentally committed wrong files
**Solution:**
```bash
# Undo last commit (keeps changes)
git reset HEAD~1

# Remove file from staging
git restore --staged filename
```

---

## 📚 Git Commit Message Best Practices

### Good Commit Messages
```bash
git commit -m "Add Supabase database schema"
git commit -m "Fix chat scrolling bug on mobile"
git commit -m "Update home page hero section design"
```

### Bad Commit Messages
```bash
git commit -m "changes"
git commit -m "update"
git commit -m "fix bug"
```

### Format
```
[Type] Short description (50 chars or less)

Longer explanation if needed (wrap at 72 characters)
- Bullet points are okay
- List what changed and why
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting, no code change
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 🎯 Quick Reference

| Action | Command | VS Code |
|--------|---------|---------|
| View changes | `git status` | Source Control panel |
| Stage all | `git add .` | Click + at top |
| Commit | `git commit -m "msg"` | Type message + Cmd+Enter |
| Push | `git push` | ... menu → Push |
| Pull | `git pull` | ... menu → Pull |
| Undo changes | `git checkout -- file` | Click ↶ icon |

---

## 💡 Pro Tips

1. **Commit often**: Small, frequent commits are better than big ones
2. **Test before committing**: Make sure your code works
3. **Pull before pushing**: Avoid conflicts by staying up to date
4. **Use branches**: Don't work directly on `main`
5. **Write good messages**: Your future self will thank you

---

**You're now a VS Code Git pro!** 🎉

For more help:
- Press `F1` in VS Code → Type "Git" to see all Git commands
- View → Command Palette → Git commands
- [VS Code Git Documentation](https://code.visualstudio.com/docs/sourcecontrol/overview)
