"use client";

import type { PointerEvent } from "react";

function setPointerPosition(event: PointerEvent<HTMLDivElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * 100;
  const y = ((event.clientY - bounds.top) / bounds.height) * 100;
  event.currentTarget.style.setProperty("--grid-pointer-x", `${x}%`);
  event.currentTarget.style.setProperty("--grid-pointer-y", `${y}%`);
}

export function CatalogGridBackground() {
  return (
    <div
      className="catalog-grid-background"
      aria-hidden="true"
      onPointerMove={setPointerPosition}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--grid-pointer-x", "50%");
        event.currentTarget.style.setProperty("--grid-pointer-y", "50%");
      }}
    >
      <div className="catalog-grid-glow" />
      <div className="catalog-grid-lines" />
      <div className="catalog-grid-signal">
        <span />
        <span />
        <span />
      </div>
      <p>MINERAL FIELD / 03</p>
    </div>
  );
}
