import { walk } from 'std/fs/walk.ts';
import { basename } from 'std/path/mod.ts';
import MarkdownIt from 'markdown-it';

// Function to recursively read directories and markdown files
export async function readMarkdownFiles(
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
export async function readTsExamples(
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
export function removeSpecificTags(markdownContent: string): string {
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
export function convertMarkdownToHTML(markdownContent: string): string {
	const md = new MarkdownIt();
	const cleanContent = removeSpecificTags(markdownContent);
	return md.render(cleanContent);
}

// Function to format TypeScript content into markdown
export function formatTsContent(
	packageName: string,
	files: { path: string; content: string }[],
): string {
	let formattedContent = `## ${packageName} Examples\n`;
	for (const file of files) {
		formattedContent += `### ${basename(file.path)}\n`;
		formattedContent += '```typescript\n' + file.content + '\n```\n';
	}
	return formattedContent;
}

// Function to find all example directories in packages
export async function findExampleDirs(baseDir: string): Promise<string[]> {
	const exampleDirs: string[] = [];
	for await (const entry of walk(baseDir, { includeDirs: true })) {
		if (entry.isDirectory && basename(entry.path) === 'examples') {
			exampleDirs.push(entry.path);
		}
	}
	return exampleDirs;
}
