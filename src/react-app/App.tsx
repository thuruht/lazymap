import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, Polyline, Popup } from "react-leaflet";
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
    map.invalidateSize();
  }, [center, route, map]);
  return null;
}

interface RouteDirection {
  instruction: string;
  name: string;
  distance: number;
}

interface SponsoredStop {
  type: string;
  name: string;
  position: [number, number];
  link: string;
}

interface RouteData {
  route: [number, number][];
  lazyScore: number;
  turnCount: number;
  distance: number;
  duration: number;
  directions: RouteDirection[];
  sponsoredStops: SponsoredStop[];
  narrative: string;
  mode: string;
}

function App() {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [mode, setMode] = useState("driving");
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [mapCenter] = useState<[number, number]>([39.8283, -98.5795]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStartQuery(`${position.coords.latitude}, ${position.coords.longitude}`);
        },
        () => {}
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!startQuery || !endQuery) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startQuery, end: endQuery, mode })
      });
      const data = await response.json();
      if (response.ok) setRouteData(data);
      else setError(data.error);
    } catch {
      setError("Failed to fetch route.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="sidebar">
        <header>
          <h1>lazymap.us</h1>
          <div className="tagline">Minimal effort navigation</div>
        </header>

        <section className="search-section">
          <div className="mode-tabs">
            {["driving", "walking", "biking", "transit"].map(m => (
              <button key={m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>
                {m[0].toUpperCase()}
              </button>
            ))}
          </div>
          <div className="inputs">
            <input placeholder="Start..." value={startQuery} onChange={e => setStartQuery(e.target.value)} />
            <input placeholder="Destination..." value={endQuery} onChange={e => setEndQuery(e.target.value)} />
            <button onClick={handleSearch} disabled={loading} className="go-btn">
              {loading ? "..." : "GO"}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </section>

        {routeData && (
          <div className="route-details">
            <div className="stats">
              <div className="stat"><span>{routeData.lazyScore}%</span><label>Lazy</label></div>
              <div className="stat"><span>{routeData.turnCount}</span><label>Turns</label></div>
              <div className="stat"><span>{routeData.distance}m</span><label>Dist</label></div>
            </div>

            <div className="narrative-box">
              {routeData.narrative}
            </div>

            <div className="directions">
              <h3>Directions</h3>
              {routeData.directions.map((d, i) => (
                <div key={i} className="dir-step">
                  {d.instruction} {d.name && <strong>{d.name}</strong>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="map-container">
        <MapContainer center={mapCenter} zoom={4} zoomControl={false} style={{ height: "100vh", width: "100%" }}>
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater center={mapCenter} route={routeData?.route || []} />
          {routeData && (
            <>
              <Polyline positions={routeData.route} color="#00d4ff" weight={4} opacity={0.8} />
              <Marker position={routeData.route[0]} />
              <Marker position={routeData.route[routeData.route.length - 1]} />
              {routeData.sponsoredStops.map((stop, i) => (
                <Marker key={i} position={stop.position}>
                  <Popup><strong>{stop.name}</strong></Popup>
                </Marker>
              ))}
            </>
          )}
        </MapContainer>
      </div>

      <div className="fireflies">
        {[...Array(10)].map((_, i) => <div key={i} className="firefly"></div>)}
      </div>
    </div>
  );
}

export default App;
