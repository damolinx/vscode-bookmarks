# Change Log

## 0.4.15
- Upgrade minimum VS Code version to 1.99

## 0.4.14

- Improve the rendering of `Notes` in bookmark tooltips.
- Fix: Bookmark markers no longer render multiple times when edits occur.

## 0.4.13

- Fix: Notebook bookmarks fail to open due to incorrect saved URI.
  - This fix is not retroactive as target cell information was never saved.
  - Cells use 0-based indexes.

## 0.4.12

- Improve extension package.
  - Minifying makes it 21KB.
  - Exclude dev-only files.

## 0.4.11

- Fix: Drag-n-drop creates adds an additional entry for line 1 on every file being dragged.
- Fix: Expand parents when adding a new node.

## 0.4.10

- Support folder renames.
- `Rename…` and `Remove` become general actions on context menus.

## 0.4.9

- Support folder names with URI-invalid characters.
- Offer to export bookmakrs when removing all bookmarks.

## 0.4.8

- Add `Search…` command to search for bookmarks.

## 0.4.7

- Add `Export Data` and `Import Data` context menu actions.

- Fix: `New Folder with Open Editors`:
  - Command not enabled when current editor is not supported.
  - Unsupported editors should not be added.

## 0.4.6

- Track file-rename events and update bookmarks as needed.
- Fix: `Toggle In-Editor Markers` should not be bound to current editor.
- Fix: Disable `+` button on unsupported editors.
- Fix: Drag-n-drop of files and editors fails.

## 0.4.5

- Support drag-and-drop for folders.

## 0.4.4

- `Update Line Number` validates line number is not greater than target document's current line count.
- Fix: All bookmark markers would fail to render if any would point to a line number that is out of range.
- Fix: Only bookmark markers for bookmarks not within a folder would be rendered.
- Fix: Bookmark markers would not be removed when a folder containing them was removed.
- Fix: `Update Line Number` checks for line number conflicts globally rather than per folder.
- Fix: Keybindings for `Update Display Name` and `Remove` would not work.

## 0.4.3

- Add `bookmarks.marker.showByDefault` configuration setting to control whether glyphs are render by default at startup.

## 0.4.2

- Fix: `Open All` does not work as expected when using `preview` mode.

## 0.4.1

- Add `New Folder with Open Editors…` action to bookmark all currently opened files. This is limited to the current tab group.
- Add `Open All` action to folders to open all contained bookmarks (non-recursive) in editors.
- Add `Notes` action to bookmark context menu to attach text notes to a bookmark. Displayed as tooltips as bare text (markdown might be possible in the future).

- Update action names and sorting in context menus for clarity.
- Fix: drag-and-drop of an editor breaks the tree.
- Fix: Update `Display Name` or `Line Number` of a bookmark within a folder moves it out of the folder.
- Fix: Update `Line Number` unexpectedly sets a `Display Name` on the bookmark.
- Fix: Use `Cmd+Backspace` in Mac to a `Remove Bookmark Folder` (instead of `Delete`).

## 0.4.0

- Add support for folders.
  - Limitation: cannot drag-and-drop folders.
- Options in the `View` context menu are enabled/disabled as expected.
- Some actions are moved under context menus (instead of inlined) to simplify experience.

## 0.3.7

- Add `View` context menu that allows to switch between two modes to show bookmarks:

  - `Name`: only show `<file>:<line>`.
  - `Path`: show workspace-relative path. This includes relative paths for files that do not live under the workspace folder (only for single-root workspaces).

  On either case, if a display name has been set, that will be used instead.

- Fix: Use `Cmd+Backspace` in Mac to delete a node (instead of `Cmd+Delete`).

## 0.3.5 - 0.3.6

- Fix: `Delete` bound incorrectly to change display name.

## 0.3.4

- Add `Refresh` action on `Global` and `Workspace` nodes.
- Add key support to common actions:
  - `Delete` removes selected node.
  - `F2` (default) or `Enter` (Mac) allows to change the display name of currently selected node.
- Fix: Preserve metadata on drag-and-drop operations.
- This version includes changes to the storage API to support folders in the future. Support is not ready but notify if you see any issues in normal operations.

## 0.3.3

- Fix: Ensure datastore upgrade happens for all data stores, not just the global one.

## 0.3.2

- Bookmark custom display name feature updates:
  - `Display Name` tree submenu replaces the `Rename…` tree action. The `Update…` action allows to edit the display name as before but now you must use the `Remove` action to remove the custom display name (instead or providing an empty name).
  - Better validation and clean-up for provided display names.
- Add `Line Number` tree submenu allows to edit the line number associated with a Bookmark.
- Fix: Bookmark sorting was not semantic, meaning you would get: `file:1`, `file:10`, `file:2` instead of expected `file:1`, `file:2`, `file:10`.
- Fix: All bookmarks are required to have line number information on them. This is not visible from UI (1 would be used by default) but internally it would be treated differently. There is logic that will upgrade current URLS silently but if you run into any issues (e.g., an error reporting a bookmark URL is not found), `Remove All` might be the only way to fix them. Please report the issue if persistent.

## 0.3.1

- Fixes around `vscode-remote` URLs handling.

## 0.3.0

- Add `Rename…` tree action to modify the display name of a bookmark.
- Rename `Remove Bookmark` tree action to `Remove` as there is no ambiguity.

## 0.2.1

- Fix: Display `Show|Hide In-Editor Markers` actions only on `Bookmarks` view title.

## 0.2.0

- Add `Bookmarks: Go to Next in Current Editor` and `Bookmarks: Go to Previous in Current Editor` commands.
- Add `Remove All` command to context menu of `Workspace` and `Global` tree nodes.
- Add support to visualize bookmarks as editor decorators.
  - They must be kept off by default because of [VSCode #5923](https://github.com/Microsoft/vscode/issues/5923).

## 0.1.0/0.1.1

- Non-preview release
- Set `contextualTitle` so explorer tooltip is `Bookmarks`, not `Explorer`.

## 0.0.10

- Add line information to bookmarks.

## 0.0.9

- Using 0.0.9 as test since this is the first-time extension has been published.
- Initial commit. Extension is, and will be maintained, in a usable state on every check-in.
