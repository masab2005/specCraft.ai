/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#004ac6',
        'primary-container': '#2563eb',
        secondary: '#545f73',
        background: '#faf8ff',
        surface: '#faf8ff',
        'surface-bright': '#faf8ff',
        'surface-container': '#ededf9',
        'surface-container-low': '#f3f3fe',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#e7e7f3',
        'surface-container-highest': '#e1e2ed',
        'on-surface': '#191b23',
        'on-surface-variant': '#434655',
        outline: '#737686',
        'outline-variant': '#c3c6d7',
        'on-primary': '#ffffff',
        'on-primary-container': '#eeefff',
      },
      borderRadius: {
        'DEFAULT': '0.125rem',
        'lg': '0.25rem',
        'xl': '0.5rem',
        'full': '0.75rem',
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
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
