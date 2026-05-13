import { Node, Graphics, Color, Label, tween, Vec3, UIOpacity } from 'cc';
import { UIFactory } from './UIFactory';
import { HexagramGenerator, YaoType } from '../../divination/HexagramGenerator';
import { CyberEffects } from './CyberEffects';
import { MeritSystem } from '../../core/MeritSystem';

export class HexagramDisplay {
    private node: Node;
    private yaoNodes: Node[] = [];
    private lineWidth: number;
    private lineGap: number;

    constructor(parent: Node, x: number = 0, y: number = 0, scale: number = 1) {
        this.node = UIFactory.createNode('hexagramDisplay', parent);
        this.node.setPosition(x, y);
        this.lineWidth = 120 * scale;
        this.lineGap = 30 * scale;
    }

    displayHexagram(
        yaoLines: number[],
        changingLines: number[],
        animated: boolean = false,
        onComplete?: () => void
    ): void {
        this.clear();
        const rankColor = CyberEffects.getRankColor(MeritSystem.instance.getRankInfo().major);

        if (animated) {
            this.animateYaoLines(yaoLines, changingLines, rankColor, 0, onComplete);
        } else {
            for (let i = 0; i < 6; i++) {
                this.drawYaoLine(i, yaoLines[i], changingLines.includes(i), rankColor);
            }
            onComplete?.();
        }
    }

    private animateYaoLines(
        yaoLines: number[],
        changingLines: number[],
        color: Color,
        index: number,
        onComplete?: () => void
    ): void {
        if (index >= 6) {
            onComplete?.();
            return;
        }

        const yaoNode = this.drawYaoLine(index, yaoLines[index], changingLines.includes(index), color);

        let opacity = yaoNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity)
            .to(0.3, { opacity: 255 })
            .call(() => {
                this.animateYaoLines(yaoLines, changingLines, color, index + 1, onComplete);
            })
            .start();

        // 震动效果
        tween(yaoNode)
            .to(0.05, { position: new Vec3(yaoNode.position.x + 3, yaoNode.position.y, 0) })
            .to(0.05, { position: new Vec3(yaoNode.position.x - 3, yaoNode.position.y, 0) })
            .to(0.05, { position: new Vec3(yaoNode.position.x, yaoNode.position.y, 0) })
            .start();
    }

    private drawYaoLine(index: number, yaoValue: number, isChanging: boolean, baseColor: Color): Node {
        const yaoNode = UIFactory.createNode(`yao_${index}`, this.node);
        const g = yaoNode.addComponent(Graphics);
        const y = (index - 2.5) * this.lineGap;
        yaoNode.setPosition(0, y);

        const isYang = HexagramGenerator.isYang(yaoValue);
        const lineHeight = 6;
        const halfW = this.lineWidth / 2;
        const gapW = 8;

        let lineColor: Color;
        if (isChanging) {
            lineColor = new Color(255, 60, 80, 255); // 动爻红色
        } else {
            lineColor = baseColor;
        }

        g.strokeColor = lineColor;
        g.lineWidth = lineHeight;

        if (isYang) {
            // 阳爻：一整条线
            g.moveTo(-halfW, 0);
            g.lineTo(halfW, 0);
            g.stroke();
        } else {
            // 阴爻：中间断开
            g.moveTo(-halfW, 0);
            g.lineTo(-gapW, 0);
            g.stroke();
            g.moveTo(gapW, 0);
            g.lineTo(halfW, 0);
            g.stroke();
        }

        // 动爻闪烁
        if (isChanging) {
            let opacity = yaoNode.getComponent(UIOpacity) || yaoNode.addComponent(UIOpacity);
            tween(opacity)
                .repeatForever(
                    tween(opacity)
                        .to(0.5, { opacity: 150 })
                        .to(0.5, { opacity: 255 })
                )
                .start();
        }

        // 爻位名称标注
        const posName = HexagramGenerator.getPositionName(index, isYang);
        UIFactory.createLabel(
            yaoNode, posName, 14,
            new Color(lineColor.r, lineColor.g, lineColor.b, 180),
            'posName'
        ).node.setPosition(halfW + 40, 0);

        this.yaoNodes.push(yaoNode);
        return yaoNode;
    }

    clear(): void {
        for (const n of this.yaoNodes) {
            n.destroy();
        }
        this.yaoNodes = [];
    }

    getNode(): Node {
        return this.node;
    }

    // 创建本卦+变卦双显布局
    static createDualDisplay(
        parent: Node,
        originalLines: number[],
        changedLines: number[],
        yaoValues: number[],
        changingLines: number[],
        originalName: string,
        changedName: string,
        scale: number = 0.8
    ): { original: HexagramDisplay; changed: HexagramDisplay } {
        const container = UIFactory.createNode('dualHexagram', parent);

        // 本卦（左）
        const origDisplay = new HexagramDisplay(container, -130, 0, scale);
        const origYaoValues = yaoValues.map((v, i) => {
            if (changingLines.includes(i)) {
                return HexagramGenerator.isYang(v) ? YaoType.OLD_YANG : YaoType.OLD_YIN;
            }
            return v;
        });
        origDisplay.displayHexagram(origYaoValues, changingLines);
        UIFactory.createLabel(container, `本卦: ${originalName}`, 20,
            UIFactory.COLORS.NEON_CYAN, 'origTitle')
            .node.setPosition(-130, -120);

        // 变卦（右）
        const changedDisplay = new HexagramDisplay(container, 130, 0, scale);
        const changedYaoValues: number[] = [];
        for (let i = 0; i < 6; i++) {
            changedYaoValues.push(changedLines[i] === 1 ? YaoType.YOUNG_YANG : YaoType.YOUNG_YIN);
        }
        changedDisplay.displayHexagram(changedYaoValues, []);
        UIFactory.createLabel(container, `变卦: ${changedName}`, 20,
            UIFactory.COLORS.NEON_PURPLE, 'changedTitle')
            .node.setPosition(130, -120);

        // 中间箭头
        UIFactory.createLabel(container, '→', 30, UIFactory.COLORS.TEXT_SECONDARY, 'arrow')
            .node.setPosition(0, 0);

        return { original: origDisplay, changed: changedDisplay };
    }
}
