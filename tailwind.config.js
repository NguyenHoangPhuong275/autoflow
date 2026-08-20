export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: '#090d16',
                surface: '#0f172a',
                'surface-elevated': '#1e293b',
                'border-subtle': 'rgba(255, 255, 255, 0.08)',
                'border-glow': 'rgba(99, 102, 241, 0.3)',
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                cyan: {
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                },
                emerald: {
                    400: '#34d399',
                    500: '#10b981',
                }
            },
            animation: {
                'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
                'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s infinite linear',
                'spin-slow': 'spin 8s linear infinite',
                'meteor': 'meteor 5s linear infinite',
                'shimmer-slide': 'shimmer-slide var(--speed, 2.5s) ease-in-out infinite alternate',
            },
            keyframes: {
                'border-beam': {
                    '100%': {
                        'offset-distance': '100%',
                    },
                },
                'pulse-glow': {
                    '0%, 100%': {
                        opacity: '1',
                        transform: 'scale(1)',
                        filter: 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.6))',
                    },
                    '50%': {
                        opacity: '0.7',
                        transform: 'scale(0.98)',
                        filter: 'drop-shadow(0 0 5px rgba(99, 102, 241, 0.2))',
                    },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'meteor': {
                    '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
                    '70%': { opacity: '1' },
                    '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: '0' },
                },
                'shimmer-slide': {
                    'to': { transform: 'translate(calc(100cqw - 100%), 0)' },
                },
            },
            fontFamily: {
                sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            boxShadow: {
                'glow-sm': '0 0 15px -3px rgba(99, 102, 241, 0.3)',
                'glow-md': '0 0 25px -5px rgba(99, 102, 241, 0.45)',
                'glow-lg': '0 0 40px -8px rgba(99, 102, 241, 0.6)',
                'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.5)',
                'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.5)',
            },
        },
    },
    plugins: [],
};
