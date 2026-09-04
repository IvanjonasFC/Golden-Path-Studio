/**
 * Script blindado inyectado en cada iframe para:
 * 1. Prevenir navegación no deseada al pulsar enlaces o submits.
 * 2. Detección automática de contraste (Blindaje Robusto):
 *    Si el componente (botón, loader, icono SVG, spinner, etc.) es negro o muy oscuro,
 *    automáticamente cambia el fondo del body a blanco puro (#ffffff) para que sea 100% visible.
 *    Si el componente es blanco o claro, mantiene el fondo oscuro (#0b0b0f).
 */
export const GUARD_SCRIPT = `
<script>
(function() {
  // 1. Evitar navegación al hacer clic en enlaces o botones submit dentro del preview
  document.addEventListener("click", function(e) {
    var a = e.target.closest && e.target.closest("a");
    if (a) e.preventDefault();
  }, true);
  document.addEventListener("submit", function(e) {
    e.preventDefault();
  }, true);

  // 2. Detección automática de luminosidad y contraste
  function parseLum(colorStr) {
    if (!colorStr || colorStr === "transparent" || colorStr === "inherit") return null;
    var m = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
    if (!m) return null;
    var alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (alpha < 0.25) return null; // Prácticamente transparente
    var r = parseInt(m[1], 10);
    var g = parseInt(m[2], 10);
    var b = parseInt(m[3], 10);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function autoContrast() {
    try {
      var body = document.body;
      if (!body) return;

      // Buscar el primer elemento que represente el componente (ignorar scripts y styles)
      var el = body.firstElementChild;
      while (el && (el.tagName === "SCRIPT" || el.tagName === "STYLE")) {
        el = el.nextElementSibling;
      }
      if (!el) return;

      var isDark = false;

      // A. Comprobar SVGs en el componente (los paths por defecto de SVG son negros sin fill)
      var svgs = body.querySelectorAll("svg");
      for (var s = 0; s < svgs.length; s++) {
        var svg = svgs[s];
        var paths = svg.querySelectorAll("path, circle, rect, polygon, ellipse, line, polyline");
        if (paths.length === 0) {
          var sFill = parseLum(window.getComputedStyle(svg).fill);
          var sStroke = parseLum(window.getComputedStyle(svg).stroke);
          if ((sFill !== null && sFill < 65) || (sStroke !== null && sStroke < 65)) {
            isDark = true;
            break;
          }
        }
        for (var p = 0; p < paths.length; p++) {
          var pStyle = window.getComputedStyle(paths[p]);
          var fLum = parseLum(pStyle.fill);
          var stLum = parseLum(pStyle.stroke);
          if ((fLum !== null && fLum < 65) || (stLum !== null && stLum < 65)) {
            isDark = true;
            break;
          }
        }
        if (isDark) break;
      }

      // B. Comprobar fondo y bordes del elemento principal
      if (!isDark) {
        var cs = window.getComputedStyle(el);
        var bgLum = parseLum(cs.backgroundColor);
        var borderLum = parseLum(cs.borderColor);
        var colorLum = parseLum(cs.color);

        // Si el elemento tiene fondo opaco negro / oscuro (ej: botón negro, tarjeta negra)
        if (bgLum !== null && bgLum < 65) {
          isDark = true;
        }
        // Si el elemento es transparente pero tiene bordes o texto negros (ej: spinner, icono de línea)
        else if (bgLum === null && ((borderLum !== null && borderLum < 65) || (colorLum !== null && colorLum < 65))) {
          isDark = true;
        }

        // C. Comprobar pseudo-elementos ::before y ::after (muy común en loaders / spinners como Cold Ape)
        if (!isDark) {
          var pseudos = ["::before", "::after"];
          for (var i = 0; i < pseudos.length; i++) {
            var ps = window.getComputedStyle(el, pseudos[i]);
            if (ps && ps.content && ps.content !== "none") {
              var psBg = parseLum(ps.backgroundColor);
              var psBorder = parseLum(ps.borderColor);
              if ((psBg !== null && psBg < 65) || (psBorder !== null && psBorder < 65)) {
                isDark = true;
                break;
              }
              if (ps.boxShadow && (ps.boxShadow.indexOf("rgb(0, 0, 0)") !== -1 || ps.boxShadow.indexOf("rgba(0, 0, 0") !== -1)) {
                isDark = true;
                break;
              }
            }
          }
        }
      }

      // D. Si es un componente oscuro/negro, blindar con fondo blanco
      if (isDark) {
        body.style.setProperty("background", "#ffffff", "important");
        body.style.setProperty("color", "#111111", "important");
        document.documentElement.style.setProperty("color-scheme", "light");
      }
    } catch(e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoContrast);
  } else {
    autoContrast();
  }
  window.addEventListener("load", autoContrast);
})();
</script>`;

