/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        muted: "var(--bg-muted)",
        "border-d": "var(--border-default)",
        "border-s": "var(--border-strong)",
        ink: "var(--text-primary)",
        "ink-2": "var(--text-secondary)",
        "ink-3": "var(--text-tertiary)",
        "on-primary": "var(--text-on-primary)",
        brand: "var(--brand-primary)",
        "brand-hover": "var(--brand-primary-hover)",
        "brand-press": "var(--brand-primary-press)",
        success: "var(--state-success)",
        warning: "var(--state-warning)",
        danger: "var(--state-danger)",
        info: "var(--state-info)",
        "success-bg": "var(--state-success-bg)",
        "warning-bg": "var(--state-warning-bg)",
        "danger-bg": "var(--state-danger-bg)",
        "info-bg": "var(--state-info-bg)",
        maya: "var(--maya-purple)",
        reza: "var(--reza-red)",
        dimas: "var(--dimas-orange)",
        sari: "var(--sari-green)",
        bayu: "var(--bayu-blue)",
        "ld-black": "#0A0A0A",
        "ld-graphite": "#1F1F1F",
        paper: "var(--bg-app)",
        card: "var(--bg-surface)",
        "ld-red": "var(--brand-primary)",
        "ld-red-deep": "var(--brand-primary-hover)",
        "ld-ink": "var(--text-primary)",
        "ld-slate": "var(--text-secondary)",
        "ld-warm": "var(--text-tertiary)",
        "ld-green": "var(--state-success)",
        "ld-amber": "var(--state-warning)"
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        modal: "var(--shadow-modal)"
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px"
      },
      zIndex: {
        base: "0",
        elevated: "10",
        sticky: "30",
        overlay: "40",
        "modal-bg": "80",
        modal: "90",
        toast: "100",
        cmdk: "110"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "fade-up": "fade-up 300ms cubic-bezier(.16,1,.3,1)",
        "pulse-slow": "pulse-slow 2s cubic-bezier(0.4,0,0.6,1) infinite"
      }
    }
  },
  plugins: []
};
