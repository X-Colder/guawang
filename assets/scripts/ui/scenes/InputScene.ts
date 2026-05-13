import { Node, Label, Graphics, Color, EditBox, tween, UIOpacity, Vec3 } from 'cc';
import { UIFactory } from '../components/UIFactory';
import { CyberEffects } from '../components/CyberEffects';
import { SceneManager, SceneName } from '../components/SceneManager';
import { ToastManager } from '../components/ToastManager';
import { GameManager } from '../../core/GameManager';
import { MeritSystem, MeritPenalties } from '../../core/MeritSystem';
import { EventManager, GameEvents } from '../../core/EventManager';
import { ContentValidator } from '../../divination/ContentValidator';
import { DuplicateDetector } from '../../divination/DuplicateDetector';
import { HexagramGenerator } from '../../divination/HexagramGenerator';

export class InputScene {
    private page: Node | null = null;
    private editBox: EditBox | null = null;
    private countdownLabel: Label | null = null;
    private countdownActive: boolean = false;
    private chaosClickCount: number = 0;
    private questionText: string = '';

    build(page: Node, w: number, h: number): void {
        this.page = page;

        // 背景
        const bg = page.addComponent(Graphics);
        bg.fillColor = new Color(5, 7, 15, 255);
        bg.rect(-w / 2, -h / 2, w, h);
        bg.fill();

        // 数据流
        CyberEffects.createDataStream(page, w, h);

        // 标题
        UIFactory.createLabel(page, '静心凝神', 36, UIFactory.COLORS.NEON_CYAN, 'title')
            .node.setPosition(0, h / 2 - 120);

        // 提示文案
        const hint1 = UIFactory.createLabel(
            page, '请凝神输入你今日想问之事', 22,
            UIFactory.COLORS.TEXT_PRIMARY, 'hint1'
        );
        hint1.node.setPosition(0, h / 2 - 180);

        const hint2 = UIFactory.createLabel(
            page, '一事一问，心诚则应；再三渎卦，有损功德', 16,
            UIFactory.COLORS.TEXT_SECONDARY, 'hint2'
        );
        hint2.node.setPosition(0, h / 2 - 215);

        // 三枚赛博铜钱装饰
        this.drawCyberCoins(page, 0, 60);

        // 输入框
        this.editBox = UIFactory.createEditBox(
            page, '输入你的问题...', w - 100, 50, 'questionInput'
        );
        this.editBox.node.setPosition(0, -80);

        // 起卦按钮
        UIFactory.createButton(page, '凝 神 起 卦', 240, 56, () => {
            this.onSubmit();
        }, {
            fontSize: 26,
            borderColor: UIFactory.COLORS.NEON_CYAN,
            name: 'btnSubmit',
        }).setPosition(0, -180);

        // 倒计时文字（初始隐藏）
        this.countdownLabel = UIFactory.createLabel(
            page, '', 60, UIFactory.COLORS.NEON_CYAN, 'countdown'
        );
        this.countdownLabel.node.setPosition(0, 0);
        this.countdownLabel.node.active = false;

        // 返回按钮
        UIFactory.createButton(page, '返回', 120, 40, () => {
            SceneManager.instance.goBack();
        }, {
            fontSize: 20,
            borderColor: UIFactory.COLORS.TEXT_SECONDARY,
            name: 'btnBack',
        }).setPosition(-w / 2 + 80, h / 2 - 50);

        // 监听页面激活
        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName) => {
            if (scene === SceneName.INPUT) {
                this.onPageEnter();
            }
        });
    }

    private onPageEnter(): void {
        this.chaosClickCount = 0;
        this.countdownActive = false;
        if (this.editBox) {
            this.editBox.string = '';
        }
        if (this.countdownLabel) {
            this.countdownLabel.node.active = false;
        }
    }

    private drawCyberCoins(parent: Node, x: number, y: number): void {
        const coinContainer = UIFactory.createNode('coins', parent);
        coinContainer.setPosition(x, y);

        for (let i = 0; i < 3; i++) {
            const coinNode = UIFactory.createNode(`coin_${i}`, coinContainer);
            const g = coinNode.addComponent(Graphics);
            const cx = (i - 1) * 60;
            coinNode.setPosition(cx, 0);

            // 外圈
            g.strokeColor = UIFactory.COLORS.NEON_CYAN;
            g.lineWidth = 2;
            g.circle(0, 0, 22);
            g.stroke();

            // 内方孔
            g.strokeColor = new Color(0, 200, 255, 150);
            g.lineWidth = 1.5;
            g.rect(-6, -6, 12, 12);
            g.stroke();

            // 慢速浮动动画
            tween(coinNode)
                .repeatForever(
                    tween(coinNode)
                        .to(2 + i * 0.5, { position: new Vec3(cx, 8, 0) })
                        .to(2 + i * 0.5, { position: new Vec3(cx, -8, 0) })
                )
                .start();
        }
    }

    private onSubmit(): void {
        if (this.countdownActive) {
            this.chaosClickCount++;
            if (this.chaosClickCount >= 3) {
                this.onChaosTap();
            }
            return;
        }

        const text = this.editBox?.string?.trim() || '';

        // 内容校验
        const validation = ContentValidator.validate(text);
        if (!validation.valid) {
            ToastManager.instance.showSystemTip(validation.reason!);
            if (ContentValidator.isJokeInput(text)) {
                MeritSystem.instance.deductMerit(
                    MeritPenalties.JOKE_INPUT.amount,
                    MeritPenalties.JOKE_INPUT.text
                );
            }
            return;
        }

        // 语义重复检测
        const keywords = DuplicateDetector.extractKeywords(text);
        const recentQuestions = GameManager.instance.getRecentQuestions(24);
        const dupCheck = DuplicateDetector.checkDuplicate(keywords, recentQuestions);

        if (dupCheck.isDuplicate) {
            if (dupCheck.count >= 3) {
                MeritSystem.instance.deductMerit(
                    MeritPenalties.DUPLICATE_3RD.amount,
                    MeritPenalties.DUPLICATE_3RD.text
                );
            } else {
                MeritSystem.instance.deductMerit(
                    MeritPenalties.DUPLICATE_2ND.amount,
                    MeritPenalties.DUPLICATE_2ND.text
                );
            }
            ToastManager.instance.showSystemTip('问题语义重复，判定为二次占卦');
        }

        // 检查是否超限
        const limit = MeritSystem.instance.getDailyLimit();
        if (limit !== -1) {
            const currentCount = GameManager.instance.dailyState.divinationCount;
            if (currentCount >= limit) {
                MeritSystem.instance.deductMerit(
                    MeritPenalties.OVER_LIMIT.amount,
                    MeritPenalties.OVER_LIMIT.text
                );
            }
        }

        // 记录问题
        GameManager.instance.addQuestionRecord(text, keywords);
        this.questionText = text;

        // 开始3秒静心倒计时
        this.startCountdown();
    }

    private startCountdown(): void {
        this.countdownActive = true;
        this.chaosClickCount = 0;

        if (this.countdownLabel) {
            this.countdownLabel.node.active = true;
        }

        let count = 3;
        const tick = () => {
            if (this.countdownLabel) {
                this.countdownLabel.string = `${count}`;
                this.countdownLabel.node.setScale(1.5, 1.5, 1);
                tween(this.countdownLabel.node)
                    .to(0.3, { scale: new Vec3(1, 1, 1) })
                    .start();
            }

            if (count <= 0) {
                this.countdownActive = false;
                if (this.countdownLabel) {
                    this.countdownLabel.string = '卦成';
                }
                // 进入摇卦页面
                setTimeout(() => {
                    SceneManager.instance.goTo(SceneName.SHAKE, {
                        question: this.questionText,
                        isChaos: false,
                    });
                }, 500);
                return;
            }

            count--;
            setTimeout(tick, 1000);
        };

        tick();
    }

    private onChaosTap(): void {
        this.countdownActive = false;
        ToastManager.instance.showSystemTip('心念杂乱，凝神失败，生成蒙乱之卦');
        MeritSystem.instance.deductMerit(
            MeritPenalties.JOKE_INPUT.amount,
            '心念杂乱，凝神失败，功德-20'
        );

        // 直接生成蒙卦（第4卦），跳转解读页
        setTimeout(() => {
            const result = HexagramGenerator.castHexagram();
            SceneManager.instance.goTo(SceneName.SHAKE, {
                question: this.questionText || '心念杂乱',
                isChaos: true,
                forcedResult: result,
            });
        }, 1000);
    }
}
