'use client';

import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';

/**
 * Drag-and-drop reorderable list, used wherever the admin needs to
 * change item order. Built on framer-motion's Reorder API.
 *
 * The drag is initiated only by the handle returned to `renderItem`,
 * so clicking elsewhere on the row (to edit, toggle, etc.) still works.
 */

interface SortableListProps<T> {
  items: T[];
  onReorder: (next: T[]) => void;
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number, dragHandle: ReactNode) => ReactNode;
  className?: string;
}

export function SortableList<T>({
  items,
  onReorder,
  getKey,
  renderItem,
  className,
}: SortableListProps<T>) {
  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={items}
      onReorder={onReorder}
      className={className}
    >
      {items.map((item, idx) => (
        <SortableRow key={getKey(item)} value={item}>
          {(handle) => renderItem(item, idx, handle)}
        </SortableRow>
      ))}
    </Reorder.Group>
  );
}

function SortableRow<T>({
  value,
  children,
}: {
  value: T;
  children: (handle: ReactNode) => ReactNode;
}) {
  const controls = useDragControls();

  const handle = (
    <button
      type="button"
      onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => controls.start(e)}
      className="touch-none cursor-grab active:cursor-grabbing p-2 text-dark-500 hover:text-dark-200 transition-colors flex items-center justify-center"
      aria-label="Drag to reorder"
      title="Drag to reorder"
    >
      <GripVertical size={16} />
    </button>
  );

  return (
    <Reorder.Item as="div" value={value} dragListener={false} dragControls={controls}>
      {children(handle)}
    </Reorder.Item>
  );
}
