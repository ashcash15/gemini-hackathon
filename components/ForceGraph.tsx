import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { LearningGraph, LearningNode, NodeStatus } from '../types';

interface ForceGraphProps {
  data: LearningGraph;
  onNodeClick: (node: LearningNode) => void;
  width?: number;
  height?: number;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ data, onNodeClick, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // We clone data to avoid mutating props directly during D3 simulation
  // Memoize to prevent re-running simulation unless data actually changes structurally
  const graphData = useMemo(() => {
    return {
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    };
  }, [data.nodes.length, data.links.length, JSON.stringify(data.nodes.map(n => n.status))]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    // Define Arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) // Offset from node center
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b"); // Slate-500

    // Compute levels for "tree-like" left-to-right flow
    const levels: Record<string, number> = {};
    const computeLevels = () => {
      // Basic topological level assignment
      let changed = true;
      // Initialize roots
      graphData.nodes.forEach(n => {
          levels[n.id] = 0;
      });
      
      let iterations = 0;
      while(changed && iterations < 20) {
          changed = false;
          iterations++;
          graphData.links.forEach(link => {
             // D3 converts source/target to objects, but initially they might be strings or objects
             const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
             const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
             
             if (levels[sourceId] !== undefined && levels[targetId] !== undefined) {
                 if (levels[targetId] < levels[sourceId] + 1) {
                     levels[targetId] = levels[sourceId] + 1;
                     changed = true;
                 }
             }
          });
      }
    };
    computeLevels();
    
    const maxLevel = Math.max(...Object.values(levels), 1);
    const levelWidth = w / (maxLevel + 1);

    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("collide", d3.forceCollide(50))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("x", d3.forceX((d: any) => {
         const lvl = levels[d.id] || 0;
         return (lvl * levelWidth) + (levelWidth / 2); // Distribute left to right
      }).strength(0.5))
      .force("y", d3.forceY(h/2).strength(0.1));

    const link = svg.append("g")
      .selectAll("line")
      .data(graphData.links)
      .enter().append("line")
      .attr("stroke", "#334155")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .enter().append("g")
      .attr("cursor", (d: any) => d.status === NodeStatus.LOCKED ? "not-allowed" : "pointer")
      .on("click", (event, d: any) => {
        if (d.status !== NodeStatus.LOCKED) {
          onNodeClick(d);
        }
      });

    // Node Circles
    nodeGroup.append("circle")
      .attr("r", 20)
      .attr("fill", (d: any) => {
        switch (d.status) {
          case NodeStatus.COMPLETED: return "#10b981"; // Emerald-500
          case NodeStatus.ACTIVE: return "#f59e0b"; // Amber-500
          case NodeStatus.AVAILABLE: return "#3b82f6"; // Blue-500
          case NodeStatus.LOCKED: return "#1e293b"; // Slate-800
          default: return "#94a3b8";
        }
      })
      .attr("stroke", (d: any) => {
        return d.status === NodeStatus.LOCKED ? "#475569" : "#f8fafc";
      })
      .attr("stroke-width", 2);

    // Status Indicator Ring (Pulse if available)
    nodeGroup.filter((d: any) => d.status === NodeStatus.AVAILABLE)
        .append("circle")
        .attr("r", 25)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", 2)
        .append("animate")
        .attr("attributeName", "r")
        .attr("from", "20")
        .attr("to", "30")
        .attr("dur", "1.5s")
        .attr("repeatCount", "indefinite")
        .select(function() { return this.parentNode; }) // Go back to circle
        .append("animate")
        .attr("attributeName", "opacity")
        .attr("from", "1")
        .attr("to", "0")
        .attr("dur", "1.5s")
        .attr("repeatCount", "indefinite");


    // Text Labels
    nodeGroup.append("text")
      .text((d: any) => d.title)
      .attr("x", 0)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .call(wrap, 120); // Helper to wrap text

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, onNodeClick]);

  // Text wrapping helper for D3
  function wrap(text: any, width: number) {
    text.each(function(this: SVGTextElement) {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      let word;
      let line: string[] = [];
      let lineNumber = 0;
      const lineHeight = 1.1; // ems
      const y = text.attr("y");
      const dy = 0; 
      let tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if ((tspan.node()?.getComputedTextLength() || 0) > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-xl bg-dark-surface border border-dark-border overflow-hidden relative shadow-2xl">
        <svg ref={svgRef} className="w-full h-full block"></svg>
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-slate-300">Completed</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-slate-300">Available</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-600"></div>
                <span className="text-xs text-slate-300">Locked</span>
            </div>
        </div>
    </div>
  );
};

export default ForceGraph;
