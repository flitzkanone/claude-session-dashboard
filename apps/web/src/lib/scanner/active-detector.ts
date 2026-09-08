import * as fs from 'node:fs'
import * as path from 'node:path'
import { getProjectsDir } from '../utils/claude-path'

// Claude Code can keep a session alive without the lock directory being
// present in the exact shape expected by the old detector. A recently
// modified JSONL file is the most reliable signal available to the dashboard.
const ACTIVE_THRESHOLD_MS = 5 * 60_000

/**
 * Check whether a Claude Code session is currently active.
 *
 * We deliberately do not require a lock directory: that made genuinely
 * running sessions disappear from the dashboard depending on Claude Code's
 * internal locking behaviour.
 */
export async function isSessionActive(
  projectDirName: string,
  sessionId: string,
  projectsDirOverride?: string,
): Promise<boolean> {
  const projectsDir = projectsDirOverride ?? getProjectsDir()
  const jsonlPath = path.join(projectsDir, projectDirName, `${sessionId}.jsonl`)

  const stat = await fs.promises.stat(jsonlPath).catch(() => null)
  if (!stat) return false

  return Date.now() - stat.mtimeMs <= ACTIVE_THRESHOLD_MS
}
