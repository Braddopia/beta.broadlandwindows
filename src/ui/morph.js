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
    [...an.attributes].forEach((x) => {
      if (!bn.hasAttribute(x.name)) an.removeAttribute(x.name);
    });
    [...bn.attributes].forEach((x) => {
      if (an.getAttribute(x.name) !== x.value) an.setAttribute(x.name, x.value);
    });
    morphKids(an, bn);
  }
}
