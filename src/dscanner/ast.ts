'use strict';

import * as xml from 'xml2js';
import * as vsc from 'vscode';

let types = new Map<string, vsc.SymbolKind>();

types.set(declaration('module'), vsc.SymbolKind.Module);
types.set(declaration('variable'), vsc.SymbolKind.Variable);
types.set(declaration('function'), vsc.SymbolKind.Function);
types.set(declaration('enum'), vsc.SymbolKind.Enum);
types.set(declaration('union'), vsc.SymbolKind.Class);
types.set(declaration('struct'), vsc.SymbolKind.Class);
types.set(declaration('class'), vsc.SymbolKind.Class);
types.set(declaration('interface'), vsc.SymbolKind.Interface);
types.set(declaration('template'), vsc.SymbolKind.Function);

export {types};

interface Declaration {
    name: string;
    kind: vsc.SymbolKind;
    line: number;
    container?: string;
}

export function parse(data: string) {
    return new Promise<Declaration[]>((resolve) => {
        xml.parseString(data, { explicitArray: false }, (err, output) => {
            resolve(parseNode(output));
        });
    });
}

function parseNode(rootNode: any) {
    let declarations: Declaration[] = [];
    let nodes = [rootNode];
    let names: string[] = [null];
    let containers: string[] = [null];
    let dec: Declaration;

    function isName(n: string) {
        return n === 'name' || n === 'identifier';
    }

    function canContainLine(n: string) {
        return isName(n) || n === 'declarator';
    }

    while (nodes.length) {
        let node = nodes.pop();
        let name = names.pop();

        if (dec) {
            if (canContainLine(name) && node.$) {
                dec.kind = vsc.SymbolKind.Field;
                dec.line = Number(node.$.line);
            }

            if (isName(name)) {
                dec.name = node._ || node;

                declarations.push(dec);
                dec = null;
            }
        } else if (types.get(name)) {
            dec = {
                name: null,
                kind: types.get(name),
                line: node.$ ? Number(node.$.line) : 1
            };
        }

        let tempNodes = [];
        let tempNames: string[] = [];

        for (let childName in node) {
            let child = node[childName];

            if (child instanceof Array) {
                let array = child.reverse();

                for (let itemName in array) {
                    nodes.push(array[itemName]);
                    names.push(itemName);
                }
            } else if (child instanceof Object || isName(childName)) {
                tempNodes.unshift(child);
                tempNames.unshift(childName);
            }
        }

        nodes = nodes.concat(tempNodes);
        names = names.concat(tempNames);
    }

    return declarations;
}

function declaration(kind: string) {
    return kind + 'Declaration';
}