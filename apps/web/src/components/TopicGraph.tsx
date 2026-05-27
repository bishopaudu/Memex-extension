import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { graphApi } from '../lib/api'

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
  source: string | GraphNode
  target: string | GraphNode
  label:  string | null
}

interface Props {
  theme:       'dark' | 'light'
  onOpenTopic: (id: string) => void
  onClose:     () => void
}

export function TopicGraph({ theme, onOpenTopic, onClose }: Props) {
  const svgRef      = useRef<SVGSVGElement>(null)
  const [loading,   setLoading]   = useState(true)
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Theme-aware colors
  const colors = {
    bg:        theme === 'dark' ? '#0a0a0a'  : '#f5f5f5',
    surface:   theme === 'dark' ? '#111111'  : '#ffffff',
    border:    theme === 'dark' ? '#1e1e1e'  : '#e5e5e5',
    edge:      theme === 'dark' ? '#2a2a2a'  : '#cccccc',
    edgeHover: theme === 'dark' ? '#4f6ef7'  : '#4f6ef7',
    text:      theme === 'dark' ? '#e2e2e2'  : '#111111',
    textMuted: theme === 'dark' ? '#555555'  : '#999999',
    label:     theme === 'dark' ? '#444444'  : '#aaaaaa',
  }

  useEffect(() => {
    loadAndDraw()
  }, [theme])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function loadAndDraw() {
    setLoading(true)
    const r = await graphApi.getTopicGraph()
    setLoading(false)

    if (r.error) return
    const { nodes, edges } = r.data

    setNodeCount(nodes.length)
    setEdgeCount(edges.length)

    if (nodes.length === 0 || !svgRef.current) return

    // Small delay to ensure SVG has dimensions
    setTimeout(() => drawGraph(nodes, edges), 50)
  }

  function drawGraph(rawNodes: GraphNode[], rawEdges: GraphEdge[]) {
    const svg    = d3.select(svgRef.current!)
    const width  = svgRef.current!.clientWidth  || 800
    const height = svgRef.current!.clientHeight || 600

    // Clear previous render
    svg.selectAll('*').remove()

    // Root group for zoom/pan
    const root = svg.append('g').attr('class', 'root')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString())
      })

    svg.call(zoom as any)

    // Center the view initially
    svg.call(
      zoom.transform as any,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9)
    )

    // ── ARROW MARKER ──
    const defs = svg.append('defs')

    defs.append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', colors.edge)

    defs.append('marker')
      .attr('id', 'arrow-hover')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', colors.edgeHover)

    // ── GLOW FILTER ──
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')

    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // ── FORCE SIMULATION ──
    const simulation = d3.forceSimulation<GraphNode>(rawNodes)
      .force('link',
        d3.forceLink<GraphNode, GraphEdge>(rawEdges)
          .id(d => d.id)
          .distance(180)
          .strength(0.4)
      )
      .force('charge',  d3.forceManyBody<GraphNode>().strength(-500))
      .force('center',  d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide<GraphNode>(70))

    // ── EDGES ──
    const linkGroup = root.append('g').attr('class', 'links')

    const links = linkGroup
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(rawEdges)
      .enter()
      .append('line')
      .attr('stroke', colors.edge)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrow-default)')

    // Edge labels
    const linkLabels = root.append('g').attr('class', 'link-labels')
      .selectAll<SVGTextElement, GraphEdge>('text')
      .data(rawEdges.filter(e => e.label))
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '9')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
      .attr('fill', colors.label)
      .attr('opacity', 0.8)
      .text(d => d.label ?? '')

    // ── NODES ──
    const nodeGroup = root.append('g').attr('class', 'nodes')

    const nodeEl = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(rawNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')

    // Drag behavior
    nodeEl.call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x ?? 0
          d.fy = d.y ?? 0
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }) as any
    )

    // Outer glow ring (visible on hover)
    nodeEl.append('circle')
      .attr('class', 'glow-ring')
      .attr('r', d => nodeRadius(d) + 8)
      .attr('fill', 'transparent')
      .attr('stroke', d => d.coverColor)
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('filter', 'url(#glow)')

    // Node background
    nodeEl.append('circle')
      .attr('class', 'bg-circle')
      .attr('r', nodeRadius)
      .attr('fill', d => d.coverColor + '20')
      .attr('stroke', d => d.coverColor + '60')
      .attr('stroke-width', 1.5)

    // Emoji
    nodeEl.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '18')
      .attr('y', -10)
      .attr('pointer-events', 'none')
      .text(d => d.emoji)

    // Title
    nodeEl.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 14)
      .attr('font-size', '11')
      .attr('font-weight', '500')
      .attr('fill', colors.text)
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
      .attr('pointer-events', 'none')
      .text(d => d.title.length > 18 ? d.title.slice(0, 16) + '…' : d.title)

    // Ref count badge
    nodeEl.filter(d => d.refCount > 0)
      .append('circle')
      .attr('class', 'badge-bg')
      .attr('cx', d => nodeRadius(d) - 4)
      .attr('cy', d => -(nodeRadius(d) - 4))
      .attr('r', 8)
      .attr('fill', d => d.coverColor)

    nodeEl.filter(d => d.refCount > 0)
      .append('text')
      .attr('x', d => nodeRadius(d) - 4)
      .attr('y', d => -(nodeRadius(d) - 4))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '8')
      .attr('font-weight', '700')
      .attr('fill', '#ffffff')
      .attr('pointer-events', 'none')
      .text(d => d.refCount)

    // ── HOVER + CLICK ──
    nodeEl
      .on('mouseenter', function(event, d) {
        // Highlight this node
        d3.select(this).select('.glow-ring')
          .transition().duration(150)
          .attr('opacity', 0.6)
        d3.select(this).select('.bg-circle')
          .transition().duration(150)
          .attr('r', nodeRadius(d) + 5)

        // Highlight connected edges
        links
          .attr('stroke', e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === d.id || tgt === d.id) ? colors.edgeHover : colors.edge
          })
          .attr('stroke-opacity', e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === d.id || tgt === d.id) ? 0.9 : 0.15
          })
          .attr('stroke-width', e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === d.id || tgt === d.id) ? 2.5 : 1.5
          })
          .attr('marker-end', e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source
            const tgt = typeof e.target === 'object' ? e.target.id : e.target
            return (src === d.id || tgt === d.id) ? 'url(#arrow-hover)' : 'url(#arrow-default)'
          })
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('.glow-ring')
          .transition().duration(150)
          .attr('opacity', 0)
        d3.select(this).select('.bg-circle')
          .transition().duration(150)
          .attr('r', nodeRadius(d))

        links
          .attr('stroke', colors.edge)
          .attr('stroke-opacity', 0.5)
          .attr('stroke-width', 1.5)
          .attr('marker-end', 'url(#arrow-default)')
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        // Pulse animation before navigating
        d3.select(event.currentTarget).select('.bg-circle')
          .transition().duration(100).attr('r', nodeRadius(d) + 10)
          .transition().duration(100).attr('r', nodeRadius(d))
          .on('end', () => {
            onOpenTopic(d.id)
            onClose()
          })
      })

    // ── SIMULATION TICK ──
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)

      linkLabels
        .attr('x', d =>
          (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2
        )
        .attr('y', d =>
          (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2
        )

      nodeEl.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // Run simulation briefly then freeze for cleaner initial layout
    simulation.alpha(1).restart()
  }

  function nodeRadius(d: GraphNode): number {
    // Bigger nodes = more references = more important
    return 30 + Math.min(d.refCount * 3, 20)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: colors.bg }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: `0.5px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-1 flex items-center gap-2">
            🕸️ Knowledge Graph
          </span>

          {!loading && nodeCount > 0 && (
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px]"
              style={{ background: colors.surface, border: `0.5px solid ${colors.border}` }}
            >
              <span style={{ color: colors.textMuted }}>
                {nodeCount} {nodeCount === 1 ? 'topic' : 'topics'}
              </span>
              {edgeCount > 0 && (
                <>
                  <span style={{ color: colors.border }}>·</span>
                  <span style={{ color: colors.textMuted }}>
                    {edgeCount} {edgeCount === 1 ? 'connection' : 'connections'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px]" style={{ color: colors.textMuted }}>
            Drag nodes · Scroll to zoom · Click to open
          </p>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-ink-3 hover:text-ink-1 transition-colors"
            style={{ background: colors.surface, border: `0.5px solid ${colors.border}` }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6"  x2="6"  y2="18"/>
              <line x1="6"  y1="6"  x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── CANVAS ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent
                              rounded-full animate-spin" />
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Loading graph...
              </p>
            </div>
          </div>
        )}

        {/* No topics */}
        {!loading && nodeCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center
                          text-center gap-4">
            <div className="text-5xl">🕸️</div>
            <div>
              <p className="text-sm font-medium text-ink-2 mb-1">
                No topics to visualize
              </p>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Create topics in the Wiki and connect them to see the graph
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-brand-bright hover:underline"
            >
              ← Back to Wiki
            </button>
          </div>
        )}

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            opacity:  loading || nodeCount === 0 ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* ── CONTROLS (bottom right) ── */}
        {!loading && nodeCount > 0 && (
          <div
            className="absolute bottom-5 right-5 flex flex-col gap-1.5"
          >
            {/* Zoom controls */}
            <button
              onClick={() => {
                const svg = d3.select(svgRef.current!)
                svg.transition().duration(300).call(
                  d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
                  1.3
                )
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-ink-2 hover:text-ink-1 transition-colors text-lg font-light"
              style={{ background: colors.surface, border: `0.5px solid ${colors.border}` }}
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => {
                const svg = d3.select(svgRef.current!)
                svg.transition().duration(300).call(
                  d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
                  0.7
                )
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-ink-2 hover:text-ink-1 transition-colors text-lg font-light"
              style={{ background: colors.surface, border: `0.5px solid ${colors.border}` }}
              title="Zoom out"
            >
              −
            </button>
          </div>
        )}

        {/* ── LEGEND (bottom left) ── */}
        {!loading && nodeCount > 0 && (
          <div
            className="absolute bottom-5 left-5 px-3 py-2.5 rounded-xl text-[10px]"
            style={{
              background:  colors.surface + 'cc',
              border:      `0.5px solid ${colors.border}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <p className="font-medium mb-2" style={{ color: colors.textMuted }}>
              Legend
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: '#4f6ef720', border: '1.5px solid #4f6ef760' }}
                />
                <span style={{ color: colors.textMuted }}>Topic node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 flex-shrink-0"
                     style={{ background: colors.edge }} />
                <span style={{ color: colors.textMuted }}>Connection</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full text-[8px] flex items-center
                             justify-center text-white font-bold flex-shrink-0"
                  style={{ background: '#4f6ef7' }}
                >
                  3
                </div>
                <span style={{ color: colors.textMuted }}>Reference count</span>
              </div>
              <div style={{ color: colors.textMuted, marginTop: 2 }}>
                Node size = importance
              </div>
            </div>
          </div>
        )}

        {/* ── TIP WHEN ONLY 1 NODE ── */}
        {!loading && nodeCount === 1 && (
          <div
            className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-2.5
                       rounded-full text-[11px] flex items-center gap-2"
            style={{
              background:  colors.surface,
              border:      `0.5px solid ${colors.border}`,
            }}
          >
            <span>💡</span>
            <span style={{ color: colors.textMuted }}>
              Connect topics in the editor to see relationships here
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
