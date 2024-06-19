import { basename, extname, relative} from 'std/path/mod.ts';
import puppeteer from 'puppeteer';
import { extract } from 'front-matter';

import {
	convertMarkdownToHTML,
	findExampleDirs,
	formatTsContent,
	readMarkdownFiles,
	readTsExamples,
} from './utils.ts';

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

// Main function to generate PDF from multiple repositories
async function generatePDFFromRepos(
	docsDirPath: string,
	effectDirPath: string,
	httpDirPath: string,
	outputPath: string,
): Promise<void> {
	const markdownFiles = await readMarkdownFiles(docsDirPath);
	let combinedHTML = '';

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
		const htmlContent = convertMarkdownToHTML(body);
		combinedHTML += title + relativePath + excerpt + htmlContent;
	}

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

	// Function to process content from a repo. First README guides, then examples Typescript files.
	async function processRepoContent(repoDirPath: string, readmePaths: string[] = []) {
    for (const readmePath of readmePaths) {
      const fullPath = `${repoDirPath}/${readmePath}`;
      try {
        const readmeContent = await Deno.readTextFile(fullPath);
        const htmlContent = convertMarkdownToHTML(readmeContent);
        combinedHTML += `<h1>${basename(readmePath)}</h1>` + htmlContent;
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error);
      }
    }

    const exampleDirs = await findExampleDirs(`${repoDirPath}/packages`);
    
    for (const exampleDir of exampleDirs) {
      const packageName = basename(relative(repoDirPath, exampleDir));
      const tsFiles = await readTsExamples(exampleDir);
      const formattedTsContent = formatTsContent(packageName, tsFiles);
      const htmlContent = convertMarkdownToHTML(formattedTsContent);
      combinedHTML += htmlContent;
    }
  }

  // Process content from effect repo
  await processRepoContent(effectDirPath, effectReadmePaths);

	// Process content from effect repo
	await processRepoContent(effectDirPath);

	// Process content from effect-http repo
	await processRepoContent(httpDirPath);

	// Generate the final PDF
	await generatePDF(combinedHTML, outputPath);
}

console.log('Processing...');

// CLI input handling
const docsDirPath = Deno.args[0];
const effectDirPath = Deno.args[1];
const httpDirPath = Deno.args[2];
const outputFileName = Deno.args[3] || 'documentation';
const outputPath = `${outputFileName}.pdf`;

if (!docsDirPath || !effectDirPath || !httpDirPath) {
	console.error(
		'Please provide the paths to the directories containing website markdown files, effect repo, and effect-http repo.',
	);
	Deno.exit(1);
}

await generatePDFFromRepos(docsDirPath, effectDirPath, httpDirPath, outputPath);
console.log(`PDF generated at ${outputPath}`);
