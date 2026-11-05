/** A tiny in-app event bus for one-off UI signals between screens (no data, no persistence). */
type Handler = () => void;
const handlers: Record<string, Set<Handler>> = {};

export const events = {
    on(name: 'sosHint', fn: Handler) {
        (handlers[name] ??= new Set()).add(fn);
        return () => { handlers[name]?.delete(fn); };
    },
    emit(name: 'sosHint') {
        handlers[name]?.forEach((fn) => fn());
    },
};
