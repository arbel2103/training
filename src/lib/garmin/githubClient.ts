// All GitHub REST calls the app makes against the private data repo, authed
// with the user's fine-grained PAT (read from localStorage via pat.ts). Runs
// entirely in the browser; the GitHub API allows CORS for these endpoints.
import { getDataRepo, getPat } from './pat'
import { sealSecret } from './sealedBox'

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
  const res = await fetch(`${API}/repos/${getDataRepo()}`, { headers: headers() })
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

/** Write (create/update) an Actions secret using a sealed box. */
export async function putSecret(name: string, value: string): Promise<void> {
  const repo = getDataRepo()
  const keyRes = await fetch(
    `${API}/repos/${repo}/actions/secrets/public-key`,
    { headers: headers() },
  )
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
    `${API}/repos/${getDataRepo()}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`,
    { headers: headers() },
  )
  if (!res.ok) await fail(res)
  const body = (await res.json()) as { workflow_runs?: WorkflowRun[] }
  return body.workflow_runs?.[0] ?? null
}

export async function getRun(id: number): Promise<WorkflowRun> {
  const res = await fetch(`${API}/repos/${getDataRepo()}/actions/runs/${id}`, {
    headers: headers(),
  })
  if (!res.ok) await fail(res)
  return (await res.json()) as WorkflowRun
}
