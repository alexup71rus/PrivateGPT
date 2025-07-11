import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

async function getBackendPort(): Promise<number> {
  return (window as any).electronAPI
    ? await (window as any).electronAPI.getBackendPort()
    : 3001;
}

async function createApolloClient() {
  const port = await getBackendPort();
  const httpUrl = `http://localhost:${port}/graphql`;
  const wsUrl = `ws://localhost:${port}/graphql`;

  const httpLink = new HttpLink({
    uri: httpUrl,
    headers: {},
  });

  const wsLink = new GraphQLWsLink(
    createClient({
      url: wsUrl,
      connectionParams: () => ({}),
      shouldRetry: () => true,
    }),
  );

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink,
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
    },
  });
}

export default createApolloClient;
