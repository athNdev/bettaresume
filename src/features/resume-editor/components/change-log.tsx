"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	Copy,
	Download,
	Edit,
	FilePlus,
	FileText,
	GitBranch,
	Minus,
	Palette,
	Plus,
	RefreshCw,
	Settings,
	Trash2,
	Upload,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityLog } from "@/features/resume-editor/types";

interface ChangeLogProps {
	logs: ActivityLog[];
	maxItems?: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
	created: <FilePlus className="h-3.5 w-3.5" />,
	updated: <Edit className="h-3.5 w-3.5" />,
	deleted: <Trash2 className="h-3.5 w-3.5" />,
	exported: <Download className="h-3.5 w-3.5" />,
	imported: <Upload className="h-3.5 w-3.5" />,
	duplicated: <Copy className="h-3.5 w-3.5" />,
	variation_created: <GitBranch className="h-3.5 w-3.5" />,
	synced_with_base: <RefreshCw className="h-3.5 w-3.5" />,
	sync_conflicts_resolved: <AlertTriangle className="h-3.5 w-3.5" />,
	section_added: <Plus className="h-3.5 w-3.5" />,
	section_removed: <Minus className="h-3.5 w-3.5" />,
	template_changed: <Palette className="h-3.5 w-3.5" />,
	settings_changed: <Settings className="h-3.5 w-3.5" />,
	section_updated: <FileText className="h-3.5 w-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
	created: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
	updated: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
	deleted: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
	exported:
		"bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
	imported:
		"bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
	duplicated: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
	variation_created:
		"bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
	synced_with_base:
		"bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
	sync_conflicts_resolved:
		"bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
	section_added:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	section_removed:
		"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	template_changed:
		"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	settings_changed:
		"bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
	section_updated: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
};

export function ChangeLog({ logs, maxItems = 50 }: ChangeLogProps) {
	const sortedLogs = useMemo(
		() =>
			[...logs]
				.sort(
					(a, b) =>
						new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
				)
				.slice(0, maxItems),
		[logs, maxItems],
	);

	if (sortedLogs.length === 0) {
		return (
			<Card>
				<CardHeader className="px-4 py-3">
					<CardTitle className="text-sm">Activity Log</CardTitle>
				</CardHeader>
				<CardContent className="px-4 py-4">
					<p className="text-center text-muted-foreground text-sm">
						No activity yet
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="px-4 py-3">
				<CardTitle className="flex items-center justify-between text-sm">
					<span>Activity Log</span>
					<Badge className="text-xs" variant="secondary">
						{logs.length}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-75">
					<div className="space-y-1 p-2">
						{sortedLogs.map((log) => (
							<div
								className="flex items-start gap-3 rounded p-2 transition-colors hover:bg-muted/50"
								key={log.id}
							>
								<div
									className={`rounded p-1.5 ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}
								>
									{ACTION_ICONS[log.action] || <Edit className="h-3.5 w-3.5" />}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm">{log.description}</p>
									<p className="text-muted-foreground text-xs">
										{formatDistanceToNow(new Date(log.timestamp), {
											addSuffix: true,
										})}
									</p>
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
