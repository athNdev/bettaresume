"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ImportOk } from "@/lib/import/extractors";
import { toLibraryPayload } from "@/lib/import/library-item";
import {
	type ExtractedField,
	type ExtractedSection,
	type ImportResult,
	REVIEW_THRESHOLD,
} from "@/lib/import/sectioner";

/** One editable value, with the confidence the sectioner gave it. */
interface ReviewableField {
	/** Stable key into the override map. */
	path: string;
	/** Field name for the label, e.g. "organization". */
	name: string;
	field: ExtractedField;
}

function sectionFields(section: ExtractedSection): ReviewableField[] {
	const out: ReviewableField[] = [];
	for (const [name, field] of Object.entries(section.fields)) {
		out.push({ path: `${name}`, name, field });
	}
	for (const [entryIndex, entry] of section.entries.entries()) {
		for (const [name, field] of Object.entries(entry.fields)) {
			out.push({
				path: `entry.${entryIndex}.${name}`,
				name,
				field,
			});
		}
		for (const [bulletIndex, bullet] of entry.bullets.entries()) {
			out.push({
				path: `entry.${entryIndex}.bullet.${bulletIndex}`,
				name: `bullet ${bulletIndex + 1}`,
				field: bullet,
			});
		}
	}
	for (const [bulletIndex, bullet] of section.bullets.entries()) {
		out.push({
			path: `bullet.${bulletIndex}`,
			name: `line ${bulletIndex + 1}`,
			field: bullet,
		});
	}
	return out;
}

/** Every field the sectioner emitted, tagged with where it sits. */
export interface ReviewField extends ReviewableField {
	sectionIndex: number;
}

/** All reviewable fields of an import result, in section order. */
export function reviewFieldsFor(result: ImportResult): ReviewField[] {
	return result.sections.flatMap((section, sectionIndex) =>
		sectionFields(section).map((f) => ({ ...f, sectionIndex })),
	);
}

/** How many of these fields sit below the review threshold. */
export function countLowConfidence(fields: ReviewField[]): number {
	return fields.filter((f) => f.field.confidence < REVIEW_THRESHOLD).length;
}

/** Stable key for one field across the result and the override map. */
export function fieldKey(sectionIndex: number, path: string): string {
	return `${sectionIndex}::${path}`;
}

function confidenceIsLow(field: ExtractedField): boolean {
	return field.confidence < REVIEW_THRESHOLD;
}

/**
 * A stable key for one extracted section.
 *
 * Content first, ordinal last. The ordinal is genuinely part of the identity here --
 * a resume can carry "PROJECTS" twice and both sections must stay addressable -- but it
 * alone would be the wrong thing to key on, because the key also has to survive a
 * re-extraction of the same file.
 */
function sectionKey(section: ExtractedSection, ordinal: number): string {
	return `${section.rawHeading}:${section.raw.slice(0, 24)}:${ordinal}`;
}

/**
 * The library payload for one section, as the user has left it on screen.
 *
 * Overrides are applied *before* `toLibraryPayload` runs, so the stored confidence notes
 * describe the value that is actually saved rather than the one the extractor proposed.
 *
 * Exported because the container and this module's tests need the same answer: a review
 * screen whose save path builds a different payload from the one on screen is a screen
 * that lies.
 */
export function buildImportPayload({
	section,
	source,
	overrides,
	removed,
	sectionIndex,
}: {
	section: ExtractedSection;
	source: ImportOk["source"];
	overrides: Record<string, string>;
	removed: Record<string, true>;
	sectionIndex: number;
}) {
	const edited: ExtractedSection = {
		...section,
		fields: applyOverrides(section.fields, sectionIndex, overrides, removed),
		bullets: section.bullets
			.map((bullet, index) =>
				editOrDrop(
					bullet,
					overrides,
					removed,
					fieldKey(sectionIndex, `bullet.${index}`),
				),
			)
			.filter((b): b is ExtractedField => b !== null),
		entries: section.entries.map((entry, entryIndex) => ({
			fields: applyOverrides(
				entry.fields,
				sectionIndex,
				overrides,
				removed,
				`entry.${entryIndex}.`,
			),
			bullets: entry.bullets
				.map((bullet, index) =>
					editOrDrop(
						bullet,
						overrides,
						removed,
						fieldKey(sectionIndex, `entry.${entryIndex}.bullet.${index}`),
					),
				)
				.filter((b): b is ExtractedField => b !== null),
		})),
	};

	return toLibraryPayload(edited, {
		source: source.kind,
		sourceName: source.fileName,
		importedAt: new Date().toISOString(),
		headingConfidence: section.confidence,
	});
}

interface ConfidenceRowProps {
	name: string;
	field: ExtractedField;
	value: string;
	onChange?: (next: string) => void;
	onRemove?: () => void;
}

