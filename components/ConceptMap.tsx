
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ConceptMapping } from '../types';
import { Brain, Zap, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';

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
  const [dimensions, setDimensions] = useState({ width: 0, height: 450 });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    };
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    updateDimensions();
    setTimeout(updateDimensions, 350); 
    
    return () => resizeObserver.disconnect();
  }, [isExpanded]);

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
    svg.selectAll('*').remove();

    const nodeWidth = 140;
    const nodeHeight = 50;

    // Simplified Simulation for Clean Layout
    const simulation = d3.forceSimulation<GraphNode>(data.nodes.map(d => ({...d}))) 
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links.map(d => ({...d})))
            .id((d) => d.id)
            .distance(isExpanded ? 300 : 250)) 
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(80))
      .force('x', d3.forceX<GraphNode>((d) => d.group === 'familiar' ? width * 0.25 : width * 0.75).strength(0.8)) // Stronger positioning
      .force('y', d3.forceY(height / 2).strength(0.1));

    // Arrow Marker
    svg.append("defs").append("marker")
      .attr("id", "arrow-concept")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", nodeWidth / 2 + 10) 
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    // Links
    const linkGroup = svg.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('line')
      .data(simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')!.links())
      .join('line')
      .attr('stroke', '#cbd5e1') 
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow-concept)');

    // Link Labels
    const linkLabel = linkGroup.selectAll('.link-label')
        .data(simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')!.links())
        .join('g')
        .attr('class', 'link-label');

    linkLabel.append('rect')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', '#f1f5f9') 
        .attr('stroke', '#e2e8f0')
        .attr('width', 0)
        .attr('height', 20);

    linkLabel.append('text')
        .text(d => d.relation)
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('font-size', '11px')
        .attr('fill', '#64748b')
        .attr('font-weight', '500')
        .each(function(d: any) {
            // @ts-ignore
            const bbox = this.getBBox();
            // @ts-ignore
            d.bbox = bbox;
        });
    
    linkLabel.select('rect')
        .attr('x', (d: any) => -d.bbox.width/2 - 8)
        .attr('y', -10)
        .attr('width', (d: any) => d.bbox.width + 16);

    // Nodes
    const node = svg.append('g')
      .selectAll('.node')
      .data(simulation.nodes())
      .join('g')
      .attr('class', 'node')
      .attr('cursor', 'grab')
      .call(d3.drag<SVGGElement, GraphNode>()
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
        }));

    // Simple Node Boxes
    node.append('foreignObject')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('background-color', d => d.group === 'familiar' ? '#eff6ff' : '#f0fdf4')
      .style('border', d => d.group === 'familiar' ? '2px solid #3b82f6' : '2px solid #22c55e')
      .style('border-radius', '8px')
      .style('padding', '4px')
      .html(d => `
        <div style="font-size: 12px; font-weight: 600; text-align: center; color: #1e293b; line-height: 1.1;">
            ${d.id}
        </div>
      `);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel.attr('transform', (d: any) => {
          const x = (d.source.x + d.target.x) / 2;
          const y = (d.source.y + d.target.y) / 2;
          return `translate(${x},${y})`;
      });

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data, dimensions, isExpanded]);

  const containerClasses = isExpanded
    ? "fixed inset-0 z-[100] bg-white dark:bg-neutral-900 flex flex-col items-center justify-center p-8"
    : "w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col items-center animate-fadeIn my-8 relative";

  return (
    <div className={`${containerClasses} transition-colors`}>
      <div className="w-full flex justify-between mb-4 px-4 text-xs font-bold uppercase tracking-widest z-10">
        <div className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <Brain size={16} />
          <span>Familiar: {userBackground}</span>
        </div>
        
        <div className="flex gap-4 items-center">
            <div className="text-green-600 dark:text-green-400 flex items-center gap-2">
                <span>New: {newTopic}</span>
                <Zap size={16} />
            </div>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                title={isExpanded ? "Minimize" : "Expand"}
            >
                {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className={`w-full relative bg-neutral-50 dark:bg-neutral-950/50 rounded-xl overflow-hidden cursor-crosshair border border-neutral-100 dark:border-neutral-800 ${isExpanded ? 'flex-1 w-full h-full' : 'h-[450px]'}`}
      >
        <svg ref={svgRef} className="w-full h-full block" />
      </div>
    </div>
  );
};

export default ConceptMap;
