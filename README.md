# `Bookmarks` extension

`Bookmarks` is a VSCode extension that allows to create bookmarks to files to easily access them. 
This helps when working on large or complex codebases as you can pin files you are commonly referring to.

<p align="center">
  <img width="520" alt="image" src="https://user-images.githubusercontent.com/38414719/168446287-e57f5fb4-fdf8-4fd7-bf00-6707743c0f3d.png">
</p>

## Bookmark
A *bookmark* is a reference to a document that is saved in the context of the current workspace (`Workspace`), or independent from it (`Global`). Full `URI`s are kept around but the UI will adjust how they are displayed, calculating a relative path based on current workspace.

## Adding a Bookmark

### Commands
There are two commands available to add a bookmark, `Bookmarks: Bookmark Editor (Global)` and `Bookmarks: Bookmark Editor (Workspace)`, both working on the currently active editor and adding a bookmark to the appropriate category.
When a bookmark is created via these commands, current line information is captured.

#### Programatic access
The following commads are exposed for other extensions to use: `bookmarks.addBookmark.global` and `bookmarks.addBookmark.workspace`. They take a single argument that is the path or URI to the file to bookmark.

Line information can be added by adding a fragment to the URI with the format: `L<lineNumber>`, with `lineNumber` being a 1-based index. 

### Drag and Drop
Editor can be dragged onto the right category, and they will be bookmarked (if they are not already). Additionally, it is also possible to drag items between categories to **move** them around. 
When a bookmark is created this way, no line information is captured.

### Tree
There is a `+` button available on every category node, `Global` and `Workspace`, that bookmarks the currently active editor.

## Removing One or All Bookmarks

### Commands
It is currently not possible to remove bookmarks using a command.

#### Programatic access
The following commads are exposed for other extensions to use: `bookmarks.removeBookmark.global` and`bookmarks.removeBookmark.workspace`. They take a single argument that is the path or URI to the file to remove.

### Tree
There is a `X` button next to each Bookmark, same as one per category and one on the tree view header that allow you to remove all bookmarks under the selected parent.

## Navigation

### Commands
There are two commands, `Bookmarks: Go to Next in Current Editor` and `Bookmarks: Go to Previous in Current Editor`, that can be used to jump between bookmarks set in current editor. 

#### Programatic access
The following commads are exposed for other extensions to use: `bookmarks.navigate.next.editor` and `bookmarks.navigate.previous.editor`. They take a single optional argument that is the path or URI to the file to navigate (it will be opened if needed).


