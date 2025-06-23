import { load } from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';

// Get input and output file names from command line
const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace('.yaml', '.json').replace('.yml', '.json');

try {
  const yamlContent = readFileSync(inputFile, 'utf8').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  const jsonData = load(yamlContent);
  writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
  console.log(`Converted ${inputFile} to ${outputFile}`);
} catch (error) {
  console.error('Error:', error.message);
}