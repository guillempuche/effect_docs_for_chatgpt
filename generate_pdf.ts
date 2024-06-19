import { walk } from 'std/fs/walk.ts';
import { basename, extname, relative } from 'std/path/mod.ts';
import MarkdownIt from 'markdown-it';
import puppeteer from 'puppeteer';
import { extract } from 'front-matter';

// Function to recursively read directories and markdown files
async function readMarkdownFiles(
  dir: string,
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];

  for await (
    const entry of walk(dir, { includeDirs: false, exts: ['.md', '.mdx'] })
  ) {
    const content = await Deno.readTextFile(entry.path);
    files.push({ path: entry.path, content });
  }

  return files;
}

// Function to read TypeScript examples from specified directories
async function readTsExamples(
  dir: string,
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];

  for await (const entry of walk(dir, { includeDirs: false, exts: ['.ts'] })) {
    const content = await Deno.readTextFile(entry.path);
    files.push({ path: entry.path, content });
  }

  return files;
}

// Function to remove specific tags and their content from markdown content
function removeSpecificTags(markdownContent: string): string {
  // Regex to remove <Tabs>, <Tab>, <Design>, and <img> tags along with their content
  const tabsRegex = /<Tabs[\s\S]*?<\/Tabs>/gi;
  const tabRegex = /<Tab[\s\S]*?<\/Tab>/gi;
  const designRegex = /<Design[\s\S]*?<\/Design>/gi;
  const imgRegex = /<img[^>]*>/gi;

  return markdownContent
    .replace(tabsRegex, '')
    .replace(tabRegex, '')
    .replace(designRegex, '')
    .replace(imgRegex, '');
}

// Function to convert markdown content to HTML
function convertMarkdownToHTML(markdownContent: string): string {
  const md = new MarkdownIt();
  const cleanContent = removeSpecificTags(markdownContent);
  return md.render(cleanContent);
}

// Function to generate PDF from HTML content
async function generatePDF(
  htmlContent: string,
  outputPath: string,
): Promise<void> {
  const browser = await puppeteer.launch({
    executablePath: puppeteer.executablePath(),
    product: 'chrome',
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outputPath, format: 'A4' });
  await browser.close();
}

// Function to format TypeScript content into markdown
function formatTsContent(packageName: string, files: { path: string; content: string }[]): string {
  let formattedContent = `## ${packageName} Examples\n`;
  for (const file of files) {
    formattedContent += `### ${basename(file.path)}\n`;
    formattedContent += '```typescript\n' + file.content + '\n```\n';
  }
  return formattedContent;
}

// Function to find all example directories in packages
async function findExampleDirs(baseDir: string): Promise<string[]> {
  const exampleDirs: string[] = [];
  for await (const entry of walk(baseDir, { includeDirs: true })) {
    if (entry.isDirectory && basename(entry.path) === 'examples') {
      exampleDirs.push(entry.path);
    }
  }
  return exampleDirs;
}

// Main function to generate PDF from markdown repo and effect repo
async function generatePDFFromRepos(
  docsDirPath: string,
  effectDirPath: string,
  outputPath: string,
): Promise<void> {
  const markdownFiles = await readMarkdownFiles(docsDirPath);
  let combinedHTML = '';

  for (const file of markdownFiles) {
    const { body, attrs } = extract(file.content);
    const title = attrs.title
      ? `<h1>${attrs.title}</h1>`
      : `<h1>${basename(file.path)}</h1>`;
    const relativePath = `<p><em>Location: ${
      relative(docsDirPath, file.path).replace(extname(file.path), '')
    }</em></p>`;
    const excerpt = attrs.excerpt ? `<p><em>${attrs.excerpt}</em></p>` : '';
    const htmlContent = convertMarkdownToHTML(body);
    combinedHTML += title + relativePath + excerpt + htmlContent;
  }

  // Add content from effect repo
  const effectReadmePaths = [
    'packages/cli/README.md',
    'packages/platform/README.md',
    'packages/printer/README.md',
    'packages/schema/README.md',
    'packages/sql/README.md',
    'packages/typeclass/README.md',
    'packages/vitest/README.md',
  ];

  for (const readmePath of effectReadmePaths) {
    const readmeContent = await Deno.readTextFile(`${effectDirPath}/${readmePath}`);
    const htmlContent = convertMarkdownToHTML(readmeContent);
    combinedHTML += `<h1>${basename(readmePath)}</h1>` + htmlContent;
  }

  // Find and add examples from effect repo
  const exampleDirs = await findExampleDirs(`${effectDirPath}/packages`);
  
  for (const exampleDir of exampleDirs) {
    const packageName = basename(relative(effectDirPath, exampleDir));
    const tsFiles = await readTsExamples(exampleDir);
    const formattedTsContent = formatTsContent(packageName, tsFiles);
    const htmlContent = convertMarkdownToHTML(formattedTsContent);
    combinedHTML += htmlContent;
  }

  await generatePDF(combinedHTML, outputPath);
}

// CLI input handling
const docsDirPath = Deno.args[0];
const effectDirPath = Deno.args[1];
const outputPath = Deno.args[2] || 'documentation.pdf';

if (!docsDirPath || !effectDirPath) {
  console.error(
    'Please provide the paths to the directories containing website markdown files and effect repo.',
  );
  Deno.exit(1);
}

await generatePDFFromRepos(docsDirPath, effectDirPath, outputPath);
console.log(`PDF generated at ${outputPath}`);