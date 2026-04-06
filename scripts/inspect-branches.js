const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient("mongodb://127.0.0.1:27018/?replicaSet=rs0");
  await c.connect();
  const db = c.db("samanta_lms");
  const docs = await db.collection("Branch").find({}).toArray();
  for (const d of docs) {
    console.log(JSON.stringify(d, null, 2));
    console.log("---");
  }
  await c.close();
})();
