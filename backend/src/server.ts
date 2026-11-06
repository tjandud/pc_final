import { createApp } from './app.js';
import { env, configStatus } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[server] TechCompare API listening on http://localhost:${env.PORT}`);
  console.log('[server] config status:', JSON.stringify(configStatus()));
});
