import type { Config, PriorityOption, StatusOption } from '../types';

export function findPriority(priorities: PriorityOption[], id: string): PriorityOption {
  return priorities.find((p) => p.id === id) ?? { id, label: id, color: '#d9d9d9' };
}

export function findStatus(statuses: StatusOption[], id: string): StatusOption {
  return statuses.find((s) => s.id === id) ?? { id, label: id, color: '#d9d9d9' };
}

export function prioritySelectOptions(priorities: PriorityOption[]) {
  return priorities.map((p) => ({ value: p.id, label: p.label }));
}

export function statusSelectOptions(statuses: StatusOption[]) {
  return statuses.map((s) => ({ value: s.id, label: s.label }));
}

export function getStatusLabel(config: Config, statusId: string): string {
  return findStatus(config.taskStatuses, statusId).label;
}

export function getPriorityLabel(config: Config, priorityId: string): string {
  return findPriority(config.priorities, priorityId).label;
}
