/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#171717',
        'primary-container': '#333333',
        secondary: '#666666',
        background: '#ffffff',
        surface: '#ffffff',
        'surface-bright': '#ffffff',
        'surface-container': '#fafafa',
        'surface-container-low': '#fafafa',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#eaeaea',
        'surface-container-highest': '#e5e5e5',
        'on-surface': '#171717',
        'on-surface-variant': '#666666',
        outline: '#888888',
        'outline-variant': '#eaeaea',
        'on-primary': '#ffffff',
        'on-primary-container': '#ffffff',
        'vercel-blue': '#0a72ef',
        'vercel-red': '#ff5b4f',
        'vercel-pink': '#de1d8d',
      },
      borderRadius: {
        'DEFAULT': '6px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      spacing: {
        'margin-mobile': '16px',
        'container-max': '1440px',
        'stack-md': '16px',
        'gutter': '24px',
        'stack-sm': '8px',
        'stack-lg': '24px',
        'margin-desktop': '32px',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
