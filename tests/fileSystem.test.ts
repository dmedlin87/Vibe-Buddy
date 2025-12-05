import { describe, it, expect } from 'vitest';
import { processFileList, getAllFilePaths } from '../services/fileSystem';

const createMockFile = (fullPath: string): File => {
  const segments = fullPath.split('/');
  const name = segments[segments.length - 1];
  const file = new File(['content'], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: fullPath, writable: false });
  return file;
};

const createFileList = (paths: string[]): FileList =>
  Object.assign(paths.map(createMockFile), {
    length: paths.length,
    item: (index: number) => paths.map(createMockFile)[index],
  }) as unknown as FileList;

describe('processFileList', () => {
  it('returns null for an empty selection', async () => {
    const root = await processFileList(createFileList([]));
    expect(root).toBeNull();
  });

  it('builds a sorted tree from relative paths', async () => {
    const fileList = createFileList([
      'Project/src/app.tsx',
      'Project/src/utils/helpers.ts',
      'Project/README.md',
    ]);

    const root = await processFileList(fileList);
    expect(root?.name).toBe('Project');

    const rootChildren = root?.children ?? [];
    expect(rootChildren.map((c) => c.name)).toEqual(['src', 'README.md']);

    const src = rootChildren.find((c) => c.name === 'src');
    expect(src?.children?.map((c) => c.name)).toEqual(['app.tsx', 'utils']);

    const utils = src?.children?.find((c) => c.name === 'utils');
    expect(utils?.children?.map((c) => c.name)).toEqual(['helpers.ts']);
  });

  it('omits ignored directories anywhere in the path', async () => {
    const fileList = createFileList([
      'Project/src/app.tsx',
      'Project/node_modules/some-lib/index.js',
      'Project/.git/config',
    ]);

    const root = await processFileList(fileList);
    const childNames = root?.children?.map((c) => c.name) ?? [];
    expect(childNames).toEqual(['src']);

    const paths = getAllFilePaths(root);
    expect(paths).toEqual(['Project/src/app.tsx']);
  });
});
