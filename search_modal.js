import fs from 'fs';

const content = fs.readFileSync('src/index.css', 'utf-8');
const lines = content.split('\n');

console.log('Searching for "modal" classes in src/index.css:');
lines.forEach((line, index) => {
  if (line.includes('modal') || line.includes('backdrop')) {
    console.log(`${index + 1}: ${line}`);
  }
});
