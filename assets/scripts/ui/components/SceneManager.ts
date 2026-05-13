import { Node, director, tween, UIOpacity } from 'cc';
import { EventManager, GameEvents } from '../../core/EventManager';

export enum SceneName {
    MAIN = 'MainScene',
    INPUT = 'InputScene',
    SHAKE = 'ShakeScene',
    READING = 'ReadingScene',
    ALMANAC = 'AlmanacScene',
    MEDITATE = 'MeditateScene',
    HISTORY = 'HistoryScene',
}

export interface SceneData {
    [key: string]: any;
}

export class SceneManager {
    private static _instance: SceneManager;
    private _currentScene: SceneName = SceneName.MAIN;
    private _sceneData: SceneData = {};
    private _sceneStack: SceneName[] = [];

    // 所有scene组件注册在这里，由 MainScene 统一管理页面切换
    private _pageNodes: Map<SceneName, Node> = new Map();
    private _activePageNode: Node | null = null;

    static get instance(): SceneManager {
        if (!this._instance) {
            this._instance = new SceneManager();
        }
        return this._instance;
    }

    get currentScene(): SceneName {
        return this._currentScene;
    }

    get sceneData(): SceneData {
        return this._sceneData;
    }

    registerPage(name: SceneName, node: Node): void {
        this._pageNodes.set(name, node);
        node.active = (name === this._currentScene);
    }

    goTo(scene: SceneName, data?: SceneData, pushStack: boolean = true): void {
        if (pushStack && this._currentScene !== scene) {
            this._sceneStack.push(this._currentScene);
        }

        const oldNode = this._pageNodes.get(this._currentScene);
        const newNode = this._pageNodes.get(scene);

        if (data) {
            this._sceneData = data;
        }

        this._currentScene = scene;
        EventManager.instance.emit(GameEvents.SCENE_CHANGE, scene, data);

        // 简单的淡入淡出切换
        if (oldNode && oldNode !== newNode) {
            let oldOpacity = oldNode.getComponent(UIOpacity);
            if (!oldOpacity) oldOpacity = oldNode.addComponent(UIOpacity);
            tween(oldOpacity).to(0.15, { opacity: 0 }).call(() => {
                oldNode.active = false;
                oldOpacity!.opacity = 255;
            }).start();
        }

        if (newNode) {
            newNode.active = true;
            let newOpacity = newNode.getComponent(UIOpacity);
            if (!newOpacity) newOpacity = newNode.addComponent(UIOpacity);
            newOpacity.opacity = 0;
            tween(newOpacity).delay(0.1).to(0.2, { opacity: 255 }).start();
        }
    }

    goBack(data?: SceneData): void {
        if (this._sceneStack.length > 0) {
            const prev = this._sceneStack.pop()!;
            this.goTo(prev, data, false);
        } else {
            this.goTo(SceneName.MAIN, data, false);
        }
    }

    clearStack(): void {
        this._sceneStack = [];
    }
}
