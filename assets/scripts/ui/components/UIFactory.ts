import {
    Node, Label, Sprite, Color, UITransform, Vec3, Size, UIOpacity,
    Button, Graphics, tween, Widget, Layout, ScrollView, Mask,
    EditBox, SpriteFrame, director, view, screen,
} from 'cc';

export class UIFactory {

    static readonly COLORS = {
        BG_DARK: new Color(8, 10, 18, 255),         // 深空暗黑底
        PANEL_BG: new Color(15, 20, 35, 200),        // 面板半透明暗蓝
        NEON_CYAN: new Color(0, 230, 255, 255),       // 青蓝霓虹
        NEON_PURPLE: new Color(160, 80, 255, 255),     // 紫色霓虹
        NEON_GOLD: new Color(255, 200, 60, 255),       // 金色
        NEON_RED: new Color(255, 60, 80, 255),         // 红色警告
        NEON_GREEN: new Color(60, 255, 140, 255),      // 绿色正面
        TEXT_PRIMARY: new Color(220, 230, 255, 255),   // 主文字（淡蓝白）
        TEXT_SECONDARY: new Color(140, 160, 200, 255), // 副文字
        TEXT_DIM: new Color(80, 90, 120, 255),         // 暗淡文字
        MERIT_BAR_BG: new Color(30, 35, 50, 255),     // 功德条背景
        BORDER_GLOW: new Color(0, 180, 255, 120),     // 边框发光
        TRANSPARENT: new Color(0, 0, 0, 0),
    };

    static readonly DESIGN_WIDTH = 720;
    static readonly DESIGN_HEIGHT = 1280;

    static getScreenSize(): Size {
        const vs = view.getVisibleSize();
        return new Size(vs.width, vs.height);
    }

    static createNode(name: string, parent?: Node): Node {
        const node = new Node(name);
        node.addComponent(UITransform);
        if (parent) parent.addChild(node);
        return node;
    }

    static createLabel(
        parent: Node,
        text: string,
        fontSize: number = 28,
        color: Color = UIFactory.COLORS.TEXT_PRIMARY,
        name: string = 'label'
    ): Label {
        const node = this.createNode(name, parent);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize * 1.4;
        label.color = color;
        label.overflow = Label.Overflow.NONE;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        return label;
    }

    static createPanel(
        parent: Node,
        width: number,
        height: number,
        bgColor: Color = UIFactory.COLORS.PANEL_BG,
        name: string = 'panel'
    ): { node: Node; bg: Graphics } {
        const node = this.createNode(name, parent);
        const ut = node.getComponent(UITransform)!;
        ut.setContentSize(width, height);

        const bg = node.addComponent(Graphics);
        this.drawRoundedRect(bg, width, height, 12, bgColor);

        return { node, bg };
    }

    static drawRoundedRect(
        g: Graphics,
        width: number,
        height: number,
        radius: number,
        fillColor: Color,
        borderColor?: Color,
        borderWidth: number = 2
    ): void {
        g.clear();
        g.fillColor = fillColor;
        if (borderColor) {
            g.strokeColor = borderColor;
            g.lineWidth = borderWidth;
        }
        g.roundRect(-width / 2, -height / 2, width, height, radius);
        g.fill();
        if (borderColor) g.stroke();
    }

    static createButton(
        parent: Node,
        text: string,
        width: number,
        height: number,
        callback: () => void,
        options: {
            fontSize?: number;
            textColor?: Color;
            bgColor?: Color;
            borderColor?: Color;
            name?: string;
        } = {}
    ): Node {
        const name = options.name || 'btn';
        const node = this.createNode(name, parent);
        const ut = node.getComponent(UITransform)!;
        ut.setContentSize(width, height);

        const bg = node.addComponent(Graphics);
        this.drawRoundedRect(
            bg, width, height, 8,
            options.bgColor || new Color(20, 30, 60, 220),
            options.borderColor || UIFactory.COLORS.NEON_CYAN,
            1.5
        );

        const btn = node.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        btn.zoomScale = 0.95;
        btn.node.on(Button.EventType.CLICK, callback);

        const label = this.createLabel(
            node, text,
            options.fontSize || 26,
            options.textColor || UIFactory.COLORS.NEON_CYAN,
            'btnLabel'
        );

        return node;
    }

