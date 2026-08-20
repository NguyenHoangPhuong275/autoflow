import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ArrowPathIcon as RotateCcw,
  CircleStackIcon as Database,
  CpuChipIcon as Cpu,
  DocumentArrowUpIcon as HardDrive,
  SignalIcon as Activity,
  SparklesIcon as BrainCircuit,
  TableCellsIcon as FileSpreadsheet,
} from '@heroicons/react/24/outline';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { Meteors } from '@/components/ui/meteors';
import { useDraggable, clearStoredPositions } from '@/hooks/useDraggable';
import { DataSourceId, PipelineStage } from '@/types';

interface PipelineVisualizerProps {
  activeSourceId: DataSourceId;
  stage: PipelineStage;
}

interface DraggableNodeProps {
  id: string;
  nodeRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragMove: () => void;
  className: string;
  children: React.ReactNode;
}

const DraggableNode: React.FC<DraggableNodeProps> = ({ id, nodeRef, containerRef, onDragMove, className, children }) => {
  const { onPointerDown, style } = useDraggable(id, nodeRef, containerRef, onDragMove);
  return (
    <div
      ref={nodeRef}
      className={className}
      onPointerDown={onPointerDown}
      style={style}
    >
      {children}
    </div>
  );
};

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ activeSourceId, stage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sampleRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HTMLDivElement>(null);
  const deepSeekRef = useRef<HTMLDivElement>(null);

  // Increment to force AnimatedBeam path recalculation during drag
  const [refreshKey, setRefreshKey] = useState(0);
  const handleDragMove = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Recalculate beam paths shortly after mount once stored positions apply
  useEffect(() => {
    const timer = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleResetPositions = useCallback(() => {
    clearStoredPositions();
    const allRefs = [sampleRef, sheetsRef, fileRef, engineRef, deepSeekRef];
    allRefs.forEach((r) => {
      if (r.current) {
        r.current.style.left = '0px';
        r.current.style.top = '0px';
      }
    });
    setRefreshKey((k) => k + 1);
  }, []);

  const isRunning = stage === 'running';

  const sources = [
    {
      id: 'sample' as const,
      storageId: 'source_sample',
      label: 'Dữ liệu mẫu',
      icon: Database,
      ref: sampleRef,
      beamColor: '#6366f1',
      activeClass: 'bg-[#151630] border-indigo-500 text-indigo-300',
    },
    {
      id: 'google_sheets' as const,
      storageId: 'source_google_sheets',
      label: 'Google Sheets',
      icon: FileSpreadsheet,
      ref: sheetsRef,
      beamColor: '#10b981',
      activeClass: 'bg-[#0e1c2e] border-emerald-500 text-emerald-300',
    },
    {
      id: 'local_file' as const,
      storageId: 'source_local_file',
      label: 'Excel / CSV',
      icon: HardDrive,
      ref: fileRef,
      beamColor: '#f59e0b',
      activeClass: 'bg-[#24180b] border-amber-500 text-amber-300',
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-between overflow-hidden whitespace-nowrap rounded-lg p-2.5 font-mono text-xs panel-card"
    >
      {isRunning && <Meteors number={8} />}

      <div className="absolute left-2.5 right-2.5 top-2 flex items-center justify-between border-b border-[#1a2336] pb-1 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 font-bold">
          <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'animate-pulse bg-cyan-400' : 'bg-slate-600'}`} />
          <span className="text-slate-300">LUỒNG XỬ LÝ</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isRunning && (
            <span className="flex items-center gap-1 text-cyan-400">
              <Activity className="h-2.5 w-2.5 animate-spin" /> Đang xử lý
            </span>
          )}
          <button
            onClick={handleResetPositions}
            className="flex items-center gap-1 rounded border border-[#1a2336] bg-[#090d16] hover:bg-[#161f32] px-1.5 py-0.5 text-[9px] text-slate-400 hover:text-slate-200 transition-colors"
            title="Đặt lại vị trí mặc định của các khối"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Reset vị trí</span>
          </button>
          <span className="rounded border border-[#1a2336] bg-[#131b2e] px-1 py-0.5 text-[9px] text-slate-400">
            {stage.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Source nodes — draggable with persistence */}
      <div className="z-10 flex flex-col gap-1 pt-4">
        {sources.map(({ id, storageId, label, icon: Icon, ref, activeClass }) => (
          <DraggableNode
            key={id}
            id={storageId}
            nodeRef={ref as React.RefObject<HTMLDivElement>}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
            onDragMove={handleDragMove}
            className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition-colors ${
              activeSourceId === id ? `${activeClass} font-bold` : 'border-[#1a2336] bg-[#070a12] text-slate-600'
            }`}
          >
            <Icon className="h-2.5 w-2.5" />
            <span>{label}</span>
          </DraggableNode>
        ))}
      </div>

      {/* Engine node — draggable with persistence */}
      <DraggableNode
        id="node_engine"
        nodeRef={engineRef as React.RefObject<HTMLDivElement>}
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        onDragMove={handleDragMove}
        className={`z-10 mt-4 flex flex-col items-center gap-1 rounded-lg border px-3 py-1.5 text-center transition-colors ${
          isRunning ? 'border-cyan-400 bg-[#0e1c2e] text-cyan-300' : 'border-[#1a2336] bg-[#070a12] text-slate-300'
        }`}
      >
        <Cpu className="h-4 w-4" />
        <span className="text-[11px] font-bold">AutoFlow Core</span>
      </DraggableNode>

      {/* DeepSeek node — draggable with persistence */}
      <DraggableNode
        id="node_deepseek"
        nodeRef={deepSeekRef as React.RefObject<HTMLDivElement>}
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        onDragMove={handleDragMove}
        className={`z-10 mt-4 flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] font-bold ${
          isRunning
            ? 'border-cyan-500 bg-cyan-950/70 text-cyan-300'
            : 'border-[#1a2336] bg-[#070a12] text-slate-400'
        }`}
      >
        <BrainCircuit className="h-3.5 w-3.5" />
        <span>DeepSeek AI</span>
      </DraggableNode>

      {/* Beams — live-updating via refreshKey */}
      {sources.map(({ id, ref, beamColor }, index) => (
        <AnimatedBeam
          key={id}
          containerRef={containerRef}
          fromRef={ref}
          toRef={engineRef}
          curvature={(index - 1) * 8}
          beamColor={beamColor}
          duration={isRunning ? 1.5 : 3.5}
          isActive={activeSourceId === id}
          refreshKey={refreshKey}
        />
      ))}

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={engineRef}
        toRef={deepSeekRef}
        beamColor="#22d3ee"
        duration={isRunning ? 1.5 : 3.5}
        isActive={isRunning}
        refreshKey={refreshKey}
      />
    </div>
  );
};
