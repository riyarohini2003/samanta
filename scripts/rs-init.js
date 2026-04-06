// One-shot: initiate single-node replica set rs0 on localhost:27017
const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient("mongodb://127.0.0.1:27018/?directConnection=true", {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const admin = client.db("admin");
  try {
    const res = await admin.command({
      replSetInitiate: {
        _id: "rs0",
        members: [{ _id: 0, host: "127.0.0.1:27018" }],
      },
    });
    console.log("initiate:", JSON.stringify(res));
  } catch (e) {
    if (String(e.codeName) === "AlreadyInitialized" || /already initialized/i.test(String(e.message))) {
      console.log("already initialized");
    } else {
      throw e;
    }
  }
  // Wait for PRIMARY election
  for (let i = 0; i < 30; i++) {
    const s = await admin.command({ hello: 1 });
    if (s.isWritablePrimary) {
      console.log("primary ready:", s.me, "setName=", s.setName);
      await client.close();
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await client.close();
  throw new Error("replica set did not become primary in time");
})().catch((e) => {
  console.error("rs-init failed:", e);
  process.exit(1);
});
