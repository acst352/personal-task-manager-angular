import { createClient } from '@insforge/sdk';
import { environment } from '../../environments/environment';

export const insforge = createClient({
  baseUrl: environment.insforge.baseUrl,
  anonKey: environment.insforge.anonKey,
});
