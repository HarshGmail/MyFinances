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

// ✅ Cache all needed info BEFORE removing anything
const declarationTexts = declarations.map((decl) => {
  const identifier = decl.getFirstChildByKindOrThrow(SyntaxKind.Identifier);
  return {
    name: identifier.getText(),
    text: decl.getFullText(),
    node: decl, // Save node for later removal
  };
});

// Sort alphabetically by name
declarationTexts.sort((a, b) => a.name.localeCompare(b.name));

// Remove all old nodes
declarationTexts.forEach((d) => d.node.remove());

// Add back sorted declarations
sourceFile.addStatements(declarationTexts.map((d) => d.text));

// Save to file
sourceFile.saveSync();

console.log('✅ Interfaces and types sorted alphabetically.');
