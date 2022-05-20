# `Bookmarks` extension

`Bookmarks` is a VSCode extension that allows to create bookmarks to files to easily access them. 
This helps when working on large or complex codebases as you can pin files you are commonly referring to.

<p align="center">
  <img width="520" alt="image" src="https://user-images.githubusercontent.com/38414719/168446287-e57f5fb4-fdf8-4fd7-bf00-6707743c0f3d.png">
</p>

## Bookmark
A *bookmark* is a reference to a document that is saved in the context of the current workspace (`Workspace`), or independent from it (`Global`).  Full `URI`s are kept around but the UI will adjust how they are displayed, in particular calculating a relative path based on current workspace.

## Adding a Bookmark

### Commands
There are two commands available to add a bookmark, `Bookmarks: Bookmark Editor (Global)` and `Bookmarks: Bookmark Editor (Workspace)`, both working on the currently active editor and adding a bookmark to the appropriate category.

### Tree
There is a `+` button available on every category node, `Global` and `Workspace`, that bookmarks the currently active editor.

## Removing One or All Bookmarks

### Commands
There is only one command exposed to remove bookmarks, `Bookmarks: Remove All`. A prompt will show up to confirm removal to prevent unintended dataloss.
It is currently not possible to remove a specific bookmark via commands, nor remove all bookmarks from a specific category.

### Tree
There is a `X` button next to each Bookmark, same as one one per category and one on the tree view header that allow you to remove all bookmarks under the selected parent.

