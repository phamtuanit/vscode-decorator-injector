import * as vscode from 'vscode';
import { Position, Range } from 'vscode';
import { VueTemplateInjection } from './template-injection';
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "Vue Injector" is now active!');
	const templateInjector = new VueTemplateInjection();

	context.subscriptions.push(vscode.commands.registerCommand('injector.injectTemplate', () => {
		templateInjector.injectVueTemplate();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('injector.removeInjectionMark', () => {
		templateInjector.removeInjectionMark();
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
