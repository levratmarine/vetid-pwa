export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const response = await fetch(
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
  const data = await response.json();
  res.status(200).json(data);
}
