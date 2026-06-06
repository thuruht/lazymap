interface Env {
	laZd1: D1Database;
	laZr2: R2Bucket;
	searchlazy: R2Bucket;
	laZai: Ai;
	laZains: any; // AI Search
	laZkv: KVNamespace;
	laZrl: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
	laZem: any; // Email
	lazydyn: DispatchNamespace;
	ENVIRONMENT: string;
	APP_URL: string;
	lazymedia: string;
	lazystream: string;
}
