
import { FileNode } from '../types';
import { isSystemIgnored } from '../constants';

// Helper to sort nodes: directories first, then alphabetical
const sortNodes = (nodes: FileNode[]): FileNode[] => {
  return nodes.sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name);
    }
    return a.kind === 'directory' ? -1 : 1;
  });
};

export const openDirectory = async (): Promise<FileNode | null> => {
  try {
    // Check if API is available
    // @ts-ignore
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error('File System Access API not supported');
    }

    // @ts-ignore - File System Access API
    const dirHandle = await window.showDirectoryPicker();
    if (!dirHandle) return null;

    const root: FileNode = {
      id: dirHandle.name,
      name: dirHandle.name,
      kind: 'directory',
      children: [],
      handle: dirHandle,
      path: dirHandle.name,
    };

    await readDirectory(dirHandle, root, dirHandle.name);
    return root;
  } catch (err) {
    // Silent fail to allow caller to handle fallback without noisy console errors
    // distinct from actual application crashes
    throw err;
  }
};

const readDirectory = async (
  dirHandle: any,
  parentNode: FileNode,
  currentPath: string
) => {
  const children: FileNode[] = [];

  for await (const entry of dirHandle.values()) {
    // Use centralized ignore logic
    if (isSystemIgnored(entry.name)) {
      continue;
    }

    const path = `${currentPath}/${entry.name}`;
    const node: FileNode = {
      id: path,
      name: entry.name,
      kind: entry.kind,
      handle: entry,
      path: path,
      children: [],
    };

    if (entry.kind === 'directory') {
      await readDirectory(entry, node, path);
      // Only add directory if it's not empty or we want to show empty dirs
      children.push(node);
    } else {
      children.push(node);
    }
  }

  parentNode.children = sortNodes(children);
};

export const processFileList = async (files: FileList): Promise<FileNode | null> => {
  if (files.length === 0) return null;

  // Root name is the first segment of the first file's webkitRelativePath
  // e.g., "Project/src/index.ts" -> "Project"
  const rootName = files[0].webkitRelativePath.split('/')[0];
  
  const root: FileNode = {
    id: rootName,
    name: rootName,
    kind: 'directory',
    children: [],
    path: rootName
  };

  const map = new Map<string, FileNode>();
  map.set(rootName, root);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pathParts = file.webkitRelativePath.split('/');
    
    // Check global ignore list on ANY path part (e.g. node_modules in subdirectory)
    if (pathParts.some(part => isSystemIgnored(part))) {
      continue;
    }

    let currentPath = rootName;
    let currentNode = root;

    // Start from 1 to skip root folder name which is already handled
    for (let j = 1; j < pathParts.length; j++) {
      const part = pathParts[j];
      const isFile = j === pathParts.length - 1;
      const path = `${currentPath}/${part}`;
      
      let child = map.get(path);
      
      if (!child) {
        child = {
          id: path,
          name: part,
          kind: isFile ? 'file' : 'directory',
          path: path,
          children: isFile ? undefined : [],
          file: isFile ? file : undefined
        };
        
        if (!currentNode.children) currentNode.children = [];
        currentNode.children.push(child);
        map.set(path, child);
      }
      
      currentNode = child;
      currentPath = path;
    }
  }

  // Sort children recursively
  const sortRecursive = (node: FileNode) => {
    if (node.children) {
      node.children = sortNodes(node.children);
      node.children.forEach(sortRecursive);
    }
  };
  sortRecursive(root);

  return root;
};

export const readFileContent = async (node: FileNode): Promise<string> => {
  const headers: HeadersInit = {};
  
  if (node.accessToken) {
    headers['Authorization'] = `token ${node.accessToken}`;
    // If fetching from API (url contains api.github.com), use raw media type
    if (node.contentUrl && node.contentUrl.includes('api.github.com')) {
      headers['Accept'] = 'application/vnd.github.v3.raw';
    }
  }

  // Remote File (GitHub)
  if (node.contentUrl) {
    const response = await fetch(node.contentUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch remote file: ${response.statusText}`);
    }
    return await response.text();
  }

  // Priority: Legacy File object (fallback mode)
  if (node.file) {
    return await node.file.text();
  }
  
  // Standard File System Access API
  if (node.handle && node.kind === 'file') {
     // @ts-ignore
     const file = await node.handle.getFile();
     return await file.text();
  }
  
  throw new Error("No file handle available for " + node.name);
};

// New Helper: Flatten tree to list of paths
export const getAllFilePaths = (node: FileNode | null): string[] => {
  if (!node) return [];
  
  const paths: string[] = [];
  
  const traverse = (n: FileNode) => {
    if (n.kind === 'file') {
      paths.push(n.path);
    }
    if (n.children) {
      n.children.forEach(traverse);
    }
  };
  
  traverse(node);
  return paths;
};
