process.env.MOZAIK_API_KEY = "";
globalThis.fetch = async () => { throw new Error("Network access is disabled in orchestration tests."); };
