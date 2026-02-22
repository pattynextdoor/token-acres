// Message bridge for webview ↔ extension host communication

type MessageHandler = (data: any) => void;
type WebviewToHost = {
  type: string;
  [key: string]: any;
};

declare global {
  interface Window {
    vscodeApi: {
      postMessage: (message: any) => void;
      setState: (state: any) => void;
      getState: () => any;
    };
  }
}

class MessageBridgeClass {
  private handlers: Map<string, MessageHandler[]> = new Map();

  constructor() {
    window.addEventListener('message', (event) => {
      const msg = event.data;
      const callbacks = this.handlers.get(msg.type) || [];
      callbacks.forEach(cb => cb(msg.data || msg));
    });
  }

  /**
   * Register a handler for a message type from the extension host
   */
  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * Remove a handler for a message type
   */
  off(type: string, handler: MessageHandler) {
    const callbacks = this.handlers.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(handler);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Send a message to the extension host
   */
  send(message: WebviewToHost) {
    if (window.vscodeApi) {
      window.vscodeApi.postMessage(message);
    } else {
      console.warn('VS Code API not available, message not sent:', message);
    }
  }

  /**
   * Preserve webview state across visibility changes
   */
  getState() {
    return window.vscodeApi?.getState();
  }

  setState(state: any) {
    window.vscodeApi?.setState(state);
  }
}

export const MessageBridge = new MessageBridgeClass();