const API = "https://api.tarkov.dev/graphql";
const FETCH_TIMEOUT_MS = 15000;

export interface HideoutItem {
  id: string;
  name: string;
  iconLink?: string;
}

export interface ItemRequirement {
  item: HideoutItem;
  count: number;
}

export interface HideoutLevel {
  level: number;
  itemRequirements: ItemRequirement[];
}

export interface HideoutStation {
  id: string;
  name: string;
  levels: HideoutLevel[];
}

const Q_HIDEOUT = `
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
}`;

function withTimeout(promise: Promise<any>, ms: number, label = "request") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} took > ${ms / 1000}s`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function gql(query: string) {
  const res = await withTimeout(
    fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    }),
    FETCH_TIMEOUT_MS,
    "GraphQL"
  ) as Response;

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`GraphQL ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(JSON.stringify(json.errors));
  }

  return json.data;
}

export async function loadHideoutStations() {
  const data = await gql(Q_HIDEOUT);
  return (data?.hideoutStations || []) as HideoutStation[];
}

export function keyFor(stationId: string, level: number, itemId: string) {
  return `${stationId}:${level}:${itemId}`;
}

export function levelKey(stationId: string, level: number) {
  return `${stationId}:${level}`;
}

export function isCurrency(itemName: string) {
  const lower = itemName.toLowerCase();
  return (
    lower.includes('rouble') ||
    lower.includes('euro') ||
    lower.includes('dollar') ||
    lower === 'roubles' ||
    lower === 'euros' ||
    lower === 'dollars'
  );
}
