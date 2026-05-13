export enum YaoType {
    OLD_YIN = 6,    // 老阴（变爻）—— 三枚皆背
    YOUNG_YANG = 7, // 少阳（不变）—— 两背一正
    YOUNG_YIN = 8,  // 少阴（不变）—— 一背两正
    OLD_YANG = 9,   // 老阳（变爻）—— 三枚皆正
}

export interface DivinationResult {
    yaoLines: number[];       // 6爻值 [6|7|8|9], 从初爻到上爻
    changingLines: number[];  // 动爻位置 (0-5)
    originalLines: number[];  // 本卦 [0|1], 0=阴 1=阳
    changedLines: number[];   // 变卦 [0|1]
    originalIndex: number;    // 本卦在64卦中的索引
    changedIndex: number;     // 变卦索引
}

export class HexagramGenerator {

    static castSingleYao(): number {
        const coins = [
            Math.random() < 0.5 ? 3 : 2,
            Math.random() < 0.5 ? 3 : 2,
            Math.random() < 0.5 ? 3 : 2,
        ];
        return coins[0] + coins[1] + coins[2]; // 6,7,8,9
    }

    static castHexagram(): DivinationResult {
        const yaoLines: number[] = [];
        for (let i = 0; i < 6; i++) {
            yaoLines.push(this.castSingleYao());
        }
        return this.buildResult(yaoLines);
    }

    static buildResult(yaoLines: number[]): DivinationResult {
        const changingLines: number[] = [];
        const originalLines: number[] = [];
        const changedLines: number[] = [];

        for (let i = 0; i < 6; i++) {
            const yao = yaoLines[i];
            const isYang = (yao === YaoType.YOUNG_YANG || yao === YaoType.OLD_YANG);
            const isChanging = (yao === YaoType.OLD_YIN || yao === YaoType.OLD_YANG);

            originalLines.push(isYang ? 1 : 0);

            if (isChanging) {
                changingLines.push(i);
                changedLines.push(isYang ? 0 : 1); // 老阳变阴, 老阴变阳
            } else {
                changedLines.push(isYang ? 1 : 0);
            }
        }

        return {
            yaoLines,
            changingLines,
            originalLines,
            changedLines,
            originalIndex: this.linesToKingWenIndex(originalLines),
            changedIndex: this.linesToKingWenIndex(changedLines),
        };
    }

    // 将六爻二进制转换为文王序号
    // lines[0]=初爻(最下), lines[5]=上爻(最上)
    // 先通过上下卦的三位二进制找到八卦，再查文王64卦序
    static linesToKingWenIndex(lines: number[]): number {
        const lowerBin = lines[0] | (lines[1] << 1) | (lines[2] << 2);
        const upperBin = lines[3] | (lines[4] << 1) | (lines[5] << 2);

        // 二进制(0-7) -> 八卦序号 (先天八卦序)
        // 000=坤(0), 001=震(1), 010=坎(2), 011=巽(3),
        // 100=艮(4), 101=离(5), 110=兑(6), 111=乾(7)
        // 但文王64卦用的是 (上卦, 下卦) -> 卦序 的查找表

        // 八卦对应: 乾=111(7), 兑=110(6), 离=101(5), 震=001(1),
        //          巽=011(3), 坎=010(2), 艮=100(4), 坤=000(0)
        // 排列顺序: 乾(7) 兑(6) 离(5) 震(1) 巽(3) 坎(2) 艮(4) 坤(0)
        // 对应索引:   0      1    2     3     4     5     6     7

        const trigramOrder = [7, 6, 5, 1, 3, 2, 4, 0]; // 乾兑离震巽坎艮坤 的二进制值

        const binToOrder: number[] = new Array(8);
        for (let i = 0; i < 8; i++) {
            binToOrder[trigramOrder[i]] = i;
        }

        const upperIdx = binToOrder[upperBin];
        const lowerIdx = binToOrder[lowerBin];

        // 文王64卦序查找表 [上卦][下卦] -> 卦序(0-63)
        // 行=上卦(乾兑离震巽坎艮坤), 列=下卦(乾兑离震巽坎艮坤)
        // 序号基于周易传统排序(0=乾, 1=坤, 2=屯...)
        const KING_WEN_TABLE: number[][] = [
            //       乾  兑  离  震  巽  坎  艮  坤
            /*乾*/ [ 0, 9, 12, 24, 43,  4, 25, 10],
            /*兑*/ [42, 57, 48, 16, 27, 46, 30, 18],
            /*离*/ [13, 48, 29, 20, 49, 63, 55, 35],
            /*震*/ [33, 53, 54, 50, 31, 39, 51, 15],
            /*巽*/ [ 8, 60, 36, 41, 56, 58, 52, 19],
            /*坎*/ [ 5, 46, 62,  2, 47, 28,  3,  7],
            /*艮*/ [25, 40, 21, 26, 17, 38, 51, 22],
            /*坤*/ [11, 44, 34, 23, 19,  6, 14,  1],
        ];

        return KING_WEN_TABLE[upperIdx][lowerIdx];
    }

    static isChangingLine(yao: number): boolean {
        return yao === YaoType.OLD_YIN || yao === YaoType.OLD_YANG;
    }

    static isYang(yao: number): boolean {
        return yao === YaoType.YOUNG_YANG || yao === YaoType.OLD_YANG;
    }

    static getYaoName(yaoValue: number): string {
        switch (yaoValue) {
            case YaoType.OLD_YIN: return '老阴';
            case YaoType.YOUNG_YANG: return '少阳';
            case YaoType.YOUNG_YIN: return '少阴';
            case YaoType.OLD_YANG: return '老阳';
            default: return '未知';
        }
    }

    static getPositionName(position: number, isYang: boolean): string {
        const yangNames = ['初九', '九二', '九三', '九四', '九五', '上九'];
        const yinNames = ['初六', '六二', '六三', '六四', '六五', '上六'];
        return isYang ? yangNames[position] : yinNames[position];
    }

    // 判断卦象整体吉凶倾向（仅基于动爻数量，不影响随机性）
    static getChangingNature(changingCount: number): string {
        if (changingCount === 0) return '静卦无变，守正待时';
        if (changingCount === 1) return '一爻独动，主意明确';
        if (changingCount === 2) return '二爻齐变，以上爻为主';
        if (changingCount === 3) return '三爻同变，观本变二卦';
        if (changingCount <= 5) return '多爻齐变，以变卦为主';
        return '六爻皆变，乾坤大转';
    }
}
