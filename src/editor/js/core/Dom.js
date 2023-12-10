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
    
    // We listen for the Escape key, to dismiss modals.
    this.keyDownListener = event => this.onKeyDown(event);
    this.window.addEventListener("keydown", this.keyDownListener);
    
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
  
  spawnModal(clazz, overrides) {
    const container = this.requireModalBlotter();
    const modal = this.spawn(container, "DIV", ["modal"]);
    const controller = this.spawnController(modal, clazz, overrides);
    return controller;
  }
  
  dismissAllModals() {
    for (const container of this.document.querySelectorAll(".modalContainer")) {
      container.remove();
    }
    this.document.querySelector(".modalBlotter")?.remove();
  }
  
  dismissModalByController(controller) {
    const modal = this.document.querySelector(`.modalContainer > .modal > .${controller.constructor.name}`);
    if (!modal) return false;
    const container = modal.parentNode.parentNode;
    container.remove();
    this.adjustModalBlotterPosition();
  }
  
  dismissTopModal() {
    const containers = Array.from(this.document.querySelectorAll(".modalContainer"));
    if (!containers.length) return false;
    containers[containers.length - 1].remove();
    this.adjustModalBlotterPosition();
    return true;
  }
  
  findModalByControllerClass(cls) {
    const modal = this.document.querySelector(`.modalContainer > .modal > .${cls.name}`);
    if (!modal) return null;
    return modal.__ra_controller;
  }
  
  requireModalBlotter() {
    let blotter = this.document.querySelector(".modalBlotter");
    if (blotter) {
      this.document.body.insertBefore(blotter, null); // move to top
    } else {
      blotter = this.spawn(this.document.body, "DIV", ["modalBlotter"], { "on-click": () => this.dismissTopModal() });
    }
    const container = this.spawn(this.document.body, "DIV", ["modalContainer"]);
    return container;
  }
  
  adjustModalBlotterPosition() {
    const blotter = this.document.querySelector(".modalBlotter");
    if (!blotter) return;
    const containers = Array.from(this.document.querySelectorAll(".modalContainer"));
    if (containers.length > 0) {
      this.document.body.insertBefore(blotter, containers[containers.length - 1]);
    } else {
      blotter.remove();
    }
  }
  
  onKeyDown(e) {
    if (e.code !== "Escape") return;
    if (this.dismissTopModal()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
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
        this.notifyRemovalRecursively(element);
      }
    }
  }
  
  notifyRemovalRecursively(parent) {
    if (parent.childNodes) {
      for (let i=parent.childNodes.length; i-->0; ) {
        this.notifyRemovalRecursively(parent.childNodes[i]);
      }
    }
    if (parent.__controller) {
      const controller = parent.__controller;
      parent.__controller = null;
      controller.element = null;
      controller.onRemoveFromDom?.();
    }
  }
}

Dom.singleton = true;
