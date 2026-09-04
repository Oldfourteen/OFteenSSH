import { homedir } from 'os'
import { sep } from 'path'

/**
 * 展开 ~ 为用户主目录
 */
export function expandHomeDir(filepath: string): string {
  if (!filepath) return filepath
  if (filepath === '~') return homedir()
  if (filepath.startsWith('~' + sep) || filepath.startsWith('~/')) {
    return homedir() + filepath.slice(1)
  }
  return filepath
}
