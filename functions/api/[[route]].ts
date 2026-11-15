import { handleApiRequest, type EnvBindings } from '../lib/router.ts';

interface PagesContext {
  request: Request;
  env: EnvBindings;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  return handleApiRequest(context.request, context.env);
}
