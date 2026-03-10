/**
 * Webpack `asset/source` loader turns .typ files into plain string exports.
 */
declare module "*.typ" {
	const source: string;
	export default source;
}
