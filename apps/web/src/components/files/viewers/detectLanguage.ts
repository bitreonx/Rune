/**
 * Map a file extension to a syntax-highlight language id. The list is
 * intentionally short — Plan 3 asks for a lightweight table, not a
 * full lexer. shiki / highlight.js / CodeMirror languages all use
 * these ids; missing entries fall back to plaintext.
 */
const EXTENSION_TO_LANGUAGE: ReadonlyArray<readonly [string, string]> = [
  [".ts", "typescript"],
  [".tsx", "tsx"],
  [".js", "javascript"],
  [".jsx", "jsx"],
  [".mjs", "javascript"],
  [".cjs", "javascript"],
  [".json", "json"],
  [".jsonc", "json"],
  [".css", "css"],
  [".scss", "scss"],
  [".less", "less"],
  [".html", "html"],
  [".xml", "xml"],
  [".yml", "yaml"],
  [".yaml", "yaml"],
  [".toml", "ini"],
  [".sh", "bash"],
  [".bash", "bash"],
  [".zsh", "bash"],
  [".py", "python"],
  [".rb", "ruby"],
  [".go", "go"],
  [".rs", "rust"],
  [".java", "java"],
  [".kt", "kotlin"],
  [".c", "c"],
  [".h", "c"],
  [".cpp", "cpp"],
  [".hpp", "cpp"],
  [".cs", "csharp"],
  [".php", "php"],
  [".lua", "lua"],
  [".sql", "sql"],
  [".env", "ini"],
  [".md", "markdown"],
  [".mdx", "markdown"],
];

const FILENAME_TO_LANGUAGE: ReadonlyArray<readonly [string, string]> = [
  ["Dockerfile", "dockerfile"],
  ["Makefile", "makefile"],
  ["Gemfile", "ruby"],
  ["Rakefile", "ruby"],
];

export function detectLanguage(relativePath: string): string {
  const basename = relativePath.split("/").pop() ?? relativePath;
  for (const [name, language] of FILENAME_TO_LANGUAGE) {
    if (basename === name) return language;
  }
  const lower = basename.toLowerCase();
  for (const [ext, language] of EXTENSION_TO_LANGUAGE) {
    if (lower.endsWith(ext)) return language;
  }
  return "plaintext";
}
