import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Search, X, Send, ChevronDown, ChevronUp, Loader2, Sun, Moon } from 'lucide-react'
import KnowledgeGraphView from './KnowledgeGraphView'
import { fetchGraph, queryGraph } from './api'
import type { TalentNode, TalentEdge, ChatEntry } from './types'

const NODE_COLORS: Record<string, string> = {
  Person: '#4a9eda', Skill: '#5cb85c', Project: '#f0ad4e', Client: '#d9534f', Team: '#9b59b6',
}

function NodeSheet({ node, onClose }: { node: TalentNode; onClose: () => void }) {
  const skip = new Set(['name', 'id'])
  const props = Object.entries(node.properties).filter(([k]) => !skip.has(k))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 w-80 flex flex-col shadow-2xl"
        style={{ background: 'hsl(var(--popover))', borderLeft: '1px solid hsl(var(--border))' }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS[node.type] ?? '#888' }} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{node.type}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h2 className="text-base font-semibold text-foreground">{node.name}</h2>
          {props.length > 0 && (
            <div className="space-y-2">
              {props.map(([k, v]) => (
                <div key={k}>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <p className="text-xs text-foreground mt-0.5">{String(v ?? '—')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, setDark] as const
}

export default function App() {
  const [dark, setDark] = useDarkMode()
  const [nodes, setNodes] = useState<TalentNode[]>([])
  const [edges, setEdges] = useState<TalentEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [search, setSearch] = useState('')
  const [highlightedIds, setHighlightedIds] = useState(new Set<string>())

  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([])
  const [query, setQuery] = useState('')
  const [asking, setAsking] = useState(false)
  const [expandedCypher, setExpandedCypher] = useState<number | null>(null)

  const [selectedNode, setSelectedNode] = useState<TalentNode | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchGraph()
      .then(data => { setNodes(data.nodes); setEdges(data.edges) })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const graphData = useMemo(() => ({ nodes, edges }), [nodes, edges])

  const dimmedNodeIds = useMemo(() => {
    if (!search) return new Set<string>()
    const lower = search.toLowerCase()
    return new Set(nodes.filter(n => !n.name.toLowerCase().includes(lower)).map(n => n.id))
  }, [nodes, search])

  const handleAsk = useCallback(async () => {
    if (!query.trim() || asking) return
    const q = query.trim()
    setQuery('')
    setAsking(true)
    setChatHistory(prev => [...prev, { question: q, answer: null, cypher: '' }])
    const priorHistory = chatHistory.filter((h): h is { question: string; answer: string; cypher: string } => h.answer !== null)
    try {
      const result = await queryGraph(q, priorHistory)
      setChatHistory(prev => [...prev.slice(0, -1), { question: q, answer: result.answer, cypher: result.cypher }])
      setHighlightedIds(new Set(result.traversed_node_ids))
    } catch (e) {
      setChatHistory(prev => [...prev.slice(0, -1), { question: q, answer: `Error: ${e instanceof Error ? e.message : String(e)}`, cypher: '' }])
    }
    setAsking(false)
  }, [query, asking, chatHistory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() }
  }

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) setSelectedNode(node)
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center gap-3 px-5 flex-shrink-0" style={{ height: 52, background: 'hsl(var(--popover))', borderBottom: '1px solid hsl(var(--border))' }}>
        <span className="text-base font-bold" style={{ color: 'hsl(var(--accent))' }}>Talent Graph</span>
        <span className="text-xs text-muted-foreground">Engineering Resource Knowledge Graph</span>
        <div className="ml-auto flex items-center gap-3">
          {!loading && !loadError && (
            <span className="text-xs text-muted-foreground">{nodes.length} nodes · {edges.length} edges</span>
          )}
          <button
            onClick={() => setDark(d => !d)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            style={{ border: '1px solid hsl(var(--border))' }}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph panel */}
        <div className="flex-1 relative overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading graph…</span>
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: '#f87171' }}>
              Failed to load: {loadError}
            </div>
          ) : (
            <KnowledgeGraphView
              graphData={graphData}
              dimmedNodeIds={dimmedNodeIds}
              highlightedNodeIds={highlightedIds}
              onNodeClick={handleNodeClick}
            />
          )}

          {/* Floating search — top right of graph */}
          {!loading && !loadError && (
            <div className="absolute top-3 right-3 z-10 w-52">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  placeholder="Search nodes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-7 h-8 text-xs rounded-lg outline-none"
                  style={{
                    background: 'hsl(var(--background) / 0.85)',
                    border: '1px solid hsl(var(--border))',
                    backdropFilter: 'blur(4px)',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="w-96 flex-shrink-0 flex flex-col" style={{ background: 'hsl(var(--popover))', borderLeft: '1px solid hsl(var(--border))' }}>
          <div className="px-4 py-3 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--accent))' }}>Query</p>
            {chatHistory.length > 0 && (
              <button
                onClick={() => { setChatHistory([]); setHighlightedIds(new Set()) }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatHistory.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">
                Ask a question to explore the talent graph. Matched nodes will glow gold.
              </p>
            )}
            {chatHistory.map((entry, i) => (
              <div key={i} className="rounded-lg p-3 space-y-2 text-sm" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--accent))' }}>{entry.question}</p>
                {entry.answer === null ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Thinking…</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{entry.answer}</p>
                    {entry.cypher && (
                      <div>
                        <button
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          style={{ fontSize: '10px' }}
                          onClick={() => setExpandedCypher(expandedCypher === i ? null : i)}
                        >
                          {expandedCypher === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          Cypher
                        </button>
                        {expandedCypher === i && (
                          <pre
                            className="mt-1.5 rounded p-2 text-[10px] overflow-x-auto"
                            style={{ background: 'hsl(var(--popover))', color: '#93c5fd', border: '1px solid hsl(var(--border))' }}
                          >
                            {entry.cypher}
                          </pre>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Reset highlight */}
          {highlightedIds.size > 0 && (
            <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button
                onClick={() => setHighlightedIds(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                × Clear highlight ({highlightedIds.size} nodes)
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Who has Kafka and AWS experience and is available?"
              rows={3}
              className="w-full text-xs rounded-lg p-2.5 resize-none outline-none"
              style={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
              onFocus={e => (e.target.style.borderColor = 'hsl(var(--accent))')}
              onBlur={e => (e.target.style.borderColor = 'hsl(var(--border))')}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for newline</span>
              <button
                onClick={handleAsk}
                disabled={asking || !query.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: 'hsl(var(--accent))' }}
              >
                {asking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedNode && <NodeSheet node={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  )
}
