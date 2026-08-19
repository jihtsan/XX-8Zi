"use client";

import { useEffect, useRef, useState } from "react";

type AMapInstance = {
  add: (overlay: unknown) => void;
  addControl: (control: unknown) => void;
  destroy: () => void;
};

type AMapNamespace = {
  Map: new (
    container: HTMLElement,
    options: {
      center: [number, number];
      mapStyle: string;
      viewMode: "2D";
      zoom: number;
    },
  ) => AMapInstance;
  Marker: new (options: {
    anchor: "bottom-center";
    content: HTMLElement;
    position: [number, number];
    title: string;
  }) => unknown;
  Scale: new () => unknown;
  ToolBar: new (options: { position: string }) => unknown;
};

type AMapLoader = {
  load: (options: {
    key: string;
    plugins: string[];
    version: "2.0";
  }) => Promise<AMapNamespace>;
};

declare global {
  interface Window {
    AMapLoader?: AMapLoader;
    _AMapSecurityConfig?: { serviceHost: string };
    __xuanxuAMapLoader?: Promise<AMapLoader>;
  }
}

type AMapLocationProps = {
  address: string;
  apiKey: string;
  center: [number, number];
  locationName: string;
  serviceHost: string;
};

function loadAMapLoader(serviceHost: string): Promise<AMapLoader> {
  window._AMapSecurityConfig = { serviceHost };
  if (window.AMapLoader) return Promise.resolve(window.AMapLoader);
  if (window.__xuanxuAMapLoader) return window.__xuanxuAMapLoader;

  window.__xuanxuAMapLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-xuanxu-amap-loader="true"]',
    );
    const script = existingScript ?? document.createElement("script");
    script.addEventListener("load", () => {
      if (window.AMapLoader) resolve(window.AMapLoader);
      else reject(new Error("高德地图加载器不可用"));
    });
    script.addEventListener("error", () => reject(new Error("高德地图脚本加载失败")));
    if (!existingScript) {
      script.src = "https://webapi.amap.com/loader.js";
      script.async = true;
      script.dataset.xuanxuAmapLoader = "true";
      document.head.appendChild(script);
    }
  });
  return window.__xuanxuAMapLoader;
}

export function AMapLocation({
  address,
  apiKey,
  center,
  locationName,
  serviceHost,
}: AMapLocationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "unconfigured">(
    apiKey ? "loading" : "unconfigured",
  );

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let disposed = false;
    let map: AMapInstance | undefined;

    loadAMapLoader(serviceHost)
      .then((loader) =>
        loader.load({
          key: apiKey,
          version: "2.0",
          plugins: ["AMap.Scale", "AMap.ToolBar"],
        }),
      )
      .then((AMap) => {
        if (disposed || !containerRef.current) return;
        map = new AMap.Map(containerRef.current, {
          center,
          zoom: 14,
          viewMode: "2D",
          mapStyle: "amap://styles/dark",
        });
        const markerElement = document.createElement("div");
        markerElement.className = "amap-location-marker";
        markerElement.setAttribute("aria-hidden", "true");
        map.add(
          new AMap.Marker({
            position: center,
            title: `${locationName}：${address}`,
            anchor: "bottom-center",
            content: markerElement,
          }),
        );
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: "RB" }));
        setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("error");
      });

    return () => {
      disposed = true;
      map?.destroy();
    };
  }, [address, apiKey, center, locationName, serviceHost]);

  return (
    <div className="amap-frame" data-map-state={state}>
      <div ref={containerRef} className="amap-container" aria-label={`${locationName}高德地图`} />
      {state !== "ready" ? (
        <div className="amap-state" role="status">
          <span aria-hidden="true">◇</span>
          {state === "loading" && <p>正在载入高德地图…</p>}
          {state === "unconfigured" && <p>地图 Key 尚未配置，请先完成高德开放平台接入。</p>}
          {state === "error" && <p>地图暂时无法载入，你仍可通过下方地址打开高德地图。</p>}
        </div>
      ) : null}
    </div>
  );
}
