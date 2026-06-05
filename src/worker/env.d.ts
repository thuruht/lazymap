interface Env {
	lazymap: D1Database;
	justlazy: R2Bucket;
	searchlazy: R2Bucket;
	lazymapbot: Ai;
	lazymaplookk: VectorizeIndex;
	lazydyn: DispatchNamespace;
	lazylimit: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
}
