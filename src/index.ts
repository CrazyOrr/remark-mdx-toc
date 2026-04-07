import { valueToEstree } from 'estree-util-value-to-estree';
import type { Heading, Root } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { toString } from "mdast-util-to-string";
import type { Plugin } from "unified";
import { define } from 'unist-util-mdx-define';
import { visit } from "unist-util-visit";

export type TocEntry = {
	depth: number,
	// value of the heading
	value: string,
	attributes: { [key: string]: string },
	children: TocEntry[]
};

export type CustomTag = {
	/// regex to match the tag name
	name: RegExp,
	/// get depth from name
	depth: (name: string) => number
};

export interface RemarkMdxTocOptions extends define.Options {
	/**
	 * If specified, export toc using the name.
	 * Otherwise, use `toc` as the name.
	 */
	name?: string,
	/**
	 * Add custom tag to toc
	 */
	customTags?: CustomTag[]
};


const remarkMdxToc: Plugin<[RemarkMdxTocOptions?], Root> = ({ name = 'toc', ...options } = {}) => (
	(ast, file) => {
		// structured toc
		const toc: TocEntry[] = [];
		// flat toc (share objects in toc, only for iterating)
		const flatToc: TocEntry[] = [];
		const createEntry = (node: Heading | MdxJsxFlowElement, depth: number): TocEntry => {
			let attributes = (node.data || {}) as TocEntry['attributes'];
			if (node.type === "mdxJsxFlowElement") {
				attributes = Object.fromEntries(
					node.attributes
						.filter(attribute => attribute.type === 'mdxJsxAttribute' && typeof attribute.value === 'string')
						.map(attribute => [(attribute as MdxJsxAttribute).name, attribute.value])
				) as TocEntry['attributes'];
			}
			return {
				depth,
				value: toString(node, { includeImageAlt: false }),
				attributes,
				children: []
			}
		};

		visit(ast, ["heading", "mdxJsxFlowElement"], node => {
			let depth = 0;
			if (node.type === "mdxJsxFlowElement") {
				let valid = false;
				if (/^h[1-6]$/.test(node.name || "")) {
					valid = true;
					depth = parseInt(node.name!.substring(1));
				}
				else if (options.customTags) {
					for (const tag of options.customTags) {
						if (tag.name.test(node.name || "")) {
							valid = true;
							depth = tag.depth(node.name || "");
							break;
						}
					}
				}

				if (!valid) {
					return;
				}
			}
			else if (node.type === "heading") {
				depth = node.depth;
			}
			else {
				return;
			}

			const entry = createEntry(node, depth);
			flatToc.push(entry);

			// find the last node that is less deep (parent)
			// Fall back to root
			let parent: TocEntry[] = toc;
			for (let i = flatToc.length - 1; i >= 0; --i) {
				const current = flatToc[i];
				if (current.depth < entry.depth) {
					parent = current.children;
					break;
				}
			}
			parent.push(entry);
		});

		// Export in MDX
		define(ast, file, { [name]: valueToEstree(toc) }, options)
	}
);

export default remarkMdxToc;