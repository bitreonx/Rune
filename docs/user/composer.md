# Message composer

Messages can contain up to 120,000 characters. If a draft is longer, RUNE keeps it in the
composer and shows how many characters need to be removed. Shorten the draft or split it into
multiple messages, then send again in the same thread.

On servers that support direct uploads, images upload as soon as you add them. The send button
becomes available after every upload finishes. Failed uploads can be retried or removed.

## Attach media and folders

The paperclip button in the composer footer opens the attach menu, with **Attach files…** and
**Attach folder…**. A line at the bottom of the menu shows what the selected model accepts.

Images the model can ingest (GIF, JPEG, PNG, WebP up to 10 MB) upload like pasted images, and
larger ones are downscaled to fit. Audio, video, and other files attach as a path link in your
message instead: the agent reads them from disk when it runs. On desktop this works for any file
on your machine. On the web, files outside the workspace cannot be reached, so RUNE says so
instead of attaching something the agent cannot open.

**Attach folder…** on desktop adds one path link to a folder of your choice; the agent decides
which files inside it matter. On the web, choosing folders opens the same workspace browser as
typing `@`.

Pasting and dragging images keeps working exactly as before, independently of this menu.

## Commands and skills

Type `/` to open the command menu. Type `$` to find and add a skill. Skill rows show their source,
such as System, Personal, Project, or App.

By default, the `/` menu includes skills. To keep this menu command-only, turn off **Show skills in
slash menu** in **Settings → General**. Skill results use the `/skill:Skill Name` label and add the
same `$name` skill token to your message. The original skill name remains searchable. If the provider
also reports that skill as a native slash command, RUNE hides the duplicate native entry and keeps
the `/skill:Skill Name` label.

On desktop, press `Cmd+Enter` on macOS or `Ctrl+Enter` on Windows and Linux from a new thread to
start it in the background. RUNE opens another new thread and shows an **Open** action for the
thread that started. The new thread keeps the selected workspace mode and base branch. If **New
worktree** is selected, each background thread creates its own worktree.

## Rewind a sent message

Hover one of your sent messages to find **Edit message** and **Delete message**. Both rewind the
thread to just before that message: newer messages disappear, and the workspace files return to
their state before that turn. Rewinding needs a git repository and stops while a turn is running.

- **Edit message** puts the prompt back into the composer so you can change it and send it again.
  Attached images are not restored.
- **Delete message** removes the prompt and everything after it, leaving the composer empty.

Rewinding cannot be undone.

## Temporary chats

Turn on **Temp** in the composer footer, or enable **Temporary chat** in the composer's **⋯** menu,
before sending the first message of a new thread. The control only appears while starting a new
thread. After you send, it switches off again, so your next new thread is permanent unless you turn
it on once more.

A temporary chat otherwise works like any other conversation. The difference is cleanup: RUNE
deletes a temporary chat 24 hours after your last message in it. While the toggle is armed on a new
thread, the composer shows a banner reminding you of this.

To keep a temporary chat, open its context menu in the sidebar and choose **Keep chat**. It becomes
a permanent thread again and returns to its usual place in the sidebar. Deleting a temporary chat
from the same menu works too, if you do not want to wait for the auto-delete.

