import path from 'path';
import { readdirSync, Dirent } from 'fs';
import { getFolderSize, convertBytes } from './sizeUtils';
import blacklisted from './blacklisted';

function getDirectories(source: string) {
  return readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => {
      return path.resolve(path.join(source, dirent.name));
    });
  };

const getSubDirectories = (root: string) => {
  return readdirSync(root, { withFileTypes: true })
    .map((dirent) => {
      return path.join(root, dirent.name);
    });
};

function hasNMInside(source: string) {
  // @ts-ignore
  return readdirSync(source).some((dir: Dirent) => {
    return dir.name === 'node_modules';
  });
};

function isNamespaceDependency(source: string) {
  const currentFolder = source.split('/').pop();
  return (currentFolder).includes('@');
};

const getProblems = (name: string[]) => {
  const subReport = {
    problems: [],
    totalSize: 0
  };

  name.forEach((dir: string) => {
    const dirName = dir
      .split('/')
      .pop();

    const problemsFound = blacklisted
      .filter((blackListed) => {
        return blackListed.includes(dirName);
      })
      .map((blackListed) => {
        if (blackListed) {
          const size = getFolderSize(dir);
          subReport.totalSize += size;
          return blackListed;
        }
      });
    subReport.problems = [...subReport.problems, ...problemsFound];
  });
  return subReport;
};

const cleanupDirName = (fullPath) => {
  const splittedPath = fullPath.split('/');
  const packageName = splittedPath.pop();
  if (fullPath.includes('@')) {
    const scope = splittedPath[splittedPath.length - 1];
    return `${scope}/${packageName}`;
  }
  return packageName;
};

const mountGraph = (rootDir: string[]) => {
  const results = {
    totalSaved: 0,
    perPackage: {}
  };

  rootDir.forEach((dir: string) => {
    const subDirectories = getSubDirectories(dir);
    if (!hasNMInside(dir)) {
      const report = getProblems(subDirectories);
      if (report.problems.length) {
        results.totalSaved += report.totalSize;
        results.perPackage[cleanupDirName(dir)] = {
          problems: report.problems,
          saved: convertBytes(report.totalSize)
        };
      }
    }

    if (isNamespaceDependency(dir)) {
      const readTopRootDir = getSubDirectories(dir);
      const subReport = mountGraph(readTopRootDir);
      Object.assign(results, subReport);
    }
  });

  return results;
};

export function analyze(pathToNodeModules){
  const pathNM = pathToNodeModules ? path.resolve(pathToNodeModules) : path.resolve(process.cwd(), 'node_modules/');
  const initialDirs = getDirectories(pathNM);
  return mountGraph(initialDirs);
};

export * from './reporters';