import * as vscode from 'vscode';
import { Position, Range, TextEditor, TextEditorDecorationType } from 'vscode';

export class VueTemplateInjection {
    private conf: any;
    private validDecorationType: TextEditorDecorationType | undefined = undefined;
    private invalidDecorationType: TextEditorDecorationType | undefined = undefined;
    private markRegEx: RegExp | undefined = undefined;
    private defaultMark: string = "";
    private mode: boolean = true;
    private defaultParamName: string = "template";
    private injectionPosition: { range: vscode.Range; data: any; }[] = [];

    constructor() {
        this.conf = vscode.workspace.getConfiguration();
        if (!this.conf) {
            return;
        }

        let validDecoration = this.conf.get('injectionMark.decoration.valid');
        let invalidDecoration = this.conf.get('injectionMark.decoration.invalid');
        if (validDecoration && invalidDecoration) {
            try {
                this.validDecorationType = vscode.window.createTextEditorDecorationType(JSON.parse(validDecoration));
                this.invalidDecorationType = vscode.window.createTextEditorDecorationType(JSON.parse(invalidDecoration));
            } catch (error) {
                vscode.window.showErrorMessage('Cannot pare decoration style.', error);
            }
        }

        this.defaultParamName = this.conf.get('injectionMark.defaultParamName').trim();
        this.mode = this.conf.get('injectionMark.detectMode') && this.conf.get('injectionMark.detectMode') == "safe" ? true : false;
        this.markRegEx = new RegExp(`${this.conf.get('injectionMark.regex')}`, 'g');
        this.defaultMark = this.conf.get('injectionMark.defaultMark')
            .replace("{$1}", this.defaultParamName);
    }

