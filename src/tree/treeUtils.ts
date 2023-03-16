import { NameTreeItemProvider } from './nameTreeItemProvider';
import { PathTreeItemProvider } from './pathTreeItemProvider';
import { TreeItemProvider } from './treeItemProvider';

export type TreeViewKind = 'name' | 'path';

export function createTreeProvider(kind: TreeViewKind): TreeItemProvider {
  switch (kind) {
    case 'name':
      return new NameTreeItemProvider();
    case 'path':
      return new PathTreeItemProvider();
  }
}
