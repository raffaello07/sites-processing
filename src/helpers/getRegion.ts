import { statesRegion } from 'src/constants';

export const getRegion = (state: string): number =>
  statesRegion.find((reg) => reg.state === state).region || 1;
