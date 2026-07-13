#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const projectRoot = __dirname;
const strictMode = process.argv.includes('--strict');
const ciMode = process.argv.includes('--ci');

const sourcePaths = [
  'src/app/ui-shell.js',
  'src/app/workout-model.js',
  'src/app/profile-strength.js',
  'src/app/workout-ui.js',
  'src/app/gym-session-core.js',
  'src/app/v6-core.js',
  'src/app/workout-runtime.js',
  'src/app/analytics-tools.js',
  'src/app/main.js'
];

const injectionPaths = [
  'js/app-update.js',
  'js/rest-native-notifications.js',
  'js/ui-safe-v1.js',
  'js/workout/set-log.js'
];

const runtimePath = 'js/app.js';
const indexPath = 'index.html';

const fatalErrors = [];
const warnings = [];

function normalizeRelative(filePath) {
  return filePath.split(path.sep).join('/');
}

function absolute(relativePath) {
  return path.join(projectRoot, relativePath);
}

function readText(relativePath) {
  const fullPath = absolute(relativePath);

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    fatalErrors.push(`Manjka datoteka: ${relativePath}`);
    return '';
  }

  return fs.readFileSync(fullPath, 'utf8');
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function runNodeCheck(relativePath) {
  const result = childProcess.spawnSync(
    process.execPath,
    ['--check', absolute(relativePath)],
    {
      encoding: 'utf8',
      windowsHide: true
    }
  );

  if (result.error) {
    fatalErrors.push(
      `node --check se ni zagnal za ${relativePath}: ${result.error.message}`
    );
    return;
  }

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    fatalErrors.push(
      `JavaScript sintaksa ni veljavna: ${relativePath}` +
      (detail ? `\n${detail}` : '')
    );
  }
}

function lineNumberAt(text, index) {
  let line = 1;

  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }

  return line;
}

function collectTopLevelDeclarations(text, relativePath) {
  const functions = [];
  const variables = [];
  const classes = [];

  const functionPattern =
    /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  const variablePattern =
    /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/gm;
  const classPattern =
    /^class\s+([A-Za-z_$][\w$]*)\b/gm;

  let match;

  while ((match = functionPattern.exec(text)) !== null) {
    functions.push({
      name: match[1],
      file: relativePath,
      line: lineNumberAt(text, match.index)
    });
  }

  while ((match = variablePattern.exec(text)) !== null) {
    variables.push({
      name: match[1],
      file: relativePath,
      line: lineNumberAt(text, match.index)
    });
  }

  while ((match = classPattern.exec(text)) !== null) {
    classes.push({
      name: match[1],
      file: relativePath,
      line: lineNumberAt(text, match.index)
    });
  }

  return { functions, variables, classes };
}

function groupDuplicates(items) {
  const grouped = new Map();

  for (const item of items) {
    if (!grouped.has(item.name)) {
      grouped.set(item.name, []);
    }

    grouped.get(item.name).push(item);
  }

  return [...grouped.entries()]
    .filter(([, locations]) => locations.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, locations]) => ({ name, locations }));
}

function collectHtmlIds(html) {
  const ids = [];
  const pattern = /\bid\s*=\s*(["'])(.*?)\1/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    ids.push({
      name: match[2],
      file: indexPath,
      line: lineNumberAt(html, match.index)
    });
  }

  return ids;
}

