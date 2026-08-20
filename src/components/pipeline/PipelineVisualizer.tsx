import React, { useRef } from 'react';
import { CircleStackIcon as Database, CpuChipIcon as Cpu, DocumentArrowUpIcon as HardDrive, SignalIcon as Activity, SparklesIcon as BrainCircuit, TableCellsIcon as FileSpreadsheet, } from '@heroicons/react/24/outline';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { Meteors } from '@/components/ui/meteors';
import { DataSourceId, PipelineStage } from '@/types';
interface PipelineVisualizerProps {
    activeSourceId: DataSourceId;
    stage: PipelineStage;
}
export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ activeSourceId, stage, }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sampleRef = useRef<HTMLDivElement>(null);
    const sheetsRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<HTMLDivElement>(null);
    const deepSeekRef = useRef<HTMLDivElement>(null);
    const isRunning = stage === 'running';
    const sources = [
        {
            id: 'sample' as const,
            label: 'Dữ liệu mẫu',
            icon: Database,
            ref: sampleRef,
            beamColor: '#6366f1',
            activeClass: 'bg-[#151630] border-indigo-500 text-indigo-300',
        },
        {
            id: 'google_sheets' as const,
            label: 'Google Sheets',
            icon: FileSpreadsheet,
            ref: sheetsRef,
            beamColor: '#10b981',
            activeClass: 'bg-[#0e1c2e] border-emerald-500 text-emerald-300',
        },
        {
            id: 'local_file' as const,
            label: 'Excel / CSV',
            icon: HardDrive,
            ref: fileRef,
            beamColor: '#f59e0b',
            activeClass: 'bg-[#24180b] border-amber-500 text-amber-300',
        },
    ];
    return (<div ref={containerRef} className="relative flex h-full w-full items-center justify-between overflow-hidden whitespace-nowrap rounded-lg p-2.5 font-mono text-xs panel-card">
      {isRunning && <Meteors number={8} />}
      <div className="absolute left-2.5 right-2.5 top-2 flex items-center justify-between border-b border-[#1a2336] pb-1 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 font-bold">
          <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'animate-pulse bg-cyan-400' : 'bg-slate-600'}`}/>
          <span className="text-slate-300">LUỒNG XỬ LÝ</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isRunning && (<span className="flex items-center gap-1 text-cyan-400">
              <Activity className="h-2.5 w-2.5 animate-spin"/> Đang xử lý
            </span>)}
          <span className="rounded border border-[#1a2336] bg-[#131b2e] px-1 py-0.5 text-[9px] text-slate-400">
            {stage.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="z-10 flex flex-col gap-1 pt-4">
        {sources.map(({ id, label, icon: Icon, ref, activeClass }) => (<div key={id} ref={ref} className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition-colors ${activeSourceId === id
                ? `${activeClass} font-bold`
                : 'border-[#1a2336] bg-[#070a12] text-slate-600'}`}>
            <Icon className="h-2.5 w-2.5"/>
            <span>{label}</span>
          </div>))}
      </div>

      <div ref={engineRef} className={`z-10 mt-4 flex flex-col items-center gap-1 rounded-lg border px-3 py-1.5 text-center transition-colors ${isRunning
            ? 'border-cyan-400 bg-[#0e1c2e] text-cyan-300'
            : 'border-[#1a2336] bg-[#070a12] text-slate-300'}`}>
        <Cpu className="h-4 w-4"/>
        <span className="text-[11px] font-bold">AutoFlow Core</span>
      </div>

      <div ref={deepSeekRef} className={`z-10 mt-4 flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] font-bold ${isRunning
            ? 'border-cyan-500 bg-cyan-950/70 text-cyan-300'
            : 'border-[#1a2336] bg-[#070a12] text-slate-400'}`}>
        <BrainCircuit className="h-3.5 w-3.5"/>
        <span>DeepSeek AI</span>
      </div>

      {sources.map(({ id, ref, beamColor }, index) => (<AnimatedBeam key={id} containerRef={containerRef} fromRef={ref} toRef={engineRef} curvature={(index - 1) * 8} beamColor={beamColor} duration={isRunning ? 1.5 : 3.5} isActive={activeSourceId === id}/>))}

      <AnimatedBeam containerRef={containerRef} fromRef={engineRef} toRef={deepSeekRef} beamColor="#22d3ee" duration={isRunning ? 1.5 : 3.5} isActive={isRunning}/>
    </div>);
};
