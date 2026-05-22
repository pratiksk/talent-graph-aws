import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { TalentNode, TalentEdge, GraphData } from './types'

type FgRef = {
  zoomToFit: (duration?: number, padding?: number) => void
  centerAt: (x?: number, y?: number, duration?: number) => void
  zoom: (zoomLevel?: number, duration?: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d3Force: (name: string, force?: unknown) => any
}

const NODE_TYPE_HEX: Record<string, string> = {
  Person:  '#4a9eda',
  Skill:   '#5cb85c',
  Project: '#f0ad4e',
  Client:  '#d9534f',
  Team:    '#9b59b6',
}

const NODE_TYPE_LABELS: Record<string, string> = {
  Person:  'Person',
  Skill:   'Skill',
  Project: 'Project',
  Client:  'Client',
  Team:    'Team',
}

const EDGE_COLORS: Record<string, string> = {
  HAS_SKILL:  '#22c55e',
  WORKED_ON:  '#60a5fa',
  MEMBER_OF:  '#a855f7',
  FOR_CLIENT: '#f97316',
  USED_SKILL: '#34d399',
  DELIVERED:  '#fb923c',
}

const EDGE_LABELS: Record<string, string> = {
  HAS_SKILL:  'Has Skill',
  WORKED_ON:  'Worked On',
  MEMBER_OF:  'Member Of',
  FOR_CLIENT: 'For Client',
  USED_SKILL: 'Used Skill',
  DELIVERED:  'Delivered',
}

interface KnowledgeGraphViewProps {
  graphData: Pick<GraphData, 'nodes' | 'edges'>
  dimmedNodeIds: Set<string>
  highlightedNodeIds: Set<string>
  onNodeClick: (nodeId: string) => void
}

export default function KnowledgeGraphView({
  graphData,
  dimmedNodeIds,
  highlightedNodeIds,
  onNodeClick,
}: KnowledgeGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<FgRef>(null)
  const hasFit = useRef(false)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<(TalentNode & { x?: number; y?: number; val?: number }) | null>(null)
  const [hoveredLink, setHoveredLink] = useState<TalentEdge | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { hasFit.current = false }, [graphData])

  // Configure d3 forces after mount so nodes spread out adequately
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('charge')?.strength(-180).distanceMax(400)
    fg.d3Force('link')?.distance(70)
  }, [])

  const handleEngineStop = useCallback(() => {
    if (!hasFit.current) {
      hasFit.current = true
      fgRef.current?.zoomToFit(800, 60)
    }
  }, [])


  const degreeMap = useMemo(() => {
    const map: Record<string, number> = {}
    graphData.edges.forEach(e => {
      map[e.source] = (map[e.source] || 0) + 1
      map[e.target] = (map[e.target] || 0) + 1
    })
    return map
  }, [graphData.edges])

  const neighborIds = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const ids = new Set<string>()
    graphData.edges.forEach(e => {
      const src = typeof e.source === 'object' ? (e.source as unknown as { id: string }).id : e.source
      const tgt = typeof e.target === 'object' ? (e.target as unknown as { id: string }).id : e.target
      if (src === hoveredNode.id || tgt === hoveredNode.id) { ids.add(src); ids.add(tgt) }
    })
    return ids
  }, [hoveredNode, graphData.edges])

  const fgData = useMemo(() => ({
    nodes: graphData.nodes.map(n => ({ ...n, val: Math.max(1, degreeMap[n.id] || 1) })),
    links: graphData.edges.map(e => ({ source: e.source, target: e.target, type: e.type })),
  }), [graphData, degreeMap])

  const nodeCanvasObject = useCallback(
    (node: Record<string, unknown>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as unknown as TalentNode & { x: number; y: number; val: number }
      const r = Math.sqrt(Math.max(1, n.val)) * 1.8 + 2
      const isHovered = hoveredNode?.id === n.id
      const isNeighbor = hoveredNode ? neighborIds.has(n.id) : false
      const isActive = !hoveredNode || isHovered || isNeighbor
      const isDimmedBySearch = dimmedNodeIds.size > 0 && dimmedNodeIds.has(n.id)
      const isHighlighted = highlightedNodeIds.size > 0 && highlightedNodeIds.has(n.id)
      const hasHighlights = highlightedNodeIds.size > 0
      const baseColor = NODE_TYPE_HEX[n.type] || '#94a3b8'

      let alpha: number
      if (isDimmedBySearch) alpha = 0.06
      else if (isHovered || isNeighbor) alpha = 1
      else if (hoveredNode) alpha = 0.12
      else if (hasHighlights) alpha = isHighlighted ? 1 : 0.15
      else alpha = 1

      ctx.save()
      ctx.globalAlpha = alpha

      // Outer glow for highlighted nodes (cyan ring, distinct from all type colors)
      if (isHighlighted) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 6, 0, 2 * Math.PI)
        ctx.fillStyle = '#00d8ff22'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 3, 0, 2 * Math.PI)
        ctx.strokeStyle = '#00d8ff'
        ctx.lineWidth = 2 / globalScale
        ctx.stroke()
      } else if (isHovered) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 5, 0, 2 * Math.PI)
        ctx.fillStyle = baseColor + '33'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
      ctx.fillStyle = baseColor
      ctx.fill()

      if (isHovered) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5 / globalScale
        ctx.stroke()
      }

      if (globalScale >= 3 && !isDimmedBySearch) {
        const fontSize = Math.max(7, 10 / globalScale)
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.lineWidth = 3 / globalScale
        ctx.lineJoin = 'round'
        ctx.fillStyle = isActive ? '#1e293b' : '#94a3b8'
        const maxChars = Math.min(40, Math.floor(18 * globalScale))
        const label = n.name.length > maxChars ? n.name.slice(0, maxChars) + '…' : n.name
        const y = n.y + r + 2 / globalScale
        ctx.strokeText(label, n.x, y)
        ctx.fillText(label, n.x, y)
      }

      ctx.restore()
    },
    [hoveredNode, neighborIds, dimmedNodeIds, highlightedNodeIds],
  )

  const nodePointerAreaPaint = useCallback(
    (node: Record<string, unknown>, color: string, ctx: CanvasRenderingContext2D) => {
      const n = node as { x: number; y: number; val: number }
      const r = Math.sqrt(Math.max(1, n.val)) * 1.8 + 6
      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
    },
    [],
  )

  const getLinkColor = useCallback(
    (link: Record<string, unknown>) => {
      const src = typeof link.source === 'object' ? (link.source as { id: string }).id : (link.source as string)
      const tgt = typeof link.target === 'object' ? (link.target as { id: string }).id : (link.target as string)
      const isNodeEdge = hoveredNode && (src === hoveredNode.id || tgt === hoveredNode.id)
      const isLinkEdge = hoveredLink === (link as unknown as TalentEdge)
      const base = EDGE_COLORS[link.type as string] || '#64748b'
      if (isNodeEdge || isLinkEdge) return base
      if (hoveredNode) return 'rgba(100,116,139,0.08)'
      return base + '66'
    },
    [hoveredNode, hoveredLink],
  )

  const getLinkWidth = useCallback(
    (link: Record<string, unknown>) => {
      const src = typeof link.source === 'object' ? (link.source as { id: string }).id : (link.source as string)
      const tgt = typeof link.target === 'object' ? (link.target as { id: string }).id : (link.target as string)
      const isNodeEdge = hoveredNode && (src === hoveredNode.id || tgt === hoveredNode.id)
      return isNodeEdge || hoveredLink === (link as unknown as TalentEdge) ? 2 : 1
    },
    [hoveredNode, hoveredLink],
  )

  const tooltipStyle = (x: number, y: number): React.CSSProperties => {
    const w = dimensions.width
    const h = dimensions.height
    return {
      left: x + 14 > w - 240 ? x - 240 : x + 14,
      top: y - 10 < 0 ? 4 : y + 120 > h ? y - 120 : y - 10,
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-background"
      onMouseMove={e => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
    >
      <ForceGraph2D
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={fgRef as any}
        graphData={fgData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="transparent"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        nodeLabel={() => ''}
        onNodeClick={node => onNodeClick((node as unknown as TalentNode).id)}
        onNodeHover={node => setHoveredNode(node ? (node as unknown as TalentNode & { x: number; y: number; val: number }) : null)}
        onLinkHover={link => setHoveredLink(link ? (link as unknown as TalentEdge) : null)}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={getLinkColor}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleColor={getLinkColor}
        linkCurvature={0.1}
        cooldownTicks={200}
        onEngineStop={handleEngineStop}
        enableNodeDrag
      />

      {/* Node hover tooltip */}
      {hoveredNode && !hoveredLink && (
        <div
          className="absolute pointer-events-none z-20 max-w-[220px] rounded-lg shadow-lg p-2.5 text-xs space-y-1.5"
          style={{
            ...tooltipStyle(mousePos.x, mousePos.y),
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NODE_TYPE_HEX[hoveredNode.type] }} />
            <span className="font-medium text-muted-foreground">{NODE_TYPE_LABELS[hoveredNode.type] || hoveredNode.type}</span>
          </div>
          <p className="text-foreground leading-snug">{hoveredNode.name}</p>
          <p className="text-muted-foreground" style={{ fontSize: '10px' }}>Click to open</p>
        </div>
      )}

      {/* Link hover tooltip */}
      {hoveredLink && (
        <div
          className="absolute pointer-events-none z-20 max-w-[200px] rounded-lg shadow-lg p-2.5 text-xs"
          style={{
            ...tooltipStyle(mousePos.x, mousePos.y),
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 rounded shrink-0" style={{ height: '2px', backgroundColor: EDGE_COLORS[hoveredLink.type] || '#64748b' }} />
            <span className="font-semibold text-foreground">{EDGE_LABELS[hoveredLink.type] || hoveredLink.type}</span>
          </div>
        </div>
      )}

      {/* Edge type legend — bottom left */}
      <div
        className="absolute bottom-4 left-4 rounded-lg p-2.5 text-[10px] space-y-1.5"
        style={{ background: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(4px)', border: '1px solid hsl(var(--border))' }}
      >
        <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-2" style={{ fontSize: '9px' }}>Connections</p>
        {Object.entries(EDGE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="inline-block w-4 rounded shrink-0" style={{ height: '2px', backgroundColor: EDGE_COLORS[type] }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Node type legend — bottom right */}
      <div
        className="absolute bottom-4 right-4 rounded-lg p-2.5 text-[10px] space-y-1.5"
        style={{ background: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(4px)', border: '1px solid hsl(var(--border))' }}
      >
        <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-2" style={{ fontSize: '9px' }}>Node Types</p>
        {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NODE_TYPE_HEX[type] }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1 pt-1" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ boxShadow: '0 0 0 2px #00d8ff', backgroundColor: 'transparent' }} />
          <span className="text-muted-foreground" style={{ color: '#00d8ff' }}>Query match</span>
        </div>
      </div>

      {/* Hint text */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none select-none text-muted-foreground" style={{ fontSize: '10px', opacity: 0.6 }}>
        Scroll to zoom · Drag to pan · Hover for details · Click to open
      </div>
    </div>
  )
}
