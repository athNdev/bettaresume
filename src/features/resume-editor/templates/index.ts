/**
 * Template registry — maps each TemplateType to a function that returns
 * the Typst source string for that template.
 *
 * Add new templates here; each template function receives no arguments
 * (data is injected at compile time via `#let data = json.decode(...)`).
 */

import type { TemplateType } from "@/features/resume-editor/types";
import { minimalTemplate } from "./minimal";
import { modernTemplate } from "./modern";
import {
	classicTemplate,
	creativeTemplate,
	executiveTemplate,
	professionalTemplate,
	techTemplate,
} from "./others";

const templateFactories: Record<TemplateType, () => string> = {
	minimal: minimalTemplate,
	modern: modernTemplate,
	classic: classicTemplate,
	professional: professionalTemplate,
	creative: creativeTemplate,
	executive: executiveTemplate,
	tech: techTemplate,
};

/**
 * Returns the Typst source string for the given template type.
 * Falls back to `minimal` if the template is not found.
 */
export function getTemplateSource(template: TemplateType): string {
	const factory = templateFactories[template] ?? templateFactories.minimal;
	return factory();
}

export { minimalTemplate, modernTemplate };
