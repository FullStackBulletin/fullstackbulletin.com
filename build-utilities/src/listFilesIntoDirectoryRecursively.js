import fs from'fs';
import path from 'path';

const walkSync = (dir, onlyName = false, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), onlyName, filelist)
      : filelist.concat(onlyName ? file : path.join(dir, file));
    });
  return filelist;
};
module.exports = walkSync;