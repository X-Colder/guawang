import { StorageManager } from '../core/StorageManager';
import { EventManager, GameEvents } from '../core/EventManager';
import { HexagramGenerator, DivinationResult } from '../divination/HexagramGenerator';
import { HexagramDatabase } from '../data/HexagramDatabase';
import { MeritSystem, MeritReasons } from '../core/MeritSystem';

export interface DailyHexagram {
    date: string;               // YYYY-MM-DD
    result: DivinationResult;
    hexagramIndex: number;
    hexagramName: string;
    nature: string;
    solarTerm?: string;         // 节气名（如有）
    isSpecialDay: boolean;      // 是否节气特殊日
    viewed: boolean;            // 是否已查看
    meritBonus: number;         // 今日功德加成比例 (1.0 = 无加成)
}

// 24节气数据：[月, 日(大约), 名称, 对应卦象index, 寓意]
const SOLAR_TERMS: [number, number, string, number, string][] = [
    [2, 4, '立春', 23, '地雷复·一阳来复，万物始生'],
    [2, 19, '雨水', 7, '水地比·水润大地，万物滋养'],
    [3, 6, '惊蛰', 50, '震为雷·春雷惊蛰，万物苏醒'],
    [3, 21, '春分', 10, '地天泰·阴阳交泰，天地平衡'],
    [4, 5, '清明', 56, '巽为风·风行天下，万物清明'],
    [4, 20, '谷雨', 2, '水雷屯·春雨润生，草木萌发'],
    [5, 6, '立夏', 0, '乾为天·阳气正盛，万物生长'],
    [5, 21, '小满', 41, '风雷益·损上益下，渐趋丰盈'],
    [6, 6, '芒种', 49, '火风鼎·烹饪新食，收获在望'],
    [6, 21, '夏至', 29, '离为火·阳极之日，光明至盛'],
    [7, 7, '小暑', 54, '雷火丰·丰盛壮大，日中之象'],
    [7, 23, '大暑', 33, '雷天大壮·阳刚至极，暑气最盛'],
    [8, 7, '立秋', 43, '天风姤·一阴初生，秋意渐来'],
    [8, 23, '处暑', 30, '泽山咸·天地感应，暑气将消'],
    [9, 8, '白露', 52, '风山渐·循序渐进，秋意渐深'],
    [9, 23, '秋分', 11, '天地否·阴阳分离，昼夜均分'],
    [10, 8, '寒露', 32, '天山遁·阳气退藏，渐入寒凉'],
    [10, 23, '霜降', 22, '山地剥·阴盛阳衰，万物凋零'],
    [11, 7, '立冬', 1, '坤为地·阴气至盛，万物收藏'],
    [11, 22, '小雪', 28, '坎为水·天寒水凝，初雪将至'],
    [12, 7, '大雪', 38, '水山蹇·道路艰难，大雪封山'],
    [12, 22, '冬至', 23, '地雷复·一阳复始，否极泰来'],
    [1, 6, '小寒', 51, '艮为山·静止不动，寒气凝结'],
    [1, 20, '大寒', 46, '泽水困·寒极之时，困中求通'],
];

export class DailySignSystem {
    private static _instance: DailySignSystem;
    private _todayHexagram: DailyHexagram | null = null;

    static get instance(): DailySignSystem {
        if (!this._instance) this._instance = new DailySignSystem();
        return this._instance;
    }

    init(): void {
        this.loadOrGenerate();
    }

    get todayHexagram(): DailyHexagram {
        this.loadOrGenerate();
        return this._todayHexagram!;
    }

    private getTodayStr(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    private loadOrGenerate(): void {
        const today = this.getTodayStr();
        const saved = StorageManager.instance.get<DailyHexagram>('dailyHexagram', null);

        if (saved && saved.date === today) {
            this._todayHexagram = saved;
            return;
        }

        // 生成今日天机卦
        this._todayHexagram = this.generateDailyHexagram(today);
        StorageManager.instance.set('dailyHexagram', this._todayHexagram);
    }

    private generateDailyHexagram(dateStr: string): DailyHexagram {
        const [year, month, day] = dateStr.split('-').map(Number);
        const solarTerm = this.getSolarTerm(month, day);

        let result: DivinationResult;
        let hexIndex: number;

        if (solarTerm) {
            // 节气日：使用对应的固定卦象
            hexIndex = solarTerm.hexagramIndex;
            const hexData = HexagramDatabase.getByIndex(hexIndex);
            const lines = hexData.lines;
            // 构造结果（无动爻）
            result = {
                yaoLines: lines.map(l => l === 1 ? 7 : 8),
                changingLines: [],
                originalLines: [...lines],
                changedLines: [...lines],
                originalIndex: hexIndex,
                changedIndex: hexIndex,
            };
        } else {
            // 普通日：基于日期种子的伪随机（保证同一天所有人看到相同卦）
            const seed = this.dateSeed(year, month, day);
            result = this.seededHexagram(seed);
            hexIndex = result.originalIndex;
        }

        const hexData = HexagramDatabase.getByIndex(hexIndex);

        return {
            date: dateStr,
            result,
            hexagramIndex: hexIndex,
            hexagramName: hexData.fullName,
            nature: hexData.nature,
            solarTerm: solarTerm?.name,
            isSpecialDay: !!solarTerm,
            viewed: false,
            meritBonus: solarTerm ? 1.5 : 1.0,
        };
    }

    private getSolarTerm(month: number, day: number): { name: string; hexagramIndex: number; meaning: string } | null {
        for (const [m, d, name, hexIdx, meaning] of SOLAR_TERMS) {
            // 节气日允许前后1天偏差
            if (m === month && Math.abs(d - day) <= 1) {
                return { name, hexagramIndex: hexIdx, meaning };
            }
        }
        return null;
    }

    // 基于日期的确定性种子
    private dateSeed(year: number, month: number, day: number): number {
        let hash = year * 10000 + month * 100 + day;
        hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
        hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
        hash = (hash >> 16) ^ hash;
        return Math.abs(hash);
    }

    // 基于种子的伪随机摇卦
    private seededHexagram(seed: number): DivinationResult {
        const yaoLines: number[] = [];
        let s = seed;
        for (let i = 0; i < 6; i++) {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            const coins = [];
            for (let c = 0; c < 3; c++) {
                s = (s * 1103515245 + 12345) & 0x7fffffff;
                coins.push((s % 2 === 0) ? 3 : 2);
            }
            yaoLines.push(coins[0] + coins[1] + coins[2]);
        }
        return HexagramGenerator.buildResult(yaoLines);
    }

    // 查看天机卦（标记已读 + 功德）
    markViewed(): void {
        if (this._todayHexagram && !this._todayHexagram.viewed) {
            this._todayHexagram.viewed = true;
            StorageManager.instance.set('dailyHexagram', this._todayHexagram);
        }
    }

    // 获取今日功德加成倍率
    getMeritBonus(): number {
        return this._todayHexagram?.meritBonus || 1.0;
    }

    // 获取节气信息（用于UI展示）
    getSolarTermInfo(): { name: string; meaning: string } | null {
        if (!this._todayHexagram?.solarTerm) return null;
        for (const [m, d, name, hexIdx, meaning] of SOLAR_TERMS) {
            if (name === this._todayHexagram.solarTerm) {
                return { name, meaning };
            }
        }
        return null;
    }
}
