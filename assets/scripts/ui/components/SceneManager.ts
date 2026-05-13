import { Node, tween, UIOpacity, Tween } from 'cc';
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
    private _pageNodes: Map<SceneName, Node> = new Map();
    private _switching: boolean = false;

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
        if (this._switching) return;
        if (scene === this._currentScene) return;

        if (pushStack) {
            this._sceneStack.push(this._currentScene);
        }

        const oldNode = this._pageNodes.get(this._currentScene);
        const newNode = this._pageNodes.get(scene);

        if (data) {
            this._sceneData = data;
        }

        const previousScene = this._currentScene;
        this._currentScene = scene;

        // 直接切换，不用动画（避免 tween 在 inactive 节点上失效）
        if (oldNode && oldNode !== newNode) {
            Tween.stopAllByTarget(oldNode);
            oldNode.active = false;
        }

        if (newNode) {
            Tween.stopAllByTarget(newNode);
            newNode.active = true;
        }

        // 先切换完毕，再发事件（确保页面已 active）
        EventManager.instance.emit(GameEvents.SCENE_CHANGE, scene, data);
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
