/* ui/morph: Updating the page in place without rebuilding it. */

/* update the page in place: only the parts that changed are replaced, so glass panels are not rebuilt */
export function morph(el, html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  morphKids(el, t.content);
}
export function morphKids(a, b) {
  const X = [...a.childNodes],
    Y = [...b.childNodes];
  for (let i = 0; i < Math.max(X.length, Y.length); i++) {
    const an = X[i],
      bn = Y[i];
    if (!bn) {
      an.remove();
      continue;
    }
    if (!an) {
      a.appendChild(bn);
      continue;
    }
    /* a form box that is still the same box (same kind, same id) is updated, not swapped: swapping one throws the
       cursor out of it, which fires its change event in the middle of the redraw */
    if (sameBox(an, bn)) {
      syncBox(an, bn);
      continue;
    }
    if (
      an.nodeType != bn.nodeType ||
      an.nodeName != bn.nodeName ||
      /^(INPUT|SELECT|TEXTAREA|CANVAS|VIDEO|IFRAME)$/.test(an.nodeName)
    ) {
      a.replaceChild(bn, an);
      continue;
    }
    if (an.nodeType != 1) {
      if (an.nodeValue !== bn.nodeValue) an.nodeValue = bn.nodeValue;
      continue;
    }
    if (an.isEqualNode(bn)) continue;
    /* something drawn by a library (the live map) is left exactly as it is */
    if (an.id && an.id == bn.id && an.hasAttribute('data-keep')) continue;
    [...an.attributes].forEach((x) => {
      if (!bn.hasAttribute(x.name)) an.removeAttribute(x.name);
    });
    [...bn.attributes].forEach((x) => {
      if (an.getAttribute(x.name) !== x.value) an.setAttribute(x.name, x.value);
    });
    morphKids(an, bn);
  }
}
const BOX = /^(INPUT|SELECT|TEXTAREA)$/;
const sameBox = (an, bn) =>
  an.nodeType == 1 &&
  bn.nodeType == 1 &&
  BOX.test(an.nodeName) &&
  an.nodeName == bn.nodeName &&
  (an.getAttribute('type') || '') == (bn.getAttribute('type') || '') &&
  (an.id || '') == (bn.id || '') &&
  (an.getAttribute('name') || '') == (bn.getAttribute('name') || '');
/* bring a form box up to date: its attributes and options always; its value too, unless someone is typing in it */
function syncBox(an, bn) {
  [...an.attributes].forEach((x) => {
    if (!bn.hasAttribute(x.name)) an.removeAttribute(x.name);
  });
  [...bn.attributes].forEach((x) => {
    if (an.getAttribute(x.name) !== x.value) an.setAttribute(x.name, x.value);
  });
  if (an.nodeName == 'SELECT') {
    if (an.innerHTML != bn.innerHTML) an.innerHTML = bn.innerHTML;
    const i = [...bn.options].findIndex((o) => o.hasAttribute('selected'));
    if (document.activeElement !== an) an.selectedIndex = Math.max(0, i);
    return;
  }
  if (document.activeElement === an) return;
  if (an.type == 'checkbox' || an.type == 'radio') an.checked = bn.hasAttribute('checked');
  else if (an.nodeName == 'TEXTAREA') an.value = bn.textContent;
  else an.value = bn.getAttribute('value') ?? '';
}
