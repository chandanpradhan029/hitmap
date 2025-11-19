// src/App.jsx
import React, { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { complaints } from "./data";
import blocksGeoJson from "./dhenkanal_blocks.json";
import "./App.css";

// thresholds for severity colors
const thresholds = {
  lowMax: 3, // 0–3 => green
  mediumMax: 5, // 4–5 => orange
};

function getSeverity(count) {
  if (count <= thresholds.lowMax) return "low";
  if (count <= thresholds.mediumMax) return "medium";
  return "high";
}

// property in your GeoJSON that holds block name
const BLOCK_NAME_PROP = "block_name";

// helper: make names comparable
function normalizeBlockName(name) {
  return (name || "").trim().toLowerCase();
}

const severityColor = {
  low: "#22c55e",
  medium: "#f97316",
  high: "#ef4444",
};

function App() {
  // we store the normalized key (not the label) in state
  const [selectedBlockKey, setSelectedBlockKey] = useState(null);

  /**
   * Build stats for all blocks.
   * - Start from complaints
   * - Ensure every GeoJSON block exists (even if it has 0 complaints)
   */
  const statsByBlock = useMemo(() => {
    const map = new Map(); // key: normalized name

    // 1) from complaints
    for (const c of complaints) {
      const key = normalizeBlockName(c.block);
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          key,               // normalized
          label: c.block,    // human label (from data or later from GeoJSON)
          total: 0,
          complaints: [],
        });
      }
      const entry = map.get(key);
      entry.total += 1;
      entry.complaints.push(c);
    }

    // 2) from GeoJSON blocks (ensure every polygon shows up)
    const features = blocksGeoJson?.features || [];
    features.forEach((f) => {
      const rawName = f.properties?.[BLOCK_NAME_PROP];
      const key = normalizeBlockName(rawName);
      if (!key) return;

      if (!map.has(key)) {
        // block exists on map but has no complaints yet
        map.set(key, {
          key,
          label: rawName || "Unknown block",
          total: 0,
          complaints: [],
        });
      } else {
        // prefer the GeoJSON name as label if present
        const entry = map.get(key);
        if (rawName) entry.label = rawName;
      }
    });

    // sort: highest complaints first, then alphabetically
    return Array.from(map.values()).sort(
      (a, b) => b.total - a.total || a.label.localeCompare(b.label)
    );
  }, []);

  const totalComplaints = complaints.length;
  const totalBlocks = statsByBlock.length;

  // quick lookup map: key -> stats
  const statsMap = useMemo(() => {
    const m = {};
    statsByBlock.forEach((b) => {
      m[b.key] = b;
    });
    return m;
  }, [statsByBlock]);

  const selected = selectedBlockKey ? statsMap[selectedBlockKey] || null : null;

  // center map around average complaint location
  const mapCenter = useMemo(() => {
    if (!complaints.length) return [20.65, 85.6];
    const sum = complaints.reduce(
      (acc, c) => {
        acc.lat += c.lat;
        acc.lng += c.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return [sum.lat / complaints.length, sum.lng / complaints.length];
  }, []);

  // styler for each polygon
  const styleFeature = (feature) => {
    const rawName = feature.properties?.[BLOCK_NAME_PROP] || "";
    const key = normalizeBlockName(rawName);
    const stat = statsMap[key];
    const total = stat?.total || 0;
    const severity = getSeverity(total);
    const fill = severityColor[severity];

    if (!stat) {
      console.warn(
        "[Map] GeoJSON block has no stats (no complaints & not found by name):",
        rawName
      );
    }

    return {
      color: "#0000ff", // blue outline
      weight: 2,
      fillColor: fill,
      fillOpacity: 0.6,
    };
  };

  // click + tooltip handler per polygon
  const onEachFeature = (feature, layer) => {
    const rawName = feature.properties?.[BLOCK_NAME_PROP] || "";
    const key = normalizeBlockName(rawName);
    const stat = statsMap[key];
    const total = stat?.total || 0;
    const label = stat?.label || rawName || "Unknown block";

    layer.on("click", () => {
      console.log("Clicked block:", {
        rawName,
        normalizedKey: key,
        total,
      });
      setSelectedBlockKey(key);
    });

    layer.bindTooltip(
      `${label} – ${total} complaint${total === 1 ? "" : "s"}`,
      { sticky: true }
    );
  };

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <h1 className="title">
          Dhenkanal District
          <br />
          Grievance Dashboard
        </h1>

        <div className="stat-card">
          <div className="stat-label">Total Complaints</div>
          <div className="stat-value">{totalComplaints}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Blocks</div>
          <div className="stat-value">{totalBlocks}</div>
        </div>

        <h2 className="section-heading">Complaints by Block</h2>
        <div className="block-list">
          {statsByBlock.map((b) => (
            <button
              key={b.key}
              className={`block-pill ${getSeverity(b.total)}`}
              onClick={() => setSelectedBlockKey(b.key)}
            >
              <span>{b.label}</span>
              <span className="pill-count">{b.total}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main">
        <header className="main-header">
          <div>
            <h2>Dhenkanal - Interactive Grievance Map</h2>
            <p>Click any block to view detailed complaints.</p>
          </div>

          <div className="legend">
            <span className="legend-item">
              <span className="legend-dot low" /> Low (≤ 3)
            </span>
            <span className="legend-item">
              <span className="legend-dot medium" /> Medium (4 – 5)
            </span>
            <span className="legend-item">
              <span className="legend-dot high" /> High (6+)
            </span>
          </div>
        </header>

        <section className="map-container">
          <div className="district-map-wrapper">
            <MapContainer
              center={mapCenter}
              zoom={9}
              scrollWheelZoom={true}
              className="leaflet-map"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Block polygons from GeoJSON */}
              <GeoJSON
                data={blocksGeoJson}
                style={styleFeature}
                onEachFeature={onEachFeature}
              />

    
            </MapContainer>
          </div>
        </section>
      </main>

      {/* BLOCK DETAILS MODAL */}
      {selected && (
        <BlockDetailsModal
          block={selected.label}
          total={selected.total}
          complaints={selected.complaints}
          onClose={() => setSelectedBlockKey(null)}
        />
      )}
    </div>
  );
}

function BlockDetailsModal({ block, total, complaints, onClose }) {
  const hasComplaints = complaints && complaints.length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h3>{block} Block – Complaint Details</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="modal-stats-row">
          <div className="mini-card total">
            <div className="mini-label">Total Complaints</div>
            <div className="mini-value">{total}</div>
          </div>
        </div>

        <h4 className="section-heading">Recent Complaints</h4>

        {!hasComplaints && (
          <p style={{ fontSize: "13px", color: "#6b7280", marginTop: 4 }}>
            No complaints recorded for this block yet.
          </p>
        )}

        {hasComplaints && (
          <div className="complaint-list">
            {complaints.map((c) => (
              <div key={c.id} className="complaint-card">
                <div className="complaint-header">
                  <span className="complaint-id">
                    CMP-{String(c.id).padStart(3, "0")}
                  </span>
                  <span className="status-badge">Reported</span>
                </div>
                <div className="complaint-body">
                  <div>
                    <span className="complaint-label">Issue:</span>{" "}
                    {c.grievance}
                  </div>
                  <div>
                    <span className="complaint-label">Lat:</span>{" "}
                    {c.lat.toFixed(6)}
                  </div>
                  <div>
                    <span className="complaint-label">Lng:</span>{" "}
                    {c.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
