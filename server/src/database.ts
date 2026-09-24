// Cloudflare D1 数据库操作层
// 所有操作均为异步，接受 D1Database 绑定作为参数

// 生成唯一 ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// ============ Types ============

export interface User {
  id: string
  username: string
  email: string | null
  password_hash: string
  avatar: string
  created_at: string
  updated_at: string
}

export interface UserAgent {
  id: string
  user_id: string
  name: string
  role: string
  description: string | null
  system_prompt: string
  avatar: string
  tags: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  user_id: string
  agent_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking: string | null
  created_at: string
}

export interface Memory {
  id: string
  user_id: string
  agent_id: string | null
  content: string
  tags: string | null
  importance: number
  created_at: string
  updated_at: string
}

// ============ Database Init ============

export async function initDatabase(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT 'U',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      avatar TEXT DEFAULT 'A',
      tags TEXT,
      status TEXT DEFAULT 'idle',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      thinking TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT,
      content TEXT NOT NULL,
      tags TEXT,
      importance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_agents_user ON user_agents(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user_agent ON messages(user_id, agent_id);
    CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
  `)
}

// ============ User Operations ============

export const userOps = {
  async create(db: D1Database, username: string, email: string | null, passwordHash: string, avatar: string): Promise<User> {
    const id = generateId()
    await db.prepare(
      'INSERT INTO users (id, username, email, password_hash, avatar) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, username, email, passwordHash, avatar).run()
    const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>()
    return result!
  },

  async findByUsername(db: D1Database, username: string): Promise<User | null> {
    return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>()
  },

  async findByEmail(db: D1Database, email: string): Promise<User | null> {
    return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>()
  },

  async findById(db: D1Database, id: string): Promise<User | null> {
    return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>()
  },
}

// ============ Agent Operations ============

export const agentOps = {
  async create(
    db: D1Database,
    userId: string,
    name: string,
    role: string,
    description: string,
    systemPrompt: string,
    avatar: string,
    tags: string[] = [],
  ): Promise<UserAgent> {
    const id = generateId()
    await db.prepare(
      'INSERT INTO user_agents (id, user_id, name, role, description, system_prompt, avatar, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, name, role, description, systemPrompt, avatar, JSON.stringify(tags)).run()
    const result = await db.prepare('SELECT * FROM user_agents WHERE id = ?').bind(id).first<UserAgent>()
    return result!
  },

  async findByUser(db: D1Database, userId: string): Promise<UserAgent[]> {
    const { results } = await db.prepare(
      'SELECT * FROM user_agents WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(userId).all<UserAgent>()
    return results
  },

  async findById(db: D1Database, id: string, userId: string): Promise<UserAgent | null> {
    return db.prepare('SELECT * FROM user_agents WHERE id = ? AND user_id = ?').bind(id, userId).first<UserAgent>()
  },

  async updateStatus(db: D1Database, id: string, userId: string, status: string): Promise<void> {
    await db.prepare(
      'UPDATE user_agents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    ).bind(status, id, userId).run()
  },

  async delete(db: D1Database, id: string, userId: string): Promise<void> {
    await db.prepare('DELETE FROM user_agents WHERE id = ? AND user_id = ?').bind(id, userId).run()
  },
}

// ============ Message Operations ============

export const messageOps = {
  async create(
    db: D1Database,
    userId: string,
    agentId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    thinking: string | null = null,
  ): Promise<Message> {
    const id = generateId()
    await db.prepare(
      'INSERT INTO messages (id, user_id, agent_id, role, content, thinking) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, agentId, role, content, thinking).run()
    const result = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<Message>()
    return result!
  },

  async findByAgent(db: D1Database, userId: string, agentId: string, limit = 50): Promise<Message[]> {
    const { results } = await db.prepare(
      'SELECT * FROM messages WHERE user_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(userId, agentId, limit).all<Message>()
    return results.reverse()
  },

  async deleteByAgent(db: D1Database, userId: string, agentId: string): Promise<void> {
    await db.prepare('DELETE FROM messages WHERE user_id = ? AND agent_id = ?').bind(userId, agentId).run()
  },

  async countByAgent(db: D1Database, userId: string, agentId: string): Promise<number> {
    const row = await db.prepare(
      'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND agent_id = ?'
    ).bind(userId, agentId).first<{ count: number }>()
    return row?.count ?? 0
  },
}

// ============ Memory Operations ============

export const memoryOps = {
  async create(
    db: D1Database,
    userId: string,
    agentId: string | null,
    content: string,
    tags: string[] = [],
    importance = 0,
  ): Promise<Memory> {
    const id = generateId()
    await db.prepare(
      'INSERT INTO memories (id, user_id, agent_id, content, tags, importance) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, agentId, content, JSON.stringify(tags), importance).run()
    const result = await db.prepare('SELECT * FROM memories WHERE id = ?').bind(id).first<Memory>()
    return result!
  },

  async findByUser(db: D1Database, userId: string, limit = 100): Promise<Memory[]> {
    const { results } = await db.prepare(
      'SELECT * FROM memories WHERE user_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?'
    ).bind(userId, limit).all<Memory>()
    return results
  },

  async findByAgent(db: D1Database, userId: string, agentId: string): Promise<Memory[]> {
    const { results } = await db.prepare(
      'SELECT * FROM memories WHERE user_id = ? AND (agent_id = ? OR agent_id IS NULL) ORDER BY importance DESC, created_at DESC'
    ).bind(userId, agentId).all<Memory>()
    return results
  },

  async update(db: D1Database, id: string, userId: string, content: string, tags: string[], importance: number): Promise<void> {
    await db.prepare(
      'UPDATE memories SET content = ?, tags = ?, importance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    ).bind(content, JSON.stringify(tags), importance, id, userId).run()
  },

  async delete(db: D1Database, id: string, userId: string): Promise<void> {
    await db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').bind(id, userId).run()
  },
}
