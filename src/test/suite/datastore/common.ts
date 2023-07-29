import { Datastore, RawDatastore, RawData } from '../../../datastore/datastore';

export function createMockDatastore(...uris: string[]): Datastore {
  const mockRawDatastore = createMockRawDatastore(...uris);
  return new Datastore(mockRawDatastore);
}

export function createMockRawDatastore(...uris: string[]): RawDatastore {
  let store = uris.length
    ? <RawData>Object.fromEntries(uris.map((uri) => [uri, {}]))
    : undefined;
  return {
    get: () => store,
    setAsync: (state?: RawData) => {
      store = state;
    },
  };
}
