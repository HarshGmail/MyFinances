/* eslint-disable @typescript-eslint/no-require-imports */
const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.resolve('./tsconfig.json'),
});

const filePath = path.resolve('./src/api/dataInterface.ts');
const sourceFile = project.getSourceFileOrThrow(filePath);

// Get all top-level interface/type declarations
const declarations = sourceFile
  .getStatements()
  .filter(
    (stmt) =>
      stmt.getKind() === SyntaxKind.InterfaceDeclaration ||
      stmt.getKind() === SyntaxKind.TypeAliasDeclaration
  );

// Cache declaration text using getText() (excludes leading trivia like stale file-level comments)
const declarationTexts = declarations.map((decl) => {
  const identifier = decl.getFirstChildByKindOrThrow(SyntaxKind.Identifier);
  return {
    name: identifier.getText(),
    text: decl.getText(),
  };
});

// Sort alphabetically by name
declarationTexts.sort((a, b) => a.name.localeCompare(b.name));

// Replace the entire file with the sorted declarations — no leftover trivia or stale comments
sourceFile.replaceWithText(declarationTexts.map((d) => d.text).join('\n\n') + '\n');

// Save to file
sourceFile.saveSync();

console.log('✅ Interfaces and types sorted alphabetically.');
