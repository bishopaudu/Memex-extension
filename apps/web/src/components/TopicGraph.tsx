import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { graphApi, topicsApi } from '../lib/api'

interface GraphNode {
  id:         string
  title:      string
  emoji:      string
  coverColor: string
  refCount:   number
  linkCount:  number
  x?:         number
  y?:         number
  fx?:        number | null
  fy?:        number | null
}

interface GraphEdge {
  id?:    string
  source: string | GraphNode
  target: string | GraphNode
  label:  string | null
}

interface HoverCard {
  node:    GraphNode
  screenX: number
  screenY: number
}

interface Props {
  theme:       'dark' | 'light'
  onOpenTopic: (id: string) => void
  onClose:     () => void
}

export function TopicGraph({ theme, onOpenTopic, onClose }: Props) {
  const svgRef            = useRef<SVGSVGElement>(null)
  const simulationRef     = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)
  const nodesRef          = useRef<GraphNode[]>([])
  const edgesRef          = useRef<GraphEdge[]>([])

  const [loading,       setLoading]       = useState(true)
  const [nodeCount,     setNodeCount]     = useState(0)
  const [edgeCount,     setEdgeCount]     = useState(0)
  const [searchQ,       setSearchQ]       = useState('')
  const [hoverCard,     setHoverCard]     = useState<HoverCard | null>(null)
  const [orphanCount,   setOrphanCount]   = useState(0)
  const [showOrphans,   setShowOrphans]   = useState(false)
  const [draggingFrom,  setDraggingFrom]  = useState<string | null>(null)
  const [connectMsg,    setConnectMsg]    = useState<string | null>(null)
  const [mode,          setMode]          = useState<'navigate' | 'connect'>('navigate')

  const isDark   = theme === 'dark'
  const C = {
    bg:          isDark ? '#0a0a0a'  : '#f5f5f5',
    surface:     isDark ? '#111111'  : '#ffffff',
    border:      isDark ? '#1e1e1e'  : '#e5e5e5',
    edge:        isDark ? '#2a2a2a'  : '#cccccc',
    edgeHover:   '#4f6ef7',
    text:        isDark ? '#e2e2e2'  : '#111111',
    textMuted:   isDark ? '#555555'  : '#999999',
    orphan:      '#f59e0b',
    connected:   '#10b981',
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => { loadAndDraw() }, [theme])

  // Search — highlight matching nodes
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    if (!searchQ) {
      svg.selectAll<SVGGElement, GraphNode>('.node')
        .attr('opacity', 1)
      return
    }

    svg.selectAll<SVGGElement, GraphNode>('.node')
      .attr('opacity', d =>
        d.title.toLowerCase().includes(searchQ.toLowerCase()) ? 1 : 0.15
      )
  }, [searchQ])

  async function loadAndDraw() {
    setLoading(true)
    const r = await graphApi.getTopicGraph()
    setLoading(false)
    if (r.error || !svgRef.current) return

    const { nodes, edges } = r.data
    nodesRef.current = nodes
    edgesRef.current = edges
    setNodeCount(nodes.length)
    setEdgeCount(edges.length)
    setOrphanCount(nodes.filter(n => {
      const hasEdge = edges.some(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source
        const tgt = typeof e.target === 'object' ? e.target.id : e.target
        return src === n.id || tgt === n.id
      })
      return !hasEdge
    }).length)

    if (nodes.length === 0) return
    setTimeout(() => drawGraph(nodes, edges), 50)
  }

  function nodeRadius(d: GraphNode) {
    return 28 + Math.min(d.refCount * 3, 18)
  }

  function isOrphan(node: GraphNode, edges: GraphEdge[]) {
    return !edges.some(e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source
      const tgt = typeof e.target === 'object' ? e.target.id : e.target
      return src === node.id || tgt === node.id
    })
  }

  function drawGraph(rawNodes: GraphNode[], rawEdges: GraphEdge[]) {
    const svg    = d3.select(svgRef.current!)
    const width  = svgRef.current!.clientWidth  || 800
    const height = svgRef.current!.clientHeight || 600

    svg.selectAll('*').remove()

    const root = svg.append('g').attr('class', 'root')

    // ── ZOOM ──
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', e => root.attr('transform', e.transform.toString()))

    svg.call(zoom as any)
    svg.call(zoom.transform as any,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85)
    )

    // ── DEFS ──
    const defs = svg.append('defs')

    // Arrow markers
    ;['default', 'hover', 'orphan'].forEach(id => {
      const color = id === 'hover' ? C.edgeHover : id === 'orphan' ? C.orphan : C.edge
      defs.append('marker').attr('id', `arrow-${id}`)
        .attr('viewBox', '0 -4 8 8').attr('refX', 22).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', color)
    })

    // Glow filter
    const glow = defs.append('filter').attr('id', 'node-glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur')
    const merge = glow.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // ── SIMULATION ──
    const simulation = d3.forceSimulation<GraphNode>(rawNodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(rawEdges)
        .id(d => d.id).distance(180).strength(0.4))
      .force('charge',  d3.forceManyBody<GraphNode>().strength(-500))
      .force('center',  d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide<GraphNode>(d => nodeRadius(d) + 20))

    simulationRef.current = simulation

    // ── DRAG-TO-CONNECT LINE ──
    const connectLine = root.append('line')
      .attr('class', 'connect-line')
      .attr('stroke', C.edgeHover)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3')
      .attr('opacity', 0)
      .attr('pointer-events', 'none')

    // Track mouse for connect mode
    svg.on('mousemove.connect', (event) => {
      if (!draggingFromRef.current) return
      const [mx, my] = d3.pointer(event, root.node())
      const srcNode = rawNodes.find(n => n.id === draggingFromRef.current)
      if (!srcNode) return
      connectLine
        .attr('x1', srcNode.x ?? 0).attr('y1', srcNode.y ?? 0)
        .attr('x2', mx).attr('y2', my)
        .attr('opacity', 1)
    })

    svg.on('click.connect', () => {
      if (draggingFromRef.current) {
        draggingFromRef.current = null
        setDraggingFrom(null)
        connectLine.attr('opacity', 0)
      }
    })

    // ── EDGES ──
    const linkGroup = root.append('g')

    const drawLinks = () => {
      const links = linkGroup.selectAll<SVGGElement, GraphEdge>('.link-group')
        .data(rawEdges, (d: any) => `${typeof d.source === 'object' ? d.source.id : d.source}-${typeof d.target === 'object' ? d.target.id : d.target}`)

      const enter = links.enter().append('g').attr('class', 'link-group')

      enter.append('line')
        .attr('class', 'link-line')
        .attr('stroke', C.edge).attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5)
        .attr('marker-end', d => {
          const src = typeof d.source === 'object' ? d.source.id : d.source
          const orphanSrc = rawNodes.find(n => n.id === src)
          return orphanSrc && isOrphan(orphanSrc, rawEdges)
            ? 'url(#arrow-orphan)' : 'url(#arrow-default)'
        })

      enter.append('text')
        .attr('class', 'link-label')
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('fill', C.textMuted)
        .attr('opacity', 0.7)
        .text((d: GraphEdge) => d.label ?? '')

      return linkGroup.selectAll<SVGGElement, GraphEdge>('.link-group')
    }

    let linkGroups = drawLinks()

    // ── NODES ──
    const nodeGroup = root.append('g')

    const nodeEl = nodeGroup
      .selectAll<SVGGElement, GraphNode>('.node')
      .data(rawNodes, (d: GraphNode) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')

    // Drag behavior
    nodeEl.call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x ?? 0; d.fy = d.y ?? 0
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        }) as any
    )

    // Glow ring
    nodeEl.append('circle').attr('class', 'glow-ring')
      .attr('r', d => nodeRadius(d) + 10)
      .attr('fill', 'transparent')
      .attr('stroke', d => d.coverColor)
      .attr('stroke-width', 2.5)
      .attr('opacity', 0)
      .attr('filter', 'url(#node-glow)')

    // Orphan indicator ring
    nodeEl.filter(d => isOrphan(d, rawEdges))
      .append('circle').attr('class', 'orphan-ring')
      .attr('r', d => nodeRadius(d) + 5)
      .attr('fill', 'transparent')
      .attr('stroke', C.orphan)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.7)

    // Main circle
    nodeEl.append('circle').attr('class', 'main-circle')
      .attr('r', nodeRadius)
      .attr('fill', d => d.coverColor + (isDark ? '20' : '15'))
      .attr('stroke', d => isOrphan(d, rawEdges) ? C.orphan : d.coverColor + '70')
      .attr('stroke-width', d => isOrphan(d, rawEdges) ? 2 : 1.5)

    // Emoji
    nodeEl.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 18).attr('y', -10).attr('pointer-events', 'none')
      .text(d => d.emoji)

    // Title
    nodeEl.append('text')
      .attr('text-anchor', 'middle').attr('y', 14)
      .attr('font-size', 11).attr('font-weight', '500')
      .attr('fill', C.text).attr('pointer-events', 'none')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
      .text(d => d.title.length > 18 ? d.title.slice(0, 16) + '…' : d.title)

    // Ref count badge
    nodeEl.filter(d => d.refCount > 0).append('circle')
      .attr('cx', d => nodeRadius(d) - 2).attr('cy', d => -(nodeRadius(d) - 2))
      .attr('r', 8).attr('fill', d => d.coverColor)

    nodeEl.filter(d => d.refCount > 0).append('text')
      .attr('x', d => nodeRadius(d) - 2).attr('y', d => -(nodeRadius(d) - 2))
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 8).attr('font-weight', 700).attr('fill', '#fff')
      .attr('pointer-events', 'none').text(d => d.refCount)

    // ── EVENTS ──
    nodeEl
      .on('mouseenter', function(event, d) {
        if (draggingFromRef.current) return

        // Show glow
        d3.select(this).select('.glow-ring')
          .transition().duration(150).attr('opacity', 0.5)
        d3.select(this).select('.main-circle')
          .transition().duration(150).attr('r', nodeRadius(d) + 4)

        // Highlight connections
        linkGroups.select('.link-line')
          .attr('stroke', (e: GraphEdge) => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === d.id || tgt === d.id) ? C.edgeHover : C.edge
          })
          .attr('stroke-opacity', (e: GraphEdge) => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === d.id || tgt === d.id) ? 1 : 0.1
          })
          .attr('stroke-width', (e: GraphEdge) => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === d.id || tgt === d.id) ? 2.5 : 1.5
          })

        // Show hover card
        const svgRect = svgRef.current!.getBoundingClientRect()
        const transform = d3.zoomTransform(svgRef.current!)
        const sx = transform.applyX(d.x ?? 0) + svgRect.left
        const sy = transform.applyY(d.y ?? 0) + svgRect.top
        setHoverCard({ node: d, screenX: sx, screenY: sy })
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('.glow-ring')
          .transition().duration(150).attr('opacity', 0)
        d3.select(this).select('.main-circle')
          .transition().duration(150).attr('r', nodeRadius(d))

        linkGroups.select('.link-line')
          .attr('stroke', C.edge)
          .attr('stroke-opacity', 0.5)
          .attr('stroke-width', 1.5)

        setHoverCard(null)
      })
      .on('click', async (event, d) => {
        event.stopPropagation()

        // Connect mode
        if (modeRef.current === 'connect') {
          if (!draggingFromRef.current) {
            draggingFromRef.current = d.id
            setDraggingFrom(d.id)
            // Start connect line from this node
            connectLine
              .attr('x1', d.x ?? 0).attr('y1', d.y ?? 0)
              .attr('x2', d.x ?? 0).attr('y2', d.y ?? 0)
              .attr('opacity', 1)
            setConnectMsg(`Click another topic to connect to "${d.title}"`)
            return
          }

          // Second click — create connection
          const fromId = draggingFromRef.current
          if (fromId === d.id) {
            draggingFromRef.current = null
            setDraggingFrom(null)
            connectLine.attr('opacity', 0)
            setConnectMsg(null)
            return
          }

          // Check not already connected
          const alreadyConnected = rawEdges.some(e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === fromId && tgt === d.id) || (src === d.id && tgt === fromId)
          })

          if (alreadyConnected) {
            setConnectMsg('These topics are already connected')
            setTimeout(() => setConnectMsg(null), 2000)
            draggingFromRef.current = null
            setDraggingFrom(null)
            connectLine.attr('opacity', 0)
            return
          }

          // Create connection via API
          await topicsApi.connect(fromId, d.id)

          // Add edge to local graph immediately
          const newEdge: GraphEdge = { source: fromId, target: d.id, label: null }
          rawEdges.push(newEdge)
          simulation.force('link',
            d3.forceLink<GraphNode, GraphEdge>(rawEdges)
              .id(n => n.id).distance(180).strength(0.4)
          )
          linkGroups = drawLinks()
          simulation.alpha(0.3).restart()

          // Update orphan count
          setOrphanCount(rawNodes.filter(n => isOrphan(n, rawEdges)).length)
          setEdgeCount(rawEdges.length)

          draggingFromRef.current = null
          setDraggingFrom(null)
          connectLine.attr('opacity', 0)
          setConnectMsg(`✓ Connected "${rawNodes.find(n => n.id === fromId)?.title}" → "${d.title}"`)
          setTimeout(() => setConnectMsg(null), 2500)
          return
        }

        // Navigate mode — open topic
        d3.select(event.currentTarget).select('.main-circle')
          .transition().duration(80).attr('r', nodeRadius(d) + 12)
          .transition().duration(80).attr('r', nodeRadius(d))
          .on('end', () => { onOpenTopic(d.id); onClose() })
      })

    // ── SIMULATION TICK ──
    simulation.on('tick', () => {
      linkGroups.select('.link-line')
        .attr('x1', (d: GraphEdge) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d: GraphEdge) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d: GraphEdge) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d: GraphEdge) => (d.target as GraphNode).y ?? 0)

      linkGroups.select('.link-label')
        .attr('x', (d: GraphEdge) =>
          (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
        .attr('y', (d: GraphEdge) =>
          (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2)

      nodeEl.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })
  }

  // Refs for closures (avoid stale state in D3 callbacks)
  const draggingFromRef = useRef<string | null>(null)
  const modeRef         = useRef<'navigate' | 'connect'>('navigate')

  // Keep refs in sync with state
  useEffect(() => { draggingFromRef.current = draggingFrom }, [draggingFrom])
  useEffect(() => { modeRef.current = mode }, [mode])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col"
         style={{ background: C.bg }}>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
           style={{ borderBottom: `0.5px solid ${C.border}` }}>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-1 flex items-center gap-2">
            🕸️ Knowledge Graph
          </span>

          {!loading && (
            <div className="flex items-center gap-2 text-[10px]"
                 style={{ color: C.textMuted }}>
              <span>{nodeCount} topics</span>
              {edgeCount > 0 && <><span style={{ color: C.border }}>·</span>
                <span>{edgeCount} connections</span></>}
              {orphanCount > 0 && (
                <button
                  onClick={() => setShowOrphans(!showOrphans)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full
                             transition-colors"
                  style={{
                    background: C.orphan + '20',
                    border:     `0.5px solid ${C.orphan}40`,
                    color:      C.orphan,
                  }}
                >
                  ⚠ {orphanCount} isolated
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3"
                 style={{ color: C.textMuted }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-40 text-xs outline-none rounded-lg"
              style={{
                background: C.surface,
                border:     `0.5px solid ${C.border}`,
                color:      C.text,
              }}
            />
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden"
               style={{ border: `0.5px solid ${C.border}` }}>
            <button
              onClick={() => { setMode('navigate'); setDraggingFrom(null); setConnectMsg(null) }}
              className="px-3 py-1.5 text-[11px] transition-colors"
              style={{
                background: mode === 'navigate' ? '#4f6ef7' : C.surface,
                color:      mode === 'navigate' ? '#fff'    : C.textMuted,
              }}
              title="Navigate — click to open topics"
            >
              🖱 Navigate
            </button>
            <button
              onClick={() => setMode('connect')}
              className="px-3 py-1.5 text-[11px] transition-colors"
              style={{
                background: mode === 'connect' ? '#10b981' : C.surface,
                color:      mode === 'connect' ? '#fff'    : C.textMuted,
                borderLeft: `0.5px solid ${C.border}`,
              }}
              title="Connect — click two topics to link them"
            >
              🔗 Connect
            </button>
          </div>

          <p className="text-[10px] hidden md:block" style={{ color: C.textMuted }}>
            Scroll to zoom · Drag nodes
          </p>

          {/* Zoom buttons */}
          <div className="flex gap-1">
            {['+', '−'].map((sym, i) => (
              <button key={sym}
                onClick={() => {
                  const s = d3.select(svgRef.current!)
                  s.transition().duration(250).call(
                    d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
                    i === 0 ? 1.4 : 0.7
                  )
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           text-sm font-light transition-colors"
                style={{ background: C.surface, border: `0.5px solid ${C.border}`,
                         color: C.text }}
              >{sym}</button>
            ))}
          </div>

          <button onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             transition-colors"
                  style={{ background: C.surface, border: `0.5px solid ${C.border}`,
                           color: C.textMuted }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6"  y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      {(connectMsg || mode === 'connect' || draggingFrom) && (
        <div className="flex items-center justify-center py-2 text-xs flex-shrink-0"
             style={{ background: '#10b98115', borderBottom: `0.5px solid #10b98130`,
                      color: connectMsg?.startsWith('✓') ? '#10b981' : '#e2e2e2' }}>
          {connectMsg
            ? connectMsg
            : draggingFrom
              ? `Now click another topic to connect it`
              : `🔗 Connect mode — click any topic to start linking`}
        </div>
      )}

      {/* ── ORPHAN PANEL ── */}
      {showOrphans && orphanCount > 0 && (
        <div className="absolute top-16 left-4 z-10 rounded-xl shadow-xl p-3 w-56"
             style={{ background: C.surface, border: `0.5px solid ${C.orphan}40` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: C.orphan }}>
              ⚠ Isolated topics ({orphanCount})
            </p>
            <button onClick={() => setShowOrphans(false)}
                    className="text-xs" style={{ color: C.textMuted }}>×</button>
          </div>
          <p className="text-[10px] mb-2" style={{ color: C.textMuted }}>
            These topics have no connections. Link them to others to build your
            knowledge network.
          </p>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {nodesRef.current
              .filter(n => isOrphan(n, edgesRef.current))
              .map(n => (
                <div key={n.id}
                     className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                     style={{ background: C.orphan + '10' }}>
                  <span className="text-sm">{n.emoji}</span>
                  <span className="text-[11px] truncate flex-1"
                        style={{ color: C.text }}>{n.title}</span>
                  <button
                    onClick={() => {
                      setMode('connect')
                      setShowOrphans(false)
                      setConnectMsg(`Click a topic to connect "${n.title}"`)
                      draggingFromRef.current = n.id
                      setDraggingFrom(n.id)
                    }}
                    className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: C.orphan + '30', color: C.orphan }}>
                    Link
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── SVG CANVAS ── */}
      <div className="flex-1 relative overflow-hidden">

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent
                              rounded-full animate-spin" />
              <p className="text-xs" style={{ color: C.textMuted }}>Loading graph...</p>
            </div>
          </div>
        )}

        {!loading && nodeCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center
                          text-center gap-4">
            <div className="text-5xl">🕸️</div>
            <p className="text-sm font-medium text-ink-2">No topics yet</p>
            <p className="text-xs" style={{ color: C.textMuted }}>
              Create topics in the Wiki to see the graph
            </p>
            <button onClick={onClose} className="text-xs text-brand-bright hover:underline">
              ← Back to Wiki
            </button>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full"
             style={{ opacity: loading || nodeCount === 0 ? 0 : 1,
                      transition: 'opacity 0.3s',
                      cursor: mode === 'connect' ? 'crosshair' : 'default' }} />

        {/* ── HOVER CARD ── */}
        {hoverCard && mode === 'navigate' && (
          <HoverCardComponent
            card={hoverCard}
            theme={theme}
            colors={C}
            onOpen={() => { onOpenTopic(hoverCard.node.id); onClose() }}
          />
        )}

        {/* ── LEGEND ── */}
        {!loading && nodeCount > 0 && (
          <div className="absolute bottom-4 left-4 px-3 py-2.5 rounded-xl text-[10px]"
               style={{ background: C.surface + 'dd', border: `0.5px solid ${C.border}`,
                        backdropFilter: 'blur(8px)' }}>
            <p className="font-medium mb-2" style={{ color: C.textMuted }}>Legend</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full"
                     style={{ background: '#4f6ef720', border: '1.5px solid #4f6ef760' }} />
                <span style={{ color: C.textMuted }}>Topic (size = refs)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full"
                     style={{ border: `1.5px dashed ${C.orphan}`, background: C.orphan + '15' }} />
                <span style={{ color: C.orphan }}>Isolated topic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 flex-shrink-0" style={{ background: C.edge }} />
                <span style={{ color: C.textMuted }}>Connection</span>
              </div>
            </div>
          </div>
        )}

        {/* Tip for single node */}
        {!loading && nodeCount === 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2
                          rounded-full text-[11px] flex items-center gap-2"
               style={{ background: C.surface, border: `0.5px solid ${C.border}`,
                        color: C.textMuted }}>
            💡 Create more topics and switch to Connect mode to link them
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Hover Card Component
// ─────────────────────────────────────────────
function HoverCardComponent({ card, theme, colors, onOpen }: {
  card:   HoverCard
  theme:  'dark' | 'light'
  colors: Record<string, string>
  onOpen: () => void
}) {
  const { node, screenX, screenY } = card

  // Position card above/below node based on screen position
  const svgEl  = document.querySelector('svg')
  const svgH   = svgEl?.clientHeight ?? 600
  const svgW   = svgEl?.clientWidth  ?? 800
  const above  = screenY > svgH * 0.6
  const left   = screenX > svgW * 0.7

  return (
    <div
      className="absolute z-20 w-52 rounded-xl shadow-2xl pointer-events-none
                 transition-all duration-150"
      style={{
        background:  colors.surface,
        border:      `0.5px solid ${node.coverColor}40`,
        left:        left ? screenX - 220 : screenX + 20,
        top:         above ? screenY - 160 : screenY + 20,
      }}
    >
      {/* Color accent */}
      <div className="h-1 rounded-t-xl" style={{ background: node.coverColor }} />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{node.emoji}</span>
          <p className="text-xs font-semibold leading-snug" style={{ color: colors.text }}>
            {node.title}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke={colors.textMuted} strokeWidth={2}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
            <span className="text-[10px]" style={{ color: colors.textMuted }}>
              {node.refCount} refs
            </span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke={colors.textMuted} strokeWidth={2}>
              <circle cx="5"  cy="12" r="2"/>
              <circle cx="19" cy="5"  r="2"/>
              <circle cx="19" cy="19" r="2"/>
              <line x1="7"  y1="11.5" x2="17" y2="6.5"/>
              <line x1="7"  y1="12.5" x2="17" y2="17.5"/>
            </svg>
            <span className="text-[10px]" style={{ color: colors.textMuted }}>
              {node.linkCount} links
            </span>
          </div>
        </div>

        {/* Open hint */}
        <p className="text-[9px] pointer-events-none"
           style={{ color: colors.textMuted }}>
          Click to open topic →
        </p>
      </div>
    </div>
  )
}