function collectInlineHandlerCalls(html) {
  const calls = [];
  const attributePattern =
    /\bon[a-z]+\s*=\s*(["'])([\s\S]*?)\1/gi;
  let attributeMatch;

  while ((attributeMatch = attributePattern.exec(html)) !== null) {
    const code = attributeMatch[2];
    const codeStart = attributeMatch.index;
    const callPattern = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let callMatch;

    while ((callMatch = callPattern.exec(code)) !== null) {
      const previousCharacter =
        callMatch.index > 0 ? code[callMatch.index - 1] : '';

      if (previousCharacter === '.') {
        continue;
      }

      calls.push({
        name: callMatch[1],
        file: indexPath,
        line: lineNumberAt(html, codeStart)
      });
    }
  }

  return calls;
}

function formatLocations(locations) {
  return locations
    .map((location) => `${location.file}:${location.line}`)
    .join(', ');
}

const sourceTexts = new Map();
const sourceStats = [];

for (const relativePath of sourcePaths) {
  const text = readText(relativePath);
  sourceTexts.set(relativePath, text);

  sourceStats.push({
    file: relativePath,
    lines: text ? text.split(/\r?\n/).length : 0,
    bytes: Buffer.byteLength(text, 'utf8')
  });

  if (text) {
    runNodeCheck(relativePath);
  }
}

for (const relativePath of injectionPaths) {
  const text = readText(relativePath);

  if (text) {
    runNodeCheck(relativePath);
  }
}

const runtimeText = readText(runtimePath);
const indexText = readText(indexPath);

if (runtimeText) {
  runNodeCheck(runtimePath);
}

const combinedText = sourcePaths
  .map((relativePath) => sourceTexts.get(relativePath) || '')
  .join('');

const combinedHash = sha256Buffer(Buffer.from(combinedText, 'utf8'));
const runtimeHash = sha256Buffer(Buffer.from(runtimeText, 'utf8'));

if (combinedText !== runtimeText) {
  fatalErrors.push(
    `Source sestava ni bajtno enaka ${runtimePath}. ` +
    `Source SHA-256: ${combinedHash}; runtime SHA-256: ${runtimeHash}`
  );
}

const allDeclarations = {
  functions: [],
  variables: [],
  classes: []
};

for (const relativePath of sourcePaths) {
  const declarations = collectTopLevelDeclarations(
    sourceTexts.get(relativePath) || '',
    relativePath
  );

  allDeclarations.functions.push(...declarations.functions);
  allDeclarations.variables.push(...declarations.variables);
  allDeclarations.classes.push(...declarations.classes);
}

const duplicateFunctions = groupDuplicates(allDeclarations.functions);
const duplicateVariables = groupDuplicates(allDeclarations.variables);
const duplicateClasses = groupDuplicates(allDeclarations.classes);
const duplicateIds = groupDuplicates(collectHtmlIds(indexText));

for (const duplicate of duplicateFunctions) {
  warnings.push(
    `Podvojena top-level funkcija ${duplicate.name}: ` +
    formatLocations(duplicate.locations)
  );
}

for (const duplicate of duplicateVariables) {
  warnings.push(
    `Podvojena top-level spremenljivka ${duplicate.name}: ` +
    formatLocations(duplicate.locations)
  );
}

for (const duplicate of duplicateClasses) {
  warnings.push(
    `Podvojen top-level class ${duplicate.name}: ` +
    formatLocations(duplicate.locations)
  );
}

for (const duplicate of duplicateIds) {
  warnings.push(
    `Podvojen HTML id ${duplicate.name}: ` +
    formatLocations(duplicate.locations)
  );
}

const knownGlobals = new Set([
  ...allDeclarations.functions.map((item) => item.name),
  ...allDeclarations.variables.map((item) => item.name),
  ...allDeclarations.classes.map((item) => item.name)
]);

for (const relativePath of injectionPaths) {
  const text = readText(relativePath);
  const declarations = collectTopLevelDeclarations(text, relativePath);

  for (const item of [
    ...declarations.functions,
    ...declarations.variables,
    ...declarations.classes
  ]) {
    knownGlobals.add(item.name);
  }
}

const ignoredInlineCalls = new Set([
  'alert',
  'confirm',
  'prompt',
  'parseInt',
  'parseFloat',
  'isNaN',
  'Number',
  'String',
  'Boolean',
  'Date',
  'Array',
  'Object',
  'JSON',
  'Math',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval'
]);

const missingInlineHandlers = [];
const seenMissingHandlers = new Set();

for (const call of collectInlineHandlerCalls(indexText)) {
  if (
    knownGlobals.has(call.name) ||
    ignoredInlineCalls.has(call.name)
  ) {
    continue;
  }

  const key = `${call.name}@${call.line}`;

  if (seenMissingHandlers.has(key)) {
    continue;
  }

  seenMissingHandlers.add(key);
  missingInlineHandlers.push(call);
}

for (const missing of missingInlineHandlers) {
  warnings.push(
    `Inline handler morda nima globalne funkcije ${missing.name}: ` +
    `${missing.file}:${missing.line}`
  );
}

const totalSourceLines = sourceStats.reduce(
  (sum, item) => sum + item.lines,
  0
);

console.log('');
console.log('========================================');
console.log(' CODE AUDIT');
console.log('========================================');
console.log('');
console.log(`Source datoteke: ${sourcePaths.length}`);
console.log(`Source vrstice: ${totalSourceLines}`);
console.log(`Top-level funkcije: ${allDeclarations.functions.length}`);
console.log(`Top-level spremenljivke: ${allDeclarations.variables.length}`);
console.log(`Top-level classes: ${allDeclarations.classes.length}`);
console.log(`Podvojene funkcije: ${duplicateFunctions.length}`);
console.log(`Podvojene spremenljivke: ${duplicateVariables.length}`);
console.log(`Podvojeni classes: ${duplicateClasses.length}`);
console.log(`Podvojeni HTML id-ji: ${duplicateIds.length}`);
console.log(`Mozni manjkajoci inline handlerji: ${missingInlineHandlers.length}`);
console.log(`Bundle SHA-256: ${runtimeHash}`);

if (warnings.length > 0) {
  console.log('');
  console.log('OPOZORILA:');

  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (fatalErrors.length > 0) {
  console.error('');
  console.error('CODE AUDIT: NAPAKA');

  for (const error of fatalErrors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

if (strictMode && warnings.length > 0) {
  console.error('');
  console.error(
    `CODE AUDIT STRICT: BLOKADA (${warnings.length} opozoril)`
  );
  process.exit(2);
}

console.log('');
console.log(
  warnings.length > 0
    ? `CODE AUDIT: OK Z OPOZORILI (${warnings.length})`
    : 'CODE AUDIT: OK'
);

if (ciMode) {
  console.log('CI nacin: fatalne napake blokirajo release; opozorila so porocilo.');
}