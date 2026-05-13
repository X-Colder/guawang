import { sys } from 'cc';

declare const wx: any;

export class StorageManager {
    private static _instance: StorageManager;

    static get instance(): StorageManager {
        if (!this._instance) {
            this._instance = new StorageManager();
        }
        return this._instance;
    }

    private get isWechat(): boolean {
        return typeof wx !== 'undefined' && !!wx.setStorageSync;
    }

    set(key: string, value: any): void {
        const data = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (this.isWechat) {
            wx.setStorageSync(key, data);
        } else {
            sys.localStorage.setItem(key, data);
        }
    }

    get<T = any>(key: string, defaultValue?: T): T | null {
        let raw: string | null = null;
        if (this.isWechat) {
            try {
                raw = wx.getStorageSync(key);
            } catch {
                raw = null;
            }
        } else {
            raw = sys.localStorage.getItem(key);
        }
        if (raw === null || raw === undefined || raw === '') {
            return defaultValue ?? null;
        }
        try {
            return JSON.parse(raw) as T;
        } catch {
            return raw as unknown as T;
        }
    }

    remove(key: string): void {
        if (this.isWechat) {
            try {
                wx.removeStorageSync(key);
            } catch { /* ignore */ }
        } else {
            sys.localStorage.removeItem(key);
        }
    }

    clear(): void {
        if (this.isWechat) {
            try {
                wx.clearStorageSync();
            } catch { /* ignore */ }
        } else {
            sys.localStorage.clear();
        }
    }
}
