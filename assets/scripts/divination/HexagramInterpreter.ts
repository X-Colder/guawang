import { MeritSystem } from '../core/MeritSystem';

export interface InterpretationResult {
    layers: InterpretationLayer[];
    isBlurred: boolean;
    changingLineNotes: string[];
    ancientText?: string; // 古文注解（高段位可见）
}

export interface InterpretationLayer {
    title: string;
    content: string;
    locked: boolean;
}

export class HexagramInterpreter {

    static interpret(
        hexagramData: {
            name: string;
            guaCi: string;
            layer1_overview: string;
            layer2_detail: string;
            layer3_advice: string;
            nature: string;
            yao: { position: string; original: string; explanation: string }[];
        },
        changingLines: number[],
        changedHexagramData?: {
            name: string;
            layer1_overview: string;
        }
    ): InterpretationResult {
        const readingLayers = MeritSystem.instance.getReadingLayers();
        const isBlurred = MeritSystem.instance.isReadingBlurred();
        const majorRank = MeritSystem.instance.getRankInfo().major;

        const layers: InterpretationLayer[] = [];

        // 第一层：卦象大势（所有人可见）
        let layer1Content = hexagramData.layer1_overview;
        if (isBlurred) {
            layer1Content = this.blurText(layer1Content);
        }
        layers.push({
            title: '卦象大势',
            content: layer1Content,
            locked: false,
        });

        // 第二层：动爻机微（需 >= 静道修士）
        let layer2Content = hexagramData.layer2_detail;
        if (changingLines.length > 0 && changedHexagramData) {
            layer2Content += `\n变化之象由「${hexagramData.name}」转「${changedHexagramData.name}」，${changedHexagramData.layer1_overview}`;
        }
        layers.push({
            title: '动爻机微',
            content: readingLayers >= 2 ? layer2Content : '',
            locked: readingLayers < 2,
        });

        // 第三层：易道建议（需 >= 观爻真人）
        layers.push({
            title: '易道建议',
            content: readingLayers >= 3 ? hexagramData.layer3_advice : '',
            locked: readingLayers < 3,
        });

        // 动爻注解
        const changingLineNotes: string[] = [];
        for (const lineIdx of changingLines) {
            if (lineIdx >= 0 && lineIdx < hexagramData.yao.length) {
                const yao = hexagramData.yao[lineIdx];
                changingLineNotes.push(`${yao.position}：${yao.original}\n${yao.explanation}`);
            }
        }

        // 古文注解（需 >= 演卦灵尊，majorRank >= 3）
        let ancientText: string | undefined;
        if (majorRank >= 3) {
            ancientText = `【卦辞】${hexagramData.guaCi}`;
        }

        return {
            layers,
            isBlurred,
            changingLineNotes,
            ancientText,
        };
    }

    private static blurText(text: string): string {
        const chars = text.split('');
        const blurCount = Math.floor(chars.length * 0.4);
        const indices = new Set<number>();
        while (indices.size < blurCount) {
            indices.add(Math.floor(Math.random() * chars.length));
        }
        return chars.map((c, i) => indices.has(i) ? '█' : c).join('');
    }

    static isBadHexagram(nature: string): boolean {
        return nature.includes('凶');
    }
}
