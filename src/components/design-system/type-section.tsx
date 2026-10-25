import { Specimen, Subhead } from "@/components/design-system/primitives";
import { Kbd } from "@/components/ui/kbd";
import { TYPE_ROLES } from "@/lib/design-system/contract";

/**
 * Type as roles, not sizes.
 *
 * Hierarchy is built in this order: tone → weight → spacing → case/tracking.
 * A new size is a system change. The live specimens below are the roles
 * themselves; the point is that nine roles fit in seven sizes.
 */
export function TypeSection() {
	return (
		<>
			<Specimen
				note="One family (Inter). Each role is a size + weight + tracking + tone decision, not an ad-hoc class."
				title="The roles"
			>
				<div className="flex flex-col">
					{TYPE_ROLES.map((role) => (
						<div
							className="grid gap-2 border-b py-4 last:border-b-0 sm:grid-cols-[200px_1fr]"
							key={role.role}
						>
							<div className="flex flex-col gap-1">
								<span className="br-label">{role.role}</span>
								<span className="font-mono text-fg-muted text-xs">
									{role.spec} · {role.weight} · {role.tracking}
								</span>
								<span className="text-fg-muted text-xs">{role.use}</span>
							</div>
							<div className="min-w-0">
								<p className={role.className}>
									{role.role === "Kbd" ? (
										<span className="inline-flex items-center gap-2">
											<span>Press</span>
											<Kbd>⌘</Kbd>
											<Kbd>E</Kbd>
											<span>to export</span>
										</span>
									) : (
										"Machined toward the interview"
									)}
								</p>
							</div>
						</div>
					))}
				</div>
			</Specimen>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="Four weights, nothing else. 500 is not a default — it is a role for row titles and values."
					title="Weights"
				>
					<div className="flex flex-col gap-3">
						{[
							["400 · body", "font-normal"],
							["500 · body strong", "font-medium"],
							["600 · titles and labels", "font-semibold"],
							["700 · the first word", "font-bold"],
						].map(([label, weight]) => (
							<div
								className="flex items-baseline justify-between gap-4"
								key={label}
							>
								<span className="text-fg-muted text-xs">{label}</span>
								<span className={`text-lg ${weight}`}>Betta Resume</span>
							</div>
						))}
					</div>
				</Specimen>

				<Specimen
					note="Case and tracking do the work a second typeface would otherwise be hired for."
					title="Tracking & case"
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<span className="br-micro">micro · +0.04em uppercase</span>
							<span className="text-sm tracking-title">
								title · −0.01em on 16 and up
							</span>
							<span className="br-label">label · +0.02em</span>
						</div>
						<p className="text-fg-muted text-xs">
							Micro labels are the tool-chrome signal. They are never the only
							carrier of information — the count next to them is the
							information.
						</p>
					</div>
				</Specimen>
			</div>

			<Specimen
				note="The budget is per view, not per component. More than two sizes means the hierarchy is being drawn with the wrong tool."
				title="Two sizes per view"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="br-sunken-static flex flex-col gap-2 p-4">
						<span className="br-micro">Editor</span>
						<span className="font-semibold text-lg tracking-title">
							Harvard Application — MPhil
						</span>
						<span className="text-sm">
							MPhil Candidate · Applied Mathematics
						</span>
						<span className="br-label">Contact information</span>
					</div>
					<div className="br-sunken-static flex flex-col gap-2 p-4">
						<span className="br-micro">Dashboard</span>
						<span className="font-semibold text-xl tracking-title">
							Library
						</span>
						<span className="text-sm">4 resumes · updated today</span>
						<span className="br-label">Filter by template</span>
					</div>
				</div>
				<Subhead hint="Both views use two sizes plus the 12px label/meta layer — the difference is which two.">
					The rule
				</Subhead>
			</Specimen>

			<Specimen
				note="Marketing keeps its display scale but collapses body copy to one 16px step and captions to one 12px step."
				title="Marketing"
			>
				<div className="flex flex-col gap-2">
					<span className="font-bold text-2xl tracking-title">
						One master resume, tailored per role
					</span>
					<span className="max-w-prose text-base">
						Body copy is one size. The display scale carries the voice; the body
						does not need five steps that differ by 0.3px.
					</span>
					<span className="br-label">One caption step · 12px</span>
				</div>
			</Specimen>
		</>
	);
}
