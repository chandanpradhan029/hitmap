// src/Sidebar.jsx
import React from "react";

export default function Sidebar({ statsByBlock }) {
  return (
    <div className="sidebar">
      <h3 className="sidebar-title">Blocks Summary</h3>

      <ul className="sidebar-list">
        {statsByBlock.map((b) => (
          <li key={b.key} className="sidebar-item">
            <span className="block-name">{b.label}</span>
            <span className="block-count">{b.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
