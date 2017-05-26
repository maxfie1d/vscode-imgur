"use strict";


export enum UploadStatus {
    Uploading,
    SuccessfullyUploaded,
    FailedToUpload,
}

export type UploadSatusChangedEventArgs = UploadingStateArgs | SuccessfullyUploadedStateArgs | FailedToUploadStateArgs;

export interface UploadStatusChangedArgsBase {
    type: UploadStatus;
}

export interface UploadingStateArgs extends UploadStatusChangedArgsBase {
    type: UploadStatus.Uploading;
}

export interface SuccessfullyUploadedStateArgs extends UploadStatusChangedArgsBase {
    type: UploadStatus.SuccessfullyUploaded;
    url: string;
}

export interface FailedToUploadStateArgs extends UploadStatusChangedArgsBase {
    type: UploadStatus.FailedToUpload;
    error: string;
}
