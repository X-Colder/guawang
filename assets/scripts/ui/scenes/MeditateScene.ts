import { Node, Label, Graphics, Color, tween, Vec3, UIOpacity } from 'cc';
import { UIFactory } from '../components/UIFactory';
import { CyberEffects } from '../components/CyberEffects';
import { SceneManager, SceneName } from '../components/SceneManager';
import { ToastManager } from '../components/ToastManager';
import { EventManager, GameEvents } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { MeritSystem, MeritReasons } from '../../core/MeritSystem';

export class MeditateScene {
    private page: Node | null = null;
    private contentNode: Node | null = null;

    build(page: Node, w: number, h: number): void {
        this.page = page;
        this.contentNode = UIFactory.createNode('content', page);

        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName) => {
            if (scene === SceneName.MEDITATE) {
                this.onPageEnter(w, h);
            }
        });
    }

    private onPageEnter(w: number, h: number): void {
        if (this.contentNode) {
            this.contentNode.destroyAllChildren();
        }

        // 背景
        const bg = this.contentNode!.addComponent(Graphics);
        bg.fillColor = new Color(3, 3, 10, 255);
        bg.rect(-w / 2, -h / 2, w, h);
        bg.fill();

        // 检查今日是否已悟道
        if (!GameManager.instance.canMeditate()) {
            UIFactory.createLabel(this.contentNode!, '今日已悟道，明日再来静修', 24,
                UIFactory.COLORS.TEXT_SECONDARY, 'done')
                .node.setPosition(0, 50);

            UIFactory.createButton(this.contentNode!, '返回', 160, 44, () => {
                SceneManager.instance.goBack();
            }, {
                fontSize: 20,
                borderColor: UIFactory.COLORS.TEXT_SECONDARY,
                name: 'btnBack',
            }).setPosition(0, -50);
            return;
        }

        // 标题
        UIFactory.createLabel(this.contentNode!, '静坐悟道', 36,
            UIFactory.COLORS.NEON_CYAN, 'title')
            .node.setPosition(0, h / 4);

        UIFactory.createLabel(this.contentNode!, '心若止水，道自显现', 18,
            UIFactory.COLORS.TEXT_SECONDARY, 'subtitle')
            .node.setPosition(0, h / 4 - 45);

        // 中央静止八卦
        const { node: baguaNode } = CyberEffects.createBaguaArray(this.contentNode!, 100);
        baguaNode.setPosition(0, 0);

        // 柔和流光
        let opacity = baguaNode.getComponent(UIOpacity) || baguaNode.addComponent(UIOpacity);
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(2, { opacity: 160 })
                    .to(2, { opacity: 255 })
            )
            .start();

        // 倒计时提示
        const timerLabel = UIFactory.createLabel(this.contentNode!, '静心中... 3', 22,
            UIFactory.COLORS.TEXT_PRIMARY, 'timer');
        timerLabel.node.setPosition(0, -h / 4);

        // 3秒自动完成
        let count = 3;
        const tick = () => {
            timerLabel.string = count > 0 ? `静心中... ${count}` : '悟道完成';

            if (count <= 0) {
                this.onMeditateComplete();
                return;
            }
            count--;
            setTimeout(tick, 1000);
        };
        setTimeout(tick, 1000);
    }

    private onMeditateComplete(): void {
        GameManager.instance.markMeditated();
        MeritSystem.instance.addMerit(
            MeritReasons.MEDITATE.amount,
            MeritReasons.MEDITATE.text
        );

        // 1.5秒后自动返回首页
        setTimeout(() => {
            SceneManager.instance.goBack();
        }, 1500);
    }
}
