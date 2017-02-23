import path from 'path';
import argv from 'yargs';
import listFile from './listFilesIntoDirectoryRecursively';

const args = argv
  .usage('Usage: $0 --data [file]')
  .option('config', {
    type: 'string',
    describe: 'JSON/JavaScript data file',
    requiresArg: true
  })
  .argv;

const list = listFile(args.data, true)
    .filter(element => path.extname(element) === '.svg');

process.stdout.write(JSON.stringify(list));
