/**
 * Code parser for symbol extraction
 * Using regex-based parsing for now (Tree-sitter can be added later)
 */

export interface Symbol {
  id: string
  name: string
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'import' | 'export' | 'method' | 'property'
  signature?: string
  location: {
    file: string
    line: number
    column: number
    endLine: number
    endColumn: number
  }
  children?: Symbol[]
  references?: string[] // IDs of symbols this references
  referencedBy?: string[] // IDs of symbols that reference this
  docstring?: string
  complexity?: number
}

export interface ParseResult {
  symbols: Symbol[]
  imports: Map<string, string[]>
  exports: Set<string>
  relationships: SymbolRelationship[]
}

export interface SymbolRelationship {
  from: string
  to: string
  type: 'imports' | 'calls' | 'extends' | 'implements' | 'references' | 'contains'
}

// Simple regex-based parser
export async function parseCodeWithTreeSitter(code: string, filePath: string): Promise<ParseResult> {
  const symbols: Symbol[] = []
  const imports = new Map<string, string[]>()
  const exports = new Set<string>()
  const relationships: SymbolRelationship[] = []

  const lines = code.split('\n')

  // Parse functions
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g
  const arrowFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g

  // Parse classes
  const classRegex = /(?:export\s+)?class\s+(\w+)/g

  // Parse interfaces
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g

  // Parse types
  const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=/g

  // Parse imports
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g

  lines.forEach((line, index) => {
    // Function declarations
    let match
    while ((match = functionRegex.exec(line)) !== null) {
      symbols.push({
        id: `${filePath}:${match[1]}:${index}`,
        name: match[1],
        type: 'function',
        signature: line.trim(),
        location: {
          file: filePath,
          line: index + 1,
          column: 0,
          endLine: index + 1,
          endColumn: line.length
        },
        references: [],
        referencedBy: []
      })
    }

    // Arrow functions
    while ((match = arrowFunctionRegex.exec(line)) !== null) {
      symbols.push({
        id: `${filePath}:${match[1]}:${index}`,
        name: match[1],
        type: 'function',
        signature: line.trim(),
        location: {
          file: filePath,
          line: index + 1,
          column: 0,
          endLine: index + 1,
          endColumn: line.length
        },
        references: [],
        referencedBy: []
      })
    }

    // Classes
    while ((match = classRegex.exec(line)) !== null) {
      symbols.push({
        id: `${filePath}:${match[1]}:${index}`,
        name: match[1],
        type: 'class',
        signature: line.trim(),
        location: {
          file: filePath,
          line: index + 1,
          column: 0,
          endLine: index + 1,
          endColumn: line.length
        },
        references: [],
        referencedBy: []
      })
    }

    // Interfaces
    while ((match = interfaceRegex.exec(line)) !== null) {
      symbols.push({
        id: `${filePath}:${match[1]}:${index}`,
        name: match[1],
        type: 'interface',
        signature: line.trim(),
        location: {
          file: filePath,
          line: index + 1,
          column: 0,
          endLine: index + 1,
          endColumn: line.length
        },
        references: [],
        referencedBy: []
      })
    }

    // Types
    while ((match = typeRegex.exec(line)) !== null) {
      symbols.push({
        id: `${filePath}:${match[1]}:${index}`,
        name: match[1],
        type: 'type',
        signature: line.trim(),
        location: {
          file: filePath,
          line: index + 1,
          column: 0,
          endLine: index + 1,
          endColumn: line.length
        },
        references: [],
        referencedBy: []
      })
    }

    // Imports
    while ((match = importRegex.exec(line)) !== null) {
      const namedImports = match[1]?.split(',').map(s => s.trim()) || []
      const defaultImport = match[2]
      const source = match[3]

      const importedNames = defaultImport ? [defaultImport, ...namedImports] : namedImports
      imports.set(source, importedNames)

      symbols.push({
        id: `${filePath}:import:${index}`,
        name: source,
        type: 'import',
        signature: line.trim(),
        location: {
          file: filePath,
          line: index + 1,
          column: 0,
          endLine: index + 1,
          endColumn: line.length
        },
        references: importedNames,
        referencedBy: []
      })
    }
  })

  // Create relationships
  symbols.forEach((symbol) => {
    if (symbol.references && symbol.references.length > 0) {
      symbol.references.forEach((refName) => {
        const targetSymbol = symbols.find((s) => s.name === refName)
        if (targetSymbol) {
          relationships.push({
            from: symbol.id,
            to: targetSymbol.id,
            type: symbol.type === 'import' ? 'imports' : 'references'
          })
        }
      })
    }
  })

  return {
    symbols,
    imports,
    exports,
    relationships
  }
}

// Singleton instance
export const treeSitterParser = {
  parseCode: parseCodeWithTreeSitter
}
