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
Open vscode settings by pressing <kbd>Ctrl</kbd> + <kbd>,</kbd> (Windows) or <kbd>⌘</kbd> + <kbd>,</kbd> (macOS),
and add your imgur `client_id` like this. 

```json
{
    "vscode-imgur.client_id": "<your client_id here>",
}
```

You can get a client_id by [creating an application](https://api.imgur.com/oauth2/addclient) on imgur.


## Author
[Maxfield Walker](https://github.com/MaxfieldWalker)

## License
MIT
