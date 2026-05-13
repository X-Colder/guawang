import { StorageManager } from '../core/StorageManager';
import { HexagramGenerator, DivinationResult } from '../divination/HexagramGenerator';
import { HexagramDatabase } from '../data/HexagramDatabase';
import { MeritSystem } from '../core/MeritSystem';

export interface PairReading {
    id: string;
    myResult: DivinationResult;
    partnerResult: DivinationResult;
    mutualHexagramIndex: number; // 互卦
    myName: string;
    partnerName: string;
    timestamp: number;
    interpretation: MutualInterpretation;
}

export interface MutualInterpretation {
    overview: string;       // 关系总览
    chemistry: string;      // 契合度描述
    advice: string;         // 相处建议
    chemistryScore: number; // 0-100 契合分数
}

// 互卦算法：取A卦的上卦 + B卦的下卦 = 互卦
function generateMutualHexagram(resultA: DivinationResult, resultB: DivinationResult): number {
    // 互卦：A的上卦(lines[3-5]) + B的下卦(lines[0-2])
    const mutualLines = [
        ...resultB.originalLines.slice(0, 3), // B的下卦
        ...resultA.originalLines.slice(3, 6), // A的上卦
    ];
    return HexagramGenerator.linesToKingWenIndex(mutualLines);
}

// 契合度计算
function calculateChemistry(resultA: DivinationResult, resultB: DivinationResult, mutualIdx: number): number {
    const mutualHex = HexagramDatabase.getByIndex(mutualIdx);
    let score = 50; // 基础分

    // 互卦性质加分
    if (mutualHex.nature.includes('大吉')) score += 30;
    else if (mutualHex.nature.includes('吉')) score += 20;
    else if (mutualHex.nature === '平') score += 10;
    else if (mutualHex.nature.includes('凶')) score -= 10;

    // 阴阳互补加分（A阳多B阴多或反之）
    const yangA = resultA.originalLines.filter(l => l === 1).length;
    const yangB = resultB.originalLines.filter(l => l === 1).length;
    const balance = Math.abs(yangA + yangB - 6); // 越接近6阴6阳越好
    score += (3 - balance) * 5;

    // 同卦减分（太相似）
    if (resultA.originalIndex === resultB.originalIndex) score -= 10;

    // 乾坤配最佳
    if ((resultA.originalIndex === 0 && resultB.originalIndex === 1) ||
        (resultA.originalIndex === 1 && resultB.originalIndex === 0)) {
        score += 20;
    }

    return Math.max(10, Math.min(100, score));
}

// 生成关系解读
function generateInterpretation(
    resultA: DivinationResult,
    resultB: DivinationResult,
    mutualIdx: number,
    score: number
): MutualInterpretation {
    const mutualHex = HexagramDatabase.getByIndex(mutualIdx);
    const hexA = HexagramDatabase.getByIndex(resultA.originalIndex);
    const hexB = HexagramDatabase.getByIndex(resultB.originalIndex);

    let chemistry: string;
    if (score >= 85) chemistry = '天作之合，道心共振，万事默契';
    else if (score >= 70) chemistry = '因缘深厚，阴阳互济，相得益彰';
    else if (score >= 55) chemistry = '道缘尚可，需共修磨合，渐入佳境';
    else if (score >= 40) chemistry = '缘分浅薄，需以诚相待，方可长久';
    else chemistry = '卦气相冲，宜保持距离，各修各道';

    const overview = `二人卦气交融，生成互卦「${mutualHex.fullName}」。${mutualHex.layer1_overview}`;

    let advice: string;
    if (score >= 70) {
        advice = `${hexA.name}与${hexB.name}相会，阴阳调和。宜同心协力，共济大事。`;
    } else if (score >= 40) {
        advice = `${hexA.name}遇${hexB.name}，各有锋芒。宜互相包容，取长补短。`;
    } else {
        advice = `${hexA.name}对${hexB.name}，气场相异。宜保持尊重，不可强求。`;
    }

    return { overview, chemistry, advice, chemistryScore: score };
}

export class PairDivinationSystem {
    private static _instance: PairDivinationSystem;
    private _history: PairReading[] = [];

    static get instance(): PairDivinationSystem {
        if (!this._instance) this._instance = new PairDivinationSystem();
        return this._instance;
    }

    init(): void {
        this._history = StorageManager.instance.get<PairReading[]>('pairHistory', []) ?? [];
    }

    get history(): PairReading[] {
        return this._history;
    }

    // 生成配对占卦（本地模式：模拟对方）
    createPairReading(myName: string, partnerName: string): PairReading {
        const myResult = HexagramGenerator.castHexagram();
        const partnerResult = HexagramGenerator.castHexagram();

        const mutualIdx = generateMutualHexagram(myResult, partnerResult);
        const score = calculateChemistry(myResult, partnerResult, mutualIdx);
        const interpretation = generateInterpretation(myResult, partnerResult, mutualIdx, score);

        const reading: PairReading = {
            id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            myResult,
            partnerResult,
            mutualHexagramIndex: mutualIdx,
            myName,
            partnerName,
            timestamp: Date.now(),
            interpretation,
        };

        this._history.unshift(reading);
        if (this._history.length > 50) {
            this._history = this._history.slice(0, 50);
        }
        StorageManager.instance.set('pairHistory', this._history);

        return reading;
    }

    // 生成分享码（编码为短字符串，可通过微信分享）
    generateShareCode(result: DivinationResult): string {
        // 将6爻编码为12位数字字符串
        const code = result.yaoLines.map(y => y.toString()).join('');
        const timestamp = Math.floor(Date.now() / 1000).toString(36);
        return `GW${code}${timestamp}`;
    }

    // 解码分享码
    decodeShareCode(code: string): DivinationResult | null {
        if (!code.startsWith('GW') || code.length < 8) return null;
        const yaoStr = code.substring(2, 8);
        const yaoLines = yaoStr.split('').map(Number);
        if (yaoLines.some(y => y < 6 || y > 9)) return null;
        return HexagramGenerator.buildResult(yaoLines);
    }

    // 用对方的分享码生成互卦
    createPairFromCode(myName: string, partnerName: string, partnerCode: string): PairReading | null {
        const partnerResult = this.decodeShareCode(partnerCode);
        if (!partnerResult) return null;

        const myResult = HexagramGenerator.castHexagram();
        const mutualIdx = generateMutualHexagram(myResult, partnerResult);
        const score = calculateChemistry(myResult, partnerResult, mutualIdx);
        const interpretation = generateInterpretation(myResult, partnerResult, mutualIdx, score);

        const reading: PairReading = {
            id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            myResult,
            partnerResult,
            mutualHexagramIndex: mutualIdx,
            myName,
            partnerName,
            timestamp: Date.now(),
            interpretation,
        };

        this._history.unshift(reading);
        StorageManager.instance.set('pairHistory', this._history);
        return reading;
    }
}
