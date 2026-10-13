/* ============================================================
   《认识厘米 · 糖丸爷爷》课件交互
   1 输入保护 / 2 通用揭示 / 3 尺子 / 4 拃 / 5 捏住1厘米
   6 拖尺子量糖丸 / 7 时间轴 / 8 画线段 / 9 和顾爷爷说句话
   9-a 百宝盒分类 / 9-b 切换 / 10 彩带 / 11 页配音
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var U = { ruler: 88, drag: 112, draw: 150 };
  var AUDIO_ON = false;   /* 配音开关：老师 2026-10-11 要求全部去掉，改成 true 就恢复 */

  /* ---------- 1. 翻页笔 / 键盘保护 ----------
     runtime.js 在 document 冒泡阶段监听方向键、空格、PageUp/PageDown（翻页笔发这两种键），
     这里在捕获阶段先把按键分流：
       · 输入框、下拉框、可编辑区：按键归它们自己（在对话框里打字不会翻页）
       · 按钮、链接：只让空格/回车归它自己，翻页键放行
         —— 否则鼠标点过按钮后焦点留在按钮上，翻页笔就按不动了（这是之前的真实故障）
     另外：点过按钮就把焦点收回来，免得焦点一直挂在按钮上。                    */
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]')) {
      e.stopImmediatePropagation();
      return;
    }
    if (t.closest('button,a[href],[role="button"]') &&
        (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter')) {
      e.stopImmediatePropagation();     /* 空格/回车仍然属于按钮自己 */
    }
  }, true);

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var b = e.target.closest('button,a[href],[role="button"]');
    if (b && b.blur) setTimeout(function () { b.blur(); }, 0);
  });

  /* ---------- 1-b. 翻页笔的黑屏键（多数翻页笔的 B 或 . ）---------- */
  (function blackout() {
    var box = document.createElement('div');
    box.className = 'deck-blackout';
    document.body.appendChild(box);
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === 'b' || k === 'B' || k === '.' || k === '。') {
        box.classList.toggle('on');
        e.preventDefault();
      } else if (k === 'Escape') {
        box.classList.remove('on');
      }
    });
  })();

  /* ---------- 0.5 ?answers=1 —— 把所有隐藏答案直接展开 ----------
     两个用途：1) 导出"带答案版"讲义；2) 检查那些点开才出现的文字排版。
     必须同步执行，不能放在 setTimeout 里，否则打印抓不到。          */
  if (location.search.indexOf('answers') > -1) {
    $$('.js-box,.js-reveal,.ring,.ov,.dark-line,[data-reveal-at]').forEach(function (n) { n.classList.add('on'); });
    $$('.choice').forEach(function (n) { n.classList.add('picked'); });
  }

  /* ---------- 2. 通用：点击揭示 / 三选一 / 翻卡 ---------- */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var el = e.target.closest('[data-toggle]');
    if (!el) return;
    var root = el.closest('[data-scope]') || document;
    $$(el.getAttribute('data-toggle'), root).forEach(function (n) { n.classList.toggle('on'); });
  });

  $$('[data-pick]').forEach(function (group) {
    $$('.choice', group).forEach(function (c) {
      on(c, 'click', function () {
        $$('.choice', group).forEach(function (x) { x.classList.remove('picked'); });
        c.classList.add('picked');
      });
    });
  });

  $$('.flip').forEach(function (f) { on(f, 'click', function () { f.classList.toggle('on'); }); });

  /* 辨一辨（第 21 页）：选了 √ 或 × 之后，整张卡片变色（错的红、对的绿） */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    /* 第 2 页那通"视频来电"：点挂断/接听都收起弹窗；接听顺便把那句话浮出来 */
    var call = e.target.closest('[data-call-off]');
    if (call) {
      var pop = call.closest('.call-pop');
      if (pop) pop.classList.add('done');
      var takeSel = call.getAttribute('data-call-take');
      if (takeSel) {
        var root = call.closest('[data-scope]') || document;
        $$(takeSel, root).forEach(function (n) { n.classList.add('on'); });
      }
    }
    var b = e.target.closest('.judge [data-toggle]');
    if (!b) return;
    var card = b.closest('.diag-card');
    var v = card && card.getAttribute('data-verdict');
    if (!v) return;
    card.classList.remove('picked-bad', 'picked-good');
    card.classList.add(v === 'good' ? 'picked-good' : 'picked-bad');
  });

  /* ---------- 3. 尺子（SVG）：认识尺子 / 找出 1 厘米 ---------- */
  function mk(svg, tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    svg.appendChild(n);
    return n;
  }
  function buildRuler(svg) {
    if (!svg || svg.dataset.built) return;
    svg.dataset.built = '1';
    var cm = parseInt(svg.getAttribute('data-ruler'), 10) || 6;
    var demo = svg.getAttribute('data-ruler-demo');
    var u = U.ruler, pad = 34, top = 44;
    /* 比原来高 50px：cm 挪到 0 的右下角，还要在它下面写"厘米"。
       第 8 页（有 0 / cm / 数字 三个热区）再高 40：不然"厘米"两个字贴着底边被裁掉一截。 */
    var H = demo ? 218
          : ((svg.hasAttribute('data-ruler-cm') || svg.hasAttribute('data-ruler-zero')) ? 240 : 200);
    var W = pad * 2 + cm * u;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    mk(svg, 'rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 16, fill: '#F8F2EA',
      stroke: 'rgba(74,58,54,.22)', 'stroke-width': 2 });
    mk(svg, 'rect', { x: 1, y: 1, width: W - 2, height: 12, rx: 6, fill: '#EFE4D8' });

    for (var i = 0; i <= cm * 2; i++) {
      var x = pad + i * u / 2, major = i % 2 === 0;
      mk(svg, 'line', { x1: x, y1: top, x2: x, y2: top + (major ? 58 : 38),
        stroke: 'rgba(74,58,54,.5)', 'stroke-width': major ? 3 : 2,
        'class': i === 0 ? 'tick tick-zero' : 'tick' });
    }
    for (var j = 0; j <= cm; j++) {
      var t = mk(svg, 'text', { x: pad + j * u, y: top + 96, 'text-anchor': 'middle',
        'font-size': 30, fill: '#5A4F4C', 'font-family': 'Inter,sans-serif', 'font-weight': 600 });
      t.textContent = j;
    }

    var revealDemo = null;
    var label = null;
    var clickedSegs = {};   /* 点过哪些段（不依赖点亮状态） */
    if (demo) {
      /* 演示模式：上面一根“要量的东西”，可以拖动、自动吸到整厘米；
         长度不变，所以下面的结论永远是同一句，只是起止刻度变了。 */
      var pr = demo.split('-');
      var dA = parseFloat(pr[0]) || 0, dB = parseFloat(pr[1]) || 0;
      var dLen = dB - dA;                        /* 长度（厘米）拖动时不变 */
      var a = dA, b = a + dLen;
      var x1 = pad + a * u, x2 = pad + b * u;
      mk(svg, 'line', { x1: 0, y1: H - 68, x2: W, y2: H - 68, stroke: 'rgba(74,58,54,.10)', 'stroke-width': 1 });
      var dBar = mk(svg, 'rect', { x: x1, y: top - 36, width: (b - a) * u, height: 24, rx: 7,
        fill: '#C3B3DD', 'class': 'demo-bar', style: 'cursor:grab' });
      var dL1 = mk(svg, 'line', { x1: x1, y1: top - 40, x2: x1, y2: top + 64, stroke: '#6B5896',
        'stroke-width': 2, 'stroke-dasharray': '7 7' });
      var dL2 = mk(svg, 'line', { x1: x2, y1: top - 40, x2: x2, y2: top + 64, stroke: '#6B5896',
        'stroke-width': 2, 'stroke-dasharray': '7 7' });
      var ans = mk(svg, 'text', { x: (x1 + x2) / 2, y: H - 15, 'text-anchor': 'middle',
        'font-size': 38, 'font-family': 'Georgia,serif', fill: '#A9536D', 'class': 'seg-label' });
      ans.textContent = (Math.round(dLen * 10) / 10) + ' 厘米';
      revealDemo = function () { ans.classList.add('on'); };

      var fmtCm = function (v) { return String(Math.round(v * 10) / 10); };
      var dSlide = svg.closest ? (svg.closest('.slide') || document) : document;
      var dSay = svg.getAttribute('data-ruler-demo-say') ? $('[data-ruler-demo-say]', dSlide) : null;
      var paintDemo = function () {
        b = a + dLen;
        x1 = pad + a * u; x2 = pad + b * u;
        dBar.setAttribute('x', x1);
        dBar.setAttribute('width', dLen * u);
        dL1.setAttribute('x1', x1); dL1.setAttribute('x2', x1);
        dL2.setAttribute('x1', x2); dL2.setAttribute('x2', x2);
        ans.setAttribute('x', (x1 + x2) / 2);
        if (dSay) {
          dSay.textContent = '从 ' + fmtCm(a) + ' 到 ' + fmtCm(b) + '，也是 ' + fmtCm(dLen) + ' 厘米。';
          dSay.classList.add('on');        /* 拖动/点击之后才出现 */
        }
        revealDemo && revealDemo();
      };
      var dDrag = false, dStartX = 0, dStartA = 0;
      on(dBar, 'pointerdown', function (e) {
        dDrag = true; dStartX = e.clientX; dStartA = a;
        dBar.setAttribute('style', 'cursor:grabbing');
        if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      on(svg, 'pointermove', function (e) {
        if (!dDrag) return;
        var bx = svg.getBoundingClientRect();
        var sc = (bx.width / W) || 1;
        var da = Math.round(((e.clientX - dStartX) / sc) / u);   /* 吸附到最近的整厘米 */
        a = Math.max(0, Math.min(cm - dLen, dStartA + da));
        paintDemo();
      });
      var dEnd = function () {
        if (!dDrag) return;
        dDrag = false;
        dBar.setAttribute('style', 'cursor:grab');
        paintDemo();
      };
      on(svg, 'pointerup', dEnd);
      on(svg, 'pointercancel', dEnd);
      paintDemo();
      on(svg, 'click', function () { revealDemo(); });
    } else {
      /* cm 写在 0 的右下角；点它，下面再出一行"厘米"（2026-10-11 按老师要求改） */
      var unit = mk(svg, 'text', { x: pad + 34, y: top + 130, 'text-anchor': 'start',
        'font-size': 24, fill: '#A9536D', 'font-family': 'Georgia,serif', 'font-style': 'italic',
        'class': 'cm-mark' });
      unit.textContent = 'cm';
      label = mk(svg, 'text', { x: W / 2, y: 26, 'text-anchor': 'middle', 'class': 'seg-label' });
      label.textContent = '1 厘米';
    }

    for (var m = 0; m < cm; m++) {
      (function (m) {
        var r = mk(svg, 'rect', { x: pad + m * u, y: top - 8, width: u, height: 76, rx: 8,
          'class': 'ruler-seg', style: svg.hasAttribute('data-ruler-noseg') ? '' : 'cursor:pointer' });
        on(r, 'click', function (ev) {
          ev.stopPropagation();
          if (revealDemo) { revealDemo(); return; }
          /* 这两种模式的段点击另有处理，不走"点一段显示 1 厘米" */
          if (svg.hasAttribute('data-ruler-noseg') || svg.hasAttribute('data-ruler-count')) return;
          /* data-ruler-accum：点亮的不再取消，让学生一段一段数出来（P13 数 15 个 1 厘米） */
          if (!svg.hasAttribute('data-ruler-accum')) {
            $$('.ruler-seg', svg).forEach(function (x) { x.classList.remove('on'); });
          } else if (r.classList.contains('on')) {
            return;
          }
          r.classList.add('on');
          label.setAttribute('x', pad + m * u + u / 2);
          label.classList.add('on');
          var zl = $('.zero-label', svg);
          if (zl) zl.classList.remove('on');
          /* 记住点过哪些段（点过的段数够多，下面的结论依次出现） */
          clickedSegs[m] = 1;
          var segCount = Object.keys(clickedSegs).length;
          var sc2 = svg.closest('.slide') || document;
          $$('[data-reveal-at]', sc2).forEach(function (n) {
            if (segCount >= parseInt(n.getAttribute('data-reveal-at'), 10)) n.classList.add('on');
          });
          /* 全部点亮 → 揭示结论（data-ruler-all=".p13-done"） */
          var allSel = svg.getAttribute('data-ruler-all');
          if (allSel && $$('.ruler-seg.on', svg).length >= cm) {
            var scope = svg.closest('.slide') || document;
            $$(allSel, scope).forEach(function (n) { n.classList.add('on'); });
          }
          /* P13：点得越多，屏幕上的话一句一句出来（data-reveal-at="2|5|15"） */
          if (svg.hasAttribute('data-ruler-accum')) {
            var lit = $$('.ruler-seg.on', svg).length;
            var sc = svg.closest('.slide') || document;
            $$('[data-reveal-at]', sc).forEach(function (n) {
              if (lit >= parseInt(n.getAttribute('data-reveal-at'), 10)) n.classList.add('on');
            });
          }
        });
      })(m);
    }

    /* 第四个尺子模式（第四站「认识几厘米」）：
       点一段 → 亮起并写「1 厘米」；点旁边一段 → 合起来写「2 厘米」……最多 10 厘米。
       点离得远的一段 = 换个地方重新数。 */
    if (svg.hasAttribute('data-ruler-count')) {
      var runA = -1, runB = -1;
      var total = mkSay('1 厘米', W / 2, 26, 'middle');
      var sego = $$('.ruler-seg', svg);
      var paintRun = function () {
        sego.forEach(function (n, i) {
          n.classList.toggle('on', runA >= 0 && i >= runA && i <= runB);
        });
        if (runA < 0) { total.classList.remove('on'); return; }
        var cnt = runB - runA + 1;
        total.textContent = cnt + ' 厘米';
        total.setAttribute('x', pad + (runA + cnt / 2) * u);
        total.classList.add('on');
      };
      sego.forEach(function (seg, i) {
        on(seg, 'click', function (ev) {
          ev.stopPropagation();
          if (runA < 0) { runA = runB = i; }
          else if (i === runA - 1) { runA = i; }
          else if (i === runB + 1) { runB = i; }
          else if (i >= runA && i <= runB) { /* 点已亮的：保持不动 */ }
          else { runA = runB = i; }
          paintRun();
        });
      });
    }

    /* P9：点尺子上的 0 / cm / 数字，各自跳出一句说明 */
    function mkSay(text, x, y, anchor) {
      var t = mk(svg, 'text', { x: x, y: y, 'text-anchor': anchor || 'middle',
        'class': 'seg-label' });
      t.textContent = text;
      return t;
    }
    if (svg.hasAttribute('data-ruler-num')) {
      /* 点任意一个数字：把整排数字框起来，顶上写"数字" */
      var band = mk(svg, 'rect', { x: pad - 12, y: top + 62, width: (cm * u) + 24, height: 46,
        rx: 10, 'class': 'num-band' });
      var nht = mk(svg, 'rect', { x: 0, y: top + 74, width: W, height: 40,
        fill: 'transparent', style: 'cursor:pointer' });
      var nsay = mkSay(svg.getAttribute('data-ruler-num-label') || '数字', W / 2, 26, 'middle');
      on(nht, 'click', function (ev) {
        ev.stopPropagation();
        band.classList.toggle('on');
        nsay.classList.toggle('on');
      });
    }

    if (svg.hasAttribute('data-ruler-zero')) {
      var zhit = mk(svg, 'rect', { x: pad - 30, y: top - 34, width: 46, height: 140,
        fill: 'transparent', style: 'cursor:pointer' });
      var zl = mk(svg, 'text', { x: pad + 8, y: 26, 'text-anchor': 'start', 'class': 'seg-label zero-label' });
      zl.textContent = svg.getAttribute('data-ruler-zero-label') || '0 —— 从这里开始量';
      on(zhit, 'click', function (ev) {
        ev.stopPropagation();
        label.classList.remove('on');
        zl.classList.toggle('on');
        /* 点 0：那根刻度线跟着变红（第 8 页） */
        var tk = $('.tick-zero', svg);
        if (tk) tk.classList.toggle('zero-red');
        /* P10：点 0 刻度，起跑线闪金光 */
        var wrap = svg.closest('.rb');
        if (wrap) wrap.classList.toggle('zero-lit');
      });
    }

    /* cm 的热区最后创建（所以压在最上层）：点它 → "cm"变红，下面冒出"厘米"。
       放在 0 / 数字 两个热区之后，是因为这三个热区挨得近，先建的会被后建的挡住。 */
    if (svg.hasAttribute('data-ruler-cm')) {
      var cht = mk(svg, 'rect', { x: pad + 8, y: top + 100, width: 132, height: 96,
        fill: 'transparent', style: 'cursor:pointer' });
      var csay = mkSay(svg.getAttribute('data-ruler-cm-label') || '厘米', pad + 34, top + 158, 'start');
      on(cht, 'click', function (ev) {
        ev.stopPropagation();
        csay.classList.toggle('on');
        if (unit) unit.classList.toggle('lit');
      });
    }

    /* P23：断尺。把 0 刻度那一截“咬掉”，只剩从 2 开始的一截。 */
    var broken = parseFloat(svg.getAttribute('data-ruler-broken'));
    if (!isNaN(broken)) {
      var bx = pad + broken * u;
      var pts = ['0,0'];
      var zig = 0;
      for (var yy = 0; yy <= H; yy += 24) {
        pts.push((bx + (zig % 2 === 0 ? -15 : -4)) + ',' + yy);
        zig++;
      }
      pts.push((bx - 10) + ',' + H, '0,' + H);
      mk(svg, 'polygon', { points: pts.join(' '), 'class': 'ruler-break' });
      mk(svg, 'polyline', { points: pts.slice(1, -2).join(' '), 'class': 'ruler-break-line' });
      var bsay = mkSay(svg.getAttribute('data-ruler-broken-say') || '断口', bx + 6, H - 26, 'start');
      bsay.classList.add('on');
    }
  }
  $$('[data-ruler]').forEach(buildRuler);

  /* ---------- 4. 拃：同一根小棒，量出不同的数 ---------- */
  $$('[data-span]').forEach(function (w) {
    var layer = $('.span-layer', w);
    var stamp = $('.conflict-stamp', w);

    $$('.span-person', w).forEach(function (p) {
      on(p, 'click', function () {
        $$('.span-person', w).forEach(function (x) { x.classList.remove('active'); });
        p.classList.add('active');

        var n = parseFloat(p.getAttribute('data-count')) || 4;
        var bounds = [];
        for (var k = 0; k < Math.floor(n); k++) bounds.push(k);
        bounds.push(n);

        layer.innerHTML = '';
        bounds.forEach(function (b, i) {
          var mark = document.createElement('div');
          mark.className = 'span-mark';
          mark.style.left = (b / n * 100) + '%';
          layer.appendChild(mark);

          if (i < bounds.length - 1) {
            var lab = document.createElement('div');
            lab.className = 'span-lab';
            lab.style.left = ((b + bounds[i + 1]) / 2 / n * 100) + '%';
            lab.textContent = (n % 1 !== 0 && i === bounds.length - 2) ? '半拃' : String(i + 1);
            layer.appendChild(lab);
            setTimeout(function () { mark.classList.add('on'); lab.classList.add('on'); }, 170 * i);
          } else {
            setTimeout(function () { mark.classList.add('on'); }, 170 * i);
          }
        });

        if (stamp) {
          stamp.textContent = p.getAttribute('data-say') || '';
          stamp.classList.add('on');
        }
      });
    });
  });

  /* ---------- 5. 捏住 1 厘米的小棒 ---------- */
  $$('[data-pinch]').forEach(function (w) {
    var btn = $('[data-pinch-go]', w);

    function run() {
      $('.stick-1cm', w).classList.add('out');
      $('.gap-mark', w).classList.add('on');
      $('.gap-cap', w).classList.add('on');
      if (btn) btn.textContent = '再来一次';
    }

    function reset() {
      $('.stick-1cm', w).classList.remove('out');
      $('.gap-mark', w).classList.remove('on');
      $('.gap-cap', w).classList.remove('on');
      if (btn) btn.textContent = '抽走小棒';
    }

    on(btn, 'click', function () {
      if ($('.stick-1cm', w).classList.contains('out')) reset(); else run();
    });
  });

  /* ---------- 6. 拖尺子量糖丸 ---------- */
  function deckScale() {
    var d = document.querySelector('.deck');
    if (!d) return 1;
    var m = getComputedStyle(d).transform;
    if (!m || m === 'none') return 1;
    var mm = m.match(/matrix\(([^,]+)/);
    return mm ? parseFloat(mm[1]) : 1;
  }

  function buildDragRuler(ruler, cm, u, pad) {
    ruler.innerHTML = '';
    var w = pad * 2 + cm * u, h = 112;
    ruler.style.width = w + 'px';
    ruler.style.height = h + 'px';

    var body = document.createElement('div');
    body.style.cssText = 'position:absolute;inset:0;border-radius:14px;background:#F8F2EA;' +
      'border:1px solid rgba(74,58,54,.22);box-shadow:0 10px 22px rgba(74,58,54,.12)';
    ruler.appendChild(body);

    var lip = document.createElement('div');
    lip.style.cssText = 'position:absolute;left:0;right:0;top:0;height:10px;' +
      'border-radius:14px 14px 0 0;background:#EFE4D8';
    ruler.appendChild(lip);

    for (var i = 0; i <= cm * 2; i++) {
      var major = i % 2 === 0;
      var tick = document.createElement('div');
      tick.style.cssText = 'position:absolute;top:' + (major ? 22 : 30) + 'px;left:' + (pad + i * u / 2) +
        'px;width:' + (major ? 3 : 2) + 'px;height:' + (major ? 60 : 40) +
        'px;background:rgba(74,58,54,' + (major ? '.55' : '.38') + ')';
      ruler.appendChild(tick);
    }
    for (var j = 0; j <= cm; j++) {
      var num = document.createElement('div');
      num.textContent = j;
      num.style.cssText = 'position:absolute;top:82px;left:' + (pad + j * u) +
        'px;transform:translateX(-50%);font-size:28px;color:#5A4F4C;font-weight:600';
      ruler.appendChild(num);
    }
    var cmk = document.createElement('div');
    cmk.textContent = 'cm';
    cmk.style.cssText = 'position:absolute;top:14px;left:' + (pad + cm * u) +
      'px;transform:translateX(-100%);font-size:23px;color:#A9536D;font-style:italic';
    ruler.appendChild(cmk);
    ruler.dataset.pad = pad;
  }

  $$('[data-measure]').forEach(function (stage) {
    var ruler = $('.meas-ruler', stage);
    var obj = $('.meas-object', stage);
    var res = $('.meas-result', stage);
    var snapLine = $('.snap-line', stage);
    var hint = $('.meas-hint', stage);
    if (!ruler || !obj) return;

    var u = U.drag, pad = 22;
    buildDragRuler(ruler, parseInt(ruler.getAttribute('data-drag-ruler'), 10) || 3, u, pad);

    var t = 0, dragging = false, startX = 0, startT = 0;
    var target = function () { return obj.offsetLeft - ruler.offsetLeft - pad; };
    var apply = function () { ruler.style.transform = 'translateX(' + t + 'px)'; };

    function settle() {
      if (Math.abs(t - target()) <= 26) {
        t = target(); apply();
        res.classList.add('on');
        snapLine.classList.add('on');
        stage.classList.add('settled');      /* P12：0 到 1 那一段金光闪 */
        if (hint) hint.textContent = '对齐了！0 刻度贴着糖丸的左边，右边正好对着 1 —— 1 厘米。';
      } else {
        res.classList.remove('on');
        snapLine.classList.remove('on');
        stage.classList.remove('settled');
        if (hint) hint.textContent = '把 0 刻度拖到糖丸的左边，让它贴住。';
      }
    }

    on(ruler, 'pointerdown', function (e) {
      dragging = true;
      ruler.classList.add('dragging');
      startX = e.clientX; startT = t;
      if (ruler.setPointerCapture) ruler.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    on(ruler, 'pointermove', function (e) {
      if (!dragging) return;
      t = startT + (e.clientX - startX) / deckScale();
      t = Math.max(-40, Math.min(t, 460));
      apply();
    });
    var end = function () {
      if (!dragging) return;
      dragging = false;
      ruler.classList.remove('dragging');
      settle();
    };
    on(ruler, 'pointerup', end);
    on(ruler, 'pointercancel', end);
    apply();
  });

  /* ---------- 7. 时间轴 ---------- */
  $$('[data-timeline]').forEach(function (tl) {
    var nodes = $$('.node', tl);
    nodes.forEach(function (n) {
      on(n, 'click', function () {
        n.classList.add('on');
        /* 自动播放的那一页（P32）不放彩带：语气要收，不要庆祝 */
        if (!tl.hasAttribute('data-timeline-auto') &&
            nodes.every(function (x) { return x.classList.contains('on'); })) confetti();
      });
    });
  });

  /* ---------- 7-b. 时间轴自动点亮（P32 的 42 年） ----------
     翻到这一页，五个年份一年一年自己亮起来；离开页面就复位。 */
  $$('[data-timeline-auto]').forEach(function (tl) {
    var nodes = $$('.node', tl);
    var span = $('.tl-span', tl);
    var slide = tl.closest('.slide');
    if (!slide) return;
    var timers = [];
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function reset() {
      clear();
      nodes.forEach(function (n) { n.classList.remove('on'); });
      if (span) span.classList.remove('on');
    }
    function run() {
      reset();
      nodes.forEach(function (n, i) {
        timers.push(setTimeout(function () { n.classList.add('on'); }, 900 * (i + 1)));
      });
      if (span) timers.push(setTimeout(function () { span.classList.add('on'); },
        900 * (nodes.length + 1)));
    }
    new MutationObserver(function () {
      if (slide.classList.contains('is-active')) run(); else clear();
    }).observe(slide, { attributes: true, attributeFilter: ['class'] });
    if (slide.classList.contains('is-active')) run();
  });

  /* ---------- 8. 画线段 ---------- */
  $$('[data-draw]').forEach(function (stage) {
    var u = parseFloat(stage.getAttribute('data-u')) || U.draw;
    var ticks = $('.draw-ticks', stage);
    var line = $('.draw-line', stage);
    var pencil = $('.draw-pencil', stage);
    var candies = $('.candies', stage);
    var btn = $('[data-draw-go]', stage);
    /* 端点（P29 画 4 厘米：两个端点，中间一条线） */
    var eps = $$('.draw-endpoint', stage);
    var epLabel = $('.draw-end-label', stage);
    eps.forEach(function (e) {
      e.style.left = (parseFloat(e.getAttribute('data-ep')) || 0) * u + 'px';
    });
    if (epLabel) {
      epLabel.style.left = (parseFloat(epLabel.getAttribute('data-ep-label')) || 0) * u + 'px';
    }

    /* 刻度按这一页真正要画的最长线段来排（P18 要画 10 厘米） */
    var topCm = Math.max(6, parseFloat(btn && btn.getAttribute('data-cm')) || 0);
    for (var i = 0; i <= topCm; i++) {
      var tk = document.createElement('div');
      tk.className = 'draw-tick';
      tk.style.left = (i * u) + 'px';
      ticks.appendChild(tk);

      var nm = document.createElement('div');
      nm.className = 'draw-num';
      nm.style.left = (i * u) + 'px';
      nm.textContent = i;
      ticks.appendChild(nm);
    }

    function runDraw(el) {
      var cm = parseFloat((el || btn).getAttribute('data-cm')) || 3;
      line.style.transition = 'none';
      pencil.style.transition = 'none';
      line.style.width = '0px';
      pencil.style.left = '0px';
      if (candies) candies.innerHTML = '';
      eps.forEach(function (e) { e.classList.remove('on'); });
      if (epLabel) epLabel.classList.remove('on');
      void line.offsetWidth;
      line.style.transition = '';
      pencil.style.transition = '';
      line.style.width = (cm * u) + 'px';
      pencil.style.left = (cm * u) + 'px';

      setTimeout(function () {
        var n = Math.floor(cm);
        if (!candies) n = 0;
        if (stage.hasAttribute('data-draw-nocandy')) n = 0;   /* 只画线段，不排糖丸（2026-10-12） */
        /* 每颗糖丸和尺子上的 1 厘米一样大：宽度 = 1 厘米的像素数，一颗接一颗排满（2026-10-11） */
        var csz = Math.round(u - 1);
        candies.style.height = Math.round(csz + 10) + 'px';
        var rulerBox = candies.parentNode;
        if (rulerBox) rulerBox.style.height = Math.round(csz + 150) + 'px';
        for (var k = 0; k < n; k++) {
          var d = document.createElement('div');
          d.className = 'candy-dot';
          d.style.width = csz + 'px';
          d.style.height = csz + 'px';
          d.style.left = Math.round(k * u + (u - csz) / 2) + 'px';
          candies.appendChild(d);
          (function (d, k) {
            setTimeout(function () { d.classList.add('on'); }, 130 * k);
          })(d, k);
        }
        var out = $('[data-draw-out]', stage);
        if (out) setTimeout(function () { out.classList.add('on'); }, 130 * n + 200);
        setTimeout(function () {
          eps.forEach(function (e) { e.classList.add('on'); });
          if (epLabel) epLabel.classList.add('on');
        }, 260);
      }, 1620);
    }
    /* 事件委托：点铅笔、点按钮都行，不用依赖初始化时抓到的元素（2026-10-11 修） */
    on(document, 'click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-draw-go]') : null;
      if (t && stage.contains(t)) runDraw(t);
    });
    /* 再加一条通道：铅笔上的内联 onclick 会派发这个自定义事件，一定能收到 */
    on(stage, 'rcm-draw', function () { runDraw(btn); });
  });

  /* ---------- 9-a. 1 厘米百宝盒（P15）：点一点，东西自己分进框里 ---------- */
  $$('[data-sort]').forEach(function (box) {
    var items = $$('.sort-item', box);
    var bins = {};
    $$('[data-bin]', box).forEach(function (b) {
      bins[b.getAttribute('data-bin')] = $('.bin-body', b);
    });
    var say = $('[data-sort-say]', box);
    var slide = box.closest('.slide') || document;
    var done = $('.verdict', slide);
    var placed = 0;

    items.forEach(function (it) {
      on(it, 'click', function () {
        if (it.classList.contains('placed')) return;
        var fit = it.getAttribute('data-fit') === 'yes' ? 'yes' : 'no';
        var name = it.textContent.trim();
        var tag = document.createElement('span');
        tag.className = 'fit';
        tag.textContent = it.getAttribute('data-say') || '';
        it.appendChild(tag);
        it.classList.add('placed', fit);
        if (bins[fit]) bins[fit].appendChild(it);
        if (say) say.textContent = name + '：' + (it.getAttribute('data-reason') || '');
        placed++;
        if (placed >= items.length && done) done.classList.add('on');
      });
    });
  });

  /* ---------- 9-b. 切换：一次只显示一块（P34） ---------- */
  $$('[data-switch]').forEach(function (sw) {
    var btns = $$('.sw-btn', sw);
    var panels = $$('[data-sw-panel]', sw);
    function show(key) {
      btns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-sw') === key); });
      panels.forEach(function (p) {
        p.classList.toggle('on', p.getAttribute('data-sw-panel') === key);
      });
    }
    btns.forEach(function (b) {
      on(b, 'click', function () { show(b.getAttribute('data-sw')); });
    });
    if (btns.length) show(btns[0].getAttribute('data-sw'));
  });

  /* ---------- 9-c. 视频位（P4） ----------
     文件放进来就自动顶掉说明；点开那一页顺手播放。 */
  $$('[data-video]').forEach(function (box) {
    var v = $('video', box);
    if (!v) return;
    on(v, 'error', function () { v.classList.add('miss'); });
    /* preload=metadata 时 readyState 只到 1，所以有元数据就算就位 */
    v.addEventListener('loadedmetadata', function () { v.classList.remove('miss'); });
    v.addEventListener('loadeddata', function () { v.classList.remove('miss'); });
    if (v.readyState >= 1) v.classList.remove('miss');
  });
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var t = e.target.closest('[data-toggle]');
    if (!t) return;
    /* 只看被点击的这一页里的视频——原来写成了全文档，别的页面的视频会被顺手播一遍（2026-10-12 修） */
    var slide = t.closest('.slide') || document;
    $$('[data-video] video', slide).forEach(function (v) {
      var fig = v.closest('.js-box');
      if (!fig || !fig.classList.contains('on') || v.classList.contains('miss')) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  });

  /* ---------- 9. 和顾爷爷说句话 ---------- */
  var REPLIES = {
    sweet: '甜。裹上一层糖，小朋友才肯张嘴。不过糖也不能随便加——加多了，一颗糖丸里的药量就不准了。所以每一颗，都得做得一样大。',
    fear: '怕。第一次试的时候，谁心里都打鼓。可要是没人先试，全国的小朋友怎么敢吃呢？',
    needle: '打针得有医生、有针管，还得冷藏，山里的孩子打不上。糖丸不怕热，坐火车、坐汽车就能送到每一个村子。',
    howbig: '这个嘛——你量量看。就用你手边的那把尺子。',
    giveup: '困难比想的多：缺钱、缺设备，还没有冷链——液体疫苗出了城就容易坏。'
      + '可要是没人往前顶，孩子们怎么办？我没有想过放弃。这辈子我只做了这一件事，做完，就值了。'
  };

  var KEYWORDS = [
    { k: ['谢谢', '感谢', '多亏', '辛苦您', '您真好'], r: '不用谢。你们健健康康地长大，就是对我最好的回答。' },
    { k: ['尺子', '厘米', '量', '测量', '多长', '多大'], r: '量得不错。做科学，就是要一分一厘都不含糊——差那么一点点，药就不是那个药了。' },
    { k: ['糖', '甜', '好吃', '想吃'], r: '甜吧？就是想让你们愿意吃。一颗糖丸，甜了一代人的童年。' },
    { k: ['怕', '害怕', '担心', '危险'], r: '怕过。可想到你们，就不怕了。' },
    { k: ['累', '辛苦', '难', '困难'], r: '不累。一辈子做成一件事，够了。' },
    { k: ['好玩', '有趣', '喜欢', '厉害', '伟大'], r: '喜欢就好。喜欢一件事，就能做很久很久。' },
    { k: ['再见', '拜拜', '走了'], r: '再见。好好长大，好好量你的每一厘米。' }
  ];
  var FALLBACK = '你的话，我听见了。谢谢你，还记得我。';

  function matchReply(text) {
    for (var i = 0; i < KEYWORDS.length; i++) {
      for (var j = 0; j < KEYWORDS[i].k.length; j++) {
        if (text.indexOf(KEYWORDS[i].k[j]) > -1) return KEYWORDS[i].r;
      }
    }
    return FALLBACK;
  }

  $$('[data-talk]').forEach(function (talk) {
    var stream = $('[data-stream]', talk);
    var empty = $('[data-empty]', talk);
    var form = $('[data-askme]', talk);
    var input = form ? $('input', form) : null;
    var busy = null;
    var tagNow = '';        /* 当前这组气泡属于哪个问题，随时可以整组收回 */

    function trim() {
      while (stream.children.length > 6) stream.removeChild(stream.firstChild);
      stream.scrollTop = stream.scrollHeight;
    }

    function makeBubble(cls, who) {
      var b = document.createElement('div');
      b.className = 'bubble ' + cls;
      if (tagNow) b.setAttribute('data-from', tagNow);
      if (who) {
        var w = document.createElement('span');
        w.className = 'who';
        w.textContent = who;
        b.appendChild(w);
      }
      var s = document.createElement('span');
      b.appendChild(s);
      stream.appendChild(b);
      requestAnimationFrame(function () { b.classList.add('on'); });
      trim();
      return s;
    }

    function say(text) {
      if (empty) empty.style.display = 'none';
      makeBubble('me').textContent = text;
    }

    function reply(text, after) {
      if (busy) busy();
      var s = makeBubble('gu', '顾方舟');
      var caret = document.createElement('span');
      caret.className = 'caret';
      s.parentNode.insertBefore(caret, s.nextSibling);

      var i = 0, done = false, timer = null;
      busy = function () {
        done = true;
        if (timer) clearTimeout(timer);
        s.textContent = text;
        if (caret.parentNode) caret.parentNode.removeChild(caret);
        busy = null;
      };
      (function tick() {
        if (done) return;
        if (i >= text.length) {
          if (caret.parentNode) caret.parentNode.removeChild(caret);
          busy = null;
          if (after) after();
          return;
        }
        s.textContent += text.charAt(i++);
        stream.scrollTop = stream.scrollHeight;
        timer = setTimeout(tick, 42);
      })();
    }

    function miniRuler() {
      var card = document.createElement('div');
      card.className = 'bubble gu on';
      if (tagNow) card.setAttribute('data-from', tagNow);
      card.style.cssText = 'width:64%;min-width:0;padding:16px 20px';
      var who = document.createElement('span');
      who.className = 'who';
      who.textContent = '顾方舟';
      card.appendChild(who);
      var tip = document.createElement('div');
      tip.style.cssText = 'font-size:19px;color:var(--text-2);margin-bottom:10px';
      tip.textContent = '在尺子上点一点，看看能不能找到 1 厘米。';
      card.appendChild(tip);
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'ruler-svg');
      svg.setAttribute('data-ruler', '3');
      card.appendChild(svg);
      stream.appendChild(card);
      buildRuler(svg);
      trim();
    }

    $$('.ask', talk).forEach(function (b) {
      on(b, 'click', function () {
        var key = b.getAttribute('data-ask');
        /* 再点一次同一个问题：把这一问一答收回去（2026-10-11 按老师要求） */
        if (b.classList.contains('active')) {
          if (busy) { busy(); busy = null; }
          $$('[data-from="' + key + '"]', talk).forEach(function (n) {
            if (n.parentNode) n.parentNode.removeChild(n);
          });
          $$('.caret', talk).forEach(function (c) {
            if (c.parentNode) c.parentNode.removeChild(c);
          });
          b.classList.remove('active');
          if (!stream.children.length && empty) empty.style.display = '';
          return;
        }
        $$('.ask', talk).forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        tagNow = key;
        say(b.getAttribute('data-q') || b.textContent.replace(/^\?/, '').trim());
        /* 2026-10-11：对话里不再插尺子（老师要求），只保留回信文字 */
        reply(REPLIES[key] || FALLBACK);
        tagNow = '';
      });
    });

    on(form, 'submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      if (!v) return;
      input.value = '';
      say(v);
      reply(matchReply(v));
      speakLocal(matchReply(v));          /* 自己写的这句没有录音，用系统朗读念出来 */
    });

    /* ---------- 语音对话（2026-10-11 加）----------
       2026-10-12 老师要求：去掉语音识别（麦克风按钮），改成直接在输入框里打字对话。
       想恢复：把下面 MIC_ON 改成 true 就行（代码还留着，没删）。 */
    var MIC_ON = false;
    function speakLocal(text) {
      try {
        if (!AUDIO_ON) return;                                  /* 配音已关闭 */
        if (localStorage.getItem('rcm-sound') === '0') return;   /* 配音关掉就不念 */
        if (!window.speechSynthesis || !text) return;
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        u.rate = 0.95;
        u.pitch = 0.85;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (MIC_ON && SR && form && input) {
      var mic = document.createElement('button');
      mic.type = 'button';
      mic.className = 'mic-btn';
      mic.textContent = '🎤 说出来';
      mic.title = '点一下，对着电脑说出你想问的话';
      form.insertBefore(mic, form.firstChild);
      var rec = new SR();
      rec.lang = 'zh-CN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      var listening = false;
      mic.addEventListener('click', function () {
        if (listening) { try { rec.stop(); } catch (e) {} return; }
        try { rec.start(); } catch (e) { mic.classList.add('failed'); mic.textContent = '🎤 用不了'; }
      });
      rec.onstart = function () {
        listening = true;
        mic.classList.add('listening');
        mic.textContent = '🎤 正在听…';
      };
      rec.onend = function () {
        listening = false;
        mic.classList.remove('listening');
        if (!mic.classList.contains('failed')) mic.textContent = '🎤 说出来';
      };
      rec.onerror = function () {
        listening = false;
        mic.classList.add('failed');
        mic.classList.remove('listening');
        mic.textContent = '🎤 用不了';
        mic.title = '这台电脑现在用不了语音识别（要联网 + 麦克风权限），在下面的框里打字就行。';
      };
      rec.onresult = function (ev) {
        var t = ((ev.results && ev.results[0] && ev.results[0][0] &&
                  ev.results[0][0].transcript) || '').trim().slice(0, 30);
        if (!t) return;
        say(t);
        var r = matchReply(t);
        reply(r);
        speakLocal(r);
      };
    }
  });

  /* ---------- 10. 彩带 ---------- */
  function confetti() {
    var cv = document.createElement('canvas');
    cv.className = 'confetti-cv';
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var colors = ['#E3A3B4', '#A9C4B4', '#F0D6A0', '#C3B3DD', '#A9C3DC', '#8A6A2C'];
    var ps = [];
    for (var i = 0; i < 170; i++) {
      ps.push({
        x: Math.random() * cv.width,
        y: -30 - Math.random() * cv.height * 0.5,
        w: 6 + Math.random() * 8,
        h: 9 + Math.random() * 10,
        vx: -0.7 + Math.random() * 1.4,
        vy: 1.8 + Math.random() * 2.8,
        rot: Math.random() * Math.PI,
        vr: -0.12 + Math.random() * 0.24,
        c: colors[(Math.random() * colors.length) | 0]
      });
    }
    var t0 = performance.now();
    (function loop(now) {
      var el = now - t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - el / 4200);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (el < 4200) requestAnimationFrame(loop);
      else if (cv.parentNode) cv.parentNode.removeChild(cv);
    })(t0);
  }
  window.__confetti = confetti;

  /* ---------- 11. 页配音（可选） ----------
     约定：音频放在 audio/ ，文件名 P01.wav … P34.wav，对应第几页。
     .wav / .mp3 / .m4a 三种后缀都自动找；某页没有文件就静默跳过。
     右下角一个开关：配音默认开，关掉后翻页不再出声（教室音响不好时用）。
     元素上加 data-audio="audio/xxx.wav"，点击时单独播放（对话页用）。 */
  (function initAudio() {
    if (!AUDIO_ON) return;                    /* 配音已关闭 */
    if (/[?&]preview=/.test(location.search)) return;   // 演讲者预览里不显示
    var deck = document.querySelector('.deck');
    var slides = $$('.deck > .slide');
    if (!deck || !slides.length) return;

    var EXT = ['wav', 'mp3', 'm4a'];
    var cur = null, last = null;

    var bar = document.createElement('div');
    bar.className = 'deck-audio';
    bar.innerHTML = '<button class="da-toggle" type="button"></button>' +
                    '<button class="da-replay" type="button">♪ 重放本页</button>';
    document.body.appendChild(bar);
    var toggle = $('.da-toggle', bar);
    var replay = $('.da-replay', bar);

    var on = true;
    try { on = localStorage.getItem('rcm-sound') !== '0'; } catch (e) {}

    function paint() {
      toggle.textContent = on ? '🔊 配音 开' : '🔇 配音 关';
      bar.classList.toggle('off', !on);
    }
    paint();

    function stop() {
      if (cur) { try { cur.pause(); } catch (e) {} cur = null; }
    }
    function play(url) {
      if (!url) return;
      stop();
      var a = new Audio(url);
      cur = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    }
    function active() {
      for (var i = 0; i < slides.length; i++) {
        if (slides[i].classList.contains('is-active')) return slides[i];
      }
      return null;
    }
    function paintBadge() {
      var s = active();
      var has = !!(s && s.dataset.audioUrl);
      bar.classList.toggle('has', has);
      replay.disabled = !has;
    }
    function tick() {
      var s = active();
      if (s === last) return;
      last = s;
      stop();
      if (on && s && s.dataset.audioUrl) play(s.dataset.audioUrl);
      paintBadge();
    }

    /* 探测每一页有没有配音文件 */
    slides.forEach(function (s, i) {
      /* 挂 data-no-audio 的页不配音（第 3 页黑场要保持安静，放了文件也不播） */
      if (s.hasAttribute('data-no-audio')) return;
      var nn = ('0' + (i + 1)).slice(-2);
      var k = 0;
      (function probe() {
        if (k >= EXT.length) return;
        var url = 'audio/P' + nn + '.' + EXT[k++];
        var t = new Audio();
        t.preload = 'metadata';
        t.addEventListener('loadedmetadata', function () {
          s.dataset.audioUrl = url;
          last = null;
          tick();
        }, { once: true });
        t.addEventListener('error', probe, { once: true });
        t.src = url;
      })();
    });

    /* 浏览器要求先有过一次用户手势才允许出声，这里借第一次点击/按键解锁 */
    function unlock() {
      var a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAABAAgAZGF0YQAAAAA=');
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var el = e.target.closest('[data-audio]');
      if (el) { last = null; play(el.getAttribute('data-audio')); }
    });

    toggle.addEventListener('click', function () {
      on = !on;
      paint();
      try { localStorage.setItem('rcm-sound', on ? '1' : '0'); } catch (e) {}
      if (!on) { stop(); }
      else { last = null; tick(); }
    });
    replay.addEventListener('click', function () {
      var s = active();
      if (s && s.dataset.audioUrl) { stop(); play(s.dataset.audioUrl); }
    });

    new MutationObserver(tick).observe(deck, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    setInterval(tick, 400);
    tick();
  })();

  /* ---------- 调试：URL 带 ?draw=1 时，自动点一次当前页的铅笔 ---------- */
  if (location.search.indexOf('draw') > -1) {
    setTimeout(function () {
      var act = document.querySelector('.slide.is-active') || document.querySelector('.slide');
      var t = act && act.querySelector('[data-draw-go]');
      if (t && t.onclick) { t.onclick.call(t); }          /* 直接走内联那条通道 */
      else if (t) t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, 1200);
  }

  /* ---------- 调试：?cmtest=1 —— 像真人一样在第 8 页点一下 cm，结果写进 title ---------- */
  if (location.search.indexOf('cmtest') > -1) {
    setTimeout(function () {
      var svg = document.querySelector('svg[data-ruler-cm]');
      var out = [];
      if (!svg) { out.push('没有 cm 尺子'); } else {
        var cmk = svg.querySelector('.cm-mark');
        var q = cmk.getBoundingClientRect();
        var cx = q.left + q.width / 2, cy = q.top + q.height / 2;
        var el = document.elementFromPoint(cx, cy);
        out.push('点(' + Math.round(cx) + ',' + Math.round(cy) + ')命中=' +
          (el ? el.tagName.toLowerCase() + (el.getAttribute && el.getAttribute('class') ? '.' + el.getAttribute('class') : '') : 'null'));
        if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        var lab = null;
        $$('.seg-label', svg).forEach(function (n) { if (n.textContent === '厘米') lab = n; });
        out.push('厘米标签 on=' + (lab ? lab.classList.contains('on') : '无标签'));
        if (lab) {
          var bb = lab.getBBox(), vb = svg.viewBox.baseVal;
          out.push('标签墨迹 y=' + Math.round(bb.y) + '~' + Math.round(bb.y + bb.height) +
            '（画布高 ' + Math.round(vb.height) + '）');
        }
      }
      document.title = 'CMTEST ' + out.join(' ｜ ');
    }, 1500);
  }

  /* ---------- 调试：?vr=1 —— 直接把最后一页的 VR 打开（截图、检查排版用） ---------- */
  if (/[?&]vr=/.test(location.search)) {
    setTimeout(function () {
      var b = document.querySelector('[data-toggle=".vr-veil"]');
      if (b) b.click();
    }, 900);
  }

  /* ---------- 10-a. 第 2 页：点"接听" → 停铃声、显示"通话中"，随后自动翻到第 3 页（展馆里）---------- */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('[data-call-go]')) return;
    setTimeout(function () {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    }, 800);
  });

  /* ---------- 10-b. 第 2 页的来电铃声：翻到这一页就响，按接听/挂断停 ---------- */
  (function ringtone() {
    var call = document.querySelector('.call-slide');
    var au = call && call.querySelector('[data-ring]');
    if (!call || !au) return;
    var dismissed = false, lastActive = false, retryArmed = false;
    var isActive = function () { return call.classList.contains('is-active'); };
    var stop = function () { try { au.pause(); au.currentTime = 0; } catch (e) {} };
    var ring = function () {
      if (!isActive() || dismissed) return;
      au.currentTime = 0;
      var p = au.play();
      /* 浏览器要"用户手势"才让出声：第一次没放出来，就等他下一次按键/点鼠标再补一次 */
      if (p && p.catch) p.catch(function () { armRetry(); });
    };
    function armRetry() {
      if (retryArmed) return;
      retryArmed = true;
      var once = function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest('[data-ring-off]')) return;
        document.removeEventListener('keydown', once, true);
        document.removeEventListener('pointerdown', once, true);
        retryArmed = false;
        ring();
      };
      document.addEventListener('keydown', once, true);
      document.addEventListener('pointerdown', once, true);
    }
    /* 翻页时看这一页是不是当前页（回到这一页会重新响） */
    var mo = new MutationObserver(function () {
      var act = isActive();
      if (act && !lastActive) dismissed = false;
      lastActive = act;
      if (act && !dismissed) { if (au.paused) ring(); }
      else stop();
    });
    $$('.deck > .slide').forEach(function (s) {
      mo.observe(s, { attributes: true, attributeFilter: ['class'] });
    });
    /* 按接听/挂断 → 停止铃声 */
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-ring-off]')) {
        dismissed = true;
        stop();
      }
    });
  })();

  /* ---------- 11. VR 实景（第 34 页）：按住画面拖，把展馆转一圈 ---------- */
  $$('[data-vr-stage]').forEach(function (stage) {
    var pano = $('[data-vr-pano]', stage);
    if (!pano) return;
    var art = $$('.vr-art', pano);
    var compass = $('[data-vr-compass]', stage);
    var aspect = parseFloat(stage.getAttribute('data-vr-aspect')) || 4;
    var x = null, drag = false, lastX = 0, idle = 0;
    var HOME = 0.4083;                            /* 一开始正对中央横幅（横幅中心在 41% 处） */

    function tile() { return Math.max(1, stage.clientHeight * aspect); }  /* 一张全景在屏幕上的宽度 */
    function paint() {
      var t = tile();
      x = ((x % t) + t) % t;                      /* 绕成 0 … t，转一圈接得上 */
      pano.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
      if (compass) compass.textContent = Math.round((((x - t * HOME) % t) + t) % t / t * 360) + '°';
    }
    function layout() {
      var t = tile();
      pano.style.width = (t * 2) + 'px';           /* 放两张，转到头正好接上 */
      art.forEach(function (a) { a.style.width = t + 'px'; });
      if (x === null) x = t * HOME;
      paint();
    }
    layout();
    window.addEventListener('resize', layout);

    on(stage, 'pointerdown', function (e) {
      if (e.target.closest && e.target.closest('button')) return;
      drag = true; lastX = e.clientX; idle = 0;
      stage.classList.add('dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器没有就算了 */ }
      e.preventDefault();
    });
    on(stage, 'pointermove', function (e) {
      if (!drag) return;
      x -= (e.clientX - lastX);
      lastX = e.clientX;
      idle = 0;
      paint();
    });
    function endDrag() { drag = false; stage.classList.remove('dragging'); }
    on(stage, 'pointerup', endDrag);
    on(stage, 'pointercancel', endDrag);
    /* 这块画布是横向的，所以横着滚也能转（触控板两指左右滑） */
    stage.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !stage.classList.contains('on')) return;
      x -= e.deltaX; idle = 0; paint(); e.preventDefault();
    }, { passive: false });
    $$('[data-vr-step]', stage).forEach(function (b) {
      on(b, 'click', function () {
        x += (parseFloat(b.getAttribute('data-vr-step')) || 1) * tile() / 8;
        idle = 0;
        paint();
      });
    });
    /* 打开后没人动手，就自己慢慢转（约一秒 27px）—— 想停，拖一下就停 */
    setInterval(function () {
      if (!stage.classList.contains('on') || drag) return;
      idle++;
      if (idle > 20) { x += 1.1; paint(); }
    }, 40);
  });

  /* ---------- 调试浮层：URL 带 ?probe=1 时才出现 ---------- */
  if (location.search.indexOf('probe') > -1) {
    setTimeout(function () {
      var d = document.querySelector('.deck');
      var s = document.querySelector('.slide.is-active') || document.querySelector('.slide');
      if (!d || !s) return;
      var r = d.getBoundingClientRect(), sr = s.getBoundingClientRect();
      var box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#111;color:#7CFC00;' +
        'font:15px/1.5 monospace;padding:10px;white-space:pre;pointer-events:none';
      var lines = ['win ' + window.innerWidth + 'x' + window.innerHeight +
        '\ndeck ' + r.width.toFixed(0) + 'x' + r.height.toFixed(0) + ' @' + r.left.toFixed(0) + ',' + r.top.toFixed(0) +
        '\nslide ' + sr.width.toFixed(0) + 'x' + sr.height.toFixed(0) + ' @' + sr.left.toFixed(0) + ',' + sr.top.toFixed(0) +
        '\nscale ' + getComputedStyle(d).getPropertyValue('--deck-scale').trim() +
        '\nslides ' + document.querySelectorAll('.deck > .slide').length +
        '\n文档宽 ' + document.documentElement.scrollWidth + '／窗口 ' + document.documentElement.clientWidth +
        '（body ' + document.body.scrollWidth + '）｜当前页 ' + (function () {
          var a = document.querySelector('.slide.is-active');
          if (!a) return '无';
          var ar = a.getBoundingClientRect();
          return a.getAttribute('data-title') + ' @' + ar.left.toFixed(0) + ' 宽' + ar.width.toFixed(0);
        })()];
      var geo = function () {
        var a = document.querySelector('.slide.is-active');
        var ar = a ? a.getBoundingClientRect() : null;
        return 'deck左' + r.left.toFixed(1) + ' 宽' + r.width.toFixed(1) +
          '；页左' + (ar ? ar.left.toFixed(1) : '?') + ' 宽' + (ar ? ar.width.toFixed(1) : '?') +
          '；页transform ' + (a ? getComputedStyle(a).transform : '无') +
          '；页class「' + (a ? a.className : '') + '」父「' + (a && a.parentNode ? a.parentNode.className : '') + '」' +
          '；inline「' + (a ? a.getAttribute('style') : '') + '」' +
          '；is-active 共 ' + document.querySelectorAll('.slide.is-active').length + ' 个' +
          '；页数 ' + document.querySelectorAll('.deck > .slide').length;
      };
      setTimeout(function () {
        var b2 = document.createElement('div');
        b2.id = 'probe-geo';
        b2.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#111;color:#7CFC00;' +
          'font:15px/1.5 monospace;padding:8px;white-space:pre;pointer-events:none';
        b2.textContent = '几何@2.4s ' + geo();
        document.body.appendChild(b2);
      }, 2400);

      /* ?probe=1&test=1 —— 自动点一遍所有互动，检查接线是否正常 */
      if (location.search.indexOf('test') > -1) {
        var t = document.querySelector('[data-talk]');
        if (t) {
          t.querySelector('.ask').click();
          lines.push('talk: bubbles=' + t.querySelector('[data-stream]').children.length);
          var inp = t.querySelector('input');
          inp.value = '谢谢您';
          t.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
          lines.push('talk input: bubbles=' + t.querySelector('[data-stream]').children.length);
        }
        var svg = document.querySelector('[data-ruler]');
        if (svg) {
          lines.push('ruler: nums=' + svg.querySelectorAll('text').length +
            ' segs=' + svg.querySelectorAll('.ruler-seg').length);
          svg.querySelector('.ruler-seg').dispatchEvent(new MouseEvent('click', { bubbles: true }));
          lines.push('ruler seg on=' + svg.querySelector('.ruler-seg').classList.contains('on'));
        }
        var demo = document.querySelector('[data-ruler-demo]');
        if (demo) {
          demo.querySelector('.ruler-seg').dispatchEvent(new MouseEvent('click', { bubbles: true }));
          lines.push('demo answer on=' + (demo.querySelector('.seg-label').classList.contains('on')));
        }
        var sp = document.querySelector('[data-span]');
        if (sp) { sp.querySelector('.span-person').click(); lines.push('span marks=' + sp.querySelectorAll('.span-mark').length); }
        var pin = document.querySelector('[data-pinch]');
        if (pin) { pin.querySelector('[data-pinch-go]').click(); lines.push('pinch out=' + pin.querySelector('.stick-1cm').classList.contains('out')); }
        var mr = document.querySelector('.meas-ruler');
        if (mr) lines.push('dragRuler children=' + mr.children.length);
        var fl = document.querySelector('.flip');
        if (fl) { fl.click(); lines.push('flip on=' + fl.classList.contains('on')); }
        var ch = document.querySelector('.choice');
        if (ch) {
          ch.click();
          var cfb = ch.querySelector('.js-box');
          lines.push('choice picked=' + ch.classList.contains('picked') +
            ' stamp=' + ch.classList.contains('picked') +
            ' 卡片解释=' + (cfb ? cfb.classList.contains('on') : 'n/a'));
        }
        var tl = document.querySelector('[data-timeline]');
        if (tl) { tl.querySelector('.node').click(); lines.push('node on=' + tl.querySelector('.node').classList.contains('on')); }
        var dg = document.querySelector('[data-draw-go]');
        if (dg) { dg.click(); lines.push('draw clicked'); }
        var so = document.querySelector('[data-sort]');
        if (so) {
          so.querySelector('.sort-item').click();
          lines.push('sort placed=' + so.querySelectorAll('.sort-item.placed').length +
            ' inBin=' + so.querySelectorAll('.bin-body .sort-item').length);
        }
        var sw = document.querySelector('[data-switch]');
        if (sw) {
          var sb = sw.querySelectorAll('.sw-btn')[1];
          if (sb) sb.click();
          var act = sw.querySelector('.sw-panel.on');
          lines.push('switch active=' + (act ? act.getAttribute('data-sw-panel') : 'none'));
        }
        var ta = document.querySelector('[data-timeline-auto]');
        if (ta) lines.push('timelineAuto nodes=' + ta.querySelectorAll('.node').length);
        var pins = document.querySelectorAll('.ring,.ov');
        lines.push('rings/ovs=' + pins.length);
        /* 三选一的印章颜色：走不通＝红、他选了这个＝绿 */
        var sbad = document.querySelector('.choice:not(.ok) .stamp');
        var sgood = document.querySelector('.choice.ok .stamp');
        if (sbad && sgood) {
          lines.push('印章颜色：走不通 ' + getComputedStyle(sbad).backgroundColor +
            '；他选了这个 ' + getComputedStyle(sgood).backgroundColor);
        }
        /* 翻页笔：焦点落在按钮上时，PageDown 还能不能翻页 */
        var all = $$('.deck > .slide');
        var before = all.findIndex(function (s) { return s.classList.contains('is-active'); });
        var someBtn = document.querySelector('.deck button');
        if (someBtn) someBtn.focus();
        var focusOn = document.activeElement ? document.activeElement.tagName : '无';
        (document.activeElement || document.body)
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }));
        var after = $$('.deck > .slide').findIndex(function (s) { return s.classList.contains('is-active'); });
        window.__clickerTest = '翻页笔: 焦点在 ' + focusOn + ' 上按 PageDown → ' +
          (after === before + 1 ? '翻页正常（' + (before + 1) + '→' + (after + 1) + '）'
                                : '没翻页（' + (before + 1) + '→' + (after + 1) + '）');
        lines.push('情感底色=' + document.querySelectorAll('.deck > [data-mood]').length + ' 页' +
          '（' + Array.prototype.map.call(document.querySelectorAll('.deck > [data-mood]'), function (s) {
            return s.getAttribute('data-mood');
          }).join(',') + '）');
        lines.push('断尺=' + !!document.querySelector('.ruler-break') +
          ' 视频位=' + document.querySelectorAll('[data-video]').length +
          ' 尺子热区=' + document.querySelectorAll('svg[data-ruler-cm] rect[fill="transparent"]').length);
        /* 第 34 页的 VR 实景：画布多大、全景一张多宽、点一下能不能打开 */
        var vr = document.querySelector('[data-vr-stage]');
        if (vr) {
          var vtile = (parseFloat(vr.getAttribute('data-vr-aspect')) || 4) * vr.clientHeight;
          var vrBtn = (vr.closest('.slide') || document).querySelector('[data-toggle=".vr-veil"]');
          if (vrBtn) vrBtn.click();
          lines.push('VR 实景：画布 ' + Math.round(vr.clientWidth) + 'x' + Math.round(vr.clientHeight) +
            '；一张全景 ' + Math.round(vtile) + 'px（两张拼接）' +
            '；点开=' + vr.classList.contains('on') +
            '；手绘图=' + vr.querySelectorAll('use').length +
            '；方向=' + (vr.querySelector('[data-vr-compass]') || { textContent: '?' }).textContent);
        }
        /* 逐页看有没有内容溢出 1920×1080 画布（教室投影会切边） */
        var over = [];
        $$('.deck > .slide').forEach(function (s, i) {
          if (s.scrollHeight > s.clientHeight + 4 || s.scrollWidth > s.clientWidth + 4) {
            over.push('P' + (i + 1) + ' ' + s.scrollWidth + 'x' + s.scrollHeight);
          }
        });
        lines.push('溢出的页=' + (over.length ? over.join('、') : '无'));
        /* 上面那条只查"向下溢出"；居中排版的页上下都会被裁，scrollHeight 却看不出来。
           所以这里再量一次：把所有可见子元素的实际范围并起来，跟页面框比。 */
        var bad = [];
        var sc0 = parseFloat(getComputedStyle(d).getPropertyValue('--deck-scale')) || 1;
        $$('.deck > .slide').forEach(function (s, i) {
          var sr = s.getBoundingClientRect();
          var top = Infinity, bottom = -Infinity, sr0 = 0;
          $$(':scope > *', s).forEach(function (c) {
            var cs = getComputedStyle(c);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            var r = c.getBoundingClientRect();
            if (!r.width || !r.height) return;
            sr0++;
            top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom);
          });
          if (!sr0) return;
          var up = Math.round((top - sr.top) / sc0);
          var down = Math.round((bottom - sr.bottom) / sc0);
          if (up < -2 || down > 2) bad.push('P' + (i + 1) + '(上-' + Math.abs(up) + ' 下+' + down + ')');
        });
        lines.push('被裁的页=' + (bad.length ? bad.join('、') : '无'));
        /* 第 21 页辨一辨：点一下 √ / ×，整张卡片应当变色；顺便确认麦克风按钮已经没了 */
        var jud = document.querySelector('.deck .judge [data-toggle]');
        if (jud) {
          jud.click();
          var jc = jud.closest('.diag-card');
          lines.push('辨一辨：点一下「' + jud.textContent.trim() + '」→ 卡片 class「' +
            (jc ? jc.className : '?') + '」｜语音识别按钮 ' +
            document.querySelectorAll('.mic-btn').length + ' 个');
        }
        /* 字号体检：几条"应该很大"的标题，防止再被后面的通用规则盖小 */
        var fsOf = function (sel) {
          var n = document.querySelector(sel);
          return n ? Math.round(parseFloat(getComputedStyle(n).fontSize)) + 'px' : '（没有）';
        };
        lines.push('字号：P5 大标题 ' + fsOf('.big-head') + '｜P14 手指页标题 ' + fsOf('.finger-title') +
          '｜封面课题 ' + fsOf('.cover .h1') + '｜金句 ' + fsOf('.dark-line') +
          '｜第 5 页卡片小字 ' + fsOf('.choice p'));
      }
      box.textContent = lines.join('\n');
      document.body.appendChild(box);
      box.id = 'probe-box';
      setTimeout(function () {
        var got = $$('.deck > .slide').filter(function (s) { return !!s.dataset.audioUrl; });
        box.textContent += '\naudio pages=' + got.length +
          (got.length ? ' (' + got.map(function (s) { return s.dataset.audioUrl; }).join(',') + ')' : '');
        var photos = $$('.photo img, .photo-full img');
        var miss = photos.filter(function (i) { return i.classList.contains('miss'); });
        box.textContent += '\nphotos 真照片=' + (photos.length - miss.length) + '/' + photos.length +
          '（其余显示线描占位）';
        $$('[data-video] video').forEach(function (v) {
          var ok = !v.classList.contains('miss') && v.readyState >= 1;
          box.textContent += '\n视频: ' + (ok ? '就位 ' + v.videoWidth + 'x' + v.videoHeight +
            ' ' + (v.duration ? v.duration.toFixed(1) + 's' : '') : '未就位（readyState=' + v.readyState + '）');
        });
        if (window.__clickerTest) box.textContent += '\n' + window.__clickerTest;
        /* 画线段那一页：点了铅笔以后，线有没有长出来 */
        var dg2 = document.querySelector('[data-draw-go]');
        var ln2 = document.querySelector('.draw-line');
        if (dg2 && ln2) {
          var lr = ln2.getBoundingClientRect();
          var stage2 = ln2.closest('[data-draw]');
          var err = '';
          try {
            dg2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          } catch (e) { err = String(e && e.message); }
          var inline2 = ln2.style.width;
          box.textContent += '\n画线段：触发元素 <' + dg2.tagName.toLowerCase() + ' class="' +
            dg2.className + '">，线宽 ' + Math.round(lr.width) + 'px，' +
            (lr.width > 4 ? '已经在画了' : '还没动') +
            '；再点一次后 inline 宽度=' + (inline2 || '空') +
            '；同页 candies=' + (stage2 ? $('.candies', stage2).children.length : '?') +
            (err ? '；报错：' + err : '');
        }
        /* 端到端：翻到画线段那一页（会变成当前页），点铅笔，再量线宽 */
        var allSlides = $$('.deck > .slide');
        var dIdx = -1;
        allSlides.forEach(function (s, i) { if (s.querySelector('.draw-pencil')) dIdx = i; });
        if (dIdx >= 0) {
          location.hash = '#/' + (dIdx + 1);
          setTimeout(function () {
            var pg = document.querySelector('.draw-pencil');
            if (!pg) return;
            pg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            setTimeout(function () {
              var ln = allSlides[dIdx].querySelector('.draw-line');
              var r = ln.getBoundingClientRect();
              var cs = getComputedStyle(ln);
              var stg = ln.closest('[data-draw]');
              var csz2 = 0;
              try {
                stg.dispatchEvent(new CustomEvent('rcm-draw', { bubbles: true }));
                csz2 = ln.style.width ? parseFloat(ln.style.width) : 0;
              } catch (e3) { csz2 = 'err:' + e3.message; }
              var pc = allSlides[dIdx].querySelector('.draw-pencil');
              box.textContent += '\n画线段实拍：第 ' + (dIdx + 1) + ' 页（已翻到）点铅笔后线宽 ' +
                Math.round(r.width) + 'px → ' + (r.width > 20 ? '正常' : '没画出来') +
                '｜自定义事件后 inline=' + csz2 +
                '｜铅笔有 data-draw-go=' + (pc ? pc.hasAttribute('data-draw-go') : '无') +
                '｜stage有 data-draw=' + (stg ? stg.hasAttribute('data-draw') : '无') +
                '｜inline=' + (ln.style.width || '空') + '｜computed=' + cs.width +
                '｜display=' + cs.display + '｜offsetParent=' + (ln.offsetParent ? ln.offsetParent.className : 'null') +
                '｜slide.active=' + allSlides[dIdx].classList.contains('is-active') +
                '｜slideOpacity=' + getComputedStyle(allSlides[dIdx]).opacity;
            }, 1000);
          }, 500);
        }
        /* 版式实测（设计像素）：影像页的影像多大、顾方舟页的字多大 */
        var sc = parseFloat(getComputedStyle($('.deck')).getPropertyValue('--deck-scale')) || 1;
        var px = function (v) { return Math.round(v / sc); };
        var vEl = $('.deck [data-video]');
        if (vEl) {
          var list = $$('.deck > .slide');
          var at = list.indexOf(vEl.closest('.slide')) + 1;
          var vr = vEl.getBoundingClientRect();
          box.textContent += '\n影像页 P' + at + '：影像 ' + px(vr.width) + 'x' + px(vr.height) +
            '（左起 ' + px(vr.left) + '）';
        }
        var fp = $('.person-big');
        if (fp) {
          var g = function (sel) { var n = $(sel, fp); return n ? Math.round(parseFloat(getComputedStyle(n).fontSize)) : 0; };
          var pr = $('.photo', fp).getBoundingClientRect();
          box.textContent += '\n顾方舟页：人物 ' + px(pr.width) + 'x' + px(pr.height) +
            '；正文 ' + g('.lede') + 'px；提示 ' + g('.tap-hint') + 'px；金句 ' + g('.big-q') + 'px；图注 ' + g('.img-cap') + 'px';
        }
        /* 有抠像人像的那几页：图像框与人的实际尺寸 */
        $$('.person-fill .photo').forEach(function (n, i) {
          var r = n.getBoundingClientRect();
          var img = $('.ph-figure', n);
          var ir = img ? img.getBoundingClientRect() : null;
          box.textContent += '\n人像框 ' + (i + 1) + '：框 ' + px(r.width) + 'x' + px(r.height) +
            (ir ? '；人 ' + px(ir.width) + 'x' + px(ir.height) : '；人 无');
        });
        /* 尺子上的 cm 现在应该在 0 的右下角：报一下它的实际位置 */
        var cms = document.querySelectorAll('.deck .cm-mark');
        if (cms.length) {
          var svg0 = cms[0].ownerSVGElement;
          var vb = svg0.viewBox.baseVal;
          var cx = parseFloat(cms[0].getAttribute('x')) / vb.width * 100;
          var cy = parseFloat(cms[0].getAttribute('y')) / vb.height * 100;
          box.textContent += '\ncm 位置：' + cms.length + ' 把尺子都在 ' +
            cx.toFixed(1) + '% ,' + cy.toFixed(1) + '%（尺子宽高比 ' +
            Math.round(vb.width) + 'x' + Math.round(vb.height) + '）';
        }
        /* 第 8 页：点 0 刻度线变红、点数字出现红框、点段不再亮 */
        var r8 = document.querySelector('svg[data-ruler-noseg]');
        try {
        if (r8) {
          var zh = null, nh = null;
          var ch = null;
          $$('rect[fill="transparent"]', r8).forEach(function (h) {
            var w = parseFloat(h.getAttribute('width'));
            if (w > 0 && w < 60) zh = h;
            if (w > 60 && w < 200) ch = h;
            if (w > 1000) nh = h;
          });
          if (zh) zh.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          if (ch) ch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          if (nh) nh.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          box.textContent += '\n第8页尺子：0 刻度线变红=' + !!r8.querySelector('.tick-zero.zero-red') +
            '；数字被框住=' + !!r8.querySelector('.num-band.on') +
            '；点段不亮=' + (r8.querySelectorAll('.ruler-seg.on').length === 0) +
            '；亮着的说明字数=' + r8.querySelectorAll('.seg-label.on').length;
        }
        } catch (e) { box.textContent += '\n第8页尺子测试出错：' + (e && e.message); }
        /* 第 8 页：cm / 数字 / 0 三个热区的命中测试（看点下去有没有被别的东西挡住） */
        try {
          if (r8) {
            var hit = [];
            var probeAt = function (name, el) {
              if (!el) { hit.push(name + '：无元素'); return; }
              var q = el.getBoundingClientRect();
              var top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
              hit.push(name + '→ ' + (top ? top.tagName.toLowerCase() +
                (top.getAttribute && top.getAttribute('class') ? '.' + top.getAttribute('class') : '') : 'null'));
            };
            probeAt('cm 字', r8.querySelector('.cm-mark'));
            (function () {
              var c = r8.querySelector('.cm-mark');
              if (!c) return;
              var q = c.getBoundingClientRect();
              var b = document.elementFromPoint(q.left + q.width / 2, q.bottom + 6);
              var t = document.elementFromPoint(q.left - 8, q.top + q.height / 2);
              hit.push('cm 正下方→ ' + (b ? b.tagName.toLowerCase() +
                (b.getAttribute && b.getAttribute('class') ? '.' + b.getAttribute('class') : '') : 'null') +
                '；cm 左侧→ ' + (t ? t.tagName.toLowerCase() +
                (t.getAttribute && t.getAttribute('class') ? '.' + t.getAttribute('class') : '') : 'null'));
            })();
            probeAt('数字 5', Array.prototype.filter.call(r8.querySelectorAll('text'), function (t) {
              return t.textContent === '5';
            })[0]);
            probeAt('0 刻度', r8.querySelector('.tick-zero'));
            var zl2 = null, csay2 = null;
            $$('.seg-label', r8).forEach(function (n) {
              if (n.textContent === '厘米') csay2 = n;
              if (n.classList.contains('zero-label')) zl2 = n;
            });
            var rr = r8.getBoundingClientRect();
            var desc = function (n) {
              if (!n) return '无';
              var q = n.getBoundingClientRect();
              return px(q.width) + 'x' + px(q.height) + '（顶边距尺子顶 ' + px(q.top - rr.top) +
                '，底边距尺子底 ' + px(rr.bottom - q.bottom) + '）';
            };
            box.textContent += '\n第8页命中：' + hit.join('；') +
              '\n第8页标签：厘米 ' + desc(csay2) + '；0 刻度说明 ' + desc(zl2) +
              '；尺子高 ' + px(rr.height);
          }
        } catch (e8) { box.textContent += '\n第8页命中测试出错：' + (e8 && e8.message); }
        /* 第四站（认识几厘米）：一段一段点，看累加与标签 */
        var rc = document.querySelector('svg[data-ruler-count]');
        if (rc) {
          var segs = rc.querySelectorAll('.ruler-seg');
          [0, 1, 2].forEach(function (i) {
            if (segs[i]) segs[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
          });
          var lit = rc.querySelectorAll('.ruler-seg.on').length;
          var lab = rc.querySelector('.seg-label.on');
          box.textContent += '\n第四站累加：点了 3 段 → 亮 ' + lit + ' 段，标签「' +
            (lab ? lab.textContent : '无') + '」';
        }
        /* 第五站「说句话」：再点同一句要收回 */
        var asksAll = $$('.ask');
        if (asksAll.length) {
          box.textContent += '\n说句话问句：' + asksAll.length + ' 句（' +
            asksAll.map(function (b) {
              return b.getAttribute('data-ask') + '→' +
                (b.getAttribute('data-audio') || '').replace('audio/', '');
            }).join('、') + '）';
        }
        var tk = document.querySelector('[data-talk]');
        if (tk) {
          var st = tk.querySelector('[data-stream]');
          var ask = tk.querySelectorAll('.ask')[1];
          if (ask) {
            var n0 = st.children.length;
            ask.click();
            var n1 = st.children.length;
            ask.click();
            var n2 = st.children.length;
            box.textContent += '\n说句话：展开前 ' + n0 + ' → 点开 ' + n1 +
              ' → 再点收回 ' + n2 + '（' + (n2 === n0 ? '收回正常' : '没收回干净') + '）';
          }
        }
      }, 1500);
    }, 600);
  }
})();
