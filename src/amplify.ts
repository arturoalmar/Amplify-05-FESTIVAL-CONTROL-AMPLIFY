import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { type EventStatus, type FestivalEvent } from './data';

type FestivalEventApi = {
  id: string;
  artist: string;
  space: string;
  time: string;
  status: EventStatus;
};

let clientInternal: any = null;
let configured = false;

const listQuery = `
  query ListFestivalEvents {
    listFestivalEvents {
      items {
        id
        artist
        space
        time
        status
      }
    }
  }
`;

const createMutation = `
  mutation CreateFestivalEvent($input: CreateFestivalEventInput!) {
    createFestivalEvent(input: $input) {
      id
      artist
      space
      time
      status
    }
  }
`;

const updateMutation = `
  mutation UpdateFestivalEvent($input: UpdateFestivalEventInput!) {
    updateFestivalEvent(input: $input) {
      id
      artist
      space
      time
      status
    }
  }
`;

const deleteMutation = `
  mutation DeleteFestivalEvent($input: DeleteFestivalEventInput!) {
    deleteFestivalEvent(input: $input) {
      id
      artist
      space
      time
      status
    }
  }
`;

function normalizeEvent(item: Partial<FestivalEventApi> | null | undefined): FestivalEvent | null {
  if (!item || !item.id || !item.artist || !item.space || !item.time || !item.status) {
    return null;
  }

  return {
    id: String(item.id),
    artist: String(item.artist),
    space: String(item.space),
    time: String(item.time),
    status: item.status as EventStatus,
  };
}

function getClient() {
  if (!configured || !clientInternal) {
    return null;
  }

  return clientInternal;
}

export async function configureAmplify(): Promise<boolean> {
  if (configured) {
    return !!clientInternal;
  }

  try {
    const appConfig = require('../amplifyconfiguration.json');

    if (!appConfig?.aws_appsync_graphqlEndpoint) {
      configured = true;
      return false;
    }

    Amplify.configure(appConfig);
    clientInternal = generateClient();
    configured = true;
    return true;
  } catch (_error) {
    configured = true;
    return false;
  }
}

export async function listFestivalEvents(): Promise<FestivalEvent[]> {
  const client = getClient();

  if (!client) {
    return [];
  }

  try {
    const response = (await client.graphql({ query: listQuery })) as {
      data?: { listFestivalEvents?: { items?: Array<Partial<FestivalEventApi>> } };
    };

    const items = response?.data?.listFestivalEvents?.items ?? [];
    return items
      .map((item) => normalizeEvent(item))
      .filter((item): item is FestivalEvent => item !== null);
  } catch (_error) {
    return [];
  }
}

export async function createFestivalEvent(input: Omit<FestivalEvent, 'id'>): Promise<FestivalEvent | null> {
  const client = getClient();

  if (!client) {
    return null;
  }

  try {
    const response = (await client.graphql({
      query: createMutation,
      variables: { input },
    })) as {
      data?: { createFestivalEvent?: Partial<FestivalEventApi> };
    };

    return normalizeEvent(response?.data?.createFestivalEvent ?? null);
  } catch (_error) {
    return null;
  }
}

export async function updateFestivalEvent(id: string, input: Omit<FestivalEvent, 'id'>): Promise<FestivalEvent | null> {
  const client = getClient();

  if (!client) {
    return null;
  }

  try {
    const response = (await client.graphql({
      query: updateMutation,
      variables: { input: { id, ...input } },
    })) as {
      data?: { updateFestivalEvent?: Partial<FestivalEventApi> };
    };

    return normalizeEvent(response?.data?.updateFestivalEvent ?? null);
  } catch (_error) {
    return null;
  }
}

export async function deleteFestivalEvent(id: string): Promise<FestivalEvent | null> {
  const client = getClient();

  if (!client) {
    return null;
  }

  try {
    const response = (await client.graphql({
      query: deleteMutation,
      variables: { input: { id } },
    })) as {
      data?: { deleteFestivalEvent?: Partial<FestivalEventApi> };
    };

    return normalizeEvent(response?.data?.deleteFestivalEvent ?? null);
  } catch (_error) {
    return null;
  }
}
