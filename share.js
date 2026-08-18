// /api/share.js
// 共有リンクの短縮API。
// - POST { data: string } -> { id: string }  … 圧縮済みノートデータをKVに保存してIDを発行
// - GET  ?id=xxxx          -> { data: string } … 保存済みデータを取得
//
// 事前準備（Vercelダッシュボード）:
// 1. プロジェクト -> Storage -> Create Database -> "KV" を選択
// 2. 作成したKVをこのプロジェクトに Connect する
//    -> KV_REST_API_URL / KV_REST_API_TOKEN が環境変数として自動追加されます
// 3. 再デプロイすれば有効になります（追加の npm install は不要）

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TTL_SECONDS = 60 * 60 * 24 * 180; // 180日で自動失効
const MAX_DATA_LENGTH = 300000; // 念のための上限（文字数）

function generateId(len = 8) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return s;
}

async function kvCommand(command) {
  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!KV_URL || !KV_TOKEN) {
    const err = new Error('KV_NOT_CONFIGURED');
    err.code = 'KV_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`KV_REQUEST_FAILED: ${res.status} ${text}`);
    err.code = 'KV_REQUEST_FAILED';
    throw err;
  }
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      const data = body && body.data;

      if (!data || typeof data !== 'string') {
        res.status(400).json({ error: 'invalid_data' });
        return;
      }
      if (data.length > MAX_DATA_LENGTH) {
        res.status(413).json({ error: 'data_too_large' });
        return;
      }

      // ごく低確率のID衝突を避けるため、既存キーがないかだけ軽く確認して数回リトライ
      let id = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateId(8);
        const existing = await kvCommand(['GET', `note:${candidate}`]);
        if (!existing || existing.result == null) {
          id = candidate;
          break;
        }
      }
      if (!id) {
        res.status(500).json({ error: 'id_generation_failed' });
        return;
      }

      await kvCommand(['SET', `note:${id}`, data, 'EX', TTL_SECONDS]);
      res.status(200).json({ id });
      return;
    }

    if (req.method === 'GET') {
      const id = (req.query && req.query.id) || '';
      if (!/^[A-Za-z0-9]{4,32}$/.test(id)) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }

      const result = await kvCommand(['GET', `note:${id}`]);
      if (!result || result.result == null) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      res.status(200).json({ data: result.result });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    if (err && err.code === 'KV_NOT_CONFIGURED') {
      res.status(503).json({
        error: 'kv_not_configured',
        message: 'VercelのStorageでKVデータベースを作成し、プロジェクトに接続してください。'
      });
      return;
    }
    res.status(500).json({ error: 'internal_error', message: String(err && err.message || err) });
  }
};
