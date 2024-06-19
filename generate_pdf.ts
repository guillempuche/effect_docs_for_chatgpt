import { basename, dirname, extname, relative } from 'std/path/mod.ts';
import puppeteer from 'puppeteer';
import { extract } from 'front-matter';

import {
  adjustHeaderLevelsHtml,
  adjustHeaderLevelsMarkdown,
  convertMarkdownToHTML,
  findExampleDirs,
  formatTsContent,
  readMarkdownFiles,
  readTsExamples,
} from './utils.ts';

// List of README paths in the Effect repo
const effectReadmePaths = [
  'packages/cli/README.md',
  'packages/platform/README.md',
  'packages/printer/README.md',
  'packages/schema/README.md',
  'packages/sql/README.md',
  'packages/typeclass/README.md',
  'packages/vitest/README.md',
];

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

// Function to generate Markdown file from combined content
async function generateMarkdown(
  markdownContent: string,
  outputPath: string,
): Promise<void> {
  await Deno.writeTextFile(outputPath, markdownContent);
}

// Main function to generate output from multiple repositories
async function generateOutputFromRepos(
  docsDirPath: string,
  effectDirPath: string,
  httpDirPath: string,
  outputPath: string,
  format: 'pdf' | 'md',
): Promise<void> {
  const markdownFiles = await readMarkdownFiles(docsDirPath);
  let combinedContent = '';

  // Function to process content from a repo. First README guides, then examples Typescript files.
  async function processRepoContent(
    repoDirPath: string,
    readmePaths: string[] = [],
  ) {
    // Add repo title at the beginning
    combinedContent += format === 'pdf'
      ? `<h1>${basename(repoDirPath)}</h1>`
      : `# ${basename(repoDirPath)}\n\n`;

    for (const readmePath of readmePaths) {
      const fullPath = `${repoDirPath}/${readmePath}`;
      try {
        const readmeContent = await Deno.readTextFile(fullPath);
        if (format === 'pdf') {
          const htmlContent = convertMarkdownToHTML(readmeContent);
          const adjustedHtmlContent = adjustHeaderLevelsHtml(htmlContent);
          combinedContent += `<h1>${basename(readmePath)}</h1>` +
            adjustedHtmlContent;
        } else {
          const adjustedMarkdownContent = adjustHeaderLevelsMarkdown(
            readmeContent,
          );
          combinedContent += `# ${
            basename(readmePath)
          }\n\n${adjustedMarkdownContent}\n\n`;
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error);
      }
    }

    const exampleDirs = await findExampleDirs(`${repoDirPath}/packages`);

    for (const exampleDir of exampleDirs) {
      const packageDir = dirname(relative(repoDirPath, exampleDir));
      const packageName = basename(packageDir);
      const tsFiles = await readTsExamples(exampleDir);
      console.debug('packageName ', packageName);
      const formattedTsContent = formatTsContent(packageName, tsFiles, format);
      if (format === 'pdf') {
        const adjustedFormattedContent = adjustHeaderLevelsHtml(
          formattedTsContent,
        );
        combinedContent += adjustedFormattedContent;
      } else {
        const adjustedFormattedContent = adjustHeaderLevelsMarkdown(
          formattedTsContent,
        );
        combinedContent +=
          `# ${packageName} Examples\n\n${adjustedFormattedContent}\n\n`;
      }
    }
  }

  // Process content from effect-http repo
  await processRepoContent(httpDirPath);

  // Process content from Effect packages
  await processRepoContent(effectDirPath, effectReadmePaths);

  // Process markdown files from docs directory
  for (const file of markdownFiles) {
    const { body, attrs } = extract(file.content);
    const title = attrs.title
      ? `<h1>${attrs.title}</h1>`
      : `<h1>${basename(file.path)}</h1>`;
    const relativePath = `<p><em>Location: ${
      relative(docsDirPath, file.path).replace(extname(file.path), '')
    }</em></p>`;
    const excerpt = attrs.excerpt ? `<p><em>${attrs.excerpt}</em></p>` : '';
    if (format === 'pdf') {
      const htmlContent = convertMarkdownToHTML(body);
      const adjustedHtmlContent = adjustHeaderLevelsHtml(htmlContent);
      combinedContent += title + relativePath + excerpt + adjustedHtmlContent;
    } else {
      const adjustedMarkdownContent = adjustHeaderLevelsMarkdown(body);
      combinedContent += `# ${
        attrs.title || basename(file.path)
      }\n\n${adjustedMarkdownContent}\n\n`;
    }
  }

  // Generate the final output
  if (format === 'pdf') {
    await generatePDF(combinedContent, outputPath);
  } else {
    await generateMarkdown(combinedContent, outputPath);
  }
}

console.log('Processing...');

// CLI input handling
const docsDirPath = Deno.args[0];
const effectDirPath = Deno.args[1];
const httpDirPath = Deno.args[2];
const format = Deno.args[3] || 'pdf';
const outputFileName = Deno.args[4] || 'documentation';
const outputPath = `${outputFileName}.${format}`;

if (!docsDirPath || !effectDirPath || !httpDirPath) {
  console.error(
    'Please provide the paths to the directories containing website markdown files, effect repo, and effect-http repo.',
  );
  Deno.exit(1);
}

await generateOutputFromRepos(
  docsDirPath,
  effectDirPath,
  httpDirPath,
  outputPath,
  format,
);
console.log(`Output generated at ${outputPath}`);
