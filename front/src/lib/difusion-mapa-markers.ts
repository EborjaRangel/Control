import type { Marker, Popup } from "mapbox-gl";
import { theme } from "@/lib/theme";

export function createDifusionGloboElement(options: {
  selected: boolean;
  animateDrop: boolean;
  staggerIndex: number;
  numero?: number | null;
}): HTMLDivElement {
  /** Contenedor raíz: Mapbox mueve este nodo; la animación va en el hijo. */
  const root = document.createElement("div");
  root.className = "difusion-globo-marker-root";

  const el = document.createElement("button");
  el.type = "button";
  el.className = "difusion-globo-marker";
  el.setAttribute("aria-label", "Ver acción de difusión");
  if (options.selected) el.classList.add("difusion-globo-marker--selected");
  if (options.animateDrop) {
    el.classList.add("difusion-globo-marker--drop");
    el.style.animationDelay = `${options.staggerIndex * 70}ms`;
  }

  const inner = document.createElement("span");
  inner.className = "difusion-globo-marker-bubble";
  inner.style.backgroundColor = theme.pin;

  if (options.numero != null && options.numero > 0) {
    const num = document.createElement("span");
    num.className = "difusion-globo-marker-num";
    num.textContent = String(options.numero);
    inner.appendChild(num);
  }

  const shine = document.createElement("span");
  shine.className = "difusion-globo-marker-shine";
  inner.appendChild(shine);

  const tail = document.createElement("span");
  tail.className = "difusion-globo-marker-tail";
  tail.style.borderTopColor = theme.pin;

  el.append(inner, tail);
  root.appendChild(el);
  return root;
}

/** Popup al hover sin parpadeo (cursor puede pasar al globo ↔ tooltip). */
export function bindStableHoverPopup(marker: Marker, triggerEl: HTMLElement, popup: Popup) {
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const clearCloseTimer = () => {
    if (closeTimer != null) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer = setTimeout(() => {
      popup.remove();
    }, 220);
  };

  marker.setPopup(popup);

  const open = () => {
    clearCloseTimer();
    if (!popup.isOpen()) {
      marker.togglePopup();
    }
    const popupEl = popup.getElement();
    if (popupEl && !popupEl.dataset.difusionHoverBound) {
      popupEl.dataset.difusionHoverBound = "1";
      popupEl.addEventListener("mouseenter", clearCloseTimer);
      popupEl.addEventListener("mouseleave", scheduleClose);
    }
  };

  triggerEl.addEventListener("mouseenter", open);
  triggerEl.addEventListener("mouseleave", scheduleClose);
  triggerEl.addEventListener("focus", open);
  triggerEl.addEventListener("blur", scheduleClose);

  triggerEl.addEventListener("click", (event) => {
    event.preventDefault();
    open();
  });
}

export function registrosMapaKey(
  registros: { id: string; lat: number; lng: number }[],
): string {
  return registros.map((r) => `${r.id}:${r.lat}:${r.lng}`).join("|");
}
