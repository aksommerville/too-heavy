/* ScrollList.js
 */
 
import { Dom } from "../core/Dom.js";

export class ScrollList {
  static getDependencies() {
    return [HTMLElement, Dom];
  }
  constructor(element, dom) {
    this.element = element;
    this.dom = dom;
    
    this.cbClick = (key) => {}; // Owner should replace.
    
    this.element.addEventListener("click", e => this.onClick(e));
    
    this.buildUi();
  }
  
  addItem(key, label) {
    this.dom.spawn(this.element, "DIV", ["row"], { "data-key": key }, label);
  }
  
  removeItem(key) {
    const element = this.element.querySelector(`.row[data-key='${key}']`);
    if (element) {
      element.remove();
    }
  }
  
  clear() {
    this.element.innerHTML = "";
  }
  
  highlightItem(key) {
    for (const element of this.element.querySelectorAll(".row.highlight")) element.classList.remove("highlight");
    if (key) {
      const element = this.element.querySelector(`.row[data-key='${key}']`);
      if (element) {
        element.classList.add("highlight");
      }
    }
  }
  
  getHighlightedKey() {
    const element = this.element.querySelector(".row.highlight");
    if (element) return element.getAttribute("data-key");
    return null;
  }
  
  buildUi() {
    this.element.innerHTML = "";
  }
  
  onClick(event) {
    if (!event?.target?.classList.contains("row")) return;
    this.cbClick(event.target.getAttribute("data-key"));
  }
}
