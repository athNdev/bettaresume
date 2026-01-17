/**
 * Authentication Types
 */

export interface User {
	id: string;
	email: string;
	name: string;
	picture: string | null;
	createdAt: string;
	emailVerified: boolean;
	preferences: UserPreferences;
}

export interface UserPreferences {
	theme: "light" | "dark" | "system";
	emailNotifications: boolean;
	autoSave: boolean;
	defaultTemplate: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
	rememberMe?: boolean;
}
