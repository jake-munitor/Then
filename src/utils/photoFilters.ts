export const PHOTO_FILTER_VALUES = ['normal', 'classic', 'sunfade', 'coolFlash'] as const;

export type PhotoFilter = (typeof PHOTO_FILTER_VALUES)[number];

export type PhotoFilterOption = {
  value: PhotoFilter;
  label: string;
  swatch: {
    backgroundColor: string;
    accentColor: string;
    borderColor: string;
  };
};

export const PHOTO_FILTER_OPTIONS: PhotoFilterOption[] = [
  {
    value: 'normal',
    label: 'Normal',
    swatch: {
      backgroundColor: '#DDD1BF',
      accentColor: '#FFFDF7',
      borderColor: '#B5A792',
    },
  },
  {
    value: 'classic',
    label: 'Classic',
    swatch: {
      backgroundColor: '#E7C98E',
      accentColor: '#A14F38',
      borderColor: '#CDA565',
    },
  },
  {
    value: 'sunfade',
    label: 'Sunfade',
    swatch: {
      backgroundColor: '#F0D8B8',
      accentColor: '#EAA76D',
      borderColor: '#D6B48E',
    },
  },
  {
    value: 'coolFlash',
    label: 'Cool flash',
    swatch: {
      backgroundColor: '#CBDDDD',
      accentColor: '#517789',
      borderColor: '#9CB8BA',
    },
  },
];

export function normalizePhotoFilter(value: unknown): PhotoFilter {
  if (typeof value !== 'string') return 'normal';
  return PHOTO_FILTER_VALUES.includes(value as PhotoFilter) ? (value as PhotoFilter) : 'normal';
}
