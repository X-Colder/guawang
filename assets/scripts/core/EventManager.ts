type EventCallback = (...args: any[]) => void;

export class EventManager {
    private static _instance: EventManager;
    private listeners: Map<string, EventCallback[]> = new Map();

    static get instance(): EventManager {
        if (!this._instance) {
            this._instance = new EventManager();
        }
        return this._instance;
    }

    on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback): void {
        const cbs = this.listeners.get(event);
        if (!cbs) return;
        const idx = cbs.indexOf(callback);
        if (idx !== -1) cbs.splice(idx, 1);
    }

    emit(event: string, ...args: any[]): void {
        const cbs = this.listeners.get(event);
        if (!cbs) return;
        for (const cb of cbs) {
            cb(...args);
        }
    }

    clear(event?: string): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

export const GameEvents = {
    MERIT_CHANGED: 'merit_changed',
    RANK_CHANGED: 'rank_changed',
    DIVINATION_COMPLETE: 'divination_complete',
    SCENE_CHANGE: 'scene_change',
    TOAST_SHOW: 'toast_show',
    DAILY_RESET: 'daily_reset',
    HEXAGRAM_UNLOCKED: 'hexagram_unlocked',
    ABANDON_DETECTED: 'abandon_detected',
};
