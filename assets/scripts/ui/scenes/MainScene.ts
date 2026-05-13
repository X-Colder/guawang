import {
    _decorator, Component, Node, Canvas, UITransform, Color, Graphics, view, Vec3, Widget,
} from 'cc';
import { UIFactory } from '../components/UIFactory';
import { CyberEffects } from '../components/CyberEffects';
import { CyberRenderer } from '../components/CyberRenderer';
import { RankThemeManager } from '../components/RankThemeManager';
import { SceneManager, SceneName } from '../components/SceneManager';
import { MeritBar, RankBadge } from '../components/MeritBar';
import { ToastManager } from '../components/ToastManager';
import { GameManager } from '../../core/GameManager';
import { MeritSystem, MeritReasons, MeritPenalties } from '../../core/MeritSystem';
import { EventManager, GameEvents } from '../../core/EventManager';
import { AudioManager } from '../../core/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('MainScene')
export class MainScene extends Component {

    private rootUI: Node | null = null;
    private meritBar: MeritBar | null = null;
    private rankBadge: RankBadge | null = null;

    start() {
        GameManager.instance.init();
        AudioManager.instance.init(this.node);

        const canvas = this.node.getComponent(Canvas);
        if (!canvas) {
            this.node.addComponent(Canvas);
        }

        this.buildUI();
    }

    private buildUI(): void {
        const screenSize = UIFactory.getScreenSize();
        const w = screenSize.width;
        const h = screenSize.height;

        // 根节点
        this.rootUI = UIFactory.createNode('rootUI', this.node);
        UIFactory.setWidgetFull(this.rootUI);

        // 初始化Toast管理器
        ToastManager.instance.init(this.rootUI);

        // 监听功德变化弹窗
        EventManager.instance.on(GameEvents.MERIT_CHANGED, (merit: number, delta: number, reason: string) => {
            ToastManager.instance.showMeritChange(delta, reason);
        });

        // 创建所有页面容器
        this.buildMainPage(w, h);
        this.buildInputPage(w, h);
        this.buildShakePage(w, h);
        this.buildReadingPage(w, h);
        this.buildAlmanacPage(w, h);
        this.buildMeditatePage(w, h);
        this.buildHistoryPage(w, h);
    }

    private buildMainPage(w: number, h: number): void {
        const page = UIFactory.createNode('mainPage', this.rootUI!);
        const ut = page.getComponent(UITransform)!;
        ut.setContentSize(w, h);

        const rank = MeritSystem.instance.getRankInfo();
        const theme = RankThemeManager.instance.getThemeByRank(rank);

        // 主题化背景（含星空/数据流/粒子/扫描线）
        RankThemeManager.instance.renderBackground(page, w, h, theme);

        // 顶部状态栏
        const topBar = UIFactory.createNode('topBar', page);
        topBar.setPosition(0, h / 2 - 80);

        // 功德条（左上）
        this.meritBar = new MeritBar(topBar, 250, 14);
        this.meritBar.getNode().setPosition(-w / 4, 0);

        // 段位铭牌（右上）
        this.rankBadge = new RankBadge(topBar);
        this.rankBadge.getNode().setPosition(w / 4, 0);

        // 中央主题化八卦法阵
        const { node: baguaNode, startRotation } = RankThemeManager.instance.renderBaguaArray(page, theme);
        baguaNode.setPosition(0, 60);
        startRotation();

        // 标题（使用段位主色调）
        UIFactory.createLabel(page, '卦  王', 42, theme.primaryColor, 'title')
            .node.setPosition(0, h / 2 - 150);

        const slogan = UIFactory.createLabel(
            page, '以硅基演天道，以爻象定机缘', 16,
            UIFactory.COLORS.TEXT_SECONDARY, 'slogan'
        );
        slogan.node.setPosition(0, h / 2 - 185);

        // 功能按钮区（使用 CyberRenderer 风格按钮）
        const btnAreaY = -h / 4 + 40;
        const btnW = 280;
        const btnH = 60;
        const btnGap = 80;

        UIFactory.createButton(page, '起 卦 演 爻', btnW, btnH, () => {
            this.onStartDivination();
        }, {
            fontSize: 28,
            borderColor: theme.primaryColor,
            name: 'btnDivine',
        }).setPosition(0, btnAreaY);

        UIFactory.createButton(page, '卦 象 图 鉴', btnW, btnH, () => {
            SceneManager.instance.goTo(SceneName.ALMANAC);
        }, {
            fontSize: 24,
            borderColor: theme.secondaryColor,
            name: 'btnAlmanac',
        }).setPosition(0, btnAreaY - btnGap);

        UIFactory.createButton(page, '静 坐 悟 道', btnW, btnH, () => {
            SceneManager.instance.goTo(SceneName.MEDITATE);
        }, {
            fontSize: 24,
            borderColor: theme.accentColor,
            name: 'btnMeditate',
        }).setPosition(0, btnAreaY - btnGap * 2);

        UIFactory.createButton(page, '卦 录 复 盘', btnW, btnH, () => {
            SceneManager.instance.goTo(SceneName.HISTORY);
        }, {
            fontSize: 24,
            borderColor: UIFactory.COLORS.NEON_GOLD,
            name: 'btnHistory',
        }).setPosition(0, btnAreaY - btnGap * 3);

        // 注册页面
        SceneManager.instance.registerPage(SceneName.MAIN, page);
    }

