#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const AUDIT_VERSION = '3.0';
const projectRoot = __dirname;
const strictMode = process.argv.includes('--strict');
const ciMode = process.argv.includes('--ci');
const reportMode = process.argv.includes('--report');
const reportOutputPath = path.join(
  projectRoot,
  'release',
  'code-audit-report.json'
);

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

const runtimeSupportPaths = [
  'js/core/bootstrap.js',
  'js/core/state-storage.js',
  'js/data/exercise-swaps.js',
  'js/data/programs.js'
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

function collectCallableNames(text) {
  const names = new Set();

  const patterns = [
    /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g,
    /\b(?:window|globalThis)\.([A-Za-z_$][\w$]*)\s*=/g,
    /\b(?:window|globalThis)\[['"]([A-Za-z_$][\w$]*)['"]\]\s*=/g
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(text)) !== null) {
      names.add(match[1]);
    }
  }

  return names;
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
  const controlWords = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'function'
  ]);

  let attributeMatch;

  while ((attributeMatch = attributePattern.exec(html)) !== null) {
    const code = attributeMatch[2];
    const codeStart = attributeMatch.index;
    const callPattern = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let callMatch;

    while ((callMatch = callPattern.exec(code)) !== null) {
      const previousCharacter =
        callMatch.index > 0 ? code[callMatch.index - 1] : '';
      const name = callMatch[1];

      if (previousCharacter === '.' || controlWords.has(name)) {
        continue;
      }

      calls.push({
        name,
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countIdentifierOccurrences(text, name) {
  const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');
  return (text.match(pattern) || []).length;
}

function buildDeadCodeCandidates(declarations, corpus) {
  const seen = new Set();
  const candidates = [];

  for (const declaration of declarations) {
    const key =
      `${declaration.name}@${declaration.file}:${declaration.line}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const occurrences =
      countIdentifierOccurrences(corpus, declaration.name);

    if (occurrences <= 1) {
      candidates.push({
        name: declaration.name,
        file: declaration.file,
        line: declaration.line,
        occurrences
      });
    }
  }

  return candidates.sort((left, right) =>
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.name.localeCompare(right.name)
  );
}

function writeAuditReport(report) {
  const reportDirectory = path.dirname(reportOutputPath);
  fs.mkdirSync(reportDirectory, { recursive: true });
  fs.writeFileSync(
    reportOutputPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
}

function runParserSelfTest() {
  const fixture = `
function alpha() {}
  async function beta() {}
const gamma = () => {};
let delta = async (value) => value;
window.epsilon = function () {};
globalThis['zeta'] = () => {};
`;

  const found = collectCallableNames(fixture);

  for (const expected of [
    'alpha',
    'beta',
    'gamma',
    'delta',
    'epsilon',
    'zeta'
  ]) {
    if (!found.has(expected)) {
      fatalErrors.push(
        `Code Audit parser self-test ni nasel callable: ${expected}`
      );
    }
  }

  const handlerFixture =
    `<button onclick="if(ok) alpha(); window.epsilon();"></button>`;
  const handlerCalls = collectInlineHandlerCalls(handlerFixture)
    .map((item) => item.name);

  if (
    handlerCalls.includes('if') ||
    !handlerCalls.includes('alpha')
  ) {
    fatalErrors.push(
      'Code Audit parser self-test za inline handlerje ni uspel.'
    );
  }
}

runParserSelfTest();

const sourceTexts = new Map();
const runtimeSupportTexts = new Map();
const injectionTexts = new Map();
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

for (const relativePath of runtimeSupportPaths) {
  const text = readText(relativePath);
  runtimeSupportTexts.set(relativePath, text);

  if (text) {
    runNodeCheck(relativePath);
  }
}

for (const relativePath of injectionPaths) {
  const text = readText(relativePath);
  injectionTexts.set(relativePath, text);

  if (text) {
    runNodeCheck(relativePath);
  }
}

const runtimeText = readText(runtimePath);
const indexText = readText(indexPath);

if (runtimeText) {
  runNodeCheck(runtimePath);
}

const requiredRuntimeScripts = [
  ...runtimeSupportPaths,
  runtimePath
];

let previousScriptPosition = -1;

for (const scriptPath of requiredRuntimeScripts) {
  const scriptTag = `<script src="${scriptPath.replace(/\\/g, '/')}"></script>`;
  const escapedTag = scriptTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (indexText.match(new RegExp(escapedTag, 'g')) || []).length;
  const position = indexText.indexOf(scriptTag);

  if (count !== 1) {
    fatalErrors.push(
      `index.html mora vsebovati tocno en runtime script ${scriptPath}. Najdeno: ${count}`
    );
  }

  if (position < 0 || position <= previousScriptPosition) {
    fatalErrors.push(
      `Runtime script vrstni red ni pravilen pri: ${scriptPath}`
    );
  }

  previousScriptPosition = position;
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

const supportDeclarations = {
  functions: [],
  variables: [],
  classes: []
};

for (const relativePath of runtimeSupportPaths) {
  const declarations = collectTopLevelDeclarations(
    runtimeSupportTexts.get(relativePath) || '',
    relativePath
  );

  supportDeclarations.functions.push(...declarations.functions);
  supportDeclarations.variables.push(...declarations.variables);
  supportDeclarations.classes.push(...declarations.classes);
}

const runtimeReferenceCorpus = [
  indexText,
  ...runtimeSupportPaths.map(
    (relativePath) => runtimeSupportTexts.get(relativePath) || ''
  ),
  runtimeText,
  ...injectionPaths.map(
    (relativePath) => injectionTexts.get(relativePath) || ''
  )
].join('\n');

const deadCodeCandidates = buildDeadCodeCandidates(
  [
    ...supportDeclarations.functions,
    ...allDeclarations.functions
  ],
  runtimeReferenceCorpus
);

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

const knownInlineCallables = new Set();

for (const text of [
  ...runtimeSupportPaths.map(
    (relativePath) => runtimeSupportTexts.get(relativePath) || ''
  ),
  runtimeText,
  ...injectionPaths.map(
    (relativePath) => injectionTexts.get(relativePath) || ''
  )
]) {
  for (const name of collectCallableNames(text)) {
    knownInlineCallables.add(name);
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
    knownInlineCallables.has(call.name) ||
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
  const message =
    `Inline handler nima najdene callable funkcije ${missing.name}: ` +
    `${missing.file}:${missing.line}`;

  if (ciMode) {
    fatalErrors.push(message);
  } else {
    warnings.push(message);
  }
}

const totalSourceLines = sourceStats.reduce(
  (sum, item) => sum + item.lines,
  0
);

console.log('');
console.log('========================================');
console.log(` CODE AUDIT v${AUDIT_VERSION}`);
console.log('========================================');
console.log('');
console.log(`Source datoteke: ${sourcePaths.length}`);
console.log(`Klasicni runtime support skripti: ${runtimeSupportPaths.length}`);
console.log(`Source vrstice: ${totalSourceLines}`);
console.log(`Top-level funkcije: ${allDeclarations.functions.length}`);
console.log(`Top-level spremenljivke: ${allDeclarations.variables.length}`);
console.log(`Top-level classes: ${allDeclarations.classes.length}`);
console.log(`Podvojene funkcije: ${duplicateFunctions.length}`);
console.log(`Podvojene spremenljivke: ${duplicateVariables.length}`);
console.log(`Podvojeni classes: ${duplicateClasses.length}`);
console.log(`Podvojeni HTML id-ji: ${duplicateIds.length}`);
console.log(`Najdene callable funkcije: ${knownInlineCallables.size}`);
console.log(`Manjkajoci inline handlerji: ${missingInlineHandlers.length}`);
console.log(
  `Mozni neuporabljeni funkcijski kandidati: ${deadCodeCandidates.length}`
);
console.log(`Bundle SHA-256: ${runtimeHash}`);

if (warnings.length > 0) {
  console.log('');
  console.log('OPOZORILA:');

  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (deadCodeCandidates.length > 0 && !ciMode) {
  console.log('');
  console.log('KANDIDATI ZA ROCNI PREGLED:');

  for (const candidate of deadCodeCandidates.slice(0, 40)) {
    console.log(
      `- ${candidate.name}: ${candidate.file}:${candidate.line}`
    );
  }

  if (deadCodeCandidates.length > 40) {
    console.log(
      `- ... se ${deadCodeCandidates.length - 40} kandidatov`
    );
  }

  console.log(
    'Ti kandidati se ne brisejo samodejno in ne blokirajo releasea.'
  );
}

if (reportMode) {
  writeAuditReport({
    auditVersion: AUDIT_VERSION,
    generatedAt: new Date().toISOString(),
    bundleSha256: runtimeHash,
    sourceFiles: sourcePaths,
    runtimeSupportFiles: runtimeSupportPaths,
    injectionFiles: injectionPaths,
    counts: {
      sourceLines: totalSourceLines,
      sourceFunctions: allDeclarations.functions.length,
      sourceVariables: allDeclarations.variables.length,
      duplicateFunctions: duplicateFunctions.length,
      duplicateVariables: duplicateVariables.length,
      duplicateClasses: duplicateClasses.length,
      duplicateHtmlIds: duplicateIds.length,
      missingInlineHandlers: missingInlineHandlers.length,
      deadCodeCandidates: deadCodeCandidates.length
    },
    deadCodeCandidates,
    missingInlineHandlers,
    duplicateFunctions,
    duplicateVariables,
    duplicateClasses,
    duplicateHtmlIds: duplicateIds,
    fatalErrors,
    warnings
  });

  console.log('');
  console.log(
    `Audit report: ${path.relative(projectRoot, reportOutputPath)}`
  );
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
  console.log(
    'CI nacin: manjkajoci inline handlerji in fatalne napake blokirajo release.'
  );
  console.log(
    'Dead-code kandidati so samo porocilo in nikoli niso samodejno izbrisani.'
  );
}