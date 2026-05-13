import { StorageManager } from '../core/StorageManager';
import { MeritSystem } from '../core/MeritSystem';
import { HexagramDatabase } from '../data/HexagramDatabase';
import { DivinationRecord } from '../core/GameManager';

export interface VerificationEntry {
    recordId: string;           // 关联的占卦记录ID
    question: string;           // 原始问题
    hexagramIndex: number;      // 原始卦象
    hexagramName: string;
    nature: string;
    divinationDate: number;     // 占卦时间戳
    outcomeDate?: number;       // 记录结果时间戳
    outcome?: string;           // 实际结果描述
    outcomeRating?: 'very_good' | 'good' | 'neutral' | 'bad' | 'very_bad';
    verified: boolean;          // 是否已验证
    matchScore?: number;        // 吻合度 0-100
    matchAnalysis?: string;     // 吻合度分析
}

export interface VerificationReport {
    totalVerified: number;
    averageMatch: number;
    bestMatch: VerificationEntry | null;
    worstMatch: VerificationEntry | null;
    trend: 'improving' | 'stable' | 'declining';
    summary: string;
}

export class VerificationSystem {
    private static _instance: VerificationSystem;
    private _entries: VerificationEntry[] = [];

    static get instance(): VerificationSystem {
        if (!this._instance) this._instance = new VerificationSystem();
        return this._instance;
    }

    init(): void {
        this._entries = StorageManager.instance.get<VerificationEntry[]>('verificationEntries', []) ?? [];
    }

    get entries(): VerificationEntry[] {
        return this._entries;
    }

    get pendingEntries(): VerificationEntry[] {
        return this._entries.filter(e => !e.verified);
    }

    get verifiedEntries(): VerificationEntry[] {
        return this._entries.filter(e => e.verified);
    }

    // 从占卦记录创建验卦条目
    createEntry(record: DivinationRecord): VerificationEntry {
        const hexData = HexagramDatabase.getByIndex(record.originalHexagram);
        const entry: VerificationEntry = {
            recordId: record.id,
            question: record.question,
            hexagramIndex: record.originalHexagram,
            hexagramName: hexData.fullName,
            nature: hexData.nature,
            divinationDate: record.timestamp,
            verified: false,
        };

        this._entries.unshift(entry);
        if (this._entries.length > 100) {
            this._entries = this._entries.slice(0, 100);
        }
        this.save();
        return entry;
    }

    // 提交实际结果
    submitOutcome(
        recordId: string,
        outcome: string,
        rating: 'very_good' | 'good' | 'neutral' | 'bad' | 'very_bad'
    ): VerificationEntry | null {
        const entry = this._entries.find(e => e.recordId === recordId);
        if (!entry) return null;

        entry.outcome = outcome;
        entry.outcomeRating = rating;
        entry.outcomeDate = Date.now();
        entry.verified = true;

        // 计算吻合度
        const matchResult = this.calculateMatch(entry);
        entry.matchScore = matchResult.score;
        entry.matchAnalysis = matchResult.analysis;

        this.save();

        // 完成验卦得功德
        MeritSystem.instance.addMerit(35, '复盘验卦，明势知变，功德+35');

        return entry;
    }

    private calculateMatch(entry: VerificationEntry): { score: number; analysis: string } {
        const hexData = HexagramDatabase.getByIndex(entry.hexagramIndex);
        const isGoodHex = hexData.nature.includes('吉');
        const isGoodOutcome = entry.outcomeRating === 'very_good' || entry.outcomeRating === 'good';
        const isNeutralOutcome = entry.outcomeRating === 'neutral';
        const isBadOutcome = entry.outcomeRating === 'bad' || entry.outcomeRating === 'very_bad';

        let score = 50; // 基础分
        let analysis = '';

        // 吉卦+好结果 或 凶卦+坏结果 = 高吻合
        if (isGoodHex && isGoodOutcome) {
            score = 80 + Math.floor(Math.random() * 15);
            analysis = `卦象示「${hexData.nature}」，事实应验，吉象如期而至。卦气与现实高度共振。`;
        } else if (!isGoodHex && !hexData.nature.includes('吉') && isBadOutcome) {
            score = 75 + Math.floor(Math.random() * 15);
            analysis = `卦象警示「${hexData.nature}」，事态确如卦示艰难。卦象预警准确，道心诚则灵。`;
        } else if (isNeutralOutcome) {
            score = 55 + Math.floor(Math.random() * 15);
            analysis = `事态平稳，卦象所示大势与现实基本吻合。细节可待后续验证。`;
        } else if (isGoodHex && isBadOutcome) {
            score = 25 + Math.floor(Math.random() * 15);
            analysis = `卦象示吉而事不顺，或因时机未到、或因动爻变化、或因人事干预。不可因一时偏差否定卦理。`;
        } else if (!isGoodHex && isGoodOutcome) {
            score = 30 + Math.floor(Math.random() * 15);
            analysis = `卦象示凶而事反吉，或因化解得当、或因卦示长远而非当下。吉凶互变，本是易道。`;
        } else {
            score = 50 + Math.floor(Math.random() * 10);
            analysis = `卦象与结果的对应关系有待深入参悟，易道精微，非一朝一夕可尽解。`;
        }

        return { score, analysis };
    }

    // 生成验卦报告
    generateReport(): VerificationReport {
        const verified = this.verifiedEntries;

        if (verified.length === 0) {
            return {
                totalVerified: 0,
                averageMatch: 0,
                bestMatch: null,
                worstMatch: null,
                trend: 'stable',
                summary: '尚无验卦记录，占卦后记得回来验证结果。',
            };
        }

        const scores = verified.map(e => e.matchScore || 50);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        const sorted = [...verified].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        const bestMatch = sorted[0];
        const worstMatch = sorted[sorted.length - 1];

        // 趋势：最近5次 vs 总体
        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        if (verified.length >= 5) {
            const recent5 = scores.slice(0, 5);
            const recentAvg = recent5.reduce((a, b) => a + b, 0) / 5;
            if (recentAvg > avg + 5) trend = 'improving';
            else if (recentAvg < avg - 5) trend = 'declining';
        }

        let summary: string;
        if (avg >= 75) {
            summary = `道心精诚，卦象灵验率极高。累计${verified.length}次验卦，平均吻合度${avg}%，堪称卦德深厚。`;
        } else if (avg >= 55) {
            summary = `卦象验证基本吻合，平均${avg}%。${verified.length}次验卦中多数应验，持续修行可精进卦感。`;
        } else {
            summary = `卦象验证吻合度${avg}%，或因问卦心态待调整，或需深入参悟爻辞含义。`;
        }

        if (trend === 'improving') summary += '近期验卦吻合度呈上升趋势，道行精进中。';
        else if (trend === 'declining') summary += '近期吻合度有所下降，宜静心调整问卦心态。';

        return { totalVerified: verified.length, averageMatch: avg, bestMatch, worstMatch, trend, summary };
    }

    private save(): void {
        StorageManager.instance.set('verificationEntries', this._entries);
    }
}
