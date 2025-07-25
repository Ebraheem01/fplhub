/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // FPL Brand Colors
                fpl: {
                    purple: '#38003c',
                    green: '#00ff87',
                    pink: '#ff0080',
                    cyan: '#04f5ff',
                    dark: '#1a0a1e',
                    light: '#f8f9fa',
                },
                // Player Status Colors
                status: {
                    available: '#00ff87',
                    doubt: '#ffbf00',
                    injured: '#ff0080',
                    suspended: '#ff4757',
                },
                // Points Colors
                points: {
                    positive: '#00ff87',
                    negative: '#ff0080',
                    neutral: '#6c757d',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-subtle': 'bounce 2s infinite',
            }
        },
    },
    plugins: [],
}
