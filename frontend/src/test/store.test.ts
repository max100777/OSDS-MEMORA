import { beforeEach, describe, expect, it } from 'vitest';
import { useSimulationStore } from '../store/simulation';

describe('simulation store', () => {
  beforeEach(() => useSimulationStore.getState().reset());
  it('resets shared results', () => {
    expect(useSimulationStore.getState().simulation).toBeNull();
    expect(useSimulationStore.getState().comparison).toBeNull();
  });
});
