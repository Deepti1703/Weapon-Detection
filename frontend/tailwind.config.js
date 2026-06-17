/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Fixed professional White-Red palette
                background: "#FFFFFF",      // Pure white background
                card: "#FFFFFF",            // White cards
                secondary: "#F9FAFB",       // Soft off-white secondary panels
                text: "#111827",            // Dark text
                muted: "#4B5563",           // Gray muted text
                border: "#E5E7EB",          // Light borders

                // Forensic color scheme - NO BLUE, NO PURPLE
                primary: "#DC2626",              // Professional red (primary actions)
                "primary-hover": "#B91C1C",      // Darker red hover
                accent: "#DC2626",               // Bright red accent
                "accent-light": "#EF4444",       // Lighter red for highlights

                // Status colors (used sparingly)
                success: "#166534",              // Subtle green (only for verified/active)
                "success-bg": "#DCFCE7",         // Light green background
                "success-dark": "#14532D",       // Dark green
                warning: "#D97706",              // Amber for warnings
                "warning-bg": "#FEF3C7",         // Light amber
                error: "#DC2626",                // Red for errors
                "error-bg": "#FEE2E2",           // Light red

                // Remove blue/indigo/purple from palette
                // Only red, gray, black, white allowed
            },
            keyframes: {
                scan: {
                    '0%, 100%': { transform: 'translateY(-100%)' },
                    '50%': { transform: 'translateY(400%)' },
                }
            },
            animation: {
                scan: 'scan 2s ease-in-out infinite',
            }
        },
    },
    plugins: [],
}
