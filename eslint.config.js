import js from "@eslint/js";

export default [
  // Global ignores
  {
    ignores: ["coverage/**", "node_modules/**", "tests/**"]
  },

  // Main configuration for module files - restrict console.log
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        CustomEvent: "readonly",

        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",

        // FoundryVTT globals
        game: "readonly",
        ui: "readonly",
        canvas: "readonly",
        foundry: "readonly",
        CONFIG: "readonly",
        CONST: "readonly",
        Hooks: "readonly",
        Handlebars: "readonly",
        Actor: "readonly",
        Item: "readonly",
        Token: "readonly",
        User: "readonly",
        Macro: "readonly",
        Roll: "readonly",
        ChatMessage: "readonly",
        Combat: "readonly",
        Combatant: "readonly",
        ActiveEffect: "readonly",
        FilePicker: "readonly",
        Dialog: "readonly",
        Application: "readonly",
        FormApplication: "readonly",
        DocumentSheet: "readonly",
        ActorSheet: "readonly",
        ItemSheet: "readonly",
        Folder: "readonly",
        SortingHelpers: "readonly",
        FormDataExtended: "readonly",
        getDocumentClass: "readonly",
        fromUuid: "readonly",
        fetch: "readonly",
        Event: "readonly",
        erps: "readonly",
        globalThis: "writable",
      },
    },
    files: ["module/**/*.mjs"],
    ignores: ["node_modules/**", "lib/**", "module/services/logger.mjs", "coverage/**"],
    rules: {
      ...js.configs.recommended.rules,

      // Console and debugging - restrict console.log in application code
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],

      // Variable handling
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-var": "error",
      "prefer-const": "error",

      // Function style
      "prefer-arrow-callback": "error",

      // Object and template literals
      "object-shorthand": "error",
      "prefer-template": "error",

      // Code quality - remove formatting conflicts
      "no-multiple-empty-lines": ["error", { max: 2 }],

      // Security and best practices
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-throw-literal": "error",
      "no-unmodified-loop-condition": "error",
      "no-unused-expressions": "error",
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "prefer-promise-reject-errors": "error",
      radix: "error",
      "wrap-iife": ["error", "inside"],
      yoda: "error",
    },
  },

  // Separate configuration for build scripts - allow console.log
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module", // Build scripts use ES modules
      globals: {
        // Node.js globals for build scripts
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        global: "readonly",
      },
    },
    files: ["build-lang.js", "minify.js"],
    rules: {
      ...js.configs.recommended.rules,

      // Allow all console usage in build scripts
      "no-console": "off",

      // Variable handling
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-var": "error",
      "prefer-const": "error",
    },
  },

];