/**
 * Prepara el HTML del componente inyectando el script de protección y contraste inteligente.
 * También realiza una comprobación estática previa para evitar cualquier parpadeo de color.
 */
/* Auto-ajuste OPCIONAL (opts.fit): envuelve el contenido visible y lo escala
   para que quepa entero en el iframe. Evita ver componentes cortados en los
   thumbnails pequenos del catalogo. No altera el blindaje de contraste (corre
   despues de autoContrast, que ya midio el DOM original). */
const FIT_SCRIPT = `
<script>
(function(){
  function fit(){
    try{
      var b=document.body; if(!b) return;
      var wrap=document.getElementById('__fit');
      if(!wrap){
        wrap=document.createElement('div'); wrap.id='__fit';
        var kids=[]; for(var i=0;i<b.childNodes.length;i++) kids.push(b.childNodes[i]);
        for(var j=0;j<kids.length;j++){ var n=kids[j]; if(n.nodeType===1 && (n.tagName==='SCRIPT'||n.tagName==='STYLE')) continue; wrap.appendChild(n); }
        b.appendChild(wrap);
        var st=document.createElement('style');
        st.textContent='html,body{margin:0!important;height:100%!important;overflow:hidden!important}body{display:flex!important;align-items:center!important;justify-content:center!important}#__fit{transform-origin:center center;max-width:none}';
        (document.head||b).appendChild(st);
      }
      wrap.style.transform='none';
      var root=document.documentElement;
      var vw=root.clientWidth||1, vh=root.clientHeight||1;
      var w=wrap.scrollWidth, h=wrap.scrollHeight;
      if(!w||!h) return;
      var s=Math.min(1,(vw-8)/w,(vh-8)/h);
      if(s>0 && s<0.999) wrap.style.transform='scale('+s+')';
    }catch(e){}
  }
  if(document.readyState==='complete') fit(); else window.addEventListener('load',fit);
  window.addEventListener('resize',fit);
  setTimeout(fit,120); setTimeout(fit,400); setTimeout(fit,1000);
})();
</script>`;

export function withGuard(html: string, opts?: { fit?: boolean }): string {
  if (!html) return "";

  // Comprobación estática rápida: si el HTML contiene indicios inequívocos de elemento negro
  // (por ejemplo, border negro en loader, background: #000, o svg con paths sin fill)
  let processedHtml = html;
  const isLikelyDark =
    /border[^:]*:\s*[^;]*(?:#000000\b|#000\b|black\b|rgb\(0,\s*0,\s*0\))/i.test(html) ||
    /background(?:-color)?:\s*(?:#000000\b|#000\b|#050505\b|black\b|rgb\(0,\s*0,\s*0\))/i.test(html) ||
    /<svg[^>]*>[\s\S]*?<path(?![^>]*fill=[\"'](?!#000|black|none))[^>]*>/i.test(html);

  // Si se detecta estáticamente que es oscuro y el body tiene background:#0b0b0f, lo cambiamos a blanco de entrada
  if (isLikelyDark && processedHtml.includes("background:#0b0b0f")) {
    processedHtml = processedHtml
      .replace("background:#0b0b0f", "background:#ffffff")
      .replace("color:#eee", "color:#111");
  }

  const inject = GUARD_SCRIPT + (opts?.fit ? FIT_SCRIPT : "");
  return processedHtml.includes("</body>")
    ? processedHtml.replace("</body>", inject + "</body>")
    : processedHtml + inject;
}

export const GUARD = GUARD_SCRIPT;