function ConfidenceRow({
	name,
	field,
	value,
	onChange,
	onRemove,
}: ConfidenceRowProps) {
	const low = confidenceIsLow(field);
	const reasonId = `${name.replace(/\W+/g, "-").toLowerCase()}-reason`;

	return (
		/*
		  The visual difference is load-bearing and deliberately not subtle. A dashed
		  amber rule, a different badge and a stated reason together mean the row cannot
		  read as "extracted" at a glance even for someone who has never been told what
		  the threshold is. `data-confidence` carries the same fact for tests and for
		  anyone inspecting the DOM.
		*/
		<li
			className={
				low
					? "space-y-1 rounded-md border border-amber-500/70 border-dashed bg-amber-500/5 p-2 pl-3"
					: "space-y-1 rounded-md border p-2 pl-3"
			}
			data-confidence={low ? "low" : "high"}
			data-field-name={name}
		>
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-medium text-muted-foreground text-xs">
					{name}
				</span>
				{low ? (
					<Badge variant="secondary">
						<AlertTriangle aria-hidden className="mr-1 size-3" />
						Needs checking
					</Badge>
				) : (
					<Badge variant="outline">
						<CheckCircle2 aria-hidden className="mr-1 size-3" />
						Extracted
					</Badge>
				)}
			</div>
			{onChange ? (
				<Input
					aria-describedby={reasonId}
					aria-label={`${name}${low ? " (needs checking)" : ""}`}
					onChange={(event) => onChange(event.target.value)}
					value={value}
				/>
			) : (
				<p className="text-sm">{value}</p>
			)}
			<p
				className={
					low
						? "text-amber-700 text-xs dark:text-amber-400"
						: "text-muted-foreground text-xs"
				}
				id={reasonId}
			>
				{low ? "Guessed: " : ""}
				{field.reason}
			</p>
			{onRemove ? (
				<Button onClick={onRemove} size="sm" type="button" variant="ghost">
					Remove
				</Button>
			) : null}
		</li>
	);
}

export interface ImportReviewViewProps {
	source: ImportOk["source"];
	result: ImportResult;
	/** `${sectionIndex}::${path}` -> the value the user has typed. */
	overrides: Record<string, string>;
	/** Paths the user has emptied, so the value is dropped rather than stored blank. */
	removed: Record<string, true>;
	onFieldChange?: (key: string, value: string) => void;
	onFieldRemove?: (key: string) => void;
	/** Per-section add-to-library state. */
	added: Record<number, "pending" | "added" | "error">;
	onAddToLibrary?: (sectionIndex: number) => void;
	error?: string;
}

/**
 * The review surface.
 *
 * Split from the container so it can be rendered on its own -- which is what lets a test
 * assert on the markup a user actually sees instead of on a state object.
 */
