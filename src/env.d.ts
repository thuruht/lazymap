interface Env {
	DB: D1Database;
	laZr2: R2Bucket;
	searchlazy: R2Bucket;
	laZai: Ai;
	laZains: any;
	laZrl: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
	laZem: any;
	ENVIRONMENT: string;
	APP_URL: string;
	lazymedia: string;
	lazystream: string;
}
