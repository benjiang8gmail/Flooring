/* Plank & Pattern Flooring — site script
   - mobile navigation
   - procedural floor renderer (hero floor, swatches)
   - suburb checker, quote estimator, order quantity calculator
   - quote form submission (Netlify Forms by default)
*/
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     BUSINESS SETTINGS — edit these to match your pricing.
     Indicative AUD per m², GST inclusive, as [low, high].
     "waste" is the cutting allowance added to supply-only orders.
     ------------------------------------------------------------------ */
  var RATES = {
    hybrid: { label: "Hybrid", supplyInstall: [70, 110], supply: [42, 70], install: [25, 40], waste: 0.07 },
    laminate: { label: "Laminate", supplyInstall: [55, 85], supply: [30, 50], install: [22, 35], waste: 0.07 },
    vinyl: { label: "Vinyl plank", supplyInstall: [75, 115], supply: [40, 70], install: [30, 45], waste: 0.07 },
    engineered: { label: "Engineered timber", supplyInstall: [110, 190], supply: [70, 130], install: [40, 65], waste: 0.08 },
    solid: { label: "Solid timber, sanded & coated", supplyInstall: [160, 260], supply: [85, 140], install: [75, 120], waste: 0.1 },
    herringbone: { label: "Herringbone or chevron", supplyInstall: [170, 280], supply: [95, 170], install: [70, 110], waste: 0.15 }
  };

  var EXTRAS = {
    removal: { label: "Remove old floor", rate: [6, 14] },
    levelling: { label: "Levelling allowance", rate: [15, 35] }
  };

  var EXAMPLE_AREA = 60;

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  function roundTo(n, step) {
    return Math.round(n / step) * step;
  }

  function fmtRange(lo, hi) {
    return money.format(roundTo(lo, 10)) + " – " + money.format(roundTo(hi, 10));
  }

  function fmtArea(n) {
    return (Math.round(n * 10) / 10).toLocaleString("en-AU") + " m²";
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  $all("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------ */
  var navToggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (navToggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    };
    navToggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        navToggle.focus();
      }
    });
    $all("a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        setOpen(false);
      });
    });
  }

  /* ------------------------------------------------------------------
     Floor renderer
     Boards are drawn to scale in millimetres, then mapped to pixels.
     Tones are [hue, saturation %, lightness %].
     ------------------------------------------------------------------ */
  var FLOORS = {
    "engineered-oak": {
      name: "Engineered oak",
      spec: "Engineered European oak · 190 × 1900 × 14/3 mm · matt lacquer",
      pattern: "plank", width: 190, minLen: 1100, maxLen: 1900,
      tones: [[33, 36, 60], [35, 40, 64], [31, 32, 55], [36, 34, 67], [32, 38, 58]],
      grain: 0.16, cathedral: 0.45, knots: 0.35
    },
    "spotted-gum": {
      name: "Spotted gum",
      spec: "Solid Spotted Gum · 130 mm × 19 mm tongue & groove · sanded & coated on site",
      pattern: "plank", width: 130, minLen: 500, maxLen: 2100,
      tones: [[24, 34, 44], [28, 40, 53], [22, 30, 37], [32, 36, 61], [23, 24, 46], [26, 28, 40]],
      grain: 0.2, cathedral: 0.3, knots: 0.04
    },
    blackbutt: {
      name: "Blackbutt",
      spec: "Blackbutt · 130 mm × 14 mm engineered or 19 mm solid · satin finish",
      pattern: "plank", width: 130, minLen: 600, maxLen: 2100,
      tones: [[38, 44, 70], [36, 40, 65], [40, 46, 74], [34, 38, 61], [39, 36, 68]],
      grain: 0.13, cathedral: 0.25, knots: 0.04
    },
    herringbone: {
      name: "Herringbone",
      spec: "Engineered oak herringbone · 90 × 540 × 14/3 mm · smoked, hardwax oil",
      pattern: "herringbone", width: 90, ratio: 6,
      tones: [[30, 32, 44], [28, 36, 39], [32, 30, 49], [29, 28, 41], [31, 34, 46]],
      grain: 0.15, cathedral: 0.2, knots: 0.12
    },
    hybrid: {
      name: "Hybrid",
      spec: "Hybrid, rigid SPC core · 180 × 1520 × 7 mm · 0.5 mm wear layer",
      pattern: "plank", width: 180, minLen: 1520, maxLen: 1520, bevel: true,
      tones: [[34, 10, 67], [32, 8, 63], [36, 11, 71], [30, 9, 60], [33, 9, 65]],
      grain: 0.11, cathedral: 0.35, knots: 0.2
    },
    laminate: {
      name: "Laminate",
      spec: "Laminate, AC4 · 193 × 1380 × 12 mm · embossed-in-register surface",
      pattern: "plank", width: 193, minLen: 1380, maxLen: 1380, bevel: true,
      tones: [[27, 34, 47], [26, 30, 43], [29, 36, 51], [25, 32, 45]],
      grain: 0.13, cathedral: 0.4, knots: 0.15
    },
    vinyl: {
      name: "Vinyl plank",
      spec: "Glue-down vinyl plank · 184 × 1219 × 2.5 mm · 0.55 mm wear layer",
      pattern: "plank", width: 184, minLen: 1219, maxLen: 1219, bevel: false,
      tones: [[36, 22, 72], [34, 20, 69], [38, 24, 75], [35, 18, 67]],
      grain: 0.1, cathedral: 0.3, knots: 0.1
    }
  };

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function hsl(h, s, l, a) {
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    return a === undefined ? "hsl(" + h + " " + s + "% " + l + "%)" : "hsl(" + h + " " + s + "% " + l + "% / " + a + ")";
  }

  /* Draw one board. (x, y, w, h) is its rectangle; "along" is the grain
     direction: horizontal boards run along x, vertical boards along y. */
  function drawBoard(ctx, x, y, w, h, horizontal, f, rng) {
    var tone = f.tones[Math.floor(rng() * f.tones.length)];
    var hue = tone[0] + (rng() - 0.5) * 4;
    var sat = tone[1] + (rng() - 0.5) * 8;
    var lit = tone[2] + (rng() - 0.5) * 7;
    var along = horizontal ? w : h;
    var across = horizontal ? h : w;

    function P(a, c) {
      return horizontal ? [x + a, y + c] : [x + c, y + a];
    }

    var g = horizontal ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, hsl(hue, sat, lit - 2 + rng() * 3));
    g.addColorStop(0.35 + rng() * 0.3, hsl(hue, sat, lit + 1 + rng() * 3));
    g.addColorStop(1, hsl(hue, sat, lit - 3 + rng() * 3));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // Straight grain lines running the length of the board
    var lines = Math.max(4, Math.round(across / 2));
    ctx.lineCap = "round";
    for (var i = 0; i < lines; i++) {
      var c0 = rng() * across;
      var room = Math.min(c0, across - c0);
      var amp = Math.min(room, across * 0.07) * rng();
      var darkLine = rng() < 0.72;
      var alpha = f.grain * (darkLine ? 0.45 + rng() * 0.9 : 0.5 + rng() * 0.5);
      ctx.strokeStyle = darkLine ? hsl(hue, sat + 6, lit - 20, alpha) : hsl(hue, sat - 4, lit + 14, alpha);
      ctx.lineWidth = Math.max(0.4, across / (darkLine ? 70 : 55)) * (0.6 + rng() * 0.9);
      var segs = 2 + Math.floor(rng() * 3);
      var segLen = along / segs;
      var p = P(0, c0);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (var k = 1; k <= segs; k++) {
        var ctrl = P(segLen * (k - 0.5), c0 + (rng() * 2 - 1) * amp);
        var end = P(segLen * k, c0 + (rng() * 2 - 1) * amp * 0.5);
        ctx.quadraticCurveTo(ctrl[0], ctrl[1], end[0], end[1]);
      }
      ctx.stroke();
    }

    // Cathedral figure: nested arches from flat-sawn boards
    if (rng() < f.cathedral && along > across * 2.5) {
      var apexA = along * (0.25 + rng() * 0.6);
      var midC = across * (0.35 + rng() * 0.3);
      var rings = 3 + Math.floor(rng() * 4);
      var dir = rng() < 0.5 ? -1 : 1;
      ctx.strokeStyle = hsl(hue, sat + 6, lit - 18, f.grain * 1.1);
      ctx.lineWidth = Math.max(0.5, across / 55);
      for (var r = 1; r <= rings; r++) {
        var spread = Math.min(midC, across - midC) * (r / (rings + 0.6));
        var reach = along * (0.1 + 0.07 * r);
        var a0 = P(apexA + dir * reach, midC - spread);
        var a1 = P(apexA - dir * reach * 0.25, midC);
        var a2 = P(apexA + dir * reach, midC + spread);
        ctx.beginPath();
        ctx.moveTo(a0[0], a0[1]);
        ctx.quadraticCurveTo(a1[0], a1[1], a2[0], a2[1]);
        ctx.stroke();
      }
    }

    // Pin knots: small, soft and stretched along the grain
    if (rng() < f.knots) {
      var ka = along * (0.1 + rng() * 0.8);
      var kc = across * (0.25 + rng() * 0.5);
      var kp = P(ka, kc);
      var rl = across * (0.05 + rng() * 0.05);
      var rs = rl * 0.45;
      var kx = horizontal ? rl : rs;
      var ky = horizontal ? rs : rl;
      ctx.lineWidth = Math.max(0.4, across / 90);
      ctx.strokeStyle = hsl(hue, sat + 4, lit - 14, 0.28);
      for (var ring = 3; ring >= 2; ring--) {
        ctx.beginPath();
        ctx.ellipse(kp[0], kp[1], kx * ring * 0.9, ky * ring * 0.9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(kp[0], kp[1], kx, ky, 0, 0, Math.PI * 2);
      ctx.fillStyle = hsl(hue - 4, sat + 6, lit - 22, 0.45);
      ctx.fill();
    }

    // Joints: dark seam on the leading edges, light bevel just inside
    var seam = f.bevel ? 0.5 : 0.36;
    ctx.fillStyle = "rgba(28, 18, 8, " + seam + ")";
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = "rgba(255, 248, 235, " + (f.bevel ? 0.16 : 0.08) + ")";
    ctx.fillRect(x + 1, y + 1, w - 1, 1);
  }

  function drawPlanks(ctx, W, H, f, s, rng) {
    var bw = f.width * s;
    var fixed = f.minLen === f.maxLen;
    var y = -rng() * bw * 0.6;
    var lastOffset = 0;
    while (y < H) {
      var offset;
      if (fixed) {
        // Stagger fixed-length planks so end joints sit at least 300 mm apart
        do {
          offset = rng() * f.maxLen;
        } while (Math.abs(offset - lastOffset) < 300 || Math.abs(offset - lastOffset) > f.maxLen - 300);
        lastOffset = offset;
      } else {
        offset = rng() * f.maxLen;
      }
      var x = -offset * s;
      while (x < W) {
        var len = (f.minLen + rng() * (f.maxLen - f.minLen)) * s;
        drawBoard(ctx, x, y, len, bw, true, f, rng);
        x += len;
      }
      y += bw;
    }
  }

  /* Herringbone, drawn axis-aligned and rotated 45°. With board width w and
     length L = n·w, every board is a base board shifted by a·(w, w) + m·(0, 2L). */
  function drawHerringbone(ctx, W, H, f, s, rng) {
    var w = f.width * s;
    var n = f.ratio;
    var L = n * w;
    var R = Math.hypot(W, H) / 2 + w;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.PI / 4);
    var aMin = Math.floor((-R - L - w) / w);
    var aMax = Math.ceil(R / w);
    var period = 2 * L;
    for (var a = aMin; a <= aMax; a++) {
      var bx = a * w;
      var mMin = Math.floor((-R - L - w - a * w) / period);
      var mMax = Math.ceil((R + w - a * w) / period);
      for (var m = mMin; m <= mMax; m++) {
        var by = a * w + m * period;
        if (bx < R && bx + L > -R && by < R && by + w > -R) {
          drawBoard(ctx, bx, by, L, w, true, f, rng);
        }
        var vx = bx + L;
        var vy = by + w - L;
        if (vx < R && vx + w > -R && vy < R && vy + L > -R) {
          drawBoard(ctx, vx, vy, w, L, false, f, rng);
        }
      }
    }
    ctx.restore();
  }

  // Must match the CSS transform on .floor-stage canvas
  var PERSPECTIVE = 900;
  var TILT = (58 * Math.PI) / 180;

  function drawFloor(canvas, key) {
    var f = FLOORS[key];
    if (!f) return;
    var inStage = canvas.parentElement && canvas.parentElement.classList.contains("floor-stage");
    if (inStage) {
      // Height the canvas so that, once tilted, it still reaches the bottom of the stage
      var stageH = canvas.parentElement.clientHeight;
      var needed = (stageH * PERSPECTIVE) / (Math.cos(TILT) * PERSPECTIVE + stageH * Math.sin(TILT));
      canvas.style.height = Math.ceil(needed + 16) + "px";
    }
    var cssW = canvas.clientWidth;
    var cssH = canvas.clientHeight;
    if (!cssW || !cssH) return;
    var dpr = Math.min((window.devicePixelRatio || 1) * (inStage ? 1.5 : 1), 3);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    var span = parseFloat(canvas.getAttribute("data-span")) || 1600; // millimetres shown across
    if (inStage) span *= Math.min(1, Math.max(0.5, cssW / 1100)); // show fewer, larger boards on phones
    var scale = cssW / span;
    var rng = mulberry32(hashString(key + (canvas.id || canvas.getAttribute("data-seed") || "")));
    if (f.pattern === "herringbone") {
      drawHerringbone(ctx, cssW, cssH, f, scale, rng);
    } else {
      drawPlanks(ctx, cssW, cssH, f, scale, rng);
    }
    canvas.setAttribute("data-drawn-width", String(cssW));
  }

  var floorCanvases = $all("canvas[data-floor]");
  floorCanvases.forEach(function (c) {
    drawFloor(c, c.getAttribute("data-floor"));
  });

  if ("ResizeObserver" in window && floorCanvases.length) {
    var pending = null;
    var ro = new ResizeObserver(function () {
      if (pending) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(function () {
        floorCanvases.forEach(function (c) {
          var target = c.parentElement.classList.contains("floor-stage") ? c.parentElement : c;
          var key = target.clientWidth + "x" + target.clientHeight;
          if (c.getAttribute("data-drawn-size") !== key) {
            c.setAttribute("data-drawn-size", key);
            drawFloor(c, c.getAttribute("data-floor"));
          }
        });
      });
    });
    floorCanvases.forEach(function (c) {
      var target = c.parentElement.classList.contains("floor-stage") ? c.parentElement : c;
      c.setAttribute("data-drawn-size", target.clientWidth + "x" + target.clientHeight);
      ro.observe(target);
    });
  }

  // Floor picker on the home page hero
  var picker = $("[data-floor-picker]");
  if (picker) {
    var heroCanvas = document.getElementById(picker.getAttribute("data-target"));
    var specOut = $("[data-floor-spec]", picker);
    $all("[data-pick]", picker).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-pick");
        if (!FLOORS[key] || !heroCanvas) return;
        $all("[data-pick]", picker).forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        if (specOut) specOut.textContent = FLOORS[key].spec;
        heroCanvas.setAttribute("data-floor", key);
        if (reduceMotion) {
          drawFloor(heroCanvas, key);
          return;
        }
        heroCanvas.classList.add("is-fading");
        setTimeout(function () {
          drawFloor(heroCanvas, key);
          heroCanvas.classList.remove("is-fading");
        }, 180);
      });
    });
  }

  /* ------------------------------------------------------------------
     Suburb checker (service areas page)
     ------------------------------------------------------------------ */
  var checker = $("[data-suburb-checker]");
  if (checker) {
    var input = $("input", checker);
    var result = $("[data-result]", checker);
    var norm = function (s) {
      return s.toLowerCase().replace(/[^a-z]/g, "");
    };
    var suburbs = $all("[data-region] .suburbs li").map(function (li) {
      var region = li.closest("[data-region]");
      return {
        li: li,
        name: li.textContent.trim(),
        key: norm(li.textContent),
        region: region.getAttribute("data-region"),
        outer: region.getAttribute("data-outer") === "true"
      };
    });

    var runCheck = function () {
      var q = norm(input.value);
      suburbs.forEach(function (s) {
        s.li.classList.remove("is-match");
      });
      result.className = "checker__result";
      if (q.length < 2) {
        result.textContent = "";
        return;
      }
      var exact = suburbs.filter(function (s) {
        return s.key === q;
      })[0];
      if (exact) {
        exact.li.classList.add("is-match");
        result.classList.add("is-yes");
        result.textContent =
          "Yes, we cover " + exact.name + " (" + exact.region + ")." +
          (exact.outer ? " A travel charge may apply, and we'll include it in your quote." : " No travel charge.");
        return;
      }
      var partial = suburbs.filter(function (s) {
        return s.key.indexOf(q) === 0;
      });
      if (partial.length) {
        partial.forEach(function (s) {
          s.li.classList.add("is-match");
        });
        result.textContent =
          "Did you mean " +
          partial
            .slice(0, 4)
            .map(function (s) {
              return s.name;
            })
            .join(", ") +
          (partial.length > 4 ? " or " + (partial.length - 4) + " more" : "") +
          "? We cover all of them.";
        result.classList.add("is-yes");
        return;
      }
      result.classList.add("is-maybe");
      result.textContent =
        input.value.trim() +
        " isn't on our list yet. We travel across greater Melbourne, so send us the address and we'll confirm.";
    };

    input.addEventListener("input", runCheck);
    checker.addEventListener("submit", function (e) {
      e.preventDefault();
      runCheck();
    });
  }

  /* ------------------------------------------------------------------
     Quote estimator (reads the quote form's own fields)
     ------------------------------------------------------------------ */
  var estimate = $("[data-estimate]");
  var quoteForm = $("form[data-quote-form]");

  function serviceValue(form) {
    var checked = $('input[name="service"]:checked', form);
    return checked ? checked.value : "supply-install";
  }

  function updateEstimate() {
    if (!estimate || !quoteForm) return;
    var typeKey = ($("#floor-type", quoteForm) || {}).value || "hybrid";
    var rate = RATES[typeKey];
    var out = $("[data-estimate-total]", estimate);
    var lines = $("[data-estimate-lines]", estimate);
    var caption = $("[data-estimate-caption]", estimate);
    if (!rate) {
      out.textContent = "Depends on the floor";
      lines.innerHTML = "";
      caption.textContent = "Pick a floor type to see an indicative range, or leave it with us and we'll suggest options at the measure.";
      return;
    }
    var areaInput = $("#area", quoteForm);
    var area = parseFloat(areaInput && areaInput.value);
    var isExample = !(area > 0);
    if (isExample) area = EXAMPLE_AREA;
    area = Math.min(area, 5000);

    var service = serviceValue(quoteForm);
    var lo = 0;
    var hi = 0;
    var rows = [];
    var orderArea = area * (1 + rate.waste);

    if (service === "supply") {
      lo = orderArea * rate.supply[0];
      hi = orderArea * rate.supply[1];
      rows.push(["Order quantity", fmtArea(orderArea)]);
      rows.push([rate.label + " supply", fmtRange(lo, hi)]);
    } else {
      var band = service === "install" ? rate.install : rate.supplyInstall;
      lo = area * band[0];
      hi = area * band[1];
      rows.push([rate.label + (service === "install" ? ", installation" : ", supplied & laid"), fmtRange(lo, hi)]);
      ["removal", "levelling"].forEach(function (k) {
        var box = $("#extra-" + k, quoteForm);
        if (box && box.checked) {
          var elo = area * EXTRAS[k].rate[0];
          var ehi = area * EXTRAS[k].rate[1];
          lo += elo;
          hi += ehi;
          rows.push([EXTRAS[k].label, fmtRange(elo, ehi)]);
        }
      });
    }

    out.textContent = fmtRange(lo, hi);
    lines.innerHTML = "";
    rows.forEach(function (r) {
      var li = document.createElement("li");
      var a = document.createElement("span");
      var b = document.createElement("span");
      a.textContent = r[0];
      b.textContent = r[1];
      li.appendChild(a);
      li.appendChild(b);
      lines.appendChild(li);
    });
    caption.textContent = isExample
      ? "Example for " + EXAMPLE_AREA + " m². Enter your floor area for your own range."
      : "Indicative range for " + fmtArea(area) + ", GST included.";
  }

  if (estimate && quoteForm) {
    quoteForm.addEventListener("input", updateEstimate);
    quoteForm.addEventListener("change", updateEstimate);
    updateEstimate();
  }

  /* ------------------------------------------------------------------
     Order quantity calculator (supply page)
     ------------------------------------------------------------------ */
  var orderCalc = $("[data-order-calc]");
  if (orderCalc) {
    var runOrder = function () {
      var area = parseFloat($("#calc-area", orderCalc).value);
      var waste = parseFloat($("#calc-layout", orderCalc).value);
      var box = parseFloat($("#calc-box", orderCalc).value);
      var out = $("[data-order-total]", orderCalc);
      var lines = $("[data-order-lines]", orderCalc);
      if (!(area > 0) || !(box > 0)) {
        out.textContent = "Enter area and box size";
        lines.innerHTML = "";
        return;
      }
      var need = area * (1 + waste);
      var boxes = Math.ceil(need / box - 1e-9);
      var covers = boxes * box;
      out.textContent = boxes + (boxes === 1 ? " box" : " boxes");
      lines.innerHTML = "";
      [
        ["Floor area", fmtArea(area)],
        ["Cutting allowance", Math.round(waste * 100) + "%"],
        ["Area to order", fmtArea(need)],
        ["Boxes cover", fmtArea(covers)]
      ].forEach(function (r) {
        var li = document.createElement("li");
        li.innerHTML = "<span></span><span></span>";
        li.children[0].textContent = r[0];
        li.children[1].textContent = r[1];
        lines.appendChild(li);
      });
    };
    orderCalc.addEventListener("input", runOrder);
    orderCalc.addEventListener("change", runOrder);
    orderCalc.addEventListener("submit", function (e) {
      e.preventDefault();
      runOrder();
    });
    runOrder();
  }

  /* ------------------------------------------------------------------
     Quote form
     Default: Netlify Forms (posts to "/"). To use Formspree or another
     service, set data-endpoint="https://formspree.io/f/xxxx" on the form.
     ------------------------------------------------------------------ */
  if (quoteForm) {
    var status = $("[data-form-status]");
    var submitBtn = $('[type="submit"]', quoteForm);
    var submitLabel = submitBtn ? submitBtn.textContent : "";

    var setError = function (field, message) {
      var wrap = field.closest(".field");
      if (!wrap) return;
      wrap.classList.add("has-error");
      field.setAttribute("aria-invalid", "true");
      var msg = $(".field__error", wrap);
      if (!msg) {
        msg = document.createElement("p");
        msg.className = "field__error";
        msg.id = (field.id || field.name) + "-error";
        wrap.appendChild(msg);
      }
      field.setAttribute("aria-describedby", msg.id);
      msg.textContent = message;
    };

    var clearErrors = function () {
      $all(".has-error", quoteForm).forEach(function (w) {
        w.classList.remove("has-error");
      });
      $all(".field__error", quoteForm).forEach(function (m) {
        m.remove();
      });
      $all("[aria-invalid]", quoteForm).forEach(function (f) {
        f.removeAttribute("aria-invalid");
        f.removeAttribute("aria-describedby");
      });
    };

    var validate = function () {
      clearErrors();
      var first = null;
      var check = function (sel, test, message) {
        var el = $(sel, quoteForm);
        if (el && !test(el.value.trim())) {
          setError(el, message);
          if (!first) first = el;
        }
      };
      check("#name", function (v) { return v.length > 1; }, "Enter your name so we know who to ask for.");
      check("#phone", function (v) { return v.replace(/\D/g, "").length >= 8; }, "Enter a phone number we can call, like 0412 345 678.");
      check("#email", function (v) { return v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, "Check the email address, it looks incomplete.");
      check("#suburb", function (v) { return v.length > 1; }, "Enter the suburb where the floor is going.");
      if (first) first.focus();
      return !first;
    };

    var showStatus = function (kind, html) {
      if (!status) return;
      status.hidden = false;
      status.className = "form-status form-status--" + kind;
      status.innerHTML = html;
      status.setAttribute("tabindex", "-1");
      status.focus();
    };

    quoteForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }
      var done = function () {
        quoteForm.hidden = true;
        showStatus(
          "ok",
          "<strong>Request received.</strong> We'll call you within one business day to book your free measure. " +
            "If it's urgent, ring us on <span class=\"mono\">0491 570 156</span>."
        );
      };
      var fail = function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        }
        showStatus(
          "err",
          "<strong>Your request didn't go through.</strong> Check your connection and try again, or call " +
            "<span class=\"mono\">0491 570 156</span> or email <span class=\"mono\">quotes@plankandpattern.com.au</span>."
        );
      };

      // Preview copies of the site set data-demo="true": nothing is sent
      if (quoteForm.getAttribute("data-demo") === "true") {
        setTimeout(function () {
          quoteForm.hidden = true;
          showStatus(
            "ok",
            "<strong>Preview only: nothing was sent.</strong> This copy of the site isn't connected to a form service. " +
              "On the live site, this request goes straight to your inbox."
          );
        }, 300);
        return;
      }

      var data = new FormData(quoteForm);
      var endpoint = quoteForm.getAttribute("data-endpoint") || "/";
      var req =
        endpoint === "/"
          ? fetch("/", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(data).toString()
            })
          : fetch(endpoint, { method: "POST", headers: { Accept: "application/json" }, body: data });
      req
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          done();
        })
        .catch(fail);
    });
  }
})();
