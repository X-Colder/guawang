import { AudioClip, AudioSource, Node, resources } from 'cc';

declare const wx: any;

export class AudioManager {
    private static _instance: AudioManager;
    private audioSource: AudioSource | null = null;
    private enabled: boolean = true;

    static get instance(): AudioManager {
        if (!this._instance) {
            this._instance = new AudioManager();
        }
        return this._instance;
    }

    init(node: Node): void {
        this.audioSource = node.addComponent(AudioSource);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    playShake(): void {
        this.playWxVibrate('medium');
    }

    playYaoLand(): void {
        this.playWxVibrate('light');
    }

    playMeritGain(): void {
        this.playWxVibrate('light');
    }

    playMeritLoss(): void {
        this.playWxVibrate('heavy');
    }

    playComplete(): void {
        this.playWxVibrate('medium');
    }

    private playWxVibrate(type: 'light' | 'medium' | 'heavy'): void {
        if (!this.enabled) return;
        if (typeof wx !== 'undefined') {
            if (type === 'light') {
                wx.vibrateShort?.({ type: 'light' });
            } else if (type === 'heavy') {
                wx.vibrateLong?.();
            } else {
                wx.vibrateShort?.({ type: 'medium' });
            }
        }
    }
}