    private onStartDivination(): void {
        const check = GameManager.instance.canDivine();
        if (!check.allowed) {
            ToastManager.instance.showSystemTip(check.reason!);
            return;
        }
        SceneManager.instance.goTo(SceneName.INPUT);
    }

    private buildInputPage(w: number, h: number): void {
        const page = UIFactory.createNode('inputPage', this.rootUI!);
        page.getComponent(UITransform)!.setContentSize(w, h);
        page.active = false;

        // InputScene 会在这个节点上构建UI
        const { InputScene } = require('./InputScene');
        const inputScene = new InputScene();
        inputScene.build(page, w, h);

        SceneManager.instance.registerPage(SceneName.INPUT, page);
    }

    private buildShakePage(w: number, h: number): void {
        const page = UIFactory.createNode('shakePage', this.rootUI!);
        page.getComponent(UITransform)!.setContentSize(w, h);
        page.active = false;

        const { ShakeScene } = require('./ShakeScene');
        const shakeScene = new ShakeScene();
        shakeScene.build(page, w, h);

        SceneManager.instance.registerPage(SceneName.SHAKE, page);
    }

    private buildReadingPage(w: number, h: number): void {
        const page = UIFactory.createNode('readingPage', this.rootUI!);
        page.getComponent(UITransform)!.setContentSize(w, h);
        page.active = false;

        const { ReadingScene } = require('./ReadingScene');
        const readingScene = new ReadingScene();
        readingScene.build(page, w, h);

        SceneManager.instance.registerPage(SceneName.READING, page);
    }

    private buildAlmanacPage(w: number, h: number): void {
        const page = UIFactory.createNode('almanacPage', this.rootUI!);
        page.getComponent(UITransform)!.setContentSize(w, h);
        page.active = false;

        const { AlmanacScene } = require('./AlmanacScene');
        const almanacScene = new AlmanacScene();
        almanacScene.build(page, w, h);

        SceneManager.instance.registerPage(SceneName.ALMANAC, page);
    }

    private buildMeditatePage(w: number, h: number): void {
        const page = UIFactory.createNode('meditatePage', this.rootUI!);
        page.getComponent(UITransform)!.setContentSize(w, h);
        page.active = false;

        const { MeditateScene } = require('./MeditateScene');
        const meditateScene = new MeditateScene();
        meditateScene.build(page, w, h);

        SceneManager.instance.registerPage(SceneName.MEDITATE, page);
    }

    private buildHistoryPage(w: number, h: number): void {
        const page = UIFactory.createNode('historyPage', this.rootUI!);
        page.getComponent(UITransform)!.setContentSize(w, h);
        page.active = false;

        const { HistoryScene } = require('./HistoryScene');
        const historyScene = new HistoryScene();
        historyScene.build(page, w, h);

        SceneManager.instance.registerPage(SceneName.HISTORY, page);
    }
}
