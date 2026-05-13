import { StorageManager } from '../core/StorageManager';
import { MeritSystem, MeritReasons } from '../core/MeritSystem';
import { HexagramDatabase, HexagramInfo } from '../data/HexagramDatabase';
import { EventManager, GameEvents } from '../core/EventManager';

export enum ChallengeType {
    GUESS_NAME = 'guess_name',           // 看爻辞猜卦名
    GUESS_LINES = 'guess_lines',         // 看卦名画六爻
    MATCH_NATURE = 'match_nature',       // 判断吉凶
    FILL_YAO = 'fill_yao',              // 补全缺失的爻辞
    CHOOSE_ACTION = 'choose_action',     // 根据卦象选正确行动
    TRIGRAM_COMBINE = 'trigram_combine',  // 上下卦组合
}

export interface ChallengeQuestion {
    type: ChallengeType;
    question: string;
    options: string[];
    correctIndex: number;
    hexagramIndex: number;
    explanation: string;
}

export interface ChallengeLevel {
    levelIndex: number;      // 0-63 对应64卦
    hexagramIndex: number;
    hexagramName: string;
    questions: ChallengeQuestion[];
    completed: boolean;
    stars: number;           // 0-3 星评
    bestScore: number;       // 最佳得分
}

export interface ChallengeProgress {
    levels: { completed: boolean; stars: number; bestScore: number }[];
    totalStars: number;
    unlockedCount: number;
}

export class ChallengeSystem {
    private static _instance: ChallengeSystem;
    private _progress: ChallengeProgress | null = null;

    static get instance(): ChallengeSystem {
        if (!this._instance) this._instance = new ChallengeSystem();
        return this._instance;
    }

    init(): void {
        const saved = StorageManager.instance.get<ChallengeProgress>('challengeProgress', null);
        if (saved) {
            this._progress = saved;
        } else {
            this._progress = {
                levels: Array.from({ length: 64 }, () => ({ completed: false, stars: 0, bestScore: 0 })),
                totalStars: 0,
                unlockedCount: 1, // 第一关默认解锁
            };
            this.save();
        }
    }

    get progress(): ChallengeProgress {
        return this._progress!;
    }

    isLevelUnlocked(levelIndex: number): boolean {
        return levelIndex < this._progress!.unlockedCount;
    }

    // 生成关卡题目
    generateLevel(levelIndex: number): ChallengeLevel {
        const hex = HexagramDatabase.getByIndex(levelIndex);
        const questions = this.generateQuestions(hex, levelIndex);

        return {
            levelIndex,
            hexagramIndex: levelIndex,
            hexagramName: hex.fullName,
            questions,
            completed: this._progress!.levels[levelIndex].completed,
            stars: this._progress!.levels[levelIndex].stars,
            bestScore: this._progress!.levels[levelIndex].bestScore,
        };
    }

    private generateQuestions(hex: HexagramInfo, levelIndex: number): ChallengeQuestion[] {
        const questions: ChallengeQuestion[] = [];
        const allHex = HexagramDatabase.getAll();

        // 题目1：看卦辞猜卦名
        const wrongNames = this.getRandomOthers(allHex, levelIndex, 3).map(h => h.fullName);
        const nameOptions = this.shuffleWithCorrect(wrongNames, hex.fullName);
        questions.push({
            type: ChallengeType.GUESS_NAME,
            question: `卦辞「${hex.guaCi.substring(0, 20)}${hex.guaCi.length > 20 ? '...' : ''}」出自哪一卦？`,
            options: nameOptions.options,
            correctIndex: nameOptions.correctIdx,
            hexagramIndex: levelIndex,
            explanation: `此为${hex.fullName}之卦辞。`,
        });

        // 题目2：判断吉凶
        const natures = ['大吉', '吉', '平', '小凶', '凶'];
        const natureOptions = this.shuffleWithCorrect(
            natures.filter(n => n !== hex.nature).slice(0, 3),
            hex.nature
        );
        questions.push({
            type: ChallengeType.MATCH_NATURE,
            question: `${hex.fullName}的卦象性质为？`,
            options: natureOptions.options,
            correctIndex: natureOptions.correctIdx,
            hexagramIndex: levelIndex,
            explanation: `${hex.fullName}，${hex.nature}之象。${hex.layer1_overview}`,
        });

        // 题目3：上下卦组合
        const wrongTrigrams = ['乾', '坤', '震', '巽', '坎', '离', '艮', '兑']
            .filter(t => t !== hex.upperTrigram);
        const trigramOptions = this.shuffleWithCorrect(
            wrongTrigrams.slice(0, 3),
            hex.upperTrigram
        );
        questions.push({
            type: ChallengeType.TRIGRAM_COMBINE,
            question: `${hex.fullName}的上卦（外卦）是？`,
            options: trigramOptions.options,
            correctIndex: trigramOptions.correctIdx,
            hexagramIndex: levelIndex,
            explanation: `${hex.fullName}上${hex.upperTrigram}下${hex.lowerTrigram}。`,
        });

        // 题目4：选择正确行动
        const actions = this.generateActionQuestion(hex);
        questions.push(actions);

        // 题目5：爻辞辨识
        if (hex.yao.length > 0) {
            const yaoIdx = Math.floor(Math.random() * Math.min(6, hex.yao.length));
            const correctYao = hex.yao[yaoIdx];
            const wrongYao = this.getRandomOthers(allHex, levelIndex, 3)
                .map(h => h.yao[yaoIdx]?.original || '无爻辞')
                .filter(t => t !== correctYao.original);

            const yaoOptions = this.shuffleWithCorrect(
                wrongYao.slice(0, 3),
                correctYao.original.substring(0, 15) + (correctYao.original.length > 15 ? '...' : '')
            );
            questions.push({
                type: ChallengeType.FILL_YAO,
                question: `${hex.fullName}的${correctYao.position}爻辞为？`,
                options: yaoOptions.options,
                correctIndex: yaoOptions.correctIdx,
                hexagramIndex: levelIndex,
                explanation: `${correctYao.position}：${correctYao.original} ${correctYao.explanation}`,
            });
        }

        return questions;
    }

