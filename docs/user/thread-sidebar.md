# Organizing threads

Pin a thread from its context menu to keep it in the pinned section above your active work.
Pinned threads are shown independently of their project, including when you connect to more than
one environment.

Pinned threads still move to **Settled** when they become inactive. They also move when their pull
request merges if **Auto-settle merged threads** is enabled.

On web and desktop, drag a pinned thread to change its position. On mobile, open the thread's menu
and choose **Move up** or **Move down**. The order is stored by the server and appears on your
other connected devices.

If reordering is unavailable for one environment, update the RUNE server running in that
environment. Older servers can still pin and unpin threads, but do not understand synced ordering;
their pinned threads keep the default newest-first order below the ones you have arranged.

## Environment artwork

Dev and Nightly environments can identify themselves with artwork at the top of the sidebar and in
the send button. Choose **Artwork**, **Version pill**, or **None** in Settings under environment
identification. Artwork is recolored to match each built-in theme. Custom themes use the **Version
pill** fallback because their colors are not controlled by RUNE.

To generate a fresh title from the conversation, open a thread's context menu and choose
**Regenerate title**. While RUNE is generating it, the action reads **Regenerating…** and cannot
be selected again. The option is hidden when the connected environment needs a server update.

## Temporary chats

Threads started with the composer's **Temp** toggle are temporary: RUNE deletes them 24 hours
after your last message in them. They stay out of the pinned, active, and settled lists, do not
appear in search or the command palette, and do not make a project look recently active.

While a temporary chat is alive it appears under **Temporary**, a collapsed section at the bottom of
the sidebar on web and desktop. Open the section to reach your temporary chats; any link to one also
keeps working until it is deleted. To keep one permanently, open its context menu and choose
**Keep chat**.

On mobile, temporary chats appear in a **Temporary** section at the bottom of the home list.
Starting a temporary chat currently happens from web or desktop.
