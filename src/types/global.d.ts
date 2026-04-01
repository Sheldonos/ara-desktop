import type { AraAPI } from "../preload/preload";

declare global {
  interface Window {
    ara: AraAPI;
  }
}

export {};
