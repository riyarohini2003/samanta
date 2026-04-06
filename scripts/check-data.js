const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient("mongodb://127.0.0.1:27018/?replicaSet=rs0");
  await c.connect();
  const db = c.db("samanta_lms");
  const cols = await db.listCollections().toArray();
  for (const { name } of cols.sort((a, b) => a.name.localeCompare(b.name))) {
    const n = await db.collection(name).countDocuments();
    console.log(`${name.padEnd(22)} ${n}`);
  }
  await c.close();
})();
