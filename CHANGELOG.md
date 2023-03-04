# Change Log

# 0.3.4

- Add support for `Delete` key to remove selected node.
- Fix: Preserve metadata on drag-and-drop operations.

## 0.3.3

- Fix: Ensure datastore upgrade happens for all data stores, not just the global one.

## 0.3.2

- Bookmark custom display name feature updates:
  - `Display Name` tree submenu replaces the `Rename…` tree action. The `Update…` action allows to edit the display name as before but now you must use the `Remove` action to remove the custom display name (instead or providing an empty name).
  - Better validation and clean-up for provided display names.
- Add `Line Number` tree submenu allows to edit the line number associated with a Bookmark.
- Fix: Bookmark sorting was not semantic, meaning you would get: `file:1`, `file:10`, `file:2` instead of expected `file:1`, `file:2`, `file:10`.
- Fix: All bookmarks are required to have line number information on them. This is not visible from UI (1 would be used by default) but internally it would be treated differently. There is logic that will upgrade current URLS silently but if you run into any issues (e.g. an error reporting a bookmark URL is not found), `Remove All` might be the only way to fix them. Please report the issue if persistent.

## 0.3.1

- Fixes around `vscode-remote` URLs handling.

## 0.3.0

- Add `Rename…` tree action to modify the display name of a bookmark.
- Rename `Remove Bookmark` tree action to `Remove` as there is no ambiguity.

## 0.2.1

- Fix: Display `Show|Hide In-Editor Markers`actions only on `Bookmarks` view title.

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

- Using 0.0.9 as test since this is the first time extension has been published.
- Initial commit. Extension is, and will be maintaned, in usable state on every check-in.
