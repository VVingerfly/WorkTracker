import type { PriorityOption, StatusOption } from '../types';
import { findPriority, findStatus } from '../utils/configHelpers';

interface TagProps {
  id: string;
  options: PriorityOption[] | StatusOption[];
}

export function OptionTag({ id, options }: TagProps) {
  const item = 'label' in (options[0] ?? {})
    ? findPriority(options as PriorityOption[], id)
    : findStatus(options as StatusOption[], id);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 8px',
        borderRadius: 4,
        fontSize: 12,
        lineHeight: '22px',
        background: `${item.color}22`,
        color: item.color,
        border: `1px solid ${item.color}`,
      }}
    >
      {item.label}
    </span>
  );
}

export function PriorityTag({ id, options }: { id: string; options: PriorityOption[] }) {
  const item = findPriority(options, id);
  return (
    <span style={{ display: 'inline-block', padding: '0 8px', borderRadius: 4, fontSize: 12, lineHeight: '22px', background: `${item.color}22`, color: item.color, border: `1px solid ${item.color}` }}>
      {item.label}
    </span>
  );
}

export function StatusTag({ id, options }: { id: string; options: StatusOption[] }) {
  const item = findStatus(options, id);
  return (
    <span style={{ display: 'inline-block', padding: '0 8px', borderRadius: 4, fontSize: 12, lineHeight: '22px', background: `${item.color}22`, color: item.color, border: `1px solid ${item.color}` }}>
      {item.label}
    </span>
  );
}
