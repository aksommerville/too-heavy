/* ImageService.js
 * Don't use generic Comm facilities for loading images; they're a special case for browsers.
 */
 
export class ImageService {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
  }
  
  load(rid) {
    return new Promise((resolve, reject) => {
      const image = this.window.document.querySelector(`img[data-rid='${rid}']`);
      if (image) resolve(image);
      else reject(`image ${rid} not found`);
    });
  }
  
}

ImageService.singleton = true;
