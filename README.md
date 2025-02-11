# `Bookmarks` extension

The `Bookmarks` extension allows you to keep track of files and file locations. This allows you to leave breadcrumbs as you debug or navigate your code, or when saving all opened editors, it helps you to quickly switch between tasks.

- Bookmarks can be saved per-workspace or be global.
- Bookmarks can be organized using folders.
- Bookmarks can be managed via commands, and UI controls and gestures (e.g. drag-and-drop).

<p align="center">
  <img width="520" alt="image" src="https://user-images.githubusercontent.com/38414719/168446287-e57f5fb4-fdf8-4fd7-bf00-6707743c0f3d.png">
</p>

## Bookmark

A _bookmark_ is a reference to a document that is saved in the context of the current workspace (`Workspace`), or independent from it (`Global`). Absolute `URI`s are used as location descriptors, so any file system supported by VS Code can be bookmarked.
The UI, however, will adjust how bookmarks are displayed, e.g., calculating a relative path based on the current workspace.

A bookmark's identity is tied to its URL, which always includes a one-based line number fragment (e.g., `file://workspace/file.rb#L1`).

## Bookmark Folders

A _folder_ is a container for bookmarks. As such, they are not related to the associated file-system structure.

The only constraint imposed by folders is that a given bookmark must be unique within it. For example, you can add a bookmark to `file://workspace/file.rb#L1` to every single folder, but only once per folder. Every bookmark is its own entity, so if you change the display name of one of them, only the specific bookmark is updated.

## Bookmarks View

The `Bookmarks` View is the main UI component for this extension. Bookmarks are split into two categories:

- `Global`: shows bookmarks that are always available, regardless of what the current workspace is.
- `Workspace`: shows bookmarks associated with the currently open workspace, if any.

You can change the display mode of the tree:

- `Name`: shows the file name and target line number. A path hint is shown as description.
- `Path`: shows the file path relative to the currently open workspace. The associated line number is shown as description.

<p align="center">
  <img width="448" alt="image" src="https://user-images.githubusercontent.com/38414719/224102129-5dede300-3708-4e43-afab-9baf02f47084.png">
</p>

## Adding a Bookmark

### Commands

There are two commands available to add a bookmark: `Bookmarks: Bookmark Editor (Global)` and `Bookmarks: Bookmark Editor (Workspace)`. Both work on the currently active editor and add a bookmark under the appropriate category.
When a bookmark is created via any of these commands, the current line information is captured.

#### Programmatic access

The following commands are available for other extensions to use: `bookmarks.addBookmark.global` and `bookmarks.addBookmark.workspace`. They take a single argument that is the path or URI to the file to bookmark.

Line information can be added by appending a fragment to the URI in the format: `L<lineNumber>`, with `lineNumber` being a 1-based index.

### Drag and Drop

Editors can be dragged onto the tree, and they will be bookmarked. Additionally, it is also possible to drag items between categories to **move** them around.
When a bookmark is created this way, the current line information is not captured.

### Tree

There is a `+` button available on every category node (`Global`, `Workspace`) that bookmarks the currently active editor.

## Removing One or All Bookmarks

### Commands

There are two commands available: `Bookmarks: Remove All (Global)` and `Bookmarks: Remove All (Workspace)`.

#### Programmatic access

The following commands are available for other extensions to use:

- `bookmarks.removeBookmark.global` and `bookmarks.removeBookmark.workspace`. They take a single argument that is the path or URI to the file to remove.
- `bookmarks.removeBookmarks.global` and `bookmarks.removeBookmarks.workspace`. They take no argument and remove all bookmarks from the corresponding category.

### Tree

There is an `X` button next to each bookmark, as well as one per category and one on the tree view header, that allow you to remove all bookmarks under the selected parent. Additionally, there is a `Remove All` action in the context menu for each of the category nodes.

## Bookmark Properties

### Display Name

Assigning a custom display name to a bookmark affects how it is presented in the UI. This can be used to provide a meaningful name, such as _Bug Location_.

#### Context Menu

In the `Display Name` context menu for a given bookmark, use:

- `Update…` to update the display name.
- `Remove` to remove any custom display name.

### Line Number

Updating the line number helps keeping bookmarks in-sync with changes to their targets or to fix an incorrect value. The benefit here will improve as bookmarks evolve and carry more metadata so editing this value is easier than just recreating the bookmark.

#### Context Menu

In the `Line Number` context menu for a given bookmark, use:

- `Update…` to update the line number.

### Notes

Attach text notes to a bookmark for reference. Text is displayed on the the bookmark's tooltip.

#### Context Menu

In the `Notes` context menu for a given bookmark, use:

- `Update…` to update the display name.
- `Remove` to remove any custom display name.

## Navigation

### Commands

There are two commands, `Bookmarks: Go to Next in Current Editor` and `Bookmarks: Go to Previous in Current Editor`, that can be used to jump between bookmarks set in the current editor.

#### Programmatic access

The following commands are available for other extensions to use: `bookmarks.navigate.next.editor` and `bookmarks.navigate.previous.editor`. They take a single optional argument, that is the path or URI to the file to navigate (it will be opened if needed).

## Visualization

Bookmarks are expected to be rendered as markers on the corresponding editor gutter. This is support via the `Bookmarks: Toggle In-Editor Markers` command but it is disabled by default due to [VSCode #5923](https://github.com/Microsoft/vscode/issues/5923) which causes these markers to cover the breakpoint ones (unacceptable experience).
You can also use the `Hide In-Editor Markers` and `Show In-Editor Markers` actions in the `Bookmarks` view menu.

<p align="center">
  <img width="448" alt="image" src="https://user-images.githubusercontent.com/38414719/185772569-eebf133d-adfc-4ff2-9c20-9066508a3345.png">
<p>
