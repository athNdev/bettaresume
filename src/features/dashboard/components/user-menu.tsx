"use client";

import { useClerk } from "@clerk/clerk-react";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store";

/**
 * User Menu
 *
 * Displays user info with dropdown menu for actions.
 * Uses Clerk for sign-out functionality.
 */
export function UserMenu() {
	const { user } = useAuthStore();
	const { signOut } = useClerk();

	if (!user) return null;

	const handleSignOut = () => {
		// Sign out from Clerk - this will trigger auth state sync
		signOut();
	};

	return (
		<div className="flex items-center gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button className="relative h-9 w-9 rounded-full" variant="ghost">
						<Avatar className="h-9 w-9">
							<AvatarFallback className="bg-primary/10">
								{user.name?.[0]?.toUpperCase() ||
									user.email?.[0]?.toUpperCase() ||
									"?"}
							</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuLabel className="font-normal">
						<div className="flex flex-col space-y-1">
							<p className="font-medium text-sm">{user.name || "User"}</p>
							<p className="truncate text-muted-foreground text-xs">
								{user.email}
							</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<User className="mr-2 h-4 w-4" />
						Profile
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Settings className="mr-2 h-4 w-4" />
						Settings
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleSignOut}>
						<LogOut className="mr-2 h-4 w-4" />
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
