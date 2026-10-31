import { createServer } from "node:http";
import type { Server } from "node:http";

const HTML_HOME = `<!DOCTYPE html>
<html>
<head><title>Explore Shop</title></head>
<body>
  <h1>Shop Home</h1>
  <p>Explore our demo store freely.</p>
  <form id="search-form">
    <label for="search-input">Search query</label>
    <input id="search-input" name="q" placeholder="Type query" type="text" />
    <label for="password-input">User password</label>
    <input id="password-input" type="password" value="supersecret" />
    <button id="search-btn" type="button">Search</button>
  </form>
  <button id="add-btn" type="button">Add Product</button>
  <button id="disabled-btn" type="button" disabled>Out of stock</button>
  <a id="cart-link" href="/cart">View Cart</a>
  <div id="output">Initial State</div>
  <script>
    document.getElementById("add-btn").addEventListener("click", () => {
      document.getElementById("output").textContent = "Product Added";
    });
  </script>
</body>
</html>`;

const HTML_CART = `<!DOCTYPE html>
<html>
<head><title>Your Cart</title></head>
<body>
  <h1>Cart Items</h1>
  <p>Items in your basket: 1</p>
  <a href="/">Back to Shop</a>
</body>
</html>`;

export type TestServerHandle = {
  server: Server;
  origin: string;
  close: () => Promise<void>;
};

export async function startTestServer(): Promise<TestServerHandle> {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML_HOME);
      return;
    }

    if (url.pathname === "/cart") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML_CART);
      return;
    }

    if (url.pathname === "/set-session") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Set-Cookie": "session_id=agent_token_123; Path=/; HttpOnly",
      });
      res.end("<h1>Session Initialized</h1>");
      return;
    }

    if (url.pathname === "/check-session") {
      const cookie = req.headers.cookie || "none";
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(`cookie: ${cookie}`);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server failed to bind address.");
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    server,
    origin,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }),
  };
}
