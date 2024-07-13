# Effect Documentation PDF and Markdown Generator for ChatGPT

This guide explains how to create a PDF or markdown file from the Effect documentation, README guides, and examples.

## Prerequisites

- **Deno:** Make sure Deno is installed on your system. If not, you can install it from [Deno's official website](https://deno.land/).

## Setup

### Clone the Necessary Repositories

First, clone the Effect Website and Effect Github repositories:

```bash
git clone https://github.com/Effect-TS/website.git
git clone https://github.com/Effect-TS/effect.git
git clone https://github.com/sukovanej/effect-http.git
```

Next, in the same directory where you cloned the Effect Website, clone your Deno PDF generator repository:

```bash
git clone https://github.com/guillempuche/effect_docs_for_chatgpt.git
```

Your directory structure should now look something like this:

```txt
/some-folder
|-- /effect_docs_for_chatgpt
|-- /effect
|-- /effect-http
|-- /website
```

## Usage

Navigate to the Deno PDF generator directory and run the following command:

```bash
cd effect_docs_for_chatgpt
deno task generate-pdf <docsDirPath> <effectDirPath> <httpDirPath> [format:pdf|md] [outputFileName]
```

This command will convert the Markdown files found in the `../website/content/docs` directory and include content from the `../effect` repository into a single PDF or Markdown file named `documentation`. The last format and the document name arguments are optional.

## Example Command

If all repositories are cloned under your home directory, the command would look like this:

```bash
deno task generate-pdf ../website/content/docs ../effect ../effect-http md output <-- It will generate "output.md"
deno task generate-pdf ../website/content/docs ../effect ../effect-http pdf <-- It will generate "documentation.pdf"
deno task generate-pdf ../website/content/docs ../effect ../effect-http <-- It will generate "documentation.pdf"
```

## Additional Commands

Within the Deno PDF generator repository, you have access to other useful tasks:

- **Linting**: `deno lint` to check for stylistic errors.
- **Formatting**: `deno fmt` to format the source code.

## Troubleshooting

- Ensure you have read and write permissions for the directories involved.
- Confirm that all paths are correctly specified in the commands.
- Check that Deno is correctly installed by running `deno --version`.
- If you encounter errors related to Deno's permissions, ensure the script in your `deno.jsonc` file has the necessary permissions flags set.
