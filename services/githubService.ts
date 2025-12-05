
import { FileNode } from '../types';
import { isSystemIgnored } from '../constants';

const GITHUB_API_BASE = 'https://api.github.com/repos';
const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com';

interface GithubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

const parseGithubUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    // supports https://github.com/owner/repo
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  } catch {
    return null;
  }
};

export const loadGithubRepo = async (url: string, token?: string): Promise<FileNode> => {
  const repoInfo = parseGithubUrl(url);
  if (!repoInfo) {
    throw new Error('Invalid GitHub URL. Format: https://github.com/owner/repo');
  }

  const { owner, repo } = repoInfo;
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // 1. Get Repo Details to find default branch
  const repoDetailsRes = await fetch(`${GITHUB_API_BASE}/${owner}/${repo}`, { 
    headers,
    cache: 'no-store' // Ensure fresh data
  });
  
  if (!repoDetailsRes.ok) {
    if (repoDetailsRes.status === 404) throw new Error('Repository not found. If it is private, please provide a valid Access Token.');
    if (repoDetailsRes.status === 403) throw new Error('GitHub API rate limit exceeded. Try again later.');
    if (repoDetailsRes.status === 401) throw new Error('Invalid Access Token.');
    throw new Error('Failed to fetch repository details.');
  }
  
  const repoData = await repoDetailsRes.json();
  const defaultBranch = repoData.default_branch || 'main';

  // 2. Get Recursive Tree
  const treeUrl = `${GITHUB_API_BASE}/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
  const treeRes = await fetch(treeUrl, { 
    headers,
    cache: 'no-store' // Ensure fresh data
  });
  
  if (!treeRes.ok) {
    if (treeRes.status === 403) throw new Error('GitHub API rate limit exceeded.');
    if (treeRes.status === 404) throw new Error('Failed to fetch file tree. Repository might be empty.');
    throw new Error('Failed to fetch file tree.');
  }

  const treeData = await treeRes.json();
  
  if (treeData.truncated) {
    console.warn('Repository is too large, some files may be missing.');
  }

  // 3. Build FileNode Tree
  const root: FileNode = {
    id: `${owner}-${repo}`,
    name: repo,
    kind: 'directory',
    path: repo,
    children: [],
  };

  const map = new Map<string, FileNode>();
  map.set(repo, root);

  const entries: GithubTreeEntry[] = treeData.tree;

  for (const entry of entries) {
    const parts = entry.path.split('/');
    
    // Apply Ignore List using strict checks
    if (parts.some(part => isSystemIgnored(part))) {
      continue;
    }

    let currentPath = repo;
    let currentNode = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = `${currentPath}/${part}`;
      
      let child = map.get(fullPath);

      if (!child) {
        // For the last part, we use the entry type. For intermediate parts, they are directories.
        const kind = isLast ? (entry.type === 'blob' ? 'file' : 'directory') : 'directory';
        
        // Determine Content URL
        let contentUrl: string | undefined = undefined;
        if (kind === 'file') {
          if (token) {
            contentUrl = `${GITHUB_API_BASE}/${owner}/${repo}/contents/${entry.path}?ref=${defaultBranch}`;
          } else {
            contentUrl = `${RAW_GITHUB_BASE}/${owner}/${repo}/${defaultBranch}/${entry.path}`;
          }
        }

        child = {
          id: fullPath,
          name: part,
          kind: kind,
          path: fullPath,
          children: kind === 'directory' ? [] : undefined,
          contentUrl,
          accessToken: token // Attach token to node for fileSystem service to use
        };

        if (!currentNode.children) currentNode.children = [];
        currentNode.children.push(child);
        map.set(fullPath, child);
      }

      currentNode = child;
      currentPath = fullPath;
    }
  }

  // 4. Sort
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
  };

  const sortRecursive = (node: FileNode) => {
    if (node.children) {
      node.children = sortNodes(node.children);
      node.children.forEach(sortRecursive);
    }
  };
  sortRecursive(root);

  return root;
};
