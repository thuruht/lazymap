import { useState, useEffect, useRef } from "react";
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

const AdBanner4x1 = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.cfasync = "false";
      script.src = "https://pl29649217.effectivecpmnetwork.com/16ec00aafb5a287a676e848be9bca123/invoke.js";
      ref.current.appendChild(script);
    }
  }, []);
  return <div ref={ref} id="container-16ec00aafb5a287a676e848be9bca123" className="sponsored-tag"></div>;
};

const AdBanner160x300 = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      const scriptConfig = document.createElement("script");
      scriptConfig.innerHTML = `
        atOptions = {
          'key' : '3307bd28ad7d8b2710e1da6b875192c1',
          'format' : 'iframe',
          'height' : 300,
          'width' : 160,
          'params' : {}
        };`;
      const scriptSrc = document.createElement("script");
      scriptSrc.src = "https://www.highperformanceformat.com/3307bd28ad7d8b2710e1da6b875192c1/invoke.js";
      ref.current.appendChild(scriptConfig);
      ref.current.appendChild(scriptSrc);
    }
  }, []);
  return <div ref={ref} className="ad-160x300 sponsored-tag"></div>;
};

const AdBanner300x250 = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      const scriptConfig = document.createElement("script");
      scriptConfig.innerHTML = `
        atOptions = {
          'key' : '8ced9507792f54b04782805656dcb8a7',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };`;
      const scriptSrc = document.createElement("script");
      scriptSrc.src = "https://www.highperformanceformat.com/8ced9507792f54b04782805656dcb8a7/invoke.js";
      ref.current.appendChild(scriptConfig);
      ref.current.appendChild(scriptSrc);
    }
  }, []);
  return <div ref={ref} className="ad-300x250 sponsored-tag"></div>;
};

function App() {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [mode, setMode] = useState("driving");
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [mapCenter] = useState<[number, number]>([39.8283, -98.5795]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setStartQuery(`${position.coords.latitude}, ${position.coords.longitude}`);
      });
    }
  }, []);

  const handleSearch = async () => {
    if (!startQuery || !endQuery) return;
    setLoading(true);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startQuery, end: endQuery, mode })
      });
      const data = await response.json();
      if (data.route) {
        setRouteData(data);
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
        const destination = data.results[0].name || "Somewhere Lazy";
        setEndQuery(destination);
        const start = startQuery || "My current location";
        const res2 = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start, end: destination, mode })
        });
        const data2 = await res2.json();
        if (data2.route) {
          setRouteData(data2);
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
      <div className="top-ad-bar">
        <AdBanner4x1 />
      </div>

      <header>
        <h1>lazymap.us</h1>
      </header>

      <div className="search-panel glass">
        <div className="mode-selector">
          {["driving", "walking", "biking", "transit"].map((m) => (
            <button
              key={m}
              className={mode === m ? "active" : ""}
              onClick={() => setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="input-group">
          <input
            type="text"
            placeholder="Starting point..."
            value={startQuery}
            onChange={(e) => setStartQuery(e.target.value)}
          />
          <input
            type="text"
            placeholder="Where to?"
            value={endQuery}
            onChange={(e) => setEndQuery(e.target.value)}
          />
        </div>
        <div className="button-group">
          <button onClick={handleSearch} disabled={loading} className="main-search">
            {loading ? "Cruising..." : "Find the Lazy Way"}
          </button>
          <button onClick={handleSemanticSearch} disabled={loading} className="lazy-search">
            ✨ I'm feeling lazy
          </button>
        </div>
      </div>

      <div className="main-layout">
        <div className="content-left">
          <div className="map-wrapper glass">
            <MapContainer center={mapCenter} zoom={4} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MapUpdater center={mapCenter} route={routeData?.route || []} />
              {routeData && (
                <>
                  <Polyline positions={routeData.route} color="#3498db" weight={5} opacity={0.7} />
                  <Marker position={routeData.route[0]} />
                  <Marker position={routeData.route[routeData.route.length - 1]} />
                  {routeData.sponsoredStops.map((stop, i) => (
                    <Marker key={i} position={stop.position}>
                      <Popup>
                        <div className="sponsored-popup">
                          <strong>{stop.name}</strong>
                          <p>Need a lazy break?</p>
                          <a href={stop.link} target="_blank" rel="noreferrer">Visit →</a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>
              )}
            </MapContainer>
          </div>

          {routeData && (
            <div className="info-panel glass">
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Lazy Score</span>
                  <div className="meter-bar">
                    <div className="meter-fill" style={{ width: `${routeData.lazyScore}%` }}></div>
                  </div>
                  <span className="stat-value">{routeData.lazyScore}%</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Turns</span>
                  <span className="stat-value">{routeData.turnCount}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Distance</span>
                  <span className="stat-value">{routeData.distance} mi</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">{routeData.duration} min</span>
                </div>
              </div>

              <div className="narrative">
                <p>"{routeData.narrative}"</p>
              </div>

              <div className="lazy-ad-banner glass">
                <p>The Ultimate Shortcut</p>
                <a href="https://www.effectivecpmnetwork.com/xqswie92h2?key=1073ee6ec1c94b2b99bd7830cbed5778" target="_blank" rel="noreferrer">Skip the effort →</a>
              </div>

              <div className="directions-panel">
                <h3>Lazy Directions</h3>
                <ul className="directions-list">
                  {routeData.directions.map((dir, i) => (
                    <li key={i} className="direction-item">
                      <span className="instruction">{dir.instruction}</span>
                      {dir.name && <span className="road-name"> onto {dir.name}</span>}
                      <span className="distance"> ({Math.round(dir.distance / 160.9) / 10} mi)</span>
                    </li>
                  ))}
                </ul>
              </div>

              <AdBanner300x250 />
            </div>
          )}
        </div>

        <div className="content-right discovery">
          <div className="discovery-header">Discovery</div>
          <AdBanner160x300 />
          <div className="discovery-hint">Sponsored spots for your lazy journey.</div>
        </div>
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
