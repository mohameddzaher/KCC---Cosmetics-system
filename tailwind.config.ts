import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        kcc: {
          // Logo brand color – preserved intact
          green: '#2D6A4F',
          'green-light': '#40916C',
          'green-dark': '#1B4332',
          // Champagne / soft beige accents
          beige: '#D4A574',
          'beige-light': '#E8C9A0',
          'beige-dark': '#B8864A',
          gold: '#C9A84C',
          'gold-light': '#E0C778',
          // Cosmetics rose / blush palette
          rose: '#E8B4BC',
          'rose-light': '#F4D5D0',
          'rose-dark': '#D89BA3',
          blush: '#F7E1DC',
          pearl: '#FFF6F1',
        },
        // Warm cream / ivory backgrounds (light sections)
        cream: {
          50: '#FFFCF8',
          100: '#FFF9F5',
          200: '#FBF3EC',
          300: '#F5EADD',
          400: '#EBDDC9',
          500: '#D9C4A8',
          600: '#B89A7E',
          700: '#8E725B',
          800: '#5A4839',
          900: '#3A2E24',
        },
        // Soft pink / blush palette (cosmetics signature)
        blush: {
          50: '#FFF6F4',
          100: '#FCE8E5',
          200: '#F8D2CD',
          300: '#F2B8B0',
          400: '#E89A92',
          500: '#D89BA3',
          600: '#C57E87',
          700: '#A05E68',
          800: '#7B3F4A',
          900: '#52242C',
        },
        // Champagne (bridges beige & gold)
        champagne: {
          50: '#FBF6EC',
          100: '#F5EAD0',
          200: '#EBD9AB',
          300: '#DEC383',
          400: '#CFAA5E',
          500: '#C9A84C',
          600: '#A88735',
          700: '#7E6627',
          800: '#544420',
          900: '#332A14',
        },
        // Warm espresso (replacement for cold slate dark sections)
        espresso: {
          50: '#FBF6F1',
          100: '#F0E5DA',
          200: '#DCC8B5',
          300: '#B89B7E',
          400: '#8C6E55',
          500: '#5F4634',
          600: '#43301F',
          700: '#2F2014',
          800: '#21160C',
          900: '#160E07',
          950: '#0C0805',
        },
        // Legacy slate scale (kept for any unconverted references)
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Semantic ink (text on light backgrounds — warm espresso, not cold black)
        ink: {
          50: '#FBF6F1',
          100: '#EDDFD2',
          200: '#C9B5A2',
          300: '#9A816C',
          400: '#6E5640',
          500: '#4A3625',
          600: '#332417',
          700: '#23170E',
          800: '#160E08',
          900: '#0B0704',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'Tahoma', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'cream-radial': 'radial-gradient(circle at 30% 20%, #FFF6F1, #FBF3EC 50%, #F5EADD 100%)',
        'blush-soft': 'linear-gradient(135deg, #FFF6F4 0%, #FCE8E5 60%, #F8D2CD 100%)',
        'champagne-shine': 'linear-gradient(135deg, #F5EAD0 0%, #EBD9AB 50%, #DEC383 100%)',
        'espresso-luxury': 'linear-gradient(135deg, #160E07 0%, #2F2014 50%, #43301F 100%)',
      },
      boxShadow: {
        'soft': '0 10px 30px -12px rgba(89, 70, 52, 0.18)',
        'soft-lg': '0 24px 60px -20px rgba(89, 70, 52, 0.22)',
        'rose': '0 14px 40px -16px rgba(216, 155, 163, 0.45)',
        'champagne': '0 14px 40px -16px rgba(212, 165, 116, 0.45)',
        'inset-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 30px rgba(216, 155, 163, 0.25)' },
          '100%': { boxShadow: '0 0 50px rgba(216, 155, 163, 0.45)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
