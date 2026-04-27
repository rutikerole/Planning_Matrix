import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        md: '2.5rem',
        lg: '4rem',
      },
      screens: {
        '2xl': '1240px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: [
          'Instrument Serif',
          'New York',
          'Charter',
          'Iowan Old Style',
          'Times New Roman',
          'serif',
        ],
        display: [
          'Instrument Serif',
          'New York',
          'Charter',
          'Iowan Old Style',
          'Times New Roman',
          'serif',
        ],
      },
      fontSize: {
        eyebrow: [
          '0.6875rem',
          { lineHeight: '1', letterSpacing: '0.18em', fontWeight: '500' },
        ],
        caption: ['0.8125rem', { lineHeight: '1.45' }],
        'body-lg': ['1.125rem', { lineHeight: '1.62' }],
        'body-xl': ['1.25rem', { lineHeight: '1.55' }],
        'title-sm': [
          '1.375rem',
          { lineHeight: '1.3', letterSpacing: '-0.01em' },
        ],
        title: ['1.75rem', { lineHeight: '1.22', letterSpacing: '-0.018em' }],
        'title-lg': [
          '2.125rem',
          { lineHeight: '1.15', letterSpacing: '-0.02em' },
        ],
        headline: [
          'clamp(2rem, 4.2vw, 2.875rem)',
          { lineHeight: '1.1', letterSpacing: '-0.022em' },
        ],
        'display-3': [
          'clamp(2.5rem, 5.2vw, 3.75rem)',
          { lineHeight: '1.05', letterSpacing: '-0.028em' },
        ],
        'display-2': [
          'clamp(2.75rem, 6vw, 4.75rem)',
          { lineHeight: '1.02', letterSpacing: '-0.032em' },
        ],
        'display-1': [
          'clamp(2.75rem, 7.4vw, 5.75rem)',
          { lineHeight: '0.98', letterSpacing: '-0.038em' },
        ],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        paper: 'hsl(var(--paper))',
        ink: 'hsl(var(--ink))',
        clay: 'hsl(var(--clay))',
        'clay-soft': 'hsl(var(--clay-soft))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.16, 1, 0.3, 1)',
        soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        calm: '700ms',
        soft: '180ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'hairline-draw': {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left center' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left center' },
        },
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'draw-path': {
          '0%': { strokeDashoffset: '1' },
          '100%': { strokeDashoffset: '0' },
        },
        'breath-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.35)', opacity: '1' },
        },
        'travel-dot': {
          '0%, 100%': { opacity: '0.28' },
          '40%, 60%': { opacity: '1' },
        },
        'mesh-drift-a': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(60px, 40px)' },
        },
        'mesh-drift-b': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-50px, 60px)' },
        },
        'mesh-drift-c': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(40px, -50px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'accordion-up': 'accordion-up 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'hairline-draw': 'hairline-draw 1.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-rise': 'fade-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        'draw-path': 'draw-path 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        'breath-dot': 'breath-dot 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'travel-dot': 'travel-dot 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'mesh-drift-a': 'mesh-drift-a 30s ease-in-out infinite',
        'mesh-drift-b': 'mesh-drift-b 35s ease-in-out infinite',
        'mesh-drift-c': 'mesh-drift-c 40s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
