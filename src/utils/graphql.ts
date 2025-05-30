import { GraphQLClient } from 'graphql-request';

export const getGraphQLClient = async () => {
  const port = (window as any).electronAPI
    ? await (window as any).electronAPI.getBackendPort()
    : 3001;
  const endpoint = `http://localhost:${port}/graphql`;
  return new GraphQLClient(endpoint, { headers: {} });
};