    static createEditBox(
        parent: Node,
        placeholder: string,
        width: number,
        height: number,
        name: string = 'editBox'
    ): EditBox {
        const node = this.createNode(name, parent);
        const ut = node.getComponent(UITransform)!;
        ut.setContentSize(width, height);

        const bg = node.addComponent(Graphics);
        this.drawRoundedRect(
            bg, width, height, 8,
            new Color(10, 15, 30, 200),
            UIFactory.COLORS.NEON_CYAN,
            1
        );

        const editBox = node.addComponent(EditBox);
        editBox.placeholder = placeholder;
        editBox.maxLength = 100;
        editBox.inputMode = EditBox.InputMode.SINGLE_LINE;

        // EditBox 需要关联 Label 节点
        const textLabel = this.createLabel(node, '', 24, UIFactory.COLORS.TEXT_PRIMARY, 'text');
        const placeholderLabel = this.createLabel(
            node, placeholder, 22, UIFactory.COLORS.TEXT_DIM, 'placeholder'
        );

        editBox.textLabel = textLabel;
        editBox.placeholderLabel = placeholderLabel;

        return editBox;
    }

    static createScrollView(
        parent: Node,
        width: number,
        height: number,
        name: string = 'scrollView'
    ): { scrollView: ScrollView; content: Node } {
        const svNode = this.createNode(name, parent);
        const svUT = svNode.getComponent(UITransform)!;
        svUT.setContentSize(width, height);

        // Mask 节点
        const maskNode = this.createNode('mask', svNode);
        const maskUT = maskNode.getComponent(UITransform)!;
        maskUT.setContentSize(width, height);
        maskNode.addComponent(Mask);

        // Content 节点
        const contentNode = this.createNode('content', maskNode);
        const contentUT = contentNode.getComponent(UITransform)!;
        contentUT.setContentSize(width, height);
        contentUT.setAnchorPoint(0.5, 1);
        contentNode.setPosition(0, height / 2);

        const layout = contentNode.addComponent(Layout);
        layout.type = Layout.Type.VERTICAL;
        layout.spacingY = 10;
        layout.paddingTop = 10;
        layout.paddingBottom = 10;
        layout.resizeMode = Layout.ResizeMode.CONTAINER;

        const sv = svNode.addComponent(ScrollView);
        sv.content = contentNode;
        sv.vertical = true;
        sv.horizontal = false;
        sv.bounceDuration = 0.3;

        return { scrollView: sv, content: contentNode };
    }

    static createProgressBar(
        parent: Node,
        width: number,
        height: number,
        progress: number = 0,
        bgColor: Color = UIFactory.COLORS.MERIT_BAR_BG,
        fillColor: Color = UIFactory.COLORS.NEON_CYAN,
        name: string = 'progressBar'
    ): { node: Node; fill: Graphics; setProgress: (p: number) => void } {
        const node = this.createNode(name, parent);
        const ut = node.getComponent(UITransform)!;
        ut.setContentSize(width, height);

        const bgGraphics = node.addComponent(Graphics);
        this.drawRoundedRect(bgGraphics, width, height, height / 2, bgColor);

        const fillNode = this.createNode('fill', node);
        const fillUT = fillNode.getComponent(UITransform)!;
        fillUT.setContentSize(width * progress, height);
        fillUT.setAnchorPoint(0, 0.5);
        fillNode.setPosition(-width / 2, 0);

        const fillGraphics = fillNode.addComponent(Graphics);

        const setProgress = (p: number) => {
            const clamped = Math.max(0, Math.min(1, p));
            const fw = width * clamped;
            fillUT.setContentSize(fw, height);
            fillGraphics.clear();
            if (fw > 0) {
                fillGraphics.fillColor = fillColor;
                fillGraphics.roundRect(0, -height / 2, fw, height, height / 2);
                fillGraphics.fill();
            }
        };
        setProgress(progress);

        return { node, fill: fillGraphics, setProgress };
    }

    static fadeIn(node: Node, duration: number = 0.3): void {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) opacity = node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(duration, { opacity: 255 }).start();
    }

    static fadeOut(node: Node, duration: number = 0.3, onComplete?: () => void): void {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) opacity = node.addComponent(UIOpacity);
        tween(opacity).to(duration, { opacity: 0 }).call(() => {
            onComplete?.();
        }).start();
    }

    static pulseGlow(node: Node, color: Color, duration: number = 1.5): void {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) opacity = node.addComponent(UIOpacity);
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(duration / 2, { opacity: 180 })
                    .to(duration / 2, { opacity: 255 })
            )
            .start();
    }

    static setWidgetFull(node: Node): void {
        let widget = node.getComponent(Widget);
        if (!widget) widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
    }
}
