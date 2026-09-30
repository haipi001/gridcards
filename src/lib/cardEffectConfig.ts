export type StoredCardEffectConfig = {
  mode: 'flat' | 'relief';
  profile: string;
  foil?: number;
  reflection?: number;
  autoRotate?: boolean;
  generatedLayers?: {
    subject?: string;
    background?: string;
    text?: string;
    lineart?: string;
    effects?: string;
  };
};
