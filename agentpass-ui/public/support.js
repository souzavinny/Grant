// Minimal runtime for the design-canvas export format (.dc.html) used by the
// Grant prototype and brand pages, so they run standalone with no external
// tooling. Interprets: {{ path }} bindings in text and attributes, <sc-if>,
// <sc-for>, onClick/onChange handler bindings, style-hover, input value
// binding, and a component class defined in <script type="text/x-dc"> whose
// renderVals() supplies the template scope.
//
// SPDX-License-Identifier: Apache-2.0

(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
  const dcScript = document.querySelector('script[type="text/x-dc"][data-dc-script]');
  if (!dcScript) return; // static page (e.g. brand.html) — CSS animations only

  // ----------------------------------------------------------------- base
  let scheduleRender = () => {};

  class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(patch) {
      const next = typeof patch === 'function' ? patch(this.state) : patch;
      Object.assign(this.state, next);
      scheduleRender();
    }
  }

  // Props defaults from the data-props metadata
  const props = {};
  try {
    const meta = JSON.parse(dcScript.dataset.props || '{}');
    for (const key of Object.keys(meta)) props[key] = meta[key].default;
  } catch {
    /* no props */
  }

  // Evaluate the component class with DCLogic in scope
  const ComponentClass = new Function('DCLogic', `${dcScript.textContent}\n;return Component;`)(DCLogic);

  const root = document.querySelector('x-dc') || document.body;
  const template = root.cloneNode(true);
  template.querySelectorAll('script').forEach((s) => s.remove());

  // ------------------------------------------------------------ resolution
  const MUSTACHE = /\{\{\s*([^}]+?)\s*\}\}/g;

  const resolvePath = (scope, rawPath) => {
    const path = rawPath.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    let cur = scope;
    for (const part of path.split('.')) {
      if (cur == null) return undefined;
      cur = cur[part];
    }
    return cur;
  };

  const stripMustache = (value) => {
    const match = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(value || '');
    return match ? match[1] : value || '';
  };

  const interpolate = (text, scope) =>
    text.replace(MUSTACHE, (_, path) => {
      const value = resolvePath(scope, path);
      return value == null ? '' : String(value);
    });

  // --------------------------------------------------------------- render
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const EVENT_MAP = { onclick: 'click', onchange: 'input', oninput: 'input', onsubmit: 'submit' };

  function buildChildren(source, scope, target, inSvg) {
    for (const child of source.childNodes) buildNode(child, scope, target, inSvg);
  }

  function buildNode(node, scope, target, inSvg) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(interpolate(node.nodeValue, scope)));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();

    if (tag === 'sc-if') {
      if (resolvePath(scope, stripMustache(node.getAttribute('value')))) {
        buildChildren(node, scope, target, inSvg);
      }
      return;
    }
    if (tag === 'sc-for') {
      const list = resolvePath(scope, stripMustache(node.getAttribute('list'))) || [];
      const alias = node.getAttribute('as') || 'item';
      list.forEach((item, index) => {
        const childScope = Object.create(scope);
        childScope[alias] = item;
        childScope[`${alias}Index`] = index;
        buildChildren(node, childScope, target, inSvg);
      });
      return;
    }
    if (tag === 'script') return;

    const svg = inSvg || tag === 'svg';
    const el = svg ? document.createElementNS(SVG_NS, node.tagName) : document.createElement(tag);

    for (const attr of node.attributes) {
      const name = attr.name;
      const lower = name.toLowerCase();
      if (lower.startsWith('hint-')) continue;

      if (lower in EVENT_MAP) {
        const handler = resolvePath(scope, stripMustache(attr.value));
        if (typeof handler === 'function') el.addEventListener(EVENT_MAP[lower], (event) => handler(event));
        continue;
      }
      if (lower === 'style-hover') {
        const hoverStyle = interpolate(attr.value, scope);
        el.addEventListener('mouseenter', () => {
          el.dataset.baseStyle = el.getAttribute('style') || '';
          el.setAttribute('style', `${el.dataset.baseStyle};${hoverStyle}`);
        });
        el.addEventListener('mouseleave', () => {
          el.setAttribute('style', el.dataset.baseStyle || '');
        });
        continue;
      }
      const value = interpolate(attr.value, scope);
      if (lower === 'value' && (tag === 'input' || tag === 'textarea')) {
        el.value = value;
        continue;
      }
      el.setAttribute(name, value);
    }

    buildChildren(node, scope, el, svg);
    target.appendChild(el);
  }

  const focusKey = (el) =>
    el && (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name'));

  function render() {
    const scope = instance.renderVals();
    const fragment = document.createDocumentFragment();
    buildChildren(template, scope, fragment, false);

    // Preserve focus + caret across the rebuild (e.g. the search input)
    const active = document.activeElement;
    const key = focusKey(active);
    const caret = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;

    root.replaceChildren(fragment);

    if (key) {
      const candidates = root.querySelectorAll('input, textarea, button, select, [tabindex]');
      for (const candidate of candidates) {
        if (focusKey(candidate) === key) {
          candidate.focus({ preventScroll: true });
          if (caret != null && typeof candidate.setSelectionRange === 'function') {
            candidate.setSelectionRange(caret, caret);
          }
          break;
        }
      }
    }
  }

  let pending = null;
  scheduleRender = () => {
    if (pending != null) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      render();
    });
  };

  const instance = new ComponentClass(props);
  render();
  if (typeof instance.componentDidMount === 'function') instance.componentDidMount();
  }
})();
