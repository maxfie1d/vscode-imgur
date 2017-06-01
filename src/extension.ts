"use strict";

import * as vscode from "vscode";
import * as path from "path";
import { spawn } from "child_process";
import { Client } from "@maxfield/imgur";
import * as fs from "fs";
import { UploadSatusChangedEventArgs, UploadStatus } from "./notification/types";
import { StatusBarItem } from "./notification/statusbar";

let eventEmitter: vscode.EventEmitter<UploadSatusChangedEventArgs>;
let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    // コマンドを登録
    context.subscriptions.push(vscode.commands.registerCommand("vscode-imgur.pasteImage", () => {
        paste(context.storagePath);
    }));
    extensionContext = context;

    eventEmitter = new vscode.EventEmitter<UploadSatusChangedEventArgs>();
    context.subscriptions.push(eventEmitter);
    const statusbarItem = new StatusBarItem();
    statusbarItem.subscribe(eventEmitter.event);
}

async function createClient(): Promise<Client | undefined> {
    const client_id = vscode.workspace.getConfiguration("vscode-imgur").get<string>("client_id");
    const preferUserUpload = vscode.workspace.getConfiguration("vscode-imgur").get<boolean>("preferUserUpload");
    if (preferUserUpload) {
        // ユーザーアップロードの場合
        // access_tokenはあるか?
        const access_token = extensionContext.globalState.get("access_token", "");
        if (access_token) {
            return new Client({
                client_id,
                access_token
            });
        } else {
            return await recoverFromAccessTokenUnavailable();
        }
    } else {
        // 匿名アップロードの場合
        if (client_id) {
            return new Client({
                client_id
            });
        } else {
            vscode.window.showInformationMessage("client_id is required to upload a image to imgur.");
            return undefined;
        }
    }

    /**
     * refresh_tokenがある場合はrefresh_tokenからaccess_tokenを取得します
     * refresh_tokenがない場合は認証ページを開いて認証し、access_tokenを取得します
     */
    async function recoverFromAccessTokenUnavailable(): Promise<Client> {
        const client_secret = vscode.workspace.getConfiguration("vscode-imgur").get<string>("client_secret");
        const refresh_token = extensionContext.globalState.get("refresh_token", "");
        if (refresh_token) {
            // refresh_tokenからaccess_tokenの取得を試みる
            const client = new Client({
                client_id,
                client_secret
            });
            try {
                // refresh_tokenからaccess_tokenを生成できた場合
                // 自動的にClientに設定される
                await client.Authorize.regenerateFromRefreshToken(refresh_token);
                return client;
            } catch (error) {
                // refresh_tokenからaccess_tokenを生成できなかったので、
                // refresh_tokenを削除する
                extensionContext.globalState.update("refresh_token", undefined);
                vscode.window.showErrorMessage("Failed to generate a access_token by refresh_token.");
                return undefined;
            }
        } else {
            // access_tokenもrefresh_tokenもない
            // 初回認証にはclient_idとclient_secretが必要
            if (client_id && client_secret) {
                const client = new Client({
                    client_id,
                    client_secret
                });
                const auth = client.Authorize.byPIN();
                // authorize用のURLをブラウザで開く
                await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(auth.url));
                // PINコードを入力してもらう
                const pin = await vscode.window.showInputBox({ placeHolder: "PIN code here", ignoreFocusOut: true });
                try {
                    const credential = await auth.authorize(pin);
                    // access_tokenとrefresh_tokenを設定に保存する
                    extensionContext.globalState.update("access_token", credential.access_token);
                    extensionContext.globalState.update("refresh_token", credential.refresh_token);
                } catch (error) {
                    vscode.window.showErrorMessage("Failed to authorize. Please try again.");
                    return undefined;
                }
                return client;
            } else {
                vscode.window.showInformationMessage("client_id is required to upload a image to imgur.");
                return undefined;
            }
        }
    }
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

        eventEmitter.fire({
            type: UploadStatus.Uploading
        });

        // ダミーURLを挿入する前にダミーURLの場所を保持しておく
        const dummyUrlStartPosition = editor.selection.start;
        const dummyUrlEndPosition = dummyUrlStartPosition.translate(0, markdownPlaceholder.length);
        // ダミーURLを挿入
        editor.edit(edit => {
            // プレースホルダーを挿入する
            edit.insert(editor.selection.start, markdownPlaceholder);
        });

        // imgurのクライアントを作る
        const client = await createClient();
        if (!client) {
            return;
        }

        // 画像をBase64形式にエンコードする
        const imageAsBase64 = fs.readFileSync(imagePath, "base64");
        // 一時的に保存された画像をimgurにアップロードする
        client.Image.upload(imageAsBase64).then(result => {
            const imageUrl = result.data.link;
            editor.edit(edit => {
                // プレースホルダーと実際の画像のURLを入れ替える
                edit.replace(new vscode.Range(dummyUrlStartPosition, dummyUrlEndPosition), `![Image](${imageUrl})`);
            });
            eventEmitter.fire({
                type: UploadStatus.SuccessfullyUploaded,
                url: imageUrl
            });
        }).catch(err => {
            // アップロードに失敗した場合
            const preferUserUpload = vscode.workspace.getConfiguration("vscode-imgur").get<boolean>("preferUserUpload");
            if (err.status == 403 && preferUserUpload) {
                // access_tokenが無効か期限切れなので削除する
                // 403エラー: 認証情報に誤りがあるなどのエラー (https://api.imgur.com/errorhandling#403)
                extensionContext.globalState.update("access_token", undefined);
            }

            // プレースホルダーを削除する
            editor.edit(edit => {
                edit.delete(new vscode.Range(dummyUrlStartPosition, dummyUrlEndPosition));
            });
            eventEmitter.fire({
                type: UploadStatus.FailedToUpload,
                error: err.toString()
            });
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


const markdownPlaceholder = "![uploading...](http://i.imgur.com/uploading.png)";
