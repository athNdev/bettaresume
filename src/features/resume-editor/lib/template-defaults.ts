import type {
	PartialResumeSettings,
	ResumeSettings,
	TemplateType,
} from "@/features/resume-editor/types";
import { TEMPLATE_CONFIGS } from "@/features/resume-editor/types";

/**
 * Applying an archetype's settings.
 *
 * Selecting a template changes the document's design, and for an archetype the density
 * *is* part of the design: Compact is not Standard with a different name, it is Standard at
 * 0.5 in margins and 1.25 leading. So the panel's choice applies the archetype's layout
 * defaults along with its palette.
 *
 * Only layout fields are in `defaults` (margins, leading, section spacing, and the
 * executive name size). Colour is carried separately by `defaultColors` because it is a
 * user control, not an archetype identity — all six share one palette.
 *
 * The merge is field-wise: an archetype that sets `typography.name` must not drop the
 * user's `body`, and one that sets `margins` must not replace a side it did not name.
 */
export function mergeSettings(
	base: ResumeSettings,
	patch: PartialResumeSettings,
): ResumeSettings {
	return {
		...base,
		...patch,
		margins: { ...base.margins, ...patch.margins },
		typography: { ...base.typography, ...patch.typography },
		colors: { ...base.colors, ...patch.colors },
	};
}

/** The settings patch an archetype applies when it is selected. */
export function templateSettings(
	template: TemplateType,
): PartialResumeSettings {
	const config = TEMPLATE_CONFIGS[template];
	return { ...config.defaults, colors: config.defaultColors };
}

/** The document a resume would have if it used this archetype's defaults. */
export function withTemplateDefaults(
	template: TemplateType,
	settings: ResumeSettings,
): ResumeSettings {
	return mergeSettings(settings, templateSettings(template));
}
