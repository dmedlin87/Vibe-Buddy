
import { PromptTemplate } from './types';

export const IGNORE_LIST = [
  // Directories & Metadata
  'node_modules',
  'bower_components',
  'jspm_packages',
  '.git',
  '.svn',
  '.hg',
  '.DS_Store',
  'Thumbs.db',
  '.idea',
  '.vscode',
  '.history',
  
  // Build & Output
  'dist',
  'build',
  'out',
  'target', // Java/Rust
  'bin',
  'obj',
  '.next',
  '.nuxt',
  '.output',
  '.serverless',
  '.terraform',

  // Dependencies & Environments
  'venv',
  '.venv',
  'env',
  '.env',
  'virtualenv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.cache',
  'coverage',
  '.gradle',

  // Logs
  'npm-debug.log',
  'yarn-error.log',
  'yarn-debug.log',
  'pnpm-debug.log',

  // Lock Files (often too verbose for context)
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'composer.lock',
  'Gemfile.lock',
  'poetry.lock',

  // Binary / Media Extensions
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z', '.jar', '.war', '.ear',
  '.exe', '.dll', '.so', '.dylib', '.class', '.node',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.apk', '.aab', '.ipa', '.iso', '.img', '.dmg'
];

/**
 * Checks if a file name or path segment should be ignored based on system rules.
 */
export const isSystemIgnored = (fileName: string): boolean => {
  const trimmed = fileName.trim();
  if (trimmed.startsWith('.') && trimmed !== '.') return true;
  if (IGNORE_LIST.includes(trimmed)) return true;
  const extIndex = trimmed.lastIndexOf('.');
  if (extIndex > 0) { 
    const suffix = trimmed.substring(extIndex);
    if (IGNORE_LIST.includes(suffix)) return true;
  }
  return false;
};

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  // --- BEGINNER / LEARNING ---
  {
    id: 'explain-eli5',
    name: 'Explain Like I\'m 5',
    tags: ['learning', 'beginner'],
    template: `Explain the code in the selected files as if I were a 5-year-old. 
Use simple analogies, avoid jargon, and explain the "why" behind the code, not just the "how".`
  },
  {
    id: 'code-tutor',
    name: 'Socratic Tutor',
    tags: ['learning', 'study'],
    template: `Act as a Socratic tutor. Analyze the selected files. 
Don't just fix the code or explain it. Ask me 3 guiding questions that will help me understand how this code works or how to improve it.`
  },
  {
    id: 'add-comments',
    name: 'Add Documentation Comments',
    tags: ['docs', 'maintenance'],
    template: `The selected code is lacking comments. 
Please add clear, concise comments to the code. 
- Explain complex logic.
- Add JSDoc/DocStrings to functions explaining parameters and return types.
- Do not comment obvious things like "declaring a variable".`
  },

  // --- REACT / WEB FRONTEND ---
  {
    id: 'react-component',
    name: 'React Component Generator',
    tags: ['react', 'frontend', 'typescript'],
    template: `Create a new React Functional Component based on the logic or requirements found in the selected files.
Requirements:
- Use TypeScript interfaces for Props.
- Use 'lucide-react' for icons if needed.
- Use Tailwind CSS for styling.
- Ensure accessibility (aria-labels).`
  },
  {
    id: 'tailwind-convert',
    name: 'Convert CSS to Tailwind',
    tags: ['css', 'tailwind', 'refactor'],
    template: `Analyze the CSS/SCSS in the context files and refactor the corresponding HTML/JSX to use Tailwind CSS utility classes instead.
Remove the custom CSS file dependency.`
  },
  {
    id: 'react-hooks',
    name: 'Extract Custom Hook',
    tags: ['react', 'refactor'],
    template: `Analyze the component in the selected file. 
Identify logic that can be extracted into a custom React Hook (e.g., useForm, useFetch).
Refactor the code to create the hook and implement it in the component.`
  },

  // --- BACKEND / API ---
  {
    id: 'api-endpoint',
    name: 'Generate API Endpoint',
    tags: ['backend', 'api'],
    template: `Based on the data models in the selected files, generate a RESTful API endpoint (GET, POST, PUT, DELETE).
- Validate inputs.
- Handle errors gracefully (try/catch).
- Return standard HTTP status codes.`
  },
  {
    id: 'sql-query',
    name: 'SQL Query Builder',
    tags: ['database', 'sql'],
    template: `Based on the schema definitions in the selected files, write a complex SQL query to:
[Insert Goal, e.g., "Find top 5 users by sales"]
Ensure the query is optimized and uses appropriate JOINs.`
  },
  {
    id: 'pydantic-model',
    name: 'Generate Data Model',
    tags: ['python', 'typescript', 'data'],
    template: `Look at the JSON sample or database schema in the selected files.
Generate a strict data model (Pydantic for Python OR Zod/Interface for TypeScript) that represents this data structure.`
  },

  // --- QUALITY & MAINTENANCE ---
  {
    id: 'code-review',
    name: 'Code Review & Security',
    tags: ['audit', 'security'],
    template: `Analyze the provided context files for security vulnerabilities, performance bottlenecks, and code style issues.

Focus on:
1. SQL Injection or XSS risks.
2. Inefficient loops or memory leaks.
3. DRY principles violation.

Please provide a prioritized list of recommendations.`
  },
  {
    id: 'unit-tests',
    name: 'Generate Unit Tests',
    tags: ['testing', 'vitest', 'jest'],
    template: `Write comprehensive unit tests for the provided context files. 
    
Requirements:
- Ensure high coverage (edge cases, failure modes).
- Mock external dependencies where appropriate.
- Use the testing framework evident in the project (Jest, Vitest, Pytest, etc).`
  },
  {
    id: 'git-commit',
    name: 'Git Commit Message',
    tags: ['git', 'workflow'],
    template: `Analyze the changes in the selected files (assuming these are the staged changes).
Write a semantic git commit message (Conventional Commits style).
Format:
<type>(<scope>): <subject>

<body>`
  },
  {
    id: 'readme-gen',
    name: 'Generate README.md',
    tags: ['docs', 'markdown'],
    template: `Based on the code structure and package.json/requirements.txt in the selected files, generate a high-quality README.md.
Include:
- Project Title & Description
- Tech Stack
- Installation Instructions
- Usage Examples`
  },
  {
    id: 'naming-fixer',
    name: 'Variable Naming Fixer',
    tags: ['clean-code', 'refactor'],
    template: `Review the selected files for poor variable/function naming (e.g., 'x', 'data', 'handleStuff').
Suggest specific, descriptive replacements that follow the language's naming conventions (camelCase, snake_case).`
  },

  // --- ADVANCED / LOGIC ---
  {
    id: 'bug-diagnosis',
    name: 'Deep Bug Diagnosis',
    tags: ['debug', 'fix'],
    template: `I am encountering a bug in this code. 
1. Trace the execution flow based on the selected files.
2. Identify race conditions, logic errors, or state mutations that could cause unexpected behavior.
3. Propose 2-3 potential fixes.`
  },
  {
    id: 'refactor-modern',
    name: 'Modern Refactor',
    tags: ['refactoring', 'clean-code'],
    template: `Refactor the code in the context files to be more readable, modular, and performant. 
Apply "Clean Code" principles and modern syntax (e.g., latest ES features, React hooks, Python 3.10+ match/case).`
  }
];
