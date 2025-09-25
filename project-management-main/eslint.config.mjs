
import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["/*.{js,mjs,cjs,jsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        process: "readonly", // ✅ Add process here
        
  "env": {
    "node": true,
    "es2021": true
  }

  },
    },
  },
  pluginReact.configs.flat.recommended,
]);
