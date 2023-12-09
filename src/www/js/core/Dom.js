/* Dom.js
 */
 
import { Injector } from "./Injector.js";

export class Dom {
  static getDependencies() {
    return [Injector, Window, Document];
  }
  constructor(injector, window, document) {
    this.injector = injector;
    this.window = window;
    this.document = document;
    
    this.mutationObserver = new this.window.MutationObserver(e => this.onMutation(e));
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }
  
  /* (args) may contain:
   *   scalar => innerText (last one wins if multiple)
   *   array => classList
   *   object => attributes, plus {"on-EVENT":e=>...}
   */
  spawn(parent, tagName, ...args) {
    const element = this.document.createElement(tagName);
    for (const arg of args) {
      if (arg instanceof Array) {
        for (const cls of arg) element.classList.add(cls);
      } else if (arg && (typeof(arg) === "object")) {
        for (const k of Object.keys(arg)) {
          if (k.startsWith("on-")) {
            element.addEventListener(k.slice(3), arg[k]);
          } else {
            element.setAttribute(k, arg[k]);
          }
        }
      } else {
        element.innerText = arg;
      }
    }
    parent.appendChild(element);
    return element;
  }
  
  spawnController(parent, clazz, overrides) {
    const element = this.spawn(parent, this.tagNameForControllerClass(clazz));
    element.classList.add(clazz.name);
    if (overrides) overrides.push(element);
    else overrides = [element];
    const controller = this.injector.get(clazz, overrides);
    element.__controller = controller;
    return controller;
  }
  
  tagNameForControllerClass(clazz) {
    const htmlClassName = clazz.getDependencies?.().find(c => c.name.startsWith("HTML") && c.name.endsWith("Element"))?.name;
    if (!htmlClassName) return "DIV";
    switch (htmlClassName) { // It's tempting to just strip off "HTML" and "Element" and uppercase what's left, but that's not correct.
      case "HTMLCanvasElement": return "CANVAS";
      case "HTMLUListElement": return "UL";
      //TODO Add others as we discover the need for them.
    }
    return "DIV";
  }
  
  onMutation(records) {
    for (const record of records) {
      for (const element of record.removedNodes || []) {
        if (!element.__controller) continue;
        const controller = element.__controller;
        element.__controller = null;
        controller.element = null;
        controller.onRemoveFromDom?.();
      }
    }
  }
}

Dom.singleton = true;
