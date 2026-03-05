export interface PullyOptions {
  onRefresh?: () => Promise<void> | void;
  onRelease?: () => void;
  threshold?: number;
}

export declare class Pully {
  constructor(container: string | HTMLElement, options?: PullyOptions);
  destroy(): void;
  static version: string;
}

export default Pully;
