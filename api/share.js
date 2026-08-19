/* ============================================================
   リアル八節くん - 共有リンク短縮API (api/share.js)
   ------------------------------------------------------------
   ・POST { data: "圧縮文字列" } → { id: "短縮ID" } を返す
   ・GET  ?id=短縮ID            → { data: "圧縮文字列" } を返す
   ・保存先は Vercel の Storage Marketplace で追加した
     Redis（Upstash）。環境変数は下記のどちらの名前でも
     動くようにしてあります。
       KV_REST_API_URL / KV_REST_API_TOKEN
       UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
   ・保存データは90日で自動的に消えます（TTL）。
   ============================================================ */

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const TTL_SECONDS = 60 * 60 * 24 * 90; // 90日
const MAX_DATA_LENGTH = 300000; // 念のための上限（約300KB）
const ID_LENGTH = 8;
const ID_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateId(len) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return out;
}

// Upstash REST APIへ1コマンド実行する（例: ["SET","key","value","EX","300"]）
async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + REDIS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    throw new Error('redis-error:' + res.status);
  }
  const json = await res.json();
  return json.result;
}

module.exports = async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({
      error: 'Redisが設定されていません。VercelのStorage(Marketplace)からRedis(Upstash)を追加してください。'
    });
    return;
  }

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      const data = body && typeof body.data === 'string' ? body.data : null;

      if (!data) {
        res.status(400).json({ error: 'data is required' });
        return;
      }
      if (data.length > MAX_DATA_LENGTH) {
        res.status(413).json({ error: 'data too large' });
        return;
      }

      const id = generateId(ID_LENGTH);
      await redisCommand(['SET', 'share:' + id, data, 'EX', String(TTL_SECONDS)]);

      res.status(200).json({ id: id });
      return;
    }

    if (req.method === 'GET') {
      const id = req.query && req.query.id;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'id is required' });
        return;
      }

      const value = await redisCommand(['GET', 'share:' + id]);
      if (value === null || value === undefined) {
        res.status(404).json({ error: 'not found' });
        return;
      }

      res.status(200).json({ data: value });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: 'internal error' });
  }
};