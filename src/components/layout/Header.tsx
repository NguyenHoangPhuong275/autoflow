import React from 'react';
import { ArrowLeftStartOnRectangleIcon as LogOut, ArrowPathIcon as Loader2, ArrowPathIcon as RotateCcw, ArrowRightEndOnRectangleIcon as LogIn, BoltIcon as Zap, CheckCircleIcon as CheckCircle2, CircleStackIcon as Layers, CpuChipIcon as BrainCircuit, CpuChipIcon as Cpu, KeyIcon as KeyRound, PauseIcon as Pause, PlayIcon as Play, XCircleIcon as XCircle, XMarkIcon as X, } from '@heroicons/react/24/outline';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { ExecutionStats, PipelineStage } from '@/types';
import { Theme } from '@/hooks/useTheme';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
interface HeaderProps {
    stats: ExecutionStats;
    stage: PipelineStage;
    speed: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onReset: () => void;
    onChangeSpeed: (ms: number) => void;
    onLoginSuccess?: () => void;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
}
export const Header: React.FC<HeaderProps> = ({ stats, stage, speed, onStart, onPause, onResume, onReset, onChangeSpeed, onLoginSuccess, theme, onThemeChange, }) => {
    const { isModalOpen, setIsModalOpen, clientId, setClientId, userEmail, isLoading, error, performLogin, handleButtonClick, handleLogout, } = useGoogleAuth(onLoginSuccess);
    const isRunning = stage === 'running';
    const isPaused = stage === 'paused';
    const hasData = stats.total > 0;
    return (<>
      <header className="h-11 px-3.5 panel-card rounded-lg flex items-center justify-between gap-4 shrink-0 whitespace-nowrap text-xs font-mono">

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Cpu className="w-4 h-4"/>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-[var(--text-primary)] tracking-wider">AUTOFLOW</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#162036] text-indigo-400 border border-indigo-900/60">
              PRO v2.5
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-[#131b2e] border border-cyan-500/40 text-cyan-300 text-[10px]">
            <BrainCircuit className="w-3 h-3 text-cyan-400"/>
            <span className="font-semibold">DeepSeek AI Active</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-[#090d16] rounded-md border border-[#1a2336] text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-indigo-400"/>
            <span>Tổng:</span>
            <NumberTicker value={stats.total} className="text-[var(--text-primary)]"/>
          </div>

          <div className="h-3 w-px bg-slate-800"/>

          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5"/>
            <span>Xong:</span>
            <NumberTicker value={stats.success} className="text-emerald-400"/>
          </div>

          <div className="h-3 w-px bg-slate-800"/>

          <div className="flex items-center gap-1.5 text-rose-400">
            <XCircle className="w-3.5 h-3.5"/>
            <span>Lỗi:</span>
            <NumberTicker value={stats.failed} className="text-rose-400"/>
          </div>

          <div className="h-3 w-px bg-slate-800"/>

          <div className="flex items-center gap-2 text-cyan-400">
            <span>Tiến độ:</span>
            <span className="font-bold text-[var(--text-primary)]">{stats.progressPercent}%</span>
            <div className="w-16 bg-[#161f32] h-1.5 rounded overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${stats.progressPercent}%` }}/>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <AnimatedThemeToggler theme={theme} onThemeChange={onThemeChange} duration={480} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#1a2336] bg-[#090d16] text-slate-400 transition-colors hover:bg-[#161f32] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&_svg]:h-3.5 [&_svg]:w-3.5"/>

          <div className="hidden lg:flex items-center bg-[#090d16] p-0.5 rounded border border-[#1a2336] text-[10px] text-slate-400">
            <Zap className="w-3 h-3 text-cyan-400 ml-1 mr-0.5"/>
            {[
            { label: '1x', ms: 1000 },
            { label: '2x', ms: 500 },
            { label: '4x', ms: 200 },
        ].map((item) => (<button key={item.ms} onClick={() => onChangeSpeed(item.ms)} className={`px-1.5 py-0.5 rounded transition-colors ${speed === item.ms
                ? 'bg-indigo-600 text-white font-bold'
                : 'hover:text-[var(--text-primary)] text-slate-400'}`}>
                {item.label}
              </button>))}
          </div>

          {userEmail ? (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#090d16] border border-emerald-500/40 text-emerald-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="font-medium max-w-[140px] truncate">{userEmail}</span>
              <button onClick={handleLogout} className="ml-1 text-slate-500 hover:text-rose-400 p-0.5 transition-colors" title="Đăng xuất tài khoản này">
                <LogOut className="w-3 h-3"/>
              </button>
            </div>) : (<button onClick={handleButtonClick} disabled={isLoading} className="px-2.5 py-1 rounded bg-[#131b2e] hover:bg-[#1a253e] border border-indigo-500/40 text-indigo-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50">
              {isLoading ? (<>
                  <Loader2 className="w-3 h-3 animate-spin"/>
                  <span>Đang mở...</span>
                </>) : (<>
                  <LogIn className="w-3 h-3 text-indigo-400"/>
                  <span>Đăng Nhập Google</span>
                </>)}
            </button>)}

          <button onClick={onReset} disabled={!hasData || isRunning} className="p-1.5 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-400 hover:text-[var(--text-primary)] border border-[#1a2336] disabled:opacity-40" title="Đặt lại trạng thái các hàng">
            <RotateCcw className="w-3.5 h-3.5"/>
          </button>

          {!isRunning && !isPaused ? (<ShimmerButton onClick={onStart} disabled={!hasData} shimmerColor="#34d399" background="rgba(5, 150, 105, 1)" shimmerDuration="2s">
              <Play className="w-3.5 h-3.5"/>
              <span>BẮT ĐẦU</span>
            </ShimmerButton>) : isPaused ? (<button onClick={onResume} className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 transition-all">
              <Play className="w-3.5 h-3.5"/>
              <span>TIẾP TỤC</span>
            </button>) : (<button onClick={onPause} className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 transition-all">
              <Pause className="w-3.5 h-3.5"/>
              <span>TẠM DỪNG</span>
            </button>)}
        </div>
      </header>

      {isModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs">
          <div className="w-full max-w-md bg-[#0e1422] border border-[#1a2336] rounded-xl overflow-hidden shadow-2xl text-slate-100">
            <div className="p-3.5 bg-[#131b2e] border-b border-[#1a2336] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm">
                <KeyRound className="w-4 h-4 text-indigo-400"/>
                <span>Cấu Hình Google OAuth Client ID</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-[var(--text-primary)]">
                <X className="w-4 h-4"/>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Để kích hoạt quyền đồng bộ 2 chiều lên Google Sheet thật, hãy dán <strong>Google OAuth Client ID</strong> của bạn vào đây:
              </p>

              <div>
                <label className="text-[11px] uppercase text-slate-400 font-bold block mb-1">
                  Google Client ID:
                </label>
                <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxxx-xxxxxxxx.apps.googleusercontent.com" className="w-full px-2.5 py-1.5 rounded bg-[#070a12] border border-[#1a2336] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-[11px]"/>
              </div>

              {error && (<div className="p-2 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px]">
                  {error}
                </div>)}
            </div>

            <div className="p-3 bg-[#131b2e] border-t border-[#1a2336] flex items-center justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-300 border border-[#1a2336]">
                Hủy
              </button>
              <button onClick={() => performLogin(clientId)} disabled={isLoading || !clientId.trim()} className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5">
                {isLoading ? 'Đang mở...' : 'Lưu & Đăng Nhập Ngay'}
              </button>
            </div>
          </div>
        </div>)}
    </>);
};
