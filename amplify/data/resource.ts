import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  FestivalEvent: a
    .model({
      artist: a.string().required(),
      space: a.string().required(),
      time: a.string().required(),
      status: a.enum(['CONFIRMED', 'DELAYED', 'CANCELLED']),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
});
