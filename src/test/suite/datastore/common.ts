import { Datastore, RawDatastore, RawData } from '../../../datastore/datastore';

export function createMockDatastore(...uris: string[]): Datastore {
  const mockRawDatastore = createMockRawDatastore(...uris);
  return new Datastore(mockRawDatastore);
}

export function createMockRawDatastore(...uris: string[]): RawDatastore {
  let store = uris.length
    ? Object.fromEntries(uris.map((uri) => [uri, {}])) as RawData
    : undefined;
  return {
    get: () => store,
    setAsync: (state?: RawData) => {
      store = state;
    },
  };
}
