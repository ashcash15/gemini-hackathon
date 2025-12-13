
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { LearningGraph, LearningNode, NodeStatus } from '../types';

interface ForceGraphProps {
  data: LearningGraph;
  onNodeClick: (node: LearningNode) => void;
  width?: number;
  height?: number;
  isDarkMode: boolean;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ data, onNodeClick, width = 800, height = 600, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const graphData = useMemo(() => {
    return {
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    };
  }, [data.nodes.length, data.links.length, JSON.stringify(data.nodes.map(n => n.status))]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    // Define colors based on mode
    const colors = {
        line: isDarkMode ? "#374151" : "#e2e8f0",
        arrow: isDarkMode ? "#64748b" : "#cbd5e1",
        text: isDarkMode ? "#e2e8f0" : "#334155",
        node: {
            completed: { fill: isDarkMode ? "#064e3b" : "#dcfce7", stroke: isDarkMode ? "#34d399" : "#16a34a" },
            active: { fill: isDarkMode ? "#451a03" : "#fef3c7", stroke: isDarkMode ? "#fbbf24" : "#d97706" },
            available: { fill: isDarkMode ? "#172554" : "#ffffff", stroke: isDarkMode ? "#60a5fa" : "#2563eb" },
            locked: { fill: isDarkMode ? "#1e2937" : "#f1f5f9", stroke: isDarkMode ? "#4b5563" : "#cbd5e1" }
        }
    };

    // Define Arrow Marker
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 32)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", colors.arrow);

    // Compute Levels
    const levels: Record<string, number> = {};
    const computeLevels = () => {
      graphData.nodes.forEach(n => { levels[n.id] = 0; });
      let changed = true;
      let iterations = 0;
      while(changed && iterations < 20) {
          changed = false;
          iterations++;
          graphData.links.forEach(link => {
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
      .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("collide", d3.forceCollide(50))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("x", d3.forceX((d: any) => {
         const lvl = levels[d.id] || 0;
         return (lvl * levelWidth) + (levelWidth / 2);
      }).strength(0.5))
      .force("y", d3.forceY(h/2).strength(0.2));

    const link = svg.append("g")
      .selectAll("line")
      .data(graphData.links)
      .enter().append("line")
      .attr("stroke", colors.line)
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

    nodeGroup.append("circle")
      .attr("r", 24)
      .attr("fill", (d: any) => {
        switch (d.status) {
          case NodeStatus.COMPLETED: return colors.node.completed.fill;
          case NodeStatus.ACTIVE: return colors.node.active.fill;
          case NodeStatus.AVAILABLE: return colors.node.available.fill;
          case NodeStatus.LOCKED: return colors.node.locked.fill;
          default: return colors.node.locked.fill;
        }
      })
      .attr("stroke", (d: any) => {
         switch (d.status) {
          case NodeStatus.COMPLETED: return colors.node.completed.stroke;
          case NodeStatus.ACTIVE: return colors.node.active.stroke;
          case NodeStatus.AVAILABLE: return colors.node.available.stroke;
          case NodeStatus.LOCKED: return colors.node.locked.stroke;
          default: return colors.node.locked.stroke;
        }
      })
      .attr("stroke-width", (d: any) => d.status === NodeStatus.AVAILABLE ? 2 : 1.5)
      .style("filter", (d: any) => d.status === NodeStatus.AVAILABLE ? "drop-shadow(0px 2px 4px rgba(0,0,0,0.05))" : "none");

    nodeGroup.append("text")
      .text((d: any) => d.title)
      .attr("x", 0)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("fill", colors.text)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .call(wrap, 120);

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
  }, [graphData, onNodeClick, isDarkMode]);

  function wrap(text: any, width: number) {
    text.each(function(this: SVGTextElement) {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      let word;
      let line: string[] = [];
      let lineNumber = 0;
      const lineHeight = 1.1; 
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
    <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden relative shadow-sm transition-colors">
        <svg ref={svgRef} className="w-full h-full block"></svg>
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none p-3 rounded-lg bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border border-neutral-100 dark:border-neutral-800 shadow-sm transition-colors">
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-100 dark:bg-green-900 border border-green-600 dark:border-green-500"></div>
                <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Completed</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-neutral-800 border border-blue-600 dark:border-blue-500"></div>
                <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Available</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600"></div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Locked</span>
            </div>
        </div>
    </div>
  );
};

export default ForceGraph;
