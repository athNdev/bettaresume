"use client";

import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormSaveBarProps {
	hasChanges: boolean;
	isSaving: boolean;
	onSave: () => void;
	onDiscard: () => void;
}

export function FormSaveBar({
	hasChanges,
	isSaving,
	onSave,
	onDiscard,
}: FormSaveBarProps) {
	if (!hasChanges) return null;

	return (
		<div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between border-b bg-accent/90 px-4 py-2 backdrop-blur">
			<span className="font-medium text-sm">Unsaved changes</span>
			<div className="flex items-center gap-2">
				<Button
					disabled={isSaving}
					onClick={onDiscard}
					size="sm"
					variant="ghost"
				>
					<X className="mr-1 h-4 w-4" />
					Discard
				</Button>
				<Button disabled={isSaving} onClick={onSave} size="sm">
					<Save className="mr-1 h-4 w-4" />
					{isSaving ? "Saving..." : "Save"}
				</Button>
			</div>
		</div>
	);
}
