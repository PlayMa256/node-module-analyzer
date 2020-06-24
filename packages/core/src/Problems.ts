import { hasKey } from './utils';
import { getFolderSize } from './sizeUtils';
import { filesBlacklisted, foldersBlacklisted } from './blacklisted';
import { lstatSync } from 'fs';
import { getSubDirectories } from './index';

export class Problems {
  constructor(readonly path: string) {
    if (lstatSync(path).isDirectory()) {
      this.scanFolders(path);
    } else {
      this.scanFiles(path);
    }
  }

  report = {
    problems: [],
    totalSize: 0
  };

  scanSrcFolder(packageJson, path: string) {
    if (packageJson && path.includes('src')) {
      const mainField = packageJson?.main;
      const devDeps = packageJson?.devDependencies;
      const flowBin = devDeps && devDeps['flow-bin'];

      // edge case for flow binaries, where the don't have any way
      // to get the type definitions as ts has
      if (mainField?.includes('dist/') && !flowBin) {
        this.report.problems = [...this.report.problems, 'src'];
        this.report.totalSize += getFolderSize(path);
      }
    }
  }

  lookForMultipleInstances(contentOfFolder: Array<string>) {
    const problems = [];
    let size = 0;

    const licenses = contentOfFolder.filter((itemName) => {
      return (
        itemName.toLowerCase().includes('license') || itemName.toLowerCase().includes('lisence')
      );
    });

    if (licenses.length > 1) {
      licenses.splice(0, 1);
      licenses.forEach((pathName) => {
        const fileName = pathName.split('/').pop();
        problems.push(fileName);
        size += getFolderSize(pathName);
      });
    }

    const changelog = contentOfFolder.filter((itemName) => {
      return itemName.toLowerCase().includes('changelog');
    });

    if (changelog.length > 1) {
      changelog.splice(0, 1);
      changelog.forEach((pathName) => {
        const fileName = pathName.split('/').pop();
        problems.push(fileName);
        size += getFolderSize(pathName);
      });
    }
    return {
      problems,
      size
    };
  }

  scanFolders(paths: string) {
    // const { problems, size: multipleInstancesSizes } = this.lookForMultipleInstances(paths);

    // this.report.problems = [
    //   ...new Set([...this.report.problems, ...problems])
    // ]
    // this.report.totalSize += multipleInstancesSizes;

      const splittedFullPath = paths.split('/');
      const dirName = splittedFullPath.pop();
      const fullpathWithoutFilename = splittedFullPath.join('/');
      let packageJson = null;
      try {
        packageJson = require(`${fullpathWithoutFilename}/package.json`);
      } catch (err) {
        // do nothing
      }

      // this.scanSrcFolder(packageJson, dir);

      const problemsFound = foldersBlacklisted
        .filter((blackListed) => {
          return blackListed === dirName;
        })
        .map((itemBlacklisted) => {
          if (itemBlacklisted) {
            const size = getFolderSize(paths);
            this.report.totalSize += size;
            return itemBlacklisted;
          }
        });

      this.report.problems = [
        ...new Set([...this.report.problems, ...problemsFound])
      ];
  }

  scanFiles(paths: string) {
    // const { problems, size: multipleInstancesSizes } = this.lookForMultipleInstances(paths);

    // this.report.problems = [
    //   ...new Set([...this.report.problems, ...problems])
    // ]
    // this.report.totalSize += multipleInstancesSizes;

      const splittedFullPath = paths.split('/');
      const dirName = splittedFullPath.pop();
      const fullpathWithoutFilename = splittedFullPath.join('/');
      let packageJson = null;
      try {
        packageJson = require(`${fullpathWithoutFilename}/package.json`);
      } catch (err) {
        // do nothing
      }

      // this.scanSrcFolder(packageJson, dir);

      const problemsFound = filesBlacklisted
        .filter((blackListed) => {
          return blackListed === dirName;
        })
        .map((itemBlacklisted) => {
          if (itemBlacklisted) {
            const size = getFolderSize(paths);
            this.report.totalSize += size;
            return itemBlacklisted;
          }
        });

      this.report.problems = [
        ...new Set([...this.report.problems, ...problemsFound])
      ];
  }
}
