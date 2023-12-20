/* ResizeModal.js
 * Prompts to resize a map.
 * Does not communicate with MapPaintService.
 */
 
import { Dom } from "../core/Dom.js";

export class ResizeModal {
  static getDependencies() {
    return [HTMLElement, Dom];
  }
  constructor(element, dom) {
    this.element = element;
    this.dom = dom;
    
    this.onCommit = (w, h, anchor) => {}; // Caller should replace.
    
    this.pvw = 0;
    this.pvh = 0;
    
    this.buildUi();
    this.element.querySelector("input[name='w']").focus();
  }
  
  setup(w, h) {
    this.pvw = w;
    this.pvh = h;
    this.populateUi();
  }
  
  buildUi() {
    this.element.innerHTML = "";
    const form = this.dom.spawn(this.element, "FORM", { "on-submit": e => this.onSubmit(e) });
    
    const dimRow = this.dom.spawn(form, "DIV");
    this.dom.spawn(dimRow, "INPUT", { type: "number", name: "w" });
    this.dom.spawn(dimRow, "SPAN", "x");
    this.dom.spawn(dimRow, "INPUT", { type: "number", name: "h" });
    
    const anchorTable = this.dom.spawn(form, "TABLE");
    let tr = this.dom.spawn(anchorTable, "TR");
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "128", checked: "checked" });
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "64" });
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "32" });
    tr = this.dom.spawn(anchorTable, "TR");
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "16" });
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "0" });
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "8" });
    tr = this.dom.spawn(anchorTable, "TR");
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "4" });
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "2" });
    this.dom.spawn(this.dom.spawn(tr, "TD"), "INPUT", { type: "radio", name: "anchor", value: "1" });
    
    this.dom.spawn(form, "INPUT", { type: "submit", value: "OK" });
  }
  
  populateUi() {
    this.element.querySelector("input[name='w']").value = this.pvw;
    this.element.querySelector("input[name='h']").value = this.pvh;
  }
  
  onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    const w = +this.element.querySelector("input[name='w']").value;
    const h = +this.element.querySelector("input[name='h']").value;
    const anchor = +this.element.querySelector("input[name='anchor']:checked").value;
    this.onCommit(w, h, anchor);
    this.dom.dismissModalByController(this);
  }
}
