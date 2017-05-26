"use strict";

import * as vscode from "vscode";
import * as path from "path";
import { spawn } from "child_process";
import { Client } from "@rmp135/imgur";
import * as fs from "fs";
import { UploadSatusChangedEventArgs, UploadStatus } from "./notification/types";
import { StatusBarItem } from "./notification/statusbar";

let eventEmitter: vscode.EventEmitter<UploadSatusChangedEventArgs>;

export function activate(context: vscode.ExtensionContext) {
    // コマンドを登録
    context.subscriptions.push(vscode.commands.registerCommand("vscode-imgur.pasteImage", () => {
        paste(context.storagePath);
    }));

    eventEmitter = new vscode.EventEmitter<UploadSatusChangedEventArgs>();
    context.subscriptions.push(eventEmitter);
    const statusbarItem = new StatusBarItem();
    statusbarItem.subscribe(eventEmitter.event);
}


function paste(storagePath: string) {
    // アクティブなテキストエディタがあるか?
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // テキストエディタで開いているファイルのURIを取得する
    const fileUri = editor.document.uri;
    if (!fileUri) return;

    // 保存される前のファイルならば何もしない
    if (fileUri.scheme === "untitled") {
        vscode.window.showInformationMessage(
            "You need to save file first to paste a image");
        return;
    }

    const imageName = "image.png";
    const imageSaveDir = path.join(storagePath, "..");
    const imagePath = path.join(imageSaveDir, imageName);

    // クリップボードにある画像をimagePathに保存する
    saveClipboardImageToFileAndGetPath(imagePath, async (imagePath) => {
        if (!imagePath) return;
        // クリップボードにコピーされているものが画像でなければ，
        // 各スクリプトは"no image"を返す
        if (imagePath === "no image") {
            vscode.window.showInformationMessage("Copied object is not a image.");
            return;
        }

        // imgurのクライアントを作る
        const client = new Client(credential);
        // 画像をBase64形式にエンコードする
        const imageAsBase64 = fs.readFileSync(imagePath, "base64");
        // 一時的に保存された画像をimgurにアップロードする

        eventEmitter.fire({
            type: UploadStatus.Uploading
        });

        client.Image.upload(imageAsBase64).then(result => {
            editor.edit(edit => {
                // アップロード画像のURLをテキストエディタに追加する
                const imageUrl = result.data.link;
                edit.insert(editor.selection.start, imageUrl);
                eventEmitter.fire({
                    type: UploadStatus.UploadComplete,
                    url: imageUrl
                });
            });
        }).catch(err => {
            console.log(err);
        });
    });
}

/**
 * use applescript to save image from clipboard and get file path
 * 各OSに合わせたスクリプトを実行して，クリップボードにある画像を保存する
 */
function saveClipboardImageToFileAndGetPath(imagePath, callback: (imagePath: string) => void) {
    if (!imagePath) return;

    const platform = process.platform;
    const scriptPath = path.join(__dirname, "../../res", getScriptName());
    switch (process.platform) {
        case "win32":
            // 子プロセスでPowerShellを起動し，クリップボードの画像を保存する
            // スクリプトを実行する
            const powershell = spawn("powershell", [
                "-noprofile",
                "-noninteractive",
                "-nologo",
                "-sta",
                "-executionpolicy", "unrestricted",
                "-windowstyle", "hidden",
                "-file",
                scriptPath, // PS1スクリプトのパス
                imagePath   // スクリプトに渡す引数(画像の保存パス)
            ]);
            powershell.on("exit", function (code, signal) {
                // console.log('exit', code, signal);
            });
            powershell.stdout.on("data", function (data: Buffer) {
                callback(data.toString().trim());
            });
            break;
        case "darwin":
            // Apple Scriptを実行
            const appleScript = spawn("osascript", [scriptPath, imagePath]);
            appleScript.on("exit", function (code, signal) {
                // console.log('exit',code,signal);
            });

            appleScript.stdout.on("data", function (data: Buffer) {
                callback(data.toString().trim());
            });
            break;
        default:
            // シェルスクリプトを実行する
            const shellScript = spawn("sh", [scriptPath, imagePath]);
            shellScript.on("exit", function (code, signal) {
                // console.log('exit',code,signal);
            });

            shellScript.stdout.on("data", function (data: Buffer) {
                const result = data.toString().trim();
                // Linuxではxclipをインストールする必要がある
                if (result == "no xclip") {
                    vscode.window.showInformationMessage("You need to install xclip command first.");
                    return;
                }
                callback(result);
            });
    }

    function getScriptName(): string {
        const script = {
            "win32": "pc.ps1",
            "darwin": "mac.applescript"
        };
        return script[process.platform] || "linux.sh";
    }
}


export function deactivate() {

}


const credential = {
    access_token: "e4ccbe673427426b0f22efa96a10f91fd32e4c24",
    client_id: "d30588a5b736fa8",
    client_secret: "3942aacc9003724fc517e5c732ab5c23fe804166"
};
