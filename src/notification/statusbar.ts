"use strict";

import * as vscode from "vscode";
import { UploadSatusChangedEventArgs, UploadStatus } from "./types";
import * as rx from "@reactivex/rxjs";


export class StatusBarItem extends vscode.Disposable {
    private statusbarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[];
    private subject: rx.Subject<string>;
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

        this.subject = new rx.Subject<string>();
        this.subject.subscribe(x => {
            this.statusbarItem.text = x;
        });
    }

    public subscribe(event: vscode.Event<UploadSatusChangedEventArgs>) {
        const disposable = event(e => {
            this.cancelTimerToClearNotification();
            switch (e.type) {
                case UploadStatus.Uploading:
                    this.subject.next("Uploading image...");
                    break;
                case UploadStatus.SuccessfullyUploaded:
                    this.subject.next("Image upload completed: " + e.url);
                    this.setTimerToClearNotification();
                    break;
                case UploadStatus.FailedToUpload:
                    this.subject.next("Failed to upload image");
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
            this.subject.next("");
            this._timer = undefined;
        }, 5000);
    }
}
