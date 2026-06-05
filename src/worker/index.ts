import { Hono } from "hono";

type Bindings = {
	lazymap: D1Database;
	justlazy: R2Bucket;
	searchlazy: R2Bucket;
	lazymapbot: Ai;
	lazymaplookk: VectorizeIndex;
	lazydyn: DispatchNamespace;
	lazylimit: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper for geocoding via Nominatim
async function geocode(query: string) {
	const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": "lazymap.us (lazy-agent)" }
		});
		const data = await res.json() as any[];
		if (data.length > 0) {
			return {
				lat: parseFloat(data[0].lat),
				lon: parseFloat(data[0].lon),
				name: data[0].display_name
			};
		}
	} catch (e) {
		console.error("Geocoding error", e);
	}
	return null;
}

// Helper for OSRM routing
async function getOSRMRoute(start: [number, number], end: [number, number]) {
	const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
	const res = await fetch(url);
	const data = await res.json() as any;
	return data;
}

// Lazy Scoring Heuristic
function calculateLazyScore(osrmData: any) {
	const route = osrmData.routes[0];
	const distance = route.distance; // in meters
	const steps = route.legs[0].steps;

	// Penalize turns
	const turnCount = steps.filter((s: any) => s.maneuver.type === "turn" || s.maneuver.type === "new name").length;

	// Bonus for long stretches (US highways)
	const highways = steps.filter((s: any) => s.name.includes("US-") || s.name.includes("I-"));
	const highwayMiles = highways.reduce((acc: number, s: any) => acc + s.distance, 0);

	const turnPenalty = turnCount * 500; // 500 meters of "effort" per turn
	const highwayBonus = (highwayMiles / distance) * 100;

	// Score out of 100
	let score = 100 - (turnPenalty / distance * 100) + highwayBonus;
	return Math.min(100, Math.max(0, Math.round(score)));
}

app.post("/api/route", async (c) => {
	const { start, end } = await c.req.json();

	const startLoc = await geocode(start);
	const endLoc = await geocode(end);

	if (!startLoc || !endLoc) {
		return c.json({ error: "Location not found" }, 404);
	}

	const osrmData = await getOSRMRoute([startLoc.lat, startLoc.lon], [endLoc.lat, endLoc.lon]);
	if (!osrmData.routes || osrmData.routes.length === 0) {
		return c.json({ error: "Route not found" }, 404);
	}

	const route = osrmData.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
	const score = calculateLazyScore(osrmData);

	// AI Narrative
	let narrative = "Just keep driving, don't overthink it.";
	try {
		const aiResponse = await c.env.lazymapbot.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
			messages: [
				{ role: "system", content: "You are a lazy, bluesy traveler who hates turns and loves the open road. Describe this route in a few short sentences." },
				{ role: "user", content: `Tell me about a route from ${startLoc.name} to ${endLoc.name} with a lazy score of ${score} out of 100.` }
			]
		}) as any;
		if (aiResponse && aiResponse.response) {
			narrative = aiResponse.response;
		}
	} catch (e) {
		console.error("AI error", e);
	}

	return c.json({
		route,
		score,
		narrative
	});
});

app.get("/api/search", async (c) => {
	const query = c.req.query("q");
	if (!query) return c.json({ results: [] });

	// Semantic Search using Workers AI + Vectorize
	try {
		const embeddings = await c.env.lazymapbot.run("@cf/baai/bge-small-en-v1.5", {
			text: [query]
		}) as any;
		const vector = embeddings.data[0];

		const matches = await c.env.lazymaplookk.query(vector, { topK: 5 });
		// For now, if no matches, fallback to Nominatim
		if (matches.matches.length === 0) {
			const loc = await geocode(query);
			return c.json({ results: loc ? [loc] : [] });
		}

		return c.json({ results: matches.matches });
	} catch (e) {
		// Fallback to Nominatim if AI/Vectorize fails
		const loc = await geocode(query);
		return c.json({ results: loc ? [loc] : [] });
	}
});

export default app;
