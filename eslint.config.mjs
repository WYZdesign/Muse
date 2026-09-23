import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import pluginNext from "@next/eslint-plugin-next";

const nextRecommended = pluginNext.configs.recommended;
const nextCoreWebVitals = pluginNext.configs["core-web-vitals"];

export default [
  { ignores: [".next/**", "node_modules/**", "out/**", "build/**", "*.config.js", "*.config.mjs", "scripts/**", "tests/**", "capture-screenshots.js", "test-frontend-e2e.mjs", "test-visual.mjs", "scripts/*.mjs", "src/app/api/cron/**/route.test.ts", "src/app/api/muse/**/route.test.ts", "src/lib/demo-mode.test.ts", "src/app/api/muse/auth/auth.route.test.ts", "src/app/api/muse/call/call.route.test.ts", "_audit_artifacts/**", "_screenshots/**", "public/sw-muse.js", "*.cjs"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "@next/next": nextRecommended.plugins["@next/next"],
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        React: "readonly",
        RequestInit: "readonly",
        MutationCallback: "readonly",
        MutationRecord: "readonly",
        MutationObserverInit: "readonly",
        PointerEvent: "readonly",
        TouchEvent: "readonly",
        atob: "readonly",
        btoa: "readonly",
        history: "readonly",
        ServiceWorkerRegistration: "readonly",
        NotificationPermission: "readonly",
        Notification: "readonly",
        IntersectionObserver: "readonly",
        HTMLSpanElement: "readonly",
        HTMLLinkElement: "readonly",
        MouseEvent: "readonly",
        innerWidth: "readonly",
        innerHeight: "readonly",
        addEventListener: "readonly",
        removeEventListener: "readonly",
      },
    },
    plugins: {
      "@next/next": nextRecommended.plugins["@next/next"],
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
    },
    settings: {
      react: { version: "18.3" },
      next: { rootDir: import.meta.dirname },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...nextRecommended.rules,
      ...nextCoreWebVitals.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/anchor-is-valid": "off",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/aria-props": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
