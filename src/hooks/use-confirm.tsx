"use client";

import { create } from "zustand";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmState {
	isOpen: boolean;
	title: string;
	description: string;
	onConfirm: () => void;
	onCancel?: () => void;
}

interface ConfirmStore extends ConfirmState {
	confirm: (title: string, description: string) => Promise<boolean>;
	close: () => void;
}

const useConfirmStore = create<ConfirmStore>((set) => ({
	isOpen: false,
	title: "",
	description: "",
	onConfirm: () => {},
	onCancel: undefined,
	confirm: (title: string, description: string) => {
		return new Promise<boolean>((resolve) => {
			set({
				isOpen: true,
				title,
				description,
				onConfirm: () => {
					resolve(true);
					set({ isOpen: false });
				},
				onCancel: () => {
					resolve(false);
					set({ isOpen: false });
				},
			});
		});
	},
	close: () => set({ isOpen: false }),
}));

export function useConfirm() {
	const confirm = useConfirmStore((state) => state.confirm);
	return confirm;
}

export function ConfirmDialog() {
	const { isOpen, title, description, onConfirm, onCancel, close } =
		useConfirmStore();

	return (
		<AlertDialog onOpenChange={(open) => !open && close()} open={isOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel || close}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
