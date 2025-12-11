
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ConceptMapping } from '../types';
import { Brain, Zap } from 'lucide-react';

interface ConceptMapProps {
  mappings: ConceptMapping[];
  userBackground: string;
  newTopic: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: 'familiar' | 'new';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relation: string;
  source: string | GraphNode;
  target: string | GraphNode;
}

const ConceptMap: React.FC<ConceptMapProps> = ({ mappings, userBackground, newTopic }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });

  // Handle resizing to ensure D3 centers correctly even if loaded inside an animation/modal
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: 400 
            });
        }
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    // Initial check
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  const data = useMemo(() => {
    const nodes: GraphNode[] = [];
    const nodeIds = new Set<string>();
    const links: GraphLink[] = [];

    mappings.forEach((m) => {
      if (!nodeIds.has(m.familiarConcept)) {
        nodes.push({ id: m.familiarConcept, group: 'familiar' });
        nodeIds.add(m.familiarConcept);
      }
      if (!nodeIds.has(m.newConcept)) {
        nodes.push({ id: m.newConcept, group: 'new' });
        nodeIds.add(m.newConcept);
      }
      links.push({
        source: m.familiarConcept,
        target: m.newConcept,
        relation: m.relation,
      });
    });

    return { nodes, links };
  }, [mappings]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous

    // Simulation Setup
    // Deep copy data to prevent React StrictMode/re-render mutation issues
    const simulation = d3.forceSimulation<GraphNode>(data.nodes.map(d => ({...d}))) 
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links.map(d => ({...d})))
            .id((d) => d.id)
            .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(40))
      .force('x', d3.forceX<GraphNode>((d) => d.group === 'familiar' ? width * 0.25 : width * 0.75).strength(0.2));

    // Define Arrow Marker
    svg.append("defs").append("marker")
      .attr("id", "arrow-concept")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20) // Offset
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    // Draw Links
    const linkGroup = svg.append('g').attr('class', 'links');
    
    const link = linkGroup.selectAll('line')
      .data(simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')!.links())
      .join('line')
      .attr('stroke', '#475569') 
      .attr('stroke-width', 2)
      .attr('opacity', 0.6)
      .attr('marker-end', 'url(#arrow-concept)');

    const linkHitArea = linkGroup.selectAll('path.hit-area')
        .data(simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')!.links())
        .join('path')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 20)
        .attr('fill', 'none')
        .attr('cursor', 'pointer');

    // Draw Nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(simulation.nodes())
      .join('g')
      .attr('cursor', 'grab');

    // Drag Behavior
    const drag = d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });
    
    node.call(drag);

    // Node Circles
    node.append('circle')
      .attr('r', 8)
      .attr('fill', (d) => d.group === 'familiar' ? '#3b82f6' : '#10b981')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);
      
    // Pulse animation for 'new' nodes
    node.filter(d => d.group === 'new')
        .append('circle')
        .attr('r', 12)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-opacity', 0.4)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('from', '8')
        .attr('to', '20')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');
    
    node.filter(d => d.group === 'new')
        .select('circle:last-of-type') // Select the pulse circle
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('from', '0.6')
        .attr('to', '0')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');


    // Labels
    node.append('text')
      .text((d) => d.id)
      .attr('x', 0)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', (d) => d.group === 'familiar' ? '#93c5fd' : '#6ee7b7')
      .attr('font-weight', '600')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 2px 4px rgba(0,0,0,1)');

    // Interactions
    const handleMouseEnter = (event: any, d: GraphLink) => {
        link.filter(l => l === d)
            .attr('stroke', '#f472b6')
            .attr('stroke-width', 3)
            .attr('opacity', 1);

        const s = d.source as GraphNode;
        const t = d.target as GraphNode;
        
        if (s.x !== undefined && s.y !== undefined && t.x !== undefined && t.y !== undefined) {
             setTooltip({
                 x: (s.x + t.x) / 2,
                 y: (s.y + t.y) / 2,
                 content: d.relation
             });
        }
    };

    const handleMouseLeave = (event: any, d: GraphLink) => {
         link.filter(l => l === d)
            .attr('stroke', '#475569')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6);
        setTooltip(null);
    };

    linkHitArea.on('mouseenter', handleMouseEnter).on('mouseleave', handleMouseLeave);
    link.on('mouseenter', handleMouseEnter).on('mouseleave', handleMouseLeave);

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkHitArea.attr('d', (d: any) => {
          return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
      });

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data, dimensions]);

  return (
    <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6 shadow-xl flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between mb-4 px-4 text-xs font-bold uppercase tracking-widest z-10">
        <div className="text-blue-400 flex items-center gap-2">
          <Brain size={16} />
          <span className="hidden sm:inline">Known:</span> {userBackground}
        </div>
        <div className="text-emerald-400 flex items-center gap-2">
          {newTopic} <span className="hidden sm:inline">(New)</span>
          <Zap size={16} />
        </div>
      </div>

      <div ref={containerRef} className="w-full relative h-[400px] bg-slate-900/30 rounded-xl overflow-hidden cursor-crosshair border border-slate-800/50">
        <svg ref={svgRef} className="w-full h-full block" />
        
        {tooltip && (
            <div 
                className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 bg-slate-800/95 backdrop-blur-md border border-brand-500/30 text-white text-xs px-3 py-2 rounded-lg shadow-xl max-w-[200px] text-center z-20 animate-fadeIn"
                style={{ left: tooltip.x, top: tooltip.y - 10 }}
            >
                <div className="text-brand-300 font-bold mb-1 text-[10px] uppercase tracking-wider">Relation</div>
                {tooltip.content}
            </div>
        )}

        <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/60 rounded-full text-[10px] text-slate-500 border border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></div>
                Hover connections • Drag to explore
             </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptMap;
