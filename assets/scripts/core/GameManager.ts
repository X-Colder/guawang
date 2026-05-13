import { StorageManager } from './StorageManager';
import { MeritSystem } from './MeritSystem';
import { EventManager, GameEvents } from './EventManager';

export interface DivinationRecord {
    id: string;
    question: string;
    timestamp: number;
    originalHexagram: number;  // 本卦 index (0-63)
    changedHexagram: number;   // 变卦 index (0-63)
    yaoLines: number[];        // 6爻: 6=老阴, 7=少阳, 8=少阴, 9=老阳
    changingLines: number[];   // 动爻位置 (0-5)
    reviewNote?: string;       // 复盘笔记
    reviewed: boolean;
}

export interface DailyState {
    date: string;             // YYYY-MM-DD
    divinationCount: number;
    meditated: boolean;
    questions: { text: string; keywords: string[]; timestamp: number }[];
}

export class GameManager {
    private static _instance: GameManager;
    private _dailyState: DailyState | null = null;
    private _records: DivinationRecord[] = [];
    private _unlockedHexagrams: Set<number> = new Set();
    private _studiedYao: Set<string> = new Set();

    static get instance(): GameManager {
        if (!this._instance) {
            this._instance = new GameManager();
        }
        return this._instance;
    }

    init(): void {
        MeritSystem.instance.init();
        this.loadDailyState();
        this._records = StorageManager.instance.get<DivinationRecord[]>('records', []) ?? [];
        const unlocked = StorageManager.instance.get<number[]>('unlockedHexagrams', []) ?? [];
        this._unlockedHexagrams = new Set(unlocked);
        const studied = StorageManager.instance.get<string[]>('studiedYao', []) ?? [];
        this._studiedYao = new Set(studied);
    }

    get dailyState(): DailyState {
        this.checkDayReset();
        return this._dailyState!;
    }

    get records(): DivinationRecord[] {
        return this._records;
    }

    get unlockedHexagrams(): Set<number> {
        return this._unlockedHexagrams;
    }

    private getTodayStr(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    private loadDailyState(): void {
        const saved = StorageManager.instance.get<DailyState>('dailyState', null);
        const today = this.getTodayStr();
        if (saved && saved.date === today) {
            this._dailyState = saved;
        } else {
            this._dailyState = {
                date: today,
                divinationCount: 0,
                meditated: false,
                questions: [],
            };
            this.saveDailyState();
            EventManager.instance.emit(GameEvents.DAILY_RESET);
        }
    }

    private checkDayReset(): void {
        const today = this.getTodayStr();
        if (this._dailyState && this._dailyState.date !== today) {
            this.loadDailyState();
        }
    }

    canDivine(): { allowed: boolean; reason?: string } {
        this.checkDayReset();
        if (MeritSystem.instance.isLocked()) {
            return { allowed: false, reason: '道心溃散，功德不足，暂不可演卦' };
        }
        const limit = MeritSystem.instance.getDailyLimit();
        if (limit !== -1 && this._dailyState!.divinationCount >= limit) {
            return { allowed: false, reason: '今日起卦次数已达上限，请明日再来' };
        }
        return { allowed: true };
    }

    recordDivination(record: DivinationRecord): void {
        this._records.unshift(record);
        if (this._records.length > 200) {
            this._records = this._records.slice(0, 200);
        }
        StorageManager.instance.set('records', this._records);

        this._dailyState!.divinationCount++;
        this.saveDailyState();

        this.unlockHexagram(record.originalHexagram);
        if (record.changedHexagram !== record.originalHexagram) {
            this.unlockHexagram(record.changedHexagram);
        }
    }

    addQuestionRecord(text: string, keywords: string[]): void {
        this._dailyState!.questions.push({
            text,
            keywords,
            timestamp: Date.now(),
        });
        this.saveDailyState();
    }

    getRecentQuestions(withinHours: number = 24): { text: string; keywords: string[]; timestamp: number }[] {
        const cutoff = Date.now() - withinHours * 3600 * 1000;
        return this._dailyState!.questions.filter(q => q.timestamp >= cutoff);
    }

    unlockHexagram(index: number): void {
        if (!this._unlockedHexagrams.has(index)) {
            this._unlockedHexagrams.add(index);
            StorageManager.instance.set('unlockedHexagrams', Array.from(this._unlockedHexagrams));
            EventManager.instance.emit(GameEvents.HEXAGRAM_UNLOCKED, index);
        }
    }

    isHexagramUnlocked(index: number): boolean {
        return this._unlockedHexagrams.has(index);
    }

    markYaoStudied(hexIndex: number, yaoIndex: number): boolean {
        const key = `${hexIndex}_${yaoIndex}`;
        if (this._studiedYao.has(key)) return false;
        this._studiedYao.add(key);
        StorageManager.instance.set('studiedYao', Array.from(this._studiedYao));
        return true;
    }

    isYaoStudied(hexIndex: number, yaoIndex: number): boolean {
        return this._studiedYao.has(`${hexIndex}_${yaoIndex}`);
    }

    canMeditate(): boolean {
        this.checkDayReset();
        return !this._dailyState!.meditated;
    }

    markMeditated(): void {
        this._dailyState!.meditated = true;
        this.saveDailyState();
    }

    addReviewNote(recordId: string, note: string): void {
        const record = this._records.find(r => r.id === recordId);
        if (record) {
            record.reviewNote = note;
            record.reviewed = true;
            StorageManager.instance.set('records', this._records);
        }
    }

    generateRecordId(): string {
        return `gw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    private saveDailyState(): void {
        StorageManager.instance.set('dailyState', this._dailyState);
    }
}
