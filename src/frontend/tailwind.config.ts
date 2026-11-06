import type { Config } from "tailwindcss";

// Colors come from CSS variables in globals.css (RGB channels), so opacity modifiers like bg-accent/10 work.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                canvas: token("canvas"),
                surface: token("surface"),
                raised: token("raised"),
                sunken: token("sunken"),
                line: { DEFAULT: token("line"), strong: token("line-strong") },
                ink: {
                    DEFAULT: token("ink"),
                    2: token("ink-2"),
                    3: token("ink-3"),
                },
                accent: {
                    DEFAULT: token("accent"),
                    hover: token("accent-hover"),
                    soft: token("accent-soft"),
                    ink: token("accent-ink"),
                },
                good: { DEFAULT: token("good"), soft: token("good-soft") },
                warn: { DEFAULT: token("warn"), soft: token("warn-soft") },
                bad: { DEFAULT: token("bad"), soft: token("bad-soft") },
            },
            fontFamily: {
                sans: ['"IBM Plex Sans"', "Segoe UI", "system-ui", "sans-serif"],
                mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
            },
            fontSize: {
                // 12 / 13 / 14 / 16 / 20 / 28 scale from the design direction.
                xs: ["12px", "16px"],
                sm: ["13px", "20px"],
                base: ["14px", "20px"],
                md: ["16px", "24px"],
                lg: ["20px", "28px"],
                xl: ["28px", "34px"],
                "2xl": ["28px", "34px"],
                "3xl": ["28px", "34px"],
                "4xl": ["28px", "34px"],
            },
            borderColor: {
                DEFAULT: "rgb(var(--line))",
            },
            boxShadow: {
                xs: "0 1px 2px rgb(0 0 0 / 0.05)",
                pop: "0 8px 24px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.06)",
            },
            transitionTimingFunction: {
                DEFAULT: "cubic-bezier(0.22, 1, 0.36, 1)",
            },
            transitionDuration: {
                DEFAULT: "150ms",
            },
        },
    },
    plugins: [],
};
export default config;
