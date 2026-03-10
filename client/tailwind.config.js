/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 保持与现有HTML一致的颜色
      colors: {
        slate: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      // 自定义圆角
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      },
      // 自定义阴影
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 16px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 12px 28px rgba(0, 0, 0, 0.06)',
        'button': '0 2px 4px rgba(37, 99, 235, 0.2)',
        'glow': '0 0 20px rgba(37, 99, 235, 0.15)',
      },
      // 自定义动画
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      // 响应式断点优化
      screens: {
        'xs': '475px',
      },
      // 间距微调
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
