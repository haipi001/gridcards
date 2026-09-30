export type CardEffectMode = 'flat' | 'relief';

export type CardEffectProfile =
  | 'original'
  | 'pearl'
  | 'silver'
  | 'gold'
  | 'refractor'
  | 'rainbow'
  | 'custom';

export type ReliefAssets = {
  subject: string;
  background: string;
  text?: string;
  lineart?: string;
  effects?: string;
};

export type CardEffectsViewerProps = {
  frontUrl: string;
  backUrl?: string | null;
  mode?: CardEffectMode;
  effect?: CardEffectProfile;
  reliefAssets?: ReliefAssets;
  interactive?: boolean;
  allowFlip?: boolean;
  autoRotate?: boolean;
  quality?: 'low' | 'medium' | 'high';
  className?: string;
};
