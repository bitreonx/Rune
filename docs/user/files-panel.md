# Files panel

The files panel sits beside a thread and gives you the project's files next to the conversation: browse the tree, read and edit a file, then pull what you see straight into chat.

## Browsing files

The file tree lists your project as it is on disk, including dotfiles and dot-directories like `.temp`. Only dependency and version-control directories are left out (`node_modules`, `.git`, `.venv`, `venv`, `__pycache__`) — they would bury everything else.

Workspaces with more than 25,000 entries show the first 25,000 with a notice at the bottom of the tree, so an incomplete listing is always visible rather than silent. While the workspace listing is loading you'll see a "Loading files" note instead of an empty tree, and if the listing fails the error appears in its place — use the refresh button to try again. The tree keeps itself current: files created, renamed, or deleted while you work appear without reopening the panel.

Drag the divider between the file list and the editor (or the panel's outer edge) to give either side more room. Your preferred width is remembered.

## Editing a file

Opening a file gives you an editor with a small toolbar above it:

- **Autosave** – edits save automatically shortly after you stop typing. The dot in the toolbar shows when there are unsaved changes, and **Save** (or `Cmd/Ctrl + S`) writes immediately.
- **Undo / Redo** – toolbar buttons plus the standard shortcuts (`Cmd/Ctrl + Z`, `Cmd/Ctrl + Shift + Z`, or `Ctrl + Y` on Windows/Linux).
- **Search in file** – the magnifier button or `Cmd/Ctrl + F`; add `Alt` to open find-and-replace.

## Bringing code into chat

Select any part of an open file and choose **Add to chat**. A mention like `[app.ts](src/app.ts) L3 to L9` is placed in the composer, so the agent reads exactly the lines you highlighted when you send the message.

## Reviewing uncommitted changes

The diff toggle in the toolbar switches the editor to a comparison against your last commit: additions and removals in your working copy, side by side with line numbers. Files that aren't committed yet show entirely as additions. Click the toggle again to return to editing.
