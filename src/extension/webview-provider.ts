import * as vscode from 'vscode';
import { FarmEngine } from './farm-engine';
import { FarmState, HostToWebview, WebviewToHost } from './types';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class TokenAcresWebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private context: vscode.ExtensionContext,
    private farmEngine: FarmEngine
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(this.context.extensionUri, 'assets'),
      ],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Listen for messages from webview
    webviewView.webview.onDidReceiveMessage((message: WebviewToHost) => {
      this.handleWebviewMessage(message);
    });

    // Handle webview becoming visible/hidden
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendUpdate(this.farmEngine.getState());
      }
    });
  }

  private handleWebviewMessage(message: WebviewToHost) {
    switch (message.type) {
      case 'ready':
        this.sendUpdate(this.farmEngine.getState());
        break;
        
      case 'player-move':
        this.farmEngine.updatePlayerPosition(message.position);
        break;
        
      case 'inspect':
        const info = this.farmEngine.inspect(message.target);
        if (info) {
          this.sendMessage({ type: 'inspect-result', data: info });
        }
        break;
        
      case 'plant':
        const planted = this.farmEngine.plantCrop(
          message.plot.x, 
          message.plot.y, 
          message.cropType
        );
        if (planted) {
          this.sendUpdate(this.farmEngine.getState());
        }
        break;
        
      case 'sell':
        // TODO: Implement sell functionality
        break;
        
      case 'buy-upgrade':
        // TODO: Implement upgrade system
        break;
        
      case 'rename-pawn':
        // TODO: Implement pawn renaming
        break;
        
      case 'map-change':
        // TODO: Implement multi-map system
        break;
    }
  }

  sendUpdate(state: FarmState) {
    this.sendMessage({ type: 'state-update', data: state });
  }

  sendMessage(message: HostToWebview) {
    if (this.view && this.view.visible) {
      this.view.webview.postMessage(message);
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.js')
    );
    
    const assetsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'assets')
    );
    
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
    content="default-src 'none';
             img-src ${webview.cspSource} data: blob:;
             script-src 'nonce-${nonce}' 'unsafe-eval';
             style-src ${webview.cspSource} 'unsafe-inline';
             connect-src ${webview.cspSource} blob:;">
  <title>Token Acres Farm</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #1a1a2e;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    #game-container {
      width: 100%;
      height: 100vh;
      position: relative;
    }
    
    canvas {
      display: block;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
    
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 18px;
      text-align: center;
    }
    
    .loading::after {
      content: '...';
      animation: dots 1.5s steps(3, end) infinite;
    }
    
    @keyframes dots {
      0%, 20% { content: ''; }
      40% { content: '.'; }
      60% { content: '..'; }
      80%, 100% { content: '...'; }
    }
  </style>
</head>
<body>
  <div id="game-container">
    <div class="loading" id="loading">Loading Token Acres</div>
  </div>
  <script nonce="${nonce}">
    // Pass VS Code API to the game
    window.vscodeApi = acquireVsCodeApi();
    window.assetsBasePath = '${assetsUri}';
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Focus the webview (bring to front)
   */
  focus() {
    this.view?.show(true);
  }

  /**
   * Check if webview is currently visible
   */
  isVisible(): boolean {
    return this.view?.visible ?? false;
  }
}