export type PreviewMethod =
  | 'web'           // iframe render
  | 'run-output'    // execute, show stdout
  | 'compile-run'   // compile then run
  | 'server'        // start dev server
  | 'image'         // render image
  | 'canvas'        // game/canvas preview
  | 'notebook'      // jupyter-style
  | 'mobile'        // mobile preview/apk
  | 'none';

export type DeployTarget =
  | 'static'        // GitHub Pages, Surge, Cloudflare Pages
  | 'serverless'    // Vercel, Netlify, Cloudflare
  | 'container'     // Render, Fly.io, Docker
  | 'apk'           // Android mobile build
  | 'none';

export interface LanguageConfig {
  id: string;
  name: string;
  category: 'web' | 'systems' | 'scripting' | 'mobile' | 'data' | 'markup' | 'ops';
  extensions: string[];
  monacoId: string;
  preview: PreviewMethod;
  runCommand?: string;      // e.g., "python3 {file}"
  compileCommand?: string;  // e.g., "gcc {file} -o {output}"
  buildCommand?: string;    // e.g., "npm run build"
  templateFiles: Record<string, string>; // starter project template
  deployTarget: DeployTarget;
  lspServer?: string;
  icon: string;
  description: string;
}

export const LANGUAGE_REGISTRY: Record<string, LanguageConfig> = {
  // ===== 1. WEB LANGUAGES =====
  html: {
    id: 'html',
    name: 'HTML5',
    category: 'web',
    extensions: ['.html', '.htm'],
    monacoId: 'html',
    preview: 'web',
    templateFiles: {
      'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>ALTREX Web App</title>\n  <style>body { font-family: system-ui; background: #0b1120; color: #f8fafc; padding: 2rem; }</style>\n</head>\n<body>\n  <h1>🚀 Hello from ALTREX CODE!</h1>\n  <p>Universal Web Engine active.</p>\n</body>\n</html>',
    },
    deployTarget: 'static',
    icon: '🌐',
    description: 'Modern standard HTML5 markup with live browser rendering.',
  },
  css: {
    id: 'css',
    name: 'CSS3',
    category: 'web',
    extensions: ['.css'],
    monacoId: 'css',
    preview: 'web',
    templateFiles: { 'style.css': ':root { --primary: #06b6d4; }\nbody { background: #030712; color: #e2e8f0; font-family: sans-serif; }' },
    deployTarget: 'static',
    icon: '🎨',
    description: 'Cascading Style Sheets for layout, animations, and typography.',
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    category: 'web',
    extensions: ['.js', '.mjs', '.cjs'],
    monacoId: 'javascript',
    preview: 'run-output',
    runCommand: 'node {file}',
    templateFiles: { 'index.js': 'console.log("⚡ ALTREX Universal Node.js Engine");\nconst greeting = "Hello World";\nconsole.log(greeting);' },
    deployTarget: 'serverless',
    lspServer: 'typescript-language-server',
    icon: '🟨',
    description: 'Modern ECMAScript / Node.js execution engine.',
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    category: 'web',
    extensions: ['.ts'],
    monacoId: 'typescript',
    preview: 'run-output',
    runCommand: 'npx tsx {file}',
    templateFiles: {
      'index.ts': 'interface Config { name: string; version: number; }\nconst app: Config = { name: "ALTREX", version: 6.0 };\nconsole.log(`Initialized ${app.name} v${app.version}`);',
    },
    deployTarget: 'serverless',
    lspServer: 'typescript-language-server',
    icon: '🟦',
    description: 'Strictly typed JavaScript with immediate tsx execution.',
  },
  react: {
    id: 'react',
    name: 'React (TSX/JSX)',
    category: 'web',
    extensions: ['.jsx', '.tsx'],
    monacoId: 'typescript',
    preview: 'server',
    buildCommand: 'npm run build',
    runCommand: 'npm run dev',
    templateFiles: {
      'package.json': '{\n  "name": "altrex-react",\n  "scripts": { "dev": "vite", "build": "vite build" },\n  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0" }\n}',
      'src/App.tsx': 'import React from "react";\nexport default function App() {\n  return <h1>ALTREX React Engine</h1>;\n}',
    },
    deployTarget: 'serverless',
    icon: '⚛️',
    description: 'Component-driven web applications with Vite and React 18/19.',
  },
  vue: {
    id: 'vue',
    name: 'Vue.js',
    category: 'web',
    extensions: ['.vue'],
    monacoId: 'html',
    preview: 'server',
    buildCommand: 'npm run build',
    runCommand: 'npm run dev',
    templateFiles: { 'src/App.vue': '<template>\n  <h1>{{ message }}</h1>\n</template>\n<script setup>\nconst message = "Hello ALTREX Vue";\n</script>' },
    deployTarget: 'serverless',
    icon: '💚',
    description: 'Progressive single-file component framework.',
  },
  svelte: {
    id: 'svelte',
    name: 'Svelte',
    category: 'web',
    extensions: ['.svelte'],
    monacoId: 'html',
    preview: 'server',
    buildCommand: 'npm run build',
    templateFiles: { 'src/App.svelte': '<script>\n  let name = "ALTREX";\n</script>\n<h1>Hello {name}!</h1>' },
    deployTarget: 'serverless',
    icon: '🧡',
    description: 'Cybernetically enhanced compile-to-vanilla web components.',
  },
  astro: {
    id: 'astro',
    name: 'Astro',
    category: 'web',
    extensions: ['.astro'],
    monacoId: 'html',
    preview: 'server',
    buildCommand: 'npm run build',
    templateFiles: {},
    deployTarget: 'static',
    icon: '🚀',
    description: 'Content-driven websites with zero JS by default.',
  },

  // ===== 2. SYSTEMS & BACKEND =====
  python: {
    id: 'python',
    name: 'Python 3',
    category: 'systems',
    extensions: ['.py', '.pyw'],
    monacoId: 'python',
    preview: 'run-output',
    runCommand: 'python3 {file}',
    templateFiles: {
      'main.py': '#!/usr/bin/env python3\n\ndef solve():\n    data = [x * 2 for x in range(10)]\n    print(f"ALTREX Python 3 Engine: {data}")\n\nif __name__ == "__main__":\n    solve()\n',
    },
    deployTarget: 'serverless',
    lspServer: 'pylsp',
    icon: '🐍',
    description: 'High-level scientific and backend language with rich standard library.',
  },
  java: {
    id: 'java',
    name: 'Java',
    category: 'systems',
    extensions: ['.java'],
    monacoId: 'java',
    preview: 'compile-run',
    compileCommand: 'javac {file}',
    runCommand: 'java {classname}',
    templateFiles: {
      'Main.java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("☕ Hello from ALTREX Java Engine!");\n    }\n}\n',
    },
    deployTarget: 'container',
    icon: '☕',
    description: 'Object-oriented enterprise powerhouse running on the JVM.',
  },
  c: {
    id: 'c',
    name: 'C (GCC/Clang)',
    category: 'systems',
    extensions: ['.c', '.h'],
    monacoId: 'c',
    preview: 'compile-run',
    compileCommand: 'gcc {file} -o {output}',
    runCommand: './{output}',
    templateFiles: {
      'main.c': '#include <stdio.h>\n\nint main() {\n    printf("🔵 ALTREX C Engine: Systems Execution Online\\n");\n    return 0;\n}\n',
    },
    deployTarget: 'container',
    icon: '🔵',
    description: 'Low-level procedural programming with bare-metal speed.',
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    category: 'systems',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp'],
    monacoId: 'cpp',
    preview: 'compile-run',
    compileCommand: 'g++ -std=c++17 {file} -o {output}',
    runCommand: './{output}',
    templateFiles: {
      'main.cpp': '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<std::string> v = {"ALTREX", "C++17", "Fast"};\n    for (const auto& s : v) std::cout << s << " ";\n    std::cout << std::endl;\n    return 0;\n}\n',
    },
    deployTarget: 'container',
    icon: '🔷',
    description: 'High-performance computing with modern templates and RAII.',
  },
  csharp: {
    id: 'csharp',
    name: 'C# (.NET)',
    category: 'systems',
    extensions: ['.cs'],
    monacoId: 'csharp',
    preview: 'run-output',
    runCommand: 'dotnet run',
    templateFiles: {
      'Program.cs': 'using System;\nConsole.WriteLine("🟪 ALTREX .NET Core Engine");\n',
    },
    deployTarget: 'container',
    icon: '🟪',
    description: 'Cross-platform modern .NET ecosystem for robust backend services.',
  },
  go: {
    id: 'go',
    name: 'Go (Golang)',
    category: 'systems',
    extensions: ['.go'],
    monacoId: 'go',
    preview: 'run-output',
    runCommand: 'go run {file}',
    templateFiles: {
      'main.go': 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("🐹 ALTREX Go Engine: Goroutines and Microservices Ready")\n}\n',
    },
    deployTarget: 'container',
    lspServer: 'gopls',
    icon: '🐹',
    description: 'Concurrent, lightweight systems language with instant compilation.',
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    category: 'systems',
    extensions: ['.rs'],
    monacoId: 'rust',
    preview: 'compile-run',
    compileCommand: 'rustc {file} -o {output}',
    runCommand: './{output}',
    templateFiles: {
      'main.rs': 'fn main() {\n    println!("🦀 ALTREX Rust Engine: Memory Safe & Zero Cost Abstractions");\n}\n',
    },
    deployTarget: 'container',
    lspServer: 'rust-analyzer',
    icon: '🦀',
    description: 'Memory safety without garbage collection, maximum concurrency.',
  },
  zig: {
    id: 'zig',
    name: 'Zig',
    category: 'systems',
    extensions: ['.zig'],
    monacoId: 'rust',
    preview: 'run-output',
    runCommand: 'zig run {file}',
    templateFiles: { 'main.zig': 'const std = @import("std");\npub fn main() void {\n    std.debug.print("⚡ ALTREX Zig: Robust & Simple\\n", .{});\n}' },
    deployTarget: 'container',
    icon: '⚡',
    description: 'General-purpose systems programming with optimal comptime execution.',
  },

  // ===== 3. SCRIPTING & SPECIALIZED =====
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    category: 'scripting',
    extensions: ['.rb'],
    monacoId: 'ruby',
    preview: 'run-output',
    runCommand: 'ruby {file}',
    templateFiles: { 'main.rb': 'puts "💎 ALTREX Ruby Engine: Elegant & Productive"' },
    deployTarget: 'container',
    icon: '💎',
    description: 'Dynamic, open source language with a focus on simplicity.',
  },
  php: {
    id: 'php',
    name: 'PHP 8+',
    category: 'scripting',
    extensions: ['.php'],
    monacoId: 'php',
    preview: 'run-output',
    runCommand: 'php {file}',
    templateFiles: { 'index.php': '<?php\necho "🐘 ALTREX PHP 8 Engine: " . phpversion() . "\\n";\n' },
    deployTarget: 'serverless',
    icon: '🐘',
    description: 'Server-side scripting language powering major parts of the web.',
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    category: 'scripting',
    extensions: ['.swift'],
    monacoId: 'swift',
    preview: 'run-output',
    runCommand: 'swift {file}',
    templateFiles: { 'main.swift': 'print("🍊 ALTREX Swift Engine")' },
    deployTarget: 'none',
    icon: '🍊',
    description: 'Fast, modern language designed for Apple platforms and backend services.',
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    category: 'mobile',
    extensions: ['.kt', '.kts'],
    monacoId: 'kotlin',
    preview: 'compile-run',
    compileCommand: 'kotlinc {file} -include-runtime -d out.jar',
    runCommand: 'java -jar out.jar',
    templateFiles: { 'Main.kt': 'fun main() {\n    println("🟣 ALTREX Kotlin: Modern Android & JVM Ready")\n}' },
    deployTarget: 'apk',
    icon: '🟣',
    description: 'Concise, safe language for modern Android and server-side apps.',
  },
  dart: {
    id: 'dart',
    name: 'Dart (Flutter)',
    category: 'mobile',
    extensions: ['.dart'],
    monacoId: 'dart',
    preview: 'mobile',
    runCommand: 'dart run {file}',
    buildCommand: 'flutter build apk',
    templateFiles: { 'main.dart': 'void main() {\n  print("🎯 ALTREX Dart Engine: Multi-platform UI");\n}' },
    deployTarget: 'apk',
    icon: '🎯',
    description: 'Client-optimized language for fast apps on any platform.',
  },
  scala: {
    id: 'scala',
    name: 'Scala',
    category: 'scripting',
    extensions: ['.scala'],
    monacoId: 'scala',
    preview: 'run-output',
    runCommand: 'scala {file}',
    templateFiles: { 'Main.scala': '@main def run(): Unit = println("🔴 ALTREX Scala 3")' },
    deployTarget: 'container',
    icon: '🔴',
    description: 'Blends object-oriented and functional programming in a typed language.',
  },
  perl: {
    id: 'perl',
    name: 'Perl',
    category: 'scripting',
    extensions: ['.pl', '.pm'],
    monacoId: 'perl',
    preview: 'run-output',
    runCommand: 'perl {file}',
    templateFiles: { 'script.pl': '#!/usr/bin/env perl\nprint "🐪 ALTREX Perl Engine\\n";\n' },
    deployTarget: 'none',
    icon: '🐪',
    description: 'Highly capable, feature-rich language for text processing and automation.',
  },
  lua: {
    id: 'lua',
    name: 'Lua',
    category: 'scripting',
    extensions: ['.lua'],
    monacoId: 'lua',
    preview: 'run-output',
    runCommand: 'lua {file}',
    templateFiles: { 'main.lua': 'print("🌙 ALTREX Lua Engine: Ultra-lightweight")' },
    deployTarget: 'none',
    icon: '🌙',
    description: 'Lightweight, embeddable scripting language widely used in gaming.',
  },
  r: {
    id: 'r',
    name: 'R (Data & Stats)',
    category: 'data',
    extensions: ['.r', '.R'],
    monacoId: 'r',
    preview: 'run-output',
    runCommand: 'Rscript {file}',
    templateFiles: { 'analysis.R': 'x <- c(1, 2, 3, 4, 5)\nprint(summary(x))\n' },
    deployTarget: 'none',
    icon: '📊',
    description: 'Statistical computing and graphics language for data science.',
  },
  julia: {
    id: 'julia',
    name: 'Julia',
    category: 'data',
    extensions: ['.jl'],
    monacoId: 'julia',
    preview: 'run-output',
    runCommand: 'julia {file}',
    templateFiles: { 'main.jl': 'println("🟠 ALTREX Julia Engine: High Performance Numerics")' },
    deployTarget: 'none',
    icon: '🟠',
    description: 'High-level, high-performance programming language for technical computing.',
  },
  elixir: {
    id: 'elixir',
    name: 'Elixir',
    category: 'systems',
    extensions: ['.ex', '.exs'],
    monacoId: 'elixir',
    preview: 'run-output',
    runCommand: 'elixir {file}',
    templateFiles: { 'main.exs': 'IO.puts "💧 ALTREX Elixir: Scalable & Fault-tolerant"' },
    deployTarget: 'container',
    icon: '💧',
    description: 'Dynamic, functional language designed for building scalable applications.',
  },
  haskell: {
    id: 'haskell',
    name: 'Haskell',
    category: 'systems',
    extensions: ['.hs'],
    monacoId: 'haskell',
    preview: 'run-output',
    runCommand: 'runghc {file}',
    templateFiles: { 'Main.hs': 'main = putStrLn "λ ALTREX Pure Functional Haskell"' },
    deployTarget: 'none',
    icon: 'λ',
    description: 'Purely functional programming with strong static mathematical types.',
  },

  // ===== 4. SHELL & DEVOPS =====
  shell: {
    id: 'shell',
    name: 'Bash / Shell',
    category: 'ops',
    extensions: ['.sh', '.bash', '.zsh'],
    monacoId: 'shell',
    preview: 'run-output',
    runCommand: 'bash {file}',
    templateFiles: { 'script.sh': '#!/bin/bash\necho "🐚 ALTREX Shell Engine Active"\necho "Workspace: $(pwd)"\n' },
    deployTarget: 'none',
    icon: '🐚',
    description: 'Unix shell command language for scripts and system automation.',
  },
  dockerfile: {
    id: 'dockerfile',
    name: 'Dockerfile',
    category: 'ops',
    extensions: ['Dockerfile', '.dockerfile'],
    monacoId: 'dockerfile',
    preview: 'none',
    templateFiles: { 'Dockerfile': 'FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node", "index.js"]\n' },
    deployTarget: 'container',
    icon: '🐳',
    description: 'Container specifications for reproducible deployments.',
  },

  // ===== 5. DATA, SQL & CONFIG =====
  sql: {
    id: 'sql',
    name: 'SQL (Structured Query)',
    category: 'data',
    extensions: ['.sql'],
    monacoId: 'sql',
    preview: 'run-output',
    templateFiles: {
      'schema.sql': 'CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  username VARCHAR(50) NOT NULL UNIQUE,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n',
    },
    deployTarget: 'none',
    icon: '🗄️',
    description: 'Standard language for storing, manipulating, and querying databases.',
  },
  json: {
    id: 'json',
    name: 'JSON Data',
    category: 'data',
    extensions: ['.json'],
    monacoId: 'json',
    preview: 'web',
    templateFiles: { 'data.json': '{\n  "service": "altrex",\n  "status": "active",\n  "languagesCount": 50\n}' },
    deployTarget: 'none',
    icon: '📋',
    description: 'Universal standard lightweight data interchange format.',
  },
  yaml: {
    id: 'yaml',
    name: 'YAML Configuration',
    category: 'ops',
    extensions: ['.yaml', '.yml'],
    monacoId: 'yaml',
    preview: 'none',
    templateFiles: { 'config.yml': 'app:\n  name: ALTREX CODE\n  port: 3000\n  mode: universal\n' },
    deployTarget: 'none',
    icon: '⚙️',
    description: 'Human-friendly data serialization standard for all programming languages.',
  },
  markdown: {
    id: 'markdown',
    name: 'Markdown',
    category: 'markup',
    extensions: ['.md', '.markdown'],
    monacoId: 'markdown',
    preview: 'web',
    templateFiles: {
      'README.md': '# 🚀 ALTREX CODE Universal Engine\n\n- **50+ Languages Supported**\n- **Universal Live Preview**\n- **24/7 Free Deploy**\n- **Android APK Builder**\n',
    },
    deployTarget: 'static',
    icon: '📝',
    description: 'Lightweight markup language with plain text formatting syntax.',
  },
};

