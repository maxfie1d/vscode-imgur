"use strict";

import { Credential } from "./types";
import * as vscode from "vscode";

export function buildCredential(): Credential {
    const credetial: Credential = {
        client_id: vscode.workspace.getConfiguration("vscode-imgur").get<string>("client_id"),
        client_secret: vscode.workspace.getConfiguration("vscode-imgur").get<string>("client_secret"),
        access_token: vscode.workspace.getConfiguration("vscode-imgur").get<string>("access_token"),
    };

    return credetial;
}
