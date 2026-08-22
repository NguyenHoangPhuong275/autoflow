import { useCallback, useRef } from 'react';
import { MoonIcon as Moon, SunIcon as Sun, } from '@heroicons/react/24/outline';
import { flushSync } from 'react-dom';
import { cn } from '@/utils/cn';
import { Theme } from '@/hooks/useTheme';
interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<'button'> {
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    duration?: number;
}
export const AnimatedThemeToggler = ({ className, theme, onThemeChange, duration = 450, ...props }: AnimatedThemeTogglerProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isTransitioningRef = useRef(false);
    const toggleTheme = useCallback(() => {
        const button = buttonRef.current;
        if (!button || isTransitioningRef.current)
            return;
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        const applyTheme = () => {
            document.documentElement.classList.toggle('dark', nextTheme === 'dark');
            onThemeChange(nextTheme);
        };
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!document.startViewTransition || prefersReducedMotion) {
            applyTheme();
            return;
        }
        const { top, left, width, height } = button.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        isTransitioningRef.current = true;
        const transition = document.startViewTransition(() => {
            flushSync(applyTheme);
        });
        transition.ready
            .then(() => {
            document.documentElement.animate({
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${radius}px at ${x}px ${y}px)`,
                ],
            }, {
                duration,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)',
            });
        }).catch(() => {
            isTransitioningRef.current = false;
        });
        transition.finished.finally(() => {
            isTransitioningRef.current = false;
        });
    }, [duration, onThemeChange, theme]);
    return (<button ref={buttonRef} type="button" onClick={toggleTheme} className={cn(className)} aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} {...props}>
      {theme === 'dark' ? <Sun /> : <Moon />}
      <span className="sr-only">Đổi giao diện sáng tối</span>
    </button>);
};
