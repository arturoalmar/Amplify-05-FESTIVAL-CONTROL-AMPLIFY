import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  buildCommand: 'npm run build:web',
});
