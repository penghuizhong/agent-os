import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, getAuthUser, authService } from './auth';
import { PiBrain } from './pi-brain';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', (c, next) => {
  const corsOrigins = c.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5175', 'http://127.0.0.1:5173'];
  return cors({
    origin: corsOrigins,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })(c, next);
});

// Health check (no auth)
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Auth middleware - skip for public routes (health, login, register)
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  // Public routes that don't need authentication
  if (path === '/api/health' || path === '/api/auth/login' || path === '/api/auth/register') {
    return next();
  }
  return authMiddleware()(c, next);
});

// ============ Auth routes ============

app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const result = await authService.register(c.env.DB, {
      username: body.username,
      password: body.password,
      email: body.email,
      avatar: body.avatar,
    }, c.env);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message || '注册失败' }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = await authService.login(c.env.DB, {
      username: body.username,
      password: body.password,
    }, c.env);

    if (!result.success) {
      return c.json({ error: result.error }, 401);
    }
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || '登录失败' }, 401);
  }
});

app.get('/api/auth/me', async (c) => {
  const authUser = getAuthUser(c);
  if (!authUser) return c.json({ error: '未认证' }, 401);
  const user = await authService.getCurrentUser(c.env.DB, authUser.userId);
  if (!user) return c.json({ error: '用户不存在' }, 404);
  return c.json(user);
});

// ============ Agent routes ============

app.get('/api/agents', async (c) => {
  const authUser = getAuthUser(c)!;
  const brain = new PiBrain(c.env.DB, c.env);
  await brain.init();
  const agents = await brain.getUserAgents(authUser.userId);
  return c.json(agents);
});

app.post('/api/agents', async (c) => {
  try {
    const authUser = getAuthUser(c)!;
    const body = await c.req.json();
    const { name, role, description, avatar, tags } = body;
    if (!name || !role) {
      return c.json({ error: 'Name and role are required' }, 400);
    }
    const brain = new PiBrain(c.env.DB, c.env);
    await brain.init();
    const agent = await brain.createAgent(
      authUser.userId,
      name,
      role,
      description || '',
      avatar || name[0]?.toUpperCase() || 'A',
      tags || [],
    );
    return c.json(agent, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/agents/:id', async (c) => {
  const authUser = getAuthUser(c)!;
  const agentId = c.req.param('id');
  const brain = new PiBrain(c.env.DB, c.env);
  await brain.init();
  const agent = await brain.getAgent(agentId, authUser.userId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);
  await brain.deleteAgent(authUser.userId, agentId);
  return c.json({ success: true });
});

// ============ History routes ============

app.get('/api/agents/:id/history', async (c) => {
  const authUser = getAuthUser(c)!;
  const agentId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50');

  const brain = new PiBrain(c.env.DB, c.env);
  await brain.init();
  const agent = await brain.getAgent(agentId, authUser.userId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const messages = await brain.getHistory(agentId, authUser.userId, limit);
  return c.json(messages);
});

app.delete('/api/agents/:id/history', async (c) => {
  const authUser = getAuthUser(c)!;
  const agentId = c.req.param('id');

  const brain = new PiBrain(c.env.DB, c.env);
  await brain.init();
  const agent = await brain.getAgent(agentId, authUser.userId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  await brain.clearHistory(authUser.userId, agentId);
  return c.json({ success: true });
});

// ============ Memory routes ============

app.get('/api/agents/:id/memories', async (c) => {
  const authUser = getAuthUser(c)!;
  const agentId = c.req.param('id');

  const brain = new PiBrain(c.env.DB, c.env);
  await brain.init();
  const agent = await brain.getAgent(agentId, authUser.userId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const memories = await brain.getMemories(agentId, authUser.userId);
  return c.json(memories);
});

// ============ Chat route (SSE via ReadableStream) ============

app.post('/api/chat', async (c) => {
  const authUser = getAuthUser(c)!;
  const { agentId, message } = await c.req.json();

  if (!agentId || !message) {
    return c.json({ error: 'agentId and message are required' }, 400);
  }

  const brain = new PiBrain(c.env.DB, c.env);
  await brain.init();

  // Verify agent ownership
  const agent = await brain.getAgent(agentId, authUser.userId);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  if (!brain.isAvailable()) {
    return c.json({ error: 'AI service not available' }, 503);
  }

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // prompt() handles saving user message, streaming, saving assistant response, and memory extraction
        const fullText = await brain.prompt(
          authUser.userId,
          agentId,
          message,
          (delta: string) => {
            send('chunk', { text: delta });
          },
        );

        // Send done event
        send('done', { agentId, text: fullText });
      } catch (error: any) {
        send('error', { message: error.message || 'Internal server error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// ============ Error handler ============

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
