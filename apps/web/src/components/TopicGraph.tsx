import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { graphApi } from '../lib/api'

interface Node {
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

interface Edge {
  source: string | Node
  target: string | Node
  label:  string | null
}

interface Props {
  theme:         'dark' | 'light'
  onOpenTopic:   (id: string) => void
  onClose:       () => void
}

export function TopicGraph({ theme, onOpenTopic, onClose }: Props) {
  const svgRef    = useRef<SVGSVGElement>(null)
  const [loading, setLoading] = useState(true)
  const [nodeCount, setNodeCount] = useState(0)

  const isDark  = theme === 'dark'
  const bg      = isDark ? '#0a0a0a' : '#f9f9f9'
  const nodeBg  = isDark ? '#111'    : '#ffffff'
  const textCol = isDark ? '#e2e2e2' : '#111111'
  const edgeCol = isDark ? '#2a2a2a' : '#dddddd'
  const mutedText = isDark ? '#555' : '#aaa'

  useEffect(() => {
    loadGraph()
  }, [theme])

  async function loadGraph() {
    setLoading(true)
    const r = await graphApi.getTopicGraph()
    setLoading(false)
    if (r.error || !svgRef.current) return

    const { nodes, edges } = r.data
    setNodeCount(nodes.length)

    if (nodes.length === 0) return

    drawGraph(nodes, edges)
  }

  function drawGraph(rawNodes: Node[], rawEdges: Edge[]) {
    const svg    = d3.select(svgRef.current!)
    const width  = svgRef.current!.clientWidth
    const height = svgRef.current!.clientHeight

    svg.selectAll('*').remove()

    // Zoom + pan
    const g = svg.append('g')

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        }) as any
    )

    // Force simulation
    const simulation = d3.forceSimulation<Node>(rawNodes)
      .force('link', d3.forceLink<Node, Edge>(rawEdges)
        .id(d => d.id)
        .distance(160)
        .strength(0.5)
      )
      .force('charge',  d3.forceManyBody().strength(-400))
      .force('center',  d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(60))

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX',    18)
      .attr('refY',    0)
      .attr('markerWidth',  6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', edgeCol)

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(rawEdges)
      .enter()
      .append('line')
      .attr('stroke', edgeCol)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('opacity', 0.6)

    // Edge labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(rawEdges.filter(e => e.label))
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '9')
      .attr('fill', mutedText)
      .text(d => d.label ?? '')

    // Node groups
    const node = g.append('g')
      .selectAll('g')
      .data(rawNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x; d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
          }) as any
      )
      .on('click', (event, d) => {
        onOpenTopic(d.id)
        onClose()
      })

    // Node background circle
    node.append('circle')
      .attr('r', d => 28 + Math.min(d.refCount * 2, 14))
      .attr('fill', d => d.coverColor + (isDark ? '18' : '12'))
      .attr('stroke', d => d.coverColor + '50')
      .attr('stroke-width', 1.5)

    // Node emoji
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '18')
      .attr('y', -8)
      .text(d => d.emoji)

    // Node title
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 16)
      .attr('font-size', '11')
      .attr('font-weight', '500')
      .attr('fill', textCol)
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
      .text(d => d.title.length > 16 ? d.title.slice(0, 14) + '…' : d.title)

    // Hover effect
    node
      .on('mouseenter', function(event, d) {
        d3.select(this).select('circle')
          .attr('stroke-width', 2.5)
          .attr('r', 28 + Math.min(d.refCount * 2, 14) + 4)
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('circle')
          .attr('stroke-width', 1.5)
          .attr('r', 28 + Math.min(d.refCount * 2, 14))
      })

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x ?? 0)
        .attr('y1', d => (d.source as Node).y ?? 0)
        .attr('x2', d => (d.target as Node).x ?? 0)
        .attr('y2', d => (d.target as Node).y ?? 0)

      linkLabel
        .attr('x', d => (((d.source as Node).x ?? 0) + ((d.target as Node).x ?? 0)) / 2)
        .attr('y', d => (((d.source as Node).y ?? 0) + ((d.target as Node).y ?? 0)) / 2)

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: bg }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3
                      border-b border-surface-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink-1">🕸️ Knowledge Graph</span>
          {!loading && (
            <span className="text-[11px] text-ink-4">
              {nodeCount} {nodeCount === 1 ? 'topic' : 'topics'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px] text-ink-4">
            Drag to move · Scroll to zoom · Click to open
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       bg-surface-3 text-ink-3 hover:text-ink-1 hover:bg-surface-4
                       transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent
                            rounded-full animate-spin" />
          </div>
        )}

        {!loading && nodeCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center
                          text-center gap-3">
            <div className="text-4xl">🕸️</div>
            <p className="text-sm text-ink-2">No topics to show</p>
            <p className="text-xs text-ink-4">
              Create topics in the Wiki and connect them to see the graph
            </p>
            <button
              onClick={onClose}
              className="text-xs text-brand-bright hover:underline mt-2"
            >
              Go to Wiki →
            </button>
          </div>
        )}

        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ opacity: loading || nodeCount === 0 ? 0 : 1 }}
        />

        {/* Legend */}
        {!loading && nodeCount > 0 && (
          <div className="absolute bottom-4 left-4 bg-surface-2/80 backdrop-blur-sm
                          border border-surface-4 rounded-xl px-3 py-2">
            <p className="text-[10px] text-ink-4 mb-1.5 font-medium">Legend</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-surface-5" />
                <span className="text-[9px] text-ink-5">Connection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-brand/50
                                bg-brand/10" />
                <span className="text-[9px] text-ink-5">Topic node</span>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-ink-5">
                Node size = reference count
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
