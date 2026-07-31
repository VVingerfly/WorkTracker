type EventHandler = () => void;

const handlers: Record<string, EventHandler[]> = {};

export function on(event: string, handler: EventHandler): () => void {
  if (!handlers[event]) {
    handlers[event] = [];
  }
  handlers[event].push(handler);
  return () => {
    handlers[event] = handlers[event].filter((h) => h !== handler);
  };
}

export function emit(event: string): void {
  handlers[event]?.forEach((handler) => handler());
}
