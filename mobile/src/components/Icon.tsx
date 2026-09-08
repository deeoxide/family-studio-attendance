import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** Line icons ported 1:1 from the prototype's inline SVG path data. */
export const ICONS = {
  clock: 'M12 6v6l4 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  calendar: 'M8 2v4M16 2v4M3 9h18M5 5h14v16H5z',
  card: 'M2 7h20v10H2zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
  person: 'M20 21a8 8 0 0 0-16 0M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  people: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.87',
  checklist: 'M9 11l3 3 7-7M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  check: 'M20 6 9 17l-5-5',
  chevronRight: 'm9 18 6-6-6-6',
  chevronLeft: 'm15 18-6-6 6-6',
} as const;

export function Icon({ name, size = 20, color = '#201f1d' }: { name: keyof typeof ICONS; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICONS[name]} />
    </Svg>
  );
}
