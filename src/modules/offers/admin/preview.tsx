"use client";

// Élő előnézet: a levél-komponens egy iframe-be renderelve, így az admin stílusai nem
// hatnak rá – pontosan úgy néz ki, ahogy a vendég kapja.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OfferBody } from "../email";
import type { OfferView } from "../view";

const SKELETON =
  '<!doctype html><html lang="hu"><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;background:#F7F5F1}</style></head><body></body></html>';

export function PreviewFrame({ view }: { view: OfferView }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  // A srcDoc betöltése után kerül bele a tartalom (különben a betöltés felülírná).
  function onLoad() {
    const doc = ref.current?.contentDocument;
    if (doc?.body) setBody(doc.body);
  }

  useEffect(() => {
    // Ha a betöltés már a hidratálás előtt megtörtént, az onLoad nem fut le újra.
    const doc = ref.current?.contentDocument;
    if (doc?.readyState === "complete" && doc.body && doc.head?.querySelector("base")) setBody(doc.body);
  }, []);

  // Az iframe magassága kövesse a tartalmat.
  useEffect(() => {
    if (!body || !ref.current) return;
    const frame = ref.current;
    const fit = () => (frame.style.height = `${body.scrollHeight + 4}px`);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(body);
    return () => ro.disconnect();
  }, [body]);

  return (
    <>
      <iframe
        ref={ref}
        srcDoc={SKELETON}
        onLoad={onLoad}
        title="Előnézet: így kapja a vendég"
        className="block w-full rounded-[10px] border-0"
        style={{ height: 900 }}
      />
      {body ? createPortal(<OfferBody view={view} />, body) : null}
    </>
  );
}
