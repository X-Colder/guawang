import { Node, Label, Graphics, Color, tween, Vec3, UIOpacity } from 'cc';
import { UIFactory } from '../components/UIFactory';
import { CyberEffects } from '../components/CyberEffects';
import { HexagramDisplay } from '../components/HexagramDisplay';
import { SceneManager, SceneName, SceneData } from '../components/SceneManager';
import { EventManager, GameEvents } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { MeritSystem, MeritReasons } from '../../core/MeritSystem';
import { HexagramGenerator, DivinationResult } from '../../divination/HexagramGenerator';

export class ShakeScene {
    private page: Node | null = null;
    private hexagramDisplay: HexagramDisplay | null = null;
    private coinNodes: Node[] = [];
    private resultData: DivinationResult | null = null;
    private contentNode: Node | null = null;

    build(page: Node, w: number, h: number): void {
        this.page = page;

        // 背景
        const bg = page.addComponent(Graphics);
        bg.fillColor = new Color(5, 5, 15, 255);
        bg.rect(-w / 2, -h / 2, w, h);
        bg.fill();

        // 内容容器
        this.contentNode = UIFactory.createNode('content', page);

        // 监听场景切换
        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName, data?: SceneData) => {
            if (scene === SceneName.SHAKE) {
                this.onPageEnter(w, h, data);
            }
        });
    }

    private onPageEnter(w: number, h: number, data?: SceneData): void {
        // 清理旧内容
        if (this.contentNode) {
            this.contentNode.destroyAllChildren();
        }
        this.coinNodes = [];

        const question = data?.question || '';
        const isChaos = data?.isChaos || false;
        const forcedResult = data?.forcedResult as DivinationResult | undefined;

        // 标题
        UIFactory.createLabel(this.contentNode!, '摇卦成象', 32, UIFactory.COLORS.NEON_CYAN, 'title')
            .node.setPosition(0, h / 2 - 100);

        UIFactory.createLabel(this.contentNode!, `所问: ${question}`, 18,
            UIFactory.COLORS.TEXT_SECONDARY, 'question')
            .node.setPosition(0, h / 2 - 145);

        // 铜钱动画区
        const coinArea = UIFactory.createNode('coinArea', this.contentNode!);
        coinArea.setPosition(0, 120);
        this.createAnimatedCoins(coinArea);

        // 六爻显示区
        this.hexagramDisplay = new HexagramDisplay(this.contentNode!, 0, -60, 1);

        // 开始摇卦
        if (forcedResult) {
            this.resultData = forcedResult;
        } else {
            this.resultData = HexagramGenerator.castHexagram();
        }

        // 逐爻动画
        this.animateCoinToss(0, w, h);
    }

    private createAnimatedCoins(parent: Node): void {
        for (let i = 0; i < 3; i++) {
            const coinNode = UIFactory.createNode(`animCoin_${i}`, parent);
            const g = coinNode.addComponent(Graphics);
            coinNode.setPosition((i - 1) * 70, 0);

            // 赛博铜钱
            g.strokeColor = UIFactory.COLORS.NEON_CYAN;
            g.lineWidth = 2.5;
            g.circle(0, 0, 28);
            g.stroke();

            g.strokeColor = new Color(0, 200, 255, 180);
            g.lineWidth = 1.5;
            g.rect(-8, -8, 16, 16);
            g.stroke();

            // 霓虹光轨
            g.strokeColor = new Color(0, 255, 255, 40);
            g.lineWidth = 6;
            g.circle(0, 0, 32);
            g.stroke();

            this.coinNodes.push(coinNode);
        }
    }

    private animateCoinToss(yaoIndex: number, w: number, h: number): void {
        if (!this.resultData || yaoIndex >= 6) {
            this.onShakeComplete(w, h);
            return;
        }

        // 铜钱翻转动画
        for (const coin of this.coinNodes) {
            tween(coin)
                .to(0.1, { scale: new Vec3(1, 0.1, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .to(0.1, { scale: new Vec3(1, 0.1, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .to(0.1, { scale: new Vec3(1, 0.1, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }

        // 0.8秒后显示该爻结果
        setTimeout(() => {
            const yaoValue = this.resultData!.yaoLines[yaoIndex];
            const isChanging = this.resultData!.changingLines.includes(yaoIndex);

            // 在六爻显示区画这一爻
            if (this.hexagramDisplay) {
                this.hexagramDisplay.displayHexagram(
                    this.resultData!.yaoLines.slice(0, yaoIndex + 1),
                    this.resultData!.changingLines.filter(c => c <= yaoIndex),
                    false
                );
            }

            // 爻名提示
            const yaoName = HexagramGenerator.getYaoName(yaoValue);
            const posName = HexagramGenerator.getPositionName(yaoIndex, HexagramGenerator.isYang(yaoValue));
            const tipLabel = UIFactory.createLabel(
                this.contentNode!, `${posName} · ${yaoName}`,
                16, isChanging ? UIFactory.COLORS.NEON_RED : UIFactory.COLORS.TEXT_SECONDARY,
                `yaoTip_${yaoIndex}`
            );
            tipLabel.node.setPosition(200, -60 + (yaoIndex - 2.5) * 30);
            UIFactory.fadeIn(tipLabel.node, 0.3);

            // 下一爻
            setTimeout(() => {
                this.animateCoinToss(yaoIndex + 1, w, h);
            }, 400);
        }, 800);
    }

    private onShakeComplete(w: number, h: number): void {
        if (!this.resultData) return;

        // 卦成提示
        const completeLabel = UIFactory.createLabel(
            this.contentNode!, '六爻落定，卦象已成', 26,
            UIFactory.COLORS.NEON_GOLD, 'complete'
        );
        completeLabel.node.setPosition(0, -250);
        UIFactory.fadeIn(completeLabel.node, 0.5);

        // 记录占卦
        const record = {
            id: GameManager.instance.generateRecordId(),
            question: SceneManager.instance.sceneData.question || '',
            timestamp: Date.now(),
            originalHexagram: this.resultData.originalIndex,
            changedHexagram: this.resultData.changedIndex,
            yaoLines: this.resultData.yaoLines,
            changingLines: this.resultData.changingLines,
            reviewed: false,
        };
        GameManager.instance.recordDivination(record);

        // 随缘无求功德（非重复问题时给予）
        MeritSystem.instance.addMerit(
            MeritReasons.RANDOM_DIVINE.amount,
            MeritReasons.RANDOM_DIVINE.text
        );

        // 2秒后自动跳转解读页
        setTimeout(() => {
            SceneManager.instance.goTo(SceneName.READING, {
                result: this.resultData,
                question: record.question,
                recordId: record.id,
            });
        }, 2000);
    }
}
