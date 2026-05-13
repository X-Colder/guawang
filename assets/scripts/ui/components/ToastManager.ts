import { Node, Label, Color, Graphics, UITransform, tween, UIOpacity, Vec3 } from 'cc';
import { UIFactory } from './UIFactory';
import { EventManager, GameEvents } from '../../core/EventManager';

interface ToastConfig {
    text: string;
    color?: Color;
    duration?: number;
}

export class ToastManager {
    private static _instance: ToastManager;
    private container: Node | null = null;
    private queue: ToastConfig[] = [];
    private showing: boolean = false;

    static get instance(): ToastManager {
        if (!this._instance) {
            this._instance = new ToastManager();
        }
        return this._instance;
    }

    init(parent: Node): void {
        this.container = UIFactory.createNode('toastContainer', parent);
        this.container.setPosition(0, 100);

        EventManager.instance.on(GameEvents.TOAST_SHOW, (text: string, color?: Color) => {
            this.show({ text, color });
        });
    }

    show(config: ToastConfig): void {
        this.queue.push(config);
        if (!this.showing) {
            this.showNext();
        }
    }

    showMeritChange(amount: number, text: string): void {
        const color = amount > 0 ? UIFactory.COLORS.NEON_GREEN : UIFactory.COLORS.NEON_RED;
        this.show({ text, color, duration: 2.5 });
    }

    showSystemTip(text: string): void {
        this.show({ text, color: UIFactory.COLORS.NEON_CYAN, duration: 2 });
    }

    private showNext(): void {
        if (this.queue.length === 0 || !this.container) {
            this.showing = false;
            return;
        }

        this.showing = true;
        const config = this.queue.shift()!;
        const duration = config.duration || 2;
        const color = config.color || UIFactory.COLORS.TEXT_PRIMARY;

        const { node: panel } = UIFactory.createPanel(
            this.container, 500, 70,
            new Color(10, 15, 30, 230), 'toast'
        );

        const borderNode = UIFactory.createNode('border', panel);
        const borderG = borderNode.addComponent(Graphics);
        borderG.strokeColor = new Color(color.r, color.g, color.b, 120);
        borderG.lineWidth = 1;
        borderG.roundRect(-250, -35, 500, 70, 8);
        borderG.stroke();

        const label = UIFactory.createLabel(panel, config.text, 22, color, 'toastText');
        label.overflow = Label.Overflow.SHRINK;
        label.node.getComponent(UITransform)!.setContentSize(480, 50);

        panel.setPosition(0, -40);
        let opacity = panel.addComponent(UIOpacity);
        opacity.opacity = 0;

        tween(panel).to(0.3, { position: new Vec3(0, 0, 0) }).start();
        tween(opacity)
            .to(0.3, { opacity: 255 })
            .delay(duration)
            .to(0.3, { opacity: 0 })
            .call(() => {
                panel.destroy();
                this.showNext();
            })
            .start();
    }
}