    private generateActionQuestion(hex: HexagramInfo): ChallengeQuestion {
        const isGood = hex.nature.includes('吉');
        const correctAction = isGood ? '积极进取，把握时机' : '韬光养晦，静待时变';
        const wrongActions = isGood
            ? ['急流勇退，观望为上', '避而不战，保守为主', '断尾求生，止损为先']
            : ['大胆冒进，先发制人', '高调出击，声势为王', '不顾后果，全力以赴'];

        const options = this.shuffleWithCorrect(wrongActions, correctAction);
        return {
            type: ChallengeType.CHOOSE_ACTION,
            question: `面对${hex.fullName}之象，最宜采取何种策略？`,
            options: options.options,
            correctIndex: options.correctIdx,
            hexagramIndex: hex.index,
            explanation: hex.layer3_advice,
        };
    }

    // 提交关卡结果
    submitResult(levelIndex: number, correctCount: number, totalCount: number): { stars: number; meritGained: number; newUnlock: boolean } {
        const score = Math.round((correctCount / totalCount) * 100);
        const stars = score >= 100 ? 3 : score >= 80 ? 2 : score >= 60 ? 1 : 0;

        const level = this._progress!.levels[levelIndex];
        const isFirstClear = !level.completed && stars > 0;
        const isNewBest = score > level.bestScore;

        if (stars > 0) level.completed = true;
        if (stars > level.stars) level.stars = stars;
        if (score > level.bestScore) level.bestScore = score;

        // 解锁下一关
        let newUnlock = false;
        if (level.completed && levelIndex + 1 < 64 && this._progress!.unlockedCount <= levelIndex + 1) {
            this._progress!.unlockedCount = levelIndex + 2;
            newUnlock = true;
        }

        // 重计总星数
        this._progress!.totalStars = this._progress!.levels.reduce((sum, l) => sum + l.stars, 0);
        this.save();

        // 功德奖励
        let meritGained = 0;
        if (isFirstClear) {
            meritGained = 30 + stars * 15; // 首通 30~75
            MeritSystem.instance.addMerit(meritGained, `悟道第${levelIndex + 1}关·${HexagramDatabase.getByIndex(levelIndex).name}，功德+${meritGained}`);
        } else if (isNewBest && stars === 3) {
            meritGained = 10;
            MeritSystem.instance.addMerit(meritGained, `满星通关，功德+${meritGained}`);
        }

        return { stars, meritGained, newUnlock };
    }

    private getRandomOthers(all: HexagramInfo[], excludeIndex: number, count: number): HexagramInfo[] {
        const pool = all.filter(h => h.index !== excludeIndex);
        const result: HexagramInfo[] = [];
        for (let i = 0; i < count && pool.length > 0; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            result.push(pool.splice(idx, 1)[0]);
        }
        return result;
    }

    private shuffleWithCorrect(wrongOptions: string[], correct: string): { options: string[]; correctIdx: number } {
        const options = [...wrongOptions.slice(0, 3)];
        const insertIdx = Math.floor(Math.random() * (options.length + 1));
        options.splice(insertIdx, 0, correct);
        return { options, correctIdx: insertIdx };
    }

    private save(): void {
        StorageManager.instance.set('challengeProgress', this._progress);
    }
}
