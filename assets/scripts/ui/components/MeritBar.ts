import { Node, Label, Graphics, Color, tween, UIOpacity, Vec3 } from 'cc';
import { UIFactory } from './UIFactory';
import { MeritSystem } from '../../core/MeritSystem';
import { EventManager, GameEvents } from '../../core/EventManager';
import { CyberEffects } from './CyberEffects';

export class MeritBar {
    private node: Node;
    private barNode: Node;
    private fillGraphics: Graphics | null = null;
    private meritLabel: Label | null = null;
    private barWidth: number;
    private barHeight: number;

    constructor(parent: Node, width: number = 300, height: number = 16) {
        this.barWidth = width;
        this.barHeight = height;
        this.node = UIFactory.createNode('meritBar', parent);
        this.barNode = UIFactory.createNode('bar', this.node);

        this.build();
        this.updateDisplay();

        EventManager.instance.on(GameEvents.MERIT_CHANGED, () => this.updateDisplay());
    }

    private build(): void {
        // 功德文字
        this.meritLabel = UIFactory.createLabel(
            this.node, '功德: 0',
            18, UIFactory.COLORS.NEON_CYAN, 'meritText'
        );
        this.meritLabel.node.setPosition(0, 20);

        // 背景条
        this.barNode.setPosition(0, 0);
        const bgG = this.barNode.addComponent(Graphics);
        bgG.fillColor = UIFactory.COLORS.MERIT_BAR_BG;
        bgG.roundRect(-this.barWidth / 2, -this.barHeight / 2, this.barWidth, this.barHeight, this.barHeight / 2);
        bgG.fill();

        // 填充条
        const fillNode = UIFactory.createNode('fill', this.barNode);
        this.fillGraphics = fillNode.addComponent(Graphics);
    }

    updateDisplay(): void {
        const merit = MeritSystem.instance.merit;
        const progress = MeritSystem.instance.getMeritProgress();
        const rank = MeritSystem.instance.getRankInfo();

        if (this.meritLabel) {
            this.meritLabel.string = `功德: ${merit}`;
        }

        if (this.fillGraphics) {
            this.fillGraphics.clear();
            const fillWidth = this.barWidth * Math.max(0, progress.progress);
            if (fillWidth > 0) {
                const color = CyberEffects.getRankColor(rank.major);
                this.fillGraphics.fillColor = color;
                this.fillGraphics.roundRect(
                    -this.barWidth / 2, -this.barHeight / 2,
                    fillWidth, this.barHeight, this.barHeight / 2
                );
                this.fillGraphics.fill();
            }
        }
    }

    getNode(): Node {
        return this.node;
    }
}

export class RankBadge {
    private node: Node;
    private titleLabel: Label | null = null;
    private borderGraphics: Graphics | null = null;

    constructor(parent: Node) {
        this.node = UIFactory.createNode('rankBadge', parent);
        this.build();
        this.updateDisplay();

        EventManager.instance.on(GameEvents.RANK_CHANGED, () => this.updateDisplay());
        EventManager.instance.on(GameEvents.MERIT_CHANGED, () => this.updateDisplay());
    }

    private build(): void {
        const width = 200;
        const height = 40;

        this.borderGraphics = this.node.addComponent(Graphics);
        this.titleLabel = UIFactory.createLabel(
            this.node, '', 20, UIFactory.COLORS.TEXT_PRIMARY, 'rankTitle'
        );
    }

    updateDisplay(): void {
        const rank = MeritSystem.instance.getRankInfo();
        const color = CyberEffects.getRankColor(rank.major);

        if (this.titleLabel) {
            this.titleLabel.string = rank.fullTitle;
            this.titleLabel.color = color;
        }

        if (this.borderGraphics) {
            const width = 200;
            const height = 36;
            this.borderGraphics.clear();
            this.borderGraphics.strokeColor = new Color(color.r, color.g, color.b, 150);
            this.borderGraphics.lineWidth = 1;
            this.borderGraphics.roundRect(-width / 2, -height / 2, width, height, 6);
            this.borderGraphics.stroke();
        }
    }

    getNode(): Node {
        return this.node;
    }
}
