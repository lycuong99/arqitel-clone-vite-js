/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/**/*.{html,css,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        tertiary: 'var(--tertiary)',
        color: 'var(--color)',
        bg:"#0a0c46",
        'accent-primary': 'var(--accent-primary)',
        'accent-primary-state': 'var(--accent-primary-state)'
      }
    }
  }
};
