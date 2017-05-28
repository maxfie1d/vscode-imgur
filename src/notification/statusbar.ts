"use strict";

import * as vscode from "vscode";
import { UploadSatusChangedEventArgs, UploadStatus } from "./types";


export class StatusBarItem extends vscode.Disposable {
    private statusbarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[];
    private _timer: NodeJS.Timer;

    constructor() {
        super(() => {
            this.disposables.forEach(x => x.dispose());
        });

        this.statusbarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusbarItem.text = "";
        this.statusbarItem.show();

        this.disposables = [];
        this.disposables.push(this.statusbarItem);
    }

    private updateText(s: string) {
        this.statusbarItem.text = s;
    }

    public subscribe(event: vscode.Event<UploadSatusChangedEventArgs>) {
        const disposable = event(e => {
            this.cancelTimerToClearNotification();
            switch (e.type) {
                case UploadStatus.Uploading:
                    this.updateText("Uploading image...");
                    break;
                case UploadStatus.SuccessfullyUploaded:
                    this.updateText("Image upload completed: " + e.url);
                    this.setTimerToClearNotification();
                    break;
                case UploadStatus.FailedToUpload:
                    this.updateText("Failed to upload image");
                    this.setTimerToClearNotification();
                    vscode.window.showErrorMessage("Failed to upload image to imgur: " + e.error);
                    break;
                default:
                    break;
            }
        });
        this.disposables.push(disposable);
    }

    private cancelTimerToClearNotification() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    }

    /**
     * 5秒後にステータスバーの通知を消すタイマーをセットします
     */
    private setTimerToClearNotification() {
        this._timer = setTimeout(() => {
            this.updateText("");
            this._timer = undefined;
        }, 5000);
    }
}
