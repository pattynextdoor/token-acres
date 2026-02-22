import * as vscode from 'vscode';
import { AgentTracker } from './agent-tracker';
import { FarmEngine } from './farm-engine';
import { PersistenceManager } from './persistence';
import { TokenAcresWebviewProvider } from './webview-provider';
import { StatusBarManager } from './status-bar';

let farmEngine: FarmEngine;
let agentTracker: AgentTracker;
let webviewProvider: TokenAcresWebviewProvider;
let statusBar: StatusBarManager;
let persistence: PersistenceManager;

export function activate(context: vscode.ExtensionContext) {
  console.log('Token Acres extension activated');

  // Initialize managers
  persistence = new PersistenceManager(context);
  const farmState = persistence.load();
  farmEngine = new FarmEngine(farmState);
  agentTracker = new AgentTracker();
  webviewProvider = new TokenAcresWebviewProvider(context, farmEngine);
  statusBar = new StatusBarManager();

  // Register webview view
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'tokenacres.farmView',
      webviewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );

  // Agent tracking events
  agentTracker.onAgentStarted((agent) => {
    console.log('Agent started:', agent.processName);
    const pawn = farmEngine.spawnPawn(agent);
    webviewProvider.sendUpdate(farmEngine.getState());
    statusBar.update(farmEngine.getState());
  });

  agentTracker.onAgentCompleted((agent, result) => {
    console.log('Agent completed:', agent.processName, 'Success:', result.success);
    const taskResult = farmEngine.completeTask(agent, result);
    webviewProvider.sendUpdate(farmEngine.getState());
    persistence.save(farmEngine.getState());
    statusBar.update(farmEngine.getState());

    // Show notification for significant achievements
    if (taskResult.grade === 'S') {
      vscode.window.showInformationMessage(
        `🌟 Perfect work! Your pawn earned ${taskResult.actionsEarned} farm actions!`
      );
    } else if (taskResult.seedsEarned > 0) {
      vscode.window.showInformationMessage(
        `🌱 Harvest complete! Earned ${taskResult.seedsEarned} seeds`
      );
    }
  });

  // Git events for bonus farm actions
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (gitExtension?.isActive) {
    const gitApi = gitExtension.exports.getAPI(1);
    if (gitApi) {
      gitApi.repositories.forEach((repo: any) => {
        repo.state.onDidChange(() => {
          // Simple git bonus - any state change gives 1 farm action
          farmEngine.onGitEvent(repo);
          webviewProvider.sendUpdate(farmEngine.getState());
          persistence.save(farmEngine.getState());
        });
      });
    }
  }

  // Farm engine events
  farmEngine.on('season-changed', (data) => {
    webviewProvider.sendMessage({ type: 'season-change', data });
    vscode.window.showInformationMessage(
      `🌿 Season changed to ${data.season}! Some crops may have wilted.`
    );
  });

  farmEngine.on('crops-harvested', (data) => {
    webviewProvider.sendMessage({ 
      type: 'event', 
      data: { 
        type: 'harvest', 
        message: `Harvested ${data.plots.length} crops for ${data.seedsEarned} seeds!`,
        timestamp: Date.now()
      }
    });
  });

  // Periodic season check and auto-save
  const periodicUpdate = setInterval(() => {
    farmEngine.updateSeason();
    persistence.save(farmEngine.getState());
    statusBar.update(farmEngine.getState());
  }, 60_000); // every minute

  context.subscriptions.push({
    dispose: () => clearInterval(periodicUpdate)
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tokenacres.openFarm', () => {
      vscode.commands.executeCommand('tokenacres.farmView.focus');
      webviewProvider.focus();
    }),

    vscode.commands.registerCommand('tokenacres.manualComplete', () => {
      agentTracker.manualComplete('medium');
      vscode.window.showInformationMessage('Manual task completed!');
    }),

    vscode.commands.registerCommand('tokenacres.exportFarm', async () => {
      const farmData = persistence.export();
      const uri = await vscode.window.showSaveDialog({
        filters: { 'Token Acres Save': ['json'] },
        defaultUri: vscode.Uri.file('token-acres-save.json')
      });
      
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(farmData, 'utf8'));
        vscode.window.showInformationMessage('Farm exported successfully!');
      }
    }),

    vscode.commands.registerCommand('tokenacres.importFarm', async () => {
      const uris = await vscode.window.showOpenDialog({
        filters: { 'Token Acres Save': ['json'] },
        canSelectMany: false
      });
      
      if (uris && uris[0]) {
        try {
          const data = await vscode.workspace.fs.readFile(uris[0]);
          const farmData = data.toString();
          const newState = persistence.import(farmData);
          
          // Reinitialize farm engine with new state
          farmEngine = new FarmEngine(newState);
          webviewProvider = new TokenAcresWebviewProvider(context, farmEngine);
          webviewProvider.sendUpdate(farmEngine.getState());
          statusBar.update(farmEngine.getState());
          
          vscode.window.showInformationMessage('Farm imported successfully!');
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to import farm: ${error}`);
        }
      }
    })
  );

  // Configuration change handling
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('tokenacres')) {
        // Reload agent patterns if they changed
        agentTracker = new AgentTracker();
        console.log('Token Acres configuration updated');
      }
    })
  );

  // Update initial UI state
  statusBar.update(farmEngine.getState());

  // Welcome message for new users
  if (!persistence.hasSave()) {
    vscode.window.showInformationMessage(
      'Welcome to Token Acres! Your AI coding agents will now tend a pixel farm. Start coding to see them work!',
      'Open Farm'
    ).then(selection => {
      if (selection === 'Open Farm') {
        vscode.commands.executeCommand('tokenacres.openFarm');
      }
    });
  }

  console.log('Token Acres extension fully activated');
}

export function deactivate() {
  console.log('Token Acres extension deactivated');
  
  // Cleanup
  agentTracker?.cleanup();
  statusBar?.dispose();
  
  // Final save
  if (persistence && farmEngine) {
    persistence.save(farmEngine.getState());
  }
}