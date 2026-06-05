import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// Fix for default marker icons in Leaflet with React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center, route }: { center: [number, number], route: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, 4);
    }
  }, [center, route, map]);
  return null;
}

function App() {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [route, setRoute] = useState<[number, number][]>([]);
  const [mapCenter] = useState<[number, number]>([39.8283, -98.5795]); // Center of US
  const [lazyScore, setLazyScore] = useState<number | null>(null);
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!startQuery || !endQuery) return;
    setLoading(true);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startQuery, end: endQuery })
      });
      const data = await response.json();
      if (data.route) {
        setRoute(data.route);
        setLazyScore(data.score);
        setNarrative(data.narrative);
      }
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!endQuery) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(endQuery)}`);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setEndQuery(data.results[0].name || "Somewhere Lazy");
        // Trigger normal search with the new destination
        // Note: setting state is async, so we use the value directly
        const start = startQuery || "My current blues";
        const res2 = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start, end: data.results[0].name || data.results[0].id })
        });
        const data2 = await res2.json();
        if (data2.route) {
          setRoute(data2.route);
          setLazyScore(data2.score);
          setNarrative(data2.narrative);
        }
      }
    } catch (e) {
      console.error("Semantic search error", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container dark-americana">
      <header>
        <h1>lazymap.us</h1>
        <p className="subtitle">The Bluesy Way There.</p>
      </header>

      <div className="search-panel">
        <input
          type="text"
          placeholder="Where are you stuck?"
          value={startQuery}
          onChange={(e) => setStartQuery(e.target.value)}
        />
        <input
          type="text"
          placeholder="Where do you want to be lazy?"
          value={endQuery}
          onChange={(e) => setEndQuery(e.target.value)}
        />
        <div className="button-group">
          <button onClick={handleSearch} disabled={loading} className="main-search">
            {loading ? "Searching..." : "Find the Lazy Way"}
          </button>
          <button onClick={handleSemanticSearch} disabled={loading} className="lazy-search">
            ✨ I'm feeling lazy
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="map-wrapper">
          <MapContainer center={mapCenter} zoom={4} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapUpdater center={mapCenter} route={route} />
            {route.length > 0 && (
              <>
                <Polyline positions={route} color="#3498db" weight={5} opacity={0.7} />
                <Marker position={route[0]} />
                <Marker position={route[route.length - 1]} />
              </>
            )}
          </MapContainer>
        </div>

        {lazyScore !== null && (
          <div className="info-panel">
            <div className="lazy-meter">
              <h3>Lazy Score: {lazyScore}%</h3>
              <div className="meter-bar">
                <div className="meter-fill" style={{ width: `${lazyScore}%` }}></div>
              </div>
            </div>
            <div className="narrative">
              <p>"{narrative}"</p>
            </div>
          </div>
        )}
      </div>

      <div className="fireflies">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="firefly" style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${8 + Math.random() * 10}s, ${2 + Math.random() * 3}s`
          }}></div>
        ))}
      </div>
    </div>
  );
}

export default App;
