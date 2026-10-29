/**
 * Paper page-curl for the reading view: the page is folded along a line, the
 * part past the fold flips over (we see the back of the paper) and the page
 * underneath shows through, with a crease and a shadow, like turning a page
 * in a book.
 *
 * Geometry: the page's turning edge point C is pulled to P. The fold is the
 * perpendicular bisector of C→P. Everything on C's side of it is folded: it
 * is hidden on the page itself and drawn mirrored across the fold as the
 * "flap" (back of the sheet). P = C means flat; P.x = -width means fully
 * turned.
 */

/** keep the part of a convex polygon where f(point) >= 0 (Sutherland–Hodgman) */
function clip(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
const polygon = (pts) => (pts.length > 2 ? `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})` : "polygon(0 0, 0 0, 0 0)");
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createPageCurl(stage) {
  // shadow cast on the page underneath + the folded-over back of the sheet
  const shadow = document.createElement("div");
  shadow.className = "rd-curl__shadow";
  const flapWrap = document.createElement("div");
  flapWrap.className = "rd-curl__flapwrap";
  const flap = document.createElement("div");
  flap.className = "rd-curl__flap";
  flapWrap.append(flap);

  const size = () => ({ w: stage.clientWidth, h: stage.clientHeight });

  /** lays out a big strip whose local x axis starts on the fold and runs along (ux, uy) */
  function strip(el, M, ux, uy, L) {
    el.style.left = `${M.x}px`;
    el.style.top = `${M.y - L}px`;
    el.style.width = `${L}px`;
    el.style.height = `${2 * L}px`;
    el.style.transform = `rotate(${Math.atan2(uy, ux)}rad)`;
  }

  /** draws the page `sheet` with its edge point C pulled to P */
  function paint(sheet, C, P) {
    const { w, h } = size();
    const dx = C.x - P.x;
    const dy = C.y - P.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) {
      sheet.style.clipPath = "";
      shadow.hidden = flapWrap.hidden = true;
      return;
    }
    if (!shadow.isConnected) stage.append(shadow, flapWrap);
    shadow.hidden = flapWrap.hidden = false;

    const n = { x: dx / len, y: dy / len }; // points to the folded side
    const M = { x: (C.x + P.x) / 2, y: (C.y + P.y) / 2 };
    const side = ([x, y]) => (x - M.x) * n.x + (y - M.y) * n.y;
    const rect = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    sheet.style.clipPath = polygon(clip(rect, (p) => -side(p)));

    // the folded part, mirrored across the fold: the back of the paper
    const folded = clip(rect, side).map((p) => {
      const d = side(p);
      return [p[0] - 2 * d * n.x, p[1] - 2 * d * n.y];
    });
    const L = Math.hypot(w, h) * 2;
    const cos = Math.cos(Math.atan2(-n.y, -n.x));
    const sin = Math.sin(Math.atan2(-n.y, -n.x));
    const local = ([x, y]) => {
      const ox = x - M.x;
      const oy = y - M.y;
      return [ox * cos + oy * sin, -ox * sin + oy * cos + L];
    };
    const pts = folded.map(local);
    const flapW = Math.max(1, ...pts.map((p) => p[0]));
    strip(flap, M, -n.x, -n.y, L);
    flap.style.clipPath = polygon(pts);
    // crease at the fold, a soft highlight where the paper bulges, darker edge
    flap.style.backgroundImage = `linear-gradient(to right,
      rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.06) ${flapW * 0.08}px,
      rgba(255,255,255,0.32) ${flapW * 0.35}px, rgba(255,255,255,0) ${flapW * 0.75}px,
      rgba(0,0,0,0.1) ${flapW}px)`;

    // shadow of the lifted sheet on the page underneath, along the fold
    const depth = Math.min(70, flapW * 0.6);
    const strength = Math.min(1, flapW / 50) * 0.38;
    strip(shadow, M, n.x, n.y, L);
    shadow.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,${strength}) 0px, rgba(0,0,0,0) ${depth}px)`;
  }

  function clear(sheet) {
    if (sheet) sheet.style.clipPath = "";
    shadow.remove();
    flapWrap.remove();
  }

  /** animates P from → to (with an optional upward arc), painting each frame */
  function run(sheet, C, from, to, ms, arc = 0) {
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - start) / ms);
        const k = ease(t);
        const P = {
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k - arc * Math.sin(Math.PI * k),
        };
        paint(sheet, C, P);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  return { paint, clear, run, size };
}
