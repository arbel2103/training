// All GitHub REST calls the app makes against the private data repo, authed
// with the user's fine-grained PAT (read from localStorage via pat.ts). Runs
// entirely in the browser; the GitHub API allows CORS for these endpoints.
import { getDataRepo, getPat } from './pat'
import { sealSecret } from './sealedBox'
import { SYNC_ENGINE_FILES } from './syncEngine'

const API = 'https://api.github.com'
const WORKFLOW_FILE = 'sync.yml'
const DEFAULT_REF = 'main'

export class GithubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GithubError'
    this.status = status
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${getPat()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  }
}

async function fail(res: Response): Promise<never> {
  let detail = res.statusText
  try {
    const body = (await res.json()) as { message?: string }
    if (body.message) detail = body.message
  } catch {
    /* non-JSON error body */
  }
  throw new GithubError(res.status, detail)
}

/** Validate the PAT + repo access. Returns the repo's default branch. */
export async function getRepoOk(): Promise<string> {
  const res = await fetch(`${API}/repos/${getDataRepo()}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) await fail(res)
  const repo = (await res.json()) as { default_branch?: string }
  return repo.default_branch ?? DEFAULT_REF
}

export interface DirEntry {
  name: string
  path: string
  sha: string
  type: 'file' | 'dir'
}

/** List a directory in the data repo. Missing dir → empty list. */
export async function listDir(path: string): Promise<DirEntry[]> {
  const res = await fetch(`${API}/repos/${getDataRepo()}/contents/${path}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (res.status === 404) return []
  if (!res.ok) await fail(res)
  const items = (await res.json()) as DirEntry[]
  return Array.isArray(items) ? items : []
}

/** Fetch a file's raw text. Missing file → null. */
export async function getRawFile(path: string): Promise<string | null> {
  const res = await fetch(`${API}/repos/${getDataRepo()}/contents/${path}`, {
    headers: headers({ Accept: 'application/vnd.github.raw+json' }),
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) await fail(res)
  return res.text()
}

/** Fetch and JSON-parse a file. Missing file → null. */
export async function getJsonFile<T>(path: string): Promise<T | null> {
  const text = await getRawFile(path)
  if (text == null) return null
  return JSON.parse(text) as T
}

/** True if a file already exists in the data repo. */
async function fileExists(path: string): Promise<boolean> {
  const res = await fetch(
    `${API}/repos/${getDataRepo()}/contents/${encodeURI(path)}?ref=${DEFAULT_REF}`,
    { headers: headers(), cache: 'no-store' },
  )
  if (res.status === 404) return false
  if (!res.ok) await fail(res)
  return true
}

/**
 * Write the sync engine (workflow + Python) into the data repo, turning a fresh
 * empty private repo into a working one — so the user never copies files by
 * hand. Idempotent: only creates files that are missing, never overwrites.
 * Writing under .github/workflows/ requires the token's Workflows permission.
 */
export async function provisionSyncEngine(): Promise<{ created: number }> {
  const repo = getDataRepo()
  let created = 0
  for (const f of SYNC_ENGINE_FILES) {
    if (await fileExists(f.path)) continue
    const res = await fetch(`${API}/repos/${repo}/contents/${encodeURI(f.path)}`, {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: 'Add TriLife sync engine',
        content: f.base64,
        branch: DEFAULT_REF,
      }),
    })
    if (!res.ok) await fail(res)
    created += 1
  }
  return { created }
}

/** Write (create/update) an Actions secret using a sealed box. */
export async function putSecret(name: string, value: string): Promise<void> {
  const repo = getDataRepo()
  const keyRes = await fetch(`${API}/repos/${repo}/actions/secrets/public-key`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!keyRes.ok) await fail(keyRes)
  const { key, key_id } = (await keyRes.json()) as { key: string; key_id: string }

  const res = await fetch(`${API}/repos/${repo}/actions/secrets/${name}`, {
    method: 'PUT',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ encrypted_value: sealSecret(key, value), key_id }),
  })
  if (!res.ok) await fail(res)
}

/** Trigger the sync workflow. */
export async function dispatchSync(
  inputs: Record<string, string> = {},
  ref: string = DEFAULT_REF,
): Promise<void> {
  const res = await fetch(
    `${API}/repos/${getDataRepo()}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ref, inputs }),
    },
  )
  if (!res.ok) await fail(res)
}

export interface WorkflowRun {
  id: number
  status: string // queued | in_progress | completed
  conclusion: string | null // success | failure | cancelled | ...
  created_at: string
  html_url: string
}

/** The most recent sync workflow run, if any. */
export async function latestRun(): Promise<WorkflowRun | null> {
  const res = await fetch(
    `${API}/repos/${getDataRepo()}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
    { headers: headers(), cache: 'no-store' },
  )
  if (!res.ok) await fail(res)
  const body = (await res.json()) as { workflow_runs?: WorkflowRun[] }
  return body.workflow_runs?.[0] ?? null
}

export async function getRun(id: number): Promise<WorkflowRun> {
  const res = await fetch(`${API}/repos/${getDataRepo()}/actions/runs/${id}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) await fail(res)
  return (await res.json()) as WorkflowRun
}
