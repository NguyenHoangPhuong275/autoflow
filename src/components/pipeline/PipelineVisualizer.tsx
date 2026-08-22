import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ArrowPathIcon as RotateCcw,
  CpuChipIcon as Cpu,
  DocumentArrowUpIcon as HardDrive,
  SignalIcon as Activity,
  SparklesIcon as BrainCircuit,
  TableCellsIcon as FileSpreadsheet,
  EnvelopeIcon as Mail,
  FolderIcon as Folder,
  DocumentTextIcon as FileDoc,
} from '@heroicons/react/24/outline';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { Meteors } from '@/components/ui/meteors';
import { useDraggable, clearStoredPositions } from '@/hooks/useDraggable';
import { DataSourceId, PipelineStage } from '@/types';

interface PipelineVisualizerProps {
  activeSourceId: DataSourceId | null;
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
  const sheetsRef = useRef<HTMLDivElement>(null);
  const gmailRef = useRef<HTMLDivElement>(null);
  const driveRef = useRef<HTMLDivElement>(null);
  const docsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HTMLDivElement>(null);
  const deepSeekRef = useRef<HTMLDivElement>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const handleDragMove = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleResetPositions = useCallback(() => {
    clearStoredPositions();
    const allRefs = [sheetsRef, gmailRef, driveRef, docsRef, fileRef, engineRef, deepSeekRef];
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
      id: 'google_sheets' as const,
      storageId: 'source_google_sheets',
      label: 'Google Sheets',
      icon: FileSpreadsheet,
      ref: sheetsRef,
      beamColor: '#10b981',
      activeClass: 'bg-[#0e1c2e] border-emerald-500 text-emerald-300',
    },
    {
      id: 'gmail' as const,
      storageId: 'source_gmail',
      label: 'Gmail API',
      icon: Mail,
      ref: gmailRef,
      beamColor: '#f43f5e',
      activeClass: 'bg-[#2a131a] border-rose-500 text-rose-300',
    },
    {
      id: 'google_drive' as const,
      storageId: 'source_google_drive',
      label: 'Google Drive',
      icon: Folder,
      ref: driveRef,
      beamColor: '#3b82f6',
      activeClass: 'bg-[#0f1d38] border-blue-500 text-blue-300',
    },
    {
      id: 'google_docs' as const,
      storageId: 'source_google_docs',
      label: 'Google Docs',
      icon: FileDoc,
      ref: docsRef,
      beamColor: '#06b6d4',
      activeClass: 'bg-[#0b222d] border-cyan-500 text-cyan-300',
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
          <span className="text-slate-300">LUỒNG XỬ LÝ WORKSPACE</span>
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

      <div className="z-10 flex flex-col gap-1 pt-4">
        {sources.map(({ id, storageId, label, icon: Icon, ref, activeClass }) => (
          <DraggableNode
            key={id}
            id={storageId}
            nodeRef={ref as React.RefObject<HTMLDivElement>}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
            onDragMove={handleDragMove}
            className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] sm:text-[10px] transition-colors cursor-grab active:cursor-grabbing ${
              activeSourceId === id ? `${activeClass} font-bold` : 'border-[#1a2336] bg-[#070a12] text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="h-2.5 w-2.5 shrink-0" />
            <span>{label}</span>
          </DraggableNode>
        ))}
      </div>

      <DraggableNode
        id="node_engine"
        nodeRef={engineRef as React.RefObject<HTMLDivElement>}
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        onDragMove={handleDragMove}
        className={`z-10 mt-4 flex flex-col items-center gap-1 rounded-lg border px-3 py-1.5 text-center transition-colors cursor-grab active:cursor-grabbing ${
          isRunning ? 'border-cyan-400 bg-[#0e1c2e] text-cyan-300' : 'border-[#1a2336] bg-[#070a12] text-slate-300'
        }`}
      >
        <Cpu className="h-4 w-4 text-indigo-400" />
        <span className="text-[11px] font-bold">AutoFlow Core</span>
      </DraggableNode>

      <DraggableNode
        id="node_deepseek"
        nodeRef={deepSeekRef as React.RefObject<HTMLDivElement>}
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        onDragMove={handleDragMove}
        className={`z-10 mt-4 flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] font-bold cursor-grab active:cursor-grabbing ${
          isRunning
            ? 'border-cyan-500 bg-cyan-950/70 text-cyan-300'
            : 'border-[#1a2336] bg-[#070a12] text-slate-400'
        }`}
      >
        <BrainCircuit className="h-3.5 w-3.5 text-cyan-400" />
        <span>DeepSeek AI</span>
      </DraggableNode>

      {sources.map(({ id, ref, beamColor }, index) => (
        <AnimatedBeam
          key={id}
          containerRef={containerRef}
          fromRef={ref}
          toRef={engineRef}
          curvature={(index - 2) * 6}
          beamColor={beamColor}
          duration={isRunning ? 1.5 : 3.5}
          isActive={activeSourceId === id || (activeSourceId === 'google_sheets' && id === 'google_sheets')}
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
