// js extension is necessary for esm
import { compile } from "@mdx-js/mdx";
import fs from "node:fs/promises";
import path from 'path';
import remarkCustomHeaderId from 'remark-custom-header-id';
import remarkMdxToc from "../src/index.js";

const content = await compile(await fs.readFile(path.resolve(import.meta.dirname, "example.mdx")), {
	jsx: true,
	remarkPlugins: [
		remarkCustomHeaderId,
		[remarkMdxToc, {
			name: "toc",
			customTags: [{
				name: /^H[1-6]$/,
				depth: (name: string) => parseInt(name.substring(1))
			}]
		}]
	]
});

console.log(content.value);
