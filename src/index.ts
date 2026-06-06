import { Hono } from "hono";

type Bindings = {
	laZd1: D1Database;
	laZr2: R2Bucket;
	searchlazy: R2Bucket;
	laZai: Ai;
	laZains: any; // AI Search Namespace
	laZem: any; // Email
	laZrl: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
	lazydyn: DispatchNamespace;
	ENVIRONMENT: string;
	APP_URL: string;
	lazymedia: string;
	lazystream: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Rate limiting middleware helper
async function checkRateLimit(c: any, key: string) {
	if (c.env.laZrl) {
		const { success } = await c.env.laZrl.limit({ key });
		if (!success) {
			return false;
		}
	}
	return true;
}

// Helper for geocoding via Nominatim
async function geocode(query: string) {
	if (!query || query.trim().length === 0) return null;
	if (query.includes(",")) {
		const [lat, lon] = query.split(",").map(s => parseFloat(s.trim()));
		if (!isNaN(lat) && !isNaN(lon)) {
			return { lat, lon, name: "Current Location" };
		}
	}
	const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": "lazymap.us (lazy-agent)" }
		});
		const data = await res.json() as any[];
		if (data && data.length > 0) {
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

// Helper for OSRM routing with mode support
async function getOSRMRoute(start: [number, number], end: [number, number], mode: string = "driving") {
	let profile = "driving";
	if (mode === "walking") profile = "foot";
	if (mode === "biking") profile = "bicycle";
	// OSRM doesn't support transit natively in the demo instance, fallback to driving
	const url = `https://router.project-osrm.org/route/v1/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
	try {
		const res = await fetch(url);
		const data = await res.json() as any;
		return data;
	} catch (e) {
		console.error("OSRM error", e);
		return null;
	}
}

// Mocked Sponsored "Lazy Stops"
function getSponsoredStops(route: [number, number][]) {
	if (!route || route.length < 10) return [];
	const mid1 = route[Math.floor(route.length * 0.3)];
	const mid2 = route[Math.floor(route.length * 0.7)];
	return [
		{ type: "Coffee", name: "Sponsored: Lazy Brews", position: mid1, link: "https://example.com/coffee" },
		{ type: "Food", name: "Sponsored: Quick Bites", position: mid2, link: "https://example.com/food" }
	];
}

// Lazy Scoring Heuristic and Statistics extraction
function extractRouteInfo(osrmData: any, mode: string) {
	if (!osrmData || !osrmData.routes || osrmData.routes.length === 0) return null;
	const route = osrmData.routes[0];
	const distance = route.distance; // in meters
	const duration = route.duration; // in seconds
	const steps = route.legs[0].steps;

	const turnSteps = steps.filter((s: any) => s.maneuver.type === "turn" || s.maneuver.type === "new name");
	const turnCount = turnSteps.length;

	const highways = steps.filter((s: any) => s.name && (s.name.includes("US-") || s.name.includes("I-") || s.distance > 1000));
	const longStretchMiles = highways.reduce((acc: number, s: any) => acc + s.distance, 0);

	const turnPenalty = turnCount * (mode === "driving" ? 500 : 100);
	const stretchBonus = (longStretchMiles / distance) * 100;

	let score = 100 - (turnPenalty / distance * 100) + stretchBonus;
	if (mode === "walking") score -= 10;

	const lazyScore = Math.min(100, Math.max(0, Math.round(score)));

	const directions = steps.map((s: any) => ({
		instruction: s.maneuver.instruction,
		name: s.name || "Unknown Road",
		distance: s.distance
	}));

	return {
		lazyScore,
		turnCount,
		distance: Math.round(distance / 1609.34 * 10) / 10, // miles
		duration: Math.round(duration / 60), // minutes
		directions
	};
}

app.post("/api/route", async (c) => {
	const ip = c.req.header("cf-connecting-ip") || "anonymous";
	if (!(await checkRateLimit(c, `route-${ip}`))) {
		return c.json({ error: "Too many requests" }, 429);
	}

	const { start, end, mode = "driving" } = await c.req.json();

	const startLoc = await geocode(start);
	const endLoc = await geocode(end);

	if (!startLoc || !endLoc) {
		return c.json({ error: "One or more locations could not be found." }, 404);
	}

	const osrmData = await getOSRMRoute([startLoc.lat, startLoc.lon], [endLoc.lat, endLoc.lon], mode);
	if (!osrmData || !osrmData.routes || osrmData.routes.length === 0) {
		return c.json({ error: "No route found between these locations." }, 404);
	}

	const routeCoordinates = osrmData.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]) as [number, number][];
	const info = extractRouteInfo(osrmData, mode);
	if (!info) return c.json({ error: "Failed to process route info" }, 500);

	const sponsoredStops = getSponsoredStops(routeCoordinates);

	let narrative = "Just keep going, don't overthink it.";
	try {
		const aiResponse = await c.env.laZai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
			messages: [
				{ role: "system", content: `You are a lazy traveler who hates effort. You are currently ${mode}. Describe this route in a few short sentences. Focus on why it is the low-effort path.` },
				{ role: "user", content: `Tell me about a ${mode} route from ${startLoc.name} to ${endLoc.name} with a lazy score of ${info.lazyScore} out of 100.` }
			]
		}) as any;
		if (aiResponse && aiResponse.response) {
			narrative = aiResponse.response;
		}
	} catch (e) {
		console.error("AI error", e);
	}

	return c.json({
		route: routeCoordinates,
		...info,
		sponsoredStops,
		narrative,
		mode
	});
});

app.get("/api/search", async (c) => {
	const ip = c.req.header("cf-connecting-ip") || "anonymous";
	if (!(await checkRateLimit(c, `search-${ip}`))) {
		return c.json({ error: "Too many requests" }, 429);
	}

	const query = c.req.query("q");
	if (!query) return c.json({ results: [] });

	try {
		// Using AI Search Namespace binding
		const instance = c.env.laZains.get("lazymap");
		const results = await instance.search({
			messages: [{ role: "user", content: query }]
		});

		if (!results || !results.results || results.results.length === 0) {
			const loc = await geocode(query);
			return c.json({ results: loc ? [loc] : [] });
		}

		return c.json({ results: results.results });
	} catch (e) {
		const loc = await geocode(query);
		return c.json({ results: loc ? [loc] : [] });
	}
});

export default app;
