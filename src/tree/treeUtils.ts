import { NameTreeItemProvider } from './nameTreeItemProvider';
import { PathTreeItemProvider } from './pathTreeItemProvider';
import { TreeItemProvider } from './treeItemProvider';

export type TreeViewKind = 'name' | 'path';

export const NaturalComparer = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function createTreeProvider(kind: TreeViewKind): TreeItemProvider {
  switch (kind) {
    case 'name':
      return new NameTreeItemProvider();
    case 'path':
      return new PathTreeItemProvider();
  }
}
