# Terminal

Each thread has a terminal panel for running commands next to your agent work. Toggle it with
`mod+j` (remappable in **Settings** → **Keybindings**). The panel is available on web and desktop.
Terminals run on the server machine, so what you see is the same filesystem and environment your
agent works in.

## The terminal toolbar

A slim bar sits at the top of the terminal panel. It shows the active terminal's name and status,
and keeps every terminal action in one place:

- **Search** opens find-in-buffer (also `mod+f` while the terminal has focus).
- **Split horizontally** (`mod+d`) and **split vertically** (`mod+shift+d`) divide the panel so two
  terminals show side by side.
- **New terminal** (`mod+n`) adds another tab.
- **Close** (`mod+w`) closes the active terminal.

The name carries a small status dot: green while the shell runs, amber while it starts, red after
an error, gray once it exits cleanly. Terminal tabs in the sidebar show the same dot, so you can
spot a busy or failed terminal without switching to it.

## Find in terminal

Press `mod+f` (or select **Search**) to search everything still in the terminal buffer, including
scrollback that has scrolled out of view. Type to search; matches highlight as you go.

- `Enter` jumps to the next match, `Shift+Enter` to the previous one.
- The count next to the input shows where you are, like `3/17`.
- `Escape` or the close button returns focus to the terminal.

In a split panel the search follows the pane you are looking at: switching panes searches that
pane's buffer instead.

## Scrolling

When you scroll up while output is streaming, a **Bottom** pill appears over the terminal. Select it
to jump back to live output; scrolling back to the bottom yourself dismisses it just the same.

## Resizing

Hover the boundary between the terminal panel and the chat to reveal a grip, then drag to resize.
