export type ShellTokenType =
  | 'command'
  | 'flag'
  | 'string'
  | 'variable'
  | 'operator'
  | 'subcommand'
  | 'comment'
  | 'plain'

export interface ShellToken {
  type: ShellTokenType
  value: string
}

const OPERATORS = [
  '&&',
  '||',
  '>>',
  '<<',
  '&>',
  '2>',
  '1>',
  '>&',
  '<>',
  ';',
  '|',
  '&',
  '>',
  '<',
  '(',
  ')'
]

function isOperatorStart(char: string): boolean {
  return OPERATORS.some((op) => op.startsWith(char))
}

function matchOperator(input: string, start: number): string | null {
  // 优先匹配最长的操作符
  for (const op of OPERATORS) {
    if (input.startsWith(op, start)) return op
  }
  return null
}

function readString(input: string, start: number): string {
  const quote = input[start]
  let i = start + 1
  while (i < input.length) {
    const c = input[i]
    if (c === '\\' && input[i + 1] !== undefined) {
      i += 2
      continue
    }
    if (c === quote) {
      i++
      break
    }
    i++
  }
  return input.slice(start, i)
}

function readVariable(input: string, start: number): string {
  if (input[start + 1] === '{') {
    let i = start + 2
    while (i < input.length && input[i] !== '}') {
      if (input[i] === '\\' && input[i + 1] !== undefined) i += 2
      else i++
    }
    if (i < input.length) i++ // 包含 }
    return input.slice(start, i)
  }
  // $VAR 或 $1 等特殊变量
  let i = start + 1
  while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) i++
  return input.slice(start, i)
}

function readSubcommand(input: string, start: number): string {
  let depth = 1
  let i = start + 2
  while (i < input.length && depth > 0) {
    const c = input[i]
    if (c === '\\' && input[i + 1] !== undefined) {
      i += 2
      continue
    }
    if (c === '(') depth++
    else if (c === ')') depth--
    i++
  }
  return input.slice(start, i)
}

function readBacktick(input: string, start: number): string {
  let i = start + 1
  while (i < input.length) {
    const c = input[i]
    if (c === '\\' && input[i + 1] !== undefined) {
      i += 2
      continue
    }
    if (c === '`') {
      i++
      break
    }
    i++
  }
  return input.slice(start, i)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function tokenizeShell(input: string): ShellToken[] {
  const tokens: ShellToken[] = []
  let i = 0
  let expectCommand = true

  while (i < input.length) {
    const c = input[i]

    if (/\s/.test(c)) {
      tokens.push({ type: 'plain', value: c })
      i++
      continue
    }

    if (c === '#') {
      const start = i
      while (i < input.length && input[i] !== '\n') i++
      tokens.push({ type: 'comment', value: input.slice(start, i) })
      expectCommand = true
      continue
    }

    const op = matchOperator(input, i)
    if (op) {
      tokens.push({ type: 'operator', value: op })
      i += op.length
      if (op !== ')' && op !== '(') {
        expectCommand = true
      }
      continue
    }

    if (c === '"' || c === "'") {
      tokens.push({ type: 'string', value: readString(input, i) })
      i += tokens[tokens.length - 1].value.length
      expectCommand = false
      continue
    }

    if (c === '$' && input[i + 1] === '(') {
      tokens.push({ type: 'subcommand', value: readSubcommand(input, i) })
      i += tokens[tokens.length - 1].value.length
      expectCommand = false
      continue
    }

    if (c === '`') {
      tokens.push({ type: 'subcommand', value: readBacktick(input, i) })
      i += tokens[tokens.length - 1].value.length
      expectCommand = false
      continue
    }

    if (c === '$') {
      tokens.push({ type: 'variable', value: readVariable(input, i) })
      i += tokens[tokens.length - 1].value.length
      expectCommand = false
      continue
    }

    const start = i
    while (
      i < input.length &&
      !/\s/.test(input[i]) &&
      !isOperatorStart(input[i]) &&
      input[i] !== '"' &&
      input[i] !== "'" &&
      input[i] !== '#' &&
      input[i] !== '$' &&
      input[i] !== '`'
    ) {
      i++
    }

    const word = input.slice(start, i)
    if (word) {
      if (expectCommand) {
        tokens.push({ type: 'command', value: word })
        expectCommand = false
      } else if (word.startsWith('-')) {
        tokens.push({ type: 'flag', value: word })
      } else {
        tokens.push({ type: 'plain', value: word })
      }
    }
  }

  return tokens
}

export function highlightShell(input: string): string {
  if (!input) return ''
  const tokens = tokenizeShell(input)
  return tokens
    .map((token) => {
      const escaped = escapeHtml(token.value)
      if (token.type === 'plain') return escaped
      return `<span class="sh-${token.type}">${escaped}</span>`
    })
    .join('')
}
