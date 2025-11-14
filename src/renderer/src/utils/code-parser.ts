/**
 * Code Parser Utility
 * Extracts symbols and structure from code files
 */

export interface Symbol {
  id: string
  name: string
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'import' | 'export'
  location: {
    file: string
    line: number
    column: number
  }
  signature?: string
  documentation?: string
  children?: Symbol[]
  references?: string[]
  metadata?: any
}

export interface CodeFile {
  path: string
  language: string
  symbols: Symbol[]
  imports: string[]
  exports: string[]
  lines: number
  tokens: number
}

/**
 * Parse TypeScript/JavaScript code to extract symbols
 */
export function parseTypeScriptSymbols(code: string, filePath: string): Symbol[] {
  const symbols: Symbol[] = []
  const lines = code.split('\n')

  let lineNumber = 0
  for (const line of lines) {
    lineNumber++
    const trimmed = line.trim()

    // Parse functions
    const functionMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/)
    if (functionMatch) {
      symbols.push({
        id: `${filePath}:${lineNumber}:${functionMatch[1]}`,
        name: functionMatch[1],
        type: 'function',
        location: { file: filePath, line: lineNumber, column: line.indexOf(functionMatch[0]) },
        signature: `function ${functionMatch[1]}(${functionMatch[2]})`
      })
    }

    // Parse arrow functions
    const arrowMatch = trimmed.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/)
    if (arrowMatch) {
      symbols.push({
        id: `${filePath}:${lineNumber}:${arrowMatch[1]}`,
        name: arrowMatch[1],
        type: 'function',
        location: { file: filePath, line: lineNumber, column: line.indexOf(arrowMatch[0]) },
        signature: `const ${arrowMatch[1]} = (${arrowMatch[2]}) =>`
      })
    }

    // Parse classes
    const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/)
    if (classMatch) {
      symbols.push({
        id: `${filePath}:${lineNumber}:${classMatch[1]}`,
        name: classMatch[1],
        type: 'class',
        location: { file: filePath, line: lineNumber, column: line.indexOf(classMatch[0]) },
        signature: classMatch[2] ? `class ${classMatch[1]} extends ${classMatch[2]}` : `class ${classMatch[1]}`
      })
    }

    // Parse interfaces
    const interfaceMatch = trimmed.match(/(?:export\s+)?interface\s+(\w+)/)
    if (interfaceMatch) {
      symbols.push({
        id: `${filePath}:${lineNumber}:${interfaceMatch[1]}`,
        name: interfaceMatch[1],
        type: 'interface',
        location: { file: filePath, line: lineNumber, column: line.indexOf(interfaceMatch[0]) },
        signature: `interface ${interfaceMatch[1]}`
      })
    }

    // Parse type aliases
    const typeMatch = trimmed.match(/(?:export\s+)?type\s+(\w+)\s*=/)
    if (typeMatch) {
      symbols.push({
        id: `${filePath}:${lineNumber}:${typeMatch[1]}`,
        name: typeMatch[1],
        type: 'type',
        location: { file: filePath, line: lineNumber, column: line.indexOf(typeMatch[0]) },
        signature: `type ${typeMatch[1]}`
      })
    }

    // Parse imports
    const importMatch = trimmed.match(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/)
    if (importMatch) {
      const importName = importMatch[1] || importMatch[2]
      symbols.push({
        id: `${filePath}:${lineNumber}:import:${importName}`,
        name: importName,
        type: 'import',
        location: { file: filePath, line: lineNumber, column: line.indexOf(importMatch[0]) },
        signature: `import ${importName} from '${importMatch[3]}'`
      })
    }
  }

  return symbols
}

/**
 * Parse Python code to extract symbols
 */
export function parsePythonSymbols(code: string, filePath: string): Symbol[] {
  const symbols: Symbol[] = []
  const lines = code.split('\n')

  let lineNumber = 0
  for (const line of lines) {
    lineNumber++
    const trimmed = line.trim()

    // Parse functions
    const functionMatch = trimmed.match(/def\s+(\w+)\s*\(([^)]*)\)/)
    if (functionMatch) {
      symbols.push({
        id: `${filePath}:${lineNumber}:${functionMatch[1]}`,
        name: functionMatch[1],
        type: 'function',
        location: { file: filePath, line: lineNumber, column: line.indexOf(functionMatch[0]) },
        signature: `def ${functionMatch[1]}(${functionMatch[2]})`
      })
    }

    // Parse classes
    const classMatch = trimmed.match(/class\s+(\w+)(?:\(([^)]*)\))?:/)
    if (classMatch) {
      symbols.push({
        id: `${filePath}:${lineNumber}:${classMatch[1]}`,
        name: classMatch[1],
        type: 'class',
        location: { file: filePath, line: lineNumber, column: line.indexOf(classMatch[0]) },
        signature: classMatch[2] ? `class ${classMatch[1]}(${classMatch[2]})` : `class ${classMatch[1]}`
      })
    }

    // Parse imports
    const importMatch = trimmed.match(/from\s+(\S+)\s+import\s+(.+)|import\s+(\S+)/)
    if (importMatch) {
      const importName = importMatch[2] || importMatch[3]
      symbols.push({
        id: `${filePath}:${lineNumber}:import:${importName}`,
        name: importName,
        type: 'import',
        location: { file: filePath, line: lineNumber, column: line.indexOf(importMatch[0]) },
        signature: line.trim()
      })
    }
  }

  return symbols
}

/**
 * Parse code based on file extension
 */
export function parseCode(code: string, filePath: string): Symbol[] {
  const ext = filePath.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return parseTypeScriptSymbols(code, filePath)
    case 'py':
      return parsePythonSymbols(code, filePath)
    default:
      return []
  }
}

/**
 * Build symbol graph with relationships
 */
export interface SymbolNode {
  symbol: Symbol
  children: SymbolNode[]
  parents: string[]
}

export function buildSymbolGraph(symbols: Symbol[]): Map<string, SymbolNode> {
  const graph = new Map<string, SymbolNode>()

  // First pass: create nodes
  for (const symbol of symbols) {
    graph.set(symbol.id, {
      symbol,
      children: [],
      parents: []
    })
  }

  // Second pass: establish relationships
  for (const symbol of symbols) {
    if (symbol.references) {
      const node = graph.get(symbol.id)
      if (node) {
        for (const refId of symbol.references) {
          const refNode = graph.get(refId)
          if (refNode) {
            node.children.push(refNode)
            refNode.parents.push(symbol.id)
          }
        }
      }
    }
  }

  return graph
}

/**
 * Calculate code complexity metrics
 */
export interface ComplexityMetrics {
  cyclomaticComplexity: number
  cognitiveComplexity: number
  linesOfCode: number
  commentDensity: number
}

export function calculateComplexity(code: string): ComplexityMetrics {
  const lines = code.split('\n')
  const totalLines = lines.length
  const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length
  const commentLines = lines.filter(l => l.trim().startsWith('//')).length

  // Simple cyclomatic complexity (count decision points)
  const decisionPoints = (code.match(/\b(if|else|for|while|case|catch|\?\?|\|\||&&)\b/g) || []).length
  const cyclomaticComplexity = decisionPoints + 1

  return {
    cyclomaticComplexity,
    cognitiveComplexity: cyclomaticComplexity, // Simplified
    linesOfCode: codeLines,
    commentDensity: totalLines > 0 ? (commentLines / totalLines) * 100 : 0
  }
}
