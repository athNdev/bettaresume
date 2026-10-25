import { Specimen } from "@/components/design-system/primitives";
import { RULES } from "@/lib/design-system/contract";

/**
 * The numbered rules. Cite `DS-n` in review — this is the list the page is
 * asking to be reviewed against, and the list the tests enforce.
 */
export function RulesSection() {
	return (
		<Specimen
			note="Each rule names the test that fails when it is broken. A rule without an enforcer is a preference."
			title="The rules"
		>
			<ol className="flex flex-col">
				{RULES.map((rule) => (
					<li
						className="grid gap-2 border-b py-4 last:border-b-0 sm:grid-cols-[96px_1fr]"
						id={rule.id.toLowerCase()}
						key={rule.id}
					>
						<span className="br-label">{rule.id}</span>
						<div className="flex flex-col gap-1">
							<span className="font-semibold text-sm">{rule.title}</span>
							<span className="max-w-prose text-fg-muted text-sm leading-relaxed">
								{rule.statement}
							</span>
							<span className="font-mono text-fg-muted text-xs">
								Enforced by {rule.enforcedBy}
							</span>
						</div>
					</li>
				))}
			</ol>
		</Specimen>
	);
}
