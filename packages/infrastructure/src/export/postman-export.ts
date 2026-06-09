import type { ApiEndpoint } from '@arweb/domain';

interface PostmanUrl {
  raw: string;
  host: string[];
  path: string[];
  variable?: { key: string; value: string }[];
}

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: { key: string; value: string }[];
    url: PostmanUrl;
    description?: string;
  };
}

export function endpointsToPostmanCollection(
  collectionName: string,
  endpoints: ApiEndpoint[],
): string {
  const items: PostmanItem[] = endpoints.map((ep) => {
    const pathSegments = ep.path.split('/').filter(Boolean);

    // Convert {param} → :param for Postman URL variables
    const pathVars = pathSegments
      .filter((s) => s.startsWith('{') && s.endsWith('}'))
      .map((s) => ({ key: s.slice(1, -1), value: '' }));

    const postmanPath = pathSegments.map((s) =>
      s.startsWith('{') && s.endsWith('}') ? `:${s.slice(1, -1)}` : s,
    );

    return {
      name: `${ep.method} ${ep.path}`,
      request: {
        method: ep.method,
        header: [{ key: 'Content-Type', value: 'application/json' }],
        url: {
          raw: `{{baseUrl}}/${postmanPath.join('/')}`,
          host: ['{{baseUrl}}'],
          path: postmanPath,
          ...(pathVars.length ? { variable: pathVars } : {}),
        },
        ...(ep.summary ? { description: ep.summary } : {}),
      },
    };
  });

  const collection = {
    info: {
      name: collectionName,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
    variable: [{ key: 'baseUrl', value: 'http://localhost', type: 'string' }],
  };

  return JSON.stringify(collection, null, 2);
}
