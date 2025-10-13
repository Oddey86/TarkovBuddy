const API_URL = "https://api.tarkov.dev/graphql";
const FETCH_TIMEOUT_MS = 15000;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "request"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${label} took > ${ms / 1000}s`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function gql<T>(query: string): Promise<T> {
  const response = await withTimeout(
    fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    }),
    FETCH_TIMEOUT_MS,
    "GraphQL"
  );

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`GraphQL ${response.status}: ${text}`);
  }

  const json: GraphQLResponse<T> = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(JSON.stringify(json.errors));
  }

  if (!json.data) {
    throw new Error("No data returned from GraphQL");
  }

  return json.data;
}

export const QUERIES = {
  TASKS: `
    query {
      tasks {
        id name minPlayerLevel kappaRequired
        trader { name }
        objectives {
          __typename
          id type maps { name } description
          ... on TaskObjectiveItem {
            item { id name iconLink }
            items { id name iconLink }
            count
            foundInRaid
          }
        }
        taskRequirements { task { id } }
        neededKeys { keys { id name } }
      }
    }
  `,

  HIDEOUT: `
    query {
      hideoutStations {
        id
        name
        levels {
          level
          itemRequirements {
            item { id name iconLink }
            count
          }
        }
      }
    }
  `,
};

export async function fetchAllQuests() {
  const data = await gql<{ tasks: any[] }>(QUERIES.TASKS);
  return data.tasks;
}
