import { GraphQLClient } from 'graphql-request';

export const getGraphQLClient = async () => {
  const port = (window as any).electronAPI
    ? await (window as any).electronAPI.getBackendPort()
    : 3001;
  const endpoint = `http://localhost:${port}/graphql`;
  return new GraphQLClient(endpoint, { headers: {} });
};

export const handleGraphQLError = (error: any) => {
  console.error('GraphQL Error:', error);
  throw new Error(error.message || 'GraphQL request failed');
};
