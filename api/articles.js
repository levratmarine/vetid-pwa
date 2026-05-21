const CACHE = { data: null, time: 0 };
const TTL = 5 * 60 * 1000;

// Convertit un tableau rich_text Notion en markdown
// Lit les annotations : bold, italic, underline, strikethrough, code, liens
function richTextToMarkdown(richTextArray) {
  if (!richTextArray || !richTextArray.length) return '';
  return richTextArray.map(rt => {
    let text = rt.plain_text || '';
    if (!text) return '';
    const a = rt.annotations || {};
    if (a.code)          text = '`' + text + '`';
    if (a.bold)          text = '**' + text + '**';
    if (a.italic)        text = '*' + text + '*';
    if (a.underline)     text = '++' + text + '++';
    if (a.strikethrough) text = '~~' + text + '~~';
    if (rt.href)         text = '[' + text + '](' + rt.href + ')';
    return text;
  }).join('');
}

export default async function handler(req, res) {
  const token = req.headers['x-vetid-token'];
  if (token !== process.env.VETID_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  if (CACHE.data && (now - CACHE.time) < TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json({ results: CACHE.data });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const dbRes = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: { property: 'Publie', checkbox: { equals: true } },
          sorts: [{ timestamp: 'created_time', direction: 'descending' }]
        })
      }
    );

    const dbData = await dbRes.json();

    const articles = await Promise.all(dbData.results.map(async (p) => {
      const props = p.properties;

      const blocksRes = await fetch(
        `https://api.notion.com/v1/blocks/${p.id}/children`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28'
          }
        }
      );
      const blocksData = await blocksRes.json();

      const content = blocksData.results.map(block => {
        // ✅ CORRIGÉ : richTextToMarkdown au lieu de plain_text
        const text = richTextToMarkdown(block[block.type]?.rich_text || []);

        switch (block.type) {
          case 'heading_1':          return `# ${text}`;
          case 'heading_2':          return `## ${text}`;
          case 'heading_3':          return `### ${text}`;
          case 'bulleted_list_item': return `- ${text}`;
          case 'numbered_list_item': return `1. ${text}`;
          case 'paragraph':          return text || '';
          case 'quote':              return `> ${text}`;
          case 'divider':            return `---`;
          case 'callout':            return `> ${block.callout?.icon?.emoji || ''} ${text}`;
          case 'code':               return '```\n' + (block.code?.rich_text?.[0]?.plain_text || '') + '\n```';
          default:                   return text;
        }
      }).filter(Boolean).join('\n\n');

      return {
        id: p.id,
        created: p.created_time,
        title: props.Titre?.title?.[0]?.plain_text || 'Sans titre',
        category: props.Categorie?.select?.name || '',
        resume: props.Resume?.rich_text?.[0]?.plain_text || '',
        content,
        duration: props.Duree?.number || 5,
        sponsored: props.Sponsorise?.checkbox || false,
        emoji: props.Emoji?.rich_text?.[0]?.plain_text || '📄'
      };
    }));

    CACHE.data = articles;
    CACHE.time = now;
    res.status(200).json({ results: articles });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
