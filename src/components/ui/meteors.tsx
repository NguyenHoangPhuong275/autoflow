import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

interface MeteorsProps {
  number?: number;
  className?: string;
}

interface MeteorStyle {
  top: string;
  left: string;
  animationDelay: string;
  animationDuration: string;
}

function createMeteorStyles(number: number): MeteorStyle[] {
  return [...new Array(number)].map(() => {
    const duration = Math.random() * 3 + 2;
    return {
      top: `${Math.random() * 50 - 10}%`,
      left: `${Math.random() * 100}%`,
      animationDelay: `${-Math.random() * duration}s`,
      animationDuration: `${duration}s`,
    };
  });
}

export const Meteors = ({ number = 12, className }: MeteorsProps) => {
  const [meteorStyles, setMeteorStyles] = useState<MeteorStyle[]>(() => createMeteorStyles(number));

  useEffect(() => {
    setMeteorStyles(createMeteorStyles(number));
  }, [number]);

  return (
    <>
      {meteorStyles.map((style, idx) => (
        <span
          key={`meteor-${idx}`}
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 size-0.5 rotate-[215deg] animate-meteor rounded-full bg-cyan-400 shadow-[0_0_0_1px_#ffffff10]',
            "before:content-[''] before:absolute before:top-1/2 before:w-[50px] before:h-[1px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-cyan-400 before:to-transparent",
            className,
          )}
          style={style}
        />
      ))}
    </>
  );
};
