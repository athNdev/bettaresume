/** @type {import("next").NextConfig} */
const config = {
	output: "export",
	images: { unoptimized: true },
	trailingSlash: true,
	typescript: {
		// Skip type-checking during build - api-server workspace causes issues
		// Type-checking is done separately via `npm run typecheck`
		ignoreBuildErrors: true,
	},
};

export default config;
