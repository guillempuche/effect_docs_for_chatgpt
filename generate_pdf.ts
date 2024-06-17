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

// Main function to generate PDF from markdown repo
async function generatePDFFromRepo(
  dirPath: string,
  outputPath: string,
): Promise<void> {
  const markdownFiles = await readMarkdownFiles(dirPath);
  let combinedHTML = '';

  for (const file of markdownFiles) {
    const { body, attrs } = extract(file.content);
    const title = attrs.title
      ? `<h1>${attrs.title}</h1>`
      : `<h1>${basename(file.path)}</h1>`;
    const relativePath = `<p><em>Location: ${
      relative(dirPath, file.path).replace(extname(file.path), '')
    }</em></p>`;
    const excerpt = attrs.excerpt ? `<p><em>${attrs.excerpt}</em></p>` : '';
    const htmlContent = convertMarkdownToHTML(body);
    combinedHTML += title + relativePath + excerpt + htmlContent;
  }

  await generatePDF(combinedHTML, outputPath);
}

// CLI input handling
const dirPath = Deno.args[0];
const outputPath = Deno.args[1] || 'documentation.pdf';

if (!dirPath) {
  console.error(
    'Please provide the path to the directory containing markdown files.',
  );
  Deno.exit(1);
}

await generatePDFFromRepo(dirPath, outputPath);
console.log(`PDF generated at ${outputPath}`);
