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
  
  load(url) {
    const image = new Image();
    return new Promise((resolve, reject) => {
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (e) => reject(`${url}: Failed to load image`));
      image.src = url;
    });
  }
  
}

ImageService.singleton = true;
