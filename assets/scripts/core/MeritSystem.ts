import { EventManager, GameEvents } from './EventManager';
import { StorageManager } from './StorageManager';

export enum MajorRank {
    FAN_SU = 0,       // 凡俗卦徒
    JING_DAO = 1,     // 静道修士
    GUAN_YAO = 2,     // 观爻真人
    YAN_GUA = 3,      // 演卦灵尊
    YI_DAO = 4,       // 易道圣者
    TAI_JI = 5,       // 太极道主
}

export enum MinorRank {
    CHU = 0,   // 初阶
    ZHONG = 1, // 中阶
    GAO = 2,   // 高阶
    YUAN = 3,  // 圆满
}

export interface RankInfo {
    major: MajorRank;
    minor: MinorRank;
    majorName: string;
    minorName: string;
    fullTitle: string;
    dailyLimit: number;
    readingLayers: number;
}

interface RankThreshold {
    major: MajorRank;
    majorName: string;
    minorRanges: [number, number][]; // [min, max] for 初/中/高/圆满
    dailyLimit: number;
    readingLayers: number;
}

const MINOR_NAMES = ['初阶', '中阶', '高阶', '圆满'];

const RANK_TABLE: RankThreshold[] = [
    {
        major: MajorRank.FAN_SU, majorName: '凡俗卦徒',
        minorRanges: [[0, 2500], [2501, 5000], [5001, 7500], [7501, 10000]],
        dailyLimit: 3, readingLayers: 1,
    },
    {
        major: MajorRank.JING_DAO, majorName: '静道修士',
        minorRanges: [[10001, 13000], [13001, 16000], [16001, 19000], [19001, 22000]],
        dailyLimit: 5, readingLayers: 2,
    },
    {
        major: MajorRank.GUAN_YAO, majorName: '观爻真人',
        minorRanges: [[22001, 26000], [26001, 30000], [30001, 34000], [34001, 38000]],
        dailyLimit: 7, readingLayers: 3,
    },
    {
        major: MajorRank.YAN_GUA, majorName: '演卦灵尊',
        minorRanges: [[38001, 43000], [43001, 48000], [48001, 53000], [53001, 58000]],
        dailyLimit: 9, readingLayers: 3,
    },
    {
        major: MajorRank.YI_DAO, majorName: '易道圣者',
        minorRanges: [[58001, 63000], [63001, 68000], [68001, 73000], [73001, 78000]],
        dailyLimit: 12, readingLayers: 3,
    },
    {
        major: MajorRank.TAI_JI, majorName: '太极道主',
        minorRanges: [[78001, 83500], [83501, 89000], [89001, 94500], [94501, 100000]],
        dailyLimit: -1, readingLayers: 3, // -1 = 无限制
    },
];

export class MeritSystem {
    private static _instance: MeritSystem;
    private _merit: number = 0;

    static get instance(): MeritSystem {
        if (!this._instance) {
            this._instance = new MeritSystem();
        }
        return this._instance;
    }

    get merit(): number {
        return this._merit;
    }

    init(): void {
        this._merit = StorageManager.instance.get<number>('merit', 0) ?? 0;
    }

    addMerit(amount: number, reason: string): void {
        const oldRank = this.getRankInfo();
        this._merit = Math.min(100000, this._merit + amount);
        this.save();
        EventManager.instance.emit(GameEvents.MERIT_CHANGED, this._merit, amount, reason);
        const newRank = this.getRankInfo();
        if (oldRank.major !== newRank.major || oldRank.minor !== newRank.minor) {
            EventManager.instance.emit(GameEvents.RANK_CHANGED, newRank, oldRank);
        }
    }

    deductMerit(amount: number, reason: string): void {
        const oldRank = this.getRankInfo();
        this._merit = Math.max(-100, this._merit - amount);
        this.save();
        EventManager.instance.emit(GameEvents.MERIT_CHANGED, this._merit, -amount, reason);
        const newRank = this.getRankInfo();
        if (oldRank.major !== newRank.major || oldRank.minor !== newRank.minor) {
            EventManager.instance.emit(GameEvents.RANK_CHANGED, newRank, oldRank);
        }
    }

    getRankInfo(): RankInfo {
        for (const tier of RANK_TABLE) {
            for (let i = 0; i < 4; i++) {
                const [min, max] = tier.minorRanges[i];
                if (this._merit >= min && this._merit <= max) {
                    return {
                        major: tier.major,
                        minor: i as MinorRank,
                        majorName: tier.majorName,
                        minorName: MINOR_NAMES[i],
                        fullTitle: `${tier.majorName}·${MINOR_NAMES[i]}`,
                        dailyLimit: tier.dailyLimit,
                        readingLayers: tier.readingLayers,
                    };
                }
            }
        }
        if (this._merit >= 100000) {
            return {
                major: MajorRank.TAI_JI,
                minor: MinorRank.YUAN,
                majorName: '太极道主',
                minorName: '圆满',
                fullTitle: '太极道主·圆满',
                dailyLimit: -1,
                readingLayers: 3,
            };
        }
        return {
            major: MajorRank.FAN_SU,
            minor: MinorRank.CHU,
            majorName: '凡俗卦徒',
            minorName: '初阶',
            fullTitle: '凡俗卦徒·初阶',
            dailyLimit: 3,
            readingLayers: 1,
        };
    }

    getDailyLimit(): number {
        return this.getRankInfo().dailyLimit;
    }

    getReadingLayers(): number {
        return this.getRankInfo().readingLayers;
    }

    isLocked(): boolean {
        return this._merit < 0;
    }

    isReadingBlurred(): boolean {
        return this._merit < 50;
    }

    getMeritProgress(): { current: number; min: number; max: number; progress: number } {
        const rank = this.getRankInfo();
        const tier = RANK_TABLE[rank.major];
        const [min, max] = tier.minorRanges[rank.minor];
        return {
            current: this._merit,
            min,
            max,
            progress: (this._merit - min) / (max - min),
        };
    }

    private save(): void {
        StorageManager.instance.set('merit', this._merit);
    }
}

export const MeritReasons = {
    COMPLETE_READING: { amount: 25, text: '守规演卦，心诚合道，功德+25' },
    ACCEPT_BAD: { amount: 40, text: '直面吉凶，道心沉稳，功德+40' },
    UNLOCK_HEXAGRAM: { amount: 15, text: '参悟一卦，道识增益，功德+15' },
    STUDY_YAO: { amount: 30, text: '研读爻辞，明理悟道，功德+30' },
    MEDITATE: { amount: 20, text: '静坐凝神，悟道养德，功德+20' },
    RANDOM_DIVINE: { amount: 30, text: '随缘无求，契合易道，功德+30' },
    REVIEW_RECORD: { amount: 35, text: '复盘验卦，明势知变，功德+35' },
    ACHIEVEMENT: { amount: 80, text: '成就达成，卦德加封，功德+80' },
};

export const MeritPenalties = {
    DUPLICATE_2ND: { amount: 30, text: '一念重询，卦气纷乱，损德-30' },
    DUPLICATE_3RD: { amount: 80, text: '再三渎卦，道心不诚，重损卦德-80' },
    ABANDON: { amount: 25, text: '避凶执念，道心有缺，有损功德-25' },
    JOKE_INPUT: { amount: 20, text: '戏谑滥占，轻慢天道，功德-20' },
    OVER_LIMIT: { amount: 15, text: '超限滥占，心神耗散，功德-15' },
};
