import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { graphApi, topicsApi } from '../lib/api';
export function TopicGraph({ theme, onOpenTopic, onClose }) {
    const svgRef = useRef(null);
    const zoomRef = useRef(null);
    const simulationRef = useRef(null);
    const nodesRef = useRef([]);
    const edgesRef = useRef([]);
    const [loading, setLoading] = useState(true);
    const [nodeCount, setNodeCount] = useState(0);
    const [edgeCount, setEdgeCount] = useState(0);
    const [orphanCount, setOrphanCount] = useState(0);
    const [showOrphans, setShowOrphans] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [hoverCard, setHoverCard] = useState(null);
    const [mode, setMode] = useState('navigate');
    const [focusedNode, setFocusedNode] = useState(null);
    const [draggingFrom, setDraggingFrom] = useState(null);
    const [connectMsg, setConnectMsg] = useState(null);
    const [pathFrom, setPathFrom] = useState(null);
    const [pathResult, setPathResult] = useState(null);
    const [pathMsg, setPathMsg] = useState(null);
    const [heatmap, setHeatmap] = useState('none');
    const [showMinimap, setShowMinimap] = useState(true);
    const minimapRef = useRef(null);
    // Refs for D3 closures
    const modeRef = useRef('navigate');
    const draggingRef = useRef(null);
    const pathFromRef = useRef(null);
    const focusedRef = useRef(null);
    const isDark = theme === 'dark';
    const C = {
        bg: isDark ? '#0a0a0a' : '#f5f5f5',
        surface: isDark ? '#111111' : '#ffffff',
        border: isDark ? '#1e1e1e' : '#e5e5e5',
        edge: isDark ? '#2a2a2a' : '#cccccc',
        text: isDark ? '#e2e2e2' : '#111111',
        textMuted: isDark ? '#555555' : '#999999',
        orphan: '#f59e0b',
        path: '#10b981',
        pathGlow: '#10b98140',
    };
    // Sync refs with state
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { draggingRef.current = draggingFrom; }, [draggingFrom]);
    useEffect(() => { pathFromRef.current = pathFrom; }, [pathFrom]);
    useEffect(() => { focusedRef.current = focusedNode; }, [focusedNode]);
    // Escape key handler
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape')
                return;
            if (focusedRef.current) {
                exitFocus();
            }
            else if (pathResult || pathFrom) {
                clearPath();
            }
            else {
                onClose();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [focusedNode, pathResult, pathFrom]);
    // Search highlight
    useEffect(() => {
        if (!svgRef.current)
            return;
        d3.select(svgRef.current)
            .selectAll('.node')
            .attr('opacity', d => !searchQ || d.title.toLowerCase().includes(searchQ.toLowerCase()) ? 1 : 0.12);
    }, [searchQ]);
    // Heatmap effect
    useEffect(() => {
        if (!svgRef.current || nodeCount === 0)
            return;
        const nodes = nodesRef.current;
        if (nodes.length === 0)
            return;
        const dark = theme === 'dark';
        if (heatmap === 'none') {
            d3.select(svgRef.current)
                .selectAll('.main-circle')
                .transition().duration(400)
                .attr('fill', d => d.coverColor + (dark ? '25' : '20'))
                .attr('stroke', d => d.coverColor + '80');
            return;
        }
        const getValue = (d) => heatmap === 'refs' ? d.refCount : d.linkCount;
        const values = nodes.map(getValue);
        const max = Math.max(1, ...values);
        const min = Math.min(...values);
        // Simple manual color scale: high=warm red, low=cool blue
        // Avoids D3 interpolator issues entirely
        function heatColor(val) {
            const t = max === min ? 0 : (val - min) / (max - min); // 0=cold, 1=hot
            if (t >= 0.8)
                return '#ef4444'; // hot red
            if (t >= 0.6)
                return '#f97316'; // orange
            if (t >= 0.4)
                return '#eab308'; // yellow
            if (t >= 0.2)
                return '#22c55e'; // green
            return '#3b82f6'; // cold blue
        }
        d3.select(svgRef.current)
            .selectAll('.main-circle')
            .transition().duration(500)
            .attr('fill', d => heatColor(getValue(d)) + (dark ? '35' : '25'))
            .attr('stroke', d => heatColor(getValue(d)));
    }, [heatmap, nodeCount, theme]);
    useEffect(() => { loadAndDraw(); }, [theme]);
    async function loadAndDraw() {
        setLoading(true);
        const r = await graphApi.getTopicGraph();
        setLoading(false);
        if (r.error || !svgRef.current)
            return;
        const { nodes, edges } = r.data;
        nodesRef.current = nodes;
        edgesRef.current = edges;
        setNodeCount(nodes.length);
        setEdgeCount(edges.length);
        setOrphanCount(nodes.filter(n => isOrphan(n, edges)).length);
        if (nodes.length === 0)
            return;
        setTimeout(() => drawGraph(nodes, edges), 50);
    }
    function nodeRadius(d) {
        return 28 + Math.min(d.refCount * 3, 18);
    }
    function isOrphan(node, edges) {
        return !edges.some(e => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            return s === node.id || t === node.id;
        });
    }
    function getNeighbors(nodeId, edges) {
        const neighbors = [];
        edges.forEach(e => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            if (s === nodeId)
                neighbors.push(t);
            if (t === nodeId)
                neighbors.push(s);
        });
        return [...new Set(neighbors)];
    }
    // ─────────────────────────────────────────────
    // BFS shortest path finder
    // ─────────────────────────────────────────────
    function findPath(fromId, toId, edges) {
        if (fromId === toId)
            return null;
        // Build adjacency list (undirected for path finding)
        const adj = {};
        edges.forEach(e => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            if (!adj[s])
                adj[s] = [];
            if (!adj[t])
                adj[t] = [];
            adj[s].push(t);
            adj[t].push(s);
        });
        // BFS
        const visited = new Set([fromId]);
        const queue = [{ id: fromId, path: [fromId] }];
        while (queue.length > 0) {
            const { id, path } = queue.shift();
            const neighbors = adj[id] ?? [];
            for (const neighbor of neighbors) {
                if (neighbor === toId) {
                    const fullPath = [...path, neighbor];
                    // Build edge list from path
                    const pathEdges = [];
                    for (let i = 0; i < fullPath.length - 1; i++) {
                        pathEdges.push(`${fullPath[i]}-${fullPath[i + 1]}`);
                        pathEdges.push(`${fullPath[i + 1]}-${fullPath[i]}`); // both directions
                    }
                    return { nodes: fullPath, edges: pathEdges };
                }
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ id: neighbor, path: [...path, neighbor] });
                }
            }
        }
        return null; // no path
    }
    // ─────────────────────────────────────────────
    // Apply path highlight to graph
    // ─────────────────────────────────────────────
    function applyPathHighlight(result) {
        if (!svgRef.current)
            return;
        const svg = d3.select(svgRef.current);
        if (!result) {
            // Reset all
            svg.selectAll('.node').attr('opacity', 1);
            svg.selectAll('.link-line')
                .attr('stroke', C.edge)
                .attr('stroke-width', 1.5)
                .attr('stroke-opacity', 0.5)
                .attr('stroke-dasharray', null)
                .attr('marker-end', 'url(#arrow-default)');
            svg.selectAll('.path-flow').remove();
            return;
        }
        // Fade non-path nodes
        svg.selectAll('.node')
            .attr('opacity', d => result.nodes.includes(d.id) ? 1 : 0.1);
        // Highlight path edges
        svg.selectAll('.link-line')
            .each(function (d) {
            const s = typeof d.source === 'object' ? d.source.id : d.source;
            const t = typeof d.target === 'object' ? d.target.id : d.target;
            const key1 = `${s}-${t}`;
            const key2 = `${t}-${s}`;
            const onPath = result.edges.includes(key1) || result.edges.includes(key2);
            d3.select(this)
                .attr('stroke', onPath ? C.path : C.edge)
                .attr('stroke-width', onPath ? 3 : 1.5)
                .attr('stroke-opacity', onPath ? 1 : 0.08)
                .attr('marker-end', onPath ? 'url(#arrow-path)' : 'url(#arrow-default)');
        });
        // Animate flowing dots along path edges
        svg.selectAll('.path-flow').remove();
        const root = svg.select('.root');
        svg.selectAll('.link-line')
            .each(function (d) {
            const s = typeof d.source === 'object' ? d.source.id : d.source;
            const t = typeof d.target === 'object' ? d.target.id : d.target;
            const key1 = `${s}-${t}`;
            const key2 = `${t}-${s}`;
            if (!result.edges.includes(key1) && !result.edges.includes(key2))
                return;
            const line = d3.select(this);
            const x1 = parseFloat(line.attr('x1'));
            const y1 = parseFloat(line.attr('y1'));
            const x2 = parseFloat(line.attr('x2'));
            const y2 = parseFloat(line.attr('y2'));
            // Animated dot flowing along the path edge
            const dot = root.append('circle')
                .attr('class', 'path-flow')
                .attr('r', 4)
                .attr('fill', C.path)
                .attr('opacity', 0.9);
            function animateDot() {
                dot.attr('cx', x1).attr('cy', y1);
                dot.transition()
                    .duration(1200)
                    .ease(d3.easeLinear)
                    .attr('cx', x2).attr('cy', y2)
                    .on('end', animateDot);
            }
            animateDot();
        });
    }
    // ─────────────────────────────────────────────
    // Focus mode — zoom to node + show neighbors
    // ─────────────────────────────────────────────
    function focusNode(node) {
        if (!svgRef.current || !zoomRef.current)
            return;
        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        const neighbors = getNeighbors(node.id, edgesRef.current);
        const visible = new Set([node.id, ...neighbors]);
        setFocusedNode(node.id);
        // Fade non-neighbors
        svg.selectAll('.node')
            .transition().duration(400)
            .attr('opacity', d => visible.has(d.id) ? 1 : 0.05);
        svg.selectAll('.link-line')
            .transition().duration(400)
            .attr('stroke-opacity', (d) => {
            const s = typeof d.source === 'object' ? d.source.id : d.source;
            const t = typeof d.target === 'object' ? d.target.id : d.target;
            return (s === node.id || t === node.id) ? 0.9 : 0.04;
        })
            .attr('stroke', (d) => {
            const s = typeof d.source === 'object' ? d.source.id : d.source;
            const t = typeof d.target === 'object' ? d.target.id : d.target;
            return (s === node.id || t === node.id) ? '#4f6ef7' : C.edge;
        });
        // Smooth zoom to focused node
        const transform = d3.zoomTransform(svgRef.current);
        const scale = 1.8;
        const tx = width / 2 - scale * (node.x ?? 0);
        const ty = height / 2 - scale * (node.y ?? 0);
        svg.transition().duration(600).ease(d3.easeCubicInOut)
            .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
    function exitFocus() {
        if (!svgRef.current || !zoomRef.current)
            return;
        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        setFocusedNode(null);
        // Restore all nodes
        svg.selectAll('.node')
            .transition().duration(400).attr('opacity', 1);
        svg.selectAll('.link-line')
            .transition().duration(400)
            .attr('stroke-opacity', 0.5)
            .attr('stroke', C.edge);
        // Zoom back out
        svg.transition().duration(500).ease(d3.easeCubicInOut)
            .call(zoomRef.current.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85));
    }
    function clearPath() {
        setPathFrom(null);
        setPathResult(null);
        setPathMsg(null);
        applyPathHighlight(null);
    }
    // ─────────────────────────────────────────────
    // Mini-map renderer
    // Draws a tiny version of the graph in the corner
    // Updates on every simulation tick
    // ─────────────────────────────────────────────
    function updateMinimap(nodes, edges) {
        if (!minimapRef.current)
            return;
        const W = 160, H = 88;
        const mm = d3.select(minimapRef.current);
        mm.selectAll('*').remove();
        if (nodes.length === 0)
            return;
        // Calculate bounds of current node positions
        const xs = nodes.map(n => n.x ?? 0);
        const ys = nodes.map(n => n.y ?? 0);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const pad = 10;
        const scaleX = (W - pad * 2) / rangeX;
        const scaleY = (H - pad * 2) / rangeY;
        const scale = Math.min(scaleX, scaleY);
        const tx = (n) => pad + ((n.x ?? 0) - minX) * scale;
        const ty = (n) => pad + ((n.y ?? 0) - minY) * scale;
        // Draw edges
        mm.append('g').selectAll('line')
            .data(edges).enter().append('line')
            .attr('x1', d => tx(d.source))
            .attr('y1', d => ty(d.source))
            .attr('x2', d => tx(d.target))
            .attr('y2', d => ty(d.target))
            .attr('stroke', isDark ? '#2a2a2a' : '#cccccc')
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.6);
        // Draw nodes
        mm.append('g').selectAll('circle')
            .data(nodes).enter().append('circle')
            .attr('cx', tx)
            .attr('cy', ty)
            .attr('r', d => 2.5 + Math.min(d.refCount * 0.5, 3))
            .attr('fill', d => d.coverColor)
            .attr('opacity', 0.85);
        // Draw viewport rectangle showing current view
        if (svgRef.current) {
            const svgW = svgRef.current.clientWidth || 800;
            const svgH = svgRef.current.clientHeight || 600;
            const tr = d3.zoomTransform(svgRef.current);
            // Viewport corners in graph space
            const vpX1 = (-tr.x) / tr.k;
            const vpY1 = (-tr.y) / tr.k;
            const vpX2 = (svgW - tr.x) / tr.k;
            const vpY2 = (svgH - tr.y) / tr.k;
            // Convert to minimap space
            const mmX1 = pad + (vpX1 - minX) * scale;
            const mmY1 = pad + (vpY1 - minY) * scale;
            const mmW = (vpX2 - vpX1) * scale;
            const mmH = (vpY2 - vpY1) * scale;
            mm.append('rect')
                .attr('x', mmX1)
                .attr('y', mmY1)
                .attr('width', Math.max(10, mmW))
                .attr('height', Math.max(8, mmH))
                .attr('fill', 'transparent')
                .attr('stroke', '#4f6ef7')
                .attr('stroke-width', 1)
                .attr('opacity', 0.7)
                .attr('rx', 2);
        }
    }
    function drawGraph(rawNodes, rawEdges) {
        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth || 800;
        const height = svgRef.current.clientHeight || 600;
        svg.selectAll('*').remove();
        const root = svg.append('g').attr('class', 'root');
        // ── ZOOM ──
        const zoom = d3.zoom()
            .scaleExtent([0.1, 6])
            .on('zoom', e => {
            root.attr('transform', e.transform.toString());
            // Update minimap viewport rectangle
            updateMinimap(rawNodes, rawEdges);
        });
        zoomRef.current = zoom;
        svg.call(zoom);
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85));
        // Click background to exit focus/path
        svg.on('click.bg', () => {
            if (focusedRef.current)
                exitFocus();
            if (draggingRef.current) {
                setDraggingFrom(null);
                connectLine.attr('opacity', 0);
            }
        });
        // ── DEFS ──
        const defs = svg.append('defs');
        ['default', 'hover', 'orphan', 'path'].forEach(id => {
            const color = id === 'hover' ? '#4f6ef7'
                : id === 'orphan' ? C.orphan
                    : id === 'path' ? C.path
                        : C.edge;
            defs.append('marker').attr('id', `arrow-${id}`)
                .attr('viewBox', '0 -4 8 8').attr('refX', 22)
                .attr('refY', 0).attr('markerWidth', 5)
                .attr('markerHeight', 5).attr('orient', 'auto')
                .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', color);
        });
        // Glow filter
        const glow = defs.append('filter').attr('id', 'glow')
            .attr('x', '-50%').attr('y', '-50%')
            .attr('width', '200%').attr('height', '200%');
        glow.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur');
        const fm = glow.append('feMerge');
        fm.append('feMergeNode').attr('in', 'blur');
        fm.append('feMergeNode').attr('in', 'SourceGraphic');
        // ── SIMULATION ──
        const simulation = d3.forceSimulation(rawNodes)
            .force('link', d3.forceLink(rawEdges)
            .id(d => d.id).distance(180).strength(0.4))
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(0, 0))
            .force('collide', d3.forceCollide(d => nodeRadius(d) + 20));
        simulationRef.current = simulation;
        // ── CONNECT LINE ──
        const connectLine = root.append('line').attr('class', 'connect-line')
            .attr('stroke', '#4f6ef7').attr('stroke-width', 2)
            .attr('stroke-dasharray', '6,3').attr('opacity', 0)
            .attr('pointer-events', 'none');
        svg.on('mousemove.connect', (event) => {
            if (!draggingRef.current)
                return;
            const [mx, my] = d3.pointer(event, root.node());
            const src = rawNodes.find(n => n.id === draggingRef.current);
            if (!src)
                return;
            connectLine.attr('x1', src.x ?? 0).attr('y1', src.y ?? 0)
                .attr('x2', mx).attr('y2', my).attr('opacity', 1);
        });
        // ── EDGES ──
        const linkGroup = root.append('g');
        const links = linkGroup.selectAll('.link-group')
            .data(rawEdges).enter().append('g').attr('class', 'link-group');
        links.append('line').attr('class', 'link-line')
            .attr('stroke', C.edge).attr('stroke-width', 1.5).attr('stroke-opacity', 0.5)
            .attr('marker-end', 'url(#arrow-default)');
        links.append('text').attr('class', 'link-label')
            .attr('text-anchor', 'middle').attr('font-size', 9)
            .attr('fill', C.textMuted).attr('opacity', 0.7)
            .text((d) => d.label ?? '');
        // ── NODES ──
        const nodeEl = root.append('g').selectAll('.node')
            .data(rawNodes, (d) => d.id)
            .enter().append('g').attr('class', 'node').attr('cursor', 'pointer');
        // Drag
        nodeEl.call(d3.drag()
            .on('start', (event, d) => {
            if (!event.active)
                simulation.alphaTarget(0.3).restart();
            d.fx = d.x ?? 0;
            d.fy = d.y ?? 0;
        })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end', (event, d) => {
            if (!event.active)
                simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }));
        // Glow ring
        nodeEl.append('circle').attr('class', 'glow-ring')
            .attr('r', d => nodeRadius(d) + 10).attr('fill', 'transparent')
            .attr('stroke', d => d.coverColor).attr('stroke-width', 2.5)
            .attr('opacity', 0).attr('filter', 'url(#glow)');
        // Orphan dashed ring
        nodeEl.filter(d => isOrphan(d, rawEdges))
            .append('circle').attr('class', 'orphan-ring')
            .attr('r', d => nodeRadius(d) + 5).attr('fill', 'transparent')
            .attr('stroke', C.orphan).attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,3').attr('opacity', 0.7);
        // Main circle
        nodeEl.append('circle').attr('class', 'main-circle')
            .attr('r', nodeRadius)
            .attr('fill', d => d.coverColor + (isDark ? '20' : '15'))
            .attr('stroke', d => isOrphan(d, rawEdges) ? C.orphan : d.coverColor + '70')
            .attr('stroke-width', d => isOrphan(d, rawEdges) ? 2 : 1.5);
        // Emoji
        nodeEl.append('text')
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('font-size', 18).attr('y', -10).attr('pointer-events', 'none')
            .text(d => d.emoji);
        // Title
        nodeEl.append('text')
            .attr('text-anchor', 'middle').attr('y', 14)
            .attr('font-size', 11).attr('font-weight', '500').attr('fill', C.text)
            .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
            .attr('pointer-events', 'none')
            .text(d => d.title.length > 18 ? d.title.slice(0, 16) + '…' : d.title);
        // Ref badge
        nodeEl.filter(d => d.refCount > 0)
            .append('circle')
            .attr('cx', d => nodeRadius(d) - 2)
            .attr('cy', d => -(nodeRadius(d) - 2))
            .attr('r', 8).attr('fill', d => d.coverColor);
        nodeEl.filter(d => d.refCount > 0)
            .append('text')
            .attr('x', d => nodeRadius(d) - 2)
            .attr('y', d => -(nodeRadius(d) - 2))
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('font-size', 8).attr('font-weight', 700)
            .attr('fill', '#fff').attr('pointer-events', 'none')
            .text(d => d.refCount);
        // ── NODE EVENTS ──
        nodeEl
            .on('mouseenter', function (event, d) {
            if (draggingRef.current || modeRef.current === 'path')
                return;
            d3.select(this).select('.glow-ring')
                .transition().duration(150).attr('opacity', 0.5);
            d3.select(this).select('.main-circle')
                .transition().duration(150).attr('r', nodeRadius(d) + 4);
            // Highlight connected edges
            linkGroup.selectAll('.link-line')
                .attr('stroke', (e) => {
                const s = typeof e.source === 'object' ? e.source.id : e.source;
                const t = typeof e.target === 'object' ? e.target.id : e.target;
                return (s === d.id || t === d.id) ? '#4f6ef7' : C.edge;
            })
                .attr('stroke-opacity', (e) => {
                const s = typeof e.source === 'object' ? e.source.id : e.source;
                const t = typeof e.target === 'object' ? e.target.id : e.target;
                return (s === d.id || t === d.id) ? 1 : 0.1;
            })
                .attr('stroke-width', (e) => {
                const s = typeof e.source === 'object' ? e.source.id : e.source;
                const t = typeof e.target === 'object' ? e.target.id : e.target;
                return (s === d.id || t === d.id) ? 2.5 : 1.5;
            });
            const svgRect = svgRef.current.getBoundingClientRect();
            const tr = d3.zoomTransform(svgRef.current);
            setHoverCard({
                node: d,
                screenX: tr.applyX(d.x ?? 0) + svgRect.left,
                screenY: tr.applyY(d.y ?? 0) + svgRect.top,
            });
        })
            .on('mouseleave', function (event, d) {
            d3.select(this).select('.glow-ring')
                .transition().duration(150).attr('opacity', 0);
            d3.select(this).select('.main-circle')
                .transition().duration(150).attr('r', nodeRadius(d));
            linkGroup.selectAll('.link-line')
                .attr('stroke', C.edge).attr('stroke-opacity', 0.5).attr('stroke-width', 1.5);
            setHoverCard(null);
        })
            // Single click
            .on('click', async (event, d) => {
            event.stopPropagation();
            // ── CONNECT MODE ──
            if (modeRef.current === 'connect') {
                if (!draggingRef.current) {
                    draggingRef.current = d.id;
                    setDraggingFrom(d.id);
                    connectLine.attr('x1', d.x ?? 0).attr('y1', d.y ?? 0)
                        .attr('x2', d.x ?? 0).attr('y2', d.y ?? 0).attr('opacity', 1);
                    setConnectMsg(`Click another topic to connect to "${d.title}"`);
                    return;
                }
                const fromId = draggingRef.current;
                if (fromId === d.id) {
                    draggingRef.current = null;
                    setDraggingFrom(null);
                    connectLine.attr('opacity', 0);
                    setConnectMsg(null);
                    return;
                }
                const already = rawEdges.some(e => {
                    const s = typeof e.source === 'object' ? e.source.id : e.source;
                    const t = typeof e.target === 'object' ? e.target.id : e.target;
                    return (s === fromId && t === d.id) || (s === d.id && t === fromId);
                });
                if (already) {
                    setConnectMsg('Already connected');
                    setTimeout(() => setConnectMsg(null), 1500);
                    draggingRef.current = null;
                    setDraggingFrom(null);
                    connectLine.attr('opacity', 0);
                    return;
                }
                await topicsApi.connect(fromId, d.id);
                rawEdges.push({ source: fromId, target: d.id, label: null });
                simulation.force('link', d3.forceLink(rawEdges)
                    .id(n => n.id).distance(180).strength(0.4));
                linkGroup.selectAll('.link-group')
                    .data(rawEdges).enter().append('g').attr('class', 'link-group')
                    .append('line').attr('class', 'link-line')
                    .attr('stroke', C.edge).attr('stroke-width', 1.5)
                    .attr('stroke-opacity', 0.5).attr('marker-end', 'url(#arrow-default)');
                simulation.alpha(0.3).restart();
                setEdgeCount(rawEdges.length);
                setOrphanCount(rawNodes.filter(n => isOrphan(n, rawEdges)).length);
                draggingRef.current = null;
                setDraggingFrom(null);
                connectLine.attr('opacity', 0);
                const fromNode = rawNodes.find(n => n.id === fromId);
                setConnectMsg(`✓ Connected "${fromNode?.title}" → "${d.title}"`);
                setTimeout(() => setConnectMsg(null), 2500);
                return;
            }
            // ── PATH MODE ──
            if (modeRef.current === 'path') {
                if (!pathFromRef.current) {
                    pathFromRef.current = d.id;
                    setPathFrom(d.id);
                    setPathMsg(`Now click the destination topic`);
                    // Highlight selected node
                    d3.select(event.currentTarget).select('.main-circle')
                        .attr('stroke', C.path).attr('stroke-width', 3);
                    return;
                }
                const fromId = pathFromRef.current;
                if (fromId === d.id) {
                    pathFromRef.current = null;
                    setPathFrom(null);
                    setPathMsg(`Click the starting topic`);
                    applyPathHighlight(null);
                    return;
                }
                const result = findPath(fromId, d.id, rawEdges);
                const fromNode = rawNodes.find(n => n.id === fromId);
                if (!result) {
                    setPathMsg(`No path found between "${fromNode?.title}" and "${d.title}"`);
                    setTimeout(() => {
                        setPathMsg(`Click the starting topic`);
                        pathFromRef.current = null;
                        setPathFrom(null);
                        applyPathHighlight(null);
                    }, 2000);
                    return;
                }
                setPathResult(result);
                applyPathHighlight(result);
                const hops = result.nodes.length - 1;
                setPathMsg(`${hops} hop${hops > 1 ? 's' : ''}: ${result.nodes
                    .map(id => rawNodes.find(n => n.id === id)?.title ?? id)
                    .join(' → ')}`);
                return;
            }
            // ── NAVIGATE MODE — single click opens topic ──
            if (modeRef.current === 'navigate') {
                d3.select(event.currentTarget).select('.main-circle')
                    .transition().duration(80).attr('r', nodeRadius(d) + 12)
                    .transition().duration(80).attr('r', nodeRadius(d))
                    .on('end', () => { onOpenTopic(d.id); onClose(); });
            }
        })
            // Double-click → focus mode
            .on('dblclick', (event, d) => {
            event.stopPropagation();
            if (modeRef.current !== 'navigate')
                return;
            if (focusedRef.current === d.id) {
                exitFocus();
            }
            else {
                focusNode(d);
            }
        });
        // ── TICK ──
        simulation.on('tick', () => {
            // Update minimap
            updateMinimap(rawNodes, rawEdges);
            linkGroup.selectAll('.link-line')
                .attr('x1', (d) => d.source.x ?? 0)
                .attr('y1', (d) => d.source.y ?? 0)
                .attr('x2', (d) => d.target.x ?? 0)
                .attr('y2', (d) => d.target.y ?? 0);
            linkGroup.selectAll('.link-label')
                .attr('x', (d) => ((d.source.x ?? 0) + (d.target.x ?? 0)) / 2)
                .attr('y', (d) => ((d.source.y ?? 0) + (d.target.y ?? 0)) / 2);
            nodeEl.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });
    }
    // ── RENDER ──
    return (_jsxs("div", { className: "fixed inset-0 z-[100] flex flex-col", style: { background: C.bg }, children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-3 flex-shrink-0", style: { borderBottom: `0.5px solid ${C.border}` }, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm font-semibold text-ink-1", children: "\uD83D\uDD78\uFE0F Knowledge Graph" }), !loading && (_jsxs("div", { className: "flex items-center gap-2 text-[10px]", style: { color: C.textMuted }, children: [_jsxs("span", { children: [nodeCount, " topics"] }), edgeCount > 0 && _jsxs(_Fragment, { children: [_jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [edgeCount, " connections"] })] }), orphanCount > 0 && (_jsxs("button", { onClick: () => setShowOrphans(!showOrphans), className: "flex items-center gap-1 px-2 py-0.5 rounded-full", style: { background: C.orphan + '20',
                                            border: `0.5px solid ${C.orphan}40`,
                                            color: C.orphan }, children: ["\u26A0 ", orphanCount, " isolated"] }))] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative", children: [_jsxs("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3", style: { color: C.textMuted }, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", placeholder: "Search topics...", value: searchQ, onChange: e => setSearchQ(e.target.value), className: "pl-8 pr-3 py-1.5 w-36 text-xs outline-none rounded-lg", style: { background: C.surface, border: `0.5px solid ${C.border}`,
                                            color: C.text } })] }), _jsx("div", { className: "flex rounded-lg overflow-hidden", style: { border: `0.5px solid ${C.border}` }, children: [
                                    { key: 'navigate', label: '🖱 Navigate', title: 'Click=open · Double-click=focus' },
                                    { key: 'connect', label: '🔗 Connect', title: 'Click two topics to link them' },
                                    { key: 'path', label: '🛤 Path', title: 'Find shortest path between topics' },
                                ].map((m, i) => (_jsx("button", { onClick: () => {
                                        setMode(m.key);
                                        setDraggingFrom(null);
                                        clearPath();
                                        if (focusedNode)
                                            exitFocus();
                                        setConnectMsg(null);
                                        if (m.key === 'path')
                                            setPathMsg('Click the starting topic');
                                        else
                                            setPathMsg(null);
                                    }, title: m.title, className: "px-3 py-1.5 text-[11px] transition-colors", style: {
                                        background: mode === m.key
                                            ? (m.key === 'connect' ? '#10b981' : m.key === 'path' ? C.path : '#4f6ef7')
                                            : C.surface,
                                        color: mode === m.key ? '#fff' : C.textMuted,
                                        borderLeft: i > 0 ? `0.5px solid ${C.border}` : undefined,
                                    }, children: m.label }, m.key))) }), ['+', '−'].map((sym, i) => (_jsx("button", { onClick: () => {
                                    d3.select(svgRef.current)
                                        .transition().duration(250)
                                        .call(d3.zoom().scaleBy, i === 0 ? 1.4 : 0.7);
                                }, className: "w-7 h-7 flex items-center justify-center rounded-lg text-sm", style: { background: C.surface, border: `0.5px solid ${C.border}`,
                                    color: C.text }, children: sym }, sym))), _jsx("div", { className: "flex rounded-lg overflow-hidden", style: { border: `0.5px solid ${C.border}` }, children: [
                                    { key: 'none', label: '◐ Default' },
                                    { key: 'refs', label: '🔥 Refs' },
                                    { key: 'links', label: '🔥 Links' },
                                ].map((h, i) => (_jsx("button", { onClick: () => setHeatmap(h.key), title: h.key === 'none' ? 'Default colors' :
                                        h.key === 'refs' ? 'Heat by reference count' :
                                            'Heat by connection count', className: "px-2.5 py-1.5 text-[10px] transition-colors", style: {
                                        background: heatmap === h.key ? '#ef444430' : C.surface,
                                        color: heatmap === h.key ? '#ef4444' : C.textMuted,
                                        borderLeft: i > 0 ? `0.5px solid ${C.border}` : undefined,
                                    }, children: h.label }, h.key))) }), _jsx("button", { onClick: onClose, className: "w-8 h-8 flex items-center justify-center rounded-lg", style: { background: C.surface, border: `0.5px solid ${C.border}`,
                                    color: C.textMuted }, children: _jsxs("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] })] }), (connectMsg || pathMsg || focusedNode || draggingFrom) && (_jsxs("div", { className: "py-2 text-xs text-center flex-shrink-0 flex items-center\n                        justify-center gap-3", style: {
                    background: mode === 'path' ? C.path + '15'
                        : mode === 'connect' ? '#10b98115'
                            : '#4f6ef715',
                    borderBottom: `0.5px solid ${C.border}`,
                    color: connectMsg?.startsWith('✓') ? C.path : C.text,
                }, children: [_jsx("span", { children: connectMsg || pathMsg || (focusedNode
                            ? `Focus: ${nodesRef.current.find(n => n.id === focusedNode)?.emoji}
                 ${nodesRef.current.find(n => n.id === focusedNode)?.title}
                 · Double-click again or press Esc to exit`
                            : '') }), (focusedNode || pathResult) && (_jsx("button", { onClick: () => { exitFocus(); clearPath(); }, className: "text-[10px] px-2 py-0.5 rounded", style: { background: C.surface, border: `0.5px solid ${C.border}` }, children: "Clear \u00B7 Esc" }))] })), _jsxs("div", { className: "flex-1 relative overflow-hidden", children: [loading && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("div", { className: "w-6 h-6 border-2 border-brand border-t-transparent\n                            rounded-full animate-spin" }) })), !loading && nodeCount === 0 && (_jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center\n                          text-center gap-4", children: [_jsx("div", { className: "text-5xl", children: "\uD83D\uDD78\uFE0F" }), _jsx("p", { className: "text-sm font-medium text-ink-2", children: "No topics yet" }), _jsx("button", { onClick: onClose, className: "text-xs text-brand-bright hover:underline", children: "\u2190 Back to Wiki" })] })), _jsx("svg", { ref: svgRef, className: "w-full h-full", style: { opacity: loading || nodeCount === 0 ? 0 : 1,
                            transition: 'opacity 0.3s',
                            cursor: mode === 'connect' ? 'crosshair'
                                : mode === 'path' ? 'cell'
                                    : 'default' } }), showMinimap && !loading && nodeCount > 1 && (_jsxs("div", { className: "absolute bottom-4 right-4 rounded-xl overflow-hidden shadow-xl", style: {
                            width: 160,
                            height: 110,
                            background: C.surface + 'ee',
                            border: `0.5px solid ${C.border}`,
                            backdropFilter: 'blur(8px)',
                        }, children: [_jsxs("div", { className: "flex items-center justify-between px-2 py-1", style: { borderBottom: `0.5px solid ${C.border}` }, children: [_jsx("span", { className: "text-[9px] font-medium", style: { color: C.textMuted }, children: "Overview" }), _jsx("button", { onClick: () => setShowMinimap(false), className: "text-[10px] leading-none", style: { color: C.textMuted }, children: "\u00D7" })] }), _jsx("svg", { ref: minimapRef, width: "160", height: "88", style: { display: 'block' } })] })), !showMinimap && !loading && nodeCount > 1 && (_jsx("button", { onClick: () => setShowMinimap(true), className: "absolute bottom-4 right-4 px-2 py-1.5 rounded-xl text-[10px]", style: { background: C.surface + 'ee',
                            border: `0.5px solid ${C.border}`,
                            color: C.textMuted,
                            backdropFilter: 'blur(8px)' }, children: "\uD83D\uDDFA Map" })), heatmap !== 'none' && !loading && nodeCount > 0 && (_jsxs("div", { className: "absolute top-4 right-4 px-3 py-2.5 rounded-xl text-[10px]", style: {
                            background: (theme === 'dark' ? '#111' : '#fff') + 'ee',
                            border: `0.5px solid ${theme === 'dark' ? '#1e1e1e' : '#e5e5e5'}`,
                            backdropFilter: 'blur(8px)',
                        }, children: [_jsxs("p", { className: "font-medium mb-2", style: { color: theme === 'dark' ? '#555' : '#999' }, children: ["Heat map \u2014 ", heatmap === 'refs' ? 'by references' : 'by connections'] }), _jsx("div", { className: "flex flex-col gap-1.5", children: [
                                    { color: '#ef4444', label: 'Very high' },
                                    { color: '#f97316', label: 'High' },
                                    { color: '#eab308', label: 'Medium' },
                                    { color: '#22c55e', label: 'Low' },
                                    { color: '#3b82f6', label: 'None / minimal' },
                                ].map(item => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full flex-shrink-0", style: { background: item.color } }), _jsx("span", { style: { color: theme === 'dark' ? '#555' : '#999' }, children: item.label })] }, item.color))) }), _jsx("button", { onClick: () => setHeatmap('none'), className: "mt-2 text-[9px] hover:underline w-full text-center", style: { color: theme === 'dark' ? '#444' : '#aaa' }, children: "Reset to default colors" })] })), hoverCard && mode === 'navigate' && !focusedNode && (_jsx(HoverCard, { card: hoverCard, colors: C })), showOrphans && (_jsxs("div", { className: "absolute top-4 left-4 z-20 w-56 rounded-xl shadow-xl p-3", style: { background: C.surface, border: `0.5px solid ${C.orphan}40` }, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "text-xs font-medium", style: { color: C.orphan }, children: "\u26A0 Isolated topics" }), _jsx("button", { onClick: () => setShowOrphans(false), style: { color: C.textMuted }, children: "\u00D7" })] }), _jsx("p", { className: "text-[10px] mb-3", style: { color: C.textMuted }, children: "These topics have no connections yet." }), _jsx("div", { className: "flex flex-col gap-1 max-h-44 overflow-y-auto", children: nodesRef.current.filter(n => isOrphan(n, edgesRef.current)).map(n => (_jsxs("div", { className: "flex items-center gap-2 px-2 py-1.5 rounded-lg", style: { background: C.orphan + '10' }, children: [_jsx("span", { children: n.emoji }), _jsx("span", { className: "text-[11px] truncate flex-1", style: { color: C.text }, children: n.title }), _jsx("button", { onClick: () => {
                                                setMode('connect');
                                                setShowOrphans(false);
                                                draggingRef.current = n.id;
                                                setDraggingFrom(n.id);
                                                setConnectMsg(`Click a topic to connect "${n.title}"`);
                                            }, className: "text-[9px] px-1.5 py-0.5 rounded flex-shrink-0", style: { background: C.orphan + '30', color: C.orphan }, children: "Link" })] }, n.id))) })] })), !loading && nodeCount > 0 && (_jsxs("div", { className: "absolute bottom-4 left-4 px-3 py-2.5 rounded-xl text-[10px]", style: { background: C.surface + 'dd',
                            border: `0.5px solid ${C.border}`,
                            backdropFilter: 'blur(8px)' }, children: [_jsx("p", { className: "font-medium mb-2", style: { color: C.textMuted }, children: "Interactions" }), _jsxs("div", { className: "flex flex-col gap-1", style: { color: C.textMuted }, children: [_jsxs("div", { children: ["\uD83D\uDDB1 ", _jsx("b", { children: "Navigate" }), " \u2014 click opens \u00B7 double-click focuses"] }), _jsxs("div", { children: ["\uD83D\uDD17 ", _jsx("b", { children: "Connect" }), " \u2014 click two nodes to link"] }), _jsxs("div", { children: ["\uD83D\uDEE4 ", _jsx("b", { children: "Path" }), " \u2014 find route between topics"] }), _jsx("div", { className: "pt-1", style: { borderTop: `0.5px solid ${C.border}` }, children: "Esc \u2014 exit focus / clear path" })] })] }))] })] }));
}
// ─────────────────────────────────────────────
// Hover Card
// ─────────────────────────────────────────────
function HoverCard({ card, colors }) {
    const { node, screenX, screenY } = card;
    const svgEl = document.querySelector('svg');
    const svgH = svgEl?.clientHeight ?? 600;
    const svgW = svgEl?.clientWidth ?? 800;
    const above = screenY > svgH * 0.65;
    const left = screenX > svgW * 0.70;
    return (_jsxs("div", { className: "absolute z-20 w-48 rounded-xl shadow-2xl pointer-events-none", style: {
            background: colors.surface,
            border: `0.5px solid ${node.coverColor}50`,
            left: left ? screenX - 210 : screenX + 18,
            top: above ? screenY - 150 : screenY + 18,
        }, children: [_jsx("div", { className: "h-0.5 rounded-t-xl", style: { background: node.coverColor } }), _jsxs("div", { className: "p-3", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-xl", children: node.emoji }), _jsx("p", { className: "text-xs font-semibold", style: { color: colors.text }, children: node.title })] }), _jsxs("div", { className: "flex items-center gap-3 mb-1.5", children: [_jsxs("span", { className: "text-[10px]", style: { color: colors.textMuted }, children: ["\uD83D\uDCCE ", node.refCount, " refs"] }), _jsxs("span", { className: "text-[10px]", style: { color: colors.textMuted }, children: ["\uD83D\uDD17 ", node.linkCount, " links"] })] }), node.refCount === 0 && node.linkCount === 0 && (_jsx("p", { className: "text-[9px]", style: { color: colors.orphan }, children: "\u26A0 Isolated \u2014 no connections yet" })), _jsx("p", { className: "text-[9px] mt-1", style: { color: colors.textMuted }, children: "Double-click to focus \u00B7 Click to open" })] })] }));
}
