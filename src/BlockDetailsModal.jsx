// src/BlockDetailsModal.jsx
import React from "react";

export default function BlockDetailsModal({
  block,
  total,
  complaints,
  onClose,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{block} – Complaints ({total})</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          {complaints.length === 0 && <p>No complaints.</p>}

          {complaints.map((c, i) => (
            <div className="complaint" key={i}>
              <p><strong>Category:</strong> {c.category}</p>
              <p><strong>Description:</strong> {c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
