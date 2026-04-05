/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral:    '#FF8B7E',
        lime:     '#C8F56A',
        mint:     '#4FD9C4',
        lavender: '#B8B4FF',
        sunflower:'#FFE566',
        bubblegum:'#FFB3D1',
        ocean:    '#7DD3FC',
        sage:     '#A8E6CF',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      fontSize: {
        '4.5xl': ['2.625rem', { lineHeight: '1.1' }],
      }
    },
  },
  plugins: [],
}
