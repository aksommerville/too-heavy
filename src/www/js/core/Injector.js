/* Injector.js
 */
 
export class Injector {
  static getDependencies() { // Not used, just setting a good example;
    return [Window];
  }
  constructor(window) {
    this.window = window;
    this.singletons = {
      Window: window,
      Document: window.document,
      Injector: this,
    };
    this.inProgress = [];
    this.discriminator = 1;
  }
  
  get(clazz, overrides) {
    switch (clazz) { // Some magic injectable non-instance things.
      case "discriminator": return this.discriminator++;
    }
    if (overrides) {
      const instance = overrides.find(o => ((o.constructor === clazz) || clazz.isPrototypeOf(o.constructor)));
      if (instance) return instance;
    }
    let instance = this.singletons[clazz.name];
    if (instance) return instance;
    if (this.inProgress.indexOf(clazz.name) >= 0) {
      throw new Error(`Dependency loop involving these classes: ${JSON.stringify(this.inProgress)}`);
    }
    this.inProgress.push(clazz.name);
    const depClasses = clazz.getDependencies?.() || [];
    const deps = depClasses.map(cls => this.get(cls, overrides));
    instance = new clazz(...deps);
    const p = this.inProgress.indexOf(clazz.name);
    if (p >= 0) this.inProgress.splice(p, 1);
    if (clazz.singleton) this.singletons[clazz.name] = instance;
    return instance;
  }
}

// Not used, just setting a good example.
Injector.singleton = true;
