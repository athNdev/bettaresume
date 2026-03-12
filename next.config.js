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
	// Turbopack config (Next.js 16 default bundler)
	// Load Typst source files (.typ) as raw strings.
	// WASM is fetched from CDN at runtime so no bundler WASM config is needed.
	turbopack: {
		rules: {
			"*.typ": {
				loaders: ["raw-loader"],
				as: "*.js",
			},
		},
	},
	webpack: (config) => {
		// Enable WASM support for Typst.ts
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
		};

		// Ensure WASM files are handled correctly
		config.module.rules.push({
			test: /\.wasm$/,
			type: "asset/resource",
		});

		// Load Typst source files (.typ) as raw strings
		config.module.rules.push({
			test: /\.typ$/,
			type: "asset/source",
		});

		return config;
	},
};

export default config;
