import React from 'react';
import {
  ArrowLeftStartOnRectangleIcon as LogOut,
  ArrowPathIcon as Loader2,
  ArrowPathIcon as RotateCcw,
  ArrowRightEndOnRectangleIcon as LogIn,
  BoltIcon as Zap,
  CheckCircleIcon as CheckCircle2,
  CircleStackIcon as Layers,
  CpuChipIcon as BrainCircuit,
  CpuChipIcon as Cpu,
  KeyIcon as KeyRound,
  PauseIcon as Pause,
  PlayIcon as Play,
  XCircleIcon as XCircle,
  XMarkIcon as X,
} from '@heroicons/react/24/outline';
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
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  stage,
  speed,
  onStart,
  onPause,
  onResume,
  onReset,
  onChangeSpeed,
  theme,
  onThemeChange,
}) => {
  const {
    isModalOpen,
    setIsModalOpen,
    clientId,
    setClientId,
    userEmail,
    isLoading,
    error,
    performLogin,
    handleButtonClick,
    handleLogout,
  } = useGoogleAuth();

  const isRunning = stage === 'running';
  const isPaused = stage === 'paused';
  const hasData = stats.total > 0;

  return (
    <>
      <header className="min-h-11 px-2 sm:px-3.5 panel-card rounded-lg flex items-center justify-between gap-2 sm:gap-4 shrink-0 whitespace-nowrap text-xs font-mono">
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="font-extrabold text-xs sm:text-sm text-[var(--text-primary)] tracking-wider">AUTOFLOW</span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 rounded bg-[#162036] text-indigo-400 border border-indigo-900/60">
              PRO
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-[#131b2e] border border-cyan-500/40 text-cyan-300 text-[10px]">
            <BrainCircuit className="w-3 h-3 text-cyan-400" />
            <span className="font-semibold">Trợ lý AI đang hoạt động</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 lg:gap-4 px-2.5 py-1 bg-[#090d16] rounded-md border border-[#1a2336] text-[10px] lg:text-[11px] overflow-hidden">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tổng:</span>
            <NumberTicker value={stats.total} className="text-[var(--text-primary)]" />
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Xong:</span>
            <NumberTicker value={stats.success} className="text-emerald-400" />
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5 text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            <span>Lỗi:</span>
            <NumberTicker value={stats.failed} className="text-rose-400" />
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-2 text-cyan-400">
            <span>Tiến độ:</span>
            <span className="font-bold text-[var(--text-primary)]">{stats.progressPercent}%</span>
            <div className="w-12 lg:w-16 bg-[#161f32] h-1.5 rounded overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${stats.progressPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <AnimatedThemeToggler
            theme={theme}
            onThemeChange={onThemeChange}
            duration={480}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#1a2336] bg-[#090d16] text-slate-400 transition-colors hover:bg-[#161f32] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&_svg]:h-3.5 [&_svg]:w-3.5"
          />

          <div className="hidden xl:flex items-center bg-[#090d16] p-0.5 rounded border border-[#1a2336] text-[10px] text-slate-400">
            <Zap className="w-3 h-3 text-cyan-400 ml-1 mr-0.5" />
            {[
              { label: '1x', ms: 1000 },
              { label: '2x', ms: 500 },
              { label: '4x', ms: 200 },
            ].map((item) => (
              <button
                key={item.ms}
                onClick={() => onChangeSpeed(item.ms)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  speed === item.ms
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'hover:text-[var(--text-primary)] text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {userEmail ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#090d16] border border-emerald-500/40 text-emerald-400 text-[10px] sm:text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-medium max-w-[90px] sm:max-w-[140px] truncate">{userEmail}</span>
              <button onClick={handleLogout} className="ml-0.5 text-slate-500 hover:text-rose-400 p-0.5 transition-colors" title="Đăng xuất tài khoản này">
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleButtonClick}
              disabled={isLoading}
              className="px-2 sm:px-2.5 py-1 rounded bg-[#131b2e] hover:bg-[#1a253e] border border-indigo-500/40 text-indigo-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Đang mở...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3 text-indigo-400" />
                  <span className="hidden sm:inline">Đăng Nhập Google</span>
                  <span className="sm:hidden">Đăng Nhập</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onReset}
            disabled={!hasData || isRunning}
            className="p-1.5 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-400 hover:text-[var(--text-primary)] border border-[#1a2336] disabled:opacity-40"
            title="Đặt lại trạng thái các hàng"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {!isRunning && !isPaused ? (
            <ShimmerButton onClick={onStart} disabled={!hasData} shimmerColor="#34d399" background="rgba(5, 150, 105, 1)" shimmerDuration="2s">
              <Play className="w-3.5 h-3.5" />
              <span>BẮT ĐẦU</span>
            </ShimmerButton>
          ) : isPaused ? (
            <button
              onClick={onResume}
              className="px-2.5 sm:px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 sm:gap-1.5 transition-all text-[11px]"
            >
              <Play className="w-3.5 h-3.5" />
              <span>TIẾP TỤC</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="px-2.5 sm:px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1 sm:gap-1.5 transition-all text-[11px]"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>TẠM DỪNG</span>
            </button>
          )}
        </div>
      </header>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md font-sans text-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#0c121e]/95 border border-slate-700/60 rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] text-slate-100 backdrop-blur-xl">
            <div className="p-4 sm:p-5 bg-[#090e18]/90 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-slate-100 text-sm sm:text-base">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span>Cấu Hình Google OAuth Client</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5">
              <p className="text-slate-300 text-xs leading-relaxed">
                Để kết nối và đồng bộ trực tiếp với <strong>Google Sheets, Drive và Gmail</strong>, hãy nhập <strong>Google OAuth Client ID</strong> từ Google Cloud Console:
              </p>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Google Client ID:
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && clientId.trim() && performLogin(clientId)}
                  placeholder="xxxx-xxxxxxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#111928] border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-xs font-mono placeholder:font-sans placeholder-slate-500"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#111928]/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-indigo-300 block">Lưu ý cấu hình Google Cloud:</span>
                <p>Thêm domain hiện tại vào <code>Authorized JavaScript origins</code> trên Google Cloud Console.</p>
              </div>
            </div>

            <div className="p-4 bg-[#090e18]/90 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => performLogin(clientId)}
                disabled={isLoading || !clientId.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang mở...</span>
                  </>
                ) : (
                  <span>Lưu & Đăng Nhập</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