export function ImportReviewView({
	source,
	result,
	overrides,
	removed,
	onFieldChange,
	onFieldRemove,
	added,
	onAddToLibrary,
	error,
}: ImportReviewViewProps) {
	const fields = useMemo(() => reviewFieldsFor(result), [result]);
	const lowCount = countLowConfidence(fields);
	const contactFields = Object.entries(result.contact);

	/** The value to show: the user's edit, or what the sectioner read. */
	const shown = (sectionIndex: number, path: string, original: string) => {
		const key = fieldKey(sectionIndex, path);
		if (removed[key]) return "";
		return overrides[key] ?? original;
	};

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<p className="font-medium text-sm">
					{source.fileName}
					<span className="ml-2 font-normal text-muted-foreground">
						{source.kind.toUpperCase()}
					</span>
				</p>
				{/*
				  The count is a count of fields, not a score. "3 of 18 need checking" is
				  actionable; "82% confidence" is not, and there is no path in this file
				  that produces one.
				*/}
				<p className="text-muted-foreground text-sm">
					Found {result.sections.length} section
					{result.sections.length === 1 ? "" : "s"} and{" "}
					{fields.length + contactFields.length} field
					{fields.length + contactFields.length === 1 ? "" : "s"}.{" "}
					{lowCount > 0 ? (
						<span className="font-medium text-amber-700 dark:text-amber-400">
							{lowCount} need
							{lowCount === 1 ? "s" : ""} checking — they were guessed, not
							read. Correct them or remove them.
						</span>
					) : (
						<span>Every field was read directly off the page.</span>
					)}
				</p>
				<p className="text-muted-foreground text-xs">
					Nothing has been saved yet. Sections you add go to your content
					library marked unreviewed. They do not appear in any resume until you
					choose to add them there.
				</p>
			</div>

			{source.notes.length > 0 ? (
				<ul className="space-y-1">
					{source.notes.map((note) => (
						<li
							className="text-muted-foreground text-xs"
							data-import-note=""
							key={note}
						>
							{note}
						</li>
					))}
				</ul>
			) : null}

			{result.warnings.length > 0 ? (
				<ul className="space-y-1">
					{result.warnings.map((warning) => (
						<li
							className="text-amber-700 text-xs dark:text-amber-400"
							data-import-warning=""
							key={warning}
						>
							{warning}
						</li>
					))}
				</ul>
			) : null}

			{error ? (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			) : null}

			{contactFields.length > 0 ? (
				<section>
					<h3 className="mb-2 font-medium text-sm">Header details</h3>
					<ul className="space-y-2">
						{contactFields.map(([name, field]) => (
							<ConfidenceRow
								field={field}
								key={name}
								name={name}
								value={field.value}
							/>
						))}
					</ul>
				</section>
			) : null}

			{result.sections.map((section, index) => {
				const state = added[index];
				const rows = sectionFields(section);
				const sectionLow = rows.filter((r) => confidenceIsLow(r.field)).length;
				return (
					<section
						className="space-y-2"
						data-import-section={section.rawHeading}
						data-section-index={index}
						key={sectionKey(section, index)}
					>
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="font-medium text-sm">{section.title}</h3>
							{section.confidence < REVIEW_THRESHOLD ? (
								<Badge variant="secondary">
									<AlertTriangle aria-hidden className="mr-1 size-3" />
									Heading needs checking
								</Badge>
							) : (
								<Badge variant="outline">
									<CheckCircle2 aria-hidden className="mr-1 size-3" />
									Heading read
								</Badge>
							)}
							{sectionLow > 0 ? (
								<span className="text-amber-700 text-xs dark:text-amber-400">
									{sectionLow} field{sectionLow === 1 ? "" : "s"} guessed
								</span>
							) : null}
						</div>

						{rows.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Nothing recognisable in this section. Its text is kept with the
								item so nothing is lost.
							</p>
						) : (
							<ul className="space-y-2">
								{rows.map((row) => {
									const key = fieldKey(index, row.path);
									return (
										<ConfidenceRow
											field={row.field}
											key={key}
											name={row.name}
											onChange={
												onFieldChange
													? (next) => onFieldChange(key, next)
													: undefined
											}
											onRemove={
												onFieldRemove ? () => onFieldRemove(key) : undefined
											}
											value={shown(index, row.path, row.field.value)}
										/>
									);
								})}
							</ul>
						)}

						{/*
						  The source text is always available. It is the check on every
						  value above: if the screen disagrees with the file, the file wins.
						*/}
						<details>
							<summary className="cursor-pointer text-muted-foreground text-xs">
								Source text for this section
							</summary>
							<Textarea
								className="mt-2 font-mono text-xs"
								onChange={() => {}}
								readOnly
								rows={6}
								value={section.raw}
							/>
						</details>

						<div className="flex items-center gap-2">
							<Button
								disabled={
									state === "pending" || state === "added" || !onAddToLibrary
								}
								onClick={() => onAddToLibrary?.(index)}
								size="sm"
								variant="outline"
							>
								{state === "pending" ? (
									<Loader2 aria-hidden className="animate-spin" />
								) : null}
								{state === "added"
									? "Added to library"
									: state === "error"
										? "Try again"
										: "Add to library"}
							</Button>
							<p className="text-muted-foreground text-xs">
								{state === "added"
									? "Saved as unreviewed. Still not in any resume."
									: "Adds this section to your library only."}
							</p>
						</div>

						{/*
						  `data-import-target` is the reachability claim this screen makes,
						  stated in the markup so it can be asserted rather than described:
						  an import writes to the content library and nowhere else. If a
						  future change points this at a resume, the assertion fails.
						*/}
						<p
							className="text-muted-foreground text-xs"
							data-import-target="content-library"
						>
							Will be saved to your library as unreviewed.
						</p>
					</section>
				);
			})}
		</div>
	);
}

/** Apply overrides to one flat field record, dropping emptied fields. */
function applyOverrides(
	fields: Record<string, ExtractedField>,
	sectionIndex: number,
	overrides: Record<string, string>,
	removed: Record<string, true>,
	prefix = "",
): Record<string, ExtractedField> {
	const out: Record<string, ExtractedField> = {};
	for (const [name, field] of Object.entries(fields)) {
		const edited = editOrDrop(
			field,
			overrides,
			removed,
			fieldKey(sectionIndex, `${prefix}${name}`),
		);
		if (edited) out[name] = edited;
	}
	return out;
}

/**
 * The user's edit to a field, or null when they emptied it.
 *
 * Emptying deletes. Storing `""` would put a blank company or a blank date into a
 * resume where it reads as something the user wrote, and the review step exists
 * precisely so that never happens silently.
 */
function editOrDrop(
	field: ExtractedField,
	overrides: Record<string, string>,
	removed: Record<string, true>,
	key: string,
): ExtractedField | null {
	if (removed[key]) return null;
	const next = overrides[key];
	if (next === undefined) return field;
	if (next.trim().length === 0) return null;
	return {
		value: next.trim(),
		// An edited value is not what the extractor read any more. Recording it at the
		// user's own confidence is what stops a correction showing up as an unverified
		// guess forever.
		confidence: 1,
		reason: "Edited by you during review",
	};
}
