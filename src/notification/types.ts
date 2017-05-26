"use strict";


export enum UploadStatus {
    Uploading,
    UploadComplete
}

export type UploadSatusChangedEventArgs = UploadingStateArgs | UploadCompleteStateArgs;

export interface UploadStatusChangedArgsBase {
    type: UploadStatus;
}

export interface UploadingStateArgs extends UploadStatusChangedArgsBase {
    type: UploadStatus.Uploading;
}

export interface UploadCompleteStateArgs extends UploadStatusChangedArgsBase {
    type: UploadStatus.UploadComplete;
    url: string;
}