export class LanguageDetector {
  static detect(filePath: string): LanguageConfig | null {
    const baseName = filePath.split('/').pop() || filePath;
    if (baseName === 'Dockerfile' || baseName.toLowerCase() === 'dockerfile') {
      return LANGUAGE_REGISTRY.dockerfile;
    }

    const ext = filePath.includes('.')
      ? filePath.substring(filePath.lastIndexOf('.')).toLowerCase()
      : '';

    for (const lang of Object.values(LANGUAGE_REGISTRY)) {
      if (lang.extensions.includes(ext)) {
        return lang;
      }
    }
    return null;
  }

  static detectProject(files: string[]): LanguageConfig | null {
    const counts: Record<string, number> = {};
    for (const file of files) {
      const lang = this.detect(file);
      if (lang) {
        counts[lang.id] = (counts[lang.id] || 0) + 1;
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return LANGUAGE_REGISTRY.javascript;
    return LANGUAGE_REGISTRY[sorted[0][0]] || null;
  }

  static getAll(): LanguageConfig[] {
    return Object.values(LANGUAGE_REGISTRY);
  }

  static getByCategory(category: LanguageConfig['category']): LanguageConfig[] {
    return Object.values(LANGUAGE_REGISTRY).filter((l) => l.category === category);
  }
}