    // Inject Vue template
    private injectTemplate() {
        if (this.injectionPosition.length <= 0) {
            // Display a message box to the user
            vscode.window.showInformationMessage('Vue Template Injector has finished.');
            return;
        }
        const item = this.injectionPosition.pop();
        if (item != undefined) {
            try {
                vscode.workspace.openTextDocument(item.data.filePath).then((htmlDocument) => {
                    // Get the active text editor
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        return;
                    }

                    const lineMargin = " ".repeat(item.range.start.character + 2);

                    try {
                        let text = htmlDocument.getText().trim();
                        // Add margin
                        text = text.replace(/\n/g, "\n" + lineMargin);

                        editor.edit(editBuilder => {
                            editBuilder.replace(item.range, ` \`${text.trim()}\`;`);
                        }).then(() => {
                            // Next
                            setTimeout(() => this.injectTemplate(), 0);
                        });
                    } catch (error) {
                        console.error(error);
                    }
                });
            } catch (error) {
                console.error(error);
                setTimeout(() => this.injectTemplate(), 0);
            }
        }
    }

    private getHtmlFilePath(dataInfo: any) {
        if (this.mode && vscode.window.activeTextEditor) {
            let document = vscode.window.activeTextEditor.document;
            let jsFilePath = document.uri.path;
            return jsFilePath.replace('.js', '.html');
        } else {
            let rootDir = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ?
                         vscode.workspace.workspaceFolders[0].uri.path : "d:/";
            return rootDir + dataInfo.location;
        }
    }

    // Inject Vue template and Decoration
    public injectVueTemplate() {
        this.injectionPosition = [];

        // Get the active text editor
        const editor = vscode.window.activeTextEditor;

        if (this.markRegEx && editor) {
            const document = editor.document;
            if (document.languageId != "javascript") {
                return;
            }

            const injectionValidDecorations: vscode.DecorationOptions[] = [];
            const injectionInvalidDecorations: vscode.DecorationOptions[] = [];
            const documentStr = document.getText();

            let match;
            while (match = this.markRegEx.exec(documentStr)) {
                let isValidInjection = false;

                // Get matching line
                const textLine = document.lineAt(document.positionAt(match.index).line);
                const originalText = textLine.text;
                const foundLine = textLine.range.start.line;
                const injectionDataStartPos = document.positionAt(match.index);

                // Find end position of decoration
                let injectionDataEndCol = originalText.lastIndexOf('}');
                if (injectionDataEndCol <= (injectionDataStartPos.character + this.markRegEx.source.length)) {
                    injectionDataEndCol = textLine.range.end.character;
                } else {
                    injectionDataEndCol++;
                }

                // Make decoration
                const decoration = {
                    range: new vscode.Range(injectionDataStartPos, new Position(foundLine, injectionDataEndCol)),
                    hoverMessage: "Something went wrong with your configuration"
                };
                const dataIndex = originalText.indexOf('=') + 1;

                if (!this.mode && dataIndex >= originalText.length || (originalText.length - dataIndex) <= 13) { // 13: [{location: ""}]
                    decoration.hoverMessage = `Information must NOT be EMPTY. Ex: ${this.defaultMark}`;
                } else {
                    const dataStr = !this.mode ? originalText.substring(dataIndex, injectionDataEndCol)
                                                : `{paramName:"${this.defaultParamName}"}`;
                    let dataInfo: any;
                    try {
                        dataInfo = eval(`(${dataStr})`);
                        if (!this.mode && !dataInfo.location) {
                            decoration.hoverMessage = `This definition is invalid. Ex: ${this.defaultMark}`;
                        } else {
                            dataInfo.filePath = this.getHtmlFilePath(dataInfo);
                            const templateVar = dataInfo.paramName || this.defaultParamName;
                            let currentLine = foundLine;
                            let replaceStartLine: number = -1;
                            let replaceStartPos: number = -1;
                            let replaceEndPos: number = -1;

                            // Find replace range
                            while ((currentLine + 1) < document.lineCount && replaceEndPos < 0) {
                                currentLine++;
                                let lineText = document.lineAt(currentLine).text;
                                if (replaceStartPos < 0) {
                                    let varPos = lineText.lastIndexOf(templateVar);
                                    if (varPos > 3) { // 4: let / var
                                        let templateAssignPos = lineText.lastIndexOf('=');
                                        if (templateAssignPos > varPos + 1) {
                                            replaceStartPos = templateAssignPos + 1;
                                            replaceStartLine = currentLine;
                                        }
                                    }
                                }

                                let endKeyPos = lineText.lastIndexOf(';');
                                if (endKeyPos >= 0) {
                                    replaceEndPos = endKeyPos + 1;
                                }
                            }

                            // Build injection mark
                            if (replaceStartPos >= 0 && replaceEndPos >= 0) {
                                let startPos = new Position(replaceStartLine, replaceStartPos);
                                let endPos = new Position(currentLine, replaceEndPos);
                                let replaceRange = new Range(startPos, endPos);

                                // Store injection mark
                                this.injectionPosition.push({
                                    range: replaceRange,
                                    data: dataInfo
                                });
                                isValidInjection = true;
                                decoration.hoverMessage = "Template will be injected here.";
                                console.info(`Found an injection at line ${foundLine}: [${dataStr}]`);
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }

                // Store decoration position
                if (isValidInjection) {
                    injectionValidDecorations.push(decoration);
                } else {
                    injectionInvalidDecorations.push(decoration);
                }
            }

            if (this.validDecorationType && this.invalidDecorationType) {
                // Insert decoration
                editor.setDecorations(this.validDecorationType, injectionValidDecorations);
                editor.setDecorations(this.invalidDecorationType, injectionInvalidDecorations);
            }

            // Inject template
            if (this.injectionPosition.length > 0) {
                setTimeout(() => this.injectTemplate(), 0);
            }
        }
    }

    public removeInjectionMark() {
        const editor = vscode.window.activeTextEditor;
        if (editor && this.markRegEx) {
            const document = editor.document;
            if (document.languageId != "javascript") {
                return;
            }
            const documentStr = document.getText();
            let matchedLines: vscode.Range[] = [];

            let match;
            while (match = this.markRegEx.exec(documentStr)) {
                let line = document.positionAt(match.index).line;
                let range = new Range(new Position(line, 0), new Position(line + 1, 0));
                matchedLines.push(range);
            }

            const deleteInjectionFn = function () {
                if (matchedLines.length == 0) {
                    return;
                }

                const range = matchedLines.pop();
                if (range) {
                    editor.edit(editBuilder => {
                        editBuilder.delete(range);
                    }).then(() => {
                        deleteInjectionFn();
                    });
                }
            }

            deleteInjectionFn();
        }
    }
}
