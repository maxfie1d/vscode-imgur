## vscode-imgur

![Demo](http://i.imgur.com/jPm7V6t.gif)


## Quick Start

1. Install `vscode-imgur` extension
1. Configure your imgur credential info
1. That's it!

Let me explain in detail bellow.

### Install the extension
Launch Visual Studio Code Quick Open (Ctrl+P), paste the following command, and press enter.

```
ext install vscode-imgur
```

### Configuration
Open vscode settings by pressing <kbd>Ctrl</kbd> + <kbd>,</kbd> (Windows) or <kbd>⌘,</kbd> (macOS),
and add your imgur `client_id` like this. 

```json
{
    "vscode-imgur.client_id": "<your client_id here>",
}
```

You can get a `client_id` by [creating an application](https://api.imgur.com/oauth2/addclient) on imgur.

### Paste to upload your image on clipboard
Set the cursor to the position where you want to insert the image url, and press
<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>V</kbd> (Windows), or <kbd>⌘⌥V</kbd> (macOS).


## Upload mode

### Anonymous upload
If you want anonymous upload, give your `client_id`, and be sure `preferUserUpload` is `false`.
`settings.json` would be as below.

```json
{
    "vscode-imgur.client_id": "<your client_id here>",
    "vscode-imgur.preferUserUpload": false
}
```

### User upload
If you want to upload image belonging to your imgur account, 
give your `client_id`, `client_secret`, and be sure `preferUserUpload` is `true`.
`settings.json` would be as below.

```json
{
    "vscode-imgur.client_id": "<your client_id here>",
    "vscode-imgur.client_secret": "<your client_secret here>",
    "vscode-imgur.preferUserUpload": true
}
```

## Author
[Maxfield Walker](https://github.com/MaxfieldWalker)

## License
MIT
