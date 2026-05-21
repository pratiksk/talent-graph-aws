import type { GraphData, QueryResult } from './types'

const BASE: string = (window as Window & { API_BASE?: string }).API_BASE ?? 'http://localhost:8000/api'

export async function fetchGraph(): Promise<GraphData> {
  const res = await fetch(`${BASE}/graph`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = await res.json()
  return {
    nodes: raw.nodes.map((n: Record<string, unknown>) => ({
      id: n.id,
      type: n.label,
      name: (n.properties as Record<string, unknown>)?.name ?? n.label,
      properties: n.properties,
    })),
    edges: raw.edges.map((e: Record<string, unknown>) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.label,
    })),
  }
}

export async function queryGraph(
  question: string,
  history: Array<{ question: string; answer: string; cypher: string }> = [],
): Promise<QueryResult> {
  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
