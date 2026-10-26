import { readFileSync } from 'node:fs';
import ts from 'typescript';
const cache = new Map();
export function tsModuleUrl(url) {
    const key = String(url);
    if (cache.has(key)) return cache.get(key);
    const source = ts.transpileModule(readFileSync(url, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText.replace(/\bfrom\s+(['"])(\.[^'"]+)\1/g, (_, quote, path) => {
        const dependency = new URL(path.endsWith('.ts') ? path : `${path}.ts`, url);
        return `from ${JSON.stringify(tsModuleUrl(dependency))}`;
    });
    const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
    cache.set(key, result); return result;
}
