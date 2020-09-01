import { statesRegion } from '../constants';

export const getRegion = (state: string): number => {
  const regFound = statesRegion.find((reg) => reg.state === state.trim());
  return regFound ? regFound.region : 1;
};
