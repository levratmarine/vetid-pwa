export default async function handler(req, res) {
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
          filter: { property: 'Publie', checkbox: { equals: true } }
        })
      }
    );
    const dbData = await dbRes.json();
    const articles = await Promise.all(dbData.results.map(async (p) => {
      const props = p.properties;
      const blocksRes = await fetch(
        `https://api.notion.com/v1/blocks/${p.id}/children`,
        { headers: { 'Authorization': `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2022-06-28' } }
      );
      const blocksData = await blocksRes.json();
      const content = blocksData.results.map(block => {
        const text = block[block.type]?.rich_text?.map(t => t.plain_text).join('') || '';
        switch(block.type) {
          case 'heading_1': return `# ${text}`;
          case 'heading_2': return `## ${text}`;
          case 'heading_3': return `### ${text}`;
          case 'bulleted_list_item': return `- ${text}`;
          case 'numbered_list_item': return `- ${text}`;
          case 'paragraph': return text ? text : '';
          default: return text;
        }
      }).filter(Boolean).join('\n\n');
      return {
        id: p.id,
        title: props.Titre?.title?.[0]?.plain_text || 'Sans titre',
        category: props.Categorie?.select?.name || '',
        resume: props.Resume?.rich_text?.[0]?.plain_text || '',
        content: content,
        duration: props.Duree?.number || 5,
        sponsored: props.Sponsorise?.checkbox || false,
        emoji: props.Emoji?.rich_text?.[0]?.plain_text || '📄'
      };
    }));
    res.status(200).json({ results: articles });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
