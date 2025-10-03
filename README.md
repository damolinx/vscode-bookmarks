# Bookmarks for VS Code

This extension helps you efficiently manage and track files or specific locations within your projects. Use it to leave breadcrumbs while debugging, navigate your code more easily, or quickly switch between tasks by bookmarking all open editors.

- Save bookmarks globally or per workspace.
- Organize bookmarks into folders.
- Manage bookmarks via commands, UI controls, and gestures (e.g. drag-and-drop).

<p align="center">
  <img width="520" alt="image" src="https://user-images.githubusercontent.com/38414719/168446287-e57f5fb4-fdf8-4fd7-bf00-6707743c0f3d.png">
</p>

## Bookmark

A _bookmark_ is a reference to a specific location within a document. Bookmarks are grouped as `Workspace` (tied to the current workspace) or `Global` (independent of any workspace). They use absolute URIs to describe their locations, ensuring compatibility with any file system supported by VS Code. The UI dynamically adjusts how bookmarks are displayed, such as showing relative paths when applicable to the current workspace.

A bookmark's identity is tied to its URL, which normally includes a one-based line fragment (e.g., `file://workspace/file.rb#L1`) or a line range (e.g., `file://workspace/file.rb#L44-L133`).

## Bookmark Folders

A _folder_ is a container for bookmarks. They are not related to the file system hierarchy associated to any of the contained bookmarks.

The only constraint imposed by folders is that a given bookmark must be unique within it. For example, you can add a bookmark to `file://workspace/file.rb#L1` to every single folder, but only once per folder. Every bookmark is its own entity, so if you change the display name of one of them, only the specific bookmark is updated.

## Bookmarks View

The **Bookmarks** View is the main UI component for this extension. Bookmarks are split into two categories:

- **Global**: shows bookmarks that are always available, regardless of what the current workspace is.
- **Workspace**: shows bookmarks associated with the currently open workspace, if any.

You can change the display mode of the tree:

- **Name**: shows the file name and target line range. A path hint is shown as a description.
- **Path**: shows the file path relative to the currently open workspace. The associated line range is shown as a description.

<p align="center">
  <img width="448" alt="image" src="https://user-images.githubusercontent.com/38414719/224102129-5dede300-3708-4e43-afab-9baf02f47084.png">
</p>

## Adding a Bookmark

### Commands

There are two commands available to add a bookmark: **Bookmarks: Bookmark Editor (Global)** and **Bookmarks: Bookmark Editor (Workspace)**. Both work on the active editor and add a bookmark to the appropriate category.
When a bookmark is created using any of these commands, the current line location or selection is captured.

#### Programmatic access

The following commands are available for other extensions to use: `bookmarks.addBookmark.global` and `bookmarks.addBookmark.workspace`. They take a single argument that is the path or URI to the file to bookmark.

Line information can be added by appending a fragment to the URI in the format: `L<lineNumber>`, with `lineNumber` being a 1-based index.

### Drag and Drop

Editors can be dragged onto the tree, and they will be bookmarked. Additionally, you can drag items between categories to move them.
When a bookmark is created bu dragging a file onto the **Bookmarks** view, line information is not captured.

### Tree

There is a `+` button available on each category node (`Global`, `Workspace`) that bookmarks the selection in the active editor.

## Removing One or All Bookmarks

### Commands

There are two commands available: **Bookmarks: Remove All (Global)** and **Bookmarks: Remove All (Workspace)**.

#### Programmatic access

The following commands are available for other extensions to use:

- `bookmarks.removeBookmark.global` and `bookmarks.removeBookmark.workspace`. They take a single argument that is the path or URI to the file to remove.
- `bookmarks.removeBookmarks.global` and `bookmarks.removeBookmarks.workspace`. They take no argument and remove all bookmarks from the corresponding category.

### Tree

There is an `X` button on each bookmark node, as well as for each category and the tree view header. These buttons allow you to remove individual bookmarks, all bookmarks under a specific category, or all bookmarks in the tree view. Additionally, the context menu for each category node includes a **Remove All** action to clear all bookmarks within that category.

## Bookmark Properties

### Display Name

Assigning a custom display name to a bookmark affects how it is presented in the UI. This can be used to provide a meaningful name, such as "Bug Location".

#### Context Menu

In the **Display Name** context menu for a given bookmark, use:

- **Update…** to modify the display name of the bookmark.
- **Remove** to delete the custom display name and revert to the default.

### Line or Line-Range

Updating the line information helps keep bookmarks in-sync with changes to their targets or to fix an incorrect value. Bookmarks can only target full lines at this time.

#### Context Menu

In the **Line or Range** context menu for a given bookmark, use:

- **Update…** to update the line or line range.

### Notes

Attach text notes to a bookmark for reference. Notes appear in the bookmark’s tooltip.

#### Context Menu

In the **Notes** context menu for a given bookmark, use:

- **Update…** to modify the note text.
- **Remove** to delete the note.

## Navigation

Clicking a bookmark in the **Bookmarks** view opens its target editor and selects the target range. For multi-line bookmarks the default *start-to-start* selection made ranges look like they were missing the last line and made single-line bookmarks harder to spot, so the default selection mode is now *full-line*. You can change this behavior in the **Bookmarks: Selection Mode** setting.


### Commands

There are two commands, **Bookmarks: Go to Next in Current Editor** and **Bookmarks: Go to Previous in Current Editor**, that can be used to jump between bookmarks set in the current editor.

#### Programmatic access

The following commands are available for other extensions to use: `bookmarks.navigate.next.editor` and `bookmarks.navigate.previous.editor`. They take a single optional argument, which is the path or URI to the file to navigate to (it will be opened if needed).

## Visualization

Clicking a bookmark in the **Bookmarks** view selects its target range in the appropriate editor. Bookmarks can also be rendered as markers on the corresponding editor gutter. This is supported via the **Bookmarks: Toggle In-Editor Markers** command but it is disabled by default due to [VSCode #5923](https://github.com/Microsoft/vscode/issues/5923) which causes these markers to affect the breakpoint markers in some cases (unacceptable experience). You can also use the **Hide In-Editor Markers** and **Show In-Editor Markers** actions in the **Bookmarks** view menu.

<p align="center">
  <img width="448" alt="image" src="https://user-images.githubusercontent.com/38414719/185772569-eebf133d-adfc-4ff2-9c20-9066508a3345.png">
</p>

You can add breakpoints to covered lines via the gutter's context menu when markers are visible.