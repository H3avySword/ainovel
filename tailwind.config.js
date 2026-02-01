/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"STZhongsong"', '"华文中宋"', '"Noto Serif SC"', '"Noto Serif Simplified Chinese"', '"Source Han Serif SC"', 'serif'],
            },
        },
    },
    plugins: [],
}
